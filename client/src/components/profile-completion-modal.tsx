import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Phone, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ProfileCompletionModalProps {
  user: any;
  onComplete: () => void;
}

export default function ProfileCompletionModal({ user, onComplete }: ProfileCompletionModalProps) {
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName.trim() || !lastName.trim() || !phoneNumber.trim()) {
      toast({
        title: "Required Fields Missing",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Basic phone number validation
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(phoneNumber.replace(/[\s\-\(\)]/g, ''))) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await apiRequest("POST", "/api/auth/complete-profile", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim()
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

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  required
                  disabled={isSubmitting}
                  className="pl-10 w-full"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                We'll use this to send you important updates about job opportunities.
              </p>
            </div>

            {/* Email Display */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <Input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full bg-gray-50 text-gray-600"
              />
              <p className="text-xs text-gray-500 mt-1">
                Email is automatically verified through your account.
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full mt-6"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>Completing Profile...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Complete Profile</span>
                </div>
              )}
            </Button>
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