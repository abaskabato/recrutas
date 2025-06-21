import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Briefcase, MapPin, DollarSign, Clock, ArrowRight, Sparkles, X, MessageCircle, Eye, Heart, Zap, TrendingUp, Users, Star, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface InstantMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartMatching: () => void;
}

const SAMPLE_JOBS = [
  {
    id: 1,
    title: "Senior Frontend Developer",
    company: "TechCorp",
    location: "Remote",
    salary: "$120k - $150k",
    type: "Full-time",
    skills: ["React", "TypeScript", "Next.js"],
    match: "94%",
    aiInsights: "Perfect match for your React expertise. Company culture focuses on innovation.",
    applications: 23,
    views: 45,
    chatActive: true,
    applicationStatus: "pending"
  },
  {
    id: 2,
    title: "Product Designer",
    company: "DesignLab",
    location: "San Francisco, CA",
    salary: "$100k - $130k",
    type: "Full-time",
    skills: ["Figma", "UI/UX", "Prototyping"],
    match: "89%",
    aiInsights: "Strong design portfolio alignment. Remote-first company with flexible hours.",
    applications: 18,
    views: 32,
    chatActive: false,
    applicationStatus: "not_applied"
  },
  {
    id: 3,
    title: "Data Scientist",
    company: "DataFlow",
    location: "New York, NY",
    salary: "$130k - $160k",
    type: "Full-time",
    skills: ["Python", "Machine Learning", "SQL"],
    match: "87%",
    aiInsights: "Your ML background fits perfectly. Fast-growing startup with equity options.",
    applications: 31,
    views: 67,
    chatActive: true,
    applicationStatus: "viewed"
  }
];

