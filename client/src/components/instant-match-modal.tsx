import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Briefcase, MapPin, DollarSign, Clock, ArrowRight, Sparkles, X } from "lucide-react";
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
    match: "94%"
  },
  {
    id: 2,
    title: "Product Designer",
    company: "DesignLab",
    location: "San Francisco, CA",
    salary: "$100k - $130k",
    type: "Full-time",
    skills: ["Figma", "UI/UX", "Prototyping"],
    match: "89%"
  },
  {
    id: 3,
    title: "Data Scientist",
    company: "DataFlow",
    location: "New York, NY",
    salary: "$130k - $160k",
    type: "Full-time",
    skills: ["Python", "Machine Learning", "SQL"],
    match: "87%"
  }
];

export default function InstantMatchModal({ isOpen, onClose, onStartMatching }: InstantMatchModalProps) {
  const [step, setStep] = useState<'intro' | 'skills' | 'results'>('intro');
  const [skills, setSkills] = useState('');
  const [showTyping, setShowTyping] = useState(false);

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

  const handleGetStarted = () => {
    onStartMatching();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-hidden p-0 border-0 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30 dark:from-gray-900 dark:via-blue-950/30 dark:to-indigo-950/30">
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
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    🎉 Found {SAMPLE_JOBS.length} Perfect Matches!
                  </h3>
                  {showTyping && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400"
                    >
                      <Brain className="w-4 h-4 animate-pulse" />
                      <span className="text-sm">AI analyzing your profile...</span>
                    </motion.div>
                  )}
                </div>

                <div className="grid gap-4 max-h-96 overflow-y-auto">
                  {SAMPLE_JOBS.map((job, index) => (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-gray-900 dark:text-white">{job.title}</h4>
                                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  {job.match} match
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300 mb-2">
                                <div className="flex items-center gap-1">
                                  <Briefcase className="w-4 h-4" />
                                  {job.company}
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  {job.location}
                                </div>
                                <div className="flex items-center gap-1">
                                  <DollarSign className="w-4 h-4" />
                                  {job.salary}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {job.skills.map((skill) => (
                                  <Badge key={skill} variant="outline" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-6 text-center">
                  <Button
                    size="lg"
                    className="px-8 py-4 text-lg font-medium bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl shadow-lg"
                    onClick={handleGetStarted}
                  >
                    Get Full Access - See All Matches
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Join 8+ professionals already using Recrutas
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