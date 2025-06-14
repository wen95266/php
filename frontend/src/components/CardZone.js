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
  fixedCardHeight // 新增，要求外部传入
}) {
  // 固定扑克牌高度，宽度按比例
  const CARD_RATIO = 0.725; // 扑克牌宽/高
  let heightPx = 120;
  if (fixedCardHeight && typeof fixedCardHeight === "string" && fixedCardHeight.startsWith("calc")) {
    // calc((100vh - 90px - 120px) / 3) 简单估算
    const match = fixedCardHeight.match(/100vh - (\d+)px - (\d+)px/);
    if (match) {
      heightPx = (window.innerHeight - parseInt(match[1]) - parseInt(match[2])) / 3;
    }
  } else if (typeof fixedCardHeight === "number") {
    heightPx = fixedCardHeight;
  }
  const cardWidth = Math.round(heightPx * CARD_RATIO);

  // 调整：如果卡牌总宽超出区宽，让卡牌自动等比缩小（不滚动）
  const containerWidth = window.innerWidth; // 100vw
  const gap = 12;
  const totalGap = gap * (cards.length - 1);
  let fitCardWidth = cardWidth;
  let fitCardHeight = heightPx * 0.97;
  if (cards.length > 0) {
    const maxCardW = Math.floor((containerWidth - 28 - totalGap) / cards.length);
    if (maxCardW < cardWidth) {
      fitCardWidth = maxCardW;
      fitCardHeight = Math.floor(fitCardWidth / CARD_RATIO);
    }
  }

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
        {/* 卡牌区 */}
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
            overflow: "visible", // 关键：不出现滚动条
            gap: `${gap}px`,
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
                width: fitCardWidth,
                minWidth: fitCardWidth,
                maxWidth: fitCardWidth,
                height: fitCardHeight,
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
