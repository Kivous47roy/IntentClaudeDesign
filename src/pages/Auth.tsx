import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmPending, setConfirmPending] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        // If no session, email confirmation is required
        if (!data.session) {
          setConfirmPending(true);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmPending) {
    return (
      <div className="paper-bg flex min-h-dvh flex-col items-center justify-center px-7">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-baseline gap-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">INTENT</span>
            <div className="h-px flex-1 bg-ink/10" />
          </div>
          <h1 className="font-display text-[36px] leading-[1.05]">
            Check your <em className="font-serif not-italic font-normal italic">email</em>.
          </h1>
          <p className="mt-5 text-[14px] leading-[1.6] text-ink-2">
            We sent a confirmation link to <span className="font-medium text-ink">{email}</span>.
            Click it to activate your account, then come back and sign in.
          </p>
          <button
            type="button"
            onClick={() => { setConfirmPending(false); setMode("signin"); }}
            className="mt-8 flex h-14 w-full items-center justify-between rounded bg-ink px-5 py-4 text-paper"
          >
            <span className="text-[15px] font-medium">Back to sign in</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="paper-bg flex min-h-dvh flex-col items-center justify-center px-7">
      <div className="mx-auto w-full max-w-sm animate-fade-up">
        <div className="mb-8 flex items-baseline gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">INTENT</span>
          <div className="h-px flex-1 bg-ink/10" />
          <span className="font-mono text-[11px] text-ink-3">{mode === "signup" ? "01 / NEW" : "01 / RETURN"}</span>
        </div>

        <h1 className="font-display text-[40px] leading-[1.05]">
          Six short<br />
          writing rituals.<br />
          <em className="font-serif not-italic font-normal italic">One quiet practice.</em>
        </h1>
        <p className="mt-5 max-w-[300px] text-[14px] leading-[1.5] text-ink-2">
          {mode === "signup" ? "Make an account to keep your streak and entries." : "Welcome back. Sign in to continue."}
        </p>

        <form onSubmit={handleEmail} className="mt-7 space-y-4">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border-b border-ink bg-transparent pb-2 font-serif text-[18px] outline-none"
              placeholder="you@somewhere.com"
            />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full border-b border-ink bg-transparent pb-2 font-serif text-[18px] outline-none"
              placeholder="••••••"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="mt-3 flex h-14 w-full items-center justify-between rounded bg-ink px-5 py-4 text-paper transition-opacity disabled:opacity-60"
          >
            <span className="text-[15px] font-medium">
              {submitting ? "Just a moment…" : mode === "signup" ? "Create account" : "Sign in"}
            </span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
          className="mt-5 w-full text-center font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3 transition-colors hover:text-ink"
        >
          {mode === "signup" ? "Already have an account · Sign in" : "New here · Create account"}
        </button>
      </div>
    </div>
  );
}
