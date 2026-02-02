import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Sparkles,
  Target,
  ArrowRight,
  CheckCircle,
  Shield,
  FileText,
  Zap,
  X,
  Menu,
  Brain,
  Users,
  BadgeCheck,
  Clock,
  XCircle,
  ArrowDown
} from "lucide-react";
import RecrutasLogo, { RecrutasLogoSimple } from "@/components/recrutas-logo";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import { motion } from "framer-motion";

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session, isPending } = useSession();
  const user = session?.user;
  const isAuthenticated = !!user;
  const isLoading = isPending;

  const handleLogin = () => {
    window.location.href = "/auth";
  };

  const handleGetStarted = () => {
    if (isAuthenticated) {
      window.location.href = (user as any)?.role === 'candidate' ? '/candidate-dashboard' : '/talent-dashboard';
    } else {
      window.location.href = "/auth";
    }
  };

  if (isAuthenticated && user && !(user as any)?.role) {
    window.location.href = '/role-selection';
    return null;
  }

  // Journey steps
  const journeySteps = [
    {
      step: 1,
      icon: Upload,
      title: "Upload Your Resume",
      description: "Drop your resume and we extract your skills automatically using AI. No manual entry needed.",
      color: "from-blue-500 to-cyan-500"
    },
    {
      step: 2,
      icon: Brain,
      title: "AI Extracts Your Skills",
      description: "Our AI analyzes your experience and identifies your technical skills, experience level, and expertise.",
      color: "from-purple-500 to-pink-500"
    },
    {
      step: 3,
      icon: Target,
      title: "See Only Matching Jobs",
      description: "Get personalized job matches based on YOUR skills. No generic listings. No noise.",
      color: "from-green-500 to-emerald-500"
    }
  ];

  // What makes us different
  const differences = [
    {
      recrutas: "Only shows jobs matching your skills",
      others: "Shows 10,000+ random jobs",
      icon: Target
    },
    {
      recrutas: "Verified active job postings",
      others: "Ghost jobs and stale listings",
      icon: BadgeCheck
    },
    {
      recrutas: "Know WHY you match each job",
      others: "Black-box \"85% match\" scores",
      icon: Sparkles
    },
    {
      recrutas: "Pre-qualify with skill assessments",
      others: "Apply and pray approach",
      icon: Shield
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 overflow-x-hidden">
      {/* Subtle Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl"></div>
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
                <X className="w-6 h-6 text-white" />
              </Button>
            </div>
            <div className="flex-1 flex flex-col justify-center items-center space-y-6 p-8">
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-lg px-12 py-6 w-full"
                onClick={handleGetStarted}
              >
                Get Started
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="text-slate-300 hover:text-white text-lg w-full"
                onClick={handleLogin}
              >
                Sign In
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Navigation */}
      <nav className="sticky top-0 z-40 backdrop-blur-md bg-slate-950/80 border-b border-slate-800">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <RecrutasLogo size={32} />
              <h2 className="text-xl font-bold text-white">Recrutas</h2>
            </div>

            <div className="hidden lg:flex items-center space-x-4">
              {!isAuthenticated ? (
                <>
                  <Button
                    variant="ghost"
                    className="text-slate-300 hover:text-white"
                    onClick={handleLogin}
                  >
                    Sign In
                  </Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={handleGetStarted}
                  >
                    Get Started
                  </Button>
                </>
              ) : (
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleGetStarted}
                >
                  Go to Dashboard
                </Button>
              )}
            </div>

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
      <section className="relative px-6 py-20 lg:py-28">
        <div className="container mx-auto text-center max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-6 bg-blue-500/10 text-blue-300 border-blue-500/30 px-4 py-2">
              No generic listings. Only personalized matches.
            </Badge>

            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Upload Resume.
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                See Jobs That Match.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
              Recrutas only shows you jobs that match your actual skills.
              No more scrolling through thousands of irrelevant postings.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6"
                onClick={handleGetStarted}
              >
                <Upload className="w-5 h-5 mr-2" />
                Upload Resume to Start
              </Button>
            </div>

            <div className="mt-8 flex items-center justify-center gap-6 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Free forever</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>No recruiter fees</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Verified jobs only</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Arrow Down */}
      <div className="flex justify-center pb-8">
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <ArrowDown className="w-6 h-6 text-slate-600" />
        </motion.div>
      </div>

      {/* How It Works - User Journey */}
      <section className="px-6 py-20">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              How Recrutas Works
            </h2>
            <p className="text-slate-400 text-lg">
              Three simple steps to personalized job matches
            </p>
          </motion.div>

          <div className="space-y-8">
            {journeySteps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
              >
                <Card className="bg-slate-800/30 border-slate-700/50 overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row items-center">
                      {/* Step Number & Icon */}
                      <div className={`w-full md:w-48 p-8 bg-gradient-to-br ${step.color} flex flex-col items-center justify-center`}>
                        <div className="text-5xl font-bold text-white/30 mb-2">
                          {step.step}
                        </div>
                        <step.icon className="w-10 h-10 text-white" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-8">
                        <h3 className="text-xl font-bold text-white mb-2">
                          {step.title}
                        </h3>
                        <p className="text-slate-400 leading-relaxed">
                          {step.description}
                        </p>
                      </div>

                      {/* Arrow to next */}
                      {index < journeySteps.length - 1 && (
                        <div className="hidden md:flex items-center pr-8">
                          <ArrowRight className="w-6 h-6 text-slate-600" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* What Makes Us Different */}
      <section className="px-6 py-20 bg-slate-900/50">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Not Another Job Board
            </h2>
            <p className="text-slate-400 text-lg">
              Here's how Recrutas is different
            </p>
          </motion.div>

          <div className="space-y-4">
            {differences.map((diff, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-slate-800/30 border-slate-700/50">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* Icon */}
                      <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center shrink-0">
                        <diff.icon className="w-6 h-6 text-blue-400" />
                      </div>

                      {/* Comparison */}
                      <div className="flex-1 grid md:grid-cols-2 gap-4">
                        {/* Recrutas */}
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                          <span className="text-white font-medium">{diff.recrutas}</span>
                        </div>

                        {/* Others */}
                        <div className="flex items-center gap-3">
                          <XCircle className="w-5 h-5 text-red-400/60 shrink-0" />
                          <span className="text-slate-500 line-through">{diff.others}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="px-6 py-20">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/10 rounded-full mb-6">
              <Shield className="w-8 h-8 text-green-400" />
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Every Job is Verified
            </h2>
            <p className="text-slate-400 text-lg mb-8 max-w-2xl mx-auto">
              We actively check that every job posting is real and still open.
              No more applying to jobs that were filled months ago.
            </p>

            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div className="p-6">
                <div className="text-3xl font-bold text-white mb-2">100%</div>
                <div className="text-slate-400">Jobs Verified Active</div>
              </div>
              <div className="p-6">
                <div className="text-3xl font-bold text-white mb-2">0</div>
                <div className="text-slate-400">Ghost Job Postings</div>
              </div>
              <div className="p-6">
                <div className="text-3xl font-bold text-white mb-2">Daily</div>
                <div className="text-slate-400">Liveness Checks</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-20">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Card className="bg-gradient-to-br from-blue-600 to-purple-600 border-0">
              <CardContent className="p-10 text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Ready to See Your Matches?
                </h2>
                <p className="text-blue-100 text-lg mb-8">
                  Upload your resume and discover jobs that actually fit your skills.
                </p>
                <Button
                  size="lg"
                  className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-10 py-6"
                  onClick={handleGetStarted}
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Get Started Free
                </Button>
                <p className="text-blue-200 text-sm mt-4">
                  No credit card required
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-800">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <RecrutasLogoSimple size={24} />
              <span className="text-lg font-semibold text-white">Recrutas</span>
            </div>
            <div className="text-slate-500 text-sm">
              No generic listings. Only personalized matches.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
