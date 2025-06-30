const express = require('express');
const path = require('path');
const { createServer } = require('http');
const fs = require('fs');
const { registerRoutes } = require('./server/routes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith('/api')) {
      console.log(`${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`);
    }
  });
  
  next();
});

async function startServer() {
  try {
    console.log('🚀 Starting production server...');
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Port:', PORT);
    
    await registerRoutes(app);
    
    app.use(express.static(__dirname));
    
    app.get('*', (req, res) => {
      const indexPath = path.join(__dirname, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.send('<h1>Recrutas - AI Job Matching Platform</h1><p>Server is running successfully!</p>');
      }
    });
    
    app.use((err, req, res, next) => {
      console.error('Server error:', err);
      res.status(500).json({ message: 'Internal Server Error' });
    });
    
    const httpServer = createServer(app);
    
    httpServer.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.log(`Port ${PORT} is in use, trying port ${PORT + 1}...`);
        httpServer.listen(PORT + 1, '0.0.0.0', () => {
          console.log(`🚀 Server running on port ${PORT + 1}`);
          console.log(`📡 Accessible at http://0.0.0.0:${PORT + 1}`);
        });
      } else {
        console.error('Server error:', error);
        process.exit(1);
      }
    });
    
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Accessible at http://0.0.0.0:${PORT}`);
      console.log('✅ Server started successfully');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

startServer();
