
import SignUpForm from "@/components/SignUpForm";

export default function SignUpTalentPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Sign up as a Talent Owner</h1>
          <p className="text-muted-foreground">Find the best talent for your team.</p>
        </div>
        <SignUpForm role="talent_owner" />
        <div className="text-center mt-4">
          <a href="/auth" className="text-sm font-medium text-primary hover:text-primary/90">
            Already have an account? Sign in
          </a>
        </div>
      </div>
    </div>
  );
}
