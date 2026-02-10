import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B0C15] py-8 px-4 text-gray-900 dark:text-gray-100">
      <div className="max-w-3xl mx-auto">
        <Link to={createPageUrl("Discover")} className="inline-flex items-center text-purple-600 dark:text-purple-400 mb-6 hover:underline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Discover
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            <h1 className="text-3xl font-bold">Privacy Policy</h1>
          </div>
          
          <div className="space-y-6 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            <section>
              <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">1. Introduction</h2>
              <p>
                Welcome to MindCircle ("we," "our," or "us"). We are committed to protecting your privacy and ensuring you have a positive experience on our website and in using our services. This policy outlines our handling practices and how we collect and use the Personal Data you provide during your interactions with us.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">2. Data We Collect</h2>
              <p>
                We collect information that identifies, relates to, describes, references, is capable of being associated with, or could reasonably be linked, directly or indirectly, with a particular consumer or device ("Personal Information"). This includes:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Identifiers such as name, email address, and profile photo.</li>
                <li>Content you create, such as interests, pulses, and messages.</li>
                <li>Usage data and interactions with other users.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">3. How We Use Your Data</h2>
              <p>
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Provide, support, and personalize our services.</li>
                <li>Create, maintain, customize, and secure your account.</li>
                <li>Process your requests, purchases, transactions, and payments.</li>
                <li>Provide you with support and to respond to your inquiries.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">4. Data Sharing</h2>
              <p>
                We do not share your personal information with third parties for their marketing purposes. We may share your information with service providers who help us operate the app, such as hosting and database providers, under strict confidentiality agreements.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">5. Your Rights</h2>
              <p>
                You have the right to access, correct, or delete your personal information. You can manage your profile settings directly within the app or contact us for assistance. You can delete your account at any time through the Settings page.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">6. Prohibited Content & Conduct</h2>
              <p>
                To maintain a safe, respectful, and positive environment, the following are strictly prohibited on MindCircle:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Aggressive or Hateful Content:</strong> Images or text that promote violence, hate speech, harassment, or bullying.</li>
                <li><strong>Explicit Content:</strong> Sexually explicit material, nudity, or pornography is strictly forbidden.</li>
                <li><strong>Private Information:</strong> Posting private or confidential images/information of others without their explicit consent (doxing or non-consensual sharing).</li>
                <li><strong>Intellectual Property:</strong> Uploading content that infringes on copyrights, trademarks, or other intellectual property rights of others.</li>
                <li><strong>Illegal Activities:</strong> Content that promotes or depicts illegal acts.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">7. Account Termination & Enforcement</h2>
              <p>
                We enforce a zero-tolerance policy for severe violations. We reserve the right to:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Remove any content that violates these policies at our sole discretion.</li>
                <li>Immediately suspend or permanently ban any account found violating these rules, without prior notice or warning.</li>
                <li>Report illegal content to appropriate authorities.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">8. Changes to This Policy</h2>
              <p>
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">9. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us at privacy@mindcircle.app.
              </p>
            </section>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 text-center">
            Last updated: {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}
