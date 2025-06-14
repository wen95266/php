import React from "react";

// 扑克牌横向堆叠
function CardRow({ cards, size = 38 }) {
  const cardW = size, cardH = Math.round(size * 1.38), overlap = Math.round(cardW * 0.46);
  return (
    <div style={{
      position: "relative",
      width: cardW + (cards.length - 1) * overlap,
      height: cardH,
      display: "inline-block",
      verticalAlign: "middle"
    }}>
      {cards.map((card, i) => {
        let v = card.value;
        if (v === "A") v = "ace";
        if (v === "K") v = "king";
        if (v === "Q") v = "queen";
        if (v === "J") v = "jack";
        return (
          <img
            key={i}
            src={`/cards/${v}_of_${card.suit}.svg`}
            alt={card.value + card.suit[0].toUpperCase()}
            style={{
              position: "absolute",
              left: i * overlap,
              top: 0,
              width: cardW,
              height: cardH,
              borderRadius: 3,
              boxShadow: "0 1px 3px #0001",
              background: "#fff",
              zIndex: i
            }}
            draggable={false}
          />
        );
      })}
    </div>
  );
}

// 玩家卡片 横排三道
function PlayerResultCard({ player, splits, details, scores }) {
  if (!player || !splits || !splits[player]) return null;
  return (
    <div style={{
      minWidth: 370,
      minHeight: 185,
      background: "#f8faff",
      borderRadius: 16,
      boxShadow: "0 1px 10px #0001",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "18px 12px 10px 12px",
      margin: 0
    }}>
      <div style={{ fontWeight: 700, color: "#333", fontSize: 19, marginBottom: 6 }}>{player}</div>
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 9,
        alignItems: "flex-start",
        marginBottom: 8
      }}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <CardRow cards={splits[player][0]} size={38} />
          <span style={{ fontSize: 15, color: "#666" }}>{details && details[player] ? details[player]["牌型"][0] : ""}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <CardRow cards={splits[player][1]} size={38} />
          <span style={{ fontSize: 15, color: "#666" }}>{details && details[player] ? details[player]["牌型"][1] : ""}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <CardRow cards={splits[player][2]} size={38} />
          <span style={{ fontSize: 15, color: "#666" }}>{details && details[player] ? details[player]["牌型"][2] : ""}</span>
        </div>
      </div>
      <div style={{ fontSize: 17, color: "#3869f6", fontWeight: 700, marginTop: 2 }}>
        {scores && scores[player] !== undefined ? `${scores[player]}分` : ""}
      </div>
      <div style={{ fontSize: 14, color: "#e67e22", fontWeight: 500, marginBottom: 2 }}>
        打枪：{details && details[player] && details[player]["打枪"] ? details[player]["打枪"] : 0}
      </div>
    </div>
  );
}

export default function CompareDialog({ players, splits, scores, details, onRestart }) {
  // 田字型玩家分布，4个角：0左上，1右上，2左下，3右下
  let gridPlayers = [...players];
  while (gridPlayers.length < 4) gridPlayers.push("");

  return (
    <div style={{
      position: "fixed",
      left: 0, top: 0, right: 0, bottom: 0,
      width: "100vw", height: "100vh",
      background: "#fff",  // 直接全白
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <div style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }}>
        <div style={{
          fontSize: 32,
          fontWeight: 700,
          marginTop: 38,
          marginBottom: 28,
          color: "#3869f6",
          textAlign: "center",
          userSelect: "none",
          letterSpacing: 1.5
        }}>
          比牌结果
        </div>
        {/* 田字格布局 */}
        <div style={{
          flex: 1,
          width: "100%",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: "0",
          alignItems: "center",
          justifyItems: "center",
          minHeight: 0,
          minWidth: 0
        }}>
          <div style={{display:"flex",justifyContent:"flex-start",alignItems:"flex-start",width:"100%",height:"100%",padding:"2vw"}}>
            <PlayerResultCard player={gridPlayers[0]} splits={splits} details={details} scores={scores}/>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",alignItems:"flex-start",width:"100%",height:"100%",padding:"2vw"}}>
            <PlayerResultCard player={gridPlayers[1]} splits={splits} details={details} scores={scores}/>
          </div>
          <div style={{display:"flex",justifyContent:"flex-start",alignItems:"flex-end",width:"100%",height:"100%",padding:"2vw"}}>
            <PlayerResultCard player={gridPlayers[2]} splits={splits} details={details} scores={scores}/>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",alignItems:"flex-end",width:"100%",height:"100%",padding:"2vw"}}>
            <PlayerResultCard player={gridPlayers[3]} splits={splits} details={details} scores={scores}/>
          </div>
        </div>
        <div style={{width:"100%",display:"flex",justifyContent:"center",margin:"32px 0 0 0"}}>
          <button onClick={onRestart}
            style={{
              background: "#3869f6",
              color: "#fff",
              fontSize: 22,
              border: "none",
              borderRadius: 10,
              padding: "14px 80px",
              fontWeight: 500,
              cursor: "pointer"
            }}>
            继续游戏
          </button>
        </div>
      </div>
    </div>
  );
}
