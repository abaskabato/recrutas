import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { 
  Search, 
  MapPin, 
  Building, 
  DollarSign, 
  Clock, 
  ExternalLink,
  Zap,
  TrendingUp,
  Target,
  Loader2
} from "lucide-react";

interface InstantJob {
  id: string;
  matchScore: string;
  status: string;
  createdAt: string;
  job: {
    id: string;
    title: string;
    company: string;
    location: string;
    description: string;
    skills: string[];
    workType: string;
    salaryMin?: number;
    salaryMax?: number;
  };
  source: string;
  externalUrl: string;
  urgency: 'low' | 'medium' | 'high';
}

export default function InstantJobSearch() {
  const [skills, setSkills] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [location, setLocation] = useState('');
  const [workType, setWorkType] = useState('');
  const [jobs, setJobs] = useState<InstantJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const { toast } = useToast();

  // Add error boundary protection
  if (!toast) {
    return <div>Loading search...</div>;
  }

  const handleInstantSearch = async () => {
    if (!skills.trim() && !jobTitle.trim()) {
      toast({
        title: "Search Required",
        description: "Enter skills or job title to find opportunities",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setSearching(true);

    try {
      const params = new URLSearchParams();
      if (skills) params.append('skills', skills);
      if (jobTitle) params.append('jobTitle', jobTitle);
      if (location) params.append('location', location);
      if (workType) params.append('workType', workType);

      const response = await fetch(`/api/live-jobs?${params}`);
      const data = await response.json();

      if (response.ok) {
        setJobs(data.jobs || []);
        toast({
          title: "Jobs Found",
          description: `Found ${data.count} instant job matches`,
        });
      } else {
        throw new Error(data.message || 'Failed to fetch jobs');
      }
    } catch (error: any) {
      console.error('Instant job search error:', error);
      toast({
        title: "Search Failed",
        description: error.message || "Failed to fetch instant jobs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setTimeout(() => setSearching(false), 1000);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-gray-600';
  };

  // Handle job application - save job for unauthenticated users
  const handleJobApplication = (job: InstantJob) => {
    // Check if user is authenticated
    const isAuthenticated = document.cookie.includes('better-auth.session_token') || 
                           document.cookie.includes('session') ||
                           window.location.pathname.includes('/candidate');
    
    if (!isAuthenticated) {
      // Store job information for continuation after login
      const jobData = {
        id: job.id,
        jobData: job.job,
        source: job.source,
        externalUrl: job.externalUrl,
        matchScore: job.matchScore,
        timestamp: Date.now(),
        action: 'apply'
      };
      
      localStorage.setItem('continuationJob', JSON.stringify(jobData));
      
      // Also store in session storage as backup
      const pendingData = {
        jobId: job.id,
        title: job.job.title,
        company: job.job.company,
        action: 'apply'
      };
      
      sessionStorage.setItem('pendingJobApplication', JSON.stringify(pendingData));

      // Show message and redirect to sign in
      toast({
        title: "Sign In Required",
        description: "Sign in to apply to this job. We'll save your selection!",
      });
      
      // Redirect to root which will show sign in
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
      return;
    }
    
    // If authenticated, open the job directly
    window.open(job.externalUrl, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-2">
          <Zap className="w-8 h-8 text-blue-600" />
          Instant Job Delivery
        </h1>
        <p className="text-gray-600">Real jobs delivered instantly from major companies and job boards</p>
      </div>

      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Find Your Perfect Job
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Skills
              </label>
              <Input
                placeholder="e.g. JavaScript, Python, React"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleInstantSearch()}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Title
              </label>
              <Input
                placeholder="e.g. Software Engineer"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleInstantSearch()}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <Input
                placeholder="e.g. San Francisco, Remote"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleInstantSearch()}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Work Type
              </label>
              <Select value={workType} onValueChange={setWorkType}>
                <SelectTrigger>
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
          </div>
          
          <Button 
            onClick={handleInstantSearch}
            disabled={loading}
            className="w-full md:w-auto"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Get Instant Jobs
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Search Status */}
      {searching && (
        <div className="flex items-center justify-center py-8">
          <div className="text-center space-y-2">
            <div className="animate-pulse flex items-center justify-center gap-2">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              <span className="text-lg font-medium">Finding instant matches...</span>
            </div>
            <p className="text-gray-500">Scanning multiple job sources for you</p>
          </div>
        </div>
      )}

      {/* Results */}
      {jobs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {jobs.length} Instant Matches Found
            </h2>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              Live Results
            </Badge>
          </div>
          
          <div className="grid gap-4">
            {jobs.map((job) => {
              // Safely access job properties with fallbacks
              const jobData = job.job || job;
              const title = jobData.title || 'Unknown Position';
              const company = jobData.company || 'Unknown Company';
              const location = jobData.location || 'Location TBD';
              const urgency = job.urgency || 'medium';
              const matchScore = job.matchScore || '0%';
              
              return (
                <Card key={job.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {title}
                          </h3>
                          <Badge className={getUrgencyColor(urgency)}>
                            {urgency} priority
                          </Badge>
                          <Badge variant="outline" className={getMatchScoreColor(parseInt(matchScore))}>
                            {matchScore} match
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-1">
                            <Building className="w-4 h-4" />
                            <span className="font-medium">{company}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{location}</span>
                          </div>
                        {(jobData.salaryMin || jobData.salaryMax) && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            <span>
                              {jobData.salaryMin && jobData.salaryMax 
                                ? `$${jobData.salaryMin.toLocaleString()} - $${jobData.salaryMax.toLocaleString()}`
                                : jobData.salaryMin 
                                ? `$${jobData.salaryMin.toLocaleString()}+`
                                : `Up to $${jobData.salaryMax?.toLocaleString()}`
                              }
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <p className="text-gray-700 mb-4 line-clamp-2">
                        {jobData.description || 'No description available'}
                      </p>
                      
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-sm font-medium text-gray-700">Skills:</span>
                        <div className="flex flex-wrap gap-2">
                          {(jobData.skills || []).slice(0, 5).map((skill, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {(jobData.skills || []).length > 5 && (
                            <Badge variant="secondary" className="text-xs">
                              +{(jobData.skills || []).length - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>Source: {job.source}</span>
                      <Badge variant="outline" className="text-xs">
                        {jobData.workType || 'Not specified'}
                      </Badge>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Save Job
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleJobApplication(job)}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Apply Now
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* No Results */}
      {!loading && !searching && jobs.length === 0 && (skills || jobTitle) && (
        <Card>
          <CardContent className="text-center py-12">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Jobs Found</h3>
            <p className="text-gray-500 mb-4">
              Try adjusting your search criteria or check back soon for new opportunities
            </p>
            <Button variant="outline" onClick={() => {
              setSkills('');
              setJobTitle('');
              setLocation('');
              setWorkType('');
            }}>
              Clear Search
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}