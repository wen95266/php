import React from 'react';

export default function Card({ name }) {
  // name 形如 "♠6", "♥K"
  return (
    <div style={{
      display: 'inline-block',
      border: '1px solid #ccc',
      borderRadius: 8,
      padding: 8,
      margin: 4,
      width: 60,
      height: 90,
      fontSize: 24,
      background: '#fff',
      textAlign: 'center',
      verticalAlign: 'top'
    }}>
      <div>{name}</div>
    </div>
  );
}
