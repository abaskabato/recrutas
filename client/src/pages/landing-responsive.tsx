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
      const apiRole = role === 'talent_owner' ? 'recruiter' : role;
      await apiRequest('POST', '/api/auth/role', { role: apiRole });
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
    window.location.href = "/auth";
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handleStartMatching = () => {
    setShowInstantMatch(false);
    if (session) {
      setLocation("/candidate-dashboard");
    } else {
      handleLogin();
    }
  };

  // Show role selection for authenticated users without a role
  if (session && !session.user.user_metadata.role) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4">
              Welcome to Recrutas, {session.user.email || 'User'}!
            </h1>
            <p className="text-lg md:text-xl text-slate-300 mb-6 md:mb-8">
              Please select your role to get started
            </p>
            

          </div>

          <div className="grid md:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
            <Card className="group cursor-pointer transition-all duration-300 hover:scale-105 bg-slate-800/50 border-slate-600/50 hover:border-blue-500/50"
                  onClick={() => handleRoleSelection('candidate')}>
              <CardContent className="p-6 md:p-8 text-center">
                <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Search className="w-8 h-8 md:w-10 md:h-10 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-3 md:mb-4">Job Seeker</h3>
                <p className="text-slate-300 mb-4 md:mb-6 leading-relaxed">
                  Find your dream job with AI-powered matching. Get direct access to company career pages without recruiter interference.
                </p>
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                  Zero Recruiter Fees
                </Badge>
              </CardContent>
            </Card>

            <Card className="group cursor-pointer transition-all duration-300 hover:scale-105 bg-slate-800/50 border-slate-600/50 hover:border-purple-500/50"
                  onClick={() => handleRoleSelection('talent_owner')}>
              <CardContent className="p-6 md:p-8 text-center">
                <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Building2 className="w-8 h-8 md:w-10 md:h-10 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-3 md:mb-4">Talent Owner</h3>
                <p className="text-slate-300 mb-4 md:mb-6 leading-relaxed">
                  Post jobs and connect directly with candidates. Build your team without recruitment agencies.
                </p>
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                  Direct Hiring
                </Badge>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
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
                <X className="w-5 h-5 text-white" />
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
                Try Instant Match
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

      {/* Skills Input Section */}
      {/* Skills Input Section */}
      <section className="pb-20 md:pb-28 lg:pb-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-20">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-black dark:text-white mb-4">
              Get Instant Matches
            </h2>
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              Enter your skills to see a personalized feed of jobs that match your experience.
            </p>
          </div>
            <div className="max-w-2xl mx-auto">
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 md:p-6 lg:p-8 shadow-lg">
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                  <Input
                    placeholder="Enter your skills to see instant matches..."
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
                    Match Jobs
                  </Button>
                </div>
              </div>
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
              <h3 className="text-2xl font-bold text-black dark:text-white">See Your Matches</h3>
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
              <h3 className="text-2xl font-bold text-black dark:text-white mb-4">AI-Powered Matching</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                AI-powered job matching that understands your skills and preferences to deliver personalized opportunities.
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <a href="#" target="_blank" rel="noopener noreferrer" className="block">
              <Card className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 hover:border-blue-500 dark:hover:border-blue-500 transition-all">
                <CardContent className="p-6 text-center">
                  <svg className="w-12 h-12 mx-auto mb-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.01 16.16c-.18.18-.44.28-.71.28-.27 0-.53-.1-.71-.28l-3.59-3.59-3.59 3.59c-.18.18-.44.28-.71.28-.27 0-.53-.1-.71-.28-.39-.39-.39-1.02 0-1.41l3.59-3.59-3.59-3.59c-.39-.39-.39-1.02 0-1.41.39-.39 1.02-.39 1.41 0l3.59 3.59 3.59-3.59c.39-.39 1.02-.39 1.41 0 .39.39.39 1.02 0 1.41l-3.59 3.59 3.59 3.59c.39.39.39 1.02 0 1.41z"/></svg>
                  <h3 className="text-2xl font-bold text-black dark:text-white mb-4">Reddit</h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Join the conversation on our subreddit. Ask questions, share your success stories, and help others.
                  </p>
                </CardContent>
              </Card>
            </a>

            <a href="#" target="_blank" rel="noopener noreferrer" className="block">
              <Card className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 hover:border-purple-500 dark:hover:border-purple-500 transition-all">
                <CardContent className="p-6 text-center">
                  <svg className="w-12 h-12 mx-auto mb-4 text-purple-500" fill="currentColor" viewBox="0 0 24 24"><path d="M20.3,3.7c-1.2-1.2-2.8-1.9-4.5-1.9H8.2c-1.7,0-3.3,0.7-4.5,1.9C2.5,4.9,1.8,6.5,1.8,8.2v7.6c0,1.7,0.7,3.3,1.9,4.5c1.2,1.2,2.8,1.9,4.5,1.9h7.6c1.7,0,3.3-0.7,4.5-1.9c1.2-1.2,1.9-2.8,1.9-4.5V8.2C22.2,6.5,21.5,4.9,20.3,3.7z M18.4,15.3c0,0.8-0.7,1.5-1.5,1.5H7.1c-0.8,0-1.5-0.7-1.5-1.5V8.7c0-0.8,0.7-1.5,1.5-1.5h9.8c0.8,0,1.5,0.7,1.5,1.5V15.3z M12,10.1c-1.2,0-2.2,1-2.2,2.2s1,2.2,2.2,2.2s2.2-1,2.2-2.2S13.2,10.1,12,10.1z M15.3,8.7h-1.5V7.2h1.5V8.7z"/></svg>
                  <h3 className="text-2xl font-bold text-black dark:text-white mb-4">Discord</h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Chat with other members of the community in real-time. Get help, find collaborators, and make friends.
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
              <a href="#" className="text-sm text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white">Privacy Policy</a>
              <a href="#" className="text-sm text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white">Terms of Service</a>
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