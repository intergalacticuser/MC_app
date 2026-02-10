import React, { useState, useEffect, useRef } from "react";
import { mc } from "@/api/mcClient";
import { motion } from "framer-motion";
import { Send, Lock, User as UserIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { calculateMatchScore, MESSAGE_UNLOCK_THRESHOLD, isProfileDiscoverable } from "@/components/utils/matchingUtils";

export default function Messages() {
  const [currentUser, setCurrentUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [interests, setInterests] = useState([]);
  const [allMessages, setAllMessages] = useState([]);
  const [matchScores, setMatchScores] = useState({});
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  // Auto-open conversation from URL param (e.g. from UserProfile "Messages" button)
  useEffect(() => {
    if (!currentUser || loading) return;
    const params = new URLSearchParams(window.location.search);
    const targetUserId = params.get("userId");
    if (!targetUserId) return;

    // Add to conversations if not already there
    if (!conversations.includes(targetUserId)) {
      setConversations(prev => [targetUserId, ...prev]);
    }

    // Compute match score if missing
    if (!matchScores[targetUserId]) {
      const otherUser = allUsers.find(u => u.id === targetUserId);
      if (otherUser) {
        const score = calculateMatchScore(currentUser, otherUser, interests, allMessages);
        setMatchScores(prev => ({ ...prev, [targetUserId]: score }));
      }
    }

    selectConversation(targetUserId);
  }, [currentUser, loading]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const loadData = async () => {
    try {
      const me = await mc.auth.me();
      setCurrentUser(me);

      const [profiles, msgs, ints] = await Promise.all([
        mc.entities.UserProfile.list().catch(() => []),
        mc.entities.Message.list().catch(() => []),
        mc.entities.Interest.list().catch(() => [])
      ]);

      const users = (profiles || []).map(p => ({
        id: p.user_id,
        full_name: p.full_name,
        profile_photo: p.profile_photo,
        bio: p.bio,
        quote: p.quote,
        mood: p.mood,
        key_interest_categories: p.key_interest_categories || [],
        onboarding_completed: p.onboarding_completed,
        is_premium: p.is_premium,
        blocked_users: p.blocked_users,
        user_id: p.user_id
      }));
      setAllUsers(users.filter((u) => isProfileDiscoverable(u, ints || [])));
      setAllMessages(msgs || []);
      setInterests(ints || []);

      // Get unique users we have conversations with
      const userIds = new Set();
      msgs.forEach(msg => {
        if (msg.from_user_id === me.id) userIds.add(msg.to_user_id);
        if (msg.to_user_id === me.id) userIds.add(msg.from_user_id);
      });

      // Calculate match scores for all conversations
      const scores = {};
      userIds.forEach(userId => {
        const otherUser = users.find(u => u.id === userId);
        if (otherUser) {
          const score = calculateMatchScore(me, otherUser, ints, msgs);
          scores[userId] = score;
        }
      });
      setMatchScores(scores);

      setConversations(Array.from(userIds));
      setLoading(false);
    } catch (error) {
      console.error("Error loading data:", error);
      setLoading(false);
    }
  };

  const selectConversation = (userId) => {
    setSelectedUserId(userId);
    const userMessages = allMessages.filter(
      msg =>
        (msg.from_user_id === currentUser.id && msg.to_user_id === userId) ||
        (msg.from_user_id === userId && msg.to_user_id === currentUser.id)
    );
    setMessages(userMessages.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));

    // Mark as read
    userMessages.forEach(msg => {
      if (msg.to_user_id === currentUser.id && !msg.is_read) {
        mc.entities.Message.update(msg.id, { is_read: true });
      }
    });
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedUserId) return;

    // Check match score or premium unlock
    const matchScore = matchScores[selectedUserId];
    if (!currentUser?.is_premium && (!matchScore || !matchScore.canMessage)) {
      alert(`You need ${MESSAGE_UNLOCK_THRESHOLD}% match compatibility or Premium to message this user`);
      return;
    }

    setSending(true);
    try {
      const newMessage = await mc.entities.Message.create({
        from_user_id: currentUser.id,
        to_user_id: selectedUserId,
        text: messageText,
        is_read: false
      });

      await mc.entities.Notification.create({
        type: "message",
        from_user_id: currentUser.id,
        to_user_id: selectedUserId,
        text: `${currentUser.full_name} sent you a message`
      }).catch(() => {});

      setMessages([...messages, newMessage]);
      setMessageText("");
      setAllMessages([...allMessages, newMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message");
    }
    setSending(false);
  };

  const selectedUser = allUsers.find(u => u.id === selectedUserId);
  const selectedConversationScore = selectedUserId ? matchScores[selectedUserId] : null;
  const canSendToSelected = Boolean(currentUser?.is_premium || selectedConversationScore?.canMessage);

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
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Messages</h1>
          <p className="text-purple-200">Connect with your matches</p>
        </div>

        {/* Layout */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[70vh] md:h-[calc(100vh-200px)]">
          {/* Conversations List */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="md:col-span-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl overflow-hidden shadow-xl border border-white/20 flex flex-col"
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-bold text-gray-900 dark:text-white">Conversations</h2>
            </div>

            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                  No conversations yet
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {conversations.map(userId => {
                    const user = allUsers.find(u => u.id === userId);
                    const score = matchScores[userId];
                    const unreadCount = allMessages.filter(
                      msg =>
                        msg.to_user_id === currentUser.id &&
                        msg.from_user_id === userId &&
                        !msg.is_read
                    ).length;

                    return (
                      <motion.button
                        key={userId}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => selectConversation(userId)}
                        className={`w-full text-left p-3 rounded-xl transition-all ${
                          selectedUserId === userId
                            ? "bg-purple-100 dark:bg-purple-900/30"
                            : "hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-purple-200 dark:border-purple-700">
                            {user?.profile_photo ? (
                              <img src={user.profile_photo} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-purple-300 dark:bg-purple-700 flex items-center justify-center">
                                <UserIcon className="w-5 h-5 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                              {user?.full_name}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {score ? `${score.percentage}% match` : "No match"}
                            </p>
                          </div>
                          {unreadCount > 0 && (
                            <span className="text-xs font-bold bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>

          {/* Chat Area */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="md:col-span-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl overflow-hidden shadow-xl border border-white/20 flex flex-col"
          >
            {selectedUserId ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-purple-200 dark:border-purple-700">
                      {selectedUser?.profile_photo ? (
                        <img src={selectedUser.profile_photo} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-purple-300 dark:bg-purple-700 flex items-center justify-center">
                          <UserIcon className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-900 dark:text-white">
                        {selectedUser?.full_name}
                      </h2>
                      <p className="text-sm text-purple-600 dark:text-purple-400 font-semibold">
                        {selectedConversationScore
                          ? `${selectedConversationScore.percentage}% match`
                          : currentUser?.is_premium
                            ? "Premium unlocked"
                            : "No match data"}
                      </p>
                    </div>
                  </div>
                  <Link to={`${createPageUrl("UserProfile")}?userId=${selectedUserId}`}>
                    <Button variant="ghost" size="sm">
                      View Profile
                    </Button>
                  </Link>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-purple-50/50 dark:from-gray-700/30 to-transparent">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <p className="text-gray-500 dark:text-gray-400">No messages yet</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Say hello to start the conversation!</p>
                      </div>
                    </div>
                  ) : (
                    messages.map((message, index) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`flex ${message.from_user_id === currentUser.id ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-xs px-4 py-2 rounded-2xl ${
                            message.from_user_id === currentUser.id
                              ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-br-none"
                              : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none"
                          }`}
                        >
                          <p className="text-sm">{message.text}</p>
                          <p className="text-xs mt-1 opacity-70">
                            {new Date(message.created_date).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </p>
                        </div>
                      </motion.div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                {canSendToSelected ? (
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                    <Input
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 bg-gray-100 dark:bg-gray-700 border-0 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageText.trim() || sending}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-orange-50 dark:bg-orange-900/20 rounded-b-3xl flex items-center gap-2 text-orange-700 dark:text-orange-400 text-sm">
                    <Lock className="w-4 h-4 flex-shrink-0" />
                    <span>Unlock messaging with {MESSAGE_UNLOCK_THRESHOLD}%+ compatibility or Premium</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <Clock className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
