import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Users, Clock, Target, 
  CalendarDays, DollarSign, Star, Filter, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

interface AnalyticsData {
  overview: {
    totalApplications: number;
    activeJobs: number;
    avgTimeToHire: number;
    offerAcceptanceRate: number;
    topSkills: string[];
    sourceEffectiveness: Array<{
      source: string;
      applications: number;
      hires: number;
      conversionRate: number;
    }>;
  };
  pipeline: Array<{
    stage: string;
    count: number;
    percentage: number;
  }>;
  timeToHire: Array<{
    month: string;
    avgDays: number;
    target: number;
  }>;
  skillsDemand: Array<{
    skill: string;
    demand: number;
    avgSalary: number;
    applications: number;
  }>;
  performanceMetrics: {
    interviewToOfferRate: number;
    candidateExperience: number;
    diversityMetrics: {
      gender: Array<{ name: string; value: number; color: string }>;
      experience: Array<{ level: string; count: number }>;
    };
  };
}

export default function AdvancedAnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState("30d");
  const [selectedJob, setSelectedJob] = useState("all");

  const { data: analytics, isLoading, isError } = useQuery({
    queryKey: ["/api/analytics/advanced", timeRange, selectedJob],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/advanced?timeRange=${timeRange}&jobId=${selectedJob}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      return response.json();
    },
    retry: false,
  });

  const { data: jobs } = useQuery({
    queryKey: ["/api/jobs/active"],
    queryFn: async () => {
      const response = await fetch("/api/jobs/active");
      return response.json();
    },
  });

  const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isError || !analytics) {
    return (
      <div className="h-96 flex flex-col items-center justify-center space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Analytics Unavailable</h3>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Advanced analytics is coming soon.</p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Advanced Analytics</h2>
          <p className="text-gray-600 dark:text-gray-400">Comprehensive hiring insights and performance metrics</p>
        </div>
        
        <div className="flex gap-3">
          <Select value={selectedJob} onValueChange={setSelectedJob}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by job" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Jobs</SelectItem>
              {jobs?.map((job: any) => (
                <SelectItem key={job.id} value={job.id.toString()}>
                  {job.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
              <SelectItem value="1y">1 Year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Applications</p>
                <p className="text-2xl font-bold">{analytics?.overview?.totalApplications || 0}</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +12% from last period
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Time to Hire</p>
                <p className="text-2xl font-bold">{analytics?.overview?.avgTimeToHire || 0} days</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingDown className="w-3 h-3 mr-1" />
                  -3 days improved
                </p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Offer Accept Rate</p>
                <p className="text-2xl font-bold">{analytics?.overview?.offerAcceptanceRate || 0}%</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +5% increase
                </p>
              </div>
              <Target className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Jobs</p>
                <p className="text-2xl font-bold">{analytics?.overview?.activeJobs || 0}</p>
                <p className="text-xs text-blue-600 flex items-center mt-1">
                  <CalendarDays className="w-3 h-3 mr-1" />
                  Currently hiring
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pipeline" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="skills">Skills Analysis</TabsTrigger>
          <TabsTrigger value="sources">Source Tracking</TabsTrigger>
          <TabsTrigger value="diversity">Diversity</TabsTrigger>
        </TabsList>

        {/* Pipeline Analysis */}
        <TabsContent value="pipeline" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Hiring Pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics?.pipeline || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stage" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Time to Hire Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics?.timeToHire || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="avgDays" stroke="#3B82F6" strokeWidth={2} />
                    <Line type="monotone" dataKey="target" stroke="#EF4444" strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Metrics */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Conversion Rates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Interview → Offer</span>
                  <span className="font-bold">{analytics?.performanceMetrics?.interviewToOfferRate || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${analytics?.performanceMetrics?.interviewToOfferRate || 0}%` }}
                  />
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">Candidate Experience</span>
                  <span className="font-bold flex items-center">
                    {analytics?.performanceMetrics?.candidateExperience || 0}/5
                    <Star className="w-4 h-4 ml-1 text-yellow-500" />
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full" 
                    style={{ width: `${(analytics?.performanceMetrics?.candidateExperience || 0) * 20}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Performing Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics?.overview?.sourceEffectiveness?.slice(0, 5).map((source: any, index: number) => (
                    <div key={source.source} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full bg-blue-${500 + index * 100}`} />
                        <span className="text-sm">{source.source}</span>
                      </div>
                      <Badge variant="secondary">{source.conversionRate}%</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hiring Velocity</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={analytics?.timeToHire?.slice(-6) || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="avgDays" stroke="#10B981" fill="#10B981" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Skills Analysis */}
        <TabsContent value="skills" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>In-Demand Skills</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Most requested skills and their market rates
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.skillsDemand?.slice(0, 8).map((skill: any, index: number) => (
                  <div key={skill.skill} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-lg font-bold text-gray-400">#{index + 1}</div>
                      <div>
                        <p className="font-medium">{skill.skill}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {skill.applications} applications
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">${skill.avgSalary?.toLocaleString()}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">avg salary</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Source Tracking */}
        <TabsContent value="sources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Application Sources Effectiveness</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analytics?.overview?.sourceEffectiveness || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="source" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="applications" fill="#3B82F6" name="Applications" />
                  <Bar dataKey="hires" fill="#10B981" name="Hires" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Diversity Metrics */}
        <TabsContent value="diversity" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Gender Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics?.performanceMetrics?.diversityMetrics?.gender || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analytics?.performanceMetrics?.diversityMetrics?.gender?.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Experience Level Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics?.performanceMetrics?.diversityMetrics?.experience || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="level" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8B5CF6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}