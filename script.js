const API_DEAL = 'https://wenge.cloudns.ch/cards.php';
const API_JUDGE = 'https://wenge.cloudns.ch/judge.php';
const CARD_IMG_DIR = 'cards/';

let hand = [];
let front = [];
let middle = [];
let back = [];
let history = [];

const frontHand = document.getElementById('front-hand');
const middleHand = document.getElementById('middle-hand');
const backHand = document.getElementById('back-hand');
const frontCount = document.getElementById('front-count');
const middleCount = document.getElementById('middle-count');
const backCount = document.getElementById('back-count');
const dealBtn = document.getElementById('dealCardsBtn');
const autoBtn = document.getElementById('autoGroupBtn');
const resetBtn = document.getElementById('resetArrangementBtn');
const submitBtn = document.getElementById('submitHandsBtn');
const msgBar = document.getElementById('game-message');
const historyBar = document.getElementById('game-history');

function cardToFilename(card) {
    const suitMap = { '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs' };
    const valueMap = { 'A': 'ace', 'J': 'jack', 'Q': 'queen', 'K': 'king' };
    const match = card.match(/^([♠♥♦♣])([A2-9]|10|J|Q|K)$/);
    if (!match) return '';
    const [, suit, value] = match;
    const valueStr = valueMap[value] || value;
    const suitStr = suitMap[suit];
    return `${valueStr}_of_${suitStr}.svg`;
}

function renderAll() {
    const left = hand.filter(c => !front.includes(c) && !middle.includes(c) && !back.includes(c));
    renderHandRows(middleHand, left);
    renderRow(frontHand, front, 3);
    renderRow(backHand, back, 5);

    frontCount.textContent = `(${front.length}/3)`;
    middleCount.textContent = `(${left.length}/13)`;
    backCount.textContent = `(${back.length}/5)`;

    resetBtn.disabled = hand.length === 0;
    submitBtn.disabled = !(front.length === 3 && middle.length === 5 && back.length === 5);
    autoBtn.disabled = hand.length === 0;
    renderHistory();
}

function createCardElem(card, draggable = true) {
    const div = document.createElement('div');
    div.className = 'card-container';
    div.setAttribute('data-card', card);
    if (draggable) div.draggable = true;
    const img = document.createElement('img');
    img.className = 'card-image';
    img.src = CARD_IMG_DIR + cardToFilename(card);
    img.alt = card;
    div.appendChild(img);
    return div;
}

function renderHandRows(parent, cards) {
    parent.innerHTML = '';
    const rows = [[], [], []];
    rows[0] = cards.slice(0, 4);
    rows[1] = cards.slice(4, 9);
    rows[2] = cards.slice(9, 13);
    rows.forEach((row, i) => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'hand-area-sub-row';
        row.forEach(card => {
            rowDiv.appendChild(createCardElem(card, true));
        });
        parent.appendChild(rowDiv);
    });
}

function renderRow(parent, arr, max) {
    parent.innerHTML = '';
    arr.forEach(card => {
        parent.appendChild(createCardElem(card, true));
    });
    for (let i = arr.length; i < max; ++i) {
        const ph = document.createElement('div');
        ph.className = 'drop-placeholder';
        parent.appendChild(ph);
    }
}

function renderHistory() {
    if (!history.length) {
        historyBar.innerHTML = '';
        return;
    }
    historyBar.innerHTML = `<b>历史:</b><br>` + history.map(h =>
        `[${h.time}] 头道:<span style="color:#ffda00">${h.headType}</span> 中道:<span style="color:#ffda00">${h.middleType}</span> 尾道:<span style="color:#ffda00">${h.tailType}</span> ${(h.valid ? '' : '<span style="color:#f44;">(倒水)</span>')}`
    ).join('<br>');
}

