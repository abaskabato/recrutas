import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import TalentOwnerDashboard from '../pages/talent-dashboard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';

const server = setupServer(
  http.get('/api/auth/user', () => {
    return HttpResponse.json({ id: '123', email: 'test@test.com', firstName: 'Test' });
  }),
  http.get('/api/recruiter/stats', () => {
    return HttpResponse.json({ 
      activeJobs: 1, 
      totalApplicants: 5, 
      newApplicants: 2, 
      interviewsScheduled: 1,
      averageTimeToHire: 14,
      totalViews: 100
    });
  }),
  http.get('/api/talent-owner/all-applicants', () => {
    return HttpResponse.json([]);
  }),
  http.get('/api/talent-owner/jobs', () => {
    return HttpResponse.json([{ 
      id: 1, 
      title: 'Software Engineer', 
      company: 'Test Co', 
      description: 'Test job',
      requirements: ['React', 'Node.js'],
      skills: ['React', 'Node.js'],
      location: 'Remote',
      workType: 'remote',
      status: 'active',
      applicationCount: 1, 
      viewCount: 10, 
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }]);
  }),
  http.get('/api/jobs/1/applicants', () => {
    return HttpResponse.json([{ applicationId: 1, candidate: { firstName: 'John', lastName: 'Doe' }, profile: { skills: ['React'] } }]);
  }),
  http.post('/api/jobs', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 2, ...body });
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

// Mock the toast hook
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Mock Supabase session
vi.mock('@supabase/auth-helpers-react', async (importOriginal) => {
  const actual = await importOriginal();
  const session = {
    user: { 
      id: '123', 
      email: 'test@test.com', 
      firstName: 'Test',
      profileComplete: true,
    },
  };
  return {
    ...actual,
    useSession: () => session,
    useSessionContext: () => ({
      session,
      isLoading: false,
    }),
    useSupabaseClient: () => ({
      auth: {
        signOut: vi.fn(),
      },
    }),
  };
});

const renderComponent = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <TalentOwnerDashboard />
    </QueryClientProvider>
  );
};

describe('TalentOwnerDashboard', () => {

  it('fetches and displays job postings', async () => {
    renderComponent();
    // Wait for the dashboard to fully load
    await waitFor(() => {
      expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
    });
    // Then check for the job
    await waitFor(() => {
      expect(screen.getByText(/Software Engineer/i)).toBeInTheDocument();
    });
  });

  it('creates a new job with a string date', async () => {
    const user = userEvent.setup();
    renderComponent();

    // Wait for dashboard to load first
    await waitFor(() => {
      expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
    });

    // Find and click the create job button
    const createButton = await screen.findByRole('button', { name: /Create Job/i });
    await user.click(createButton);
    
    // Wait for wizard to open
    await waitFor(() => {
      expect(screen.getByText(/Basic Job Information/i)).toBeInTheDocument();
    });

    // Fill in the form
    await user.type(screen.getByLabelText(/Job Title/i), 'Backend Developer');
    await user.type(screen.getByLabelText(/Company/i), 'NewCo');
    await user.type(screen.getByLabelText(/Job Description/i), 'A new job opening.');
    await user.type(screen.getByLabelText(/Location/i), 'Remote');
    
    const dateInput = screen.getByLabelText(/Job Expiry Date/i);
    await user.clear(dateInput);
    await user.type(dateInput, '2025-01-01');

    await user.click(screen.getByRole('button', { name: /Next/i }));

    await waitFor(() => {
      expect(screen.getByText(/Requirements & Skills/i)).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText(/e\.g\. 5\+ years of experience/i), '5 years of Go');
    await user.click(screen.getAllByRole('button', { name: /\+/i })[0]);
    await user.type(screen.getByPlaceholderText(/e\.g\. JavaScript, Python/i), 'Go');
    await user.click(screen.getAllByRole('button', { name: /\+/i })[1]);
    
    await user.click(screen.getByRole('button', { name: /Next/i }));

    await waitFor(() => {
      expect(screen.getByText(/Automated Filtering/i)).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /Next/i }));

    await waitFor(() => {
      expect(screen.getByText(/Direct Connection Setup/i)).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText(/Hiring Manager Name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/Hiring Manager Email/i), 'jane@newco.com');

    await user.click(screen.getByRole('button', { name: /Create Job Posting/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Success',
          description: expect.stringContaining('Job posted successfully'),
        })
      );
    });
  }, 10000);

  it('fetches and displays applicants when a job is selected', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    // Wait for dashboard and job to load
    await waitFor(() => {
      expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Software Engineer/i)).toBeInTheDocument();
    });

    // Find and click View Applicants button
    const viewButton = await screen.findByRole('button', { name: /View/i });
    await user.click(viewButton);

    await waitFor(() => {
      // Check for applicant
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    });
  });
});
