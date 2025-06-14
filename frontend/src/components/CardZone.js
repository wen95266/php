import React from "react";

// 卡牌图片路径
function cardImg(card) {
  let v = card.value;
  if (v === "A") v = "ace";
  if (v === "K") v = "king";
  if (v === "Q") v = "queen";
  if (v === "J") v = "jack";
  return `/cards/${v}_of_${card.suit}.svg`;
}

export default function CardZone({
  zone,
  label,
  maxCards,
  cards,
  onDragStart,
  onDrop,
  draggingCard,
  style,
  fullArea = false,
  fixedCardHeight,
  stacked
}) {
  // 让区块高度由父级控制
  // 每张牌高度=区块高度=100%，宽=高*0.725
  const CARD_RATIO = 0.725;
  // 这里不用固定heightPx，直接100%
  return (
    <div
      className="cardzone-outer"
      style={{
        ...style,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        width: "100%",
        height: "100%", // 由父级撑开
        background: "#f2f6fa",
        borderBottom: style?.borderBottom || "1px solid #eee",
        margin: 0,
        padding: 0,
        overflow: "hidden"
      }}
    >
      <div
        className="cardzone-inner"
        style={{
          width: "100%",
          height: "100%",
          background: "#fff",
          border: "none",
          borderRadius: 0,
          margin: 0,
          padding: 0,
          boxSizing: "border-box",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div className="cardzone-label"
          style={{
            position: "absolute",
            top: 8,
            left: 14,
            fontWeight: 600,
            color: "#444",
            fontSize: 18,
            zIndex: 2,
            pointerEvents: "none",
            userSelect: "none"
          }}>
          {label} ({cards.length}/{maxCards}):
        </div>
        <div
          className="cardzone-cards"
          style={{
            width: "100%",
            height: "100%",
            marginTop: 38,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-start",
            boxSizing: "border-box",
            overflow: "visible",
            gap: "1.8vw", // 卡片间隔
            padding: "0 18px",
            background: "none"
          }}
        >
          {cards.map((card, idx) => (
            <div
              key={idx}
              className="cardzone-card"
              style={{
                height: "100%",
                aspectRatio: `${CARD_RATIO}/1`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxSizing: "border-box",
                margin: 0,
                padding: 0,
                overflow: "visible",
                background: "transparent",
                zIndex: idx,
              }}
            >
              <img
                src={cardImg(card)}
                alt=""
                draggable={zone !== "mid"}
                onDragStart={zone !== "mid" ? () => onDragStart(card, zone) : undefined}
                style={{
                  width: "auto",
                  height: "100%",
                  objectFit: "contain",
                  display: "block",
                  background: "none",
                  border: "none",
                  pointerEvents: "auto",
                  boxShadow: "none",
                  borderRadius: 0,
                  margin: 0,
                  padding: 0
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
