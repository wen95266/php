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
  cards,
  selectedCard,
  onSelectCard,
  onZoneClick,
  style
}) {
  // 获取实际高度和宽度
  const containerRef = React.useRef(null);
  const [size, setSize] = React.useState({ height: 120, width: 600 });
  React.useLayoutEffect(() => {
    if (containerRef.current) {
      setSize({
        height: containerRef.current.offsetHeight,
        width: containerRef.current.offsetWidth
      });
    }
  }, [containerRef.current, style?.height, style?.width]);

  // 卡牌宽高比
  const CARD_HEIGHT = size.height * 0.82;
  const CARD_WIDTH = CARD_HEIGHT * 0.7;
  const MIN_GAP = Math.max(12, CARD_WIDTH * 0.18);

  // 是否需要堆叠
  const totalWidth = cards.length * CARD_WIDTH + (cards.length - 1) * MIN_GAP;
  const useStack = totalWidth > size.width;
  const overlap = useStack && cards.length > 1
    ? (size.width - CARD_WIDTH - 32) / (cards.length - 1)
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
        background: "#fcfcff",
        position: "relative",
        ...style,
        padding: 0,
        margin: 0,
        overflow: "hidden",
        cursor: "pointer"
      }}
      onClick={e => {
        // 只在点击空白区时触发onZoneClick
        if (e.target === e.currentTarget) onZoneClick(zone);
      }}
    >
      {/* 右上角半透明说明，只显示头道/中道/尾道 */}
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
        {label}
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
      >
        {cards.map((card, idx) => {
          const isSelected =
            selectedCard &&
            selectedCard.card.value === card.value &&
            selectedCard.card.suit === card.suit &&
            selectedCard.zone === zone;
          return (
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
                background: isSelected ? "#e2f0ff" : "transparent",
                zIndex: idx,
                border: isSelected ? "3px solid #3869f6" : undefined,
                boxShadow: isSelected ? "0 0 10px #3869f6" : undefined,
                cursor: "pointer"
              }}
              onClick={e => {
                e.stopPropagation();
                onSelectCard(card, zone);
              }}
            >
              <img
                src={cardImg(card)}
                alt=""
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
                draggable={false}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
