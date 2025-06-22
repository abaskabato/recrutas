import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AdvancedAnalyticsDashboard from "@/components/advanced-analytics-dashboard";
import { BarChart3, TrendingUp, Users, Clock, Target } from "lucide-react";

export default function AnalyticsDashboard() {
  const [view, setView] = useState<'overview' | 'advanced'>('overview');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Hiring Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Comprehensive insights into your recruitment performance
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={view === 'overview' ? 'default' : 'outline'}
              onClick={() => setView('overview')}
            >
              Overview
            </Button>
            <Button
              variant={view === 'advanced' ? 'default' : 'outline'}
              onClick={() => setView('advanced')}
            >
              Advanced Analytics
            </Button>
          </div>
        </div>

        {view === 'overview' ? (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Total Applications
                      </p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        247
                      </p>
                      <p className="text-sm text-green-600 flex items-center mt-1">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        +12% from last month
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
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Time to Hire
                      </p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        18 days
                      </p>
                      <p className="text-sm text-green-600 flex items-center mt-1">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        3 days faster
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
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Interview Rate
                      </p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        36%
                      </p>
                      <p className="text-sm text-green-600 flex items-center mt-1">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        +5% improvement
                      </p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Offer Accept Rate
                      </p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        78%
                      </p>
                      <p className="text-sm text-green-600 flex items-center mt-1">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        Industry leading
                      </p>
                    </div>
                    <Target className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pipeline Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Hiring Pipeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { stage: 'Applied', count: 247, percentage: 100, color: 'bg-blue-500' },
                      { stage: 'Screening', count: 156, percentage: 63, color: 'bg-green-500' },
                      { stage: 'Interview', count: 89, percentage: 36, color: 'bg-yellow-500' },
                      { stage: 'Final Round', count: 34, percentage: 14, color: 'bg-orange-500' },
                      { stage: 'Offer', count: 18, percentage: 7, color: 'bg-purple-500' }
                    ].map((stage) => (
                      <div key={stage.stage} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                          <span className="font-medium">{stage.stage}</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {stage.count} candidates
                          </span>
                          <Badge variant="secondary">
                            {stage.percentage}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Sources</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { source: 'Employee Referrals', hires: 19, rate: 51, applications: 37 },
                      { source: 'Direct Applications', hires: 15, rate: 33, applications: 45 },
                      { source: 'LinkedIn', hires: 23, rate: 26, applications: 89 },
                      { source: 'Indeed', hires: 18, rate: 24, applications: 76 }
                    ].map((source) => (
                      <div key={source.source} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{source.source}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {source.applications} applications
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">
                            {source.hires} hires
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {source.rate}% conversion
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Hiring Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      action: 'Interview scheduled',
                      candidate: 'Sarah Johnson',
                      position: 'Senior Frontend Developer',
                      time: '2 hours ago'
                    },
                    {
                      action: 'Application received',
                      candidate: 'Michael Chen',
                      position: 'DevOps Engineer',
                      time: '4 hours ago'
                    },
                    {
                      action: 'Offer extended',
                      candidate: 'Emma Wilson',
                      position: 'Product Manager',
                      time: '1 day ago'
                    },
                    {
                      action: 'Interview completed',
                      candidate: 'David Rodriguez',
                      position: 'Backend Developer',
                      time: '2 days ago'
                    }
                  ].map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <p className="font-medium">{activity.action}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {activity.candidate} - {activity.position}
                        </p>
                      </div>
                      <span className="text-sm text-gray-500">
                        {activity.time}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <AdvancedAnalyticsDashboard />
        )}
      </div>
    </div>
  );
}