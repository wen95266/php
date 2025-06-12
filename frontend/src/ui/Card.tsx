import React from 'react';

type CardProps = {
  name: string; // 例如 ace_of_spades
};

export default function Card({ name }: CardProps) {
  return (
    <img
      src={`/cards/${name}.svg`}
      alt={name}
      style={{ width: 60, height: 90, margin: 2, borderRadius: 6, boxShadow: '0 1px 3px #999' }}
    />
  );
}
