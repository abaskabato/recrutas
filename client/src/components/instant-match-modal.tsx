import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Briefcase, MapPin, DollarSign, Clock, ArrowRight, Sparkles, X, MessageCircle, Eye, Heart, Zap, TrendingUp, Users, Star, CheckCircle2, Loader2, Send, Building, Upload, FileText, CheckCircle } from "lucide-react";
import RecrutasLogo from "@/components/recrutas-logo";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

interface InstantMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartMatching: () => void;
  initialSkills?: string;
}

// Removed sample data - using only authentic external job sources

export default function InstantMatchModal({ isOpen, onClose, onStartMatching, initialSkills = "" }: InstantMatchModalProps) {
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
    // Redirect to signup for premium feature
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
      <DialogContent className="max-w-6xl w-full max-h-[95vh] p-0 border-0 bg-gradient-to-br from-white/95 via-blue-50/90 to-indigo-100/95 dark:from-gray-900/95 dark:via-blue-950/90 dark:to-indigo-950/95 backdrop-blur-2xl shadow-2xl flex flex-col">
        <DialogTitle className="sr-only">Instant Job Matching</DialogTitle>
        <DialogDescription className="sr-only">Find your perfect job match in 30 seconds with AI-powered recommendations</DialogDescription>
        
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/20 to-cyan-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
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
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  Welcome to Recrutas
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
                  Find real jobs, talk to real people, and get hired—on your terms
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
                <div className="max-w-3xl mx-auto">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">
                    Find Your Perfect Match
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">
                    Tell us what you're looking for
                  </p>
                  
                  <div className="space-y-6">
                    {/* Job Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <Briefcase className="w-4 h-4 inline mr-1" />
                        Job Title / Role
                      </label>
                      <Input
                        placeholder="Software Engineer, Data Scientist, Product Manager..."
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        className="text-lg p-4 rounded-xl border-2"
                        autoFocus
                      />
                      <div className="flex flex-wrap gap-2 mt-2">
                        {['Software Engineer', 'Data Scientist', 'Product Manager', 'Designer', 'Marketing Manager', 'Sales Rep'].map((role: string) => (
                          <Badge
                            key={role}
                            variant="secondary"
                            className="cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900"
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
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Skills & Technologies
                      </label>
                      
                      {/* Resume Upload Option */}
                      <div className="mb-4 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                        <div className="text-center">
                          <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
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
                              className="flex items-center gap-2"
                            >
                              {resumeUploading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Upload className="w-4 h-4" />
                              )}
                              {resumeUploading ? 'Processing...' : 'Upload Resume'}
                            </Button>
                          ) : (
                            <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-sm">Resume processed successfully</span>
                            </div>
                          )}
                          
                          {resumeFile && (
                            <p className="text-xs text-gray-500 mt-2">
                              {resumeFile.name}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Manual Skills Input */}
                      <Input
                        placeholder="React, Python, Marketing... or upload resume above"
                        value={skills}
                        onChange={(e) => setSkills(e.target.value)}
                        className="text-lg p-4 rounded-xl border-2"
                      />
                      
                      {/* Extracted Skills Display */}
                      {extractedSkills.length > 0 && (
                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                            Skills extracted from resume:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {extractedSkills.map((skill: string) => (
                              <Badge
                                key={skill}
                                variant="secondary"
                                className="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200"
                              >
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-2 mt-2">
                        {['React', 'Python', 'Design', 'Marketing', 'Sales', 'Data Science'].map((skill: string) => (
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
                    </div>

                    {/* Filters Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Location */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <MapPin className="w-4 h-4 inline mr-1" />
                          Location
                        </label>
                        <Input
                          placeholder="New York, Remote..."
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          className="p-3 rounded-lg"
                        />
                      </div>

                      {/* Work Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <Briefcase className="w-4 h-4 inline mr-1" />
                          Work Type
                        </label>
                        <select
                          value={workType}
                          onChange={(e) => setWorkType(e.target.value as any)}
                          className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                        >
                          <option value="any">Any</option>
                          <option value="remote">Remote</option>
                          <option value="hybrid">Hybrid</option>
                          <option value="onsite">On-site</option>
                        </select>
                      </div>

                      {/* Salary */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <DollarSign className="w-4 h-4 inline mr-1" />
                          Min Salary
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={salaryType}
                            onChange={(e) => setSalaryType(e.target.value as any)}
                            className="p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                          >
                            <option value="annual">Annual</option>
                            <option value="hourly">Hourly</option>
                          </select>
                          <Input
                            placeholder={salaryType === 'hourly' ? '$25' : '$50k'}
                            value={minSalary}
                            onChange={(e) => setMinSalary(e.target.value)}
                            className="p-3 rounded-lg flex-1"
                          />
                        </div>
                      </div>
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
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                    {jobsLoading ? "Finding Matches..." : `${jobsToShow.length} Jobs Found`}
                  </h3>
                  {jobsLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 mt-2"
                    >
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Searching...</span>
                    </motion.div>
                  )}
                </div>

                <div className="grid gap-4 max-h-96 overflow-y-auto">
                  {jobsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                  ) : jobsToShow.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600 dark:text-gray-300">
                        No jobs found matching "{skills}". Try different skills.
                      </p>
                    </div>
                  ) : (
                    jobsToShow.map((job: any, index: number) => (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 + 0.3 }}
                    >
                      <Card className="group hover:shadow-2xl transition-all duration-500 border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl hover:bg-white/80 dark:hover:bg-gray-800/80 hover:scale-[1.02] relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 via-purple-500 to-cyan-500 transform scale-y-0 group-hover:scale-y-100 transition-transform duration-500 origin-top"></div>
                        
                        <CardContent className="p-6 relative z-10">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <h4 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors duration-300">{job.title}</h4>
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: index * 0.1 + 0.5, type: "spring", bounce: 0.5 }}
                                >
                                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 text-sm px-3 py-1 shadow-lg">
                                    <Star className="w-3 h-3 mr-1" />
                                    {job.match}
                                  </Badge>
                                </motion.div>
                                {job.chatActive && (
                                  <motion.div
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                  >
                                    <Badge variant="secondary" className="bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 dark:from-blue-900 dark:to-cyan-900 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                                      <motion.div
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ duration: 1, repeat: Infinity }}
                                      >
                                        <MessageCircle className="w-3 h-3 mr-1" />
                                      </motion.div>
                                      Live Chat
                                    </Badge>
                                  </motion.div>
                                )}
                              </div>
                              <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 + 0.4 }}
                              >
                                <p className="text-gray-700 dark:text-gray-300 font-semibold mb-3 flex items-center">
                                  <Building className="w-4 h-4 mr-2 text-gray-500" />
                                  {job.company}
                                </p>
                              </motion.div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 mb-4 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-1" />
                              {job.location}
                            </div>
                            <div className="flex items-center">
                              <DollarSign className="w-4 h-4 mr-1" />
                              {job.salary}
                            </div>
                            <div className="flex items-center">
                              <Briefcase className="w-4 h-4 mr-1" />
                              {job.type}
                            </div>
                          </div>



                          <div className="mb-4">
                            <div className="flex flex-wrap gap-1">
                              {(job.skills || []).map((skill: string) => (
                                <Badge key={skill} variant="secondary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => handleQuickApply(job.id)}
                              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0"
                            >
                              <Zap className="w-4 h-4 mr-2" />
                              Apply Direct
                            </Button>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleStartChat(job.id)}
                                className="flex-1 sm:flex-none bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                              >
                                <MessageCircle className="w-4 h-4 mr-1 sm:mr-2" />
                                <span className="hidden sm:inline">Message</span>
                                <span className="sm:hidden">Chat</span>
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleLikeJob(job.id)}
                                className={`${likedJobs.includes(job.id) ? 'bg-red-50 border-red-200 text-red-600' : ''}`}
                              >
                                <Heart className={`w-4 h-4 ${likedJobs.includes(job.id) ? 'fill-current' : ''}`} />
                              </Button>
                            </div>
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
                                  Marked as applied! Get full access to track status.
                                </span>
                              </div>
                            </motion.div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <div className="flex gap-2 sm:gap-3">
                    <Button 
                      onClick={handleViewFeatures}
                      variant="outline"
                      className="flex-1 sm:flex-none py-3 text-sm font-medium bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg"
                    >
                      <TrendingUp className="w-4 h-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">See All Features</span>
                      <span className="sm:hidden">Features</span>
                    </Button>
                    <Button
                      onClick={onStartMatching}
                      variant="outline"  
                      className="flex-1 sm:flex-none py-3 text-sm font-medium border-blue-200 text-blue-700 hover:bg-blue-50 bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg"
                    >
                      <Eye className="w-4 h-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">View My Jobs</span>
                      <span className="sm:hidden">My Jobs</span>
                    </Button>
                  </div>
                  <Button
                    size="lg"
                    className="w-full sm:flex-1 px-6 sm:px-8 py-3 text-base sm:text-lg font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                    onClick={handleGetStarted}
                  >
                    Get Full Access
                    <ArrowRight className="w-4 sm:w-5 h-4 sm:h-5 ml-2" />
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