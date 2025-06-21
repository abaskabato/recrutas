import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Zap, Target, ArrowRight, Sparkles, Users, TrendingUp, Star, CheckCircle, UserCheck, Building2 } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function Landing() {
  const [selectedRole, setSelectedRole] = useState<'candidate' | 'talent_owner' | null>(null);
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();

  // Fetch real platform statistics
  const { data: platformStats } = useQuery({
    queryKey: ['/api/platform/stats'],
    retry: false,
  });

  const setRoleMutation = useMutation({
    mutationFn: async (role: 'candidate' | 'recruiter') => {
      await apiRequest('POST', '/api/auth/role', { role });
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
            <p className="text-xl text-neutral-600">
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
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-blue-50/30 dark:from-gray-950 dark:via-slate-950 dark:to-blue-950">
      {/* Floating particles animation */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-2 h-2 bg-blue-400/20 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-20 w-1 h-1 bg-indigo-400/30 rounded-full animate-ping"></div>
        <div className="absolute bottom-20 left-20 w-3 h-3 bg-purple-400/20 rounded-full animate-bounce"></div>
      </div>

      {/* Navigation Header */}
      <nav className="relative z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Recrutas
              </h1>
              <Badge variant="secondary" className="ml-2 sm:ml-4 px-2 sm:px-3 py-1 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/50 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800/50">
                V2
              </Badge>
            </div>
            <Button 
              variant="outline" 
              className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-gray-200/50 dark:border-gray-700/50 hover:bg-blue-50 dark:hover:bg-blue-950/20"
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
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-4 sm:mb-6 px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-medium bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-800 border border-blue-200/50 dark:from-blue-950 dark:to-indigo-950 dark:text-blue-200 dark:border-blue-800/50">
              <Sparkles className="w-3 h-3 mr-1.5 animate-pulse" />
              AI-Powered Job Matching
            </Badge>
            
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extralight text-gray-900 dark:text-white mb-4 sm:mb-6 leading-tight tracking-tight">
              Find Your Perfect
              <br />
              <span className="font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">Career Match</span>
            </h1>
            
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 dark:text-gray-300 mb-6 sm:mb-8 max-w-3xl mx-auto leading-relaxed">
              AI-powered job matching that connects you with roles tailored to your skills. One-click applications, real-time updates, instant results.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-6 sm:mb-8">
              <Button 
                size="lg"
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl hover:shadow-blue-500/25 transition-all duration-300 rounded-xl"
                onClick={handleLogin}
              >
                Get Started Free
                <ArrowRight className="ml-2 w-4 sm:w-5 h-4 sm:h-5" />
              </Button>
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>No fees, instant setup</span>
              </div>
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
          <p className="text-base sm:text-lg lg:text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Three simple steps to find your perfect job match
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



      {/* Final CTA Section */}
      <div className="container mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 rounded-2xl sm:rounded-3xl p-8 sm:p-12 lg:p-16 text-center text-white shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-2xl sm:rounded-3xl"></div>
          <div className="absolute top-6 left-6 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-6 right-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl"></div>
          
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light mb-6 sm:mb-8 leading-tight">
              Ready to 
              <br />
              <span className="font-bold bg-gradient-to-r from-white via-blue-100 to-indigo-100 bg-clip-text text-transparent">Get Started?</span>
            </h2>
            <p className="text-lg sm:text-xl mb-8 sm:mb-10 text-slate-200 max-w-2xl mx-auto leading-relaxed">
              Create your profile and start getting matched with relevant jobs today.
            </p>
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
    </div>
  );
}
