import React from "react";

// 田字型2+2布局，堆叠显示扑克牌（3/5/5张）
function CardStack({ cards }) {
  // 堆叠参数
  const cardW = 32, cardH = 44, overlap = 13;
  return (
    <div style={{
      position: "relative",
      width: cardW + (cards.length - 1) * overlap,
      height: cardH,
      display: "inline-block"
    }}>
      {cards.map((card, i) => (
        <img
          key={i}
          src={`/cards/${card.value === "A" ? "ace" :
                        card.value === "K" ? "king" :
                        card.value === "Q" ? "queen" :
                        card.value === "J" ? "jack" :
                        card.value}_of_${card.suit}.svg`}
          alt={card.value + card.suit[0].toUpperCase()}
          style={{
            position: "absolute",
            left: i * overlap,
            top: 0,
            width: cardW,
            height: cardH,
            borderRadius: 3,
            boxShadow: "0 1px 3px #0001",
            background: "#fff"
          }}
        />
      ))}
    </div>
  );
}

// 田字型2+2布局容器
function FourGrid({ children }) {
  // children: [头道, 中道, 尾道, 玩家名等]
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gridTemplateRows: "1fr 1fr",
      gap: 0,
      alignItems: "center",
      justifyItems: "center"
    }}>
      {children}
    </div>
  );
}

export default function CompareDialog({ players, splits, scores, details, onClose }) {
  // 田字型分布：上面两行，下方两行（最多4人刚好）
  // 若超过4人，自动新起一组
  const groups = [];
  for (let i = 0; i < players.length; i += 4) {
    groups.push(players.slice(i, i + 4));
  }

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
        minWidth: 420,
        maxWidth: 670,
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
        {groups.map((group, gi) => (
          <div key={gi} style={{marginBottom: gi < groups.length-1 ? 18 : 4}}>
            <FourGrid>
              {group.map((p, idx) => (
                <div key={p} style={{
                  background: idx % 2 === 0 ? "#f9fafc" : "#f3f6fd",
                  borderRadius: 7,
                  boxShadow: "0 1px 5px #0002",
                  margin: 6,
                  minWidth: 190,
                  minHeight: 168,
                  textAlign: "center",
                  padding: "10px 7px"
                }}>
                  <div style={{ fontWeight: 500, color: "#333", fontSize: 16, marginBottom: 8 }}>{p}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center", marginBottom: 5 }}>
                    <div>
                      <span style={{ fontSize: 13, color: "#555" }}>{details && details[p] ? details[p]["牌型"][0] : ""}</span>
                      <CardStack cards={splits && splits[p] ? splits[p][0] : []} />
                    </div>
                    <div>
                      <span style={{ fontSize: 13, color: "#555" }}>{details && details[p] ? details[p]["牌型"][1] : ""}</span>
                      <CardStack cards={splits && splits[p] ? splits[p][1] : []} />
                    </div>
                    <div>
                      <span style={{ fontSize: 13, color: "#555" }}>{details && details[p] ? details[p]["牌型"][2] : ""}</span>
                      <CardStack cards={splits && splits[p] ? splits[p][2] : []} />
                    </div>
                  </div>
                  <div style={{ fontSize: 15, color: "#3869f6", fontWeight: 600, margin: "2px 0 1px 0" }}>
                    {scores && scores[p] !== undefined ? `${scores[p]}分` : ""}
                  </div>
                  <div style={{ fontSize: 13, color: "#e67e22", fontWeight: 500 }}>
                    打枪：{details && details[p] && details[p]["打枪"] ? details[p]["打枪"] : 0}
                  </div>
                </div>
              ))}
              {/* 补足4格空框 */}
              {[...Array(4 - group.length)].map((_, idx) => (
                <div key={"empty"+idx} />
              ))}
            </FourGrid>
          </div>
        ))}
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
