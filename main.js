/**
 * 扑克牌键值与图片文件名映射工具
 * @param {string} card 形如 "♠A"、"♣10"、"♥Q"、"♦K"
 * @returns {string} 图片文件名
 */
function cardToFilename(card) {
  // 花色映射
  const suitMap = {
    '♠': 'spades',
    '♥': 'hearts',
    '♦': 'diamonds',
    '♣': 'clubs'
  };
  // 数值映射
  const valueMap = {
    'A': 'ace',
    'J': 'jack',
    'Q': 'queen',
    'K': 'king'
    // 2-10 直接用数字
  };
  // 拆解
  const match = card.match(/^([♠♥♦♣])([A2-9]|10|J|Q|K)$/);
  if (!match) return '';
  const [, suit, value] = match;

  const valueStr = valueMap[value] || value; // 2-10用数字，A/J/Q/K用英文
  const suitStr = suitMap[suit];
  return `${valueStr}_of_${suitStr}.svg`;
}

document.getElementById('draw').addEventListener('click', async function() {
  // 替换为你的 serv00 PHP 后端实际地址
  const apiUrl = 'https://你的serv00用户名.serv00.net/cards.php';

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
      img.src = `cards/${cardToFilename(card)}`; // 图片放在 ./cards/ 目录下

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
