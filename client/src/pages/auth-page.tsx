// Triggering redeploy
import { useState, useEffect } from "react";
import { useSupabaseClient, useSession } from "@supabase/auth-helpers-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signInLoading, setSignInLoading] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    console.log("AuthPage useEffect triggered. Session:", session);
    if (session) {
      const userRole = session.user?.user_metadata?.role;
      console.log("User role:", userRole);
      if (userRole === 'candidate') {
        console.log("Redirecting to /candidate-dashboard");
        window.location.href = "/candidate-dashboard";
      } else if (userRole === 'talent_owner') {
        console.log("Redirecting to /talent-dashboard");
        window.location.href = "/talent-dashboard";
      } else {
        console.log("Redirecting to /role-selection");
        window.location.href = "/role-selection";
      }
    }
  }, [session, setLocation]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    console.log("Attempting to sign in...");
    setSignInLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (error) {
      console.error("Sign-in error:", error);
      toast({
        title: "Error signing in",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSignInLoading(false);
    }
  };



  if (session) {
    // Render a loading state or null while redirecting
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-4">
          <a href="/" className="text-sm font-medium text-primary hover:text-primary/90">
            Back to Home
          </a>
        </div>
        <div className="bg-card border border-border rounded-lg p-8">
          <form className="space-y-6">
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
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-input rounded-md shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-ring focus:border-ring sm:text-sm bg-input text-foreground"
                />
              </div>
              <div className="text-sm mt-2">
                <a href="/forgot-password" className="font-medium text-primary hover:text-primary/90">
                  Forgot your password?
                </a>
              </div>
            </div>

            <div className="flex flex-col items-center space-y-4">
              <button
                onClick={handleSignIn}
                disabled={signInLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
              >
                {signInLoading ? 'Signing in...' : 'Sign in'}
              </button>
              <div className="text-center text-sm">
                <p className="text-muted-foreground mb-4">Don't have an account?</p>
                <div className="flex flex-col space-y-2">
                  <a href="/signup/candidate" className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:border-gray-600">
                    Sign up as a Candidate
                  </a>
                  <a href="/signup/talent-owner" className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:border-gray-600">
                    Sign up as a Talent Owner
                  </a>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}