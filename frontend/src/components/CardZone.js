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

// 固定宽高
const CARD_WIDTH = 86;
const CARD_HEIGHT = 120;
const CARD_GAP = 12;

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
  stacked,
  onReturnToHand
}) {
  // 横向自适应布局
  const containerRef = React.useRef(null);

  // 堆叠模式不变
  if (stacked && cards.length > 1) {
    let overlap = 18;
    return (
      <div ref={containerRef} style={{
        position: "relative",
        height: CARD_HEIGHT,
        width: (CARD_WIDTH + overlap * (cards.length - 1)),
        minWidth: CARD_WIDTH,
        ...style
      }}>
        {cards.map((card, idx) => (
          <img
            key={card.suit + card.value + idx}
            src={cardImg(card)}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              left: idx * overlap,
              top: 0,
              width: CARD_WIDTH,
              height: CARD_HEIGHT,
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

  // 平铺模式：固定卡片尺寸，自动左对齐
  return (
    <div
      ref={containerRef}
      className="cardzone-outer"
      style={{
        width: "100vw",
        minWidth: "100vw",
        maxWidth: "100vw",
        height: style?.height || CARD_HEIGHT + 34,
        borderBottom: style?.borderBottom || "1px solid #eee",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start", // 必须左对齐
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
            justifyContent: "flex-start", // 必须左对齐
            boxSizing: "border-box",
            overflowX: "visible",
            gap: `${CARD_GAP}px`,
            paddingLeft: 14,
            paddingRight: 0,
            position: "relative",
            background: "none"
          }}
        >
          {cards.map((card, idx) => (
            <div
              key={card.suit + card.value + idx}
              className="cardzone-card"
              style={{
                width: CARD_WIDTH,
                minWidth: CARD_WIDTH,
                maxWidth: CARD_WIDTH,
                height: CARD_HEIGHT,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxSizing: "border-box",
                margin: 0,
                padding: 0,
                overflow: "hidden",
                background: "transparent",
                zIndex: idx
              }}
              onDoubleClick={() => onReturnToHand && onReturnToHand(zone, idx)}
            >
              <img
                src={cardImg(card)}
                alt=""
                draggable={zone !== "mid"}
                onDragStart={zone !== "mid" ? () => onDragStart(card, zone) : undefined}
                style={{
                  borderRadius: 4,
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
