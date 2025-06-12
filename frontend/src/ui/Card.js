import React from 'react';

export default function Card({ name, size = {width:92, height:140}, border = false }) {
  // name: ace_of_spades 形式
  const imgSrc = `/cards/${name}.svg`;
  return (
    <div style={{
      display: 'inline-block',
      border: border ? '1.5px solid #b6c3d7' : 'none',
      borderRadius: 10,
      padding: border ? 4 : 0,
      margin: 2,
      width: size.width,
      height: size.height,
      background: 'transparent',
      textAlign: 'center',
      verticalAlign: 'top',
      boxShadow: 'none'
    }}>
      <img
        src={imgSrc}
        alt={name}
        draggable={false}
        style={{width: '98%', height: size.height-6, objectFit: 'contain'}}
        onError={e => { e.target.style.display = 'none'; }}
      />
    </div>
  );
}
