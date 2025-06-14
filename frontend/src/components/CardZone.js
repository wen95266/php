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
  onReturnToHand,
  draggingCard,
  style,
  fullArea = false
}) {
  // 是否可放牌
  const canDrop = (zone !== "mid" && cards.length < maxCards);

  // 置牌区尺寸自适应并卡牌固定占比
  // 说明文字绝对定位，卡牌可以覆盖
  // 卡牌宽度 = (可用宽度) / (maxCards)，最大高度约等于置牌区高度的 85%，宽高比约 0.7
  // 只要留一定padding即可
  const CARD_GAP = 0; // 无间隔
  const labelLeft = 16;
  const labelTop = 10;

  // 置牌区高度（已由父容器撑满）
  // 计算卡牌可用高度（去掉顶部label空间）
  // 假设置牌区高度100%，label高度大约28px
  // 卡牌高度 = 区域高度 - 28 - 10px
  // 卡牌宽度 = (区域宽度 - 2*labelLeft) / maxCards
  // 但为防止溢出，卡牌宽高比0.7
  // 用vw自适应
  const cardAreaPaddingTop = 28 + 6;
  const cardAreaPaddingBottom = 8;

  // 卡牌区宽度（减掉两侧padding）
  const cardAreaWidth = "100%";
  const cardAreaHeight = "100%";

  // 用maxCards决定每张牌宽度
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
        background: "#fafbfc",
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
          overflow: "hidden",
        }}
        onDragOver={canDrop ? e => { e.preventDefault(); } : undefined}
        onDrop={canDrop ? () => onDrop(zone) : undefined}
      >
        {/* 说明文字绝对定位，卡牌可以覆盖 */}
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
        {/* 卡牌区 */}
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
            gap: CARD_GAP,
            overflow: "hidden",
          }}
        >
          {cards.map((card, idx) => (
            <div
              key={card.value + "_" + card.suit + "_" + idx}
              draggable={zone !== "mid"}
              onDragStart={zone !== "mid" ? () => onDragStart(card, zone) : undefined}
              style={{
                marginRight: 0,
                marginLeft: 0,
                position: "relative",
                width: cardWidth,
                height: `calc(${cardWidth} / 0.7)`, // 保证卡牌比例
                maxHeight: cardHeight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                // 卡牌纵向居中
              }}
            >
              <img
                src={cardImg(card)}
                alt=""
                style={{
                  borderRadius: 4,
                  boxShadow: "1px 2px 8px #eee",
                  width: "94%",
                  height: "auto",
                  maxHeight: "100%",
                  objectFit: "contain",
                  display: "block",
                }}
              />
              {(zone === "head" || zone === "tail") && (
                <span
                  onClick={() => onReturnToHand(zone, idx)}
                  style={{
                    position: "absolute", top: 0, right: 0, background: "#f44", color: "#fff",
                    fontSize: 14, borderRadius: "0 4px 0 4px", cursor: "pointer", padding: "1px 5px", zIndex: 3
                  }}
                  title="退回手牌"
                >×</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
