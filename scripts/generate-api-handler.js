import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiHandlerContent = `// Vercel serverless function handler
// Imports compiled JavaScript from dist/server

export default async function handler(req, res) {
  try {
    const { configureApp } = await import('../dist/server/index.js');
    const app = await configureApp();

    // Handle the request with Express
    return new Promise((resolve, reject) => {
      let responseSent = false;

      const originalEnd = res.end;
      res.end = function(...args) {
        responseSent = true;
        originalEnd.apply(res, args);
        resolve(undefined);
      };

      app(req, res, (err) => {
        if (err) {
          console.error('Express app error:', err);
          if (!responseSent) {
            res.status(500).json({ error: 'Internal Server Error', message: err.message });
          }
          reject(err);
        } else if (!responseSent) {
          resolve(undefined);
        }
      });

      setTimeout(() => {
        if (!responseSent) {
          console.error('Request timeout');
          res.status(504).json({ error: 'Request timeout' });
          resolve(undefined);
        }
      }, 50000);
    });
  } catch (error) {
    console.error('Handler error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
}
`;

const apiDir = path.join(__dirname, '..', 'api');
const apiFile = path.join(apiDir, 'index.js');

// Ensure api directory exists
if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir, { recursive: true });
}

// Write the file
fs.writeFileSync(apiFile, apiHandlerContent, 'utf8');
console.log('Generated api/index.js successfully');
