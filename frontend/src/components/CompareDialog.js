import React from "react";

// 扑克牌横向堆叠，自动撑满可用宽度
function CardRow({ cards, size = 0, parentWidth = 0, maxCards = 5 }) {
  // 自动计算卡片大小，让一行最大5张刚好撑满PlayerCard宽度
  let cardW = size, cardH = Math.round(cardW * 1.38), overlap = Math.round(cardW * 0.46);
  if (!cardW && parentWidth) {
    // 计算合适宽度
    // parentWidth = cardW + (len-1)*overlap  --> cardW = (parentWidth - (len-1)*overlap)/1
    // 但overlap与cardW是线性关系，近似解:
    // cardW ≈ parentWidth / (1 + 0.54 * (len-1))
    let len = cards.length;
    cardW = Math.max(32, Math.min(60, Math.floor(parentWidth / (1 + 0.58 * (len - 1)))));
    cardH = Math.round(cardW * 1.38);
    overlap = Math.round(cardW * 0.46);
  }
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

// 田字格布局（扑克牌区最大化）
function Grid2x2({ children }) {
  return (
    <div style={{
      width: "100%",
      height: "100%",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gridTemplateRows: "1fr 1fr",
      gap: "0",
      alignItems: "stretch",
      justifyItems: "stretch"
    }}>
      {children}
    </div>
  );
}

// 每个玩家的比牌结果卡片，最大化填充格子
function PlayerResultCard({ player, splits, details, scores }) {
  // 尺寸填满1/2屏宽，1/2屏高减底部按钮
  // 横向撑满，竖向居中
  if (!player || !splits || !splits[player]) return null;
  return (
    <div style={{
      width: "100%",
      height: "100%",
      background: "#f8faff",
      borderRadius: 24,
      margin: "3.5vw",
      minWidth: 0,
      minHeight: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 1px 10px #0001"
    }}>
      <div style={{ fontWeight: 700, color: "#333", fontSize: "2vw", marginBottom: "1vw" }}>{player}</div>
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "1vw",
        alignItems: "center",
        justifyContent: "center",
        width: "100%"
      }}>
        <div style={{display:"flex",alignItems:"center",gap:"1vw", width: "98%", justifyContent: "center"}}>
          <CardRow cards={splits[player][0]} parentWidth={Math.min(window.innerWidth, window.innerHeight)/2.5} />
          <span style={{ fontSize: "1.25vw", color: "#666" }}>{details && details[player] ? details[player]["牌型"][0] : ""}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"1vw", width: "98%", justifyContent: "center"}}>
          <CardRow cards={splits[player][1]} parentWidth={Math.min(window.innerWidth, window.innerHeight)/2.5} />
          <span style={{ fontSize: "1.25vw", color: "#666" }}>{details && details[player] ? details[player]["牌型"][1] : ""}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"1vw", width: "98%", justifyContent: "center"}}>
          <CardRow cards={splits[player][2]} parentWidth={Math.min(window.innerWidth, window.innerHeight)/2.5} />
          <span style={{ fontSize: "1.25vw", color: "#666" }}>{details && details[player] ? details[player]["牌型"][2] : ""}</span>
        </div>
      </div>
      <div style={{ fontSize: "1.5vw", color: "#3869f6", fontWeight: 700, marginTop: "1vw" }}>
        {scores && scores[player] !== undefined ? `${scores[player]}分` : ""}
      </div>
      <div style={{ fontSize: "1.1vw", color: "#e67e22", fontWeight: 500, marginBottom: "0.5vw" }}>
        打枪：{details && details[player] && details[player]["打枪"] ? details[player]["打枪"] : 0}
      </div>
    </div>
  );
}

export default function CompareDialog({ players, splits, scores, details, onRestart }) {
  // 田字格玩家分布，4个角：0左上，1右上，2左下，3右下
  let gridPlayers = [...players];
  while (gridPlayers.length < 4) gridPlayers.push("");

  return (
    <div style={{
      position: "fixed",
      left: 0, top: 0, right: 0, bottom: 0,
      width: "100vw", height: "100vh",
      background: "#fff",  // 全白
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center"
    }}>
      {/* 田字格内容区，铺满弹窗，去除顶部标题 */}
      <div style={{
        width: "100vw",
        height: "calc(100vh - 90px)", // 留底部按钮
        flex: "1 1 auto",
        position: "relative",
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
      <div style={{width:"100%",display:"flex",justifyContent:"center",margin:"0",height:"90px",alignItems:"center"}}>
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
