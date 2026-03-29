import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Zap,
  ArrowRight,
  Sparkles,
  Clock,
  Shield,
  MousePointerClick,
  Search,
  FileText,
  CheckCircle,
  Menu,
  X,
  ChevronDown
} from "lucide-react";
import SmartLogo from "@/components/smart-logo";
import { RecrutasLogoSimple } from "@/components/recrutas-logo";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isAuthenticated && user && !(user as any)?.role) {
    setLocation('/role-selection');
    return null;
  }

  const handleGetStarted = () => {
    if (isAuthenticated && (user as any)?.role === 'candidate') {
      setLocation("/candidate-dashboard");
    } else {
      setLocation("/auth");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-purple-900 overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
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
              <SmartLogo size={32} showText={false} />
              <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(false)}>
                <X className="w-6 h-6 text-primary-foreground" />
              </Button>
            </div>
            <div className="flex-1 flex flex-col justify-center items-center space-y-8 p-8">
              <Button
                variant="ghost"
                size="lg"
                className="text-slate-300 hover:text-white text-xl"
                onClick={() => { setMobileMenuOpen(false); setLocation("/auth"); }}
              >
                Sign In
              </Button>
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-xl px-12 py-4"
                onClick={() => { setMobileMenuOpen(false); handleGetStarted(); }}
              >
                Get Started Free
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
              <SmartLogo size={36} />
            </motion.div>

            <div className="hidden lg:flex items-center space-x-6">
              {!isAuthenticated ? (
                <>
                  <Button
                    variant="ghost"
                    className="text-slate-300 hover:text-white hover:bg-slate-800/50"
                    onClick={() => setLocation("/auth")}
                  >
                    Sign In
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-6"
                    onClick={handleGetStarted}
                  >
                    Get Started Free
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
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-8 leading-tight">
              Stop Applying to
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> Black Holes</span>
            </h1>

            <p className="text-xl md:text-2xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Recrutas matches you to real jobs with AI and auto-fills your applications — so you can focus on interviewing, not clicking Submit.
            </p>

            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-lg px-10 py-6 mb-16"
              onClick={handleGetStarted}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Get Started Free
            </Button>

            {/* Scroll indicator */}
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-slate-500"
            >
              <ChevronDown className="w-6 h-6 mx-auto" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Three Pillars */}
      <section className="px-6 py-20 bg-slate-900/30 backdrop-blur-sm">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              How Recrutas Works
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Three things that should be obvious about job search — but aren't.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Pillar 1: AI Match */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <Card className="group h-full bg-slate-800/50 border-slate-700/50 hover:border-blue-500/40 transition-all duration-300 backdrop-blur-sm">
                <CardContent className="p-8">
                  <div className="w-14 h-14 mb-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Brain className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">AI Match</h3>
                  <p className="text-slate-300 leading-relaxed mb-4">
                    Upload your resume. Our AI reads your skills, experience, and preferences — then finds jobs that actually fit.
                  </p>
                  <div className="space-y-2 text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      <span>Semantic skill matching, not keyword spam</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      <span>Searches across 300+ companies</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      <span>Matches refresh as new jobs appear</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Pillar 2: Auto Apply */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <Card className="group h-full bg-slate-800/50 border-slate-700/50 hover:border-pink-500/40 transition-all duration-300 backdrop-blur-sm">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-14 h-14 bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <MousePointerClick className="w-7 h-7 text-white" />
                    </div>
                    <Badge className="bg-pink-500/20 text-pink-300 border-pink-400/30 text-xs">Beta</Badge>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">Auto Apply</h3>
                  <p className="text-slate-300 leading-relaxed mb-4">
                    Found a match? Our browser extension fills out the application for you — on Greenhouse and more.
                  </p>
                  <div className="space-y-2 text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-pink-400 flex-shrink-0" />
                      <span>AI reads the form and fills it with your info</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-pink-400 flex-shrink-0" />
                      <span>Review before submitting — you stay in control</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-pink-400 flex-shrink-0" />
                      <span>Adding more job boards every week</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Pillar 3: 24hr Response */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <Card className="group h-full bg-slate-800/50 border-slate-700/50 hover:border-purple-500/40 transition-all duration-300 backdrop-blur-sm">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-violet-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Clock className="w-7 h-7 text-white" />
                    </div>
                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30 text-xs">Coming Soon</Badge>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">24hr Response</h3>
                  <p className="text-slate-300 leading-relaxed mb-4">
                    For jobs posted directly on Recrutas — every application gets a real response within 24 hours.
                  </p>
                  <div className="space-y-2 text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      <span>Honest feedback, even on rejections</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      <span>No more ghosting — know where you stand</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      <span>Launching with employer partners soon</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works — Steps */}
      <section className="px-6 py-20">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Three Steps. That's It.
            </h2>
          </motion.div>

          <div className="space-y-12">
            {[
              {
                step: "1",
                icon: FileText,
                title: "Upload your resume",
                description: "Drop your PDF. Our AI parses it in seconds — skills, experience, preferences.",
                color: "from-blue-500 to-cyan-500"
              },
              {
                step: "2",
                icon: Search,
                title: "Get matched instantly",
                description: "Semantic AI compares you against thousands of live openings. No keyword games.",
                color: "from-blue-500 to-cyan-500"
              },
              {
                step: "3",
                icon: Zap,
                title: "Apply with one click",
                description: "Use our browser extension to auto-fill applications. Or apply the old way — your choice.",
                color: "from-pink-500 to-rose-500"
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="flex items-start gap-6"
              >
                <div className={`flex-shrink-0 w-14 h-14 bg-gradient-to-r ${item.color} rounded-2xl flex items-center justify-center`}>
                  <item.icon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-500 mb-1">Step {item.step}</div>
                  <h3 className="text-2xl font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-lg text-slate-300">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* The Problem — Rejection */}
      <section className="px-6 py-20 bg-slate-900/30 backdrop-blur-sm">
        <div className="container mx-auto text-center max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
              You Deserve Better Than Silence
            </h2>
            <div className="space-y-6 mb-10">
              <blockquote className="text-xl text-slate-500 italic border-l-2 border-slate-700 pl-6 text-left">
                "After careful consideration, we've decided to move forward with other candidates."
              </blockquote>
              <blockquote className="text-xl text-slate-600 italic border-l-2 border-slate-800 pl-6 text-left">
                — or worse, nothing at all.
              </blockquote>
            </div>
            <p className="text-xl text-slate-300 mb-4">
              The average job application has a <span className="text-white font-semibold">2-3% response rate</span>.
              You apply to 100 jobs, hear back from 2.
            </p>
            <p className="text-xl text-white font-medium">
              We're building Recrutas so that every application gets a response. That's the standard we're working toward.
            </p>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-24">
        <div className="container mx-auto text-center max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready?
            </h2>
            <p className="text-xl text-slate-300 mb-10">
              Free to use. No credit card. No recruiter fees. Just better job search.
            </p>
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-lg px-10 py-6"
              onClick={handleGetStarted}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
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
              &copy; {new Date().getFullYear()} Recrutas. Job search that respects your time.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
