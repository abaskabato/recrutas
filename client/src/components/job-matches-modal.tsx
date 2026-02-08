import { useState } from "react";
import { useLocation as useWouterLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Briefcase, MapPin, DollarSign, Search, Sparkles, X,
  Building, ExternalLink, Filter, ChevronDown, ChevronUp,
  Heart, Bookmark, Send, Lock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface JobResult {
  id: number;
  title: string;
  company: string;
  location: string;
  workType: string;
  salaryMin?: number;
  salaryMax?: number;
  skills: string[];
  matchScore?: number;
  externalUrl?: string;
  source?: string;
}

interface JobMatchesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Sample job data for demonstration (in production this would come from API)
const sampleJobs: JobResult[] = [
  {
    id: 1,
    title: "Senior Software Engineer",
    company: "TechCorp Inc",
    location: "San Francisco, CA",
    workType: "remote",
    salaryMin: 150000,
    salaryMax: 200000,
    skills: ["React", "TypeScript", "Node.js"],
    matchScore: 92,
    source: "Direct"
  },
  {
    id: 2,
    title: "Full Stack Developer",
    company: "StartupXYZ",
    location: "New York, NY",
    workType: "hybrid",
    salaryMin: 120000,
    salaryMax: 160000,
    skills: ["Python", "Django", "React"],
    matchScore: 85,
    source: "LinkedIn"
  },
  {
    id: 3,
    title: "Frontend Developer",
    company: "DesignHub",
    location: "Austin, TX",
    workType: "onsite",
    salaryMin: 100000,
    salaryMax: 140000,
    skills: ["Vue.js", "CSS", "JavaScript"],
    matchScore: 78,
    source: "Indeed"
  },
  {
    id: 4,
    title: "Backend Engineer",
    company: "DataFlow Systems",
    location: "Seattle, WA",
    workType: "remote",
    salaryMin: 140000,
    salaryMax: 180000,
    skills: ["Go", "PostgreSQL", "Kubernetes"],
    matchScore: 88,
    source: "Direct"
  },
];

export default function JobMatchesModal({ isOpen, onClose }: JobMatchesModalProps) {
  const [, navigate] = useWouterLocation();
  // Search/Filter state
  const [skills, setSkills] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [workType, setWorkType] = useState<string>("");
  const [salaryRange, setSalaryRange] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<JobResult[]>([]);

  const handleSearch = () => {
    setIsSearching(true);
    // Simulate API call
    setTimeout(() => {
      // Filter sample jobs based on criteria
      let filtered = [...sampleJobs];

      if (role) {
        filtered = filtered.filter(job =>
          job.title.toLowerCase().includes(role.toLowerCase())
        );
      }

      if (skills) {
        const skillList = skills.split(",").map(s => s.trim().toLowerCase());
        filtered = filtered.filter(job =>
          job.skills.some(s => skillList.some(sk => s.toLowerCase().includes(sk)))
        );
      }

      if (location) {
        filtered = filtered.filter(job =>
          job.location.toLowerCase().includes(location.toLowerCase())
        );
      }

      if (workType) {
        filtered = filtered.filter(job => job.workType === workType);
      }

      if (salaryRange) {
        const [min] = salaryRange.split("-").map(Number);
        filtered = filtered.filter(job => (job.salaryMin || 0) >= min);
      }

      setResults(filtered.length > 0 ? filtered : sampleJobs);
      setHasSearched(true);
      setIsSearching(false);
    }, 800);
  };

  const handleSignUpPrompt = (action: string) => {
    navigate(`/auth?action=${action}&redirect=candidate-dashboard`);
  };

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return "Competitive";
    if (!max) return `$${(min! / 1000).toFixed(0)}k+`;
    if (!min) return `Up to $${(max / 1000).toFixed(0)}k`;
    return `$${(min / 1000).toFixed(0)}k - $${(max / 1000).toFixed(0)}k`;
  };

  const resetSearch = () => {
    setSkills("");
    setRole("");
    setLocation("");
    setWorkType("");
    setSalaryRange("");
    setHasSearched(false);
    setResults([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-hidden p-0">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            Find Your Perfect Job Match
          </DialogTitle>
          <p className="text-sm text-gray-500 mt-1">
            Tell us what you're looking for and we'll find the best matches
          </p>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Search Form */}
          <div className="p-4 sm:p-6 space-y-4 border-b bg-gray-50 dark:bg-gray-900/50">
            {/* Main Search Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="role" className="text-sm font-medium">Job Title / Role</Label>
                <Input
                  id="role"
                  placeholder="e.g. Software Engineer, Designer"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="h-10 sm:h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skills" className="text-sm font-medium">Skills</Label>
                <Input
                  id="skills"
                  placeholder="e.g. React, Python, SQL"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  className="h-10 sm:h-11"
                />
              </div>
            </div>

            {/* Toggle Filters Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-0 h-auto"
            >
              <Filter className="h-4 w-4 mr-1" />
              {showFilters ? "Hide" : "Show"} Filters
              {showFilters ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
            </Button>

            {/* Additional Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 overflow-hidden"
                >
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Location</Label>
                    <Input
                      placeholder="City or Remote"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Work Type</Label>
                    <Select value={workType} onValueChange={setWorkType}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="remote">Remote</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                        <SelectItem value="onsite">On-site</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Salary Range</Label>
                    <Select value={salaryRange} onValueChange={setSalaryRange}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="50000-80000">$50k - $80k</SelectItem>
                        <SelectItem value="80000-120000">$80k - $120k</SelectItem>
                        <SelectItem value="120000-160000">$120k - $160k</SelectItem>
                        <SelectItem value="160000-999999">$160k+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Search Button */}
            <div className="flex gap-2">
              <Button
                onClick={handleSearch}
                className="flex-1 sm:flex-none h-10 sm:h-11 bg-blue-600 hover:bg-blue-700"
                disabled={isSearching}
              >
                {isSearching ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                {isSearching ? "Searching..." : "Find Jobs"}
              </Button>
              {hasSearched && (
                <Button variant="outline" onClick={resetSearch} className="h-10 sm:h-11">
                  <X className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Clear</span>
                </Button>
              )}
            </div>
          </div>

          {/* Results Section */}
          <div className="p-4 sm:p-6">
            {!hasSearched ? (
              <div className="text-center py-8 sm:py-12">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Search className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold mb-2">Start Your Job Search</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  Enter your desired role and skills above to discover jobs that match your profile
                </p>
              </div>
            ) : isSearching ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-sm text-gray-500">Finding your perfect matches...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold text-gray-900 dark:text-white">{results.length}</span> jobs found
                  </p>
                </div>

                {/* Job Results */}
                <div className="space-y-3">
                  {results.map((job, index) => (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            {/* Job Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate">
                                    {job.title}
                                  </h3>
                                  <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 mt-0.5">
                                    <Building className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span className="text-sm truncate">{job.company}</span>
                                    {job.source && (
                                      <Badge variant="outline" className="text-xs ml-1 flex-shrink-0">
                                        {job.source}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                {job.matchScore && (
                                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 flex-shrink-0">
                                    {job.matchScore}% match
                                  </Badge>
                                )}
                              </div>

                              {/* Job Details */}
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs sm:text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" />
                                  {job.location}
                                </span>
                                <span className="flex items-center gap-1">
                                  <DollarSign className="h-3.5 w-3.5" />
                                  {formatSalary(job.salaryMin, job.salaryMax)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Briefcase className="h-3.5 w-3.5" />
                                  <span className="capitalize">{job.workType}</span>
                                </span>
                              </div>

                              {/* Skills */}
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {(job.skills || []).slice(0, 3).map((skill) => (
                                  <Badge key={skill} variant="secondary" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                                {(job.skills || []).length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{job.skills.length - 3}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex sm:flex-col gap-2 sm:min-w-[100px]">
                              <Button
                                size="sm"
                                className="flex-1 sm:w-full bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm"
                                onClick={() => handleSignUpPrompt('apply')}
                              >
                                <Send className="h-3.5 w-3.5 mr-1" />
                                Apply
                              </Button>
                              <div className="flex gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 sm:flex-none"
                                  onClick={() => handleSignUpPrompt('save')}
                                  title="Save job"
                                >
                                  <Bookmark className="h-3.5 w-3.5" />
                                </Button>
                                {job.externalUrl && (
                                  <Button variant="outline" size="sm" asChild className="flex-1 sm:flex-none">
                                    <a href={job.externalUrl} target="_blank" rel="noopener noreferrer" title="View original">
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {/* Sign Up CTA */}
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                        <Lock className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          Want to see more matches?
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Sign up to get personalized AI-powered job recommendations, track applications, and connect with recruiters.
                        </p>
                      </div>
                      <Button
                        className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                        onClick={() => handleSignUpPrompt('signup')}
                      >
                        Sign Up Free
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 pt-0 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
