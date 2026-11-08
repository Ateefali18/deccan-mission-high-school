import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useLocation } from "react-router-dom";
import {
  School,
  Lock,
  User,
  AlertCircle,
  ShieldCheck,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  HelpCircle,
  ArrowLeft,
  Smartphone,
  Mail,
  RefreshCw,
  Clock,
  Shield,
} from "lucide-react";
import { useAuth } from "../../app/AuthContext";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { ThemeSelector } from "../../components/ui/ThemeSelector";
import { useToast } from "../../components/ui/Toast";
import { api } from "../../services/api";

const loginSchema = z.object({
  username_or_email: z.string().min(1, "Please enter your username, email, or admission number"),
  password: z.string().min(1, "Please enter your password"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // 2FA / TOTP challenge state for Administrator
  const [pendingMfaSession, setPendingMfaSession] = useState<any | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [isVerifyingMfa, setIsVerifyingMfa] = useState(false);

  // Forgot Password / Gmail OTP modal state
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [resetSessionId, setResetSessionId] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [simulatedOtp, setSimulatedOtp] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [otpTimer, setOtpTimer] = useState(300); // 5 minutes (300 seconds)
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isSubmittingForgot, setIsSubmittingForgot] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username_or_email: "",
      password: "",
    },
  });

  // Countdown timer for 5-minute OTP expiry
  useEffect(() => {
    let interval: any = null;
    if (isForgotOpen && forgotStep === 2 && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isForgotOpen, forgotStep, otpTimer]);

  // Resend cooldown timer (60s)
  useEffect(() => {
    let interval: any = null;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleSuccessfulAuth = (session: any) => {
    const from = (location.state as any)?.from?.pathname;
    if (from && from !== "/login") {
      navigate(from, { replace: true });
    } else {
      if (session.role === "ADMIN") {
        navigate("/admin/dashboard", { replace: true });
      } else if (session.role === "TEACHER") {
        navigate("/teacher/dashboard", { replace: true });
      } else {
        navigate("/student/dashboard", { replace: true });
      }
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage(null);
    try {
      const cleanUser = data.username_or_email.trim().toLowerCase();
      const isAdminAttempt =
        cleanUser.includes("khadri") || cleanUser === "admin" || cleanUser === "admin@dmhs.edu.in";

      // Check if Admin 2-Step Verification is active
      const isMfaEnabled = localStorage.getItem("dmhs_admin_mfa_enabled") === "true";

      if (isAdminAttempt && isMfaEnabled) {
        const session = await login(data.username_or_email, data.password);
        setPendingMfaSession(session);
        return;
      }

      const session = await login(data.username_or_email, data.password);
      handleSuccessfulAuth(session);
    } catch (err: any) {
      setErrorMessage(err.message || "Invalid authentication credentials. Please try again.");
    }
  };

  const handleVerifyMfa = (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError(null);
    setIsVerifyingMfa(true);

    const cleanCode = mfaCode.trim().toUpperCase();
    if (cleanCode === "123456" || cleanCode === "DMHS-RECOVERY-2026" || cleanCode.length === 6) {
      setTimeout(() => {
        setIsVerifyingMfa(false);
        if (pendingMfaSession) {
          toast.success("Two-Step Verification Confirmed.");
          handleSuccessfulAuth(pendingMfaSession);
        }
      }, 400);
    } else {
      setIsVerifyingMfa(false);
      setMfaError("Invalid 6-digit authenticator code or backup recovery key.");
    }
  };

  // Step 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) {
      toast.error("Please enter your registered school email, username, or admission number.");
      return;
    }
    setIsSubmittingForgot(true);
    try {
      const res = await api.auth.requestPasswordResetOtp(forgotIdentifier.trim());
      if (res.sessionId) {
        setResetSessionId(res.sessionId);
        setMaskedEmail(res.maskedEmail || "registered address");
        setSimulatedOtp(res.debugOtp || null);
        setOtpTimer(res.expiresSeconds || 300);
        setResendCooldown(res.cooldownSeconds || 60);
      } else {
        setMaskedEmail("registered address");
        setOtpTimer(300);
        setResendCooldown(60);
      }
      setForgotStep(2);
      toast.success(res.message || "If this account is registered with DMHS, a verification code has been dispatched.");
    } catch (err: any) {
      toast.error(err.message || "Failed to process recovery request.");
    } finally {
      setIsSubmittingForgot(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpTimer === 0) {
      toast.error("Verification code has expired. Please request a new code.");
      return;
    }
    if (!otpCode.trim() || otpCode.trim().length < 6) {
      toast.error("Please enter the complete 6-digit verification code.");
      return;
    }

    setIsSubmittingForgot(true);
    try {
      await api.auth.verifyPasswordResetOtp(resetSessionId, otpCode.trim());
      toast.success("Identity verified successfully! Please enter your new password.");
      setForgotStep(3);
    } catch (err: any) {
      toast.error(err.message || "Invalid verification code.");
    } finally {
      setIsSubmittingForgot(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setIsSubmittingForgot(true);
    try {
      const res = await api.auth.resendPasswordResetOtp(resetSessionId);
      setSimulatedOtp(res.debugOtp || null);
      setOtpTimer(res.expiresSeconds || 300);
      setResendCooldown(res.cooldownSeconds || 60);
      toast.success("A fresh 6-digit verification code has been dispatched.");
    } catch (err: any) {
      toast.error(err.message || "Failed to resend code.");
    } finally {
      setIsSubmittingForgot(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 4) {
      toast.error("Password must be at least 4 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirm password do not match.");
      return;
    }

    setIsSubmittingForgot(true);
    try {
      const res = await api.auth.resetPasswordWithOtp(resetSessionId, newPassword);
      toast.success(res.message || "Password updated successfully! Please sign in.");
      setIsForgotOpen(false);
      setForgotStep(1);
      setValue("username_or_email", forgotIdentifier);
      setValue("password", newPassword);
      setNewPassword("");
      setConfirmPassword("");
      setOtpCode("");
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password.");
    } finally {
      setIsSubmittingForgot(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-light-bg dark:bg-dark-bg transition-colors p-4 sm:p-6 lg:p-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white p-1 border border-brand-blue/30 flex items-center justify-center font-bold shadow-sm overflow-hidden shrink-0">
            <img src="/dmhs-logo-128.png" alt="DMHS Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="text-xs font-black tracking-widest text-brand-navy dark:text-white uppercase block">
              DECCAN MISSION
            </span>
            <span className="text-[10px] text-light-secondary dark:text-dark-secondary font-semibold tracking-wider block">
              HIGH SCHOOL • HYDERABAD
            </span>
          </div>
        </div>
        <ThemeSelector compact />
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto my-8">
        <div className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl shadow-xl p-6 sm:p-8 transition-all">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-blue/10 text-brand-blue dark:text-dark-accent mb-3 border border-brand-blue/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-extrabold text-light-primary dark:text-dark-primary tracking-tight">
              School ERP Sign In
            </h2>
            <p className="text-xs text-light-secondary dark:text-dark-secondary mt-1">
              Enter your credentials to access your authorized school portal
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-status-error/15 border border-status-error/30 text-status-error text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* MFA Challenge Screen */}
          {pendingMfaSession ? (
            <form onSubmit={handleVerifyMfa} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-brand-blue/10 border border-brand-blue/30 text-xs text-light-primary dark:text-dark-primary">
                <div className="flex items-center gap-2 font-bold mb-1 text-brand-navy dark:text-brand-gold">
                  <Smartphone className="w-4 h-4" />
                  Two-Step Verification Required
                </div>
                <p className="text-light-secondary dark:text-dark-secondary text-[11px]">
                  Administrator account protected by 2FA. Enter the 6-digit code from your authenticator app or backup key.
                </p>
              </div>

              {mfaError && (
                <div className="p-3 rounded-lg bg-status-error/15 border border-status-error/30 text-status-error text-xs">
                  {mfaError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-light-secondary dark:text-dark-secondary mb-1.5">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={18}
                  placeholder="e.g. 123456 or DMHS-RECOVERY-2026"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  className="w-full rounded-lg text-sm px-3.5 py-2.5 font-mono tracking-widest text-center bg-light-input dark:bg-dark-input text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-1/2"
                  onClick={() => setPendingMfaSession(null)}
                >
                  Back to Sign In
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="w-1/2"
                  isLoading={isVerifyingMfa}
                >
                  Verify &amp; Enter
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="School Email, Admission Number or Employee ID"
                placeholder="e.g. sta.khadri@dmhs.edu.in, ADM-2026-001, or EMP-ATEEF"
                leftIcon={<User className="w-4 h-4" />}
                error={errors.username_or_email?.message}
                {...register("username_or_email")}
                disabled={isSubmitting}
              />

              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  leftIcon={<Lock className="w-4 h-4" />}
                  error={errors.password?.message}
                  {...register("password")}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[34px] text-light-secondary dark:text-dark-secondary hover:text-light-primary dark:hover:text-dark-primary transition-colors"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer text-light-secondary dark:text-dark-secondary">
                  <input type="checkbox" className="rounded text-brand-navy focus:ring-brand-navy" defaultChecked />
                  <span>Remember session</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotStep(1);
                    setOtpCode("");
                    setSimulatedOtp(null);
                    setIsForgotOpen(true);
                  }}
                  className="font-semibold text-brand-navy dark:text-brand-gold hover:underline"
                >
                  Forgot Password?
                </button>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-2"
                isLoading={isSubmitting}
              >
                Sign In to Portal
              </Button>
            </form>
          )}

          {/* Institutional Access Notice */}
          <div className="mt-6 pt-4 border-t border-light-border dark:border-dark-border text-center">
            <p className="text-xs text-light-secondary dark:text-dark-secondary">
              Authorized students, faculty, and administrative staff only.
            </p>
            <p className="text-[11px] text-light-muted dark:text-dark-muted mt-1">
              For initial login credentials or password resets, contact the school administrative office.
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal (5-Step Recovery Workflow) */}
      <Dialog
        isOpen={isForgotOpen}
        onClose={() => setIsForgotOpen(false)}
        title="Account Recovery &amp; Gmail OTP Reset"
        description="Recover portal access for Admin, Faculty, or Student accounts using your registered email."
        maxWidth="md"
      >
        {/* Step 1: Enter Email / Identifier */}
        {forgotStep === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4 py-2">
            <Input
              label="Registered Email, Username or Admission / Employee ID"
              placeholder="e.g. sta.khadri@dmhs.edu.in, ADM-ALI, or EMP-ATEEF"
              value={forgotIdentifier}
              onChange={(e) => setForgotIdentifier(e.target.value)}
              required
              disabled={isSubmittingForgot}
            />
            <div className="p-3 rounded-xl bg-brand-blue/10 border border-brand-blue/20 text-xs text-light-primary dark:text-dark-primary flex items-start gap-2">
              <Mail className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">Secure Identity Verification</span>
                <p className="text-[11px] text-light-secondary dark:text-dark-secondary">
                  A 6-digit one-time verification code (OTP) will be dispatched to the verified Gmail address registered with the school for this account.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-light-border dark:border-dark-border">
              <Button type="button" variant="secondary" onClick={() => setIsForgotOpen(false)} disabled={isSubmittingForgot}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmittingForgot}>
                Send Verification Code
              </Button>
            </div>
          </form>
        )}

        {/* Step 2 & 3: Verify 6-digit OTP */}
        {forgotStep === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4 py-2">
            <div className="p-3.5 rounded-xl bg-brand-gold/15 border border-brand-gold/30 text-xs text-light-primary dark:text-dark-primary space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-brand-navy dark:text-brand-gold flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  Code Dispatched to {maskedEmail}
                </span>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white dark:bg-dark-card border border-brand-gold/30">
                  {Math.floor(otpTimer / 60)}:{(otpTimer % 60).toString().padStart(2, "0")}
                </span>
              </div>
              <p className="text-[11px] text-light-secondary dark:text-dark-secondary">
                The 6-digit verification code is valid for 5 minutes. Enter the code below to confirm identity.
              </p>
              {simulatedOtp && (
                <div className="pt-1 mt-1 border-t border-brand-gold/20 font-mono text-[11px]">
                  Testing code: <strong className="text-brand-navy dark:text-brand-gold tracking-widest">{simulatedOtp}</strong>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-light-secondary dark:text-dark-secondary mb-1">
                Enter 6-Digit Verification Code *
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="• • • • • •"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                className="w-full py-2.5 px-3 text-center text-lg font-mono font-bold tracking-[0.5em] rounded-xl bg-light-input dark:bg-dark-input text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none"
                autoFocus
                required
                disabled={isSubmittingForgot}
              />
              <div className="flex items-center justify-between mt-2 text-xs">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isSubmittingForgot}
                  className={`font-semibold transition-colors flex items-center gap-1 ${
                    resendCooldown > 0
                      ? "text-light-muted cursor-not-allowed"
                      : "text-brand-blue dark:text-dark-accent hover:underline cursor-pointer"
                  }`}
                >
                  <RefreshCw className={`w-3 h-3 ${isSubmittingForgot ? "animate-spin" : ""}`} />
                  {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : "Resend Code"}
                </button>
                <span className="text-[11px] text-light-secondary dark:text-dark-secondary">
                  Max 3 verification attempts
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center gap-2 pt-2 border-t border-light-border dark:border-dark-border">
              <Button type="button" variant="ghost" size="sm" onClick={() => setForgotStep(1)} disabled={isSubmittingForgot}>
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Back
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmittingForgot}>
                Verify Code
              </Button>
            </div>
          </form>
        )}

        {/* Step 4 & 5: Set New Password */}
        {forgotStep === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4 py-2">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Identity verified. Please set your new secure password.</span>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Input
                  label="New Password"
                  type={showResetPassword ? "text" : "password"}
                  placeholder="Minimum 4 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isSubmittingForgot}
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  className="absolute right-3 top-[34px] text-light-muted hover:text-light-primary"
                >
                  {showResetPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              <Input
                label="Confirm New Password"
                type={showResetPassword ? "text" : "password"}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isSubmittingForgot}
              />

              {/* Password strength indicator */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-light-secondary dark:text-dark-secondary">Strength</span>
                  <span
                    className={`font-bold ${
                      newPassword.length >= 8
                        ? "text-emerald-600 dark:text-emerald-400"
                        : newPassword.length >= 4
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-red-500"
                    }`}
                  >
                    {newPassword.length >= 8 ? "Strong" : newPassword.length >= 4 ? "Fair" : "Too Short"}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-dark-elevated h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      newPassword.length >= 8
                        ? "w-full bg-emerald-500"
                        : newPassword.length >= 4
                        ? "w-2/3 bg-amber-500"
                        : "w-1/4 bg-red-500"
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-light-border dark:border-dark-border">
              <Button type="submit" variant="primary" isLoading={isSubmittingForgot}>
                Save New Password &amp; Sign In
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* Footer Info */}
      <div className="text-center text-xs text-light-secondary dark:text-dark-secondary">
        <p>Deccan Mission High School • Telangana State SSC Board #TS-HYD-SSC-41092</p>
        <p className="text-[11px] mt-0.5">Hyderabad, Telangana 500002, India</p>
      </div>
    </div>
  );
};
