import React from "react";

// 计算卡牌图片
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
  stacked,
  onReturnToHand
}) {
  // 获取实际高度
  const containerRef = React.useRef(null);
  const [height, setHeight] = React.useState(120);
  React.useLayoutEffect(() => {
    if (containerRef.current) {
      setHeight(containerRef.current.offsetHeight);
    }
  }, [containerRef.current, style?.height]);

  // 卡牌宽高比
  const CARD_HEIGHT = height * 0.82; // 预留文字空间
  const CARD_WIDTH = CARD_HEIGHT * 0.7;
  const CARD_GAP = Math.max(12, CARD_WIDTH * 0.18);

  return (
    <div
      ref={containerRef}
      className="cardzone-outer"
      style={{
        width: "100vw",
        minWidth: "100vw",
        maxWidth: "100vw",
        height: style?.height || 140,
        borderBottom: style?.borderBottom || "1px solid #eee",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        background: "#f2f6fa",
        position: "relative",
        ...style,
        padding: 0,
        margin: 0,
        overflow: "hidden",
      }}
    >
      {/* 右上角半透明说明 */}
      <div
        className="cardzone-label"
        style={{
          position: "absolute",
          top: 10,
          right: 18,
          fontWeight: 600,
          color: "#444",
          fontSize: Math.max(18, height * 0.17),
          zIndex: 2,
          opacity: 0.44,
          pointerEvents: "none",
          userSelect: "none"
        }}>
        {label} ({cards.length}/{maxCards})
      </div>
      {/* 卡牌区域 */}
      <div
        className="cardzone-cards"
        style={{
          width: "100vw",
          minWidth: "100vw",
          maxWidth: "100vw",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          flexWrap: "nowrap",
          alignItems: "center",
          justifyContent: "flex-start",
          boxSizing: "border-box",
          overflowX: "visible",
          gap: `${CARD_GAP}px`,
          paddingLeft: 16,
          paddingRight: 0,
        }}
        onDragOver={cards.length < maxCards ? e => { e.preventDefault(); } : undefined}
        onDrop={cards.length < maxCards ? () => onDrop(zone) : undefined}
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
              draggable={true}
              onDragStart={() => onDragStart(card, zone)}
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
  );
}
