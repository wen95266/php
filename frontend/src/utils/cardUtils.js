// 获取牌面值
export const getCardValue = (value) => {
  const values = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'jack': 11, 'queen': 12, 'king': 13, 'ace': 14
  };
  return values[value] || 0;
};

// 获取花色符号
export const getSuitSymbol = (suit) => {
  const symbols = {
    'hearts': '♥',
    'diamonds': '♦',
    'clubs': '♣',
    'spades': '♠'
  };
  return symbols[suit] || '';
};

// 获取花色颜色
export const getSuitColor = (suit) => {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
};

// 判断牌型
export const getCardType = (cards) => {
  if (cards.length === 0) return '无';
  
  // 判断同花顺、四条等复杂牌型
  // 简化处理：仅判断顺子、同花、对子等基本牌型
  if (isStraightFlush(cards)) return '同花顺';
  if (isFourOfAKind(cards)) return '四条';
  if (isFullHouse(cards)) return '满堂红';
  if (isFlush(cards)) return '同花';
  if (isStraight(cards)) return '顺子';
  if (isThreeOfAKind(cards)) return '三条';
  if (isTwoPairs(cards)) return '两对';
  if (isOnePair(cards)) return '一对';
  
  return '高牌';
};

// 判断是否顺子
const isStraight = (cards) => {
  // 简化的顺子判断逻辑
  return false;
};

// 判断是否同花
const isFlush = (cards) => {
  const firstSuit = cards[0].suit;
  return cards.every(card => card.suit === firstSuit);
};

// 其他牌型判断函数...
