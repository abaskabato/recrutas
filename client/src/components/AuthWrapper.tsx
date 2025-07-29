import React from 'react';
import { useSession } from '@/lib/auth-client';
import { Switch, Route } from 'wouter';
import Landing from '@/pages/landing-responsive';
import AuthPage from '@/pages/auth-page';
import ForgotPasswordPage from '@/pages/forgot-password';
import RoleSelection from '@/pages/role-selection';
import CandidateDashboard from '@/pages/candidate-dashboard-streamlined';
import TalentDashboard from '@/pages/talent-dashboard';
import ExamPage from '@/pages/exam-page';
import Chat from '@/pages/chat';
import NotFound from '@/pages/not-found';

function Router() {
  const { data: session, isPending: isLoading } = useSession();
  const user = session?.user;
  const isAuthenticated = !!user;

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
      <Route path="/exam/:jobId/:jobTitle?" component={ExamPage} />
      <Route path="/chat/:roomId?" component={Chat} />
      
      <Route path="/">
        {(() => {
          if (!isAuthenticated) {
            return <Landing />;
          }
          
          if (!user?.role) {
            return <RoleSelection />;
          }
          
          if (user.role === "candidate") {
            return <CandidateDashboard />;
          } else if (user.role === "talent_owner") {
            return <TalentDashboard />;
          }
          
          return <RoleSelection />;
        })()}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

export default function AuthWrapper() {
  return <Router />;
}
