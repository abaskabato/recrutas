import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Zap, Target, ArrowRight, Sparkles, Users, TrendingUp, Building } from "lucide-react";
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
                  <UserRoundCheck className="text-primary h-8 w-8" />
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
                  <Building className="text-primary h-8 w-8" />
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-blue-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="container mx-auto px-4 py-24 relative">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-6 px-4 py-2 text-sm font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              <Sparkles className="w-4 h-4 mr-2" />
              Recrutas V2 - Autonomous Hiring Platform
            </Badge>
            
            <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              Your Personal
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"> AI Hiring</span>
              <br />
              Concierge
            </h1>
            
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Experience the future of hiring with AI-curated job matches, instant applications, 
              and real-time career guidance. No recruiters. No gatekeepers. Just you and your perfect opportunity.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg"
                className="px-8 py-4 text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={handleLogin}
              >
                Start Your Journey
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Free forever • No recruiters needed
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Features Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Powered by Advanced AI
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Our intelligent system works 24/7 to find, analyze, and present the perfect opportunities for your career
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-20">
          <Card className="group hover:shadow-2xl transition-all duration-300 border-0 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">AI Job Curation</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Smart algorithms analyze thousands of jobs to find matches with 85%+ compatibility scores and detailed explanations
              </p>
              <div className="space-y-2 text-sm text-left">
                <div className="flex items-center text-green-600 dark:text-green-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  Skill-based matching with confidence levels
                </div>
                <div className="flex items-center text-green-600 dark:text-green-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  Real-time market insights and salary data
                </div>
                <div className="flex items-center text-green-600 dark:text-green-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  Personalized career recommendations
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-2xl transition-all duration-300 border-0 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">One-Tap Applications</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Apply to perfect matches instantly with smart profile optimization and automatic cover letter generation
              </p>
              <div className="space-y-2 text-sm text-left">
                <div className="flex items-center text-emerald-600 dark:text-emerald-400">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
                  Instant application submission
                </div>
                <div className="flex items-center text-emerald-600 dark:text-emerald-400">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
                  Real-time application tracking
                </div>
                <div className="flex items-center text-emerald-600 dark:text-emerald-400">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
                  Direct connection to hiring managers
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-2xl transition-all duration-300 border-0 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Smart Career Insights</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Get personalized career guidance, skill recommendations, and market trends to accelerate your growth
              </p>
              <div className="space-y-2 text-sm text-left">
                <div className="flex items-center text-violet-600 dark:text-violet-400">
                  <div className="w-2 h-2 bg-violet-500 rounded-full mr-3"></div>
                  Skill gap analysis and learning paths
                </div>
                <div className="flex items-center text-violet-600 dark:text-violet-400">
                  <div className="w-2 h-2 bg-violet-500 rounded-full mr-3"></div>
                  Industry trend predictions
                </div>
                <div className="flex items-center text-violet-600 dark:text-violet-400">
                  <div className="w-2 h-2 bg-violet-500 rounded-full mr-3"></div>
                  Salary negotiation insights
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-12 text-white">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="flex items-center justify-center mb-4">
                <Users className="w-8 h-8 mr-3" />
                <span className="text-4xl font-bold">50K+</span>
              </div>
              <p className="text-blue-100">Active candidates finding their dream jobs</p>
            </div>
            <div>
              <div className="flex items-center justify-center mb-4">
                <TrendingUp className="w-8 h-8 mr-3" />
                <span className="text-4xl font-bold">3x</span>
              </div>
              <p className="text-blue-100">Faster hiring process vs traditional methods</p>
            </div>
            <div>
              <div className="flex items-center justify-center mb-4">
                <Target className="w-8 h-8 mr-3" />
                <span className="text-4xl font-bold">94%</span>
              </div>
              <p className="text-blue-100">Match accuracy rate with our AI system</p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Three Steps to Your Dream Job
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Our autonomous system does the heavy lifting for you
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white">
              1
            </div>
            <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Complete Your Profile</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Tell us about your skills, experience, and career goals. Our AI learns your preferences and creates a personalized profile.
            </p>
          </div>
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white">
              2
            </div>
            <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Receive AI-Curated Matches</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Get personalized job recommendations with detailed explanations of why each role is perfect for you, updated in real-time.
            </p>
          </div>
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white">
              3
            </div>
            <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Apply & Connect Instantly</h3>
            <p className="text-gray-600 dark:text-gray-300">
              One-tap applications connect you directly with hiring managers. Track progress in real-time and get interview scheduling assistance.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="bg-gradient-to-r from-slate-900 to-blue-900 rounded-3xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Transform Your Career?
          </h2>
          <p className="text-xl mb-8 text-slate-200 max-w-2xl mx-auto">
            Join thousands of professionals who've found their perfect job through our AI-powered platform. 
            Your personal hiring concierge is waiting.
          </p>
          <Button 
            size="lg"
            className="px-12 py-4 text-lg font-semibold bg-white text-slate-900 hover:bg-slate-100 shadow-lg hover:shadow-xl transition-all duration-300"
            onClick={handleLogin}
          >
            Start Your AI-Powered Job Search
            <ArrowRight className="ml-3 w-5 h-5" />
          </Button>
          <div className="mt-6 text-sm text-slate-300">
            No signup fees • No recruiter middlemen • Just results
          </div>
        </div>
      </div>
    </div>
  );
}
