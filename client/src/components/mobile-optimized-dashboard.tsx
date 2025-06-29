import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, Filter, Bell, User, Briefcase, MessageCircle, 
  Calendar, TrendingUp, MapPin, Clock, Star, ChevronRight,
  Phone, Video, Mail, Plus, Settings
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

interface MobileJob {
  id: number;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: string;
  posted: string;
  matchScore: number;
  tags: string[];
}

interface MobileNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export default function MobileOptimizedDashboard() {
  const [activeTab, setActiveTab] = useState("jobs");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [notifications, setNotifications] = useState<MobileNotification[]>([]);

  // Install PWA prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    // Listen for PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    });

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallPrompt(false);
    }
  }, []);

  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["/api/mobile/jobs", searchQuery],
    queryFn: async () => {
      const response = await fetch(`/api/mobile/jobs?search=${encodeURIComponent(searchQuery)}`);
      return response.json();
    },
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["/api/mobile/applications"],
    queryFn: async () => {
      const response = await fetch("/api/mobile/applications");
      return response.json();
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["/api/mobile/messages"],
    queryFn: async () => {
      const response = await fetch("/api/mobile/messages");
      return response.json();
    },
  });

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification('Recrutas', {
          body: 'You\'ll now receive job alerts and updates!',
          icon: '/icon-192.png'
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Recrutas</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={requestNotificationPermission}
              className="relative"
            >
              <Bell className="w-5 h-5" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </Button>
            
            <Button variant="ghost" size="sm">
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* PWA Install Banner */}
        <AnimatePresence>
          {showInstallPrompt && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Install Recrutas App
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Get instant job alerts and offline access
                  </p>
                </div>
                <Button size="sm" onClick={handleInstallPWA} className="ml-3">
                  Install
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Search Bar */}
      <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search jobs, companies, skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-12"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="absolute right-1 top-1/2 transform -translate-y-1/2"
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        {/* Quick Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 flex gap-2 overflow-x-auto pb-2"
            >
              {["Remote", "Full-time", "Tech", "Entry Level", "High Pay"].map((filter) => (
                <Badge key={filter} variant="outline" className="whitespace-nowrap">
                  {filter}
                </Badge>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Content */}
      <div className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="jobs" className="text-xs">
              <Briefcase className="w-4 h-4 mr-1" />
              Jobs
            </TabsTrigger>
            <TabsTrigger value="applications" className="text-xs">
              <Calendar className="w-4 h-4 mr-1" />
              Applied
            </TabsTrigger>
            <TabsTrigger value="messages" className="text-xs">
              <MessageCircle className="w-4 h-4 mr-1" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="profile" className="text-xs">
              <User className="w-4 h-4 mr-1" />
              Profile
            </TabsTrigger>
          </TabsList>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="space-y-3">
            {jobsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <Card>
                      <CardContent className="p-4">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            ) : (
              <motion.div className="space-y-3">
                {jobs.map((job: MobileJob, index: number) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
                              {job.title}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {job.company}
                            </p>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Star className="w-3 h-3 text-yellow-500" />
                            <span className="text-xs font-medium">{job.matchScore}%</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-2">
                          <MapPin className="w-3 h-3 mr-1" />
                          {job.location}
                          <Clock className="w-3 h-3 ml-3 mr-1" />
                          {job.posted}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex gap-1 overflow-x-auto">
                            {job.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs px-2 py-0">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <Button size="sm" className="ml-2">
                            Apply
                            <ChevronRight className="w-3 h-3 ml-1" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications" className="space-y-3">
            {applications.map((app: any) => (
              <Card key={app.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">{app.jobTitle}</h3>
                    <Badge 
                      variant={app.status === 'viewed' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {app.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{app.company}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Applied {app.appliedDate}</span>
                    <div className="flex space-x-1">
                      <Button variant="outline" size="sm">
                        <MessageCircle className="w-3 h-3" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Video className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-3">
            {messages.map((message: any) => (
              <Card key={message.id}>
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-blue-600">
                        {message.senderName.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-sm">{message.senderName}</h4>
                        <span className="text-xs text-gray-500">{message.time}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {message.preview}
                      </p>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Mail className="w-3 h-3 mr-1" />
                          Reply
                        </Button>
                        <Button variant="outline" size="sm">
                          <Phone className="w-3 h-3 mr-1" />
                          Call
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <User className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg">John Doe</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Software Engineer</p>
                <div className="flex justify-center space-x-4 mt-3">
                  <div className="text-center">
                    <p className="text-lg font-bold text-blue-600">87%</p>
                    <p className="text-xs text-gray-500">Profile Match</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-600">12</p>
                    <p className="text-xs text-gray-500">Applications</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-purple-600">3</p>
                    <p className="text-xs text-gray-500">Interviews</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-between">
                Edit Profile
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" className="w-full justify-between">
                Upload Resume
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" className="w-full justify-between">
                Notification Settings
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="outline" className="w-full justify-between">
                Job Preferences
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="flex justify-around">
          {[
            { key: "jobs", icon: Briefcase, label: "Jobs" },
            { key: "applications", icon: Calendar, label: "Applied" },
            { key: "messages", icon: MessageCircle, label: "Chat" },
            { key: "profile", icon: User, label: "Profile" }
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
                activeTab === key
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Floating Action Button */}
      <Button
        className="fixed bottom-20 right-4 w-12 h-12 rounded-full shadow-lg"
        size="sm"
      >
        <Plus className="w-5 h-5" />
      </Button>
    </div>
  );
}