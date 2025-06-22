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
import RoleSelection from "@/pages/role-selection";
import CandidateDashboard from "@/pages/candidate-dashboard-enhanced";
import TalentDashboard from "@/pages/talent-dashboard";
import Chat from "@/pages/chat";
import NotFound from "@/pages/not-found";

function Router() {
  const { data, user, isLoading, isAuthenticated } = useSession();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Debug logging to understand user state
  console.log("Current session data:", data);
  console.log("Current user:", user);
  console.log("Is authenticated:", isAuthenticated);
  console.log("User role:", user?.role);

  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          {/* Role-based routing logic */}
          {!user?.role || user.role === null ? (
            // New users without a role go to role selection
            <Route path="/" component={() => <RoleSelection userId={user?.id || ''} />} />
          ) : user.role === "candidate" ? (
            // Candidates go to candidate dashboard
            <Route path="/" component={CandidateDashboard} />
          ) : (
            // Talent owners go to talent dashboard
            <Route path="/" component={TalentDashboard} />
          )}
          
          {/* Explicit dashboard routes */}
          <Route path="/candidate-dashboard" component={CandidateDashboard} />
          <Route path="/talent-dashboard" component={TalentDashboard} />
          <Route path="/recruiter-dashboard" component={TalentDashboard} />
          <Route path="/role-selection" component={() => <RoleSelection userId={user?.id || ''} />} />
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
