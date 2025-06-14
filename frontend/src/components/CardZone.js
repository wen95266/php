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
  const [zoneHeight, setZoneHeight] = useState(120);
  const zoneRef = useRef();

  useEffect(() => {
    function handleResize() {
      setIsNarrow(window.innerWidth < 700);
      if (zoneRef.current) {
        setZoneHeight(zoneRef.current.offsetHeight);
      }
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (zoneRef.current) {
      setZoneHeight(zoneRef.current.offsetHeight);
    }
  }, [style]);

  // 让卡牌自适应父容器高度
  function getCardSize() {
    // 头道3张，中道/尾道5张
    const count = Math.max(cards.length, 1);
    let maxH = Math.max(zoneHeight - 44, 32); // 44为说明文字及边距
    // 保证卡牌不会溢出横向
    let maxW = (window.innerWidth - 32) / count - 6;
    let size = Math.min(maxH, maxW, 180);
    if (isNarrow) size = Math.min(maxH, Math.max(44, maxW), 90);
    return size;
  }
  const cardSize = getCardSize();

  // 堆叠样式逻辑
  const stackCardStyle = idx => {
    if (!isNarrow || cards.length <= 1) {
      // 宽屏/单张平铺
      return {
        width: cardSize,
        minWidth: 24,
        maxWidth: 200,
        marginLeft: idx === 0 ? 0 : 2,
        zIndex: idx
      };
    }
    // 堆叠：每张牌左移一定像素，居中，且不超出
    const overlap = Math.max(12, cardSize * 0.4); // 堆叠偏移量
    const totalW = cardSize + overlap * (cards.length - 1);
    const maxAvailable = window.innerWidth * 0.96;
    const startLeft = (maxAvailable - totalW) / 2;
    return {
      position: "absolute",
      left: `${startLeft + idx * overlap}px`,
      width: cardSize,
      minWidth: 18,
      maxWidth: 120,
      zIndex: idx,
      transition: "left 0.18s"
    };
  };

  return (
    <div
      className="cardzone-outer"
      ref={zoneRef}
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
        className="cardzone-inner"
        style={{
          width: "100vw",
          height: "97%",
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
          className={"cardzone-cards" + (isNarrow ? " cardzone-cards-narrow" : "")}
          style={{
            width: "100vw",
            height: "100%",
            marginTop: 38,
            display: isNarrow ? "block" : "flex",
            alignItems: "flex-start",
            justifyContent: "flex-start",
            boxSizing: "border-box",
            overflow: "hidden",
            gap: 0,
            padding: 0,
            position: "relative",
          }}
        >
          {cards.map((card, idx) => (
            <div
              key={idx}
              className="cardzone-card"
              style={{
                ...(isNarrow ? stackCardStyle(idx) : {
                  width: cardSize,
                  minWidth: 24,
                  maxWidth: 200,
                  marginLeft: idx === 0 ? 0 : 2,
                  zIndex: idx
                }),
                height: cardSize * 1.35,
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
                  borderRadius: 4,
                  boxShadow: "none",
                  width: "96%",
                  height: "96%",
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
