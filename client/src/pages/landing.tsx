import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Zap, Target, ArrowRight, Sparkles, Users, TrendingUp, Star, CheckCircle, UserCheck, Building2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function Landing() {
  const [selectedRole, setSelectedRole] = useState<'candidate' | 'talent_owner' | null>(null);
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();

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
        <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-24 relative">
          <div className="text-center max-w-5xl mx-auto">
            <Badge variant="secondary" className="mb-6 sm:mb-8 px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-800 border border-blue-200/50 dark:from-blue-950 dark:to-indigo-950 dark:text-blue-200 dark:border-blue-800/50 shadow-sm">
              <Sparkles className="w-3 sm:w-4 h-3 sm:h-4 mr-2 animate-pulse" />
              Find Jobs That Match You
            </Badge>
            
            <h1 className="text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-extralight text-gray-900 dark:text-white mb-6 sm:mb-8 leading-[0.9] tracking-tight">
              Find Your
              <br />
              <span className="font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">Dream Job</span>
            </h1>
            
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-600 dark:text-gray-300 mb-10 sm:mb-16 max-w-4xl mx-auto leading-relaxed font-light px-4">
              We show you jobs that match your skills. Apply with one click and get updates on your applications.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center mb-8 sm:mb-12 px-4">
              <Button 
                size="lg"
                className="w-full sm:w-auto px-8 sm:px-12 py-4 sm:py-6 text-lg sm:text-xl font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-2xl hover:shadow-blue-500/25 transition-all duration-500 rounded-2xl border-0"
                onClick={handleLogin}
              >
                Get Started
                <ArrowRight className="ml-2 sm:ml-3 w-5 sm:w-6 h-5 sm:h-6" />
              </Button>
              <div className="flex items-center gap-2 sm:gap-3 text-gray-500 dark:text-gray-400">
                <CheckCircle className="w-4 sm:w-5 h-4 sm:h-5 text-green-500" />
                <span className="text-base sm:text-lg font-light">Free to use</span>
              </div>
            </div>

            {/* Social proof */}
            <div className="flex items-center justify-center gap-8 text-gray-400 dark:text-gray-500">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-indigo-400 border-2 border-white dark:border-gray-900"></div>
                  ))}
                </div>
                <span className="text-sm font-medium ml-2">Users trust us</span>
              </div>
              <a 
                href="https://www.producthunt.com/posts/recrutas" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:opacity-80 transition-opacity"
              >
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
                <span className="text-sm font-medium ml-1">4.9/5 on Product Hunt</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* AI Features Section */}
      <div className="container mx-auto px-6 py-32">
        <div className="text-center mb-24">
          <h2 className="text-5xl font-light text-gray-900 dark:text-white mb-6 tracking-tight">
            How It <span className="font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Works</span>
          </h2>
          <p className="text-xl text-gray-500 dark:text-gray-400 max-w-3xl mx-auto font-light leading-relaxed">
            Three simple steps to find your next job faster
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-12 mb-32">
          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-white to-blue-50/50 dark:from-gray-900 dark:to-blue-950/50 backdrop-blur-xl shadow-lg hover:shadow-2xl transition-all duration-700 rounded-3xl">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <CardContent className="p-12 text-center relative">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg shadow-blue-500/25">
                <Brain className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-light mb-6 text-gray-900 dark:text-white">Smart Job Matching</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-8 font-light leading-relaxed">
                We find jobs that match your skills and experience. No more scrolling through hundreds of irrelevant listings.
              </p>
              <div className="space-y-4 text-left">
                <div className="flex items-center text-blue-600 dark:text-blue-400">
                  <CheckCircle className="w-5 h-5 mr-4 flex-shrink-0" />
                  <span className="font-light">Only see jobs that fit your profile</span>
                </div>
                <div className="flex items-center text-blue-600 dark:text-blue-400">
                  <CheckCircle className="w-5 h-5 mr-4 flex-shrink-0" />
                  <span className="font-light">Get salary info upfront</span>
                </div>
                <div className="flex items-center text-blue-600 dark:text-blue-400">
                  <CheckCircle className="w-5 h-5 mr-4 flex-shrink-0" />
                  <span className="font-light">See why each job matches you</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-white to-emerald-50/50 dark:from-gray-900 dark:to-emerald-950/50 backdrop-blur-xl shadow-lg hover:shadow-2xl transition-all duration-700 rounded-3xl">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <CardContent className="p-12 text-center relative">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg shadow-emerald-500/25">
                <Zap className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-light mb-6 text-gray-900 dark:text-white">Easy Applications</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-8 font-light leading-relaxed">
                Apply to jobs with just one click. We handle the paperwork so you can focus on finding the right job.
              </p>
              <div className="space-y-4 text-left">
                <div className="flex items-center text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-5 h-5 mr-4 flex-shrink-0" />
                  <span className="font-light">Apply to jobs with one click</span>
                </div>
                <div className="flex items-center text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-5 h-5 mr-4 flex-shrink-0" />
                  <span className="font-light">Track your application progress</span>
                </div>
                <div className="flex items-center text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-5 h-5 mr-4 flex-shrink-0" />
                  <span className="font-light">Connect directly with employers</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-white to-violet-50/50 dark:from-gray-900 dark:to-violet-950/50 backdrop-blur-xl shadow-lg hover:shadow-2xl transition-all duration-700 rounded-3xl">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <CardContent className="p-12 text-center relative">
              <div className="w-20 h-20 bg-gradient-to-br from-violet-500 via-violet-600 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg shadow-violet-500/25">
                <Target className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-light mb-6 text-gray-900 dark:text-white">Get Real-Time Updates</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-8 font-light leading-relaxed">
                Know exactly where you stand with every application. Get instant notifications when employers view your profile or want to interview you.
              </p>
              <div className="space-y-4 text-left">
                <div className="flex items-center text-violet-600 dark:text-violet-400">
                  <CheckCircle className="w-5 h-5 mr-4 flex-shrink-0" />
                  <span className="font-light">See when employers view your profile</span>
                </div>
                <div className="flex items-center text-violet-600 dark:text-violet-400">
                  <CheckCircle className="w-5 h-5 mr-4 flex-shrink-0" />
                  <span className="font-light">Get instant interview invitations</span>
                </div>
                <div className="flex items-center text-violet-600 dark:text-violet-400">
                  <CheckCircle className="w-5 h-5 mr-4 flex-shrink-0" />
                  <span className="font-light">Know your application status instantly</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 rounded-[2.5rem] p-16 text-white shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-[2.5rem]"></div>
          <div className="relative grid md:grid-cols-3 gap-12 text-center">
            <div className="group">
              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <span className="text-6xl font-extralight mb-2 bg-gradient-to-br from-white to-blue-100 bg-clip-text text-transparent">50K+</span>
              </div>
              <p className="text-blue-100 font-light text-lg leading-relaxed">Users find relevant jobs</p>
            </div>
            <div className="group">
              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <span className="text-6xl font-extralight mb-2 bg-gradient-to-br from-white to-emerald-100 bg-clip-text text-transparent">3x</span>
              </div>
              <p className="text-emerald-100 font-light text-lg leading-relaxed">Faster than job boards</p>
            </div>
            <div className="group">
              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-violet-400 to-purple-400 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <span className="text-6xl font-extralight mb-2 bg-gradient-to-br from-white to-violet-100 bg-clip-text text-transparent">90%</span>
              </div>
              <p className="text-violet-100 font-light text-lg leading-relaxed">Match accuracy</p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="container mx-auto px-6 py-32">
        <div className="text-center mb-24">
          <h2 className="text-5xl font-light text-gray-900 dark:text-white mb-6 tracking-tight">
            How It <span className="font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Works</span>
          </h2>
          <p className="text-xl text-gray-500 dark:text-gray-400 max-w-3xl mx-auto font-light leading-relaxed">
            Three simple steps to find your next job
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-16">
          <div className="group text-center">
            <div className="relative mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-[1.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-blue-500/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                <span className="text-3xl font-extralight text-white">1</span>
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-400 rounded-full opacity-60 animate-ping"></div>
            </div>
            <h3 className="text-3xl font-light mb-6 text-gray-900 dark:text-white">Create Profile</h3>
            <p className="text-gray-600 dark:text-gray-300 font-light leading-relaxed text-lg">
              Add your skills, experience, and job preferences. The AI learns what you're looking for.
            </p>
          </div>
          <div className="group text-center">
            <div className="relative mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-[1.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                <span className="text-3xl font-extralight text-white">2</span>
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-400 rounded-full opacity-60 animate-ping" style={{ animationDelay: '0.5s' }}></div>
            </div>
            <h3 className="text-3xl font-light mb-6 text-gray-900 dark:text-white">Get Matches</h3>
            <p className="text-gray-600 dark:text-gray-300 font-light leading-relaxed text-lg">
              Receive job recommendations based on your profile. Each match shows why it's relevant.
            </p>
          </div>
          <div className="group text-center">
            <div className="relative mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-violet-500 via-violet-600 to-purple-600 rounded-[1.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-violet-500/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                <span className="text-3xl font-extralight text-white">3</span>
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-violet-400 rounded-full opacity-60 animate-ping" style={{ animationDelay: '1s' }}></div>
            </div>
            <h3 className="text-3xl font-light mb-6 text-gray-900 dark:text-white">Apply Directly</h3>
            <p className="text-gray-600 dark:text-gray-300 font-light leading-relaxed text-lg">
              Apply to jobs with one click. Connect directly with hiring managers and track your applications.
            </p>
          </div>
        </div>
      </div>

      {/* Final CTA Section */}
      <div className="container mx-auto px-6 py-32">
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 rounded-[3rem] p-20 text-center text-white shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-[3rem]"></div>
          <div className="absolute top-10 left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"></div>
          
          <div className="relative">
            <h2 className="text-6xl font-extralight mb-8 leading-tight">
              Ready to 
              <br />
              <span className="font-bold bg-gradient-to-r from-white via-blue-100 to-indigo-100 bg-clip-text text-transparent">Get Started?</span>
            </h2>
            <p className="text-2xl mb-12 text-slate-200 max-w-4xl mx-auto font-light leading-relaxed">
              Create your profile and start getting matched with relevant jobs today.
            </p>
            <Button 
              size="lg"
              className="px-16 py-6 text-xl font-medium bg-white text-slate-900 hover:bg-slate-50 shadow-2xl hover:shadow-white/25 transition-all duration-500 rounded-2xl border-0 group"
              onClick={handleLogin}
            >
              <span className="mr-4">Start Matching</span>
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" />
            </Button>
            <div className="mt-8 flex items-center justify-center gap-6 text-slate-300 font-light">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span>Free to use</span>
              </div>
              <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span>No recruiters</span>
              </div>
              <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span>Direct applications</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
