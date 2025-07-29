import React from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import AppProviders from '@/components/AppProviders';
import AuthWrapper from '@/components/AuthWrapper';
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
      <AuthWrapper />
    </AppProviders>
  );
}

export default App;
