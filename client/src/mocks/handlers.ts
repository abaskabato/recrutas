import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/candidate/profile', () => {
    return HttpResponse.json({
      name: 'John Doe',
      skills: ['React', 'TypeScript'],
      experience: '5 years',
    });
  }),

  http.get('/api/candidate/applications', () => {
    return HttpResponse.json([
      { id: 1, jobTitle: 'Frontend Developer', company: 'Tech Corp', status: 'Applied' },
      { id: 2, jobTitle: 'Backend Developer', company: 'Data Inc', status: 'Under Review' },
    ]);
  }),

  http.get('/api/candidate/recommendations', () => {
    return HttpResponse.json([
      { id: 1, title: 'Full Stack Developer', company: 'Innovate LLC' },
      { id: 2, title: 'React Native Developer', company: 'Mobile First' },
    ]);
  }),

  http.get('/api/talent-owner/jobs', () => {
    return HttpResponse.json([
      { id: 1, title: 'Software Engineer', company: 'My Company' },
    ]);
  }),

  http.post('/api/jobs', () => {
    return HttpResponse.json({ id: 2, title: 'New Job', company: 'My Company' });
  }),

  http.get('/api/candidates/stats', () => {
    return HttpResponse.json({
      newMatches: 5,
      profileViews: 10,
      activeChats: 2,
      applicationsPending: 3,
      applicationsRejected: 1,
      applicationsAccepted: 0,
    });
  }),

  http.get('/api/candidates/activity', () => {
    return HttpResponse.json([
      { id: 1, type: 'match', description: 'New match for React Developer', createdAt: new Date().toISOString() },
    ]);
  }),

  http.get('/api/recruiter/stats', () => {
    return HttpResponse.json({
      activeJobs: 2,
      totalMatches: 10,
      activeChats: 3,
      hires: 1,
    });
  }),

  http.get('/api/recruiter/candidates', () => {
    return HttpResponse.json([
      { id: 1, firstName: 'Jane', lastName: 'Doe', email: 'jane@doe.com', skills: ['Node.js'], experience: '3 years', matchScore: 80, status: 'screening', appliedAt: new Date().toISOString() },
    ]);
  }),
];
