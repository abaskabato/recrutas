import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Brain, MapPin, ArrowRight, Sparkles,
  MessageCircle, Zap, Star, Building,
  ChevronRight, ArrowLeft, TrendingUp, Shield,
} from "lucide-react";
import SmartLogo from '@/components/smart-logo';
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/components/theme-provider";

// ─── Job Card ────────────────────────────────────────────────────────────────

const JobCard = ({
  job, index, onApply, theme,
}: { job: any; index: number; onApply: (id: number) => void; theme: string }) => {
  const title    = job.title    ?? job.job?.title    ?? '';
  const company  = job.company  ?? job.job?.company  ?? '';
  const location = job.location ?? job.job?.location ?? 'Remote';
  const salaryMin = job.salaryMin ?? job.job?.salaryMin;
  const salaryMax = job.salaryMax ?? job.job?.salaryMax;
  const skills   = (job.skills  ?? job.job?.skills  ?? []).slice(0, 3) as string[];
  const initial  = company.charAt(0).toUpperCase() || '?';
  const isDark   = theme === 'dark';

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.3 }}
      className={`relative rounded-2xl border p-4 transition-all duration-200 ${
        isDark
          ? 'bg-slate-800/70 border-slate-700/60 hover:border-indigo-500/50'
          : 'bg-white border-gray-100 hover:border-indigo-200 shadow-sm hover:shadow-md'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Company avatar */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-sm shadow-sm">
          {initial !== '?' ? initial : <Building className="w-5 h-5" />}
        </div>

        <div className="flex-1 min-w-0">
          {/* Title + match badge */}
          <div className="flex items-start justify-between gap-2">
            <h4 className={`font-semibold text-sm leading-snug truncate ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              {title}
            </h4>
            <Badge className="shrink-0 text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30 px-1.5 py-0">
              <Star className="w-2.5 h-2.5 mr-0.5 fill-current" />
              Match
            </Badge>
          </div>

          {/* Company + location */}
          <p className={`text-xs mt-0.5 truncate ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {company}
            {location ? ` · ${location}` : ''}
          </p>

          {/* Salary */}
          {salaryMin && salaryMax && (
            <p className={`text-xs font-semibold mt-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
              ${(salaryMin / 1000).toFixed(0)}k – ${(salaryMax / 1000).toFixed(0)}k / yr
            </p>
          )}

          {/* Skill chips */}
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {skills.map((s) => (
                <span key={s} className={`text-[10px] px-2 py-0.5 rounded-full ${
                  isDark ? 'bg-slate-700/80 text-slate-300' : 'bg-gray-100 text-gray-600'
                }`}>
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Apply CTA */}
      <div className="mt-3 flex justify-end">
        <Button
          size="sm"
          onClick={() => onApply(job.id)}
          className="h-7 text-xs bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0 shadow-sm"
        >
          <Zap className="w-3 h-3 mr-1" />
          Quick Apply
        </Button>
      </div>
    </motion.div>
  );
};

// ─── Skeleton Card ────────────────────────────────────────────────────────────

