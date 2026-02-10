import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { X, Save, Wand2 } from "lucide-react";
import { syncUserProfile } from "@/components/utils/syncProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const MOODS = ["😊", "😎", "🤔", "😴", "🔥", "💪", "🎉", "💭", "🌟", "❤️"];

const BIO_SUGGESTIONS = [
  "Looking for a partner for adventures 🌍",
  "A dreamer who isn't afraid to make ideas reality ✨",
  "I love spontaneous trips and long conversations 💭",
];

const QUOTE_SUGGESTIONS = [
  "Life is too short for bad coffee ☕",
  "I'm not perfect, but I'm original 😎",
  "Be yourself, everyone else is already taken 🎭",
];

export default function ProfileEditor({ user, onClose, onSave }) {
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [mood, setMood] = useState(user?.mood || "");
  const [quote, setQuote] = useState(user?.quote || "");
  const [saving, setSaving] = useState(false);
  const [generatingBio, setGeneratingBio] = useState(false);
  const [generatingQuote, setGeneratingQuote] = useState(false);

  const generateBio = async () => {
    setGeneratingBio(true);
    try {
      const prompt = `Generate a short, creative, and engaging social media bio for a user named ${fullName || "User"}. Mood: ${mood || "Neutral"}. Maximum 150 characters. No hashtags.`;
      const res = await base44.integrations.Core.InvokeLLM({ prompt });
      setBio(res.replace(/^"|"$/g, ''));
    } catch (e) {
      console.error(e);
    }
    setGeneratingBio(false);
  };

  const generateQuote = async () => {
    setGeneratingQuote(true);
    try {
      const prompt = `Generate a short, inspiring life motto or quote. Mood: ${mood || 'Neutral'}. Maximum 100 characters.`;
      const res = await base44.integrations.Core.InvokeLLM({ prompt });
      setQuote(res.replace(/^"|"$/g, ''));
    } catch (e) {
      console.error(e);
    }
    setGeneratingQuote(false);
  };

  const handleSave = async () => {
    const safeFullName = fullName.trim();
    if (!safeFullName) {
      alert("Name is required");
      return;
    }

    setSaving(true);
    const updateData = { full_name: safeFullName, bio, mood, quote };
    await base44.auth.updateMe(updateData);
    // Sync to public UserProfile entity so other users can see this profile
    const updatedUser = await base44.auth.me();
    await syncUserProfile(updatedUser).catch(() => {});
    await onSave();
    setSaving(false);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold dark:text-white">Edit Profile</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors select-none"
          >
            <X className="w-5 h-5 dark:text-white select-none" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <Label>Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-2" />
          </div>

          <div>
            <div className="flex justify-between items-center">
              <Label>Bio</Label>
              <button
                onClick={generateBio}
                disabled={generatingBio}
                className="text-xs flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:underline disabled:opacity-50"
              >
                <Wand2 className="w-3 h-3" />
                {generatingBio ? "Magic..." : "Auto-generate"}
              </button>
            </div>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell others about yourself..."
              className="mt-2 min-h-32 dark:bg-gray-700 dark:text-white"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {BIO_SUGGESTIONS.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setBio(suggestion)}
                  className="text-xs px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors select-none"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Mood Status</Label>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {MOODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(m)}
                  className={`text-3xl p-3 rounded-xl transition-all select-none ${
                    mood === m
                      ? "bg-purple-100 dark:bg-purple-900/50 scale-110 shadow-lg"
                      : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center">
              <Label>Favorite Quote / Life Motto</Label>
              <button
                onClick={generateQuote}
                disabled={generatingQuote}
                className="text-xs flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:underline disabled:opacity-50"
              >
                <Wand2 className="w-3 h-3" />
                {generatingQuote ? "Magic..." : "Auto-generate"}
              </button>
            </div>
            <Textarea
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder="Share your favorite quote or life motto..."
              className="mt-2 min-h-24 dark:bg-gray-700 dark:text-white"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {QUOTE_SUGGESTIONS.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setQuote(suggestion)}
                  className="text-xs px-3 py-1.5 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-full hover:bg-pink-200 dark:hover:bg-pink-900/50 transition-colors select-none"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1 select-none">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 select-none"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2 select-none" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
