import { WebSocket, WebSocketServer } from 'ws';
let wss;
export function initializeNotifications(server) {
    wss = new WebSocketServer({ server, path: '/ws' });
    wss.on('connection', (ws) => {
        console.log('Client connected to WebSocket');
        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message.toString());
                if (data.type === 'join') {
                    ws.userId = data.userId;
                }
                else if (data.type === 'join_room') {
                    ws.roomId = data.roomId;
                }
            }
            catch (error) {
                console.error('WebSocket message error:', error);
            }
        });
        ws.on('close', () => {
            console.log('Client disconnected from WebSocket');
        });
    });
}
export function sendNotification(userId, notification) {
    if (!wss)
        return;
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client.userId === userId) {
            client.send(JSON.stringify({
                type: 'notification',
                ...notification
            }));
        }
    });
}
export function sendJobMatchNotification(userId, jobMatch) {
    const notification = {
        type: 'job_match',
        title: 'New Job Match Found!',
        message: `${jobMatch.confidenceLevel}% match: ${jobMatch.job.title} at ${jobMatch.job.company}`,
        data: jobMatch,
        timestamp: new Date().toISOString()
    };
    sendNotification(userId, notification);
}
export function sendApplicationStatusUpdate(userId, application) {
    const statusMessages = {
        viewed: 'Your application has been viewed',
        interested: 'Employer is interested in your profile',
        interview: 'Interview scheduled',
        offer: 'Congratulations! You received an offer',
        rejected: 'Application was not selected'
    };
    const notification = {
        type: 'application_update',
        title: 'Application Update',
        message: `${statusMessages[application.status]} - ${application.job.title} at ${application.job.company}`,
        data: application,
        timestamp: new Date().toISOString()
    };
    sendNotification(userId, notification);
}
export function sendRoomMessage(roomId, message) {
    if (!wss)
        return;
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client.roomId === roomId) {
            client.send(JSON.stringify(message));
        }
    });
}
