import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import TalentOwnerDashboard from '../pages/talent-dashboard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';

const server = setupServer(
  http.get('/api/talent-owner/jobs', () => {
    return HttpResponse.json([{ id: 1, title: 'Software Engineer', company: 'Test Co' }]);
  }),
  http.get('/api/jobs/1/applicants', () => {
    return HttpResponse.json([{ applicationId: 1, candidate: { firstName: 'John', lastName: 'Doe' }, profile: { skills: ['React'] } }]);
  }),
  http.post('/api/jobs', () => {
    return HttpResponse.json({ id: 2, title: 'New Job', company: 'Test Co' });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const queryClient = new QueryClient();

const renderComponent = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <TalentOwnerDashboard />
    </QueryClientProvider>
  );
};

describe('TalentOwnerDashboard', () => {
  it('renders loading state initially', () => {
    renderComponent();
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('fetches and displays job postings', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/Software Engineer/i)).toBeInTheDocument();
    });
  });

  it('opens the new job dialog', async () => {
    renderComponent();
    userEvent.click(screen.getByText(/Post New Job/i));
    await waitFor(() => {
      expect(screen.getByText(/Post New Job - Advanced Job Posting/i)).toBeInTheDocument();
    });
  });

  it('fetches and displays applicants when a job is selected', async () => {
    renderComponent();
    await waitFor(() => {
      userEvent.click(screen.getByText(/View Applicants/i));
    });
    await waitFor(() => {
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    });
  });
});
