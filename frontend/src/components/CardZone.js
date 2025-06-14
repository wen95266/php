import React from "react";

function cardImg(card) {
  let v = card.value;
  if (v === "A") v = "ace";
  if (v === "K") v = "king";
  if (v === "Q") v = "queen";
  if (v === "J") v = "jack";
  return `/cards/${v}_of_${card.suit}.svg`;
}

/**
 * 彻底保证：
 * - 头道/手牌/尾道所有区域的牌永远紧贴左侧，剩余空间透明占位，不居中
 * - 卡牌按maxCards平均分配格子宽度，全部区域一致
 * - 无论什么屏幕无滚动条（body、html、所有div都overflow:hidden）
 * - 卡牌自适应高度，永远不超出置牌区
 * - 说明文字绝对定位，扑克牌可覆盖
 */
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
  // 拖拽放置
  const canDrop = (zone !== "mid" && cards.length < maxCards);

  // 卡牌宽高按maxCards严格平分
  const cardBoxWidth = `calc((100vw - 40px) / ${maxCards})`; // 40px: 左右都留极小安全边距
  const cardBoxHeight = `calc(100% - 38px)`; // 38px: 顶部说明文字高度+一点点padding

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
        ...style,
        padding: 0,
        margin: 0,
        overflow: "hidden", // 无滚动条
      }}
    >
      <div
        style={{
          width: fullArea ? "100vw" : "98vw",
          height: fullArea ? "97%" : "94%",
          minHeight: fullArea ? "85%" : undefined,
          minWidth: fullArea ? "80vw" : undefined,
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
        onDragOver={canDrop ? e => { e.preventDefault(); } : undefined}
        onDrop={canDrop ? () => onDrop(zone) : undefined}
      >
        {/* 说明文字绝对定位，扑克牌可覆盖 */}
        <div style={{
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
        {/* 卡牌区：实际有牌部分紧贴左侧，右侧透明占位 */}
        <div
          style={{
            width: "100%",
            height: "100%",
            marginTop: 38,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "flex-start",
            boxSizing: "border-box",
            overflow: "hidden",
            gap: 0,
            padding: 0,
          }}
        >
          {/* 实际有牌部分 */}
          {cards.map((card, idx) => (
            <div
              key={idx}
              style={{
                width: cardBoxWidth,
                height: cardBoxHeight,
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
                  borderRadius: 0,
                  boxShadow: "none",
                  width: "94%",
                  height: "auto",
                  maxHeight: "98%",
                  maxWidth: "98%",
                  objectFit: "contain",
                  display: "block",
                  background: "none",
                  border: "none",
                  pointerEvents: "auto"
                }}
              />
            </div>
          ))}
          {/* 透明占位补足 */}
          {[...Array(maxCards - cards.length)].map((_, idx) => (
            <div
              key={`empty-${idx}`}
              style={{
                width: cardBoxWidth,
                height: cardBoxHeight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: 0,
                padding: 0,
                background: "transparent",
                opacity: 0,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
