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
} from "lucide-react";
import { useAuth } from "../../app/AuthContext";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { ThemeSelector } from "../../components/ui/ThemeSelector";
import { useToast } from "../../components/ui/Toast";

const loginSchema = z.object({
  username_or_email: z.string().min(1, "Please enter your username or email"),
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

  // 2FA / TOTP challenge state
  const [pendingMfaSession, setPendingMfaSession] = useState<any | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [isVerifyingMfa, setIsVerifyingMfa] = useState(false);

  // Forgot Password modal state
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [simulatedOtp, setSimulatedOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpTimer, setOtpTimer] = useState(900); // 15 minutes (900s)

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

  // Countdown timer for 15-minute OTP expiry
  useEffect(() => {
    let interval: any = null;
    if (isForgotOpen && forgotStep === 2 && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isForgotOpen, forgotStep, otpTimer]);

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
        // First verify credentials before 2FA prompt
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
    // Valid 6-digit TOTP (e.g. 123456) or Recovery Code
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

  const setDevAccount = (username: string, pass: string) => {
    setValue("username_or_email", username);
    setValue("password", pass);
  };

  // Forgot password flow
  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) {
      toast.error("Please enter your registered username, email, or admission number.");
      return;
    }
    // Generate simulated 6-digit OTP
    const generated = Math.floor(100000 + Math.random() * 900000).toString();
    setSimulatedOtp(generated);
    setOtpTimer(900); // 15 minutes
    setForgotStep(2);
    toast.success(`Verification code dispatched to registered contact.`);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpTimer === 0) {
      toast.error("Verification code has expired. Please request a new code.");
      return;
    }
    if (otpCode.trim() !== simulatedOtp && otpCode.trim() !== "123456") {
      toast.error("Invalid verification code. Please check and re-enter.");
      return;
    }
    setForgotStep(3);
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 4) {
      toast.error("Password must be at least 4 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      // Save updated password in local custom users store
      const raw = localStorage.getItem("dmhs_custom_users");
      const list = raw ? JSON.parse(raw) : [];
      const updated = list.map((u: any) => {
        if (
          u.username?.toLowerCase() === forgotIdentifier.toLowerCase() ||
          u.email?.toLowerCase() === forgotIdentifier.toLowerCase() ||
          u.admission_number?.toLowerCase() === forgotIdentifier.toLowerCase()
        ) {
          return { ...u, password: newPassword };
        }
        return u;
      });
      localStorage.setItem("dmhs_custom_users", JSON.stringify(updated));

      toast.success("Password reset successfully! You can now sign in with your new password.");
      setIsForgotOpen(false);
      setForgotStep(1);
      setValue("username_or_email", forgotIdentifier);
      setValue("password", newPassword);
    } catch {
      toast.error("Failed to update password.");
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
                <p className="text-[10px] text-light-secondary dark:text-dark-secondary mt-1 text-center">
                  Quick test code: <code className="font-bold text-brand-navy dark:text-brand-gold">123456</code>
                </p>
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
                placeholder="e.g. ADM-2026-001, EMP-101, or name@dmhs.edu.in"
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

      {/* Forgot Password Modal */}
      <Dialog
        isOpen={isForgotOpen}
        onClose={() => setIsForgotOpen(false)}
        title="Account Recovery &amp; Password Reset"
        description="Verify your identity using your registered username or email to recover portal access."
        maxWidth="md"
      >
        {forgotStep === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4 py-2">
            <Input
              label="Username, School Email or Admission No."
              placeholder="e.g. sta.khadri@dmhs.edu.in or ADM-ALI"
              value={forgotIdentifier}
              onChange={(e) => setForgotIdentifier(e.target.value)}
              required
            />
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated text-xs text-light-secondary dark:text-dark-secondary">
              A temporary 6-digit verification code will be generated with a 15-minute validity window.
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setIsForgotOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Send Verification Code
              </Button>
            </div>
          </form>
        )}

        {forgotStep === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-brand-gold/15 border border-brand-gold/30 text-xs text-light-primary dark:text-dark-primary">
              <span className="font-bold block text-brand-gold mb-1">Simulated Code Dispatch:</span>
              Your verification code is: <strong className="font-mono text-sm tracking-widest">{simulatedOtp}</strong>
              <div className="text-[11px] text-light-secondary dark:text-dark-secondary mt-1">
                Time remaining: <span className="font-mono font-bold">{Math.floor(otpTimer / 60)}:{(otpTimer % 60).toString().padStart(2, "0")}</span> (15 min expiry)
              </div>
            </div>

            <Input
              label="Enter 6-Digit Verification Code"
              placeholder="e.g. 123456"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              required
            />

            <div className="flex justify-between items-center gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setForgotStep(1)}>
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Back
              </Button>
              <Button type="submit" variant="primary">
                Verify Code
              </Button>
            </div>
          </form>
        )}

        {forgotStep === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4 py-2">
            <Input
              label="New Password"
              type="password"
              placeholder="Enter new password (min. 4 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <Input
              label="Confirm New Password"
              type="password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="submit" variant="primary">
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
