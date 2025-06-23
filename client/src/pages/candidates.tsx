import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  Search, 
  Filter, 
  MapPin, 
  Briefcase, 
  Star, 
  Clock, 
  MessageSquare,
  Eye,
  ChevronRight,
  Building2,
  GraduationCap,
  Target,
  Award,
  Loader2
} from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

export default function CandidatesPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [skillsFilter, setSkillsFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [experienceFilter, setExperienceFilter] = useState("all");

  // Fetch all candidate profiles
  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ['/api/candidates'],
    enabled: !!user?.id,
  });

  // Filter candidates based on search criteria
  const filteredCandidates = candidates.filter((candidate: any) => {
    const matchesSearch = searchQuery === "" || 
      candidate.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSkills = skillsFilter === "" ||
      candidate.candidateProfile?.skills?.some((skill: string) => 
        skill.toLowerCase().includes(skillsFilter.toLowerCase())
      );
    
    const matchesLocation = locationFilter === "" ||
      candidate.candidateProfile?.location?.toLowerCase().includes(locationFilter.toLowerCase());
    
    const matchesExperience = experienceFilter === "all" ||
      candidate.candidateProfile?.experience === experienceFilter;

    return matchesSearch && matchesSkills && matchesLocation && matchesExperience;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Link href="/" className="flex items-center">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-2 rounded-lg font-bold text-lg">
                    Recrutas
                  </div>
                </Link>
                <span className="ml-4 text-gray-600">Browse Candidates</span>
              </div>
              <Link href="/talent-dashboard">
                <Button variant="outline">Back to Dashboard</Button>
              </Link>
            </div>
          </div>
        </header>

        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-2 rounded-lg font-bold text-lg">
                  Recrutas
                </div>
              </Link>
              <span className="ml-4 text-gray-600">Browse Candidates</span>
            </div>
            <Link href="/talent-dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Users className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Browse Candidates</h1>
              <p className="text-gray-600">Discover talented professionals for your team</p>
            </div>
          </div>
          
          <div className="flex items-center text-sm text-gray-600">
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full mr-2">
              {filteredCandidates.length} candidates found
            </span>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search candidates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Input
                placeholder="Filter by skills..."
                value={skillsFilter}
                onChange={(e) => setSkillsFilter(e.target.value)}
              />
              
              <Input
                placeholder="Filter by location..."
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              />
              
              <Select value={experienceFilter} onValueChange={setExperienceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Experience level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Experience</SelectItem>
                  <SelectItem value="entry">Entry Level</SelectItem>
                  <SelectItem value="mid">Mid Level</SelectItem>
                  <SelectItem value="senior">Senior Level</SelectItem>
                  <SelectItem value="lead">Lead/Principal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Candidates Grid */}
        {filteredCandidates.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No candidates found</h3>
              <p className="text-gray-600">
                Try adjusting your search criteria to find more candidates.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCandidates.map((candidate: any) => (
              <Card key={candidate.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                        {candidate.firstName?.[0]}{candidate.lastName?.[0]}
                      </div>
                      <div className="ml-3">
                        <h3 className="font-semibold text-gray-900">
                          {candidate.firstName} {candidate.lastName}
                        </h3>
                        <p className="text-sm text-gray-600">{candidate.email}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      Available
                    </Badge>
                  </div>

                  {candidate.candidateProfile && (
                    <div className="space-y-3">
                      {candidate.candidateProfile.summary && (
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {candidate.candidateProfile.summary}
                        </p>
                      )}
                      
                      <div className="flex items-center text-sm text-gray-600">
                        <Briefcase className="h-4 w-4 mr-1" />
                        <span>{candidate.candidateProfile.experience || 'Experience not specified'}</span>
                      </div>
                      
                      {candidate.candidateProfile.location && (
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>{candidate.candidateProfile.location}</span>
                        </div>
                      )}
                      
                      {candidate.candidateProfile.workType && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Building2 className="h-4 w-4 mr-1" />
                          <span className="capitalize">{candidate.candidateProfile.workType}</span>
                        </div>
                      )}

                      {candidate.candidateProfile.skills && candidate.candidateProfile.skills.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-900">Skills:</p>
                          <div className="flex flex-wrap gap-1">
                            {candidate.candidateProfile.skills.slice(0, 3).map((skill: string, index: number) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                            {candidate.candidateProfile.skills.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{candidate.candidateProfile.skills.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t">
                        <div className="flex items-center text-xs text-gray-500">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>
                            Joined {formatDistanceToNow(new Date(candidate.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Contact
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}