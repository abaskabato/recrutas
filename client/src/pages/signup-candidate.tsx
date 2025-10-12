
import SignUpForm from "@/components/SignUpForm";

export default function SignUpCandidatePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Sign up as a Candidate</h1>
          <p className="text-muted-foreground">Find your next job opportunity.</p>
        </div>
        <SignUpForm role="candidate" />
        <div className="text-center mt-4">
          <a href="/auth" className="text-sm font-medium text-primary hover:text-primary/90">
            Already have an account? Sign in
          </a>
        </div>
      </div>
    </div>
  );
}
