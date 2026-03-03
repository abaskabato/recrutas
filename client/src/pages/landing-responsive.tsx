import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain, Zap, Target, Users, CheckCircle2, ArrowRight,
  Sparkles, Menu, X, MessageSquare, FileText, TrendingUp,
  Building2, Star, ChevronRight,
} from "lucide-react";
import SmartLogo from "@/components/smart-logo";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import { useQuery } from "@tanstack/react-query";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import InstantMatchModal from "@/components/instant-match-modal";

// ── Product mockup shown in the hero ─────────────────────────────────────────

const MOCK_JOBS = [
  { company: "Stripe",  role: "Senior Frontend Engineer",  score: 94, tag: "React" },
  { company: "Linear",  role: "Product Designer",          score: 88, tag: "Figma" },
  { company: "Vercel",  role: "Developer Advocate",        score: 82, tag: "Next.js" },
];

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
            recrutas.ai/candidate-dashboard
          </div>
        </div>

        {/* Dashboard content */}
        <div className="p-5 space-y-4">
          {/* Section heading */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">AI Matches</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">3 new today · 12 applied</p>
            </div>
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
              <Sparkles className="h-3 w-3" />
              AI Matching
            </span>
          </div>

          {/* Job match cards */}
          <div className="space-y-2">
            {MOCK_JOBS.map((job, i) => (
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
                  <span className="hidden sm:block text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                    {job.tag}
                  </span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    {job.score}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Applied status pill */}
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 pt-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            Agent applied to Stripe on your behalf — response expected in 24h
          </div>
        </div>
      </div>

      {/* Floating notification */}
      <div className="absolute -bottom-5 -right-4 sm:-right-8 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 px-3 py-2.5 flex items-center gap-2.5 max-w-[220px]">
        <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
          <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-900 dark:text-white leading-tight">Stripe wants to chat</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">Recruiter unlocked</p>
        </div>
      </div>
    </div>
  );
}

// ── Stats strip ───────────────────────────────────────────────────────────────

function StatsStrip({ stats }: { stats: any }) {
  const fmt = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}k+` : `${n}+`;

  const items = [
    { label: "Candidates matched",  value: fmt(stats?.totalMatches ?? 2400) },
    { label: "Live job listings",   value: fmt(stats?.totalJobs    ?? 8500) },
    { label: "Users on platform",   value: fmt(stats?.totalUsers   ?? 1200) },
    { label: "Avg. response time",  value: "< 24h" },
  ];

  return (
    <div className="border-y border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 py-6">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {items.map(({ label, value }) => (
            <div key={label}>
              <p className="text-2xl md:text-3xl font-bold text-black dark:text-white tabular-nums">{value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Testimonials ──────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    quote: "I got three interview requests in the first week. The AI matched me to roles I'd never have found on my own — and I actually heard back from all of them.",
    name: "Alex M.",
    title: "Software Engineer",
    rating: 5,
  },
  {
    quote: "We filled a senior backend role in 9 days. The candidates Recrutas surfaced were pre-screened and genuinely matched our stack. Worth every cent.",
    name: "Sarah K.",
    title: "Engineering Manager, Series B startup",
    rating: 5,
  },
  {
    quote: "After 4 months of radio silence on LinkedIn, Recrutas found me a role at a company I'd never heard of — turned out to be perfect. Hired in 11 days.",
    name: "Jordan T.",
    title: "Product Designer",
    rating: 5,
  },
];

function Testimonials() {
  return (
    <section className="py-20 md:py-28 bg-gray-50 dark:bg-gray-900/50 border-y border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-black dark:text-white mb-3">
            Real results, real people
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-lg max-w-xl mx-auto">
            From first match to offer letter — here's what candidates and companies say.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {TESTIMONIALS.map(({ quote, name, title, rating }) => (
            <div
              key={name}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col gap-4"
            >
              <div className="flex gap-0.5">
                {Array.from({ length: rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed flex-1">
                "{quote}"
              </p>
              <div>
                <p className="text-sm font-semibold text-black dark:text-white">{name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{title}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LandingResponsive() {
  const [showInstantMatch, setShowInstantMatch] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const session = useSession();
  const supabase = useSupabaseClient();
  const [, setLocation] = useLocation();

  const { data: platformStats } = useQuery({
    queryKey: ['/api/platform/stats'],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

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

      {/* ── Mobile menu overlay ── */}
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
            <a href="/pricing" onClick={() => setMobileMenuOpen(false)}
              className="text-gray-300 hover:text-white py-3 text-lg font-medium border-b border-gray-800">
              Pricing
            </a>
            <button onClick={() => { setMobileMenuOpen(false); setLocation('/auth'); }}
              className="text-left text-gray-300 hover:text-white py-3 text-lg font-medium border-b border-gray-800">
              Sign In
            </button>
            <Button
              size="lg"
              className="mt-6 w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-base"
              onClick={() => { setMobileMenuOpen(false); setShowInstantMatch(true); }}
            >
              Find Jobs Free <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full rounded-xl text-base border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800"
              onClick={() => { setMobileMenuOpen(false); setLocation('/signup/talent-owner'); }}
            >
              Post a Job
            </Button>
          </nav>
        </div>
      )}

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo + wordmark */}
            <div className="flex items-center gap-2.5">
              <SmartLogo size={28} showText={false} />
              <span className="font-bold text-lg text-black dark:text-white tracking-tight">Recrutas</span>
            </div>

            {/* Desktop nav links */}
            <div className="hidden lg:flex items-center gap-1">
              <a href="/pricing"
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                Pricing
              </a>
              <a href="/signup/talent-owner"
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                For Companies
              </a>
            </div>

            {/* Desktop CTAs */}
            <div className="hidden lg:flex items-center gap-3">
              <ThemeToggleButton />
              <Button variant="ghost" size="sm"
                className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
                onClick={() => setLocation('/auth')}>
                Sign In
              </Button>
              <Button size="sm"
                className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 rounded-lg font-medium"
                onClick={() => setShowInstantMatch(true)}>
                Get Started Free
              </Button>
            </div>

            {/* Mobile hamburger */}
            <button className="lg:hidden text-black dark:text-white p-1"
              onClick={() => setMobileMenuOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-20 pb-16 md:pt-28 md:pb-24 lg:pt-36 lg:pb-32 overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-grid-pattern opacity-40 dark:opacity-20 pointer-events-none" />
        {/* Emerald glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/10 dark:bg-emerald-500/5 blur-3xl rounded-full pointer-events-none" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: copy */}
            <div>
              <Badge variant="secondary"
                className="mb-6 px-3 py-1.5 text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-full">
                <Sparkles className="w-3 h-3 mr-1.5" />
                AI agent applies while you sleep
              </Badge>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-black dark:text-white leading-[1.1] tracking-tight mb-6">
                Job Search,<br />
                <span className="text-emerald-500">Reinvented.</span>
              </h1>

              <p className="text-lg md:text-xl text-gray-500 dark:text-gray-400 leading-relaxed mb-8 max-w-lg">
                Recrutas AI matches you to verified roles and applies automatically.
                Every application gets a real response. No more ghosting, no more guessing.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <Button
                  size="lg"
                  className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 rounded-xl text-base font-semibold px-7 h-12"
                  onClick={() => setShowInstantMatch(true)}
                >
                  Find Jobs — It's Free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-xl text-base font-semibold px-7 h-12 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={() => setLocation('/signup/talent-owner')}
                >
                  Post a Job
                </Button>
              </div>

              <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Free for candidates
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> No credit card
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

      {/* ── Stats strip ── */}
      <StatsStrip stats={platformStats} />

      {/* ── How it works ── */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-black dark:text-white mb-3">
              From profile to offer in 3 steps
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg max-w-xl mx-auto">
              Set up once. Let the AI handle the rest.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: "01",
                icon: FileText,
                title: "Upload your resume",
                body: "Our AI parses your skills, experience, and preferences in seconds. One upload, zero forms to fill.",
              },
              {
                step: "02",
                icon: Brain,
                title: "AI matches & applies",
                body: "We match you to verified live roles and auto-apply to your top picks. You'll receive exam-based scores so you know exactly where you stand.",
              },
              {
                step: "03",
                icon: MessageSquare,
                title: "Chat with the team",
                body: "Top scorers unlock direct chat with the hiring manager — no recruiters, no middlemen, no delays.",
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
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features grid ── */}
      <section className="py-20 md:py-28 border-t border-gray-100 dark:border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-black dark:text-white mb-3">
              Everything the job market was missing
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg max-w-xl mx-auto">
              Built for the way hiring actually works today.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: Target,
                title: "Semantic matching",
                body: "Not keyword matching — deep skill and experience understanding that surfaces roles genuinely suited to you.",
              },
              {
                icon: Zap,
                title: "Auto-apply agent",
                body: "The AI applies to Greenhouse and Lever roles on your behalf using your real profile data. You review; it executes.",
              },
              {
                icon: CheckCircle2,
                title: "Every app gets a response",
                body: "We built response accountability into the platform. Recruiters are nudged. Candidates aren't left hanging.",
              },
              {
                icon: TrendingUp,
                title: "Know your score",
                body: "Quick exams rank you against other applicants the same day. You'll know your chances before the recruiter calls.",
              },
              {
                icon: Users,
                title: "Direct recruiter chat",
                body: "Top candidates unlock a direct chat room with the hiring team. Real conversations, faster decisions.",
              },
              {
                icon: Building2,
                title: "Verified live listings",
                body: "We scrape and validate job postings in real time. No ghost jobs, no 6-month-old listings recycled as 'new'.",
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
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── For Companies ── */}
      <section className="py-20 md:py-28 bg-black dark:bg-emerald-950">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <Badge className="mb-6 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 rounded-full px-3 py-1 text-xs font-semibold">
              For Companies
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Hire in days,<br className="hidden md:block" /> not months.
            </h2>
            <p className="text-gray-400 text-lg md:text-xl mb-10 max-w-xl leading-relaxed">
              Post a role and get AI-matched, exam-ranked candidates delivered to your dashboard.
              No recruiters. No agencies. No 20% placement fee.
            </p>

            <div className="grid sm:grid-cols-3 gap-6 mb-12">
              {[
                { stat: "9 days",  label: "Average time to hire" },
                { stat: "94%",     label: "Candidate-to-interview match rate" },
                { stat: "$0",      label: "Per hire — subscription only" },
              ].map(({ stat, label }) => (
                <div key={label} className="bg-white/5 rounded-2xl border border-white/10 p-5">
                  <p className="text-3xl font-black text-white mb-1">{stat}</p>
                  <p className="text-sm text-gray-400">{label}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                className="bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-base font-semibold px-8 h-12"
                onClick={() => setLocation('/signup/talent-owner')}
              >
                Post a Job Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-xl text-base font-semibold px-8 h-12 border-gray-700 text-gray-300 hover:text-white hover:bg-white/10"
                onClick={() => setLocation('/pricing')}
              >
                See Pricing
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <Testimonials />

      {/* ── Final CTA ── */}
      <section className="py-24 md:py-32 text-center">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl">
          <h2 className="text-3xl md:text-5xl font-bold text-black dark:text-white mb-4 leading-tight">
            Ready to stop guessing?
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-lg mb-10">
            Join thousands of candidates who found their next role with Recrutas.
            Free to start. No resume spam. Real results.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 rounded-xl text-base font-semibold px-8 h-12"
              onClick={() => setShowInstantMatch(true)}
            >
              Find Jobs — It's Free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-xl text-base font-semibold px-8 h-12 border-gray-300 dark:border-gray-700"
              onClick={() => setLocation('/signup/talent-owner')}
            >
              Post a Job
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
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
                AI-powered hiring that connects the right candidates with the right roles — fast.
              </p>
            </div>

            {/* Product */}
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">Product</p>
              <ul className="space-y-3">
                {[
                  { label: "Find Jobs",     href: "/auth" },
                  { label: "Post a Job",    href: "/signup/talent-owner" },
                  { label: "AI Matching",   href: "/#features" },
                  { label: "Pricing",       href: "/pricing" },
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
                  { label: "Community",  href: "https://www.reddit.com/r/recrutas/", external: true },
                  { label: "Privacy",    href: "/privacy" },
                  { label: "Terms",      href: "/terms" },
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
                className="w-full bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 rounded-lg text-sm mb-2"
                onClick={() => setShowInstantMatch(true)}
              >
                Find Jobs Free
              </Button>
              <Button
                variant="outline"
                className="w-full rounded-lg text-sm border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                onClick={() => setLocation('/signup/talent-owner')}
              >
                Post a Job
              </Button>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} Recrutas. All rights reserved.
            </p>
            <p className="text-sm text-gray-400">
              Built with AI. Backed by transparency.
            </p>
          </div>
        </div>
      </footer>

      {/* ── Instant Match Modal ── */}
      <InstantMatchModal
        isOpen={showInstantMatch}
        onClose={() => setShowInstantMatch(false)}
        onStartMatching={handleStartMatching}
        initialSkills=""
      />
    </div>
  );
}
