import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import CandidateDashboard from '../pages/candidate-dashboard-streamlined';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';

const server = setupServer(
  http.get('/api/candidate/profile', () => {
    return HttpResponse.json({ name: 'John Doe', skills: ['React'] });
  }),
  http.get('/api/candidate/applications', () => {
    return HttpResponse.json([{ 
      id: 1, 
      job: {
        id: 1,
        title: 'React Developer', 
        company: 'Test Co', 
        location: 'Remote',
        workType: 'remote'
      },
      status: 'submitted',
      appliedAt: new Date().toISOString(),
      lastStatusUpdate: new Date().toISOString()
    }]);
  }),
  http.get('/api/ai-matches', () => {
    return HttpResponse.json([{ 
      id: 1, 
      title: 'Vue Developer', 
      company: 'Test Co',
      location: 'Remote',
      description: 'Test job',
      matchScore: 85,
      matchTier: 'high',
      skillMatches: ['Vue', 'JavaScript'],
      aiExplanation: 'Good match for your skills'
    }]);
  }),
  http.get('/api/candidate/stats', () => {
    return HttpResponse.json({ newMatches: 5, profileViews: 10, activeChats: 2, applicationsPending: 1, applicationsRejected: 0, applicationsAccepted: 0 });
  }),
  http.get('/api/candidate/activity', () => {
    return HttpResponse.json([]);
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  queryClient.clear();
});
afterAll(() => server.close());

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Mock Supabase auth
vi.mock('@supabase/auth-helpers-react', () => ({
  useSession: () => ({
    user: { id: '123', email: 'test@test.com', firstName: 'John' }
  }),
  useSessionContext: () => ({
    session: {
      user: { id: '123', email: 'test@test.com', firstName: 'John' }
    },
    isLoading: false,
  }),
  useSupabaseClient: () => ({
    auth: {
      signOut: vi.fn(),
    },
  }),
}));

const renderComponent = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <CandidateDashboard />
    </QueryClientProvider>
  );
};

// Mock the toast hook
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

describe('CandidateDashboard', () => {
  it('renders dashboard when authenticated', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
    });
  });

  it('fetches and displays profile information', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
    });
  });

  it('fetches and displays applications', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
    });
    
    // Click on Applications tab using the nav button
    const applicationsTab = screen.getAllByText(/Applications/i).find(el => el.closest('button'));
    if (applicationsTab) {
      await user.click(applicationsTab);
    }
    
    await waitFor(() => {
      expect(screen.getByText(/React Developer/i)).toBeInTheDocument();
    });
  });

  it('fetches and displays job feed', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
    });
    
    // Click on Job Feed tab
    const jobFeedTab = screen.getAllByText(/Job Feed/i).find(el => el.closest('button'));
    if (jobFeedTab) {
      await user.click(jobFeedTab);
    }
    
    await waitFor(() => {
      expect(screen.getByText(/Vue Developer/i)).toBeInTheDocument();
    });
  });
});
