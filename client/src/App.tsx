import React from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSession } from "@/lib/auth-client";
import Landing from "@/pages/landing-responsive";
import AuthPage from "@/pages/auth-page";
import ForgotPasswordPage from "@/pages/forgot-password";
import CandidateDashboard from "@/pages/candidate-dashboard-enhanced";
import TalentDashboard from "@/pages/talent-dashboard";
import Chat from "@/pages/chat";
import NotFound from "@/pages/not-found";

function Router() {
  const { data: session, isPending: isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const user = session?.user;

  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      {!user ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          {/* For now, all authenticated users go to candidate dashboard */}
          <Route path="/" component={CandidateDashboard} />
          <Route path="/candidate-dashboard" component={CandidateDashboard} />
          <Route path="/talent-dashboard" component={TalentDashboard} />
          <Route path="/recruiter-dashboard" component={TalentDashboard} />
          <Route path="/chat/:roomId?" component={Chat} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Add global error handlers for unhandled promise rejections
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.warn('Unhandled promise rejection caught:', event.reason);
      event.preventDefault(); // Prevent console error spam
    };

    const handleError = (event: ErrorEvent) => {
      console.warn('Global error caught:', event.error);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

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
