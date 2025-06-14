import React from "react";

export default function ControlBar({
  handleAiSplit,
  handleSubmit,
  aiDisabled,
  submitDisabled,
  submitted
}) {
  return (
    <div style={{
      width: "100vw",
      minHeight: "16vh",
      border: "none",
      background: "#f2f6fa",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <button
        style={{ fontSize: 18, padding: "8px 32px", marginRight: 30, borderRadius: 8 }}
        onClick={handleAiSplit}
        disabled={aiDisabled}
      >AI智能分牌</button>
      <button
        style={{ fontSize: 18, padding: "8px 32px", borderRadius: 8 }}
        onClick={handleSubmit}
        disabled={submitDisabled}
      >提交牌型</button>
      {submitted && <span style={{ marginLeft: 24, color: "#65a30d", fontWeight: 500 }}>已提交，等待其它玩家...</span>}
    </div>
  );
}
