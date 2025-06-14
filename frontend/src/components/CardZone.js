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
  // 获取实际高度和宽度
  const containerRef = React.useRef(null);
  const [size, setSize] = React.useState({height: 120, width: 600});
  React.useLayoutEffect(() => {
    if (containerRef.current) {
      setSize({
        height: containerRef.current.offsetHeight,
        width: containerRef.current.offsetWidth
      });
    }
  }, [containerRef.current, style?.height, style?.width]);

  // 卡牌宽高比
  const CARD_HEIGHT = size.height * 0.82; // 预留文字空间
  const CARD_WIDTH = CARD_HEIGHT * 0.7;
  const MIN_GAP = Math.max(12, CARD_WIDTH * 0.18);

  // 是否需要堆叠
  let totalWidth = cards.length * CARD_WIDTH + (cards.length - 1) * MIN_GAP;
  let useStack = totalWidth > size.width;
  let overlap = useStack
    ? (size.width - CARD_WIDTH) / (cards.length - 1)
    : CARD_WIDTH + MIN_GAP;

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
          fontSize: Math.max(18, size.height * 0.17),
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
          display: "block",
          position: "relative",
          boxSizing: "border-box",
          overflowX: "visible",
          paddingLeft: 16,
        }}
        onDragOver={cards.length < maxCards ? e => { e.preventDefault(); } : undefined}
        onDrop={cards.length < maxCards ? () => onDrop(zone) : undefined}
      >
        {cards.map((card, idx) => (
          <div
            key={card.suit + card.value + idx}
            className="cardzone-card"
            style={{
              position: "absolute",
              left: useStack ? (idx * overlap + 16) : (idx * (CARD_WIDTH + MIN_GAP) + 16),
              top: "50%",
              transform: `translateY(-50%)`,
              width: CARD_WIDTH,
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
