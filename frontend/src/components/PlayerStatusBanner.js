import React from "react";

function getStatusString(status, results, myName, allPlayers) {
  if (status === "finished" && results) {
    let arr = [];
    for (let player in results["总分"]) {
      let score = results["总分"][player];
      let hit = results["详情"][player]["打枪"] || 0;
      arr.push(
        `${player}${player === myName ? "(你)" : ""}：${score}分${hit ? `（打枪${hit}次）` : ""}`
      );
    }
    return arr.join("　");
  }
  if (status === "playing") {
    return "对局进行中... " + (allPlayers || []).join("、");
  }
  if (status === "waiting") {
    return "等待玩家准备... " + (allPlayers || []).join("、");
  }
  return "";
}

export default function PlayerStatusBanner({ status, results, myName, allPlayers, style }) {
  return (
    <div style={{
      width: "100vw",
      minHeight: "16vh",
      boxSizing: "border-box",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderBottom: "1px solid #eee",
      background: "#3869f6",
      color: "#fff",
      fontWeight: 500,
      fontSize: 22,
      ...(style || {})
    }}>
      <span>
        {getStatusString(status, results, myName, allPlayers)}
      </span>
    </div>
  );
}
