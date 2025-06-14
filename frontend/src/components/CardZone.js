import React from "react";

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
  fullArea = false
}) {
  const canDrop = (zone !== "mid" && cards.length < maxCards);

  // 固定每张牌宽度（自适应屏幕，最多不超过6.5vw，移动端更小，最多5vw）
  const cardBoxWidth = "6vw";
  const cardBoxHeight = "calc(100% - 38px)";

  return (
    <div
      style={{
        width: "100vw",
        height: style?.height || "16vh",
        borderBottom: style?.borderBottom || "1px solid #eee",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f2f6fa",
        ...style,
        padding: 0,
        margin: 0,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: fullArea ? "100vw" : "98vw",
          height: fullArea ? "97%" : "94%",
          border: "2px dashed #bbb",
          borderRadius: 8,
          margin: "0 auto",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          boxSizing: "border-box",
          boxShadow: "0 2px 6px #fafafa",
          opacity: (cards.length >= maxCards && zone !== "hand" && zone !== "mid") ? 0.7 : 1,
          overflow: "hidden",
          padding: 0,
        }}
        onDragOver={canDrop ? e => { e.preventDefault(); } : undefined}
        onDrop={canDrop ? () => onDrop(zone) : undefined}
      >
        {/* 说明文字 */}
        <div style={{
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
        {/* 卡牌区：每张牌紧贴左侧，宽度固定 */}
        <div
          style={{
            width: "100%",
            height: "100%",
            marginTop: 38,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "flex-start",
            boxSizing: "border-box",
            overflow: "hidden",
            gap: 0,
            padding: 0,
          }}
        >
          {cards.map((card, idx) => (
            <div
              key={idx}
              style={{
                width: cardBoxWidth,
                height: cardBoxHeight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxSizing: "border-box",
                margin: 0,
                padding: 0,
                overflow: "hidden",
                background: "transparent"
              }}
            >
              <img
                src={cardImg(card)}
                alt=""
                draggable={zone !== "mid"}
                onDragStart={zone !== "mid" ? () => onDragStart(card, zone) : undefined}
                style={{
                  borderRadius: 0,
                  boxShadow: "none",
                  width: "94%",
                  height: "auto",
                  maxHeight: "98%",
                  maxWidth: "98%",
                  objectFit: "contain",
                  display: "block",
                  background: "none",
                  border: "none",
                  pointerEvents: "auto"
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
