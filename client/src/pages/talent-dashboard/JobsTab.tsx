import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Users, Briefcase, MapPin, DollarSign, Filter,
  Search, Eye, Clock, Edit, Trash2, Building2
} from "lucide-react";
import type { JobPosting, TabName } from "./types";

interface JobsTabProps {
  jobs: JobPosting[];
  jobsLoading: boolean;
  filteredJobs: JobPosting[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterStatus: string;
  setFilterStatus: (s: string) => void;
  setSelectedJob: (job: JobPosting | null) => void;
  setJobForm: (fn: (prev: any) => any) => void;
  setShowJobDialog: (open: boolean) => void;
  setShowJobWizard: (open: boolean) => void;
  setJobToDelete: (job: JobPosting | null) => void;
  setActiveTab: (tab: TabName) => void;
}

export default function JobsTab({
  jobs,
  jobsLoading,
  filteredJobs,
  searchQuery,
  setSearchQuery,
  filterStatus,
  setFilterStatus,
  setSelectedJob,
  setJobForm,
  setShowJobDialog,
  setShowJobWizard,
  setJobToDelete,
  setActiveTab,
}: JobsTabProps) {
  return (
    <div className="space-y-6">
      {/* Jobs Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Job Postings</h2>
          <p className="text-gray-500 dark:text-gray-400">Manage your job listings and track applications</p>
        </div>
        <Button
          onClick={() => setShowJobWizard(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Post New Job
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <Input
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Jobs List */}
      <div className="space-y-4">
        {jobsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse bg-white dark:bg-gray-800 shadow-md">
                <CardContent className="p-6">
                  <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
                  <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <Card className="bg-white dark:bg-gray-800 shadow-md">
            <CardContent className="p-12 text-center">
              <Briefcase className="mx-auto h-12 w-12 text-gray-500 dark:text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchQuery || filterStatus !== 'all' ? 'No jobs found' : 'No job postings yet'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                {searchQuery || filterStatus !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Create your first job posting to start finding great candidates'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredJobs.map((job) => (
            <Card key={job.id} className="bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{job.title}</h3>
                      <Badge variant={job.status === 'active' ? 'default' : 'secondary'}>
                        {job.status}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                      <span className="flex items-center">
                        <Building2 className="h-4 w-4 mr-1" />
                        {job.company}
                      </span>
                      <span className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        {job.location}
                      </span>
                      {(job.salaryMin || job.salaryMax) && (
                        <span className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-1" />
                          {job.salaryMin && job.salaryMax
                            ? `${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()}`
                            : job.salaryMin
                              ? `From ${job.salaryMin.toLocaleString()}`
                              : `Up to ${job.salaryMax?.toLocaleString()}`
                          }
                        </span>
                      )}
                    </div>

                    <p className="text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                      {job.description}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {job.skills?.slice(0, 3).map((skill, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      )) || []}
                      {job.skills && job.skills.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{job.skills.length - 3} more
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center">
                        <Eye className="h-4 w-4 mr-1" />
                        {job.viewCount} views
                      </span>
                      <span className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {job.applicationCount} applications
                      </span>
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {new Date(job.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex lg:flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 lg:flex-none"
                      onClick={() => {
                        setSelectedJob(job);
                        setActiveTab('candidates');
                      }}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      View Applicants
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 lg:flex-none"
                      onClick={() => {
                        setSelectedJob(job);
                        setJobForm((prev: any) => ({
                          ...prev,
                          title: job.title,
                          company: job.company,
                          description: job.description,
                          requirements: job.requirements,
                          skills: job.skills,
                          location: job.location,
                          salaryMin: job.salaryMin?.toString() || "",
                          salaryMax: job.salaryMax?.toString() || "",
                          workType: job.workType,
                        }));
                        setShowJobDialog(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 lg:flex-none text-red-600 hover:text-red-700"
                      onClick={() => setJobToDelete(job)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
