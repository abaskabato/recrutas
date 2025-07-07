# Frontend Debugging on Vercel

## 1. Browser Developer Tools (Primary Method)

### Console Debugging
- **Open DevTools**: F12 or right-click → "Inspect"
- **Console Tab**: See JavaScript errors, network failures, authentication issues
- **Network Tab**: Monitor API calls, check response status codes
- **Application Tab**: Check cookies, localStorage, session storage

### Authentication-Specific Debugging
- **Network Tab**: Look for `/api/auth/*` requests
- **Check Response Headers**: Look for `Set-Cookie` headers
- **Application → Cookies**: Verify auth cookies are being set
- **Console**: Check for CORS errors or authentication failures

## 2. Vercel Function Logs

### Real-time Logs
```bash
# Install Vercel CLI
npm i -g vercel

# Login and link project
vercel login
vercel link

# View real-time logs
vercel logs --follow
```

### Deployment Logs
- Go to Vercel Dashboard → Project → Functions tab
- Click on any function to see execution logs
- Check for 500 errors and stack traces

## 3. Add Debug Logging

### Frontend Debug Headers
```javascript
// Add to auth-client.ts or API calls
fetchOptions: {
  onRequest: (context) => {
    console.log('Request:', context.request.url, context.request.method);
  },
  onResponse: (context) => {
    console.log('Response:', context.response.status, context.response.headers);
  },
  onError: (context) => {
    console.error('Error:', context.error, context.response?.status);
  }
}
```

### Backend Debug Endpoint
```javascript
// Add to api/index.js
app.get('/api/debug/auth', (req, res) => {
  res.json({
    cookies: req.headers.cookie,
    headers: req.headers,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});
```

## 4. Environment-Specific Debugging

### Check Environment Variables
```javascript
// Frontend: Check if env vars are available
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);

// Backend: Check if secrets are loaded
console.log('Has DATABASE_URL:', !!process.env.DATABASE_URL);
console.log('Has BETTER_AUTH_SECRET:', !!process.env.BETTER_AUTH_SECRET);
```

### Production vs Development
```javascript
// Different behavior based on environment
if (import.meta.env.PROD) {
  // Production-specific debugging
  console.log('Production mode');
} else {
  // Development debugging
  console.log('Development mode');
}
```

## 5. Quick Debug Commands

### Test Authentication Endpoints
```bash
# Test sign-up
curl -X POST "https://recrutas.vercel.app/api/auth/sign-up/email" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test"}' \
  -i

# Test session
curl -s "https://recrutas.vercel.app/api/auth/session" -i
```

### Check Response Headers
```bash
# Check CORS headers
curl -I "https://recrutas.vercel.app/api/auth/session"

# Check cookies
curl -c cookies.txt "https://recrutas.vercel.app/api/auth/session"
```

## Current Auth Issue Debug Steps

1. **Open https://recrutas.vercel.app/auth**
2. **Open DevTools → Network tab**
3. **Try to sign up with real email**
4. **Check the `/api/auth/sign-up/email` request**:
   - Status code (should be 200, not 500)
   - Response headers (look for `Set-Cookie`)
   - Response body (check for error messages)
5. **Check Console for JavaScript errors**
6. **Check Application → Cookies for auth tokens**

## Common Issues & Solutions

- **500 Errors**: Check Vercel function logs
- **CORS Issues**: Check `Access-Control-Allow-Origin` headers
- **Cookie Issues**: Check `Set-Cookie` headers and domain settings
- **Network Failures**: Check if API endpoints are accessible
- **Environment Variables**: Verify in Vercel dashboard settings