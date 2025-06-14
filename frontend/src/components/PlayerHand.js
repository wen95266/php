import React from "react";
import Card from "./Card";

export default function PlayerHand({ hand, selected, onSelect }) {
  return (
    <div style={{ display: "flex", flexDirection: "row" }}>
      {hand.map((card, i) =>
        <Card
          key={i}
          card={card}
          selected={selected?.includes(i)}
          onClick={() => onSelect && onSelect(i)}
        />
      )}
    </div>
  );
}