export default function InstantMatchModal({ isOpen, onClose, onStartMatching }: InstantMatchModalProps) {
  const [step, setStep] = useState<'intro' | 'skills' | 'results' | 'features'>('intro');
  const [skills, setSkills] = useState('');
  const [showTyping, setShowTyping] = useState(false);
  const [appliedJobs, setAppliedJobs] = useState<number[]>([]);
  const [likedJobs, setLikedJobs] = useState<number[]>([]);
  const [activeChat, setActiveChat] = useState<number | null>(null);

  useEffect(() => {
    if (step === 'results') {
      setShowTyping(true);
      const timer = setTimeout(() => setShowTyping(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleSkillsSubmit = () => {
    if (skills.trim()) {
      setStep('results');
    }
  };

  const handleQuickApply = (jobId: number) => {
    setAppliedJobs(prev => [...prev, jobId]);
  };

  const handleLikeJob = (jobId: number) => {
    setLikedJobs(prev => 
      prev.includes(jobId) 
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
  };

  const handleStartChat = (jobId: number) => {
    setActiveChat(jobId);
  };

  const handleViewFeatures = () => {
    setStep('features');
  };

  const handleGetStarted = () => {
    onStartMatching();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-full max-h-[90vh] overflow-hidden p-0 border-0 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30 dark:from-gray-900 dark:via-blue-950/30 dark:to-indigo-950/30">
        <DialogTitle className="sr-only">Instant Job Matching</DialogTitle>
        <DialogDescription className="sr-only">Find your perfect job match in 30 seconds with AI-powered recommendations</DialogDescription>
        <div className="relative">
          {/* Close button */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 z-10 rounded-full"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>

          <AnimatePresence mode="wait">
            {step === 'intro' && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-8 text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  Find Your Perfect Job in 30 Seconds
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
                  Our AI analyzes thousands of jobs to find perfect matches for your skills. 
                  Let's see what opportunities are waiting for you.
                </p>
                <Button
                  size="lg"
                  className="px-8 py-4 text-lg font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg"
                  onClick={() => setStep('skills')}
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Start Instant Matching
                </Button>
              </motion.div>
            )}

            {step === 'skills' && (
              <motion.div
                key="skills"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8"
              >
                <div className="max-w-2xl mx-auto">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">
                    What are your key skills?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">
                    Type your skills separated by commas (e.g., React, Python, Marketing)
                  </p>
                  
                  <div className="space-y-4">
                    <Input
                      placeholder="React, TypeScript, Node.js, Product Management..."
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                      className="text-lg p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                      onKeyPress={(e) => e.key === 'Enter' && handleSkillsSubmit()}
                      autoFocus
                    />
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {['React', 'Python', 'Design', 'Marketing', 'Sales', 'Data Science'].map((skill) => (
                        <Badge
                          key={skill}
                          variant="secondary"
                          className="cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900"
                          onClick={() => {
                            if (!skills.includes(skill)) {
                              setSkills(prev => prev ? `${prev}, ${skill}` : skill);
                            }
                          }}
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>

                    <Button
                      size="lg"
                      className="w-full py-4 text-lg font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl"
                      onClick={handleSkillsSubmit}
                      disabled={!skills.trim()}
                    >
                      Find My Matches
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'results' && (
              <motion.div
                key="results"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8"
              >
                <div className="text-center mb-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-xl mb-4"
                  >
                    <Sparkles className="w-8 h-8 text-white" />
                  </motion.div>
                  <h3 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                    Perfect Matches Found!
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {SAMPLE_JOBS.length} AI-curated roles matching "{skills}"
                  </p>
                  {showTyping && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 mt-2"
                    >
                      <Brain className="w-4 h-4 animate-pulse" />
                      <span className="text-sm">AI analyzing compatibility...</span>
                    </motion.div>
                  )}
                </div>

                <div className="grid gap-4 max-h-96 overflow-y-auto">
                  {SAMPLE_JOBS.map((job, index) => (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 + 0.3 }}
                    >
                      <Card className="hover:shadow-xl transition-all duration-300 border-l-4 border-l-blue-500 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="text-xl font-semibold text-gray-900 dark:text-white">{job.title}</h4>
                                <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 text-sm px-3 py-1">
                                  {job.match}
                                </Badge>
                                {job.chatActive && (
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                    <MessageCircle className="w-3 h-3 mr-1" />
                                    Live
                                  </Badge>
                                )}
                              </div>
                              <p className="text-gray-600 dark:text-gray-300 font-medium mb-3">{job.company}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                            <div className="flex items-center text-gray-600 dark:text-gray-300">
                              <MapPin className="w-4 h-4 mr-2" />
                              {job.location}
                            </div>
                            <div className="flex items-center text-gray-600 dark:text-gray-300">
                              <DollarSign className="w-4 h-4 mr-2" />
                              {job.salary}
                            </div>
                            <div className="flex items-center text-gray-600 dark:text-gray-300">
                              <Users className="w-4 h-4 mr-2" />
                              {job.applications} applied
                            </div>
                            <div className="flex items-center text-gray-600 dark:text-gray-300">
                              <Eye className="w-4 h-4 mr-2" />
                              {job.views} views
                            </div>
                          </div>

                          {/* AI Insights */}
                          <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                            <div className="flex items-start space-x-2">
                              <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-purple-800 dark:text-purple-300 mb-1">AI Insight</p>
                                <p className="text-xs text-purple-700 dark:text-purple-400">{job.aiInsights}</p>
                              </div>
                            </div>
                          </div>

                          <div className="mb-4">
                            <div className="flex flex-wrap gap-1">
                              {job.skills.map((skill) => (
                                <Badge key={skill} variant="secondary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              onClick={() => handleQuickApply(job.id)}
                              disabled={appliedJobs.includes(job.id)}
                              className={`flex-1 ${
                                appliedJobs.includes(job.id) 
                                  ? 'bg-green-600 hover:bg-green-700' 
                                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                              } text-white border-0`}
                            >
                              {appliedJobs.includes(job.id) ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                  Applied
                                </>
                              ) : (
                                <>
                                  <Zap className="w-4 h-4 mr-2" />
                                  One-Tap Apply
                                </>
                              )}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleLikeJob(job.id)}
                              className={`${likedJobs.includes(job.id) ? 'bg-red-50 border-red-200 text-red-600' : ''}`}
                            >
                              <Heart className={`w-4 h-4 ${likedJobs.includes(job.id) ? 'fill-current' : ''}`} />
                            </Button>
                            <Button size="sm" variant="outline">
                              View Details
                            </Button>
                          </div>

                          {/* Simple application feedback */}
                          {appliedJobs.includes(job.id) && (
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700"
                            >
                              <div className="flex items-center space-x-2">
                                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                                <span className="text-sm text-green-800 dark:text-green-300 font-medium">
                                  Application submitted! Get full access to track status.
                                </span>
                              </div>
                            </motion.div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                <div className="flex space-x-3 mt-6">
                  <Button 
                    onClick={handleViewFeatures}
                    variant="outline"
                    className="flex-1 py-3 text-sm font-medium"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    See All Features
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1 px-8 py-3 text-lg font-medium bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl shadow-lg"
                    onClick={handleGetStarted}
                  >
                    Get Full Access
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 text-center">
                  Join 8+ professionals already using Recrutas
                </p>
              </motion.div>
            )}

            {step === 'features' && (
              <motion.div
                key="features"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8"
              >
                <div className="text-center mb-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-xl mb-4"
                  >
                    <Star className="w-8 h-8 text-white" />
                  </motion.div>
                  <h3 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                    Full Platform Features
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Everything you need for your job search journey
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-700"
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <h4 className="font-semibold text-gray-900 dark:text-white">Real-Time Chat</h4>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Direct messaging with recruiters and hiring managers. Get instant responses and schedule interviews on the spot.
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-700"
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <h4 className="font-semibold text-gray-900 dark:text-white">Application Tracking</h4>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Monitor every application with real-time status updates, interview schedules, and feedback from employers.
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-700"
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <h4 className="font-semibold text-gray-900 dark:text-white">AI Job Recommendations</h4>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Advanced AI analyzes your profile and suggests perfect matches based on skills, experience, and career goals.
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="p-4 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg border border-orange-200 dark:border-orange-700"
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <Zap className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                      <h4 className="font-semibold text-gray-900 dark:text-white">One-Tap Applications</h4>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Apply to jobs instantly with your pre-filled profile. No more repetitive forms or lengthy application processes.
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="p-4 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-lg border border-teal-200 dark:border-teal-700"
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <Users className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                      <h4 className="font-semibold text-gray-900 dark:text-white">Profile Analytics</h4>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      See who viewed your profile, track application success rates, and get insights to improve your job search.
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="p-4 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700"
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      <h4 className="font-semibold text-gray-900 dark:text-white">Smart Notifications</h4>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Get notified instantly when new matching jobs are posted or when recruiters show interest in your profile.
                    </p>
                  </motion.div>
                </div>

                <div className="mt-6 text-center">
                  <Button
                    size="lg"
                    className="px-8 py-4 text-lg font-medium bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl shadow-lg"
                    onClick={handleGetStarted}
                  >
                    Start Your Job Search Journey
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                    Free to join • Premium features available
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}