import React from "react";
import { getCardImage } from "../utils/cardUtils";

export default function Card({ card, onClick, selected }) {
  if (!card) return null;
  const imgSrc = getCardImage(card);
  return (
    <img
      src={imgSrc}
      alt={`${card.value} of ${card.suit}`}
      style={{
        border: selected ? "2px solid blue" : "1px solid #ddd",
        width: 60, margin: 2, borderRadius: 4, cursor: "pointer"
      }}
      onClick={onClick}
    />
  );
}
