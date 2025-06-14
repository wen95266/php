export function getCardImage(card) {
  const valueMap = { 'A': 'ace', 'J': 'jack', 'Q': 'queen', 'K': 'king' };
  const suitMap = { 'spades': 'spades', 'hearts': 'hearts', 'diamonds': 'diamonds', 'clubs': 'clubs' };
  let value = valueMap[card.value] || card.value;
  return `/cards/${value}_of_${suitMap[card.suit]}.svg`;
}

export const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
export const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
