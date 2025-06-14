import React from "react";

// 堆叠扑克牌展示（支持3、5、5张），自动防止重叠错乱
function CardStack({ cards, size = 36 }) {
  const cardW = size, cardH = Math.round(size * 1.38), overlap = Math.round(cardW * 0.47);
  return (
    <div style={{
      position: "relative",
      width: cardW + (cards.length - 1) * overlap,
      height: cardH,
      display: "inline-block"
    }}>
      {cards.map((card, i) => {
        // 补充花色英文和数字映射
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

// 田字格四人分布
function FourGrid({ children }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gridTemplateRows: "1fr 1fr",
      gap: "28px 28px",
      width: "100%",
      height: "100%",
      minHeight: 420,
      alignItems: "center",
      justifyItems: "center",
      boxSizing: "border-box"
    }}>
      {children}
    </div>
  );
}

export default function CompareDialog({ players, splits, scores, details, onClose }) {
  // 2+2田字型分组
  const groups = [];
  for (let i = 0; i < players.length; i += 4) {
    groups.push(players.slice(i, i + 4));
  }

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
        width: "90vw",
        height: "90vh",
        maxWidth: 820,
        maxHeight: 620,
        minWidth: 480,
        minHeight: 450,
        background: "#fff",
        borderRadius: 18,
        boxShadow: "0 12px 40px #0003",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
        padding: "0 0 24px 0"
      }}>
        <div style={{
          fontSize: 26,
          fontWeight: 700,
          marginTop: 35,
          marginBottom: 32,
          color: "#3869f6",
          textAlign: "center",
          userSelect: "none"
        }}>
          比牌结果
        </div>
        {groups.map((group, gi) => (
          <FourGrid key={gi}>
            {group.map((p, idx) => (
              <div key={p} style={{
                background: "#f5f7fc",
                borderRadius: 12,
                boxShadow: "0 1px 9px #0001",
                minWidth: 205,
                minHeight: 200,
                textAlign: "center",
                padding: "10px 10px 8px 10px",
                margin: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start"
              }}>
                <div style={{ fontWeight: 600, color: "#333", fontSize: 17, marginBottom: 4 }}>{p}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "center", marginBottom: 4 }}>
                  <div style={{marginBottom: 2}}>
                    <CardStack cards={splits && splits[p] ? splits[p][0] : []} size={33} />
                    <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>
                      {details && details[p] ? details[p]["牌型"][0] : ""}
                    </div>
                  </div>
                  <div style={{marginBottom: 2}}>
                    <CardStack cards={splits && splits[p] ? splits[p][1] : []} size={33} />
                    <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>
                      {details && details[p] ? details[p]["牌型"][1] : ""}
                    </div>
                  </div>
                  <div>
                    <CardStack cards={splits && splits[p] ? splits[p][2] : []} size={33} />
                    <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>
                      {details && details[p] ? details[p]["牌型"][2] : ""}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 16, color: "#3869f6", fontWeight: 700, margin: "6px 0 0 0" }}>
                  {scores && scores[p] !== undefined ? `${scores[p]}分` : ""}
                </div>
                <div style={{ fontSize: 13, color: "#e67e22", fontWeight: 500, marginBottom: 2 }}>
                  打枪：{details && details[p] && details[p]["打枪"] ? details[p]["打枪"] : 0}
                </div>
              </div>
            ))}
            {/* 补足4格空框 */}
            {[...Array(4 - group.length)].map((_, idx) => (
              <div key={"empty"+idx} />
            ))}
          </FourGrid>
        ))}
        <div style={{textAlign:"center", marginTop: 18}}>
          <button onClick={onClose}
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
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
