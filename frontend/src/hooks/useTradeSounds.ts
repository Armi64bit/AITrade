import { useEffect, useRef } from "react";
import type { Trade } from "../api/client";
import { playTradeOpen, playTradeWin, playTradeLoss } from "../utils/sounds";

export function useTradeSounds(trades: Trade[]) {
  const prevLen = useRef(0);

  useEffect(() => {
    if (trades.length <= prevLen.current) {
      prevLen.current = trades.length;
      return;
    }
    const newTrades = trades.slice(prevLen.current);
    prevLen.current = trades.length;
    for (const t of newTrades) {
      if (t.status === "closed" && t.pnl != null) {
        if (t.pnl >= 0) playTradeWin();
        else playTradeLoss();
      } else {
        playTradeOpen();
      }
    }
  }, [trades]);
}
