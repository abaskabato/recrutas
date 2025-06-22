import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Phone, CheckCircle, Upload, FileText, Briefcase, MapPin, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ProfileCompletionModalProps {
  user: any;
  onComplete: () => void;
  onCancel: () => void;
}

export default function ProfileCompletionModal({ user, onComplete, onCancel }: ProfileCompletionModalProps) {
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phoneNumber, setPhoneNumber] = useState("");
  
  // Resume and profile data
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeParsing, setResumeParsing] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  
  // Profile details
  const [title, setTitle] = useState("");
  const [experience, setExperience] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [workType, setWorkType] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [bio, setBio] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleResumeUpload = async (file: File) => {
    setResumeFile(file);
    setResumeParsing(true);
    
    try {
      const formData = new FormData();
      formData.append('resume', file);
      
      const response = await apiRequest('POST', '/api/resume/parse', formData);
      const result = await response.json();
      
      if (result.aiExtracted) {
        setParsedData(result.aiExtracted);
        
        // Auto-fill form fields from parsed data
        if (result.aiExtracted.personalInfo?.name) {
          const nameParts = result.aiExtracted.personalInfo.name.split(' ');
          if (nameParts.length >= 2) {
            setFirstName(nameParts[0]);
            setLastName(nameParts.slice(1).join(' '));
          }
        }
        if (result.aiExtracted.personalInfo?.email) {
          setEmail(result.aiExtracted.personalInfo.email);
        }
        if (result.aiExtracted.personalInfo?.phone) {
          setPhoneNumber(result.aiExtracted.personalInfo.phone);
        }
        if (result.aiExtracted.personalInfo?.location) {
          setLocation(result.aiExtracted.personalInfo.location);
        }
        if (result.aiExtracted.summary) {
          setBio(result.aiExtracted.summary);
        }
        if (result.aiExtracted.skills?.technical?.length > 0) {
          setSkills([...result.aiExtracted.skills.technical, ...result.aiExtracted.skills.tools]);
        }
        if (result.aiExtracted.experience?.level) {
          setExperience(result.aiExtracted.experience.level);
        }
        
        toast({
          title: "Resume Parsed Successfully",
          description: `Extracted ${result.aiExtracted.skills?.technical?.length || 0} skills and ${result.aiExtracted.experience?.totalYears || 0} years of experience.`,
        });
        
        // Move to next step
        setStep(3);
      }
    } catch (error) {
      console.error('Resume parsing error:', error);
      toast({
        title: "Resume Parsing Failed",
        description: "Please check your file and try again, or continue manually.",
        variant: "destructive",
      });
    } finally {
      setResumeParsing(false);
    }
  };

  const handleBasicInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast({
        title: "Required Fields Missing",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    // Optional phone number validation (only if provided)
    if (phoneNumber.trim()) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(phoneNumber.replace(/[\s\-\(\)]/g, ''))) {
        toast({
          title: "Invalid Phone Number",
          description: "Please enter a valid phone number.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);
    
    try {
      const response = await apiRequest("POST", "/api/auth/complete-profile", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim() || null
      });

      if (response.ok) {
        toast({
          title: "Profile Completed",
          description: "Welcome to Recrutas! Your profile has been set up successfully.",
        });
        onComplete();
      } else {
        throw new Error("Failed to complete profile");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-xl font-semibold">Complete Your Profile</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Help us personalize your experience by providing a few basic details.
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <Input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter your first name"
                required
                disabled={isSubmitting}
                className="w-full"
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <Input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter your last name"
                required
                disabled={isSubmitting}
                className="w-full"
              />
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                disabled={isSubmitting}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                We'll use this for job notifications and important updates.
              </p>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number (Optional)
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  disabled={isSubmitting}
                  className="pl-10 w-full"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Optional: We may use this for urgent job opportunities.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    <span>Completing...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Complete Profile</span>
                  </div>
                )}
              </Button>
            </div>
          </form>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              By completing your profile, you agree to receive job-related communications from Recrutas.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}