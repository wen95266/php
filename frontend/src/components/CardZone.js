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
  const CARD_HEIGHT = Math.max(64, size.height * 0.82);
  const CARD_WIDTH = CARD_HEIGHT * 0.7;
  // 计算是否需要堆叠
  const maxShow = cards.length;
  const minGap = 10;
  const totalWidth = maxShow * CARD_WIDTH + (maxShow - 1) * minGap;
  // 堆叠条件：超出容器宽度
  let useStack = totalWidth > size.width;
  // 堆叠时的重叠宽度
  let overlap = useStack && cards.length > 1
    ? Math.max((size.width - CARD_WIDTH - 16) / (cards.length - 1), 20)
    : CARD_WIDTH + minGap;

  // 多选模式辅助
  let selectedArr = [];
  let selectedZone = null;
  if (selectedCard && Array.isArray(selectedCard.cards)) {
    selectedArr = selectedCard.cards;
    selectedZone = selectedCard.zone;
  } else if (selectedCard && selectedCard.card) {
    selectedArr = [selectedCard.card];
    selectedZone = selectedCard.zone;
  }

  // 判断是否有选中牌（且选区不是本区）
  const showMoveHere = selectedArr.length > 0 && selectedZone !== zone;

  // 判断卡牌是否被选中
  function isCardSelected(card) {
    return selectedArr.some(sel =>
      sel.value === card.value && sel.suit === card.suit && selectedZone === zone
    );
  }

  function handleCardClick(e, card, zone) {
    e.stopPropagation();
    onSelectCard(card, zone);
  }

  function handleZoneAreaClick(e) {
    if (showMoveHere) {
      e.stopPropagation();
      onZoneClick(zone);
    }
  }

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
        cursor: showMoveHere ? "pointer" : "default"
      }}
      onClick={handleZoneAreaClick}
    >
      {/* 右上角半透明说明，选中牌时显示“移动到此处” */}
      <div
        className="cardzone-label"
        style={{
          position: "absolute",
          top: 10,
          right: 18,
          fontWeight: 600,
          color: showMoveHere ? "#3869f6" : "#444",
          fontSize: Math.max(18, size.height * 0.17),
          zIndex: 2,
          opacity: showMoveHere ? 1 : 0.44,
          pointerEvents: "none",
          userSelect: "none",
          transition: "color 0.2s, opacity 0.2s",
          cursor: showMoveHere ? "pointer" : "default"
        }}
      >
        {showMoveHere ? `${label}（移动到此处）` : label}
      </div>
      {/* 卡牌区域 */}
      <div
        className="cardzone-cards"
        style={{
          width: "100vw",
          minWidth: "100vw",
          maxWidth: "100vw",
          height: "100%",
          position: "relative",
          boxSizing: "border-box",
          overflowX: "visible",
          paddingLeft: 8,
          display: "block"
        }}
      >
        {cards.map((card, idx) => {
          const selected = isCardSelected(card);
          // 关键：堆叠时用 absolute+left，平铺时用正常距离
          return (
            <div
              key={card.suit + card.value + idx}
              className="cardzone-card"
              style={{
                position: "absolute",
                left: useStack
                  ? (idx * overlap + 8)
                  : (idx * (CARD_WIDTH + minGap) + 8),
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
                background: selected ? "#e2f0ff" : "transparent",
                zIndex: idx,
                border: selected ? "3px solid #3869f6" : undefined,
                boxShadow: selected ? "0 0 10px #3869f6" : undefined,
                cursor: "pointer",
                transition: "left 0.18s"
              }}
              onClick={e => handleCardClick(e, card, zone)}
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
