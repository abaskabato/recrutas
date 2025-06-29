import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Brain, Zap, Target, ArrowRight, Sparkles, Users, TrendingUp, Star, CheckCircle, UserCheck, Building2, Menu, X, Search, Filter, Globe, Clock } from "lucide-react";
import RecrutasLogo, { RecrutasLogoSimple } from "@/components/recrutas-logo";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import InstantMatchModal from "@/components/instant-match-modal";

export default function LandingResponsive() {
  const [selectedRole, setSelectedRole] = useState<'candidate' | 'talent_owner' | null>(null);
  const [showInstantMatch, setShowInstantMatch] = useState(false);
  const [quickSkills, setQuickSkills] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Auto-open instant match modal after 3 seconds for non-authenticated users
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      const timer = setTimeout(() => {
        setShowInstantMatch(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isLoading]);

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

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const handleStartMatching = () => {
    setShowInstantMatch(false);
    if (isAuthenticated && user?.role === 'candidate') {
      setLocation("/candidate-dashboard");
    } else {
      handleLogin();
    }
  };

  // Show role selection for authenticated users without a role
  if (isAuthenticated && user && !user.role) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4">
              Welcome to Recrutas, {user.firstName || 'User'}!
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 overflow-x-hidden">
      {/* Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-4 w-48 h-48 md:w-72 md:h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 -right-4 w-48 h-48 md:w-72 md:h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 lg:hidden">
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center p-4 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">Menu</h2>
              <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(false)}>
                <X className="w-5 h-5 text-white" />
              </Button>
            </div>
            <div className="flex-1 flex flex-col justify-center items-center space-y-8 p-8">
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
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-xl px-8 py-4"
                onClick={handleQuickMatch}
              >
                Try Instant Match
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="sticky top-0 z-40 backdrop-blur-md bg-slate-950/80 border-b border-slate-700/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <div className="flex items-center space-x-2 md:space-x-3">
              <RecrutasLogo size={32} className="w-8 h-8 md:w-10 md:h-10" />
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Recrutas</h2>

            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-4">
              <Button 
                variant="ghost" 
                className="text-slate-300 hover:text-white hover:bg-slate-800/50"
                onClick={handleLogin}
              >
                Sign In
              </Button>
              <Button 
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
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
            <Badge variant="secondary" className="mb-6 md:mb-8 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium bg-gradient-to-r from-red-500/20 to-orange-500/20 text-red-300 border border-red-500/30">
              <Zap className="w-3 h-3 md:w-4 md:h-4 mr-1.5 animate-pulse" />
              Zero Recruiters • Direct Access
            </Badge>
            
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-white mb-6 md:mb-8 leading-tight tracking-tight">
              Job Search.
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Reinvented.
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-slate-300 mb-8 md:mb-12 font-light max-w-3xl mx-auto">
              AI-powered talent acquisition → Direct company connections → Skip the recruiters
            </p>

            {/* Skills Input Section */}
            <div className="max-w-2xl mx-auto mb-8 md:mb-12">
              <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-600/50 p-4 md:p-6 lg:p-8 shadow-2xl">
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                  <Input
                    placeholder="Enter your skills to see instant matches..."
                    className="flex-1 px-4 py-3 md:py-4 text-base md:text-lg rounded-xl border-slate-600/50 bg-slate-700/50 text-white placeholder-slate-400 focus:bg-slate-700"
                    value={quickSkills}
                    onChange={(e) => setQuickSkills(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleQuickMatch()}
                  />
                  <Button 
                    size="lg"
                    className="px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl text-base md:text-lg font-medium min-w-[120px] whitespace-nowrap"
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
                className="w-full sm:w-auto px-8 md:px-12 py-4 md:py-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg md:text-xl font-semibold rounded-xl"
                onClick={handleLogin}
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 md:w-6 md:h-6 ml-2" />
              </Button>
              <Button 
                variant="outline"
                size="lg"
                className="w-full sm:w-auto px-8 md:px-12 py-4 md:py-6 border-slate-600/50 bg-slate-800/30 text-slate-300 hover:bg-slate-700/50 text-lg md:text-xl font-semibold rounded-xl"
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
      <section className="py-12 md:py-20 bg-slate-800/30 backdrop-blur-sm border-y border-slate-700/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 text-center">
            <div className="space-y-2 md:space-y-3">
              <div className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {(platformStats as any)?.totalUsers || '9'}+
              </div>
              <div className="text-slate-300 text-lg md:text-xl">Active Users</div>
              <div className="flex items-center justify-center text-green-400 text-sm md:text-base">
                <TrendingUp className="w-4 h-4 mr-1" />
                Growing daily
              </div>
            </div>
            
            <div className="space-y-2 md:space-y-3">
              <div className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {(platformStats as any)?.totalJobs || '25'}+
              </div>
              <div className="text-slate-300 text-lg md:text-xl">Live Jobs</div>
              <div className="flex items-center justify-center text-blue-400 text-sm md:text-base">
                <Globe className="w-4 h-4 mr-1" />
                From top companies
              </div>
            </div>
            
            <div className="space-y-2 md:space-y-3">
              <div className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                {(platformStats as any)?.totalMatches || '47'}+
              </div>
              <div className="text-slate-300 text-lg md:text-xl">Successful Matches</div>
              <div className="flex items-center justify-center text-emerald-400 text-sm md:text-base">
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
            <Card className="bg-slate-800/50 border-slate-600/50 hover:border-blue-500/50 transition-all duration-300 group">
              <CardContent className="p-6 md:p-8">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform">
                  <Search className="w-6 h-6 md:w-8 md:h-8 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-3 md:mb-4">Instant Matching</h3>
                <p className="text-slate-300 leading-relaxed">
                  AI-powered job matching that understands your skills and preferences to deliver personalized opportunities.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-600/50 hover:border-purple-500/50 transition-all duration-300 group">
              <CardContent className="p-6 md:p-8">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform">
                  <Target className="w-6 h-6 md:w-8 md:h-8 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-3 md:mb-4">Direct Access</h3>
                <p className="text-slate-300 leading-relaxed">
                  Connect directly with companies without recruiter interference. Apply straight to company career pages.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-600/50 hover:border-green-500/50 transition-all duration-300 group md:col-span-2 lg:col-span-1">
              <CardContent className="p-6 md:p-8">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform">
                  <Zap className="w-6 h-6 md:w-8 md:h-8 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-3 md:mb-4">Zero Fees</h3>
                <p className="text-slate-300 leading-relaxed">
                  Completely free for job seekers. No hidden costs, no recruiter markups, just direct opportunities.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 md:py-12 bg-slate-900/50 border-t border-slate-700/50">
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