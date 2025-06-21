import { WebSocket, WebSocketServer } from 'ws';

interface ExtendedWebSocket extends WebSocket {
  userId?: string;
  roomId?: number;
}

let wss: WebSocketServer;

export function initializeNotifications(server: any) {
  wss = new WebSocketServer({ server, path: '/ws' });
  
  wss.on('connection', (ws: ExtendedWebSocket) => {
    console.log('Client connected to WebSocket');
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'join') {
          ws.userId = data.userId;
        } else if (data.type === 'join_room') {
          ws.roomId = data.roomId;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });
  });
}

export function sendNotification(userId: string, notification: any) {
  if (!wss) return;
  
  wss.clients.forEach((client: ExtendedWebSocket) => {
    if (client.readyState === WebSocket.OPEN && client.userId === userId) {
      client.send(JSON.stringify(notification));
    }
  });
}

export function sendRoomMessage(roomId: number, message: any) {
  if (!wss) return;
  
  wss.clients.forEach((client: ExtendedWebSocket) => {
    if (client.readyState === WebSocket.OPEN && client.roomId === roomId) {
      client.send(JSON.stringify(message));
    }
  });
}