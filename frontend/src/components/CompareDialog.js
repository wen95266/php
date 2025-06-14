import React from "react";

// 堆叠扑克牌（竖直排列）
function CardStack({ cards, size = 34 }) {
  const cardW = size, cardH = Math.round(size * 1.38), overlap = Math.round(cardH * 0.44);
  return (
    <div style={{
      position: "relative",
      width: cardW,
      height: cardH + (cards.length - 1) * overlap,
      display: "inline-block"
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
              left: 0,
              top: i * overlap,
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

// 单个玩家竖直展示
function PlayerColumn({ player, splits, details, scores }) {
  if (!splits || !splits[player]) return null;
  return (
    <div style={{
      background: "#f5f7fc",
      borderRadius: 12,
      boxShadow: "0 1px 9px #0001",
      width: 148,
      minHeight: 380,
      textAlign: "center",
      padding: "12px 4px 10px 4px",
      margin: "0 12px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start"
    }}>
      <div style={{ fontWeight: 600, color: "#333", fontSize: 17, marginBottom: 6 }}>{player}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center", marginBottom: 6 }}>
        <div>
          <CardStack cards={splits[player][0]} size={33} />
          <div style={{ fontSize: 13, color: "#555", marginTop: 1 }}>
            {details && details[player] ? details[player]["牌型"][0] : ""}
          </div>
        </div>
        <div>
          <CardStack cards={splits[player][1]} size={33} />
          <div style={{ fontSize: 13, color: "#555", marginTop: 1 }}>
            {details && details[player] ? details[player]["牌型"][1] : ""}
          </div>
        </div>
        <div>
          <CardStack cards={splits[player][2]} size={33} />
          <div style={{ fontSize: 13, color: "#555", marginTop: 1 }}>
            {details && details[player] ? details[player]["牌型"][2] : ""}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 15, color: "#3869f6", fontWeight: 700, margin: "6px 0 0 0" }}>
        {scores && scores[player] !== undefined ? `${scores[player]}分` : ""}
      </div>
      <div style={{ fontSize: 13, color: "#e67e22", fontWeight: 500, marginBottom: 2 }}>
        打枪：{details && details[player] && details[player]["打枪"] ? details[player]["打枪"] : 0}
      </div>
    </div>
  );
}

// 2+2田字型横向分布（全屏居中弹窗，内容居中）
export default function CompareDialog({ players, splits, scores, details, onRestart }) {
  // 保证players顺序和数量，分成左右两列
  let left = [], right = [];
  for (let i = 0; i < players.length; ++i) {
    if (i % 2 === 0) left.push(players[i]);
    else right.push(players[i]);
  }
  // 填满田字格（最多4人），不足补空
  while (left.length < 2) left.push("");
  while (right.length < 2) right.push("");

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
        width: "min(96vw, 900px)",
        maxWidth: 900,
        minWidth: 480,
        height: "min(92vh, 540px)",
        minHeight: 430,
        background: "#fff",
        borderRadius: 22,
        boxShadow: "0 12px 40px #0003",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
        padding: "0 0 28px 0",
        justifyContent: "space-between"
      }}>
        <div style={{
          fontSize: 26,
          fontWeight: 700,
          marginTop: 32,
          marginBottom: 24,
          color: "#3869f6",
          textAlign: "center",
          userSelect: "none",
          letterSpacing: 1.5
        }}>
          比牌结果
        </div>
        <div style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "flex-start",
          width: "100%",
          flex: 1
        }}>
          {/* 左侧2人竖排 */}
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1
          }}>
            <PlayerColumn player={left[0]} splits={splits} details={details} scores={scores} />
            <PlayerColumn player={left[1]} splits={splits} details={details} scores={scores} />
          </div>
          {/* 标题中轴 */}
          <div style={{
            width: 58,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center"
          }}>
            {/* 空，居中用 */}
          </div>
          {/* 右侧2人竖排 */}
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1
          }}>
            <PlayerColumn player={right[0]} splits={splits} details={details} scores={scores} />
            <PlayerColumn player={right[1]} splits={splits} details={details} scores={scores} />
          </div>
        </div>
        <div style={{textAlign:"center", marginTop: 10}}>
          <button onClick={onRestart}
            style={{
              background: "#3869f6",
              color: "#fff",
              fontSize: 20,
              border: "none",
              borderRadius: 8,
              padding: "12px 60px",
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
