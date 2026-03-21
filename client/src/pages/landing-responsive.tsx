import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bot, Zap, Shield, CheckCircle2, ArrowRight,
  Sparkles, Menu, X, MessageSquare, FileText,
  Clock, Eye, Upload,
} from "lucide-react";
import SmartLogo from "@/components/smart-logo";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import { useSession } from "@supabase/auth-helpers-react";
import InstantMatchModal from "@/components/instant-match-modal";

// -- Product mockup: shows real product flow, not a stock mockup ----------------

function ProductMockup() {
  return (
    <div className="relative w-full max-w-lg mx-auto lg:mx-0">
      {/* Browser chrome */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden bg-white dark:bg-gray-900">
        {/* Top bar */}
        <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 flex items-center gap-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-1.5 shrink-0">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 bg-white dark:bg-gray-700 rounded-md px-3 py-1 text-xs text-gray-400 text-center truncate">
            recrutas.ai/dashboard
          </div>
        </div>

        {/* Dashboard content */}
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Your Matches</p>
            <span className="text-xs text-gray-400">Today</span>
          </div>

          {/* Job cards */}
          {[
            { company: "Stripe", role: "Senior Frontend Engineer", score: 94, status: "Applied" },
            { company: "Linear", role: "Full Stack Engineer", score: 91, status: "Applying..." },
            { company: "Vercel", role: "Software Engineer", score: 87, status: "Match" },
          ].map((job, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50"
            >
              <div className="w-9 h-9 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-300 shrink-0 shadow-sm">
                {job.company[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{job.role}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{job.company}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  {job.score}%
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  job.status === 'Applied'
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                    : job.status === 'Applying...'
                    ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                }`}>
                  {job.status}
                </span>
              </div>
            </div>
          ))}

          {/* Agent activity */}
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-800">
            <Bot className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            Agent applied to Stripe — filled 4 screening questions from your resume
          </div>
        </div>
      </div>

      {/* Floating notification */}
      <div className="absolute -bottom-5 -right-4 sm:-right-8 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 px-3 py-2.5 flex items-center gap-2.5 max-w-[240px]">
        <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
          <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-900 dark:text-white leading-tight">Stripe responded</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">Interview invite received</p>
        </div>
      </div>
    </div>
  );
}

// -- Main page ----------------------------------------------------------------

export default function LandingResponsive() {
  const [showInstantMatch, setShowInstantMatch] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const session = useSession();
  const [, setLocation] = useLocation();

  const goToApp = () => {
    if (session) {
      const role = (session.user as any)?.user_metadata?.role;
      setLocation(role === 'talent_owner' || role === 'recruiter' ? '/talent-dashboard' : '/candidate-dashboard');
    } else {
      setLocation('/auth');
    }
  };

  const handleStartMatching = () => {
    setShowInstantMatch(false);
    goToApp();
  };

  if (session && !session.user?.user_metadata?.role) {
    setLocation('/role-selection');
    return null;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black overflow-x-hidden">

      {/* -- Mobile menu overlay -- */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/95 z-50 lg:hidden flex flex-col">
          <div className="flex justify-between items-center p-5 border-b border-gray-800">
            <span className="text-white font-bold text-lg">Recrutas</span>
            <button onClick={() => setMobileMenuOpen(false)} className="text-gray-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
          <nav className="flex flex-col gap-2 p-6 flex-1">
            <div className="flex items-center justify-between py-3 border-b border-gray-800">
              <span className="text-gray-300 text-lg font-medium">Theme</span>
              <ThemeToggleButton />
            </div>
            <button onClick={() => { setMobileMenuOpen(false); setLocation('/auth'); }}
              className="text-left text-gray-300 hover:text-white py-3 text-lg font-medium border-b border-gray-800">
              Sign In
            </button>
            <Button
              size="lg"
              className="mt-6 w-full bg-black dark:bg-white text-white dark:text-black rounded-xl text-base"
              onClick={() => { setMobileMenuOpen(false); goToApp(); }}
            >
              Upload Resume <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </nav>
        </div>
      )}

      {/* -- Navbar -- */}
      <nav className="sticky top-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <SmartLogo size={28} showText={false} />
              <span className="font-bold text-lg text-black dark:text-white tracking-tight">Recrutas</span>
            </div>

            <div className="hidden lg:flex items-center gap-3">
              <ThemeToggleButton />
              <Button variant="ghost" size="sm"
                className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
                onClick={() => setLocation('/auth')}>
                Sign In
              </Button>
              <Button size="sm"
                className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 rounded-lg font-medium"
                onClick={goToApp}>
                Get Started Free
              </Button>
            </div>

            <button className="lg:hidden text-black dark:text-white p-1"
              onClick={() => setMobileMenuOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>

      {/* -- Hero -- */}
      <section className="relative pt-20 pb-16 md:pt-28 md:pb-24 lg:pt-36 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-40 dark:opacity-20 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/10 dark:bg-emerald-500/5 blur-3xl rounded-full pointer-events-none" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: copy */}
            <div>
              <Badge variant="secondary"
                className="mb-6 px-3 py-1.5 text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-full">
                <Bot className="w-3 h-3 mr-1.5" />
                AI agent that applies to jobs for you
              </Badge>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-black dark:text-white leading-[1.1] tracking-tight mb-6">
                Job Search,<br />
                <span className="text-emerald-500">Reinvented.</span>
              </h1>

              <p className="text-lg md:text-xl text-gray-500 dark:text-gray-400 leading-relaxed mb-8 max-w-lg">
                Upload your resume. Our AI matches you to real jobs and applies automatically &mdash; filling out forms, answering screening questions, submitting your application. You wake up to interviews, not silence.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <Button
                  size="lg"
                  className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 rounded-xl text-base font-semibold px-7 h-12"
                  onClick={goToApp}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Resume — It's Free
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Free forever for candidates
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> No credit card required
                </span>
              </div>
            </div>

            {/* Right: product mockup */}
            <div className="hidden md:block">
              <ProductMockup />
            </div>
          </div>
        </div>
      </section>

      {/* -- The problem -- */}
      <section className="py-16 md:py-20 border-y border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-black dark:text-white mb-4">
            You already know the problem
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-lg leading-relaxed">
            You apply to 50 jobs. You hear back from 3. You fill out the same form 50 times.
            You never know if anyone even looked at your resume. Most job boards are built for
            employers, not for you. We built something different.
          </p>
        </div>
      </section>

      {/* -- How it works -- */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-black dark:text-white mb-3">
              How it works
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg max-w-xl mx-auto">
              One upload. The AI does the rest.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: "01",
                icon: Upload,
                title: "Upload your resume",
                body: "Our AI extracts your skills, experience, and job titles. No forms to fill out &mdash; your resume is enough.",
              },
              {
                step: "02",
                icon: Bot,
                title: "Agent applies for you",
                body: "The AI finds matching jobs, fills out applications on company career pages, answers screening questions using your real background, and submits. You get an email with exactly what was sent.",
              },
              {
                step: "03",
                icon: MessageSquare,
                title: "Companies respond",
                body: "You'll hear back. Companies get pre-qualified candidates, so they actually review applications. Track every response in your dashboard.",
              },
            ].map(({ step, icon: Icon, title, body }) => (
              <div key={step} className="relative">
                <div className="text-6xl font-black text-gray-100 dark:text-gray-800 leading-none mb-4 select-none">
                  {step}
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-black dark:text-white mb-2">{title}</h3>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm" dangerouslySetInnerHTML={{ __html: body }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -- What makes this different -- */}
      <section className="py-20 md:py-28 border-t border-gray-100 dark:border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-black dark:text-white mb-3">
              Not another job board
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg max-w-xl mx-auto">
              We don't just list jobs. We apply to them for you.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: Bot,
                title: "AI agent applies for you",
                body: "Click one button. The agent opens the company's career page, fills every field, answers screening questions using your resume, uploads your PDF, and hits submit.",
              },
              {
                icon: Sparkles,
                title: "Matched by what you've actually done",
                body: "We compare your job titles, skills, and experience to every listing &mdash; not just keywords. A Senior Frontend Engineer sees Senior Frontend roles, not random PM jobs.",
              },
              {
                icon: Shield,
                title: "No ghost jobs",
                body: "Every listing is scraped from live company career pages and verified. We auto-hide stale postings. If a job is on Recrutas, it's real.",
              },
              {
                icon: Eye,
                title: "You see what was submitted",
                body: "After every application, you get an email showing exactly what the agent sent &mdash; your resume, contact info, and every screening answer. Nothing hidden.",
              },
              {
                icon: Clock,
                title: "Track every application",
                body: "Every job you apply to goes into your dashboard instantly. See status updates, manage applications, and know exactly where you stand.",
              },
              {
                icon: Zap,
                title: "One resume, unlimited applications",
                body: "Upload once. The agent reuses your profile across every application, tailoring answers to each company and role.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors bg-white dark:bg-gray-900 group"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/30 flex items-center justify-center mb-4 transition-colors">
                  <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
                </div>
                <h3 className="font-bold text-black dark:text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed" dangerouslySetInnerHTML={{ __html: body }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -- Before / After -- */}
      <section className="py-20 md:py-28 bg-gray-50 dark:bg-gray-900/50 border-y border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-black dark:text-white mb-3">
              Before vs. after Recrutas
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Before */}
            <div className="p-6 md:p-8 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <p className="text-sm font-semibold text-red-500 uppercase tracking-wider mb-6">Without Recrutas</p>
              <ul className="space-y-4">
                {[
                  "Apply to 50 jobs manually",
                  "Fill out the same form 50 times",
                  "Hear back from 3",
                  "No idea if anyone read your resume",
                  "Ghost jobs waste your time",
                  "Weeks of silence",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* After */}
            <div className="p-6 md:p-8 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10">
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-6">With Recrutas</p>
              <ul className="space-y-4">
                {[
                  "Upload resume once",
                  "AI applies to matched jobs automatically",
                  "See exactly what was submitted",
                  "Track every application in real time",
                  "Only verified, live job listings",
                  "Responses in your inbox",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* -- For Companies (minimal) -- */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl text-center">
          <p className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">For Companies</p>
          <h2 className="text-3xl md:text-4xl font-bold text-black dark:text-white mb-4">
            Get pre-qualified candidates, not resume spam
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-lg leading-relaxed mb-8">
            Every candidate on Recrutas has a parsed profile, matched skills, and verified interest in your role. No agencies, no placement fees.
          </p>
          <Button
            size="lg"
            variant="outline"
            className="rounded-xl text-base font-semibold px-8 h-12 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            onClick={() => setLocation('/signup/talent-owner')}
          >
            Post a Job Free
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* -- Final CTA -- */}
      <section className="py-24 md:py-32 bg-black dark:bg-emerald-950">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Stop applying.<br />Start getting interviews.
          </h2>
          <p className="text-gray-400 text-lg mb-10">
            Upload your resume. The AI handles the rest. Free forever for candidates.
          </p>
          <Button
            size="lg"
            className="bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-base font-semibold px-8 h-12"
            onClick={goToApp}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Resume — It's Free
          </Button>
        </div>
      </section>

      {/* -- Footer -- */}
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <SmartLogo size={24} showText={false} />
                <span className="font-bold text-black dark:text-white">Recrutas</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs">
                AI that applies to jobs for you. Upload your resume, get interviews.
              </p>
            </div>

            {/* Product */}
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">Product</p>
              <ul className="space-y-3">
                {[
                  { label: "Find Jobs", href: "/auth" },
                  { label: "Post a Job", href: "/signup/talent-owner" },
                  { label: "Pricing", href: "/pricing" },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <a href={href} className="text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">Company</p>
              <ul className="space-y-3">
                {[
                  { label: "Community", href: "https://www.reddit.com/r/recrutas/", external: true },
                  { label: "Privacy", href: "/privacy" },
                  { label: "Terms", href: "/terms" },
                ].map(({ label, href, external }) => (
                  <li key={label}>
                    <a
                      href={href}
                      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA column */}
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">Get started</p>
              <Button
                className="w-full bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 rounded-lg text-sm"
                onClick={goToApp}
              >
                Upload Resume Free
              </Button>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} Recrutas. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* -- Instant Match Modal -- */}
      <InstantMatchModal
        isOpen={showInstantMatch}
        onClose={() => setShowInstantMatch(false)}
        onStartMatching={handleStartMatching}
        initialSkills=""
      />
    </div>
  );
}
