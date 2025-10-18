import { createServer } from "http";
import { configureApp } from "./server/index.js";
import { WebSocketServer } from "ws";
import { notificationService } from "./server/notification-service.js";

const port = 5000;

configureApp().then(app => {
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

  notificationService.startHeartbeat();

  server.listen(port, () => {
    console.log(`🚀 Server listening at http://localhost:${port}`);
  });
}).catch(error => {
  console.error("Failed to configure and start the server:", error);
  process.exit(1);
});
