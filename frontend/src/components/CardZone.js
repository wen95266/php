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
  stacked // 新增堆叠模式
}) {
  const CARD_RATIO = 0.725;
  let heightPx = 120;
  if (fixedCardHeight && typeof fixedCardHeight === "number") {
    heightPx = fixedCardHeight;
  }

  // 堆叠模式
  let overlap = 18;
  if (stacked && cards.length > 1) {
    const cardWidth = Math.round(heightPx * CARD_RATIO);
    return (
      <div style={{
        position: "relative",
        height: heightPx,
        width: (cardWidth + overlap * (cards.length - 1)),
        minWidth: cardWidth,
        ...style
      }}>
        {cards.map((card, idx) => (
          <img
            key={idx}
            src={cardImg(card)}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              left: idx * overlap,
              top: 0,
              width: cardWidth,
              height: heightPx,
              borderRadius: 4,
              background: "#fff",
              border: "1px solid #ccc",
              zIndex: idx,
              boxShadow: "0 1px 6px #0001"
            }}
          />
        ))}
      </div>
    );
  }

  // 常规平铺模式：高度100%撑满，宽度自适应（用flex: 1），不裁切
  return (
    <div
      className="cardzone-outer"
      style={{
        width: "100vw",
        minWidth: "100vw",
        maxWidth: "100vw",
        height: style?.height || heightPx,
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
        className="cardzone-inner"
        style={{
          width: "100vw",
          minWidth: "100vw",
          maxWidth: "100vw",
          height: "97%",
          border: "2px dashed #bbb",
          borderRadius: 0,
          margin: 0,
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          boxSizing: "border-box",
          boxShadow: "0 2px 6px #fafafa",
          overflow: "hidden",
          padding: 0,
        }}
        onDragOver={(zone !== "mid" && cards.length < maxCards) ? e => { e.preventDefault(); } : undefined}
        onDrop={(zone !== "mid" && cards.length < maxCards) ? () => onDrop(zone) : undefined}
      >
        {/* 说明文字 */}
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
            width: "100vw",
            minWidth: "100vw",
            maxWidth: "100vw",
            height: "100%",
            marginTop: 38,
            display: "flex",
            flexDirection: "row",
            flexWrap: "nowrap",
            alignItems: "center",
            justifyContent: "flex-start",
            boxSizing: "border-box",
            overflowX: "visible",
            gap: cards.length > 0 ? "2vw" : 0,
            padding: "0 14px",
            position: "relative",
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
                zIndex: idx
              }}
            >
              <img
                src={cardImg(card)}
                alt=""
                draggable={zone !== "mid"}
                onDragStart={zone !== "mid" ? () => onDragStart(card, zone) : undefined}
                style={{
                  width: "100%",
                  height: "100%",
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
