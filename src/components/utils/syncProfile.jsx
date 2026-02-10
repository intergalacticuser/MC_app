import { mc } from "@/api/mcClient";

/**
 * Syncs the current user's data to the public UserProfile entity.
 * This makes the user's profile visible to all other users.
 * 
 * IMPORTANT: Each user must create their own UserProfile record so that
 * created_by matches their own email. Otherwise other users won't see it
 * due to Make a Match visibility rules (profiles are public but ownership metadata must be correct).
 */
export async function syncUserProfile(user) {
  if (!user || !user.id) return;

  const profileData = {
    user_id: user.id,
    full_name: user.full_name || "",
    username: user.username || "",
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    phone: user.phone || "",
    email: user.email || "",
    profile_photo: user.profile_photo || "",
    bio: user.bio || "",
    quote: user.quote || "",
    mood: user.mood || "",
    background_url: user.background_url || "",
    premium_theme: user.premium_theme || "default",
    owned_themes: user.owned_themes || ["default"],
    key_interest_categories: Array.isArray(user.key_interest_categories) ? user.key_interest_categories : [],
    onboarding_completed: !!(user.onboarding_completed || user.bio || user.profile_photo),
    is_premium: !!user.is_premium,
    blocked_users: user.blocked_users || []
  };

  // Check if profile already exists for this user
  const existing = await mc.entities.UserProfile.filter({ user_id: user.id });

  if (existing.length > 0) {
    // Check if created_by matches current user's email
    // If not, the record was created by admin and other users can't see it
    // Delete and recreate so created_by is correct
    const myRecord = existing.find(e => e.created_by === user.email);
    
    if (myRecord) {
      // Update existing record that belongs to this user
      await mc.entities.UserProfile.update(myRecord.id, profileData);
      
      // Clean up any duplicates
      const duplicates = existing.filter(e => e.id !== myRecord.id);
      for (const dup of duplicates) {
        await mc.entities.UserProfile.delete(dup.id).catch(() => {});
      }
    } else {
      // Records exist but were created by someone else (e.g. admin)
      // Delete them and create a new one as the current user
      for (const old of existing) {
        await mc.entities.UserProfile.delete(old.id).catch(() => {});
      }
      await mc.entities.UserProfile.create(profileData);
    }
  } else {
    await mc.entities.UserProfile.create(profileData);
  }
}
