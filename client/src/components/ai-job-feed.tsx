import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Building, Filter, ExternalLink, Briefcase } from "lucide-react";

interface AIJobMatch {
  id: number;
  job: {
    id: number;
    title: string;
    company: string;
    location: string;
    workType: string;
    salaryMin: number;
    salaryMax: number;
    description: string;
    requirements: string[];
    skills: string[];
    aiCurated: boolean;
    confidenceScore: number;
    externalSource?: string;
    externalUrl?: string;
  };
  matchScore: string;
  confidenceLevel: number;
  skillMatches: string[];
  aiExplanation: string;
  status: string;
  createdAt: string;
}

export default function AIJobFeed() {
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [workTypeFilter, setWorkTypeFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");

  const { data: rawMatches, isLoading } = useQuery<AIJobMatch[]>({
    queryKey: ['/api/ai-matches'],
    queryFn: async () => {
      const response = await apiRequest("GET", '/api/ai-matches');
      return response.json();
    },
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  const aiMatches = rawMatches || [];

  const filteredMatches = useMemo(() => {
    return aiMatches.filter((match: AIJobMatch) => {
      const job = match.job;
      const matchesSearch = !searchTerm ||
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.company.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesLocation = locationFilter === "all" ||
        job.location.toLowerCase().includes(locationFilter.toLowerCase());

      const matchesCompany = companyFilter === "all" ||
        job.company.toLowerCase().includes(companyFilter.toLowerCase());

      const matchesWorkType = workTypeFilter === "all" ||
        job.workType?.toLowerCase() === workTypeFilter.toLowerCase();

      return matchesSearch && matchesLocation && matchesCompany && matchesWorkType;
    });
  }, [aiMatches, searchTerm, locationFilter, companyFilter, workTypeFilter]);

  const locations = useMemo(() => [...new Set(aiMatches.map(m => m.job.location).filter(Boolean))], [aiMatches]);
  const companies = useMemo(() => [...new Set(aiMatches.map(m => m.job.company).filter(Boolean))], [aiMatches]);
  const workTypes = useMemo(() => [...new Set(aiMatches.map(m => m.job.workType).filter(Boolean))], [aiMatches]);


  // Actions - simplified and direct
  const handleJobView = (match: AIJobMatch) => {
    if (match.job.externalUrl) {
      window.open(match.job.externalUrl, '_blank');
    }
  };

  const handleQuickApply = (match: AIJobMatch) => {
    if (match.job.externalUrl) {
      window.open(match.job.externalUrl, '_blank');
    }
  };

  // Clear filter functions
  const clearFilters = () => {
    setSearchTerm("");
    setLocationFilter("all");
    setWorkTypeFilter("all");
    setCompanyFilter("all");
  };

  return (
    <div className="space-y-4">
      {/* Instant Filters - No confirmation needed */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search jobs, companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.slice(0, 10).map((location: string) => (
                <SelectItem key={location} value={location}>{location}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={workTypeFilter} onValueChange={setWorkTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Work Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {workTypes.map((type: string) => (
                <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.slice(0, 15).map((company: string) => (
                  <SelectItem key={company} value={company}>{company}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {(searchTerm || locationFilter !== "all" || workTypeFilter !== "all" || companyFilter !== "all") && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear
              </Button>
            )}
          </div>
        </div>
        
        <div className="mt-3 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>{filteredMatches.length} jobs found</span>
          <span>Updated every 5 minutes</span>
        </div>
      </div>

      {/* Job Feed - Clean and minimal */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-white dark:bg-gray-800 rounded-lg p-4 border">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border">
          <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No jobs match your filters</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Try adjusting your search criteria</p>
          <Button variant="outline" onClick={clearFilters}>Clear All Filters</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMatches.map((match) => (
            <Card key={match.id} className="hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-150 cursor-pointer" onClick={() => handleJobView(match)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg truncate">{match.job.title}</h3>
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {match.matchScore}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                      <div className="flex items-center gap-1">
                        <Building className="h-4 w-4" />
                        <span className="font-medium">{match.job.company}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{match.job.location}</span>
                      </div>
                      {match.job.workType && (
                        <Badge variant="outline" className="capitalize text-xs">
                          {match.job.workType}
                        </Badge>
                      )}
                    </div>

                    {match.skillMatches.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {match.skillMatches.slice(0, 4).map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-300">
                            {skill}
                          </Badge>
                        ))}
                        {match.skillMatches.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{match.skillMatches.length - 4} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <Button 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickApply(match);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Apply
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJobView(match);
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {match.job.externalSource && (
                  <div className="flex items-center justify-between pt-3 border-t">
                    <span className="text-xs text-gray-500">
                      Source: {match.job.externalSource}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <Briefcase className="h-3 w-3" />
                      Direct from company
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
