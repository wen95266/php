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
  const labelLeft = 16;
  const labelTop = 10;

  // 置牌区高度、卡牌自适应
  const cardAreaPaddingTop = 34; // 说明文字高度空间
  const cardAreaWidth = "100%";
  const cardAreaHeight = "100%";
  // 卡牌宽度：按maxCards平分区域，始终左对齐
  const cardWidth = `calc((100vw - 32px) / ${maxCards})`;
  const cardHeight = "calc(100% - 36px)";

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
        ...style
      }}
    >
      <div
        style={{
          width: fullArea ? "96vw" : "auto",
          height: fullArea ? "94%" : "auto",
          minHeight: fullArea ? "84%" : undefined,
          minWidth: fullArea ? "80vw" : undefined,
          border: "2px dashed #bbb",
          borderRadius: 8,
          margin: "0 auto",
          background: "#fff",
          display: "block",
          position: "relative",
          boxSizing: "border-box",
          boxShadow: "0 2px 6px #fafafa",
          opacity: (cards.length >= maxCards && zone !== "hand" && zone !== "mid") ? 0.7 : 1,
          overflow: "hidden"
        }}
        onDragOver={canDrop ? e => { e.preventDefault(); } : undefined}
        onDrop={canDrop ? () => onDrop(zone) : undefined}
      >
        {/* 说明文字 */}
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
        {/* 卡牌区：左对齐且无任何滚动条 */}
        <div
          style={{
            width: cardAreaWidth,
            height: cardAreaHeight,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "flex-start",
            paddingTop: cardAreaPaddingTop,
            paddingLeft: labelLeft,
            boxSizing: "border-box",
            gap: 0,
            overflow: "hidden"
          }}
        >
          {cards.map((card, idx) => (
            <div
              key={card.value + "_" + card.suit + "_" + idx}
              draggable={zone !== "mid"}
              onDragStart={zone !== "mid" ? () => onDragStart(card, zone) : undefined}
              style={{
                width: cardWidth,
                height: `calc(${cardWidth} / 0.7)`,
                maxHeight: cardHeight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                margin: 0
              }}
            >
              <img
                src={cardImg(card)}
                alt=""
                style={{
                  borderRadius: 0,
                  boxShadow: "none",
                  width: "94%",
                  height: "auto",
                  maxHeight: "100%",
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