const JobCardSkeleton = ({ theme }: { theme: string }) => {
  const isDark = theme === 'dark';
  return (
    <div className={`rounded-2xl border p-4 ${
      isDark ? 'bg-slate-800/70 border-slate-700/60' : 'bg-white border-gray-100 shadow-sm'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl animate-pulse ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
        <div className="flex-1 space-y-2">
          <div className={`h-4 w-3/4 rounded animate-pulse ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
          <div className={`h-3 w-1/2 rounded animate-pulse ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
          <div className="flex gap-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`h-5 w-12 rounded-full animate-pulse ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STATS = [
  { value: '50K+', label: 'Live Jobs' },
  { value: '< 2 min', label: 'Avg Reply' },
  { value: '0 Ghost', label: 'No Ghosting' },
];

const ROLE_SUGGESTIONS = [
  'Software Engineer',
  'Product Manager',
  'Data Scientist',
  'Designer',
  'Marketing',
];

const EMPTY_STATE_FEATURES = [
  { icon: Brain,         text: 'Personalized AI matches every day' },
  { icon: MessageCircle, text: 'Direct chat with recruiters' },
  { icon: TrendingUp,    text: 'Track all your applications' },
  { icon: Shield,        text: 'Verified employers only' },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface InstantMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartMatching: () => void;
  initialSkills?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function InstantMatchModal({
  isOpen,
  onClose,
  onStartMatching,
  initialSkills = "",
}: InstantMatchModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [step, setStep]         = useState<'intro' | 'skills' | 'results'>('intro');
  const [jobTitle, setJobTitle] = useState("");
  const [location, setLocation] = useState("");
  const [workType, setWorkType] = useState<'remote' | 'hybrid' | 'onsite' | 'any'>('any');

  // Reset modal state each time it opens so returning visitors start fresh
  useEffect(() => {
    if (isOpen) {
      setStep('intro');
      setJobTitle("");
      setLocation("");
      setWorkType('any');
    }
  }, [isOpen]);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const { data: externalJobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ['/api/external-jobs', initialSkills, jobTitle, location, workType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (initialSkills.trim()) params.append('skills', initialSkills.trim());
      if (jobTitle.trim())      params.append('jobTitle', jobTitle.trim());
      if (location.trim())      params.append('location', location.trim());
      if (workType !== 'any')   params.append('workType', workType);

      const response = await fetch(`/api/external-jobs?${params}`);
      if (!response.ok) throw new Error('Failed to fetch jobs');
      return response.json();
    },
    enabled: step === 'results' && !!jobTitle.trim(),
    staleTime: 60_000,
    retry: 1,
  });

  // Limit display to 8 cards — the server returns up to 200 filtered rows
  const jobsToShow: any[] = (externalJobsData?.jobs ?? []).slice(0, 8);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSkillsSubmit = () => {
    if (jobTitle.trim()) setStep('results');
  };

  const handleBack = () => {
    if (step === 'skills')  setStep('intro');
    if (step === 'results') setStep('skills');
  };

  const handleQuickApply = (jobId: number) => {
    const job = jobsToShow.find((j: any) => j.id === jobId);
    if (job) {
      localStorage.setItem('continuationJob', JSON.stringify({
        id: job.id,
        jobData: job.job ?? job,
        source: job.source,
        externalUrl: job.externalUrl,
        timestamp: Date.now(),
        action: 'apply',
      }));
      sessionStorage.setItem('pendingJobApplication', JSON.stringify({
        jobId: job.id,
        title: job.title ?? job.job?.title,
        company: job.company ?? job.job?.company,
        action: 'apply',
      }));
    }
    onStartMatching();
    onClose();
  };

  const handleGetStarted = () => {
    onStartMatching();
    onClose();
  };

  // ── Progress steps (skills + results) ─────────────────────────────────────

  const STEPS = ['skills', 'results'] as const;
  const stepIndex = STEPS.indexOf(step as any);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`p-0 border-0 flex flex-col overflow-hidden shadow-2xl max-w-2xl w-[95vw] max-h-[90vh] rounded-3xl ${
        isDark ? 'bg-slate-900' : 'bg-gray-50'
      }`}>
        <DialogTitle className="sr-only">Instant Job Matching · Recrutas</DialogTitle>
        <DialogDescription className="sr-only">
          Find your next role in seconds with AI-powered job matching
        </DialogDescription>

        {/* Ambient background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl">
          <div className="absolute -top-28 -right-28 w-64 h-64 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-28 -left-28 w-64 h-64 bg-gradient-to-tr from-blue-500/15 to-cyan-500/15 rounded-full blur-3xl" />
        </div>

        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <div className={`relative z-10 flex items-center px-5 pt-5 pb-3 ${
          step !== 'intro' ? 'justify-between' : 'justify-center'
        }`}>
          {step !== 'intro' && (
            <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8 -ml-1">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <SmartLogo size={26} showText />
          {/* Spacer to keep logo centred when back button is shown */}
          {step !== 'intro' && <div className="w-8" />}
        </div>

        {/* ── Progress dots ────────────────────────────────────────────────── */}
        {step !== 'intro' && (
          <div className="relative z-10 flex justify-center gap-2 pb-1">
            {STEPS.map((s, i) => (
              <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${
                i < stepIndex
                  ? 'w-4 bg-indigo-400'
                  : i === stepIndex
                    ? 'w-6 bg-indigo-600'
                    : isDark ? 'w-3 bg-slate-700' : 'w-3 bg-gray-300'
              }`} />
            ))}
          </div>
        )}

        {/* ── Scrollable body ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto relative z-10">
          <AnimatePresence mode="wait">

            {/* ════════ INTRO ════════ */}
            {step === 'intro' && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="px-6 pb-8 pt-2 flex flex-col items-center text-center"
              >
                {/* AI pill badge — preserved for E2E */}
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium mb-5 ${
                  isDark
                    ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                }`}>
                  <Sparkles className="w-3.5 h-3.5" />
                  AI-Powered Job Matching
                </div>

                {/* Headline — "Careers, Humanized." preserved for E2E */}
                <h1 className={`text-3xl sm:text-4xl font-extrabold leading-tight mb-3 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  Careers,{' '}
                  <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                    Humanized.
                  </span>
                  <br />
                  <span className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                    Matched in seconds.
                  </span>
                </h1>

                <p className={`text-sm sm:text-base max-w-sm mb-7 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  Tell us what you're after. Our AI surfaces real jobs from top companies and connects you directly with hiring managers — same day.
                </p>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 w-full max-w-xs mb-7">
                  {STATS.map((s) => (
                    <div key={s.label} className={`rounded-2xl px-2 py-3 text-center ${
                      isDark ? 'bg-slate-800/70' : 'bg-white shadow-sm border border-gray-100'
                    }`}>
                      <p className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 leading-none">
                        {s.value}
                      </p>
                      <p className={`text-[10px] mt-1 leading-tight ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {s.label}
                      </p>
                    </div>
                  ))}
                </div>

                {/* CTA — "Start Matching Now" preserved for E2E */}
                <Button
                  size="lg"
                  className="w-full sm:w-auto px-8 py-5 text-base font-semibold text-white rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:scale-[1.02]"
                  onClick={() => setStep('skills')}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Start Matching Now
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>

                <p className={`text-xs mt-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  Free · No CV required · 30 seconds
                </p>
              </motion.div>
            )}

            {/* ════════ SKILLS (search form) ════════ */}
            {step === 'skills' && (
              <motion.div
                key="skills"
                initial={{ opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -28 }}
                className="px-6 pb-6 pt-3"
              >
                {/* Heading — preserved for E2E */}
                <div className="text-center mb-6">
                  <h2 className={`text-2xl sm:text-3xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    What role are you looking for?
                  </h2>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    We'll find the best matches for you
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Job title — placeholder preserved for E2E */}
                  <div>
                    <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${
                      isDark ? 'text-slate-400' : 'text-gray-500'
                    }`}>
                      Job Title <span className="text-indigo-500">*</span>
                    </label>
                    <Input
                      placeholder="e.g. Software Engineer, Product Manager..."
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSkillsSubmit()}
                      className={`h-12 text-sm rounded-xl border-2 focus-visible:ring-0 focus:border-indigo-500 transition-colors ${
                        isDark
                          ? 'bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500'
                          : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-400'
                      }`}
                      autoFocus
                    />
                    {/* Quick-select role chips — texts preserved for E2E */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {ROLE_SUGGESTIONS.map((role) => (
                        <button
                          key={role}
                          onClick={() => setJobTitle(role)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                            jobTitle === role
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : isDark
                                ? 'border-slate-700 text-slate-400 hover:border-indigo-500 hover:text-indigo-300'
                                : 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 bg-white'
                          }`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${
                      isDark ? 'text-slate-400' : 'text-gray-500'
                    }`}>
                      <MapPin className="w-3 h-3 inline mr-1" />
                      Location (optional)
                    </label>
                    <Input
                      placeholder="City, Country, or Remote"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSkillsSubmit()}
                      className={`h-11 text-sm rounded-xl border-2 focus-visible:ring-0 focus:border-indigo-500 transition-colors ${
                        isDark
                          ? 'bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500'
                          : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-400'
                      }`}
                    />
                  </div>

                  {/* Work type toggle */}
                  <div>
                    <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${
                      isDark ? 'text-slate-400' : 'text-gray-500'
                    }`}>
                      Work Type
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {([
                        { value: 'any',    label: 'Any' },
                        { value: 'remote', label: 'Remote' },
                        { value: 'hybrid', label: 'Hybrid' },
                        { value: 'onsite', label: 'On-site' },
                      ] as const).map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setWorkType(opt.value)}
                          className={`py-2.5 text-xs font-medium rounded-xl border-2 transition-all ${
                            workType === opt.value
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500'
                              : isDark
                                ? 'border-slate-700 text-slate-400 hover:border-slate-600'
                                : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Submit — "Find My Matches" preserved for E2E */}
                  <Button
                    size="lg"
                    className="w-full h-12 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-md shadow-indigo-500/20"
                    onClick={handleSkillsSubmit}
                    disabled={!jobTitle.trim()}
                  >
                    Find My Matches
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>

                  {/* Validation hint — preserved for E2E */}
                  {!jobTitle.trim() && (
                    <p className={`text-center text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                      Enter a job title to continue
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* ════════ RESULTS ════════ */}
            {step === 'results' && (
              <motion.div
                key="results"
                initial={{ opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -28 }}
                className="px-6 pb-6 pt-3"
              >
                {/* Header — "Jobs Found" preserved for E2E */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {jobsLoading
                        ? 'Searching...'
                        : `${jobsToShow.length} Jobs Found`
                      }
                    </h3>
                    <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      {[jobTitle, location, workType !== 'any' ? workType : '']
                        .filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                </div>

                {/* Job list */}
                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-0.5">
                  {jobsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <JobCardSkeleton key={i} theme={theme} />
                    ))
                  ) : jobsToShow.length === 0 ? (
                    /* ── Empty state → convert to signup ── */
                    <motion.div
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`rounded-2xl p-5 border ${
                        isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-gray-100 shadow-sm'
                      }`}
                    >
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-3 shadow-sm">
                        <Brain className="w-6 h-6 text-white" />
                      </div>
                      <p className={`text-center font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        No cached results yet
                      </p>
                      <p className={`text-center text-xs mb-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        Create a free account and Recrutas will source fresh "{jobTitle}" roles for you daily — no ghosting guaranteed.
                      </p>
                      <div className="space-y-2.5">
                        {EMPTY_STATE_FEATURES.map(({ icon: Icon, text }) => (
                          <div key={text} className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isDark ? 'bg-indigo-500/20' : 'bg-indigo-50'
                            }`}>
                              <Icon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <span className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                              {text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    jobsToShow.map((job: any, i: number) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        index={i}
                        onApply={handleQuickApply}
                        theme={theme}
                      />
                    ))
                  )}
                </div>

                {/* Bottom CTA panel */}
                <div className={`mt-5 p-4 rounded-2xl ${
                  isDark
                    ? 'bg-indigo-500/10 border border-indigo-500/20'
                    : 'bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100'
                }`}>
                  {!jobsLoading && jobsToShow.length > 0 && (
                    <p className={`text-xs mb-3 font-medium ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>
                      <Sparkles className="w-3 h-3 inline mr-1" />
                      Create a free account to apply, chat directly with recruiters, and unlock personalized daily matches.
                    </p>
                  )}
                  <Button
                    size="lg"
                    className="w-full h-11 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md shadow-indigo-500/20 transition-all duration-200"
                    onClick={handleGetStarted}
                  >
                    {jobsToShow.length > 0 ? 'Apply with Recrutas — Free' : "Get Matched — It's Free"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className={`relative z-10 px-6 py-3 border-t text-center ${
          isDark ? 'border-slate-700/40 text-slate-500' : 'border-gray-100 text-gray-400'
        }`}>
          <p className="text-xs">
            Already have an account?{' '}
            <button
              onClick={handleGetStarted}
              className="font-semibold text-indigo-500 hover:text-indigo-600 transition-colors"
            >
              Sign in
            </button>
          </p>
        </div>

      </DialogContent>
    </Dialog>
  );
}
