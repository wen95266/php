import React, { useRef, useEffect, useState } from "react";

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
  style = {},
  fullArea = false,
  fixedCardHeight,
  stacked
}) {
  const CARD_RATIO = 0.725;
  const containerRef = useRef();
  const [dim, setDim] = useState({ width: 1200, height: 120 });

  // 动态获取实际宽度和高度
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDim({ width: rect.width, height: rect.height });
    }
  }, [cards.length]);

  // 计算最大牌宽度
  let maxCardsCount = maxCards || 13;
  let gapPx = 16;
  let availW = dim.width - (cards.length - 1) * gapPx;
  let cardW = Math.floor(availW / Math.max(cards.length, 1));
  // 限制最大不能超过区域高度
  let maxH = dim.height ? Math.floor(dim.height * 0.94) : 120;
  let cardH = Math.floor(cardW / CARD_RATIO);
  if (cardH > maxH) {
    cardH = maxH;
    cardW = Math.floor(cardH * CARD_RATIO);
  }

  return (
    <div
      className="cardzone-outer"
      ref={containerRef}
      style={{
        width: "100vw",
        minWidth: "100vw",
        maxWidth: "100vw",
        height: style?.height || 120,
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
            gap: gapPx,
            padding: "0 14px",
            position: "relative",
            background: "none"
          }}
        >
          {cards.map((card, idx) => (
            <div
              key={card.suit + card.value}
              className="cardzone-card"
              style={{
                width: cardW,
                minWidth: cardW,
                maxWidth: cardW,
                height: cardH,
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
