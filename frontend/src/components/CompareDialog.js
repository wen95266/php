import React from "react";

// 横向堆叠扑克牌，宽度自适应不超出区域
function CardRow({ cards, maxWidth = 260, maxHeight = 50 }) {
  // 计算合适牌宽
  const len = cards.length;
  // 牌宽不能太小
  let cardW = Math.min(Math.max((maxWidth - (len - 1) * 22) / len, 32), 55);
  let cardH = cardW * 1.38;
  if (cardH > maxHeight) {
    cardH = maxHeight;
    cardW = cardH / 1.38;
  }
  const overlap = Math.floor(cardW * 0.58);
  return (
    <div style={{
      position: "relative",
      width: cardW + (len - 1) * overlap,
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

function PlayerResultCard({ player, splits, details, scores }) {
  if (!player || !splits || !splits[player]) return null;
  // 卡片最大宽度/高度
  const maxCardWidth = 260;
  const maxCardHeight = 46;
  return (
    <div style={{
      width: "98%",
      height: "96%",
      minWidth: 0,
      minHeight: 0,
      background: "#f8faff",
      borderRadius: 18,
      margin: "2.5vw",
      boxSizing: "border-box",
      position: "relative",
      display: "flex",
      flexDirection: "row",
      justifyContent: "flex-start",
      alignItems: "flex-start"
    }}>
      {/* 左侧扑克牌区域 */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
        height: "100%",
        padding: "2.5vw 0 2.5vw 2.4vw",
        flex: "none"
      }}>
        <div style={{ display: "flex",alignItems:"center",marginBottom: "1.1vw" }}>
          <CardRow cards={splits[player][0]} maxWidth={maxCardWidth} maxHeight={maxCardHeight} />
          <span style={{ fontSize: "1.15vw", color: "#666", minWidth: 48, marginLeft: 12 }}>
            {details && details[player] ? details[player]["牌型"][0] : ""}
          </span>
        </div>
        <div style={{ display: "flex",alignItems:"center",marginBottom: "1.1vw" }}>
          <CardRow cards={splits[player][1]} maxWidth={maxCardWidth} maxHeight={maxCardHeight} />
          <span style={{ fontSize: "1.15vw", color: "#666", minWidth: 48, marginLeft: 12 }}>
            {details && details[player] ? details[player]["牌型"][1] : ""}
          </span>
        </div>
        <div style={{ display: "flex", alignItems:"center" }}>
          <CardRow cards={splits[player][2]} maxWidth={maxCardWidth} maxHeight={maxCardHeight} />
          <span style={{ fontSize: "1.15vw", color: "#666", minWidth: 48, marginLeft: 12 }}>
            {details && details[player] ? details[player]["牌型"][2] : ""}
          </span>
        </div>
      </div>
      {/* 右上角 玩家名+分数 */}
      <div style={{
        position: "absolute",
        right: "2.1vw",
        top: "2vw",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end"
      }}>
        <div style={{ fontWeight: 700, color: "#222", fontSize: "1.5vw", lineHeight: 1.3 }}>{player}</div>
        <div style={{ fontSize: "1.2vw", color: "#3869f6", fontWeight: 700, marginTop: 3, lineHeight: 1.15 }}>
          {scores && scores[player] !== undefined ? `${scores[player]}分` : ""}
        </div>
        <div style={{ fontSize: "1vw", color: "#e67e22", fontWeight: 500, marginTop: 2, lineHeight: 1.13 }}>
          打枪：{details && details[player] && details[player]["打枪"] ? details[player]["打枪"] : 0}
        </div>
      </div>
    </div>
  );
}

// 田字格
function Grid2x2({ children }) {
  return (
    <div style={{
      width: "100%",
      height: "100%",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gridTemplateRows: "1fr 1fr",
      gap: 0,
      alignItems: "stretch",
      justifyItems: "stretch"
    }}>
      {children}
    </div>
  );
}

export default function CompareDialog({ players, splits, scores, details, onRestart }) {
  let gridPlayers = [...players];
  while (gridPlayers.length < 4) gridPlayers.push("");
  return (
    <div style={{
      position: "fixed",
      left: 0, top: 0, right: 0, bottom: 0,
      width: "100vw", height: "100vh",
      background: "#fff",
      zIndex: 9999,
      display: "flex",
      flexDirection: "column"
    }}>
      {/* 田字格内容区 */}
      <div style={{
        width: "100vw",
        height: "calc(100vh - 90px)",
        flex: "1 1 auto",
        display: "flex",
        alignItems: "stretch",
        justifyContent: "stretch"
      }}>
        <Grid2x2>
          <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <PlayerResultCard player={gridPlayers[0]} splits={splits} details={details} scores={scores}/>
          </div>
          <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <PlayerResultCard player={gridPlayers[1]} splits={splits} details={details} scores={scores}/>
          </div>
          <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <PlayerResultCard player={gridPlayers[2]} splits={splits} details={details} scores={scores}/>
          </div>
          <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <PlayerResultCard player={gridPlayers[3]} splits={splits} details={details} scores={scores}/>
          </div>
        </Grid2x2>
      </div>
      <div style={{
        width:"100%",
        display:"flex",
        justifyContent:"flex-end",
        alignItems:"center",
        height:"90px",
        paddingRight:"5vw",
        paddingBottom: "1vw"
      }}>
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
  );
}
