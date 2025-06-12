import React from 'react';

// 花色映射（符号 => 英文）
const suitMap = {
  '♠': 'spades',
  '♥': 'hearts',
  '♣': 'clubs',
  '♦': 'diamonds'
};
// 点数映射（牌面 => 英文/数字）
const rankMap = {
  'A': 'ace',
  'K': 'king',
  'Q': 'queen',
  'J': 'jack',
  '10': '10',
  '9': '9',
  '8': '8',
  '7': '7',
  '6': '6',
  '5': '5',
  '4': '4',
  '3': '3',
  '2': '2'
};

// 解析 name 形如 ♠A, ♥10, ♣4...
function parseCard(name) {
  const suit = suitMap[name[0]];
  const rank = rankMap[name.slice(1)];
  return { suit, rank };
}

export default function Card({ name }) {
  const { suit, rank } = parseCard(name);
  // 例：ace_of_spades.svg, 10_of_clubs.svg
  const imgFile = rank && suit ? `${rank}_of_${suit}.svg` : '';
  const imgSrc = imgFile ? `/cards/${imgFile}` : '';

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
      {imgSrc && (
        <img
          src={imgSrc}
          alt={name}
          style={{width: '100%', height: 60, objectFit: 'contain'}}
          onError={e => { e.target.style.display = 'none'; }}
        />
      )}
      <div>{name}</div>
    </div>
  );
}
