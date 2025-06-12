import React from 'react';

export default function Card({ name, size = {width:92, height:140} }) {
  // name: ace_of_spades 形式
  const imgSrc = `/cards/${name}.svg`;
  return (
    <div style={{
      display: 'inline-block',
      border: '1.5px solid #b6c3d7',
      borderRadius: 10,
      padding: 4,
      margin: 2,
      width: size.width,
      height: size.height,
      background: '#fff',
      textAlign: 'center',
      verticalAlign: 'top',
      boxShadow: '0 2px 8px #f0f0f8'
    }}>
      <img
        src={imgSrc}
        alt={name}
        style={{width: '98%', height: size.height-12, objectFit: 'contain'}}
        onError={e => { e.target.style.display = 'none'; }}
      />
    </div>
  );
}
