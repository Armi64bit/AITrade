import { useEffect, useRef, useState } from "react";
import type { BotStatus } from "../api/client";

const WS_URL = "wss://aitrade-production-ecba.up.railway.app/ws";

export function useWebSocket() {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    function connect() {
      ws.current = new WebSocket(WS_URL);
      ws.current.onmessage = (e) => {
        try {
          setStatus(JSON.parse(e.data));
        } catch {}
      };
      ws.current.onclose = () => setTimeout(connect, 2000);
    }
    connect();
    return () => ws.current?.close();
  }, []);

  return status;
}
