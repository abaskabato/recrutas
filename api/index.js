// Vercel serverless function handler
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
