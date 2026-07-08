import { useEffect, useRef, useState } from "react";
import type { BotStatus } from "../api/client";

export function useWebSocket() {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    function connect() {
      const proto = location.protocol === "https:" ? "wss:" : "ws:";
      const url = `${proto}//${location.host}/ws`;
      ws.current = new WebSocket(url);
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
