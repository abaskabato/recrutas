import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Brain, Briefcase, MapPin, DollarSign, Clock, ArrowRight, Sparkles, X, MessageCircle, Eye, Heart, Zap, TrendingUp, Users, Star, CheckCircle2, Loader2, Send, Building, Upload, FileText, CheckCircle } from "lucide-react";
import RecrutasLogo from "@/components/recrutas-logo";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/components/theme-provider";

const JobCard = ({ job, index, onApply, onLike, onChat, isLiked, theme }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 + 0.3 }}
    className={`border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 hover:scale-105 cursor-pointer backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-white/60'}`}
  >
    <div className="flex items-start justify-between">
      <div className="flex items-start space-x-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
          <Building className={`w-6 h-6 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`} />
        </div>
        <div>
          <h4 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{job.job?.title || job.title}</h4>
          <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>{job.job?.company || job.company}</p>
          <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'} mt-1`}>{job.job?.location || job.location || 'Remote'}</p>
        </div>
      </div>
      <div className="text-right">
        <div className="flex items-center justify-end space-x-2">
          <Badge className={`${theme === 'dark' ? 'bg-blue-500/20 text-blue-300 border-blue-400/30' : 'bg-green-100 text-green-700 border-green-200'}`}>
            <Star className="w-3 h-3 mr-1" />
            {job.matchScore || job.match || '90%'}
          </Badge>
          <Button size="icon" variant="ghost" onClick={() => onLike(job.id)}>
            <Heart className={`w-5 h-5 ${isLiked ? 'text-red-500 fill-current' : theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`} />
          </Button>
        </div>
        <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'} mt-2`}>
          {job.job?.salaryMin && job.job?.salaryMax
            ? `${job.job.salaryMin / 1000}k-${job.job.salaryMax / 1000}k`
            : job.salary || '$80k-120k'}
        </p>
      </div>
    </div>
    <div className="mt-4 flex items-center justify-between">
      <div className="flex flex-wrap gap-1">
        {(job.job?.skills || job.skills || []).slice(0, 3).map((skill: string) => (
          <Badge key={skill} variant="secondary" className="text-xs">
            {skill}
          </Badge>
        ))}
      </div>
      <div className="flex items-center space-x-2">
        <Button size="sm" variant="outline" onClick={() => onChat(job.id)}>
          <MessageCircle className="w-4 h-4 mr-1" />
          Chat
        </Button>
        <Button size="sm" onClick={() => onApply(job.id)}>
          <Zap className="w-4 h-4 mr-1" />
          Apply
        </Button>
      </div>
    </div>
  </motion.div>
);

const JobCardSkeleton = ({ theme }) => (
  <div className={`border-slate-700/50 rounded-2xl p-6 shadow-lg ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-white/60'}`}>
    <div className="flex items-start justify-between">
      <div className="flex items-start space-x-4">
        <div className={`w-12 h-12 rounded-lg animate-pulse ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-200'}`}></div>
        <div className="space-y-2">
          <div className={`w-48 h-4 rounded animate-pulse ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-200'}`}></div>
          <div className={`w-32 h-3 rounded animate-pulse ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-200'}`}></div>
          <div className={`w-24 h-3 rounded animate-pulse mt-1 ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-200'}`}></div>
        </div>
      </div>
      <div className="text-right space-y-2">
        <div className={`w-20 h-6 rounded-full animate-pulse ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-200'}`}></div>
        <div className={`w-24 h-4 rounded animate-pulse ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-200'}`}></div>
      </div>
    </div>
    <div className="mt-4 flex items-center justify-between">
      <div className="flex flex-wrap gap-1">
        <div className={`w-16 h-4 rounded-full animate-pulse ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-200'}`}></div>
        <div className={`w-20 h-4 rounded-full animate-pulse ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-200'}`}></div>
        <div className={`w-12 h-4 rounded-full animate-pulse ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-200'}`}></div>
      </div>
      <div className="flex items-center space-x-2">
        <div className={`w-20 h-8 rounded-lg animate-pulse ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-200'}`}></div>
        <div className={`w-20 h-8 rounded-lg animate-pulse ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-200'}`}></div>
      </div>
    </div>
  </div>
);

interface InstantMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartMatching: () => void;
  initialSkills?: string;
}

// Removed sample data - using only authentic external job sources

