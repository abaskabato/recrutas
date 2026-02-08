import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Brain, Zap, Target, ArrowRight, Sparkles, Users, TrendingUp, Star, CheckCircle, UserCheck, Building2, Menu, X, Search, Filter, Globe, Clock, Briefcase, DollarSign } from "lucide-react";
import RecrutasLogo, { RecrutasLogoSimple } from "@/components/recrutas-logo";
import RecrutasLogoBW from "@/components/recrutas-logo-bw";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import InstantMatchModal from "@/components/instant-match-modal";
import RedditIcon from "@/components/RedditIcon";

export default function LandingResponsive() {
  const [selectedRole, setSelectedRole] = useState<'candidate' | 'talent_owner' | null>(null);
  const [showInstantMatch, setShowInstantMatch] = useState(false);
  const [quickSkills, setQuickSkills] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { toast } = useToast();
  const session = useSession();
  const supabase = useSupabaseClient();
  const [, setLocation] = useLocation();

  // Auto-open instant match modal after 3 seconds for non-authenticated users
  useEffect(() => {
    if (!session) {
      const timer = setTimeout(() => {
        setShowInstantMatch(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [session]);

  // Fetch real platform statistics
  const { data: platformStats } = useQuery({
    queryKey: ['/api/platform/stats'],
    retry: false,
  });

  const setRoleMutation = useMutation({
    mutationFn: async (role: 'candidate' | 'talent_owner') => {
      await apiRequest('POST', '/api/auth/role', { role });
    },
    onSuccess: () => {
      toast({
        title: "Welcome to Recrutas!",
        description: "Your account has been set up successfully.",
      });
      window.location.reload();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to set up your account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRoleSelection = (role: 'candidate' | 'talent_owner') => {
    setSelectedRole(role);
    setRoleMutation.mutate(role);
  };

  const handleQuickMatch = () => {
    setShowInstantMatch(true);
  };

  const handleLogin = () => {
    setLocation("/auth");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setLocation("/");
  };

  const handleStartMatching = () => {
    setShowInstantMatch(false);
    if (session) {
      setLocation("/candidate-dashboard");
    } else {
      handleLogin();
    }
  };

  if (session && !session.user.user_metadata.role) {
    setLocation("/role-selection");
    return null;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black overflow-x-hidden bg-grid-pattern dark:bg-grid-pattern">
      

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 lg:hidden">
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">Menu</h2>
              <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(false)}>
                <X className="w-5 h-5 text-primary-foreground" />
              </Button>
            </div>
            <div className="flex-1 flex flex-col justify-center items-center space-y-8 p-8">
              <ThemeToggleButton />
              <Button 
                variant="ghost" 
                size="lg"
                className="text-slate-300 hover:text-white text-xl"
                onClick={handleLogin}
              >
                Sign In
              </Button>
              <Button 
                size="lg"
                className="bg-black text-white hover:bg-gray-800 text-xl px-8 py-4"
                onClick={handleQuickMatch}
              >
                Try Agentic Search
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <div className="flex items-center space-x-2 md:space-x-3">
                                          <RecrutasLogo size={32} className="w-8 h-8 md:w-10 md:h-10" />
              <h2 className="text-xl md:text-2xl font-bold text-black dark:text-white tracking-tight">Recrutas</h2>

            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-4">
              <ThemeToggleButton />
              <Button 
                variant="ghost" 
                className="text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/50"
                onClick={handleLogin}
              >
                Sign In
              </Button>
              
            </div>

            {/* Mobile Menu Button */}
            <Button 
              variant="ghost" 
              size="sm"
              className="lg:hidden text-black dark:text-white"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 md:py-28 lg:py-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-5xl mx-auto">
            <Badge variant="secondary" className="mb-6 md:mb-8 px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-800 text-black dark:text-white border border-gray-200 dark:border-gray-700">
              ✨ Built on AI. Backed by transparency. Focused on you.
            </Badge>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-black dark:text-white mb-6 md:mb-8 leading-tight tracking-tight">
              Job Search.
              <br />
              <span className="text-black dark:text-white">
                Reinvented.
              </span>
            </h1>
            
            
            <blockquote className="text-lg sm:text-xl md:text-2xl text-slate-500 dark:text-slate-400 mb-8 md:mb-12 font-light max-w-3xl mx-auto italic">
                            In a world where algorithms decide who exists, Recrutas insists everyone deserves visibility, everyone deserves dignity.
            </blockquote>

            </div>
        </div>
      </section>

      {/* Rejection Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-black dark:text-white mb-4">
              Tired of the same old story?
            </h2>
            <blockquote className="text-lg sm:text-xl md:text-2xl text-slate-500 dark:text-slate-400 mb-8 md:mb-12 font-light italic">
              "After careful consideration, we’ve decided to move forward with another candidate for this opportunity."
            </blockquote>
            <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-300">
              Recrutas is here to change that.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-24 bg-gray-100 dark:bg-gray-900 border-y border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-20">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-black dark:text-white mb-4">
              How It Works
            </h2>
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              A simple, transparent process to connect you with your next opportunity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-4">
              <div className="flex items-center justify-center w-16 h-16 mx-auto bg-blue-500/10 text-blue-500 rounded-full">
                <span className="text-2xl font-bold">1</span>
              </div>
              <h3 className="text-2xl font-bold text-black dark:text-white">Enter Your Skills</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Tell us what you do. Our AI will understand your skills and experience.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-center w-16 h-16 mx-auto bg-purple-500/10 text-purple-500 rounded-full">
                <span className="text-2xl font-bold">2</span>
              </div>
              <h3 className="text-2xl font-bold text-black dark:text-white">See Your Opportunities</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Our AI finds the best jobs for you. No more endless scrolling through irrelevant job postings.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-center w-16 h-16 mx-auto bg-green-500/10 text-green-500 rounded-full">
                <span className="text-2xl font-bold">3</span>
              </div>
              <h3 className="text-2xl font-bold text-black dark:text-white">Connect Directly</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Talk to the hiring managers, no recruiters. Get feedback and build relationships.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-20">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-black dark:text-white mb-4">
              Why Choose Recrutas?
            </h2>
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              Experience the future of job searching with direct access to company opportunities
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-blue-500/10 text-blue-500 rounded-full">
                <Brain className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-black dark:text-white mb-4">AI-Powered Agentic Search</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                AI-powered agentic search that understands your skills and preferences to deliver personalized opportunities.
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-purple-500/10 text-purple-500 rounded-full">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-black dark:text-white mb-4">Direct Company Connections</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Connect directly with companies without recruiter interference. Apply straight to company career pages.
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-green-500/10 text-green-500 rounded-full">
                <DollarSign className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-black dark:text-white mb-4">Free for Job Seekers</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Completely free for job seekers. No hidden costs, no recruiter markups, just direct opportunities.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Skills Input Section */}
      <section className="pb-20 md:pb-28 lg:pb-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-20">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-black dark:text-white mb-4">
              Get Instant Opportunities
            </h2>
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              Enter your skills and let your agent find opportunities for you.
            </p>
          </div>
            <div className="max-w-2xl mx-auto">
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 md:p-6 lg:p-8 shadow-lg">
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                  <Input
                    placeholder="Enter your skills for your agent to find opportunities..."
                    className="flex-1 px-4 py-3 md:py-4 text-base md:text-lg rounded-xl border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:bg-white/70 dark:focus:bg-gray-800/70"
                    value={quickSkills}
                    onChange={(e) => setQuickSkills(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleQuickMatch()}
                  />
                  <Button 
                    size="lg"
                    className="px-6 md:px-8 py-3 md:py-4 bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 rounded-xl text-base md:text-lg font-medium min-w-[120px] whitespace-nowrap"
                    onClick={handleQuickMatch}
                    disabled={!quickSkills.trim()}
                  >
                    <Sparkles className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                    Agentic Search
                  </Button>
                </div>
              </div>
            </div>
        </div>
      </section>

      {/* Community Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-20">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-black dark:text-white mb-4">
              Join the Community
            </h2>
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              Connect with other job seekers and companies, share your experiences, and get help from the community.
            </p>
          </div>

          <div className="grid grid-cols-1 max-w-md mx-auto">
            <a href="https://www.reddit.com/r/recrutas/" target="_blank" rel="noopener noreferrer" className="block">
              <Card className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 hover:border-blue-500 dark:hover:border-blue-500 transition-all">
                <CardContent className="p-6 text-center">
                  <RedditIcon className="w-12 h-12 mx-auto mb-4 text-blue-500" />
                  <h3 className="text-2xl font-bold text-black dark:text-white mb-4">Reddit</h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Join the conversation on our subreddit. Ask questions, share your success stories, and help others.
                  </p>
                </CardContent>
              </Card>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 md:py-12 bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-slate-500 dark:text-slate-400 mb-4 md:mb-0">
              © 2025 Recrutas. All rights reserved.
            </div>
            <div className="flex space-x-4">
              <a href="/privacy" className="text-sm text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white">Privacy Policy</a>
              <a href="/terms" className="text-sm text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Instant Match Modal */}
      <InstantMatchModal
        isOpen={showInstantMatch}
        onClose={() => setShowInstantMatch(false)}
        onStartMatching={handleStartMatching}
        initialSkills={quickSkills}
      />
    </div>
  );
}