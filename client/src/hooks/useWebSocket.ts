import { useEffect, useRef, useState } from "react";

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
      };

      socket.onclose = () => {
        setIsConnected(false);
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      return () => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.close();
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
  };
}
