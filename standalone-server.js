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

configureApp().then(app => {
  console.error('[standalone-server] App configured successfully. Creating HTTP server...');
  const server = createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        const userId = url.searchParams.get('userId');
        if (userId) {
          notificationService.addConnection(userId, ws);
        }
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
    server.close(() => {
      console.error('[standalone-server] HTTP server closed.');
      client.end().then(() => {
        console.error('[standalone-server] Database connection closed.');
        process.exit(0);
      });
    });
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);

}).catch(error => {
  console.error("[standalone-server] Failed to configure and start the server:", error);
  process.exit(1);
});