import React from "react";
import { motion } from "framer-motion";
import { X, Check, Lock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";

const THEMES = [
  {
    id: "default",
    name: "Cosmic Purple",
    free: true,
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
  },
  {
    id: "nebula",
    name: "Nebula Dream",
    price: 50,
    gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk Neon",
    price: 50,
    gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
  },
  {
    id: "zen",
    name: "Zen Garden",
    price: 50,
    gradient: "linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)"
  },
  {
    id: "sunset",
    name: "Sunset Glow",
    price: 50,
    gradient: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)"
  },
  {
    id: "aurora",
    name: "Aurora Borealis",
    price: 100,
    gradient: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)"
  }
];

export default function PremiumThemes({ user, onClose, onSave }) {
  const [selectedTheme, setSelectedTheme] = React.useState(user.premium_theme || "default");
  const [purchasing, setPurchasing] = React.useState(false);

  const redirectToPremium = () => {
    alert("Themes are available only for Premium users.");
    window.location.href = createPageUrl("Premium");
  };

  const handlePurchase = async (theme) => {
    if (!user?.is_premium) {
      redirectToPremium();
      return;
    }

    if (theme.free) {
      setSelectedTheme(theme.id);
      return;
    }

    if ((user.coins || 100) < theme.price) {
      alert("Not enough cosmic energy! Visit the Coins page to recharge.");
      return;
    }

    setPurchasing(true);
    try {
      await base44.auth.updateMe({
        coins: (user.coins || 100) - theme.price,
        premium_theme: theme.id,
        owned_themes: [...(user.owned_themes || ["default"]), theme.id]
      });
      setSelectedTheme(theme.id);
      await onSave();
    } catch (error) {
      console.error("Error purchasing theme:", error);
    }
    setPurchasing(false);
  };

  const handleApply = async () => {
    if (!user?.is_premium) {
      redirectToPremium();
      return;
    }
    await base44.auth.updateMe({ premium_theme: selectedTheme });
    await onSave();
    onClose();
  };

  const ownedThemes = user.owned_themes || ["default"];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[90] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-900 rounded-3xl max-w-2xl w-full p-6 relative max-h-[calc(100dvh-8.5rem)] md:max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Premium Themes</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Customize your universe with exclusive backgrounds</p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {THEMES.map(theme => {
            const owned = ownedThemes.includes(theme.id);
            const selected = selectedTheme === theme.id;

            return (
              <motion.button
                key={theme.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => owned ? setSelectedTheme(theme.id) : handlePurchase(theme)}
                disabled={purchasing}
                className={`relative rounded-2xl p-4 border-4 transition-all ${
                  selected 
                    ? "border-purple-500 shadow-lg" 
                    : "border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                }`}
              >
                <div
                  className="w-full h-32 rounded-xl mb-3"
                  style={{ background: theme.gradient }}
                />
                
                <div className="text-center">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-1">{theme.name}</h3>
                  {theme.free ? (
                    <span className="text-xs text-green-600 dark:text-green-400 font-semibold">FREE</span>
                  ) : owned ? (
                    <div className="flex items-center justify-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <Check className="w-3 h-3" />
                      Owned
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1 text-xs text-purple-600 dark:text-purple-400">
                      <Lock className="w-3 h-3" />
                      {theme.price} coins
                    </div>
                  )}
                </div>

                {selected && (
                  <motion.div
                    layoutId="selected"
                    className="absolute inset-0 border-4 border-purple-500 rounded-2xl"
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="sticky bottom-0 pt-3 bg-white/95 dark:bg-gray-900/95">
          <button
            onClick={handleApply}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all"
          >
            Apply Theme
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
