import React from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";
import { useSession } from "@/lib/auth-client";
import { useRoleBasedAuth } from "@/hooks/useRoleBasedAuth";
import Landing from "@/pages/landing-responsive";
import AuthPage from "@/pages/auth-page";
import ForgotPasswordPage from "@/pages/forgot-password";
import RoleSelection from "@/pages/role-selection";
import CandidateDashboard from "@/pages/candidate-dashboard-streamlined";
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

  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/role-selection" component={RoleSelection} />
      <Route path="/candidate-dashboard" component={CandidateDashboard} />
      <Route path="/talent-dashboard" component={TalentDashboard} />
      <Route path="/chat/:roomId?" component={Chat} />
      
      {/* Root route with role-based redirection */}
      <Route path="/">
        {(() => {
          // Not authenticated - show landing page
          if (!isAuthenticated) {
            return <Landing />;
          }
          
          // Authenticated but no role - show role selection
          if (!user?.role) {
            return <RoleSelection />;
          }
          
          // Authenticated with role - redirect to appropriate dashboard
          if (user.role === "candidate") {
            return <CandidateDashboard />;
          } else if (user.role === "talent_owner") {
            return <TalentDashboard />;
          }
          
          // Default fallback to role selection
          return <RoleSelection />;
        })()}
      </Route>
      
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
        <ErrorBoundary>
          <Toaster />
          <Router />
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
