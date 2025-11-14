import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import CandidateDashboard from '../pages/candidate-dashboard-streamlined';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';

const server = setupServer(
  http.get('/api/candidate/profile', () => {
    return HttpResponse.json({ name: 'John Doe', skills: ['React'] });
  }),
  http.get('/api/candidate/applications', () => {
    return HttpResponse.json([{ id: 1, jobTitle: 'React Developer', company: 'Test Co', status: 'Applied' }]);
  }),
  http.get('/api/candidate/recommendations', () => {
    return HttpResponse.json([{ id: 1, title: 'Vue Developer', company: 'Test Co' }]);
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const queryClient = new QueryClient();

const renderComponent = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <CandidateDashboard />
    </QueryClientProvider>
  );
};

describe('CandidateDashboard', () => {
  it('renders loading state initially', () => {
    renderComponent();
    expect(screen.getByText(/Loading your dashboard.../i)).toBeInTheDocument();
  });

  it('fetches and displays profile information', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    });
  });

  it('fetches and displays applications', async () => {
    renderComponent();
    userEvent.click(screen.getByText(/Applications/i));
    await waitFor(() => {
      expect(screen.getByText(/React Developer/i)).toBeInTheDocument();
    });
  });

  it('fetches and displays recommendations', async () => {
    renderComponent();
    userEvent.click(screen.getByText(/Job Feed/i));
    await waitFor(() => {
      expect(screen.getByText(/Vue Developer/i)).toBeInTheDocument();
    });
  });
});
