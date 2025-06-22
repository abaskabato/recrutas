import React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Building2, UserCheck, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

interface RoleSelectionProps {
  userId: string;
}

export default function RoleSelection({ userId }: RoleSelectionProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const updateRoleMutation = useMutation({
    mutationFn: async (role: "candidate" | "talent_owner") => {
      const response = await apiRequest("POST", "/api/auth/update-role", { role });
      return response.json();
    },
    onSuccess: (data, role) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/get-session"] });
      toast({
        title: "Role selected successfully",
        description: `Welcome to Recrutas as a ${role === "candidate" ? "job seeker" : "talent owner"}!`,
      });
      
      // Navigate to appropriate dashboard
      if (role === "candidate") {
        navigate("/candidate-dashboard");
      } else {
        navigate("/talent-dashboard");
      }
    },
    onError: (error) => {
      toast({
        title: "Role selection failed",
        description: "Please try again or contact support if the issue persists.",
        variant: "destructive",
      });
    },
  });

  const handleRoleSelect = (role: "candidate" | "talent_owner") => {
    updateRoleMutation.mutate(role);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-950 dark:to-black flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Choose Your Role
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Select how you'd like to use Recrutas. You can always change this later in your profile settings.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Candidate Role */}
          <Card className="relative group hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-500 cursor-pointer">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <UserCheck className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-2xl text-gray-900 dark:text-white">
                Job Seeker
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Find your dream job with AI-powered matching
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Get personalized job recommendations
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Upload resume and build your profile
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Apply to jobs with one click
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Chat directly with hiring managers
                  </span>
                </div>
              </div>
              
              <div className="pt-4">
                <Badge variant="secondary" className="mb-4">
                  Most Popular
                </Badge>
                <Button 
                  onClick={() => handleRoleSelect("candidate")}
                  className="w-full group-hover:bg-blue-600 transition-colors"
                  disabled={updateRoleMutation.isPending}
                >
                  {updateRoleMutation.isPending ? (
                    "Setting up your account..."
                  ) : (
                    <>
                      Get Started as Job Seeker
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Talent Owner Role */}
          <Card className="relative group hover:shadow-xl transition-all duration-300 border-2 hover:border-green-500 cursor-pointer">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Building2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl text-gray-900 dark:text-white">
                Talent Owner
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Find and hire the best talent efficiently
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Post job openings and requirements
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    AI-powered candidate matching
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Review applications and profiles
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Connect directly with candidates
                  </span>
                </div>
              </div>
              
              <div className="pt-4">
                <Badge variant="outline" className="mb-4 border-green-500 text-green-600">
                  For Employers
                </Badge>
                <Button 
                  onClick={() => handleRoleSelect("talent_owner")}
                  variant="outline"
                  className="w-full border-green-500 text-green-600 hover:bg-green-500 hover:text-white transition-colors"
                  disabled={updateRoleMutation.isPending}
                >
                  {updateRoleMutation.isPending ? (
                    "Setting up your account..."
                  ) : (
                    <>
                      Get Started as Talent Owner
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Need help deciding? <span className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">Contact our team</span>
          </p>
        </div>
      </div>
    </div>
  );
}