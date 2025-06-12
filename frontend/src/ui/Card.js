import React from 'react';

export default function Card({ name }) {
  // name: ace_of_spades 形式
  const imgSrc = `/cards/${name}.svg`;
  return (
    <div style={{
      display: 'inline-block',
      border: '1px solid #ccc',
      borderRadius: 8,
      padding: 8,
      margin: 4,
      width: 60,
      height: 90,
      background: '#fff',
      textAlign: 'center',
      verticalAlign: 'top'
    }}>
      <img
        src={imgSrc}
        alt={name}
        style={{width: '100%', height: 60, objectFit: 'contain'}}
        onError={e => { e.target.style.display = 'none'; }}
      />
    </div>
  );
}
