import { configureApp } from '../server/index.js';

let appInstance = null;

// Initialize the app once (module-level initialization)
const getApp = async () => {
  if (!appInstance) {
    appInstance = await configureApp();
  }
  return appInstance;
};

// Export handler for Vercel - properly wrap Express app
export default async function handler(req, res) {
  try {
    const app = await getApp();
    
    // Ensure proper handling of the Express app
    // Express apps are callable, but we need to wrap in a promise
    // to ensure Vercel waits for the response
    return new Promise((resolve, reject) => {
      // Set a flag to track if response was sent
      let responseSent = false;
      
      // Wrap res.end to know when response is complete
      const originalEnd = res.end;
      res.end = function(...args) {
        responseSent = true;
        originalEnd.apply(res, args);
        resolve();
      };
      
      // Call the Express app
      app(req, res, (err) => {
        if (err) {
          console.error('Express app error:', err);
          if (!responseSent) {
            res.status(500).json({ error: 'Internal Server Error' });
          }
          reject(err);
        } else if (!responseSent) {
          // If no error but response not sent, resolve anyway
          resolve();
        }
      });
      
      // Timeout after 50 seconds (Vercel limit is 60s)
      setTimeout(() => {
        if (!responseSent) {
          console.error('Request timeout');
          res.status(504).json({ error: 'Request timeout' });
          resolve();
        }
      }, 50000);
    });
  } catch (error) {
    console.error('API Handler Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  }
}