export default function InstantMatchModal({ isOpen, onClose, onStartMatching, initialSkills = "" }: InstantMatchModalProps) {
  const { theme } = useTheme();
  const [step, setStep] = useState<'intro' | 'skills' | 'results' | 'features'>('intro');
  const [skills, setSkills] = useState(initialSkills);
  const [jobTitle, setJobTitle] = useState("");
  const [location, setLocation] = useState("");
  const [salaryType, setSalaryType] = useState<'hourly' | 'annual'>('annual');
  const [minSalary, setMinSalary] = useState("");
  const [workType, setWorkType] = useState<'remote' | 'hybrid' | 'onsite' | 'any'>('any');
  const [showTyping, setShowTyping] = useState(false);
  const [appliedJobs, setAppliedJobs] = useState<number[]>([]);
  const [likedJobs, setLikedJobs] = useState<number[]>([]);
  const [activeChat, setActiveChat] = useState<number | null>(null);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<Record<number, Array<{sender: string, message: string}>>>({});
  const [newMessage, setNewMessage] = useState("");
  
  // Resume upload state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch external jobs based on skills and filters
  const { data: externalJobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ['/api/external-jobs', skills, jobTitle, location, workType, salaryType, minSalary],
    queryFn: async () => {
      const params = new URLSearchParams({
        skills: skills.trim(),
        limit: '8'
      });
      if (jobTitle.trim()) params.append('jobTitle', jobTitle.trim());
      if (location.trim()) params.append('location', location.trim());
      if (workType !== 'any') params.append('workType', workType);
      if (minSalary.trim()) params.append('minSalary', minSalary.trim());
      if (salaryType) params.append('salaryType', salaryType);
      
      const response = await fetch(`/api/external-jobs?${params}`);
      if (!response.ok) throw new Error('Failed to fetch jobs');
      return response.json();
    },
    enabled: step === 'results' && !!skills.trim(),
    retry: 2,
  });

  const jobsToShow = externalJobsData?.jobs || [];

  useEffect(() => {
    if (step === 'results') {
      setShowTyping(true);
      const timer = setTimeout(() => setShowTyping(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleResumeUpload = async (file: File) => {
    setResumeUploading(true);
    const formData = new FormData();
    formData.append('resume', file);

    try {
      const response = await fetch('/api/resume/parse', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setExtractedSkills(result.skills || []);
        setSkills(result.skills?.join(', ') || skills);
        setResumeUploaded(true);
      }
    } catch (error) {
      console.error('Resume upload failed:', error);
    } finally {
      setResumeUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.type === 'application/pdf' || file.type.includes('word'))) {
      setResumeFile(file);
      handleResumeUpload(file);
    }
  };

  const handleSkillsSubmit = () => {
    if (skills.trim()) {
      setStep('results');
    }
  };

  const handleQuickApply = (jobId: number) => {
    // Find the job details and store them for continuation after auth
    const job = jobsToShow.find((j: any) => j.id === jobId);
    if (job) {
      // Store job information in localStorage for continuation after login
      localStorage.setItem('continuationJob', JSON.stringify({
        id: job.id,
        jobData: job.job,
        source: job.source,
        externalUrl: job.externalUrl,
        matchScore: job.matchScore,
        timestamp: Date.now(),
        action: 'apply' // What the user wanted to do
      }));
      
      // Also store in session storage as backup
      sessionStorage.setItem('pendingJobApplication', JSON.stringify({
        jobId: job.id,
        title: job.job.title,
        company: job.job.company,
        action: 'apply'
      }));
    }
    
    // Redirect to signup/login
    onStartMatching();
    onClose();
  };

  const handleLikeJob = (jobId: number) => {
    setLikedJobs(prev => 
      prev.includes(jobId) 
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
  };

  const handleStartChat = (jobId: number) => {
    // Redirect to signup for premium feature
    onStartMatching();
    onClose();
  };

  const handleViewDetails = (job: any) => {
    setSelectedJob(job);
  };

  const handleCloseDetails = () => {
    setSelectedJob(null);
  };

  const handleSendMessage = (jobId: number, message: string) => {
    setChatMessages(prev => ({
      ...prev,
      [jobId]: [
        ...(prev[jobId] || []),
        { sender: 'candidate', message },
      ]
    }));
    setNewMessage("");
    
    // Simulate recruiter response after 2 seconds
    setTimeout(() => {
      setChatMessages(prev => ({
        ...prev,
        [jobId]: [
          ...(prev[jobId] || []),
          { sender: 'recruiter', message: 'Thanks for your message! Our team will review your profile and get back to you within 24 hours.' }
        ]
      }));
    }, 2000);
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
      <DialogContent className={`p-0 border-0 ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'} backdrop-blur-2xl shadow-2xl flex flex-col max-h-screen`}>
        <DialogTitle className="sr-only">Instant Job Matching</DialogTitle>
        <DialogDescription className="sr-only">Find your perfect job match in 30 seconds with AI-powered recommendations</DialogDescription>
        
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/10 to-purple-600/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/10 to-cyan-600/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-purple-400/10 to-pink-600/10 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>



        {/* Scrollable content container */}
        <div className="flex-1 overflow-y-auto scrollbar-hide relative z-10">
          <div className="relative p-8 pb-0">
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-center"
            >



            </motion.div>
          </div>

          <AnimatePresence mode="wait">
            {step === 'intro' && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-8 text-center"
              >
                <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>
                  Welcome to Recrutas
                </h2>
                <p className={`text-lg ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'} mb-8 max-w-2xl mx-auto`}>
                  Find real jobs, talk to real people, and get hired—on your terms
                </p>
                <Button
                  size="lg"
                  className={`px-8 py-4 text-lg font-medium text-white rounded-xl shadow-lg ${theme === 'dark' ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}
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
                <div className="max-w-3xl mx-auto">
                  <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2 text-center`}>
                    Find Your Perfect Match
                  </h3>
                  <p className={`${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'} mb-6 text-center`}>
                    Tell us what you're looking for
                  </p>
                  
                  <div className="space-y-6">
                    {/* Job Title */}
                    <div>
                      <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'} mb-2`}>
                        Job Title / Role
                      </label>
                      <Input
                        placeholder="Software Engineer, Data Scientist, Product Manager..."
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        className={`text-lg p-4 rounded-xl border-2 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                        autoFocus
                      />
                      <div className="flex flex-wrap gap-2 mt-2">
                        {['Software Engineer', 'Data Scientist', 'Product Manager', 'Designer', 'Marketing Manager', 'Sales Rep'].map((role: string) => (
                          <Badge
                            key={role}
                            variant="secondary"
                            className={`cursor-pointer ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-700/50' : 'bg-gray-100 border-gray-200 text-gray-800 hover:bg-gray-200'}`}
                            onClick={() => {
                              if (!jobTitle.includes(role)) {
                                setJobTitle(role);
                              }
                            }}
                          >
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Skills and Resume Upload */}
                    <div>
                      <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'} mb-2`}>
                        Skills & Technologies
                      </label>
                      
                      {/* Resume Upload Option */}
                      <div className={`mb-4 p-4 border-2 border-dashed rounded-xl ${theme === 'dark' ? 'border-slate-700/50 bg-slate-800/50' : 'border-gray-300 bg-gray-50'}`}>
                        <div className="text-center">
                          <FileText className={`w-8 h-8 mx-auto mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`} />
                          <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'} mb-3`}>
                            Upload your resume for automatic skill extraction
                          </p>
                          
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                          
                          {!resumeUploaded ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={resumeUploading}
                              className={`flex items-center gap-2 ${theme === 'dark' ? 'bg-slate-700/50 border-slate-600/50 text-white hover:bg-slate-600/50' : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-100'}`}
                            >
                              {resumeUploading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Upload className="w-4 h-4" />
                              )}
                              {resumeUploading ? 'Processing...' : 'Upload Resume'}
                            </Button>
                          ) : (
                            <div className={`flex items-center justify-center gap-2 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-sm">Resume processed successfully</span>
                            </div>
                          )}
                          
                          {resumeFile && (
                            <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'} mt-2`}>
                              {resumeFile.name}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Extracted Skills Display */}
                      {extractedSkills.length > 0 && (
                        <div className={`mt-3 p-3 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-blue-50'}`}>
                          <p className={`text-sm ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'} mb-2`}>
                            Skills extracted from resume:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {extractedSkills.map((skill: string) => (
                              <Badge
                                key={skill}
                                variant="secondary"
                                className={`bg-blue-500/20 text-blue-300 border-blue-400/30 ${theme === 'dark' ? '' : 'bg-blue-100 text-blue-800'}`}
                              >
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="item-1">
                        <AccordionTrigger>Advanced Filters & Manual Entry</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-6 pt-4">
                            {/* Manual Skills Input */}
                            <div>
                                <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'} mb-2`}>
                                  Skills & Technologies (Manual)
                                </label>
                                <Input
                                  placeholder="React, Python, Marketing..."
                                  value={skills}
                                  onChange={(e) => setSkills(e.target.value)}
                                  className={`text-lg p-4 rounded-xl border-2 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                />
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {['React', 'Python', 'Design', 'Marketing', 'Sales', 'Data Science'].map((skill: string) => (
                                    <Badge
                                      key={skill}
                                      variant="secondary"
                                      className={`cursor-pointer ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-700/50' : 'bg-gray-100 border-gray-200 text-gray-800 hover:bg-gray-200'}`}
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
                            </div>

                            {/* Filters Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {/* Location */}
                              <div>
                                <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'} mb-2`}>
                                  <MapPin className="w-4 h-4 inline mr-1" />
                                  Location
                                </label>
                                <Input
                                  placeholder="New York, Remote..."
                                  value={location}
                                  onChange={(e) => setLocation(e.target.value)}
                                  className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                />
                              </div>

                              {/* Work Type */}
                              <div>
                                <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'} mb-2`}>
                                  <Briefcase className="w-4 h-4 inline mr-1" />
                                  Work Type
                                </label>
                                <select
                                  value={workType}
                                  onChange={(e) => setWorkType(e.target.value as any)}
                                  className={`w-full p-3 rounded-lg border ${theme === 'dark' ? 'border-slate-700/50 bg-slate-800/50 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                                >
                                  <option value="any">Any</option>
                                  <option value="remote">Remote</option>
                                  <option value="hybrid">Hybrid</option>
                                  <option value="onsite">On-site</option>
                                </select>
                              </div>

                              {/* Salary */}
                              <div>
                                <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'} mb-2`}>
                                  <DollarSign className="w-4 h-4 inline mr-1" />
                                  Min Salary
                                </label>
                                <div className="flex gap-2">
                                  <select
                                    value={salaryType}
                                    onChange={(e) => setSalaryType(e.target.value as any)}
                                    className={`p-3 rounded-lg border ${theme === 'dark' ? 'border-slate-700/50 bg-slate-800/50 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                                  >
                                    <option value="annual">Annual</option>
                                    <option value="hourly">Hourly</option>
                                  </select>
                                  <Input
                                    placeholder={salaryType === 'hourly' ? '$25' : '$50k'}
                                    value={minSalary}
                                    onChange={(e) => setMinSalary(e.target.value)}
                                    className={`p-3 rounded-lg flex-1 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    <Button
                      size="lg"
                      className={`w-full py-4 text-lg font-medium text-white rounded-xl ${theme === 'dark' ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}
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
                    <Sparkles className="w-8 h-8 text-primary-foreground" />
                  </motion.div>
                  <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent' : 'text-gray-900'} mb-2`}>
                    {jobsLoading ? "Finding Matches..." : `${jobsToShow.length} Jobs Found`}
                  </h3>
                  {jobsLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`flex items-center justify-center gap-2 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} mt-2`}
                    >
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Searching...</span>
                    </motion.div>
                  )}
                </div>

                <div className="grid gap-4 max-h-96 overflow-y-auto p-1">
                  {jobsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => <JobCardSkeleton key={i} theme={theme} />)
                  ) : jobsToShow.length === 0 ? (
                    <div className="text-center py-8">
<p className={`${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                        No jobs found matching "{skills}". Try different skills.
                      </p>
                    </div>
                  ) : (
                    jobsToShow.map((job: any, index: number) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        index={index}
                        onApply={handleQuickApply}
                        onLike={handleLikeJob}
                        onChat={handleStartChat}
                        isLiked={likedJobs.includes(job.id)}
                        theme={theme}
                      />
                    ))
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <div className="flex gap-2 sm:gap-3">
                    <Button 
                      onClick={handleViewFeatures}
                      variant="outline"
                      className={`flex-1 sm:flex-none py-3 text-sm font-medium backdrop-blur-lg ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    >
                      <TrendingUp className="w-4 h-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">See All Features</span>
                      <span className="sm:hidden">Features</span>
                    </Button>
                    <Button
                      onClick={onStartMatching}
                      variant="outline"  
                      className={`flex-1 sm:flex-none py-3 text-sm font-medium backdrop-blur-lg ${theme === 'dark' ? 'border-blue-500/50 text-blue-300 hover:bg-blue-500/20 bg-slate-800/50' : 'border-blue-500 text-blue-600 hover:bg-blue-100 bg-white'}`}
                    >
                      <Eye className="w-4 h-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">View My Jobs</span>
                      <span className="sm:hidden">My Jobs</span>
                    </Button>
                  </div>
                  <Button
                    size="lg"
                    className={`w-full sm:flex-1 px-6 sm:px-8 py-3 text-base sm:text-lg font-semibold text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ${theme === 'dark' ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                    onClick={handleGetStarted}
                  >
                    Get Full Access
                    <ArrowRight className="w-4 sm:w-5 h-4 sm:h-5 ml-2" />
                  </Button>
                </div>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'} mt-3 text-center`}>
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
                    <Star className="w-8 h-8 text-primary-foreground" />
                  </motion.div>
                  <h3 className={`text-3xl font-bold ${theme === 'dark' ? 'bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent' : 'text-gray-900'} mb-2`}>
                    Full Platform Features
                  </h3>
                  <p className={`${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                    Everything you need for your job search journey
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-gray-200'}`}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <h4 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Real-Time Chat</h4>
                    </div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                      Direct messaging with recruiters and hiring managers. Get instant responses and schedule interviews on the spot.
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-gray-200'}`}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <h4 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Application Tracking</h4>
                    </div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                      Monitor every application with real-time status updates, interview schedules, and feedback from employers.
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-gray-200'}`}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <h4 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>AI Job Recommendations</h4>
                    </div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                      Advanced AI analyzes your profile and suggests perfect matches based on skills, experience, and career goals.
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-gray-200'}`}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <Zap className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                      <h4 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>One-Tap Applications</h4>
                    </div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                      Apply to jobs instantly with your pre-filled profile. No more repetitive forms or lengthy application processes.
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-gray-200'}`}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <Users className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                      <h4 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Profile Analytics</h4>
                    </div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                      See who viewed your profile, track application success rates, and get insights to improve your job search.
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-gray-200'}`}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      <h4 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Smart Notifications</h4>
                    </div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                      Get notified instantly when new matching jobs are posted or when recruiters show interest in your profile.
                    </p>
                  </motion.div>
                </div>

                <div className="mt-6 text-center">
                  <Button
                    size="lg"
                    className={`px-8 py-4 text-lg font-medium text-white rounded-xl shadow-lg ${theme === 'dark' ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                    onClick={handleGetStarted}
                  >
                    Start Your Job Search Journey
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'} mt-3`}>
                    Free to join • Premium features available
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>

      {/* Job Details Modal */}
      {selectedJob && (
        <Dialog open={!!selectedJob} onOpenChange={handleCloseDetails}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-3">
                <Building className="w-6 h-6 text-blue-600" />
                <div>
                  <h3 className="text-xl font-bold">{selectedJob.title}</h3>
                  <p className="text-gray-600 font-medium">{selectedJob.company}</p>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">{selectedJob.location}</span>
                </div>
                {selectedJob.salaryMin && (
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">${selectedJob.salaryMin?.toLocaleString()} - ${selectedJob.salaryMax?.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">{selectedJob.workType}</span>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Job Description</h4>
                <p className="text-gray-700 leading-relaxed">{selectedJob.description}</p>
              </div>

              {selectedJob.skills && selectedJob.skills.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Required Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {(selectedJob.skills || []).map((skill: string, index: number) => (
                      <Badge key={index} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <Button 
                  onClick={() => handleQuickApply(selectedJob.id)}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Sign Up to Apply
                </Button>
                <Button 
                  onClick={() => handleStartChat(selectedJob.id)}
                  variant="outline"
                  className="flex-1 bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Sign Up to Chat
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Chat Interface */}
      {activeChat && (
        <Dialog open={!!activeChat} onOpenChange={() => setActiveChat(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <MessageCircle className="w-5 h-5 text-blue-600" />
                <span>Chat with Recruiter</span>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="h-64 bg-gray-50 dark:bg-gray-900 rounded-lg p-4 overflow-y-auto">
                {chatMessages[activeChat]?.map((msg, index) => (
                  <div key={index} className={`mb-3 ${msg.sender === 'candidate' ? 'text-right' : 'text-left'}`}>
                    <div className={`inline-block p-2 rounded-lg max-w-[80%] ${
                      msg.sender === 'candidate' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                    }`}>
                      <p className="text-sm">{msg.message}</p>
                    </div>
                  </div>
                )) || (
                  <div className="text-center text-gray-500 mt-8">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Start a conversation with the recruiter</p>
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 min-h-[60px]"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (newMessage.trim()) {
                        handleSendMessage(activeChat, newMessage.trim());
                      }
                    }
                  }}
                />
                <Button
                  onClick={() => newMessage.trim() && handleSendMessage(activeChat, newMessage.trim())}
                  disabled={!newMessage.trim()}
                  size="sm"
                  className="self-end"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}