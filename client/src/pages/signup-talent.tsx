
import SignUpForm from "@/components/SignUpForm";
import { Users } from "lucide-react";

export default function SignUpTalentPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">R</span>
            </div>
            <span className="text-2xl font-bold text-foreground">Recrutas</span>
          </a>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Sign up as a Talent Owner</h1>
          </div>
          <p className="text-muted-foreground">Find the best talent for your team.</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
          <SignUpForm role="talent_owner" />
        </div>
        <div className="text-center mt-4">
          <a href="/auth" className="text-sm font-medium text-primary hover:text-primary/90">
            Already have an account? Sign in
          </a>
        </div>
      </div>
    </div>
  );
}
