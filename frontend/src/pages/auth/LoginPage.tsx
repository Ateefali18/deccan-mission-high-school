import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useLocation } from "react-router-dom";
import { School, Lock, User, AlertCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "../../app/AuthContext";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { ThemeSelector } from "../../components/ui/ThemeSelector";

const loginSchema = z.object({
  username_or_email: z.string().min(1, "Please enter your username or email"),
  password: z.string().min(1, "Please enter your password"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage(null);
    try {
      const session = await login(data.username_or_email, data.password);
      // Navigate to respective role portal
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
    } catch (err: any) {
      setErrorMessage(err.message || "Invalid authentication credentials. Please try again.");
    }
  };

  const setDevAccount = (username: string, pass: string) => {
    setValue("username_or_email", username);
    setValue("password", pass);
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Username or School Email"
              placeholder="e.g. admin or employee ID / admission number"
              leftIcon={<User className="w-4 h-4" />}
              error={errors.username_or_email?.message}
              {...register("username_or_email")}
              disabled={isSubmitting}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
              error={errors.password?.message}
              {...register("password")}
              disabled={isSubmitting}
            />

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

          {/* Development Quick-Fill Credentials */}
          <div className="mt-6 pt-5 border-t border-light-border dark:border-dark-border">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-light-secondary dark:text-dark-secondary">
                Development Test Accounts
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-status-warning/15 text-status-warning font-bold">
                DEV ONLY
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDevAccount("admin", "Admin@DMHS2026")}
                className="p-2 rounded-lg text-center bg-gray-100 dark:bg-dark-elevated hover:border-brand-blue border border-transparent transition-all"
              >
                <span className="text-xs font-bold block text-light-primary dark:text-dark-primary">Admin</span>
                <span className="text-[10px] text-light-secondary dark:text-dark-secondary block">Principal</span>
              </button>
              <button
                type="button"
                onClick={() => setDevAccount("teacher1", "Teacher@DMHS2026")}
                className="p-2 rounded-lg text-center bg-gray-100 dark:bg-dark-elevated hover:border-brand-blue border border-transparent transition-all"
              >
                <span className="text-xs font-bold block text-light-primary dark:text-dark-primary">Teacher</span>
                <span className="text-[10px] text-light-secondary dark:text-dark-secondary block">Faculty</span>
              </button>
              <button
                type="button"
                onClick={() => setDevAccount("student1", "Student@DMHS2026")}
                className="p-2 rounded-lg text-center bg-gray-100 dark:bg-dark-elevated hover:border-brand-blue border border-transparent transition-all"
              >
                <span className="text-xs font-bold block text-light-primary dark:text-dark-primary">Student</span>
                <span className="text-[10px] text-light-secondary dark:text-dark-secondary block">Class 10A</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center text-xs text-light-secondary dark:text-dark-secondary">
        <p>Deccan Mission High School • CBSE Affiliated #TS-HYD-CBSE-41092</p>
        <p className="text-[11px] mt-0.5">Hyderabad, Telangana 500002, India</p>
      </div>
    </div>
  );
};
