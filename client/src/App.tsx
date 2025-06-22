import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing-responsive";
import AuthPage from "@/pages/auth-page";
import CandidateDashboard from "@/pages/candidate-dashboard-enhanced";
import TalentDashboard from "@/pages/talent-dashboard";
import Chat from "@/pages/chat";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      {!isAuthenticated || !user?.role ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          {user.role === 'candidate' ? (
            <>
              <Route path="/" component={CandidateDashboard} />
              <Route path="/candidate-dashboard" component={CandidateDashboard} />
            </>
          ) : user.role === 'talent_owner' ? (
            <>
              <Route path="/" component={TalentDashboard} />
              <Route path="/talent-dashboard" component={TalentDashboard} />
              <Route path="/recruiter-dashboard" component={TalentDashboard} />
            </>
          ) : (
            <Route path="/" component={Landing} />
          )}
          <Route path="/chat/:roomId?" component={Chat} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
