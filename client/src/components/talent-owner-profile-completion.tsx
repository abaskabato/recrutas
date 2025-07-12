import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Building, MapPin, Users, Globe, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface TalentOwnerProfileCompletionProps {
  user: any;
  onComplete: () => void;
  onCancel: () => void;
}

export default function TalentOwnerProfileCompletion({ user, onComplete, onCancel }: TalentOwnerProfileCompletionProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Basic Info
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [jobTitle, setJobTitle] = useState("");

  // Company Info
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [industry, setIndustry] = useState("");
  const [companyLocation, setCompanyLocation] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  
  // Hiring Info
  const [hiringFor, setHiringFor] = useState<string[]>([]);
  const [currentHiringRoles, setCurrentHiringRoles] = useState("");
  const [hiringTimeline, setHiringTimeline] = useState("");
  const [hiringBudget, setHiringBudget] = useState("");

  const handleBasicInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !jobTitle) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    setStep(2);
  };

  const handleCompanyInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !industry || !companyLocation || !companySize) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required company information",
        variant: "destructive",
      });
      return;
    }
    setStep(3);
  };

  const addHiringRole = (role: string) => {
    if (role && !hiringFor.includes(role)) {
      setHiringFor([...hiringFor, role]);
    }
  };

  const removeHiringRole = (role: string) => {
    setHiringFor(hiringFor.filter(r => r !== role));
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Submit talent owner profile
      const profileData = {
        firstName,
        lastName,
        email,
        phoneNumber,
        jobTitle,
        companyName,
        companyWebsite,
        companySize,
        industry,
        companyLocation,
        companyDescription,
        hiringFor,
        currentHiringRoles,
        hiringTimeline,
        hiringBudget,
        profileComplete: true
      };

      await apiRequest('/api/talent-owner/profile/complete', {
        method: 'POST',
        body: profileData
      });

      toast({
        title: "Profile Completed!",
        description: "Your talent owner profile has been successfully set up.",
      });

      onComplete();
    } catch (error) {
      console.error('Error completing profile:', error);
      toast({
        title: "Error",
        description: "Failed to complete profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Let's start with your basic information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBasicInfoSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@company.com"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div>
                  <Label htmlFor="jobTitle">Your Job Title *</Label>
                  <Input
                    id="jobTitle"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Hiring Manager, CTO, HR Director"
                    required
                  />
                </div>

                <div className="flex justify-between pt-4">
                  <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Next: Company Info
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Company Information
              </CardTitle>
              <CardDescription>
                Tell us about your company
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCompanyInfoSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Corp"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="companyWebsite">Company Website</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      id="companyWebsite"
                      value={companyWebsite}
                      onChange={(e) => setCompanyWebsite(e.target.value)}
                      placeholder="https://acmecorp.com"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="companySize">Company Size *</Label>
                    <Select value={companySize} onValueChange={setCompanySize}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select company size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-10">1-10 employees</SelectItem>
                        <SelectItem value="11-50">11-50 employees</SelectItem>
                        <SelectItem value="51-200">51-200 employees</SelectItem>
                        <SelectItem value="201-500">201-500 employees</SelectItem>
                        <SelectItem value="501-1000">501-1000 employees</SelectItem>
                        <SelectItem value="1000+">1000+ employees</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="industry">Industry *</Label>
                    <Select value={industry} onValueChange={setIndustry}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technology">Technology</SelectItem>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="manufacturing">Manufacturing</SelectItem>
                        <SelectItem value="consulting">Consulting</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="companyLocation">Company Location *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      id="companyLocation"
                      value={companyLocation}
                      onChange={(e) => setCompanyLocation(e.target.value)}
                      placeholder="San Francisco, CA"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="companyDescription">Company Description</Label>
                  <Textarea
                    id="companyDescription"
                    value={companyDescription}
                    onChange={(e) => setCompanyDescription(e.target.value)}
                    placeholder="Brief description of your company..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-between pt-4">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button type="submit">
                    Next: Hiring Info
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Hiring Information
              </CardTitle>
              <CardDescription>
                Tell us about your hiring needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleFinalSubmit} className="space-y-4">
                <div>
                  <Label>What roles are you typically hiring for?</Label>
                  <div className="flex flex-wrap gap-2 mt-2 mb-2">
                    {hiringFor.map((role) => (
                      <Badge key={role} variant="secondary" className="flex items-center gap-1">
                        {role}
                        <X 
                          className="w-3 h-3 cursor-pointer" 
                          onClick={() => removeHiringRole(role)}
                        />
                      </Badge>
                    ))}
                  </div>
                  <Select onValueChange={addHiringRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Add hiring roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Software Engineer">Software Engineer</SelectItem>
                      <SelectItem value="Product Manager">Product Manager</SelectItem>
                      <SelectItem value="Designer">Designer</SelectItem>
                      <SelectItem value="Data Scientist">Data Scientist</SelectItem>
                      <SelectItem value="Sales Representative">Sales Representative</SelectItem>
                      <SelectItem value="Marketing Manager">Marketing Manager</SelectItem>
                      <SelectItem value="Customer Success">Customer Success</SelectItem>
                      <SelectItem value="Operations">Operations</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="currentHiringRoles">Current Open Positions</Label>
                  <Textarea
                    id="currentHiringRoles"
                    value={currentHiringRoles}
                    onChange={(e) => setCurrentHiringRoles(e.target.value)}
                    placeholder="Describe your current hiring needs..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hiringTimeline">Hiring Timeline</Label>
                    <Select value={hiringTimeline} onValueChange={setHiringTimeline}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select timeline" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Immediate (&lt; 1 month)</SelectItem>
                        <SelectItem value="1-3months">1-3 months</SelectItem>
                        <SelectItem value="3-6months">3-6 months</SelectItem>
                        <SelectItem value="6months+">6+ months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="hiringBudget">Budget Range</Label>
                    <Select value={hiringBudget} onValueChange={setHiringBudget}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select budget range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="under-50k">Under $50k</SelectItem>
                        <SelectItem value="50k-100k">$50k - $100k</SelectItem>
                        <SelectItem value="100k-150k">$100k - $150k</SelectItem>
                        <SelectItem value="150k-200k">$150k - $200k</SelectItem>
                        <SelectItem value="200k+">$200k+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button type="button" variant="outline" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Completing Profile..." : "Complete Profile"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Complete Your Profile</h2>
              <div className="text-sm text-gray-500">
                Step {step} of 3
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>
          
          {renderStep()}
        </div>
      </div>
    </div>
  );
}