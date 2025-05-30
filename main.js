// 扑克牌文本到图片文件名
function cardToFilename(card) {
  const suitMap = {
    '♠': 'spades',
    '♥': 'hearts',
    '♦': 'diamonds',
    '♣': 'clubs'
  };
  const valueMap = {
    'A': 'ace',
    'J': 'jack',
    'Q': 'queen',
    'K': 'king'
    // 2-10 直接用数字
  };
  const match = card.match(/^([♠♥♦♣])([A2-9]|10|J|Q|K)$/);
  if (!match) return '';
  const [, suit, value] = match;
  const valueStr = valueMap[value] || value;
  const suitStr = suitMap[suit];
  return `${valueStr}_of_${suitStr}.svg`;
}

document.getElementById('draw').addEventListener('click', async function() {
  const apiUrl = 'https://wenge.cloudns.ch/cards.php';
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error('网络错误');
    const data = await response.json();
    const cardsDiv = document.getElementById('cards');
    cardsDiv.innerHTML = '';
    data.cards.forEach(card => {
      const cardEl = document.createElement('div');
      cardEl.className = 'card';
      const img = document.createElement('img');
      img.alt = card;
      img.src = `cards/${cardToFilename(card)}`;
      const label = document.createElement('div');
      label.className = 'card-label';
      label.textContent = card;
      cardEl.appendChild(img);
      cardEl.appendChild(label);
      cardsDiv.appendChild(cardEl);
    });
  } catch (err) {
    alert('获取扑克牌失败，请检查网络或后端服务！');
  }
});
