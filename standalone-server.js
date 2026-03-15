import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import { createServer } from "http";
import { configureApp } from "./server/index.ts";
import { WebSocketServer } from "ws";
import { notificationService } from "./server/notification-service.js";
import { client } from "./server/db.js";

const port = process.env.NODE_ENV === 'test' ? 5001 : 5000;

console.error(`[standalone-server] Loaded VITE_SUPABASE_URL: ${process.env.VITE_SUPABASE_URL ? 'YES' : 'NO'}`);
console.error(`[standalone-server] Loaded SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'YES' : 'NO'}`);

console.error(`[standalone-server] Attempting to configure and start server on port ${port}...`);

// Catch unhandled promise rejections — prevents silent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('[standalone-server] Unhandled Rejection:', reason);
});

// Catch uncaught exceptions — log and exit (process is in undefined state)
process.on('uncaughtException', (error) => {
  console.error('[standalone-server] Uncaught Exception:', error);
  process.exit(1);
});

configureApp().then(app => {
  console.error('[standalone-server] App configured successfully. Creating HTTP server...');
  const server = createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname === '/ws') {
      // Verify JWT token before accepting WebSocket connection
      const userId = notificationService.verifyWebSocketToken(request);
      if (!userId) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }
      wss.handleUpgrade(request, socket, head, (ws) => {
        notificationService.addConnection(userId, ws);
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws, req) => {
    ws.on('message', (message) => {
      console.log('received: %s', message);
    });
  });

  console.error('[standalone-server] Starting WebSocket heartbeat...');
  notificationService.startHeartbeat();

  server.listen(port, () => {
    console.log(`🚀 Server listening at http://localhost:${port}`);
    console.error(`[standalone-server] Server is listening on port ${port}`);
  });

  const gracefulShutdown = () => {
    console.error('\n[standalone-server] Shutting down gracefully...');

    // Stop WebSocket heartbeat and close connections
    notificationService.stopHeartbeat();
    wss.clients.forEach(ws => ws.close());

    server.close(() => {
      console.error('[standalone-server] HTTP server closed.');
      client.end().then(() => {
        console.error('[standalone-server] Database connection closed.');
        process.exit(0);
      });
    });

    // Force exit after 10 seconds if graceful shutdown stalls
    setTimeout(() => {
      console.error('[standalone-server] Forced shutdown after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);

}).catch(error => {
  console.error("[standalone-server] Failed to configure and start the server:", error);
  process.exit(1);
});