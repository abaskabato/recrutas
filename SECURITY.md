# Security Policy

## Reporting Security Vulnerabilities

We take the security of Recrutas seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please email us at: **security@recrutas.com**

Include the following information:
- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Any suggested fixes or mitigations

### Response Timeline

- **Acknowledgment**: Within 24 hours
- **Initial Assessment**: Within 72 hours
- **Status Updates**: Every 7 days until resolved
- **Fix Deployment**: Target within 30 days for critical issues

### Vulnerability Disclosure

We follow responsible disclosure practices:

1. We will acknowledge receipt of your report
2. We will assess and validate the vulnerability
3. We will develop and test a fix
4. We will deploy the fix to production
5. We will publicly disclose the vulnerability after users have had time to update

### Security Measures

## Authentication & Authorization

- **Session Management**: Secure session handling with Better Auth
- **Password Security**: Bcrypt hashing with salt rounds
- **Role-Based Access**: Granular permissions system
- **API Authentication**: Session-based authentication for all protected endpoints

## Data Protection

- **Input Validation**: Zod schemas for all user inputs
- **SQL Injection Prevention**: Parameterized queries with Drizzle ORM
- **XSS Protection**: Content Security Policy headers
- **CSRF Protection**: Built-in Express.js CSRF middleware

## Infrastructure Security

- **HTTPS Enforcement**: All traffic encrypted in production
- **Environment Variables**: Sensitive data stored securely
- **Rate Limiting**: Protection against brute force attacks
- **Error Handling**: No sensitive information in error responses

## Database Security

- **Connection Security**: Encrypted database connections
- **Access Control**: Limited database user permissions
- **Backup Encryption**: Encrypted database backups
- **Audit Logging**: Database activity monitoring

## API Security

```typescript
// Rate limiting example
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', apiLimiter);
```

## Security Headers

```typescript
// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});
```

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Security Best Practices for Contributors

### Code Review Requirements

- All security-related changes require review by maintainers
- Automated security scans must pass
- No hardcoded secrets or credentials
- Input validation for all user-facing endpoints

### Development Security

- Use environment variables for sensitive configuration
- Never commit secrets to version control
- Keep dependencies updated
- Follow secure coding practices

### Testing Security

```typescript
// Example security test
describe('Authentication', () => {
  it('should reject requests without valid session', async () => {
    const response = await request(app)
      .get('/api/protected-endpoint')
      .expect(401);
  });
  
  it('should sanitize user input', async () => {
    const maliciousInput = '<script>alert("xss")</script>';
    const response = await request(app)
      .post('/api/user/profile')
      .send({ bio: maliciousInput })
      .expect(400);
  });
});
```

## Security Checklist for Deployment

- [ ] HTTPS configured and enforced
- [ ] Environment variables properly set
- [ ] Database connections encrypted
- [ ] Rate limiting configured
- [ ] Security headers implemented
- [ ] Error handling doesn't leak sensitive info
- [ ] Input validation on all endpoints
- [ ] Authentication working correctly
- [ ] Authorization checks in place
- [ ] Logging configured for security events

## Common Vulnerabilities to Avoid

### SQL Injection
```typescript
// ❌ BAD - SQL injection vulnerable
const query = `SELECT * FROM users WHERE id = ${userId}`;

// ✅ GOOD - Using parameterized queries
const user = await db.select().from(users).where(eq(users.id, userId));
```

### XSS (Cross-Site Scripting)
```typescript
// ❌ BAD - Unescaped user input
<div dangerouslySetInnerHTML={{__html: userInput}} />

// ✅ GOOD - Escaped content
<div>{userInput}</div>
```

### Authentication Bypass
```typescript
// ❌ BAD - No authentication check
app.get('/api/admin/users', (req, res) => {
  // Direct access to sensitive data
});

// ✅ GOOD - Proper authentication
app.get('/api/admin/users', isAuthenticated, isAdmin, (req, res) => {
  // Protected endpoint
});
```

## Incident Response

In case of a security incident:

1. **Immediate Response**
   - Assess the scope and impact
   - Contain the threat if possible
   - Document all actions taken

2. **Communication**
   - Notify affected users promptly
   - Provide clear information about the incident
   - Offer guidance on protective actions

3. **Recovery**
   - Implement fixes to prevent recurrence
   - Monitor for additional threats
   - Update security measures as needed

4. **Post-Incident**
   - Conduct thorough analysis
   - Update security procedures
   - Share lessons learned with the team

## External Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express.js Security](https://expressjs.com/en/advanced/best-practice-security.html)
- [React Security](https://snyk.io/blog/10-react-security-best-practices/)

## Contact Information

For security-related questions or concerns:
- **Email**: security@recrutas.com
- **Response Time**: Within 24 hours
- **Emergency Contact**: Available for critical vulnerabilities

---

**Last Updated**: June 29, 2025

We appreciate the security research community's efforts to improve the security of our platform. Responsible disclosure helps us protect our users and improve our security posture.