import React, { useEffect, useState, useRef } from "react";

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
  fullArea = false
}) {
  // 响应式判定
  const [isNarrow, setIsNarrow] = useState(window.innerWidth < 700);
  const zoneRef = useRef();
  const [containerWidth, setContainerWidth] = useState(window.innerWidth);

  useEffect(() => {
    function handleResize() {
      setIsNarrow(window.innerWidth < 700);
      if (zoneRef.current) {
        setContainerWidth(zoneRef.current.offsetWidth);
      } else {
        setContainerWidth(window.innerWidth);
      }
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 卡牌宽度算法：保证所有牌完整显示，且最大不超过180px
  const gap = 12;
  let cardCount = cards.length || 1;
  let availWidth = Math.max(containerWidth - 28, 320); // 28=左右padding
  let cardWidth = Math.min(
    180,
    Math.floor((availWidth - gap * (cardCount - 1)) / cardCount)
  );
  if (isNarrow) {
    cardWidth = Math.min(
      90,
      Math.floor((availWidth - gap * (cardCount - 1)) / cardCount)
    );
  }
  let cardHeight = Math.round(cardWidth * 1.36);

  return (
    <div
      className="cardzone-outer"
      ref={zoneRef}
      style={{
        width: "100vw",
        minWidth: "100vw",
        maxWidth: "100vw",
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
          opacity: (cards.length >= maxCards && zone !== "hand" && zone !== "mid") ? 0.7 : 1,
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
            alignItems: "flex-start",
            justifyContent: "flex-start",
            boxSizing: "border-box",
            overflowX: "auto",
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
                width: cardWidth,
                minWidth: 24,
                maxWidth: 240,
                height: cardHeight,
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
