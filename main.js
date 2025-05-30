// 配置后端API和图片目录
const API_URL = 'https://wenge.cloudns.ch/cards.php';
const JUDGE_API = 'https://wenge.cloudns.ch/judge.php';
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
  updateControlBtns();
}

function isCardGrouped(card) {
  return (
    groups.head.includes(card) ||
    groups.middle.includes(card) ||
    groups.tail.includes(card)
  );
}

function toggleSelect(idx) {
  if (selected.includes(idx)) {
    selected = selected.filter(i => i !== idx);
  } else {
    selected.push(idx);
  }
  renderHand();
}

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

async function deal() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    hand = data.cards;
    selected = [];
    groups = { head: [], middle: [], tail: [] };
    document.getElementById('result').textContent = '';
    renderHand();
    renderGroups();
    document.getElementById('reset').disabled = false;
    document.getElementById('auto-group').disabled = false;
    document.getElementById('submit').disabled = true;
  } catch (err) {
    alert('获取扑克牌失败，请检查网络或后端服务！');
  }
}

function addToGroup(group) {
  let maxLen = group === 'head' ? 3 : 5;
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
  selected = [];
  renderHand();
  renderGroups();
  updateGroupBtns();
  updateControlBtns();
}

function updateGroupBtns() {
  const selectedCards = selected
    .map(idx => hand[idx])
    .filter(card => !isCardGrouped(card));
  document.getElementById('to-head').disabled =
    selectedCards.length === 0 ||
    groups.head.length + selectedCards.length > 3;
  document.getElementById('to-middle').disabled =
    selectedCards.length === 0 ||
    groups.middle.length + selectedCards.length > 5;
  document.getElementById('to-tail').disabled =
    selectedCards.length === 0 ||
    groups.tail.length + selectedCards.length > 5;
}

function updateControlBtns() {
  // 只在全部分好13张牌后才能提交
  const allGrouped = groups.head.length + groups.middle.length + groups.tail.length === 13;
  document.getElementById('submit').disabled = !allGrouped;
}

function resetGroups() {
  groups = { head: [], middle: [], tail: [] };
  selected = [];
  document.getElementById('result').textContent = '';
  renderHand();
  renderGroups();
  updateGroupBtns();
  updateControlBtns();
}

// 简单自动分组：按牌面点数自动分为头3中5尾5
function autoGroup() {
  resetGroups();
  // 牌值排序
  function cardValue(card) {
    const v = card.slice(1);
    if (v === 'A') return 14;
    if (v === 'K') return 13;
    if (v === 'Q') return 12;
    if (v === 'J') return 11;
    return parseInt(v, 10);
  }
  const sorted = [...hand].sort((a, b) => cardValue(b) - cardValue(a));
  groups.head = sorted.slice(0, 3);
  groups.middle = sorted.slice(3, 8);
  groups.tail = sorted.slice(8, 13);
  renderHand();
  renderGroups();
  updateGroupBtns();
  updateControlBtns();
}

// 提交分牌给后端，显示判定结果
async function submitGroups() {
  if (groups.head.length !== 3 || groups.middle.length !== 5 || groups.tail.length !== 5) {
    alert('请正确分配三墩（头3张，中5张，尾5张）！');
    return;
  }
  document.getElementById('result').textContent = '正在判定牌型...';
  try {
    const res = await fetch(JUDGE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(groups)
    });
    const data = await res.json();
    let html = `
      头墩：${data.headType} <br>
      中墩：${data.middleType} <br>
      尾墩：${data.tailType}
    `;
    if (data.error) html = `错误：${data.error}`;
    document.getElementById('result').innerHTML = html;
  } catch (err) {
    document.getElementById('result').textContent = '判定失败，请检查网络或后端服务。';
  }
}

document.getElementById('draw').addEventListener('click', deal);
document.getElementById('reset').addEventListener('click', resetGroups);
document.getElementById('auto-group').addEventListener('click', autoGroup);
document.getElementById('submit').addEventListener('click', submitGroups);
document.getElementById('to-head').addEventListener('click', () => addToGroup('head'));
document.getElementById('to-middle').addEventListener('click', () => addToGroup('middle'));
document.getElementById('to-tail').addEventListener('click', () => addToGroup('tail'));

// 初始化界面
renderHand();
renderGroups();
updateGroupBtns();
updateControlBtns();
