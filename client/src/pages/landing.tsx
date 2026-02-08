import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Brain, 
  Zap, 
  Target, 
  ArrowRight, 
  Sparkles, 
  Users, 
  TrendingUp, 
  Star, 
  CheckCircle, 
  UserCheck, 
  Building2, 
  Menu, 
  X, 
  Search, 
  Globe, 
  Clock,
  Shield,
  Rocket,
  Heart,
  Award,
  PlayCircle,
  ChevronRight,
  MessageSquare,
  Briefcase,
  MapPin,
  DollarSign
} from "lucide-react";
import RecrutasLogo, { RecrutasLogoSimple } from "@/components/recrutas-logo";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import InstantMatchModal from "@/components/instant-match-modal";
import { motion } from "framer-motion";

interface FeatureCard {
  icon: any;
  title: string;
  description: string;
  gradient: string;
}

interface Testimonial {
  name: string;
  role: string;
  company: string;
  content: string;
  avatar: string;
}

interface JobSample {
  title: string;
  company: string;
  location: string;
  salary: string;
  type: string;
}

export default function Landing() {
  const [selectedRole, setSelectedRole] = useState<'candidate' | 'talent_owner' | null>(null);
  const [showInstantMatch, setShowInstantMatch] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();

  // Auto-open instant match modal for engagement
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      const timer = setTimeout(() => {
        setShowInstantMatch(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isLoading]);

  // Fetch platform statistics
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
    onError: () => {
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
    setLocation("/auth");
  };

  const handleStartMatching = () => {
    setShowInstantMatch(false);
    if (isAuthenticated && (user as any)?.role === 'candidate') {
      setLocation("/candidate-dashboard");
    } else {
      handleLogin();
    }
  };

  if (isAuthenticated && user && !(user as any)?.role) {
    setLocation('/role-selection');
    return null;
  }

  const features: FeatureCard[] = [
    {
      icon: Brain,
      title: "AI-Powered Agentic Search",
      description: "Our advanced AI analyzes skills, experience, and preferences to find perfect job opportunities in seconds.",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: Shield,
      title: "Zero Recruiter Fees",
      description: "Connect directly with companies. No middleman fees, no agency commissions, just pure talent connection.",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      icon: Rocket,
      title: "Instant Job Delivery",
      description: "Get job recommendations delivered instantly to your dashboard. DoorDash for jobs, but faster.",
      gradient: "from-purple-500 to-violet-500"
    },
    {
      icon: Target,
      title: "Perfect Fit Guarantee",
      description: "Our agentic algorithm ensures 95% compatibility between candidates and job requirements.",
      gradient: "from-orange-500 to-red-500"
    }
  ];

  const testimonials: Testimonial[] = [
    {
      name: "Sarah Chen",
      role: "Software Engineer",
      company: "Google",
      content: "Found my dream job in 2 days without a single recruiter call. Recrutas changed my life!",
      avatar: "SC"
    },
    {
      name: "Marcus Johnson",
      role: "CTO",
      company: "Stripe",
      content: "Hired 3 amazing engineers in one week. No agency fees, no hassle, just great talent.",
      avatar: "MJ"
    },
    {
      name: "Elena Rodriguez",
      role: "Designer",
      company: "Figma",
      content: "The AI agent is incredibly accurate. Got connected with companies I never would have found.",
      avatar: "ER"
    }
  ];

  const sampleJobs: JobSample[] = [
    {
      title: "Senior Software Engineer",
      company: "Microsoft",
      location: "Seattle, WA",
      salary: "$180k - $250k",
      type: "Full-time"
    },
    {
      title: "Product Manager",
      company: "Apple",
      location: "Cupertino, CA",
      salary: "$160k - $220k",
      type: "Full-time"
    },
    {
      title: "Data Scientist",
      company: "Meta",
      location: "Remote",
      salary: "$140k - $200k",
      type: "Full-time"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-purple-900 overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 lg:hidden"
        >
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center p-6 border-b border-slate-700">
              <RecrutasLogo size={32} />
              <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(false)}>
                <X className="w-6 h-6 text-primary-foreground" />
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
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-xl px-12 py-4"
                onClick={() => setShowInstantMatch(true)}
              >
                Try Agentic Search
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Navigation */}
      <nav className="sticky top-0 z-40 backdrop-blur-md bg-slate-950/80 border-b border-slate-700/50">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-3"
            >
              <RecrutasLogo size={36} />
              <h2 className="text-2xl font-bold text-white tracking-tight">Recrutas</h2>

            </motion.div>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-6">
              {!isAuthenticated ? (
                <>
                  <Button 
                    variant="ghost" 
                    className="text-slate-300 hover:text-white hover:bg-slate-800/50"
                    onClick={handleLogin}
                  >
                    Sign In
                  </Button>
                  <Button 
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-6"
                    onClick={() => setShowInstantMatch(true)}
                  >
                    Try Agentic Search
                  </Button>
                </>
              ) : (
                <Button 
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                  onClick={() => setLocation((user as any)?.role === 'candidate' ? '/candidate-dashboard' : '/recruiter-dashboard')}
                >
                  Go to Dashboard
                </Button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-white"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 py-20 lg:py-32">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Badge className="mb-6 bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 border-blue-400/30 text-lg px-6 py-3">
              ✨ Built on AI. Backed by transparency. Focused on you.
            </Badge>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-8 leading-tight">
              Skip the
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> Recruiters</span>
              <br />
              Talk to
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"> Real People</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-300 mb-12 max-w-4xl mx-auto leading-relaxed">
              Connect directly with hiring managers. No middlemen, no fees, no black holes. 
              Just real conversations with the people who make hiring decisions.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Button 
                size="lg"
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-lg px-8 py-4 w-full sm:w-auto"
                onClick={() => setShowInstantMatch(true)}
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Try Agentic Search
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                className="border-slate-400 text-slate-300 hover:bg-slate-800/50 hover:text-white text-lg px-8 py-4 w-full sm:w-auto"
                onClick={handleLogin}
              >
                <PlayCircle className="w-5 h-5 mr-2" />
                Watch Demo
              </Button>
            </div>

            {/* Platform Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                  {(platformStats as any)?.totalUsers || '10,000'}+
                </div>
                <div className="text-slate-400">Active Users</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                  {(platformStats as any)?.totalJobs || '25,000'}+
                </div>
                <div className="text-slate-400">Jobs Posted</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                  {(platformStats as any)?.totalMatches || '50,000'}+
                </div>
                <div className="text-slate-400">Successful Connections</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                  $0
                </div>
                <div className="text-slate-400">Recruiter Fees</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-20 bg-slate-900/30 backdrop-blur-sm">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Why Choose Recrutas?
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              We're revolutionizing how talent meets opportunity with cutting-edge AI and direct connections.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="group h-full bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 hover:scale-105 backdrop-blur-sm">
                  <CardContent className="p-6 text-center">
                    <div className={`w-16 h-16 mx-auto mb-4 bg-gradient-to-r ${feature.gradient} rounded-full flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <feature.icon className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                    <p className="text-slate-300 leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Rejection Section */}
      <section className="px-6 py-20">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Tired of the same old story?
            </h2>
            <blockquote className="text-xl md:text-2xl text-slate-400 italic max-w-3xl mx-auto mb-8">
              "After careful consideration, we’ve decided to move forward with another candidate for this opportunity."
            </blockquote>
            <p className="text-xl text-slate-300">
              Recrutas is here to change that.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Job Samples Section */}
      <section className="px-6 py-20">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Latest Job Opportunities
            </h2>
            <p className="text-xl text-slate-300">
              See the kind of opportunities waiting for you
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {sampleJobs.map((job, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="group bg-slate-800/50 border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 hover:scale-105 cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                        <Briefcase className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <Badge className="bg-green-500/20 text-green-300 border-green-400/30">
                        {job.type}
                      </Badge>
                    </div>
                    
                    <h3 className="text-lg font-bold text-white mb-2">{job.title}</h3>
                    <p className="text-blue-400 font-medium mb-3">{job.company}</p>
                    
                    <div className="space-y-2 text-sm text-slate-300">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2" />
                        {job.location}
                      </div>
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 mr-2" />
                        {job.salary}
                      </div>
                    </div>
                    
                    <Button className="w-full mt-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
                      Apply Now
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Button 
              variant="outline"
              size="lg"
              className="border-slate-400 text-slate-300 hover:bg-slate-800/50 hover:text-white"
              onClick={() => setShowInstantMatch(true)}
            >
              View All Jobs
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="px-6 py-20 bg-slate-900/30 backdrop-blur-sm">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Success Stories
            </h2>
            <p className="text-xl text-slate-300">
              See how Recrutas is changing careers and companies
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center font-bold text-white mr-3">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <h4 className="font-bold text-white">{testimonial.name}</h4>
                        <p className="text-sm text-slate-400">{testimonial.role} at {testimonial.company}</p>
                      </div>
                    </div>
                    <p className="text-slate-300 italic">"{testimonial.content}"</p>
                    <div className="flex mt-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Ready to Find Your
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> Perfect Opportunity?</span>
            </h2>
            
            <p className="text-xl text-slate-300 mb-12 max-w-3xl mx-auto">
              Join thousands of professionals who've already discovered a better way to find jobs and hire talent.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg"
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-lg px-12 py-4 w-full sm:w-auto"
                onClick={() => setShowInstantMatch(true)}
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Start Agentic Search Now
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                className="border-slate-400 text-slate-300 hover:bg-slate-800/50 hover:text-white text-lg px-12 py-4 w-full sm:w-auto"
                onClick={handleLogin}
              >
                <UserCheck className="w-5 h-5 mr-2" />
                Sign Up Free
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-900/50 border-t border-slate-700/50">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <RecrutasLogoSimple size={28} />
              <span className="text-xl font-bold text-white">Recrutas</span>
            </div>
            <div className="text-slate-400 text-center md:text-right">
              © 2025 Recrutas. Revolutionizing job search and hiring.
            </div>
          </div>
        </div>
      </footer>

      {/* Instant Match Modal */}
      <InstantMatchModal
        isOpen={showInstantMatch}
        onClose={() => setShowInstantMatch(false)}
        onStartMatching={handleStartMatching}
        initialSkills=""
      />
    </div>
  );
}