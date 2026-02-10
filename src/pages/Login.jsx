import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Mail, Shield, User, Phone, CheckSquare, Apple } from "lucide-react";
import { mc } from "@/api/mcClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPageUrl } from "@/utils";
import SpaceBackdrop from "@/components/SpaceBackdrop";

function normalizeNextPath(next) {
  if (!next) return "/";
  if (/^https?:\/\//i.test(next)) {
    try {
      const parsed = new URL(next);
      next = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return "/";
    }
  }
  if (!next.startsWith("/")) return "/";
  if (next.startsWith("/Login")) return "/";
  return next;
}

const FIRST_WELCOME_KEY = "mindcircle_v2_first_welcome_seen";

function getWelcomeSeen() {
  try {
    return localStorage.getItem(FIRST_WELCOME_KEY) === "1";
  } catch {
    return false;
  }
}

function markWelcomeSeen() {
  try {
    localStorage.setItem(FIRST_WELCOME_KEY, "1");
  } catch {
    // Ignore storage errors; onboarding can still proceed.
  }
}

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = React.useState("signin");
  const [showWelcome, setShowWelcome] = React.useState(false);

  const [loginEmail, setLoginEmail] = React.useState("");
  const [loginPassword, setLoginPassword] = React.useState("");

  const [username, setUsername] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [signupEmail, setSignupEmail] = React.useState("");
  const [signupPhone, setSignupPhone] = React.useState("");
  const [signupPassword, setSignupPassword] = React.useState("");
  const [ageConfirmed, setAgeConfirmed] = React.useState(false);
  const [termsAccepted, setTermsAccepted] = React.useState(false);

  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [showForgotPassword, setShowForgotPassword] = React.useState(false);
  const [forgotEmail, setForgotEmail] = React.useState("");
  const [forgotCode, setForgotCode] = React.useState("");
  const [forgotNewPassword, setForgotNewPassword] = React.useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = React.useState("");
  const [forgotRequested, setForgotRequested] = React.useState(false);
  const [forgotNotice, setForgotNotice] = React.useState("");
  const [forgotError, setForgotError] = React.useState("");
  const [localResetCode, setLocalResetCode] = React.useState("");
  const [forgotLoading, setForgotLoading] = React.useState(false);

  const adminCreds = mc.getLocalAdminCredentials?.();

  React.useEffect(() => {
    const hasSeenWelcome = getWelcomeSeen();
    if (!hasSeenWelcome) {
      setShowWelcome(true);
      setMode("signup");
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await mc.auth.loginViaEmailPassword(loginEmail, loginPassword);
      const nextPath = normalizeNextPath(searchParams.get("next"));
      navigate(nextPath, { replace: true });
      window.location.reload();
    } catch (loginError) {
      setError(loginError?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const canSubmitSignup = Boolean(
    username.trim() &&
      firstName.trim() &&
      lastName.trim() &&
      signupEmail.trim() &&
      signupPhone.trim() &&
      signupPassword.trim() &&
      ageConfirmed &&
      termsAccepted
  );
  const canSubmitProviderSignup = Boolean(
    username.trim() &&
      firstName.trim() &&
      lastName.trim() &&
      signupEmail.trim() &&
      signupPhone.trim() &&
      ageConfirmed &&
      termsAccepted
  );

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!canSubmitSignup) return;

    setLoading(true);
    setError("");
    try {
      await mc.auth.register({
        username: username.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: signupEmail.trim(),
        phone: signupPhone.trim(),
        password: signupPassword,
        age_confirmed: ageConfirmed,
        terms_accepted: termsAccepted
      });
      navigate(createPageUrl("Onboarding"), { replace: true });
      window.location.reload();
    } catch (signupError) {
      setError(signupError?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleProviderAuth = async (providerName, sourceMode = "signin") => {
    setLoading(true);
    setError("");
    try {
      if (sourceMode === "signup" && !canSubmitProviderSignup) {
        throw new Error("Fill required sign up fields and accept age/terms first");
      }

      const providerEmail = sourceMode === "signup" ? signupEmail : loginEmail;
      if (!providerEmail.trim()) {
        throw new Error(`Enter your email first to continue with ${providerName}`);
      }

      const result = await mc.auth.loginWithProvider(providerName, {
        email: providerEmail.trim(),
        username: username.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        full_name: `${firstName} ${lastName}`.trim(),
        phone: signupPhone.trim()
      });

      const nextPath = normalizeNextPath(searchParams.get("next"));
      const targetPath = sourceMode === "signup" || result?.is_new_user ? createPageUrl("Onboarding") : nextPath;
      navigate(targetPath, { replace: true });
      window.location.reload();
    } catch (providerError) {
      setError(providerError?.message || `${providerName} login failed`);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordRequest = async () => {
    setForgotError("");
    setForgotNotice("");
    if (!forgotEmail.trim()) {
      setForgotError("Enter your email first");
      return;
    }

    setForgotLoading(true);
    try {
      const result = await mc.auth.resetPasswordRequest({ email: forgotEmail.trim() });
      setForgotRequested(true);
      setLocalResetCode(result?.local_reset_code || "");
      setForgotNotice(result?.message || "Reset code was generated.");
    } catch (requestError) {
      setForgotError(requestError?.message || "Could not request reset code");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setForgotError("");
    setForgotNotice("");

    if (!forgotCode.trim()) {
      setForgotError("Enter reset code");
      return;
    }
    if (!forgotNewPassword.trim()) {
      setForgotError("Enter new password");
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError("Passwords do not match");
      return;
    }

    setForgotLoading(true);
    try {
      await mc.auth.resetPassword({
        email: forgotEmail.trim(),
        code: forgotCode.trim(),
        newPassword: forgotNewPassword
      });
      setLoginEmail(forgotEmail.trim());
      setLoginPassword(forgotNewPassword);
      setShowForgotPassword(false);
      setForgotRequested(false);
      setForgotCode("");
      setForgotNewPassword("");
      setForgotConfirmPassword("");
      setForgotNotice("");
      setLocalResetCode("");
    } catch (resetError) {
      setForgotError(resetError?.message || "Password reset failed");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden px-4 py-10">
      <SpaceBackdrop density="auth" />
      <div className="relative z-10 max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/95 rounded-3xl p-8 shadow-2xl"
        >
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-100 flex items-center justify-center mb-3">
              <Shield className="w-7 h-7 text-indigo-700" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">MindCircle</h1>
            <p className="text-sm text-gray-600 mt-1">
              Sign in or create your account to continue.
            </p>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-2 p-1 rounded-xl bg-gray-100">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError("");
              }}
              className={`py-2 rounded-lg text-sm font-semibold transition-colors ${
                mode === "signin" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError("");
              }}
              className={`py-2 rounded-lg text-sm font-semibold transition-colors ${
                mode === "signup" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"
              }`}
            >
              Sign up
            </button>
          </div>

          {mode === "signin" ? (
            <form className="space-y-4" onSubmit={handleLogin}>
              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => handleProviderAuth("apple", "signin")}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 disabled:opacity-60"
                  disabled={loading}
                >
                  <Apple className="w-4 h-4" />
                  Sign in with Apple ID
                </button>
                <button
                  type="button"
                  onClick={() => handleProviderAuth("google", "signin")}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 disabled:opacity-60"
                  disabled={loading}
                >
                  <CheckSquare className="w-4 h-4" />
                  Sign in with Google ID
                </button>
              </div>

              <div className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Or sign in with Email</div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="email"
                    required
                    autoComplete="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="pl-9"
                    placeholder="user@mindcircle.local"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="pl-9"
                    placeholder="Password"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-xs font-semibold text-indigo-600 hover:underline"
                  onClick={() => {
                    setShowForgotPassword((prev) => !prev);
                    setForgotEmail((current) => current || loginEmail);
                    setForgotError("");
                    setForgotNotice("");
                  }}
                >
                  Forgot password?
                </button>
              </div>

              {showForgotPassword && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 space-y-3">
                  <p className="text-xs font-semibold text-indigo-900">
                    Reset password
                  </p>
                  <div>
                    <label className="text-xs font-semibold text-indigo-900 mb-1 block">Email</label>
                    <Input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="user@mindcircle.local"
                    />
                  </div>

                  {!forgotRequested ? (
                    <Button
                      type="button"
                      onClick={handleForgotPasswordRequest}
                      disabled={forgotLoading}
                      className="w-full bg-indigo-600 hover:bg-indigo-700"
                    >
                      {forgotLoading ? "Sending code..." : "Send reset code"}
                    </Button>
                  ) : (
                    <>
                      {localResetCode && (
                        <div className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs text-indigo-900">
                          Local reset code: <span className="font-bold tracking-wider">{localResetCode}</span>
                        </div>
                      )}
                      <div>
                        <label className="text-xs font-semibold text-indigo-900 mb-1 block">Reset code</label>
                        <Input
                          value={forgotCode}
                          onChange={(e) => setForgotCode(e.target.value)}
                          placeholder="6-digit code"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-indigo-900 mb-1 block">New password</label>
                        <Input
                          type="password"
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                          autoComplete="new-password"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-indigo-900 mb-1 block">Confirm new password</label>
                        <Input
                          type="password"
                          value={forgotConfirmPassword}
                          onChange={(e) => setForgotConfirmPassword(e.target.value)}
                          autoComplete="new-password"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          onClick={handleForgotPasswordRequest}
                          disabled={forgotLoading}
                          variant="outline"
                        >
                          Resend code
                        </Button>
                        <Button
                          type="button"
                          onClick={handleResetPassword}
                          disabled={forgotLoading}
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
                          {forgotLoading ? "Updating..." : "Update password"}
                        </Button>
                      </div>
                    </>
                  )}

                  {forgotNotice && <p className="text-xs text-indigo-900">{forgotNotice}</p>}
                  {forgotError && <p className="text-xs text-red-700">{forgotError}</p>}
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleSignup}>
              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => handleProviderAuth("apple", "signup")}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 disabled:opacity-60"
                  disabled={loading || !canSubmitProviderSignup}
                >
                  <Apple className="w-4 h-4" />
                  Sign up with Apple ID
                </button>
                <button
                  type="button"
                  onClick={() => handleProviderAuth("google", "signup")}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 disabled:opacity-60"
                  disabled={loading || !canSubmitProviderSignup}
                >
                  <CheckSquare className="w-4 h-4" />
                  Sign up with Google ID
                </button>
                <div className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Sign up with Email</div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">Username</label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input value={username} onChange={(e) => setUsername(e.target.value)} className="pl-9" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">First Name</label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">Last Name</label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input value={signupPhone} onChange={(e) => setSignupPhone(e.target.value)} className="pl-9" required />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={ageConfirmed}
                  onChange={(e) => setAgeConfirmed(e.target.checked)}
                  className="mt-0.5"
                />
                <span>I confirm that I am 18 years old or older</span>
              </label>

              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  I agree with{" "}
                  <a className="text-indigo-600 underline" href={createPageUrl("PrivacyPolicy")} target="_blank" rel="noreferrer">
                    Terms and Conditions
                  </a>
                </span>
              </label>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={loading || !canSubmitSignup} className="w-full bg-indigo-600 hover:bg-indigo-700">
                {loading ? "Creating..." : "OK"}
              </Button>
            </form>
          )}

          <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-900">
            <p className="font-semibold mb-1">Local access</p>
            {adminCreds && <p>Admin: {adminCreds.email} / {adminCreds.password}</p>}
            <p>Demo: demo@mindcircle.local / demo12345</p>
            <p>Invite password: welcome12345</p>
          </div>
        </motion.div>
      </div>

      {showWelcome && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-[140] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">Welcome</h2>
            <p className="text-gray-700 leading-relaxed text-center mb-7">
              This app is designed to help you find people with the most similar interests across all areas of life.
            </p>
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              onClick={() => {
                markWelcomeSeen();
                setShowWelcome(false);
                setMode("signup");
              }}
            >
              OK
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
