import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Brain, Zap, Target, ArrowRight, Sparkles, Users, TrendingUp, Star, CheckCircle, UserCheck, Building2, Menu, X, Search, Filter, Globe, Clock } from "lucide-react";
import RecrutasLogo, { RecrutasLogoSimple } from "@/components/recrutas-logo";
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
    <div className="min-h-screen bg-white dark:bg-black overflow-x-hidden">
      {/* Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-4 w-48 h-48 md:w-72 md:h-72 bg-gray-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 -right-4 w-48 h-48 md:w-72 md:h-72 bg-gray-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 lg:hidden">
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center p-4 border-b border-slate-700">
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
      <nav className="sticky top-0 z-40 backdrop-blur-md bg-white/80 dark:bg-black/80 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <div className="flex items-center space-x-2 md:space-x-3">
              <RecrutasLogo size={32} className="w-8 h-8 md:w-10 md:h-10" />
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Recrutas</h2>

            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-4">
              <ThemeToggleButton />
              <Button 
                variant="ghost" 
                className="text-slate-300 hover:text-white hover:bg-slate-800/50"
                onClick={handleLogin}
              >
                Sign In
              </Button>
              <Button 
                className="bg-black text-white hover:bg-gray-800"
                onClick={handleQuickMatch}
              >
                Try Instant Match
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <Button 
              variant="ghost" 
              size="sm"
              className="lg:hidden text-white"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-12 md:py-20 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-5xl mx-auto">
            <Badge variant="secondary" className="mb-6 md:mb-8 px-4 md:px-6 py-2 md:py-3 text-sm md:text-base font-medium bg-gray-200 text-black border border-gray-300">
              ✨ Built on AI. Backed by transparency. Focused on you.
            </Badge>
            
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-white mb-6 md:mb-8 leading-tight tracking-tight">
              Job Search.
              <br />
              <span className="text-black dark:text-white">
                Reinvented.
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-slate-300 mb-8 md:mb-12 font-light max-w-3xl mx-auto">
              AI-powered talent acquisition → Direct company connections → Skip the recruiters
            </p>

            {/* Skills Input Section */}
            <div className="max-w-2xl mx-auto mb-8 md:mb-12">
              <div className="bg-gray-200/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-gray-300/50 dark:border-gray-700/50 p-4 md:p-6 lg:p-8 shadow-2xl">
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                  <Input
                    placeholder="Enter your skills to see instant matches..."
                    className="flex-1 px-4 py-3 md:py-4 text-base md:text-lg rounded-xl border-gray-300/50 dark:border-gray-700/50 bg-gray-100/50 dark:bg-gray-900/50 text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:bg-gray-200/70 dark:focus:bg-gray-800/70"
                    value={quickSkills}
                    onChange={(e) => setQuickSkills(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleQuickMatch()}
                  />
                  <Button 
                    size="lg"
                    className="px-6 md:px-8 py-3 md:py-4 bg-black text-white hover:bg-gray-800 rounded-xl text-base md:text-lg font-medium min-w-[120px] whitespace-nowrap"
                    onClick={handleQuickMatch}
                    disabled={!quickSkills.trim()}
                  >
                    <Sparkles className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                    Match Jobs
                  </Button>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 md:mb-16">
              <Button 
                size="lg"
                className="w-full sm:w-auto px-8 md:px-12 py-4 md:py-6 bg-black text-white hover:bg-gray-800 text-lg md:text-xl font-semibold rounded-xl"
                onClick={handleLogin}
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 md:w-6 md:h-6 ml-2" />
              </Button>
              <Button 
                variant="outline"
                size="lg"
                className="w-full sm:w-auto px-8 md:px-12 py-4 md:py-6 border-gray-300/50 dark:border-gray-700/50 bg-gray-100/30 dark:bg-gray-800/30 text-black dark:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50 text-lg md:text-xl font-semibold rounded-xl"
                onClick={handleQuickMatch}
              >
                <Search className="w-5 h-5 md:w-6 md:h-6 mr-2" />
                Preview Jobs
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 md:py-20 bg-gray-100/30 dark:bg-gray-800/30 backdrop-blur-sm border-y border-gray-200/50 dark:border-gray-700/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 text-center">
            <div className="space-y-2 md:space-y-3">
              <div className="text-3xl md:text-4xl lg:text-5xl font-bold text-black dark:text-white">
                {(platformStats as any)?.totalUsers || '9'}+
              </div>
              <div className="text-slate-600 dark:text-slate-300 text-lg md:text-xl">Active Users</div>
              <div className="flex items-center justify-center text-black dark:text-white text-sm md:text-base">
                <TrendingUp className="w-4 h-4 mr-1" />
                Growing daily
              </div>
            </div>
            
            <div className="space-y-2 md:space-y-3">
              <div className="text-3xl md:text-4xl lg:text-5xl font-bold text-black dark:text-white">
                {(platformStats as any)?.totalJobs || '25'}+
              </div>
              <div className="text-slate-600 dark:text-slate-300 text-lg md:text-xl">Live Jobs</div>
              <div className="flex items-center justify-center text-black dark:text-white text-sm md:text-base">
                <Globe className="w-4 h-4 mr-1" />
                From top companies
              </div>
            </div>
            
            <div className="space-y-2 md:space-y-3">
              <div className="text-3xl md:text-4xl lg:text-5xl font-bold text-black dark:text-white">
                {(platformStats as any)?.totalMatches || '47'}+
              </div>
              <div className="text-slate-600 dark:text-slate-300 text-lg md:text-xl">Successful Matches</div>
              <div className="flex items-center justify-center text-black dark:text-white text-sm md:text-base">
                <Clock className="w-4 h-4 mr-1" />
                Real-time matching
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 md:py-20 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-20">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 md:mb-6">
              Why Choose Recrutas?
            </h2>
            <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto">
              Experience the future of job searching with direct access to company opportunities
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            <Card className="bg-gray-100/50 dark:bg-gray-800/50 border-gray-200/50 dark:border-gray-700/50 hover:border-black/50 dark:hover:border-white/50 transition-all duration-300 group">
              <CardContent className="p-6 md:p-8">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-black text-white rounded-lg flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform">
                  <Search className="w-6 h-6 md:w-8 md:h-8 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-black dark:text-white mb-3 md:mb-4">Instant Matching</h3>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  AI-powered job matching that understands your skills and preferences to deliver personalized opportunities.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-100/50 dark:bg-gray-800/50 border-gray-200/50 dark:border-gray-700/50 hover:border-black/50 dark:hover:border-white/50 transition-all duration-300 group">
              <CardContent className="p-6 md:p-8">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-black text-white rounded-lg flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform">
                  <Target className="w-6 h-6 md:w-8 md:h-8 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-black dark:text-white mb-3 md:mb-4">Direct Access</h3>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Connect directly with companies without recruiter interference. Apply straight to company career pages.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-100/50 dark:bg-gray-800/50 border-gray-200/50 dark:border-gray-700/50 hover:border-black/50 dark:hover:border-white/50 transition-all duration-300 group md:col-span-2 lg:col-span-1">
              <CardContent className="p-6 md:p-8">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-black text-white rounded-lg flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform">
                  <Zap className="w-6 h-6 md:w-8 md:h-8 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-black dark:text-white mb-3 md:mb-4">Zero Fees</h3>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Completely free for job seekers. No hidden costs, no recruiter markups, just direct opportunities.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 md:py-12 bg-gray-100/50 dark:bg-gray-900/50 border-t border-gray-200/50 dark:border-gray-700/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 md:space-x-3 mb-4 md:mb-0">
              <RecrutasLogoSimple size={24} className="w-6 h-6 md:w-8 md:h-8" />
              <span className="text-lg md:text-xl font-bold text-white">Recrutas</span>
            </div>
            <div className="text-slate-400 text-sm md:text-base text-center md:text-right">
              © 2025 Recrutas. Revolutionizing job search.
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
