import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Briefcase, 
  Target, 
  Search, 
  TrendingUp, 
  Building,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useLocation } from 'wouter';

export default function RoleSelection() {
  const [selectedRole, setSelectedRole] = useState<'candidate' | 'talent_owner' | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const selectRoleMutation = useMutation({
    mutationFn: async (role: 'candidate' | 'talent_owner') => {
      const response = await apiRequest('POST', '/api/auth/select-role', { role });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/get-session'] });
      toast({
        title: 'Role Selected',
        description: `Welcome! Your account has been set up as a ${selectedRole === 'candidate' ? 'candidate' : 'talent owner'}.`,
      });
      
      // Redirect based on role
      if (selectedRole === 'candidate') {
        setLocation('/candidate-dashboard');
      } else {
        setLocation('/talent-dashboard');
      }
    },
    onError: (error) => {
      toast({
        title: 'Selection Failed',
        description: 'Failed to set your role. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleRoleSelection = () => {
    if (selectedRole) {
      selectRoleMutation.mutate(selectedRole);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-slate-900">Choose Your Role</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Select how you'd like to use the platform. You can change this later in your settings.
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Candidate Role */}
          <Card 
            className={`cursor-pointer transition-all duration-200 hover:shadow-xl ${
              selectedRole === 'candidate' 
                ? 'ring-2 ring-blue-500 shadow-lg' 
                : 'hover:shadow-lg'
            }`}
            onClick={() => setSelectedRole('candidate')}
          >
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 relative">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                  <Users className="w-8 h-8 text-white" />
                </div>
                {selectedRole === 'candidate' && (
                  <div className="absolute -top-2 -right-2">
                    <CheckCircle className="w-6 h-6 text-green-500 fill-current" />
                  </div>
                )}
              </div>
              <CardTitle className="text-2xl">I'm a Candidate</CardTitle>
              <p className="text-slate-600">Looking for job opportunities</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Search className="w-5 h-5 text-blue-500 mt-1" />
                  <div>
                    <h4 className="font-medium text-slate-900">Smart Job Matching</h4>
                    <p className="text-sm text-slate-600">AI-powered job recommendations based on your skills and preferences</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-blue-500 mt-1" />
                  <div>
                    <h4 className="font-medium text-slate-900">Direct Applications</h4>
                    <p className="text-sm text-slate-600">Apply directly to companies without going through recruiters</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-blue-500 mt-1" />
                  <div>
                    <h4 className="font-medium text-slate-900">Career Insights</h4>
                    <p className="text-sm text-slate-600">Get personalized career advice and market insights</p>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Perfect for:</span>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="text-xs">Job Seekers</Badge>
                    <Badge variant="secondary" className="text-xs">Career Changers</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Talent Owner Role */}
          <Card 
            className={`cursor-pointer transition-all duration-200 hover:shadow-xl ${
              selectedRole === 'talent_owner' 
                ? 'ring-2 ring-purple-500 shadow-lg' 
                : 'hover:shadow-lg'
            }`}
            onClick={() => setSelectedRole('talent_owner')}
          >
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 relative">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Building className="w-8 h-8 text-white" />
                </div>
                {selectedRole === 'talent_owner' && (
                  <div className="absolute -top-2 -right-2">
                    <CheckCircle className="w-6 h-6 text-green-500 fill-current" />
                  </div>
                )}
              </div>
              <CardTitle className="text-2xl">I'm a Talent Owner</CardTitle>
              <p className="text-slate-600">Hiring talent for my company</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Briefcase className="w-5 h-5 text-purple-500 mt-1" />
                  <div>
                    <h4 className="font-medium text-slate-900">Post Job Openings</h4>
                    <p className="text-sm text-slate-600">Create detailed job postings and reach qualified candidates</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-purple-500 mt-1" />
                  <div>
                    <h4 className="font-medium text-slate-900">AI Candidate Matching</h4>
                    <p className="text-sm text-slate-600">Get matched with candidates who fit your requirements</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-purple-500 mt-1" />
                  <div>
                    <h4 className="font-medium text-slate-900">Direct Communication</h4>
                    <p className="text-sm text-slate-600">Connect directly with candidates without intermediaries</p>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Perfect for:</span>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="text-xs">Hiring Managers</Badge>
                    <Badge variant="secondary" className="text-xs">Startups</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Continue Button */}
        <div className="text-center">
          <Button 
            onClick={handleRoleSelection}
            disabled={!selectedRole || selectRoleMutation.isPending}
            size="lg"
            className="px-8 py-3 text-lg"
          >
            {selectRoleMutation.isPending ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Setting up your account...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                Continue as {selectedRole === 'candidate' ? 'Candidate' : selectedRole === 'talent_owner' ? 'Talent Owner' : '...'}
                <ArrowRight className="w-5 h-5" />
              </div>
            )}
          </Button>
          
          {selectedRole && (
            <p className="text-sm text-slate-500 mt-2">
              You can change your role later in account settings
            </p>
          )}
        </div>
      </div>
    </div>
  );
}