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
          width: fullArea ? "92vw" : "auto",
          height: fullArea ? `calc(100% - 24px)` : "auto",
          minHeight: fullArea ? "82%" : undefined,
          minWidth: fullArea ? "80vw" : undefined,
          border: "2px dashed #bbb",
          borderRadius: 8,
          margin: "0 auto",
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          flexWrap: "wrap",
          transition: "border 0.2s",
          boxShadow: "0 2px 6px #fafafa",
          opacity: (cards.length >= maxCards && zone !== "hand" && zone !== "mid") ? 0.7 : 1,
          position: "relative",
        }}
        onDragOver={canDrop ? e => { e.preventDefault(); } : undefined}
        onDrop={canDrop ? () => onDrop(zone) : undefined}
      >
        <div style={{
          position: "absolute",
          top: 10,
          left: 18,
          fontWeight: 600,
          color: "#444",
          fontSize: 18,
          zIndex: 2,
          pointerEvents: "none"
        }}>
          {label} ({cards.length}/{maxCards}):
        </div>
        <div style={{
          marginLeft: 110,
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          minHeight: 70,
        }}>
          {cards.map((card, idx) => (
            <div
              key={card.value + "_" + card.suit + "_" + idx}
              draggable={zone !== "mid"}
              onDragStart={zone !== "mid" ? () => onDragStart(card, zone) : undefined}
              style={{
                margin: "0 3px",
                position: "relative"
              }}
            >
              <img src={cardImg(card)} alt="" width={50}
                style={{ borderRadius: 4, boxShadow: "1px 2px 8px #eee" }} />
              {(zone === "head" || zone === "tail") && (
                <span
                  onClick={() => onReturnToHand(zone, idx)}
                  style={{
                    position: "absolute", top: 0, right: 0, background: "#f44", color: "#fff",
                    fontSize: 12, borderRadius: "0 4px 0 4px", cursor: "pointer", padding: "1px 4px"
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
