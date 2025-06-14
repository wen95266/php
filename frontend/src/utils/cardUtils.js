// 牌面与图片文件名映射
export function getCardImage(card) {
  // card: { value: '10', suit: 'clubs' } 或 { value: 'A', suit: 'spades' }
  const valueMap = { 'A': 'ace', 'J': 'jack', 'Q': 'queen', 'K': 'king' };
  const suitMap = { 'spades': 'spades', 'hearts': 'hearts', 'diamonds': 'diamonds', 'clubs': 'clubs' };
  let value = valueMap[card.value] || card.value;
  return `/cards/${value}_of_${suitMap[card.suit]}.svg`;
}

// 扑克牌标准顺序
export const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
export const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
