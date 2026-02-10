import React from "react";
import { Twitter, Link as LinkIcon, Send, MessageCircle, Facebook } from "lucide-react";
import { toast } from "sonner";

export default function SocialShareButtons({ title, text, url }) {
  const shareLinks = [
    {
      name: "Twitter",
      icon: Twitter,
      className: "bg-black text-white hover:bg-gray-800",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
    },
    {
      name: "WhatsApp",
      icon: MessageCircle,
      className: "bg-[#25D366] text-white hover:bg-[#20bd5a]",
      href: `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`
    },
    {
      name: "Telegram",
      icon: Send,
      className: "bg-[#0088cc] text-white hover:bg-[#0077b5]",
      href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
    },
    {
      name: "Facebook",
      icon: Facebook,
      className: "bg-[#1877F2] text-white hover:bg-[#166fe5]",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
    }
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(`${text} ${url}`);
    toast.success("Link copied to clipboard!");
  };

  return (
    <div className="flex gap-3 justify-center mt-4 flex-wrap">
      {shareLinks.map((link) => (
        <a 
          key={link.name} 
          href={link.href} 
          target="_blank" 
          rel="noopener noreferrer"
          className={`p-3 rounded-full transition-all hover:scale-110 ${link.className}`}
          title={`Share on ${link.name}`}
          onClick={(e) => e.stopPropagation()}
        >
          <link.icon className="w-5 h-5 fill-current" />
        </a>
      ))}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          handleCopy();
        }}
        className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all hover:scale-110"
        title="Copy Link"
      >
        <LinkIcon className="w-5 h-5" />
      </button>
    </div>
  );
}