# Contributing to Recrutas

Thank you for your interest in contributing to Recrutas! This guide will help you get started with contributing to our AI-powered talent acquisition platform.

## 🚀 Quick Start

1. **Fork and Clone**
   ```bash
   git clone https://github.com/yourusername/recrutas.git
   cd recrutas
   npm install
   ```

2. **Set Up Development Environment**
   ```bash
   cp .env.example .env
   # Add your database URL and API keys
   npm run db:push
   npm run dev
   ```

3. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 🛠️ Development Guidelines

### Code Style

- **TypeScript**: Use strict typing throughout the codebase
- **ESLint**: Follow the configured ESLint rules
- **Prettier**: Code formatting is handled automatically
- **Naming**: Use descriptive variable and function names
- **Components**: Create reusable, well-documented components

### Architecture Principles

- **Frontend**: React components should be functional with hooks
- **Backend**: Keep API routes thin, business logic in services
- **Database**: Use Drizzle ORM for all database operations
- **Types**: Share types between frontend and backend via `shared/schema.ts`

### Testing

- Write unit tests for utility functions
- Create integration tests for API endpoints
- Test React components with React Testing Library
- Maintain >80% code coverage

## 📝 Areas for Contribution

### High Priority
- **AI Matching Improvements**: Enhance the semantic matching algorithm
- **Job Scraper Optimization**: Add support for more job boards
- **Real-time Features**: Improve WebSocket performance
- **Mobile Responsiveness**: Enhance mobile experience
- **Accessibility**: Improve WCAG compliance

### Medium Priority
- **Analytics Dashboard**: Advanced hiring insights
- **Integration APIs**: Connect with popular ATS systems
- **Email Templates**: Professional notification templates
- **Internationalization**: Multi-language support

### Documentation
- API documentation improvements
- Component documentation with Storybook
- Deployment guides for various platforms
- Video tutorials and examples

## 🔧 Technical Stack

### Frontend
```typescript
// Example component structure
export function JobCard({ job }: { job: JobPosting }) {
  const { mutate: applyToJob } = useApplyToJob();
  
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle>{job.title}</CardTitle>
        <CardDescription>{job.company}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={() => applyToJob(job.id)}>
          Apply Now
        </Button>
      </CardContent>
    </Card>
  );
}
```

### Backend
```typescript
// Example API route structure
app.post('/api/jobs/:id/apply', isAuthenticated, async (req, res) => {
  try {
    const application = await storage.createApplication({
      candidateId: req.user.id,
      jobId: parseInt(req.params.id),
      status: 'pending'
    });
    
    res.json(application);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 📋 Pull Request Process

### Before Submitting

1. **Run Quality Checks**
   ```bash
   npm run type-check    # TypeScript compilation
   npm run lint         # ESLint checks
   npm run test         # Unit tests
   ```

2. **Update Documentation**
   - Update README.md for new features
   - Add JSDoc comments for functions
   - Update API documentation if needed

3. **Test Thoroughly**
   - Test on multiple browsers
   - Verify mobile responsiveness
   - Check database migrations work correctly

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes
```

## 🐛 Bug Reports

### Before Submitting
1. Check existing issues
2. Reproduce the bug consistently
3. Test with latest version

### Bug Report Template
```markdown
**Bug Description**
Clear description of the bug

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What should happen

**Environment**
- OS: [e.g. macOS, Windows, Linux]
- Browser: [e.g. Chrome, Firefox, Safari]
- Version: [e.g. 1.0.0]
```

## 💡 Feature Requests

We welcome feature requests! Please:

1. Check if the feature already exists
2. Describe the problem it solves
3. Provide detailed use cases
4. Consider implementation complexity

## 🚦 Development Workflow

### Git Workflow
```bash
# Update your fork
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/amazing-feature

# Make changes and commit
git add .
git commit -m "feat: add amazing feature"

# Push and create PR
git push origin feature/amazing-feature
```

### Commit Message Convention
```
type(scope): description

feat: add new job matching algorithm
fix: resolve authentication bug
docs: update API documentation
style: format code with prettier
refactor: simplify job aggregation logic
test: add unit tests for matching engine
```

## 🌟 Recognition

Contributors will be:
- Listed in the README.md
- Mentioned in release notes
- Invited to contributor discussions
- Eligible for contributor rewards

## 📞 Getting Help

- **Discord**: [Join our community](https://discord.gg/recrutas)
- **Issues**: [GitHub Issues](https://github.com/yourusername/recrutas/issues)
- **Email**: dev@recrutas.com

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for helping make Recrutas the best open-source talent acquisition platform!** 🚀