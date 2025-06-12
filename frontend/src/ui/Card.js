import React from 'react';

export default function Card({ name }) {
  return (
    <img
      src={`/cards/${name}.svg`}
      alt={name}
      style={{ width: 60, height: 90, margin: 2, borderRadius: 6, boxShadow: '0 1px 3px #999' }}
    />
  );
}
