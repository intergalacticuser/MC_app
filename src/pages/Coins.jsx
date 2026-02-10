import React, { useState, useEffect } from "react";
import { mc } from "@/api/mcClient";
import { motion } from "framer-motion";
import { Coins as CoinsIcon, Sparkles, CreditCard, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

const COIN_PACKAGES = [
  { amount: 100, price: 9.99, bonus: 0, popular: false },
  { amount: 500, price: 39.99, bonus: 50, popular: true },
  { amount: 1000, price: 69.99, bonus: 200, popular: false },
  { amount: 2500, price: 149.99, bonus: 600, popular: false },
];

export default function Coins() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const user = await mc.auth.me();
      setCurrentUser(user);
    } catch (error) {
      console.error("Error loading user:", error);
    }
    setLoading(false);
  };

  const handlePurchase = async (pkg) => {
    setPurchasing(true);
    try {
      // Simulated purchase - in production this would integrate with payment system
      const totalCoins = pkg.amount + pkg.bonus;
      const newBalance = (currentUser.coins ?? 100) + totalCoins;
      
      await mc.auth.updateMe({ coins: newBalance });
      
      setCurrentUser({ ...currentUser, coins: newBalance });
      
      alert(`Success! You received ${totalCoins} coins!`);
    } catch (error) {
      console.error("Error purchasing coins:", error);
      alert("Error purchasing coins");
    }
    setPurchasing(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full mb-6 shadow-lg">
            <Wallet className="w-5 h-5 text-amber-600" />
            <span className="text-sm font-medium text-amber-600">Your wallet</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-500 bg-clip-text text-transparent">
            Coins
          </h1>
          <p className="text-xl text-purple-200 max-w-2xl mx-auto">
            Top up your balance and unlock more possibilities
          </p>
        </motion.div>

        {/* Current Balance Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-yellow-400 rounded-3xl p-8 shadow-2xl border-4 border-white relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24" />
            
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-white/80 text-lg mb-2">Current balance</p>
                <div className="flex items-center gap-3">
                  <CoinsIcon className="w-12 h-12 text-white" />
                  <span className="text-6xl font-bold text-white">
                    {currentUser?.coins ?? 100}
                  </span>
                </div>
              </div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <CoinsIcon className="w-32 h-32 text-white/20" />
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Coin Packages */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {COIN_PACKAGES.map((pkg, index) => (
            <motion.div
              key={pkg.amount}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              whileHover={{ y: -10, scale: 1.02 }}
              className={`relative bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-xl border-4 transition-all ${
                pkg.popular 
                  ? "border-orange-400 shadow-orange-200" 
                  : "border-white hover:border-orange-200"
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-1 rounded-full text-sm font-bold flex items-center gap-1 shadow-lg">
                    <Sparkles className="w-4 h-4" />
                    Popular
                  </div>
                </div>
              )}

              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full mb-4">
                  <CoinsIcon className="w-10 h-10 text-white" />
                </div>
                
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  {pkg.amount}
                </div>
                {pkg.bonus > 0 && (
                  <div className="text-green-600 font-bold text-sm mb-2">
                    +{pkg.bonus} bonus!
                  </div>
                )}
                <div className="text-3xl font-bold text-amber-600">
                   ${pkg.price.toFixed(2)}
                </div>
              </div>

              <Button
                onClick={() => handlePurchase(pkg)}
                disabled={purchasing}
                className={`w-full py-6 text-lg font-bold rounded-xl transition-all ${
                  pkg.popular
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                    : "bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500"
                } text-white shadow-lg`}
              >
                <CreditCard className="w-5 h-5 mr-2" />
                {purchasing ? "Processing..." : "Buy"}
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border-4 border-white"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-600" />
            What are coins for?
          </h2>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start gap-3">
              <span className="text-2xl">🔓</span>
              <span>Unlock premium app features</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-2xl">🎁</span>
              <span>Send gifts to other users</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-2xl">⭐</span>
              <span>Boost your profile visibility</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-2xl">💬</span>
              <span>Access extended chat features</span>
            </li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}