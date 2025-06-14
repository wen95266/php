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
  // 允许拖拽放置
  const canDrop = (zone !== "mid" && cards.length < maxCards);

  // 说明文字绝对定位
  const labelLeft = 12;
  const labelTop = 8;

  // 卡牌宽度：始终平分maxCards，无论有几张都左贴齐
  const cardWidth = `calc((100vw - 36px) / ${maxCards})`;
  const cardHeight = `calc(100% - 30px)`;

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
        overflow: "hidden" // 保证无滚动条
      }}
    >
      <div
        style={{
          width: fullArea ? "98vw" : "auto",
          height: fullArea ? "96%" : "auto",
          minHeight: fullArea ? "86%" : undefined,
          minWidth: fullArea ? "80vw" : undefined,
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
          overflow: "hidden"
        }}
        onDragOver={canDrop ? e => { e.preventDefault(); } : undefined}
        onDrop={canDrop ? () => onDrop(zone) : undefined}
      >
        {/* 说明文字绝对定位，卡牌可覆盖 */}
        <div style={{
          position: "absolute",
          top: labelTop,
          left: labelLeft,
          fontWeight: 600,
          color: "#444",
          fontSize: 18,
          zIndex: 2,
          pointerEvents: "none",
          userSelect: "none"
        }}>
          {label} ({cards.length}/{maxCards}):
        </div>
        {/* 卡牌区：左贴齐，无滚动条 */}
        <div
          style={{
            width: "100%",
            height: "100%",
            marginTop: 30,
            marginLeft: 0,
            marginRight: 0,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "flex-start",
            boxSizing: "border-box",
            overflow: "hidden" // 绝不会出现滚动条
          }}
        >
          {[...Array(maxCards)].map((_, idx) => (
            <div
              key={idx}
              style={{
                width: cardWidth,
                height: cardHeight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              {cards[idx] &&
                <img
                  src={cardImg(cards[idx])}
                  alt=""
                  draggable={zone !== "mid"}
                  onDragStart={zone !== "mid" ? () => onDragStart(cards[idx], zone) : undefined}
                  style={{
                    borderRadius: 0,
                    boxShadow: "none",
                    width: "94%",
                    height: "auto",
                    maxHeight: "98%",
                    objectFit: "contain",
                    display: "block",
                    background: "none",
                    border: "none",
                    pointerEvents: "auto"
                  }}
                />
              }
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
