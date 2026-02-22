
import { useState, useMemo } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Check, X } from "lucide-react";

interface SignUpFormProps {
  role: 'candidate' | 'talent_owner';
}

// Password strength checker
function getPasswordStrength(password: string): { score: number; label: string; color: string; requirements: { met: boolean; text: string }[] } {
  const requirements = [
    { met: password.length >= 8, text: "At least 8 characters" },
    { met: /[A-Z]/.test(password), text: "One uppercase letter" },
    { met: /[a-z]/.test(password), text: "One lowercase letter" },
    { met: /[0-9]/.test(password), text: "One number" },
  ];

  const score = requirements.filter(r => r.met).length;

  if (score <= 1) return { score, label: "Weak", color: "bg-red-500", requirements };
  if (score === 2) return { score, label: "Fair", color: "bg-orange-500", requirements };
  if (score === 3) return { score, label: "Good", color: "bg-yellow-500", requirements };
  return { score, label: "Strong", color: "bg-green-500", requirements };
}

export default function SignUpForm({ role }: SignUpFormProps) {
  const supabase = useSupabaseClient();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
      toast({
        title: "Account created",
        description: "Please check your email to verify your account.",
      });
    } catch (error: unknown) {
      toast({
        title: "Error signing up",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSignUp}>
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-muted-foreground"
        >
          Email
        </label>
        <div className="mt-1">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="appearance-none block w-full px-3 py-2 border border-input rounded-md shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-ring focus:border-ring sm:text-sm bg-input text-foreground"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-muted-foreground"
        >
          Password
        </label>
        <div className="mt-1 relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="appearance-none block w-full px-3 py-2 pr-10 border border-input rounded-md shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-ring focus:border-ring sm:text-sm bg-input text-foreground"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Password Strength Indicator */}
        {password && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                  style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                />
              </div>
              <span className={`text-xs font-medium ${
                passwordStrength.score <= 1 ? 'text-red-500' :
                passwordStrength.score === 2 ? 'text-orange-500' :
                passwordStrength.score === 3 ? 'text-yellow-500' : 'text-green-500'
              }`}>
                {passwordStrength.label}
              </span>
            </div>
            <ul className="space-y-1">
              {passwordStrength.requirements.map((req, i) => (
                <li key={i} className="flex items-center gap-2 text-xs">
                  {req.met ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <X className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className={req.met ? 'text-green-500' : 'text-muted-foreground'}>
                    {req.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
        >
          {loading ? 'Signing up...' : 'Sign up'}
        </button>
      </div>
    </form>
  );
}
