import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, User, UserRoundCheck, Building } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Landing() {
  const [selectedRole, setSelectedRole] = useState<'candidate' | 'recruiter' | null>(null);
  const { toast } = useToast();

  const setRoleMutation = useMutation({
    mutationFn: async (role: 'candidate' | 'recruiter') => {
      await apiRequest('POST', '/api/auth/role', { role });
    },
    onSuccess: () => {
      toast({
        title: "Welcome to Recrutas!",
        description: "Your account has been set up successfully.",
      });
      // Reload to update auth state
      window.location.reload();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to set up your account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRoleSelection = (role: 'candidate' | 'recruiter') => {
    setSelectedRole(role);
    setRoleMutation.mutate(role);
  };

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary">Recrutas</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={handleLogin}>
                <Bell className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20">
        <div className="text-center">
          <h1 className="text-4xl sm:text-6xl font-bold text-neutral-800 mb-6">
            Hiring in <span className="text-primary">Minutes</span>,<br />
            Not Weeks
          </h1>
          <p className="text-xl text-neutral-600 mb-12 max-w-3xl mx-auto">
            AI-powered instant job matching that connects qualified candidates with full-time roles in real-time. 
            Skip the endless applications—get matched, chat, and get hired.
          </p>

          {/* Role Selection Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="p-8 border-2 border-transparent hover:border-primary transition-all cursor-pointer group"
                  onClick={() => handleRoleSelection('candidate')}>
              <CardContent className="p-0">
                <div className="w-16 h-16 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <UserRoundCheck className="text-primary h-8 w-8" />
                </div>
                <h3 className="text-2xl font-semibold text-neutral-800 mb-4">I'm Looking for a Job</h3>
                <p className="text-neutral-600 mb-6">Upload your resume and get instantly matched with relevant full-time positions.</p>
                <Button 
                  className="w-full" 
                  disabled={setRoleMutation.isPending && selectedRole === 'candidate'}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLogin();
                  }}
                >
                  {setRoleMutation.isPending && selectedRole === 'candidate' ? (
                    "Setting up your account..."
                  ) : (
                    "Get Started as Candidate"
                  )}
                </Button>
              </CardContent>
            </Card>
            
            <Card className="p-8 border-2 border-transparent hover:border-secondary transition-all cursor-pointer group"
                  onClick={() => handleRoleSelection('recruiter')}>
              <CardContent className="p-0">
                <div className="w-16 h-16 mx-auto mb-6 bg-secondary/10 rounded-full flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                  <Building className="text-secondary h-8 w-8" />
                </div>
                <h3 className="text-2xl font-semibold text-neutral-800 mb-4">I'm Hiring Talent</h3>
                <p className="text-neutral-600 mb-6">Post jobs and connect with pre-qualified candidates who match your requirements.</p>
                <Button 
                  variant="secondary" 
                  className="w-full bg-secondary hover:bg-green-700"
                  disabled={setRoleMutation.isPending && selectedRole === 'recruiter'}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLogin();
                  }}
                >
                  {setRoleMutation.isPending && selectedRole === 'recruiter' ? (
                    "Setting up your account..."
                  ) : (
                    "Get Started as Recruiter"
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
