import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Brain, Zap, Target, ArrowRight, Sparkles, Users, TrendingUp, Star, CheckCircle, UserCheck, Building2 } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import InstantMatchModal from "@/components/instant-match-modal";

export default function Landing() {
  const [selectedRole, setSelectedRole] = useState<'candidate' | 'talent_owner' | null>(null);
  const [showInstantMatch, setShowInstantMatch] = useState(false);
  const [quickSkills, setQuickSkills] = useState('');
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();

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
      // Reload to update auth state
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

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  const handleTryInstantMatching = () => {
    setShowInstantMatch(true);
  };

  const handleQuickMatch = () => {
    if (quickSkills.trim()) {
      setShowInstantMatch(true);
    }
  };

  const handleStartMatching = () => {
    handleLogin();
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  // Show role selection for authenticated users without a role
  if (isAuthenticated && user && !user.role) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-neutral-800 mb-4">
              Welcome to Recrutas, {user.firstName || 'User'}!
            </h1>
            <p className="text-xl text-neutral-600 mb-6">
              Please select your role to get started
            </p>
            

          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6 border-2 border-transparent hover:border-primary transition-all cursor-pointer group"
                  onClick={() => handleRoleSelection('candidate')}>
              <CardContent className="p-0 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <UserCheck className="text-primary h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-800 mb-2">I'm Looking for a Job</h3>
                <p className="text-neutral-600 mb-4">Find your next career opportunity</p>
                <Button 
                  className="w-full" 
                  disabled={setRoleMutation.isPending && selectedRole === 'candidate'}
                >
                  {setRoleMutation.isPending && selectedRole === 'candidate' ? 'Setting up...' : 'Continue as Candidate'}
                </Button>
              </CardContent>
            </Card>

            <Card className="p-6 border-2 border-transparent hover:border-primary transition-all cursor-pointer group"
                  onClick={() => handleRoleSelection('talent_owner')}>
              <CardContent className="p-0 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Building2 className="text-primary h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-800 mb-2">I'm Hiring</h3>
                <p className="text-neutral-600 mb-4">Access matched candidates and manage hiring</p>
                <Button 
                  className="w-full" 
                  disabled={setRoleMutation.isPending && selectedRole === 'talent_owner'}
                >
                  {setRoleMutation.isPending && selectedRole === 'talent_owner' ? 'Setting up...' : 'Continue as Talent Owner'}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-6">
            <Button variant="ghost" onClick={handleLogout}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Floating particles animation */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-2 h-2 bg-blue-400/20 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-20 w-1 h-1 bg-indigo-400/30 rounded-full animate-ping"></div>
        <div className="absolute bottom-20 left-20 w-3 h-3 bg-purple-400/20 rounded-full animate-bounce"></div>
      </div>

      {/* Navigation Header */}
      <nav className="relative z-50 bg-slate-900/90 backdrop-blur-lg border-b border-slate-700/50">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Recrutas
              </h1>
              <Badge variant="secondary" className="ml-2 sm:ml-4 px-2 sm:px-3 py-1 text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                No Recruiters
              </Badge>
            </div>
            <Button 
              variant="outline" 
              className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-slate-800/50 backdrop-blur-sm border-slate-600/50 text-slate-300 hover:bg-slate-700/50"
              onClick={handleLogin}
            >
              Sign In
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-transparent to-indigo-600/5"></div>
        <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16 relative">
          <div className="text-center max-w-5xl mx-auto">
            <Badge variant="secondary" className="mb-4 sm:mb-6 px-4 py-2 text-sm font-medium bg-gradient-to-r from-red-500/20 to-orange-500/20 text-red-300 border border-red-500/30 animate-pulse">
              <span className="text-lg mr-2">🚫</span>
              No Recruiters, No Noise
            </Badge>
            
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold text-white mb-8 leading-tight tracking-tight">
              <span className="block">Skip the</span>
              <span className="bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">Middleman.</span>
              <span className="block text-4xl sm:text-5xl lg:text-6xl mt-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Find Your Job.
              </span>
            </h1>
            
            <p className="text-xl sm:text-2xl text-slate-300 mb-4 font-light max-w-4xl mx-auto">
              The first platform built to eliminate third-party recruiters. Connect directly with hiring managers who actually make decisions.
            </p>
            
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 mb-6 max-w-3xl mx-auto">
              <p className="text-red-200 text-lg font-medium">
                "Like DoorDash for jobs—skip the restaurant, go straight to the kitchen."
              </p>
            </div>
            
            <div className="grid sm:grid-cols-3 gap-4 mb-8 max-w-3xl mx-auto">
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-600/30">
                <div className="text-2xl mb-2">⚡</div>
                <div className="text-sm text-slate-300 font-medium">Instant Feedback</div>
                <div className="text-xs text-slate-400">No more waiting weeks</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-600/30">
                <div className="text-2xl mb-2">🧠</div>
                <div className="text-sm text-slate-300 font-medium">Smart Filtering</div>
                <div className="text-xs text-slate-400">Built-in assessments</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-600/30">
                <div className="text-2xl mb-2">📲</div>
                <div className="text-sm text-slate-300 font-medium">Direct Chat</div>
                <div className="text-xs text-slate-400">No email chains</div>
              </div>
            </div>

            {/* Skills Input Section */}
            <div className="max-w-xl mx-auto mb-8">
              <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-600/50 p-6 shadow-lg">
                <div className="flex gap-3">
                  <Input
                    placeholder="Your skills..."
                    className="flex-1 px-4 py-3 text-base rounded-xl border-slate-600/50 bg-slate-700/70 text-white placeholder-slate-400 focus:bg-slate-700"
                    value={quickSkills}
                    onChange={(e) => setQuickSkills(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleQuickMatch()}
                  />
                  <Button 
                    size="lg"
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl"
                    onClick={handleQuickMatch}
                    disabled={!quickSkills.trim()}
                  >
                    Match
                  </Button>
                </div>
              </div>
            </div>

            <div className="text-center mb-8">
              <Button 
                size="lg"
                className="px-8 py-4 text-lg font-medium bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 rounded-xl"
                onClick={handleTryInstantMatching}
              >
                Get Started Free
              </Button>
            </div>


          </div>
        </div>
      </div>

      {/* AI Features Section */}
      <div className="container mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light text-gray-900 dark:text-white mb-4 sm:mb-6 tracking-tight">
            How It <span className="font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Works</span>
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-gray-500 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Three simple steps. No recruiters. No delays. Just direct connections with companies that want to hire you.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8 mb-16 sm:mb-20">
          <Card className="group relative overflow-hidden border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl">
            <CardContent className="p-6 sm:p-8 text-center relative">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-105 transition-transform duration-300">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Smart AI Matching</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed">
                Our AI analyzes your skills and finds jobs that truly match your profile and career goals.
              </p>
              <div className="space-y-3 text-left text-sm">
                <div className="flex items-center text-blue-600 dark:text-blue-400">
                  <CheckCircle className="w-4 h-4 mr-3 flex-shrink-0" />
                  <span>Only relevant job matches</span>
                </div>
                <div className="flex items-center text-blue-600 dark:text-blue-400">
                  <CheckCircle className="w-4 h-4 mr-3 flex-shrink-0" />
                  <span>Transparent salary ranges</span>
                </div>
                <div className="flex items-center text-blue-600 dark:text-blue-400">
                  <CheckCircle className="w-4 h-4 mr-3 flex-shrink-0" />
                  <span>Match explanations included</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl">
            <CardContent className="p-6 sm:p-8 text-center relative">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-105 transition-transform duration-300">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">One-Click Applications</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed">
                Apply instantly with your saved profile. Skip lengthy forms and repetitive information entry.
              </p>
              <div className="space-y-3 text-left text-sm">
                <div className="flex items-center text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-4 h-4 mr-3 flex-shrink-0" />
                  <span>Instant one-click applications</span>
                </div>
                <div className="flex items-center text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-4 h-4 mr-3 flex-shrink-0" />
                  <span>Real-time status tracking</span>
                </div>
                <div className="flex items-center text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-4 h-4 mr-3 flex-shrink-0" />
                  <span>Direct employer messaging</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl">
            <CardContent className="p-6 sm:p-8 text-center relative">
              <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-105 transition-transform duration-300">
                <Target className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Live Updates</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed">
                Stay informed with instant notifications about your applications and interview opportunities.
              </p>
              <div className="space-y-3 text-left text-sm">
                <div className="flex items-center text-violet-600 dark:text-violet-400">
                  <CheckCircle className="w-4 h-4 mr-3 flex-shrink-0" />
                  <span>Employer profile views</span>
                </div>
                <div className="flex items-center text-violet-600 dark:text-violet-400">
                  <CheckCircle className="w-4 h-4 mr-3 flex-shrink-0" />
                  <span>Interview invitations</span>
                </div>
                <div className="flex items-center text-violet-600 dark:text-violet-400">
                  <CheckCircle className="w-4 h-4 mr-3 flex-shrink-0" />
                  <span>Application status changes</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-blue-950 rounded-2xl p-8 sm:p-10 border border-slate-200 dark:border-gray-800">
          <div className="relative grid md:grid-cols-3 gap-8 text-center">
            <div className="group">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <span className="text-3xl sm:text-4xl font-bold mb-2 text-gray-900 dark:text-white">
                  {platformStats?.totalUsers ? `${platformStats.totalUsers.toLocaleString()}+` : '8+'}
                </span>
                <p className="text-gray-600 dark:text-gray-300 text-sm font-medium">Active Users</p>
              </div>
            </div>
            <div className="group">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <span className="text-3xl sm:text-4xl font-bold mb-2 text-gray-900 dark:text-white">
                  {platformStats?.totalJobs ? platformStats.totalJobs.toLocaleString() : '5'}
                </span>
                <p className="text-gray-600 dark:text-gray-300 text-sm font-medium">Live Jobs</p>
              </div>
            </div>
            <div className="group">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <span className="text-3xl sm:text-4xl font-bold mb-2 text-gray-900 dark:text-white">
                  {platformStats?.totalMatches ? platformStats.totalMatches.toLocaleString() : '8'}
                </span>
                <p className="text-gray-600 dark:text-gray-300 text-sm font-medium">AI Matches</p>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Comparison Section */}
      <div className="container mx-auto px-4 sm:px-6 py-16 sm:py-20 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light text-gray-900 dark:text-white mb-4 sm:mb-6 tracking-tight">
            Traditional Job Boards <span className="font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">vs Recrutas</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Traditional Platforms */}
          <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">😵‍💫</span>
                </div>
                <h3 className="text-xl font-bold text-red-800 dark:text-red-200">LinkedIn, Indeed, Others</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800 dark:text-red-200">Recruiter Spam</p>
                    <p className="text-sm text-red-600 dark:text-red-300">Third-party recruiters flood your inbox then ghost you</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800 dark:text-red-200">Application Black Holes</p>
                    <p className="text-sm text-red-600 dark:text-red-300">Apply and wait weeks with zero feedback</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800 dark:text-red-200">Gatekeepers</p>
                    <p className="text-sm text-red-600 dark:text-red-300">Multiple layers between you and hiring managers</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800 dark:text-red-200">Slow Process</p>
                    <p className="text-sm text-red-600 dark:text-red-300">Weeks of email chains and scheduling delays</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recrutas */}
          <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎯</span>
                </div>
                <h3 className="text-xl font-bold text-green-800 dark:text-green-200">Recrutas</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">Zero Recruiters</p>
                    <p className="text-sm text-green-600 dark:text-green-300">Direct connection with actual hiring managers</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">Instant Feedback</p>
                    <p className="text-sm text-green-600 dark:text-green-300">Know your application status in real-time</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">No Gatekeepers</p>
                    <p className="text-sm text-green-600 dark:text-green-300">Chat directly with the person making decisions</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">Lightning Fast</p>
                    <p className="text-sm text-green-600 dark:text-green-300">Schedule interviews instantly through built-in chat</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mission Statement Section */}
      <div className="container mx-auto px-4 sm:px-6 py-16 sm:py-20 bg-gradient-to-br from-blue-900 to-indigo-900 text-white">
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center px-6 py-3 bg-red-500/20 border border-red-400/30 rounded-full mb-6">
            <span className="text-2xl mr-3">🎯</span>
            <span className="text-lg font-semibold">Our Mission</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-8 leading-tight">
            End the Recruiter Industrial Complex
          </h2>
          
          <div className="max-w-4xl mx-auto space-y-6 text-lg sm:text-xl leading-relaxed">
            <p className="text-blue-100">
              For too long, third-party recruiters have inserted themselves between talented candidates and companies, 
              creating delays, miscommunication, and unnecessary barriers.
            </p>
            
            <p className="text-white font-medium text-xl sm:text-2xl">
              We believe hiring should be human, direct, and transparent.
            </p>
            
            <p className="text-blue-100">
              Recrutas eliminates the middleman entirely. Companies post jobs, candidates apply directly, 
              and hiring managers make decisions in real-time. No gatekeepers. No delays. No noise.
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8 mt-12 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-400">0</div>
              <div className="text-sm text-blue-200">Third-Party Recruiters</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">100%</div>
              <div className="text-sm text-blue-200">Direct Connections</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-400">Real-Time</div>
              <div className="text-sm text-blue-200">Instant Feedback</div>
            </div>
          </div>
        </div>
      </div>

      {/* Why Choose Recrutas Section */}
      <div className="container mx-auto px-4 sm:px-6 py-16 sm:py-20 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light text-gray-900 dark:text-white mb-4 sm:mb-6 tracking-tight">
            Why Choose <span className="font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Recrutas?</span>
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-gray-500 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
            We're not trying to be a social network or job aggregator. Recrutas is laser-focused on making hiring faster, fairer, and more human—for both sides.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 mb-16">
          {/* No Recruiters */}
          <Card className="group relative overflow-hidden border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl">
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">🚫</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">No Recruiters, No Noise</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4">
                    Unlike LinkedIn or Indeed, where third-party recruiters often flood inboxes or ghost applicants, Recrutas cuts out the middle layer.
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-blue-600 dark:text-blue-400">
                      <CheckCircle className="w-4 h-4 mr-3 flex-shrink-0" />
                      <span>Direct connection with hiring managers</span>
                    </div>
                    <div className="flex items-center text-blue-600 dark:text-blue-400">
                      <CheckCircle className="w-4 h-4 mr-3 flex-shrink-0" />
                      <span>No gatekeepers or black holes</span>
                    </div>
                    <div className="flex items-center text-blue-600 dark:text-blue-400">
                      <CheckCircle className="w-4 h-4 mr-3 flex-shrink-0" />
                      <span>Zero third-party recruiters</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Instant Feedback */}
          <Card className="group relative overflow-hidden border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl">
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">⚡</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Instant Feedback Loop</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4">
                    Recrutas emphasizes fast, transparent responses. Whether it's a yes or a no, candidates get notified promptly—no more waiting weeks in silence.
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-blue-600 dark:text-blue-400">
                      <CheckCircle className="w-4 h-4 mr-3 flex-shrink-0" />
                      <span>Real-time application status updates</span>
                    </div>
                    <div className="flex items-center text-blue-600 dark:text-blue-400">
                      <CheckCircle className="w-4 h-4 mr-3 flex-shrink-0" />
                      <span>Immediate interview notifications</span>
                    </div>
                    <div className="flex items-center text-blue-600 dark:text-blue-400">
                      <CheckCircle className="w-4 h-4 mr-3 flex-shrink-0" />
                      <span>No more application black holes</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Built-in Filtering */}
          <Card className="group relative overflow-hidden border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl">
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">🧠</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Built-In Filtering Exams</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4">
                    Companies can attach custom screening tests to job listings. Recrutas automatically ranks applicants based on performance, so hiring managers spend less time sifting.
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-blue-600 dark:text-blue-400">
                      <CheckCircle className="w-4 h-4 mr-3 flex-shrink-0" />
                      <span>Custom technical assessments</span>
                    </div>
                    <div className="flex items-center text-blue-600 dark:text-blue-400">
                      <CheckCircle className="w-4 h-4 mr-3 flex-shrink-0" />
                      <span>Automated candidate ranking</span>
                    </div>
                    <div className="flex items-center text-blue-600 dark:text-blue-400">
                      <CheckCircle className="w-4 h-4 mr-3 flex-shrink-0" />
                      <span>Skills-based matching</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Real-time Communication */}
          <Card className="group relative overflow-hidden border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl">
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">📲</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Real-Time Communication</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4">
                    Once a candidate is shortlisted, they can chat directly with the hiring manager—like messaging your Uber driver, but for your next job. No more awkward email chains.
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-blue-600 dark:text-blue-400">
                      <CheckCircle className="w-4 h-4 mr-3 flex-shrink-0" />
                      <span>Direct messaging with hiring managers</span>
                    </div>
                    <div className="flex items-center text-blue-600 dark:text-blue-400">
                      <CheckCircle className="w-4 h-4 mr-3 flex-shrink-0" />
                      <span>Instant interview scheduling</span>
                    </div>
                    <div className="flex items-center text-blue-600 dark:text-blue-400">
                      <CheckCircle className="w-4 h-4 mr-3 flex-shrink-0" />
                      <span>No email chain delays</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mission Statement */}
        <div className="text-center bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 sm:p-12 text-white">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">🎯</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold mb-4">Mission-Driven Design</h3>
          <p className="text-lg sm:text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
            Recrutas isn't trying to be a social network or a job aggregator. We're laser-focused on making hiring faster, fairer, and more human—for both sides.
          </p>
        </div>
      </div>

      {/* Final CTA Section */}
      <div className="container mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 rounded-2xl sm:rounded-3xl p-8 sm:p-12 lg:p-16 text-center text-white shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-2xl sm:rounded-3xl"></div>
          <div className="absolute top-6 left-6 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-6 right-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl"></div>
          
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light mb-6 sm:mb-8 leading-tight">
              Skip the Noise.
              <br />
              <span className="font-bold bg-gradient-to-r from-white via-blue-100 to-indigo-100 bg-clip-text text-transparent">Find Your Job.</span>
            </h2>
            <p className="text-lg sm:text-xl mb-8 sm:mb-10 text-slate-200 max-w-2xl mx-auto leading-relaxed">
              Join thousands of candidates and hiring managers who've already said goodbye to recruiter spam and application black holes.
            </p>
            
            <div className="bg-gradient-to-r from-red-900/30 to-orange-900/30 border border-red-400/40 rounded-xl p-6 mb-8 max-w-2xl mx-auto">
              <p className="text-red-200 font-medium text-lg">
                "Finally, a platform that treats job seekers like humans, not LinkedIn leads." 
              </p>
              <p className="text-red-300 text-sm mt-2">- Sarah K., Software Engineer</p>
            </div>
            <Button 
              size="lg"
              className="px-8 sm:px-12 py-4 sm:py-5 text-lg font-medium bg-white text-slate-900 hover:bg-slate-50 shadow-2xl hover:shadow-white/25 transition-all duration-300 rounded-xl border-0 group"
              onClick={handleLogin}
            >
              <span className="mr-3">Start Matching</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </Button>
            <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-slate-300 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Free to use</span>
              </div>
              <div className="hidden sm:block w-1 h-1 bg-slate-400 rounded-full"></div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>No recruiters</span>
              </div>
              <div className="hidden sm:block w-1 h-1 bg-slate-400 rounded-full"></div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Direct applications</span>
              </div>
            </div>
          </div>
        </div>
      </div>

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
