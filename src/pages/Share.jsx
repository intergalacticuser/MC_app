import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { Upload, Sparkles } from "lucide-react";

export default function Share() {
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadUser();
    handleSharedData();
  }, []);

  const loadUser = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
    } catch (error) {
      base44.auth.redirectToLogin(window.location.href);
    }
  };

  const handleSharedData = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedTitle = urlParams.get("title");
    const sharedText = urlParams.get("text");
    const sharedUrl = urlParams.get("url");

    if (sharedTitle || sharedText || sharedUrl) {
      console.log("Shared data:", { sharedTitle, sharedText, sharedUrl });
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // You could create an interest with this photo or handle it differently
      alert("Photo uploaded! You can now add it to your planet.");
      navigate(createPageUrl("MyProfile"));
    } catch (error) {
      console.error("Error uploading:", error);
      alert("Error uploading photo");
    }
    setUploading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-6 py-3 rounded-full mb-4 shadow-lg">
            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-medium text-purple-600 dark:text-purple-400">Share to your planet</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 dark:from-purple-400 dark:via-pink-400 dark:to-orange-400 bg-clip-text text-transparent">
            Add to Your Universe
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/50 dark:border-gray-700/50"
        >
          <div className="text-center">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center hover:scale-105 transition-transform">
                {uploading ? (
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                ) : (
                  <Upload className="w-16 h-16 text-white" />
                )}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Upload a Photo
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Share photos from your gallery to add to your planet
              </p>
            </label>
          </div>
        </motion.div>
      </div>
    </div>
  );
}