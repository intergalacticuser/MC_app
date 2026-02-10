import React, { useState, useEffect } from "react";
import { mc } from "@/api/mcClient";
import { motion } from "framer-motion";
import { Crown, Check, Zap, Eye, Search, Heart, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { syncUserProfile } from "@/components/utils/syncProfile";

const PLANS = [
  {
    type: "monthly",
    duration: "1 month",
    price: 9.99,
    discount: 0,
    features: [
      "Unlimited profile views",
      "Advanced search filters",
      "See who liked you",
      "Priority in search",
      "Exclusive customization",
      "View full profiles without 30% match"
    ]
  },
  {
    type: "quarterly",
    duration: "3 months",
    price: 24.99,
    discount: 17,
    features: [
      "Unlimited profile views",
      "Advanced search filters",
      "See who liked you",
      "Priority in search",
      "Exclusive customization",
      "View full profiles without 30% match"
    ]
  },
  {
    type: "yearly",
    duration: "1 year",
    price: 79.99,
    discount: 33,
    features: [
      "Unlimited profile views",
      "Advanced search filters",
      "See who liked you",
      "Priority in search",
      "Exclusive customization",
      "View full profiles without 30% match"
    ]
  }
];

export default function Premium() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await mc.auth.me();
      setCurrentUser(user);

      if (user.is_premium) {
        const subs = await mc.entities.Subscription.filter({
          user_id: user.id,
          status: "active"
        });
        if (subs.length > 0) {
          setSubscription(subs[0]);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setLoading(false);
  };

  const handleSubscribe = async (plan) => {
    setSubscribing(true);
    try {
      const now = new Date();
      const expiresAt = new Date();

      if (plan.type === "monthly") {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      } else if (plan.type === "quarterly") {
        expiresAt.setMonth(expiresAt.getMonth() + 3);
      } else {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      }

      await mc.entities.Subscription.create({
        user_id: currentUser.id,
        plan_type: plan.type,
        started_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        status: "active",
        auto_renew: true
      });

      await mc.auth.updateMe({
        is_premium: true,
        premium_expires_at: expiresAt.toISOString(),
        coins: (currentUser.coins || 0) - Math.round(plan.price * 100)
      });
      const updatedUser = await mc.auth.me();
      await syncUserProfile(updatedUser).catch(() => {});

      alert(`Successfully subscribed to ${plan.duration} plan!`);
      await loadData();
    } catch (error) {
      console.error("Error subscribing:", error);
      alert("Error processing subscription");
    }
    setSubscribing(false);
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel your premium subscription?")) return;

    try {
      if (subscription) {
        await mc.entities.Subscription.update(subscription.id, {
          status: "cancelled"
        });
      }

      await mc.auth.updateMe({
        is_premium: false,
        premium_theme: "default"
      });
      const updatedUser = await mc.auth.me();
      await syncUserProfile(updatedUser).catch(() => {});

      alert("Premium subscription cancelled");
      await loadData();
    } catch (error) {
      console.error("Error cancelling:", error);
      alert("Error cancelling subscription");
    }
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
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <Link to={createPageUrl("MyProfile")}>
          <button className="flex items-center gap-2 text-purple-200 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Back to Profile
          </button>
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full mb-6 shadow-lg">
            <Crown className="w-5 h-5 text-amber-600" />
            <span className="text-sm font-medium text-amber-600">Premium Membership</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-500 bg-clip-text text-transparent">
            Unlock Your Potential
          </h1>
          <p className="text-xl text-purple-200 max-w-2xl mx-auto">
            Access exclusive features and connect more meaningfully
          </p>
        </motion.div>

        {/* Current Status */}
        {currentUser?.is_premium && subscription && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-12 bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-400 rounded-3xl p-8 shadow-2xl border-4 border-white text-center"
          >
            <h2 className="text-2xl font-bold text-white mb-2">You're a Premium Member!</h2>
            <p className="text-white/90 mb-4">
              Expires: {new Date(subscription.expires_at).toLocaleDateString()}
            </p>
            <Button
              onClick={handleCancel}
              variant="outline"
              className="bg-white text-orange-600 hover:bg-white/90"
            >
              Cancel Subscription
            </Button>
          </motion.div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {PLANS.map((plan, index) => (
            <motion.div
              key={plan.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -10 }}
              className={`relative bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-xl border-4 transition-all ${
                plan.discount > 0
                  ? "border-orange-400 shadow-orange-200 md:scale-105"
                  : "border-white"
              }`}
            >
              {plan.discount > 0 && (
                <div className="absolute -top-4 right-6">
                  <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                    Save {plan.discount}%
                  </div>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.duration}</h3>
                <div className="text-4xl font-bold text-amber-600 mb-2">${plan.price}</div>
                <p className="text-gray-600 text-sm">
                  {plan.type === "monthly"
                    ? "per month"
                    : plan.type === "quarterly"
                    ? "per 3 months"
                    : "per year"}
                </p>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleSubscribe(plan)}
                disabled={subscribing || (currentUser?.is_premium && subscription?.plan_type === plan.type)}
                className={`w-full py-6 text-lg font-bold rounded-xl transition-all ${
                  plan.discount > 0
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                    : "bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500"
                } text-white shadow-lg`}
              >
                {subscribing ? "Processing..." : currentUser?.is_premium && subscription?.plan_type === plan.type ? "Current Plan" : "Subscribe"}
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Benefits Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white/80 backdrop-blur-xl rounded-3xl p-12 shadow-xl border-4 border-white"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-2">
            <Crown className="w-8 h-8 text-amber-600" />
            Premium Benefits
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="flex gap-4">
              <Eye className="w-8 h-8 text-blue-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Unlimited Views</h3>
                <p className="text-gray-600 text-sm">Browse as many profiles as you want without limits</p>
              </div>
            </div>

            <div className="flex gap-4">
              <Search className="w-8 h-8 text-purple-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Advanced Filters</h3>
                <p className="text-gray-600 text-sm">Find exactly who you're looking for with smart filters</p>
              </div>
            </div>

            <div className="flex gap-4">
              <Heart className="w-8 h-8 text-red-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-gray-900 mb-2">See Admirers</h3>
                <p className="text-gray-600 text-sm">Discover who's interested in your profile</p>
              </div>
            </div>

            <div className="flex gap-4">
              <Zap className="w-8 h-8 text-orange-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Priority Status</h3>
                <p className="text-gray-600 text-sm">Appear higher in search results and get more visibility</p>
              </div>
            </div>

            <div className="flex gap-4">
              <Sparkles className="w-8 h-8 text-pink-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Custom Themes</h3>
                <p className="text-gray-600 text-sm">Personalize your profile with exclusive themes</p>
              </div>
            </div>

            <div className="flex gap-4">
              <Eye className="w-8 h-8 text-indigo-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Full Profile Access</h3>
                <p className="text-gray-600 text-sm">View complete profiles without compatibility requirements</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
