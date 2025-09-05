import React from "react";
import { Switch, Route } from "wouter";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabase-client";
import AppProviders from '@/components/AppProviders';
import Landing from "@/pages/landing-responsive";
import AuthPage from "@/pages/auth-page";
import ForgotPasswordPage from "@/pages/forgot-password";
import RoleSelection from "@/pages/role-selection";
import CandidateDashboard from "@/pages/candidate-dashboard-streamlined";
import TalentDashboard from "@/pages/talent-dashboard";
import ExamPage from "@/pages/exam-page";
import Chat from "@/pages/chat";
import NotFound from "@/pages/not-found";

function App() {
  // Add global error handlers for unhandled promise rejections
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.warn('Unhandled promise rejection caught:', event.reason);
      // Only prevent default in development to avoid masking errors
      if (import.meta.env.DEV) {
        event.preventDefault();
      }
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
    <AppProviders>
      <SessionContextProvider supabaseClient={supabase}>
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/forgot-password" component={ForgotPasswordPage} />
          <Route path="/role-selection" component={RoleSelection} />
          <Route path="/candidate-dashboard" component={CandidateDashboard} />
          <Route path="/talent-dashboard" component={TalentDashboard} />
          <Route path="/exam/:id" component={ExamPage} />
          <Route path="/chat/:id" component={Chat} />
          <Route component={NotFound} />
        </Switch>
      </SessionContextProvider>
    </AppProviders>
  );
}

export default App;
