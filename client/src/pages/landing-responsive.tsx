import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Zap, Shield, CheckCircle2, ArrowRight,
  Sparkles, Menu, X, MessageSquare, FileText,
  Clock, Eye, Upload, Trophy, BarChart3, Users,
  Building2, Target, Search,
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
            { company: "Stripe", role: "Senior Frontend Engineer", score: 94, status: "94% match" },
            { company: "Linear", role: "Full Stack Engineer", score: 91, status: "91% match" },
            { company: "Vercel", role: "Software Engineer", score: 87, status: "87% match" },
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
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  {job.status}
                </span>
              </div>
            </div>
          ))}

          {/* Match activity */}
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-800">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            3 new matches found based on your resume skills
          </div>
        </div>
      </div>

      {/* Floating notification */}
      <div className="absolute -bottom-5 -right-4 sm:-right-8 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 px-3 py-2.5 flex items-center gap-2.5 max-w-[240px]">
        <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
          <Target className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-900 dark:text-white leading-tight">12 new matches</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">Based on your React + Node skills</p>
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
      // Preserve ?code= param so invite code flows through to signup
      const code = new URLSearchParams(window.location.search).get('code');
      setLocation(code ? `/auth?code=${encodeURIComponent(code)}` : '/auth');
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
                <Sparkles className="w-3 h-3 mr-1.5" />
                AI-powered job matching
              </Badge>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-black dark:text-white leading-[1.1] tracking-tight mb-6">
                Find Jobs That<br />
                <span className="text-emerald-500">Actually Fit.</span>
              </h1>

              <p className="text-lg md:text-xl text-gray-500 dark:text-gray-400 leading-relaxed mb-8 max-w-lg">
                Upload your resume. Our AI matches you to 13,500+ real jobs based on your actual skills and experience — not just keywords. Stop scrolling job boards. <strong className="text-black dark:text-white">See only roles that fit.</strong>
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

      {/* -- Two ways to get hired -- */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-black dark:text-white mb-3">
              Two ways to get hired
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg max-w-2xl mx-auto">
              External jobs: AI finds the right roles for you. Internal jobs: prove yourself, skip the line.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* External jobs path */}
            <div className="p-6 md:p-8 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center">
                  <Search className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-black dark:text-white">Smart Matching</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">For external jobs</p>
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { step: "01", text: "Upload your resume &mdash; AI extracts skills, titles, experience" },
                  { step: "02", text: "Get matched to 13,500+ live jobs from real company career pages" },
                  { step: "03", text: "See match scores &mdash; know exactly why each job fits your background" },
                  { step: "04", text: "Apply directly with one click &mdash; your profile is ready to go" },
                ].map(({ step, text }) => (
                  <div key={step} className="flex items-start gap-3">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 shrink-0 mt-0.5">{step}</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed" dangerouslySetInnerHTML={{ __html: text }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Internal jobs path */}
            <div className="p-6 md:p-8 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-900/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-black dark:text-white">Exam &amp; Chat</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">For jobs posted on Recrutas</p>
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { step: "01", text: "Apply to a role posted directly on Recrutas" },
                  { step: "02", text: "Take a quick screening exam &mdash; know your score the same day" },
                  { step: "03", text: "Get ranked against other candidates &mdash; top scorers skip the line" },
                  { step: "04", text: "Unlock direct chat with the hiring manager &mdash; no middlemen" },
                ].map(({ step, text }) => (
                  <div key={step} className="flex items-start gap-3">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 shrink-0 mt-0.5">{step}</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed" dangerouslySetInnerHTML={{ __html: text }} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* No ghosting promise */}
          <div className="mt-12 max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Every application gets a real response. No ghosting, guaranteed.</span>
            </div>
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
              We don't just list jobs. We match you to the right ones &mdash; and when companies hire through us, you get a real process with real answers.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: Sparkles,
                title: "Matched by what you've actually done",
                body: "We compare your job titles, skills, and experience to every listing &mdash; not just keywords. A Senior Frontend Engineer sees Senior Frontend roles, not random PM jobs.",
              },
              {
                icon: Target,
                title: "13,500+ jobs, personalized for you",
                body: "Jobs from Google, Amazon, Stripe, and thousands more. Your feed shows only roles that match your background &mdash; no scrolling through irrelevant listings.",
              },
              {
                icon: Shield,
                title: "No ghost jobs, no ghosting",
                body: "Every listing is verified live. We auto-hide stale postings. For internal jobs, every candidate gets a real response &mdash; even if it's a no.",
              },
              {
                icon: Trophy,
                title: "Prove yourself with exams",
                body: "For jobs posted on Recrutas, take a quick screening exam. Your score ranks you against other candidates &mdash; top scorers skip the line.",
              },
              {
                icon: MessageSquare,
                title: "Chat directly with hiring managers",
                body: "Pass the exam and unlock direct messaging with the hiring team. No recruiters in the middle, no phone tag, no weeks of silence.",
              },
              {
                icon: Zap,
                title: "One resume, every job",
                body: "Upload once. Your profile is always ready. Apply to any job in your feed with one click &mdash; no re-entering the same info over and over.",
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
                  "Ghosted — weeks of silence, zero feedback",
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
                  "Upload resume once, AI finds jobs that fit",
                  "See match scores — know why each role fits you",
                  "Take exams — get ranked on skill, not connections",
                  "Chat directly with hiring managers",
                  "Only verified, live job listings",
                  "Every application gets a real response",
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

      {/* -- For Companies -- */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">For Companies</p>
            <h2 className="text-3xl md:text-4xl font-bold text-black dark:text-white mb-4">
              Get pre-qualified candidates, not resume spam
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg leading-relaxed max-w-2xl mx-auto">
              Post a job. Candidates take a screening exam. You see them ranked by skill. Chat directly with top scorers. Every applicant gets a real response within 24 hours.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto mb-10">
            {[
              {
                icon: BarChart3,
                title: "Exam-ranked candidates",
                body: "Set a screening exam. Candidates are ranked by score — you see the best first.",
              },
              {
                icon: Users,
                title: "Direct chat with top talent",
                body: "Top exam scorers unlock direct messaging. No agencies, no phone tag.",
              },
              {
                icon: Clock,
                title: "24-hour response SLA",
                body: "Every candidate who applies gets a real response within 24 hours. Your employer brand stays strong.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-center">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4 mx-auto">
                  <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <h3 className="font-bold text-black dark:text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Button
              size="lg"
              variant="outline"
              className="rounded-xl text-base font-semibold px-8 h-12 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              onClick={() => setLocation('/signup/talent-owner')}
            >
              Post a Job Free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">No agencies. No placement fees.</p>
          </div>
        </div>
      </section>

      {/* -- Final CTA -- */}
      <section className="py-24 md:py-32 bg-black dark:bg-emerald-950">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Stop scrolling.<br />Start matching.
          </h2>
          <p className="text-gray-400 text-lg mb-10">
            Upload your resume. See jobs that actually fit. Free forever for candidates.
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
                AI-powered job matching. Upload your resume, find roles that fit.
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
