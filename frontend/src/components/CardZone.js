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

// 只自适应最大宽高，保证13张牌不溢出横幅，尽量放大宽高
function calcCardSize(cardCount, areaWidth, areaHeight, gap = 12, aspect = 0.725) {
  // 在areaWidth范围内排满cardCount张扑克牌的最大宽高
  // aspect为牌面宽高比，gap为间距
  const totalGap = gap * (cardCount - 1);
  // 先按宽限制
  let cardW = (areaWidth - totalGap) / cardCount;
  let cardH = cardW / aspect;
  // 再按高限制
  if (cardH > areaHeight) {
    cardH = areaHeight;
    cardW = cardH * aspect;
    // 此时需要重新计算gap
    if (cardCount > 1) {
      gap = (areaWidth - cardCount * cardW) / (cardCount - 1);
      if (gap < 0) gap = 0;
    }
  }
  return { cardW, cardH, gap };
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
  stacked // 堆叠模式
}) {
  // 横向自适应布局
  const containerRef = React.useRef(null);
  const [containerW, setContainerW] = React.useState(window.innerWidth);
  const [containerH, setContainerH] = React.useState(120);

  React.useEffect(() => {
    function update() {
      if (containerRef.current) {
        setContainerW(containerRef.current.offsetWidth);
        setContainerH(containerRef.current.offsetHeight);
      } else {
        setContainerW(window.innerWidth);
        setContainerH(120);
      }
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const cardCount = cards.length;
  const areaW = containerW;
  // 允许自定义区域高度或使用默认
  let areaH = 120;
  if (fixedCardHeight && typeof fixedCardHeight === "number") {
    areaH = fixedCardHeight;
  } else if (typeof fixedCardHeight === "string" && fixedCardHeight.endsWith("px")) {
    areaH = parseInt(fixedCardHeight, 10);
  } else if (typeof fixedCardHeight === "string" && fixedCardHeight.endsWith("vh")) {
    areaH = window.innerHeight * parseFloat(fixedCardHeight) / 100;
  } else if (containerH) {
    areaH = containerH;
  }

  let cardW = 0, cardH = 0, gap = 12;
  if (cardCount > 0) {
    const { cardW: w, cardH: h, gap: g } = calcCardSize(cardCount, areaW - 34, areaH * 0.97, 12, 0.725);
    cardW = w;
    cardH = h;
    gap = g;
  }

  // 堆叠模式不变
  if (stacked && cards.length > 1) {
    let overlap = 18;
    return (
      <div ref={containerRef} style={{
        position: "relative",
        height: areaH,
        width: (cardW + overlap * (cards.length - 1)),
        minWidth: cardW,
        ...style
      }}>
        {cards.map((card, idx) => (
          <img
            key={idx}
            src={cardImg(card)}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              left: idx * overlap,
              top: 0,
              width: cardW,
              height: cardH,
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

  // 平铺模式：只调大牌宽高
  return (
    <div
      ref={containerRef}
      className="cardzone-outer"
      style={{
        width: "100vw",
        minWidth: "100vw",
        maxWidth: "100vw",
        height: style?.height || areaH,
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
