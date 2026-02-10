import React from "react";
import { motion } from "framer-motion";
import { Coins as CoinsIcon, Sparkles, Map } from "lucide-react";

export default function TutorialPopup({
  step,
  onClose,
  showCoins = false,
  coinsAmount = 0,
  customTitle = "",
  customText = "",
  customButton = ""
}) {
  const content = {
    welcome: {
      title: "Welcome to MindCircle! 🌟",
      text: "This app allows you to easily and conveniently find users who match your interests. Let's get started!",
      button: "Let's go!",
      icon: <Sparkles className="w-12 h-12 text-purple-400" />
    },
    profile_intro: {
      title: "This is your page 🗺️",
      text: "On this page you fill in your profile according to your interests and preferences. Thanks to your completed profile, our system will be able to find the perfect match for you!",
      button: "Got it!",
      icon: <Map className="w-12 h-12 text-pink-400" />
    },
    profile: {
      title: "This is your profile page",
      text: "Here you fill in what is important and interesting to you. Based on this profile, other users will find you, search for you, and match with you.",
      button: "OK"
    },
    my_map_info: {
      title: "My Map",
      text:
        "This is your central profile page.\n\nHere you can build your profile based on your interests and what matters to you.\n\nThe more complete your profile is, the more opportunities you unlock and the more relevant matches you will get based on your interests.",
      button: "OK",
      icon: <Map className="w-12 h-12 text-pink-400" />
    },
    search_info: {
      title: "Search",
      text:
        "This is the search page.\n\nHere you can see users available in the system and explore people by interests.\n\nYou can also use the Perfect Matching feature to find the most suitable matches.",
      button: "OK",
      icon: <Sparkles className="w-12 h-12 text-purple-400" />
    },
    reward: {
      title: "Congratulations!",
      text: `You've earned ${coinsAmount} coins for completing this category.`,
      button: "OK"
    },
    coins: {
      title: "Coins are the in-app currency",
      text: "You can use coins to unlock additional features, such as:\n— opening hidden user categories\n— sending gifts\n— improving match recommendations.",
      button: "OK"
    },
    search: {
      title: "This is the main search page",
      text: "Here you can find people by interests and start the Perfect Matching to discover the most suitable partner.",
      button: "OK"
    },
    matching: {
      title: "This is the matching page",
      text: "Here you will see users who match you the most based on your interests and photos. The system analyzes uploaded photos and shows people with the highest number of matches.",
      button: "OK"
    }
  };

  const base = content[step] || content.welcome;
  const current = {
    ...base,
    title: customTitle || base.title,
    text: customText || base.text,
    button: customButton || base.button
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.9 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-800 relative"
      >
        {showCoins && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2"
          >
            <CoinsIcon className="w-6 h-6" />
            <span className="text-2xl font-bold">+{coinsAmount}</span>
          </motion.div>
        )}

        {current.icon && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring" }}
            className="flex justify-center mb-5"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center">
              {current.icon}
            </div>
          </motion.div>
        )}

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 text-center">
          {current.title}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 text-center mb-8 whitespace-pre-line leading-relaxed text-base">
          {current.text}
        </p>
        <button
          onClick={onClose}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-bold text-lg hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          {current.button}
        </button>
      </motion.div>
    </motion.div>
  );
}
