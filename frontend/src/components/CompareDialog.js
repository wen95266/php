import React from "react";
import CardZone from "./CardZone";

// 田字型2x2布局
function gridPosition(idx) {
  // 0 1
  // 2 3
  return [
    { gridRow: 1, gridColumn: 1 },
    { gridRow: 1, gridColumn: 2 },
    { gridRow: 2, gridColumn: 1 },
    { gridRow: 2, gridColumn: 2 },
  ][idx] || {};
}

export default function CompareDialog({ players, splits, scores, onClose }) {
  // players: ["玩家", "AI-1", ...]
  // splits: { 玩家: [[3],[5],[5]], ... }
  // scores: { 玩家: 12, ... }
  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 9999,
      background: "rgba(44,48,60,0.91)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <div style={{
        width: "90vw", height: "90vh",
        background: "#fff",
        borderRadius: 16,
        boxShadow: "0 12px 48px #3336",
        display: "grid",
        gridTemplateRows: "1fr 1fr",
        gridTemplateColumns: "1fr 1fr",
        gap: "32px",
        padding: "32px",
        position: "relative"
      }}>
        {players.map((name, i) => (
          <div key={name}
            style={{
              ...gridPosition(i),
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-start",
              border: "2px solid #3869f6",
              borderRadius: 10,
              background: "#f9fafb",
              boxShadow: "0 1px 6px #3869f61a",
              padding: "12px"
            }}>
            <div style={{ fontWeight: 700, fontSize: 21, color: "#3869f6", marginBottom: 6 }}>
              {name}
              <span style={{ fontWeight: 400, fontSize: 16, marginLeft: 14, color: "#444" }}>
                分数: {scores?.[name] ?? 0}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", alignItems: "center" }}>
              <CardZone cards={splits[name]?.[0] || []} maxCards={3} label="头道" stacked fixedCardHeight={60} style={{ background: "none", border: "none", height: 70, minHeight: 70 }} />
              <CardZone cards={splits[name]?.[1] || []} maxCards={5} label="中道" stacked fixedCardHeight={60} style={{ background: "none", border: "none", height: 70, minHeight: 70 }} />
              <CardZone cards={splits[name]?.[2] || []} maxCards={5} label="尾道" stacked fixedCardHeight={60} style={{ background: "none", border: "none", height: 70, minHeight: 70 }} />
            </div>
          </div>
        ))}
        <button onClick={onClose}
          style={{
            position: "absolute", top: 18, right: 26, fontSize: 19, padding: "7px 20px",
            border: "none", borderRadius: 5, background: "#3869f6", color: "#fff", fontWeight: 600, cursor: "pointer"
          }}
        >关闭</button>
      </div>
    </div>
  );
}
