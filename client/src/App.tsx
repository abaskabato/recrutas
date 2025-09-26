import React from "react";
import { Switch, Route } from "wouter";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabase-client";
import AppProviders from '@/components/AppProviders';
import Landing from "@/pages/landing-responsive";
import AuthPage from "@/pages/auth-page";
import ForgotPasswordPage from "@/pages/forgot-password";
import GuidedSetup from "@/pages/guided-setup";
import CandidateDashboard from "@/pages/candidate-dashboard-streamlined";
import TalentDashboard from "@/pages/talent-dashboard";
import ExamPage from "@/pages/exam-page";
import Chat from "@/pages/chat";
import NotFound from "@/pages/not-found";
import { TopRightButtons } from '@/components/TopRightButtons';


function App() {
  // ...
  return (
    <AppProviders>
      <SessionContextProvider supabaseClient={supabase}>
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/forgot-password" component={ForgotPasswordPage} />
          <Route path="/role-selection" component={GuidedSetup} />
          <Route path="/candidate-dashboard" component={CandidateDashboard} />
          <Route path="/talent-dashboard" component={TalentDashboard} />
          <Route path="/exam/:id" component={ExamPage} />
          <Route path="/chat/:id" component={Chat} />
          <Route component={NotFound} />
        </Switch>
        <TopRightButtons />
      </SessionContextProvider>
    </AppProviders>
  );
}

export default App;
