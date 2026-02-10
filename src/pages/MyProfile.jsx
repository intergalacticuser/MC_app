import React, { useState, useEffect } from "react";
import { mc } from "@/api/mcClient";
import { Button } from "@/components/ui/button";
import { Edit3, ImageIcon, Share2, Palette } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import MindMapView from "../components/profile/MindMapView";
import ProfileEditor from "../components/profile/ProfileEditor";
import CategoryEditor from "../components/profile/CategoryEditor";

import BackgroundSelector from "../components/profile/BackgroundSelector";
import ShareUniverse from "../components/share/ShareUniverse";
import PremiumThemes from "../components/premium/PremiumThemes";
import TutorialPopup from "../components/tutorial/TutorialPopup";
import Spotlight from "../components/tutorial/Spotlight";
import { syncUserProfile } from "@/components/utils/syncProfile";
import { CATEGORIES_LIST, calculateMatchScore, isProfileDiscoverable } from "@/components/utils/matchingUtils";
import { createPageUrl } from "@/utils";
import { canRunNewUserTutorial } from "@/lib/onboarding-utils";

const FIXED_CATEGORIES = CATEGORIES_LIST;

export default function MyProfile() {
  const [user, setUser] = useState(null);
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editingBackground, setEditingBackground] = useState(false);
  const [sharingUniverse, setSharingUniverse] = useState(false);
  const [editingThemes, setEditingThemes] = useState(false);
  const [showMyMapInfoPopup, setShowMyMapInfoPopup] = useState(false);
  const [highlightCategory, setHighlightCategory] = useState(null);
  const [showInfoBanner, setShowInfoBanner] = useState(false);
  const [profileStats, setProfileStats] = useState(null);
  const categoryRefs = React.useRef({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    if (!canRunNewUserTutorial(user)) {
      setShowInfoBanner(false);
      return;
    }

    const storageKey = `profile_info_banner_seen_${user.id}`;
    const hasSeen = localStorage.getItem(storageKey);
    if (hasSeen) return;

    setShowInfoBanner(true);
    const timer = setTimeout(() => {
      setShowInfoBanner(false);
      localStorage.setItem(storageKey, "true");
    }, 15000);
    return () => clearTimeout(timer);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    if (user.tutorial_v2_step === "my_map_info_pending") {
      setShowMyMapInfoPopup(true);
    } else {
      setShowMyMapInfoPopup(false);
    }

    if (user.tutorial_v2_step === "category_highlight") {
      setHighlightCategory(FIXED_CATEGORIES[0]);
    } else if (!selectedCategory) {
      setHighlightCategory(null);
    }
  }, [user?.tutorial_v2_step, selectedCategory]);

  const loadData = async () => {
    try {
      const currentUser = await Promise.race([
        mc.auth.me(),
        new Promise((_, rej) => setTimeout(() => rej("auth_timeout"), 5000))
      ]);
      setUser(currentUser);
      setLoading(false);
      
      // Initialize coins for new users
      if (currentUser.coins === undefined || currentUser.coins === null) {
        mc.auth.updateMe({ coins: 100 }).catch(() => {});
        setUser(prev => ({ ...prev, coins: 100 }));
      }
      
      const userInterests = await Promise.race([
        mc.entities.Interest.filter({ user_id: currentUser.id }),
        new Promise((_, rej) => setTimeout(() => rej("interests_timeout"), 5000))
      ]).catch(() => []);
      setInterests(userInterests || []);

      const [allProfiles, allInterests, allMessages] = await Promise.all([
        mc.entities.UserProfile.list().catch(() => []),
        mc.entities.Interest.list().catch(() => []),
        mc.entities.Message.list().catch(() => [])
      ]);

      const otherUsers = (allProfiles || [])
        .filter((item) => item.user_id !== currentUser.id)
        .filter((item) => isProfileDiscoverable(item, allInterests || []))
        .map((item) => ({
          id: item.user_id,
          full_name: item.full_name,
          mood: item.mood,
          quote: item.quote,
          key_interest_categories: item.key_interest_categories || []
        }));

      const bestMatchPercentage = otherUsers.reduce((best, candidate) => {
        const score = calculateMatchScore(currentUser, candidate, allInterests || [], allMessages || []);
        return Math.max(best, score.percentage || 0);
      }, 0);

      const activeCategories = new Set((userInterests || []).map((item) => item.category).filter(Boolean)).size;
      const photoPart = currentUser?.profile_photo ? 25 : 0;
      const bioPart = currentUser?.bio ? 15 : 0;
      const keyCategoriesPart = Math.min(20, ((currentUser?.key_interest_categories || []).length / 3) * 20);
      const activeCategoriesPart = Math.min(40, (activeCategories / 8) * 40);
      const completeness = Math.round(photoPart + bioPart + keyCategoriesPart + activeCategoriesPart);
      const matchQuality =
        bestMatchPercentage >= 60 ? "High" : bestMatchPercentage >= 30 ? "Medium" : "Low";

      setProfileStats({
        completeness,
        activeCategories,
        bestMatchPercentage,
        matchQuality
      });
      
      // Sync profile to public UserProfile entity so all users can find this user
      syncUserProfile(currentUser).catch(() => {});
    } catch (error) {
      console.error("Error loading user:", error);
      setLoading(false);
    }
  };

  const handleProfilePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPhoto(true);
    const { file_url } = await mc.integrations.Core.UploadFile({ file });
    await mc.auth.updateMe({ profile_photo: file_url });
    const updatedUser = await mc.auth.me();
    await syncUserProfile(updatedUser).catch(() => {});
    await loadData();
    setUploadingPhoto(false);
  };

  const getCategoryInterests = (categoryId) => {
    return interests.filter(i => i.category === categoryId);
  };

  const requirePremiumFeature = (featureName) => {
    if (user?.is_premium) return true;
    alert(`${featureName} is available only with Premium. Upgrade to unlock this feature.`);
    window.location.href = createPageUrl("Premium");
    return false;
  };





  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-2 md:px-4 relative">
       {/* Background Glow */}
       <div className="fixed inset-0 pointer-events-none overflow-hidden">
         <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px]" />
         <div className="absolute bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-pink-900/10 rounded-full blur-[100px]" />
       </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">My Planet</h1>
            <p className="text-purple-200/60 text-lg font-light">Your personal universe of interests</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={() => setSharingUniverse(true)}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-lg transition-all select-none"
            >
              <Share2 className="w-4 h-4 mr-2 select-none" />
              Share Planet
            </Button>
            <Button
              onClick={() => {
                if (!requirePremiumFeature("Themes")) return;
                setEditingThemes(true);
              }}
              variant="outline"
              className="border-purple-200 hover:bg-purple-50 dark:border-purple-700 dark:hover:bg-purple-900/30 select-none"
            >
              <Palette className="w-4 h-4 mr-2 select-none" />
              Themes
            </Button>
            <Button
              onClick={() => {
                if (!requirePremiumFeature("Background customization")) return;
                setEditingBackground(true);
              }}
              variant="outline"
              className="border-purple-200 hover:bg-purple-50 dark:border-purple-700 dark:hover:bg-purple-900/30 select-none"
            >
              <ImageIcon className="w-4 h-4 mr-2 select-none" />
              Background
            </Button>
            <Button
              onClick={() => setEditingProfile(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg transition-all select-none"
            >
              <Edit3 className="w-4 h-4 mr-2 select-none" />
              Edit Profile
            </Button>

          </div>
        </div>

        {profileStats && (
          <div className="mb-8 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-4 md:p-5">
            <p className="text-sm font-semibold text-purple-100 mb-2">Profile Progress</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-purple-100">
              <div className="rounded-xl bg-black/20 p-3">
                <div className="text-xs uppercase tracking-wide text-purple-200/80">Completeness</div>
                <div className="text-2xl font-bold">{profileStats.completeness}%</div>
              </div>
              <div className="rounded-xl bg-black/20 p-3">
                <div className="text-xs uppercase tracking-wide text-purple-200/80">Active Categories</div>
                <div className="text-2xl font-bold">{profileStats.activeCategories}</div>
              </div>
              <div className="rounded-xl bg-black/20 p-3">
                <div className="text-xs uppercase tracking-wide text-purple-200/80">Match Quality</div>
                <div className="text-2xl font-bold">{profileStats.matchQuality}</div>
              </div>
            </div>
            <p className="mt-3 text-sm text-purple-100/90">
              Your profile is {profileStats.completeness}% complete. Complete one more category to improve matches.
            </p>
          </div>
        )}

        {/* Mind Map */}
        <MindMapView
          user={user}
          interests={interests}
          categories={FIXED_CATEGORIES}
          onCategoryClick={async (cat) => {
            setSelectedCategory(cat);
            const isGuidedCategory = cat.id === FIXED_CATEGORIES[0]?.id;
            if (user?.tutorial_v2_step === "category_highlight" && isGuidedCategory) {
              try {
                await mc.auth.updateMe({ tutorial_v2_step: "category_center_photo" });
                setUser((prev) => (prev ? { ...prev, tutorial_v2_step: "category_center_photo" } : prev));
              } catch {
                // ignore
              }
            }
            setHighlightCategory(null);
          }}
          onPhotoUpload={handleProfilePhotoUpload}
          uploadingPhoto={uploadingPhoto}
          categoryRefs={categoryRefs}
        />

        {/* Profile Editor Modal */}
        <AnimatePresence>
          {editingProfile && (
            <ProfileEditor
              user={user}
              onClose={() => setEditingProfile(false)}
              onSave={loadData}
            />
          )}
        </AnimatePresence>

        {/* Background Selector Modal */}
        <AnimatePresence>
          {editingBackground && (
            <BackgroundSelector
              user={user}
              onClose={() => setEditingBackground(false)}
              onSave={loadData}
            />
          )}
        </AnimatePresence>

        {/* Category Editor Modal */}
        <AnimatePresence>
          {selectedCategory && (
            <CategoryEditor
              category={selectedCategory}
              interests={getCategoryInterests(selectedCategory.id)}
              userId={user.id}
              onClose={() => {
                setSelectedCategory(null);
                setHighlightCategory(null);
              }}
              onSave={loadData}
              isFirstInterest={!user?.first_interest_added}
            />
          )}
        </AnimatePresence>

        {/* Share Universe Modal */}
        <AnimatePresence>
          {sharingUniverse && (
            <ShareUniverse
              user={user}
              interests={interests}
              categories={FIXED_CATEGORIES}
              onClose={() => setSharingUniverse(false)}
            />
          )}
        </AnimatePresence>

        {/* Premium Themes Modal */}
        <AnimatePresence>
          {editingThemes && (
            <PremiumThemes
              user={user}
              onClose={() => setEditingThemes(false)}
              onSave={loadData}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showMyMapInfoPopup && (
            <TutorialPopup
              step="my_map_info"
              onClose={async () => {
                setShowMyMapInfoPopup(false);
                try {
                  await mc.auth.updateMe({ tutorial_v2_step: "category_highlight" });
                  setUser((prev) => (prev ? { ...prev, tutorial_v2_step: "category_highlight" } : prev));
                } catch {
                  // ignore
                }
              }}
            />
          )}
        </AnimatePresence>

        {/* Spotlight */}
        {highlightCategory && categoryRefs.current[highlightCategory.id] && user?.tutorial_v2_step === "category_highlight" && (
          <Spotlight
            text="Open this category first"
            targetRef={categoryRefs.current[highlightCategory.id]}
            position="bottom"
          />
        )}



        {/* Info Banner */}
        {showInfoBanner && user && !user.tutorial_completed && (
          <div className="fixed bottom-24 md:bottom-8 right-4 max-w-[220px] z-40 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-2xl p-4 shadow-2xl">
            <p className="text-xs font-medium text-center leading-relaxed">
              The more data and photos you add, the more accurate matches will be and the higher you will appear in search results.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
