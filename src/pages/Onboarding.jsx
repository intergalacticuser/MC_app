import React from "react";
import { motion } from "framer-motion";
import { Upload, CheckCircle2, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { syncUserProfile } from "@/components/utils/syncProfile";
import { isOnboardingComplete } from "@/lib/onboarding-utils";
import { CATEGORIES_LIST } from "@/components/utils/matchingUtils";

const KEY_CATEGORIES = CATEGORIES_LIST;

export default function Onboarding() {
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [step, setStep] = React.useState(1);
  const [bio, setBio] = React.useState("");
  const [selectedCategories, setSelectedCategories] = React.useState([]);

  React.useEffect(() => {
    const init = async () => {
      try {
        const me = await base44.auth.me();
        if (isOnboardingComplete(me)) {
          if (!me.onboarding_completed) {
            await base44.auth.updateMe({
              onboarding_completed: true,
              onboarding_required: false,
              onboarding_step: "completed"
            }).catch(() => {});
          }
          navigate(createPageUrl("MyProfile"), { replace: true });
          return;
        }
        setUser(me);
        setBio(me.bio || "");
        setSelectedCategories(Array.isArray(me.key_interest_categories) ? me.key_interest_categories : []);
      } catch {
        navigate(createPageUrl("Login"), { replace: true });
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSaving(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.auth.updateMe({
        profile_photo: file_url,
        onboarding_step: "profile_photo_done"
      });
      const refreshed = await base44.auth.me();
      setUser(refreshed);
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (categoryId) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((item) => item !== categoryId) : [...prev, categoryId]
    );
  };

  const canGoNextFromStep1 = Boolean(user?.profile_photo);
  const canGoNextFromStep2 = selectedCategories.length >= 3;

  const handleFinish = async () => {
    if (!canGoNextFromStep2 || !user?.profile_photo) return;
    setSaving(true);
    try {
      await base44.auth.updateMe({
        bio: bio.trim(),
        key_interest_categories: selectedCategories,
        onboarding_completed: true,
        onboarding_required: false,
        onboarding_step: "completed",
        tutorial_v2_step: "my_map_info_pending",
        tutorial_completed: false
      });
      const updated = await base44.auth.me();
      await syncUserProfile(updated).catch(() => {});
      navigate(createPageUrl("MyProfile"), { replace: true });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-950 px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/95 rounded-3xl p-8 shadow-2xl"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-2 mb-4">
              <Sparkles className="w-4 h-4 text-indigo-700" />
              <span className="text-sm font-semibold text-indigo-700">Onboarding</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create your profile</h1>
            <p className="text-sm text-gray-600">Step {step} of 3</p>
          </div>

          <div className="flex gap-2 mb-8">
            {[1, 2, 3].map((value) => (
              <div key={value} className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                <div className={`h-full ${value <= step ? "bg-indigo-600" : "bg-transparent"}`} />
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Central profile photo</h2>
                <p className="text-sm text-gray-600">Upload your central photo to continue. This step is required.</p>
              </div>

              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-indigo-200 bg-indigo-50 flex items-center justify-center">
                    {user?.profile_photo ? (
                      <img src={user.profile_photo} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <Upload className="w-10 h-10 text-indigo-500" />
                    )}
                  </div>
                  <input type="file" id="onboarding-photo" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                  <label
                    htmlFor="onboarding-photo"
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-full cursor-pointer"
                  >
                    {saving ? "Uploading..." : "Upload photo"}
                  </label>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Short bio (optional)</label>
                <Textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="Tell people a little about yourself..."
                  className="min-h-[110px]"
                />
              </div>

              <Button className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={!canGoNextFromStep1} onClick={() => setStep(2)}>
                Next
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Key interests selection</h2>
                <p className="text-sm text-gray-600">Select at least 3 categories to continue.</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {KEY_CATEGORIES.map((category) => {
                  const active = selectedCategories.includes(category.id);
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => toggleCategory(category.id)}
                      className={`rounded-2xl border px-3 py-4 text-left transition-colors ${
                        active ? "border-indigo-500 bg-indigo-50" : "border-gray-200 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <div className="text-2xl mb-1">{category.icon}</div>
                      <div className="text-sm font-semibold text-gray-900">{category.label}</div>
                    </button>
                  );
                })}
              </div>

              <p className="text-sm text-gray-600">Selected: {selectedCategories.length} / 3 minimum</p>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" disabled={!canGoNextFromStep2} onClick={() => setStep(3)}>
                  Next
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Onboarding completion</h2>
                <p className="text-sm text-gray-600">Everything is ready. Tap Finish to save and open My Map.</p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-800">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Central photo uploaded
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-800">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  {selectedCategories.length} key categories selected
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" disabled={saving} onClick={handleFinish}>
                  {saving ? "Finishing..." : "Finish"}
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
