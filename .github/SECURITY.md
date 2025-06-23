# Security Policy

## Supported Versions

We take security seriously at Recrutas. The following versions are currently supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in Recrutas, please report it responsibly:

### How to Report
- **Email**: security@recrutas.com
- **Subject**: Security Vulnerability Report
- **Response Time**: We aim to respond within 24 hours

### What to Include
- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Any suggested fixes (optional)

### What to Expect
1. **Acknowledgment**: Within 24 hours
2. **Initial Assessment**: Within 72 hours
3. **Status Updates**: Every 7 days until resolved
4. **Resolution Timeline**: Critical issues within 7 days, others within 30 days

### Responsible Disclosure
- Please do not publicly disclose the vulnerability until we've had a chance to fix it
- We will credit security researchers who responsibly report vulnerabilities
- We may offer bug bounties for significant security findings

### Security Measures in Place
- All API endpoints use input validation
- Database queries use parameterized statements (Drizzle ORM)
- Session management with secure cookies
- HTTPS encryption in production
- Regular dependency security audits

Thank you for helping keep Recrutas secure!