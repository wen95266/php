import React from "react";

// 简单美观的比牌弹窗
export default function CompareDialog({ players, splits, scores, details, onClose }) {
  return (
    <div style={{
      position: "fixed",
      left: 0, top: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.32)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 10,
        minWidth: 340,
        maxWidth: 540,
        padding: "32px 28px 18px 28px",
        boxShadow: "0 8px 32px #0003",
        position: "relative"
      }}>
        <div style={{
          fontSize: 22,
          fontWeight: 600,
          marginBottom: 20,
          color: "#3869f6",
          textAlign: "center"
        }}>
          比牌结果
        </div>
        <table style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: 18
        }}>
          <thead>
            <tr style={{background:"#f6f8fa"}}>
              <th style={{padding: "5px 8px"}}>玩家</th>
              <th style={{padding: "5px 8px"}}>头道</th>
              <th style={{padding: "5px 8px"}}>中道</th>
              <th style={{padding: "5px 8px"}}>尾道</th>
              <th style={{padding: "5px 8px"}}>总分</th>
              <th style={{padding: "5px 8px"}}>打枪</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, idx) => (
              <tr key={p} style={{background: idx%2===0 ? "#fff" : "#f8faff"}}>
                <td style={{padding: "6px 8px", fontWeight: 500, color: "#222"}}>{p}</td>
                <td style={{padding: "6px 8px", color: "#444"}}>
                  {(details && details[p] && details[p]["牌型"]) ? details[p]["牌型"][0] : ""}
                  {splits && splits[p] ? (
                    <div style={{fontSize:12, color:"#888"}}>
                      {splits[p][0].map(c => c.value + c.suit[0].toUpperCase()).join(" ")}
                    </div>
                  ) : ""}
                </td>
                <td style={{padding: "6px 8px", color: "#444"}}>
                  {(details && details[p] && details[p]["牌型"]) ? details[p]["牌型"][1] : ""}
                  {splits && splits[p] ? (
                    <div style={{fontSize:12, color:"#888"}}>
                      {splits[p][1].map(c => c.value + c.suit[0].toUpperCase()).join(" ")}
                    </div>
                  ) : ""}
                </td>
                <td style={{padding: "6px 8px", color: "#444"}}>
                  {(details && details[p] && details[p]["牌型"]) ? details[p]["牌型"][2] : ""}
                  {splits && splits[p] ? (
                    <div style={{fontSize:12, color:"#888"}}>
                      {splits[p][2].map(c => c.value + c.suit[0].toUpperCase()).join(" ")}
                    </div>
                  ) : ""}
                </td>
                <td style={{padding: "6px 8px", fontWeight: 600, color: "#3869f6"}}>{scores && scores[p]}</td>
                <td style={{padding: "6px 8px", color: "#e67e22"}}>
                  {(details && details[p] && details[p]["打枪"]) ? details[p]["打枪"] : 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{textAlign:"center", marginBottom:8}}>
          <button onClick={onClose}
            style={{
              background: "#3869f6",
              color: "#fff",
              fontSize: 18,
              border: "none",
              borderRadius: 6,
              padding: "8px 40px",
              fontWeight: 500,
              cursor: "pointer"
            }}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
