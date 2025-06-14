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

// 田字格布局（2x2）
function Grid2x2({ children }) {
  return (
    <div style={{
      width: "100%",
      height: "100%",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gridTemplateRows: "1fr 1fr",
      gap: "36px 36px",
      alignItems: "center",
      justifyItems: "center"
    }}>
      {children}
    </div>
  );
}

// 每个玩家的比牌结果卡片
function PlayerResultCard({ player, splits, details, scores }) {
  if (!splits || !splits[player]) return null;
  return (
    <div style={{
      minWidth: 350,
      minHeight: 210,
      maxWidth: 410,
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
        gap: 7,
        alignItems: "flex-start",
        marginBottom: 8
      }}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <CardRow cards={splits[player][0]} size={38} />
          <span style={{ fontSize: 15, color: "#666" }}>{details && details[player] ? details[player]["牌型"][0] : ""}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <CardRow cards={splits[player][1]} size={38} />
          <span style={{ fontSize: 15, color: "#666" }}>{details && details[player] ? details[player]["牌型"][1] : ""}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
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
  // 按田字格分布前4人（不足补空）
  let gridPlayers = [...players];
  while (gridPlayers.length < 4) gridPlayers.push("");
  return (
    <div style={{
      position: "fixed",
      left: 0, top: 0, right: 0, bottom: 0,
      width: "100vw", height: "100vh",
      background: "rgba(0,0,0,0.47)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <div style={{
        width: "min(98vw, 1100px)",
        height: "min(97vh, 670px)",
        maxWidth: 1100,
        maxHeight: 670,
        minWidth: 730,
        minHeight: 470,
        background: "#fff",
        borderRadius: 28,
        boxShadow: "0 16px 48px #0003",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
        padding: "0 0 32px 0",
        justifyContent: "space-between"
      }}>
        <div style={{
          fontSize: 30,
          fontWeight: 700,
          marginTop: 42,
          marginBottom: 32,
          color: "#3869f6",
          textAlign: "center",
          userSelect: "none"
        }}>
          比牌结果
        </div>
        <div style={{
          width: "96%",
          height: "100%",
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <Grid2x2>
            {gridPlayers.map((p, idx) => (
              p
                ? <PlayerResultCard key={p} player={p} splits={splits} details={details} scores={scores} />
                : <div key={"empty"+idx} />
            ))}
          </Grid2x2>
        </div>
        <div style={{textAlign:"center", marginTop: 24}}>
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