function setupDragAndDrop() {
    document.querySelectorAll('.arranged-hand').forEach(zone => {
        zone.addEventListener('dragover', e => {
            e.preventDefault();
            zone.classList.add('drag-over');
        });
        zone.addEventListener('dragleave', e => {
            zone.classList.remove('drag-over');
        });
        zone.addEventListener('drop', e => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            const card = e.dataTransfer.getData('text/plain');
            onCardDrop(card, zone.id);
        });
    });
    document.addEventListener('dragstart', function(e) {
        if (e.target.classList.contains('card-container')) {
            e.dataTransfer.setData('text/plain', e.target.getAttribute('data-card'));
            setTimeout(() => e.target.classList.add('dragging'), 0);
        }
    });
    document.addEventListener('dragend', function(e) {
        if (e.target.classList.contains('card-container')) {
            e.target.classList.remove('dragging');
        }
    });
    document.addEventListener('click', function(e) {
        const el = e.target.closest('.card-container');
        if (!el) return;
        const card = el.getAttribute('data-card');
        if (hand.includes(card)) {
            if (front.length < 3) { front.push(card); }
            else if (middle.length < 5) { middle.push(card); }
            else if (back.length < 5) { back.push(card); }
            else msgBar.textContent = '三道已满！';
        } else if (front.includes(card)) {
            front = front.filter(c => c !== card);
        } else if (middle.includes(card)) {
            middle = middle.filter(c => c !== card);
        } else if (back.includes(card)) {
            back = back.filter(c => c !== card);
        }
        renderAll();
        msgBar.textContent = '';
    });
}

function onCardDrop(card, targetId) {
    front = front.filter(c => c !== card);
    middle = middle.filter(c => c !== card);
    back = back.filter(c => c !== card);
    if (targetId === 'front-hand' && front.length < 3) front.push(card);
    else if (targetId === 'middle-hand') middle.push(card);
    else if (targetId === 'back-hand' && back.length < 5) back.push(card);
    renderAll();
    msgBar.textContent = '';
}

// 智能分牌：大到小排序后 头道3/中道5/尾道5
function autoGroup() {
    if (!hand.length) return;
    let sorted = [...hand].sort((a, b) => cardValue(b) - cardValue(a));
    front = sorted.slice(0, 3);
    middle = sorted.slice(3, 8);
    back = sorted.slice(8, 13);
    renderAll();
    msgBar.textContent = '已智能分牌，可手动微调！';
}
function cardValue(card) {
    const v = card.slice(1);
    if (v === 'A') return 14;
    if (v === 'K') return 13;
    if (v === 'Q') return 12;
    if (v === 'J') return 11;
    return parseInt(v, 10);
}

dealBtn.onclick = async function() {
    dealBtn.disabled = true;
    msgBar.textContent = '正在发牌...';
    try {
        const res = await fetch(API_DEAL);
        const data = await res.json();
        hand = data.cards;
        front = [], middle = [], back = [];
        renderAll();
        msgBar.textContent = '';
    } catch (e) {
        msgBar.textContent = '发牌失败，请重试';
    }
    dealBtn.disabled = false;
};
autoBtn.onclick = autoGroup;
resetBtn.onclick = function() {
    front = [], middle = [], back = [];
    renderAll();
    msgBar.textContent = '';
};
submitBtn.onclick = async function() {
    if (front.length !== 3 || middle.length !== 5 || back.length !== 5) {
        msgBar.textContent = '头道3张，中道5张，尾道5张';
        return;
    }
    msgBar.textContent = '正在判定...';
    submitBtn.disabled = true;
    try {
        const res = await fetch(API_JUDGE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ head: front, middle, tail: back })
        });
        const data = await res.json();
        if (data.error) {
            msgBar.textContent = '错误：' + data.error;
        } else if (data.valid === false) {
            msgBar.textContent = `牌型: 头道${data.headType} 中道${data.middleType} 尾道${data.tailType}（倒水顺序错误）`;
        } else {
            msgBar.textContent = `牌型: 头道${data.headType} 中道${data.middleType} 尾道${data.tailType}`;
        }
        // 存历史
        history.unshift({
            time: (new Date()).toLocaleTimeString(),
            headType: data.headType,
            middleType: data.middleType,
            tailType: data.tailType,
            valid: data.valid
        });
        if (history.length > 6) history = history.slice(0, 6);
        renderHistory();
    } catch (e) {
        msgBar.textContent = '判定失败，请重试';
    }
    submitBtn.disabled = false;
};

setupDragAndDrop();
renderAll();
