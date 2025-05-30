// 配置后端API和图片目录
const API_URL = 'https://wenge.cloudns.ch/cards.php';
const CARD_IMG_DIR = 'cards/';

// 牌名到图片文件名
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

// 全局状态
let hand = [];         // 当前手牌数组
let selected = [];     // 当前选中的牌索引
let groups = { head: [], middle: [], tail: [] }; // 三墩分组

// 渲染手牌
function renderHand() {
  const cardsDiv = document.getElementById('cards');
  cardsDiv.innerHTML = '';
  hand.forEach((card, idx) => {
    // 该牌已分组，手牌区不显示
    if (isCardGrouped(card)) return;
    const cardEl = document.createElement('div');
    cardEl.className = 'card';
    if (selected.includes(idx)) cardEl.classList.add('selected');
    cardEl.title = '点击选中/取消';
    cardEl.addEventListener('click', () => toggleSelect(idx));
    const img = document.createElement('img');
    img.alt = card;
    img.src = `${CARD_IMG_DIR}${cardToFilename(card)}`;
    const label = document.createElement('div');
    label.className = 'card-label';
    label.textContent = card;
    cardEl.appendChild(img);
    cardEl.appendChild(label);
    cardsDiv.appendChild(cardEl);
  });
  updateGroupBtns();
}

// 判断牌是否已分组
function isCardGrouped(card) {
  return (
    groups.head.includes(card) ||
    groups.middle.includes(card) ||
    groups.tail.includes(card)
  );
}

// 选中/取消选中
function toggleSelect(idx) {
  if (selected.includes(idx)) {
    selected = selected.filter(i => i !== idx);
  } else {
    selected.push(idx);
  }
  renderHand();
}

// 渲染三墩
function renderGroups() {
  ['head', 'middle', 'tail'].forEach(group => {
    const div = document.getElementById(group);
    div.innerHTML = '';
    groups[group].forEach(card => {
      const cardEl = document.createElement('div');
      cardEl.className = 'card';
      const img = document.createElement('img');
      img.alt = card;
      img.src = `${CARD_IMG_DIR}${cardToFilename(card)}`;
      cardEl.appendChild(img);
      div.appendChild(cardEl);
    });
  });
}

// 发牌
async function deal() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    hand = data.cards;
    selected = [];
    groups = { head: [], middle: [], tail: [] };
    renderHand();
    renderGroups();
    document.getElementById('reset').disabled = false;
  } catch (err) {
    alert('获取扑克牌失败，请检查网络或后端服务！');
  }
}

// 放入某一墩
function addToGroup(group) {
  let maxLen = group === 'tail' ? 3 : 5;
  let groupArr = groups[group];
  if (groupArr.length + selected.length > maxLen) {
    alert(`本墩最多只能放${maxLen}张牌`);
    return;
  }
  // 选中的牌加入group
  selected.forEach(idx => {
    const card = hand[idx];
    if (!isCardGrouped(card)) {
      groupArr.push(card);
    }
  });
  // 清除已分组牌的选中
  selected = [];
  renderHand();
  renderGroups();
  updateGroupBtns();
}

// 更新分组按钮状态
function updateGroupBtns() {
  const selectedCards = selected
    .map(idx => hand[idx])
    .filter(card => !isCardGrouped(card));
  document.getElementById('to-head').disabled =
    selectedCards.length === 0 ||
    groups.head.length + selectedCards.length > 5;
  document.getElementById('to-middle').disabled =
    selectedCards.length === 0 ||
    groups.middle.length + selectedCards.length > 5;
  document.getElementById('to-tail').disabled =
    selectedCards.length === 0 ||
    groups.tail.length + selectedCards.length > 3;
}

// 重置分牌
function resetGroups() {
  groups = { head: [], middle: [], tail: [] };
  selected = [];
  renderHand();
  renderGroups();
  updateGroupBtns();
}

document.getElementById('draw').addEventListener('click', deal);
document.getElementById('reset').addEventListener('click', resetGroups);
document.getElementById('to-head').addEventListener('click', () => addToGroup('head'));
document.getElementById('to-middle').addEventListener('click', () => addToGroup('middle'));
document.getElementById('to-tail').addEventListener('click', () => addToGroup('tail'));

// 初始化界面
renderHand();
renderGroups();
updateGroupBtns();
