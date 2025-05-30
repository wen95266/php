const API_DEAL = 'https://wenge.cloudns.ch/cards.php';
const API_JUDGE = 'https://wenge.cloudns.ch/judge.php';
const CARD_IMG_DIR = 'cards/';

let hand = [];
let front = [];
let back = [];
let draggingCard = null;

const frontHand = document.getElementById('front-hand');
const backHand = document.getElementById('back-hand');
const middleHand = document.getElementById('middle-hand');
const frontCount = document.getElementById('front-count');
const middleCount = document.getElementById('middle-count');
const backCount = document.getElementById('back-count');
const dealBtn = document.getElementById('dealCardsBtn');
const autoBtn = document.getElementById('autoGroupBtn');
const resetBtn = document.getElementById('resetArrangementBtn');
const submitBtn = document.getElementById('submitHandsBtn');
const msgBar = document.getElementById('game-message');

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
    // 牌归属
    const left = hand.filter(c => !front.includes(c) && !back.includes(c));
    renderRow(frontHand, front, 3);
    renderRow(backHand, back, 5);
    renderMiddleHand(middleHand, left);

    frontCount.textContent = `(${front.length}/3)`;
    middleCount.textContent = `(${left.length}/13)`;
    backCount.textContent = `(${back.length}/5)`;

    resetBtn.disabled = hand.length === 0;
    submitBtn.disabled = !(front.length === 3 && back.length === 5 && (front.length + back.length === 8) && hand.length === 13);
    autoBtn.disabled = hand.length === 0;
}

function createCardElem(card) {
    const div = document.createElement('div');
    div.className = 'card-container';
    div.setAttribute('data-card', card);
    div.draggable = true;
    const img = document.createElement('img');
    img.className = 'card-image';
    img.src = CARD_IMG_DIR + cardToFilename(card);
    img.alt = card;
    div.appendChild(img);

    // 拖拽
    div.addEventListener('dragstart', e => {
        draggingCard = card;
        div.classList.add('dragging');
        setTimeout(() => div.classList.add('dragging'), 0);
    });
    div.addEventListener('dragend', e => {
        draggingCard = null;
        div.classList.remove('dragging');
    });

    // 点击（移动到目标区/回到手牌）
    div.addEventListener('click', () => {
        if (hand.includes(card)) {
            if (!front.includes(card) && front.length < 3) {
                front.push(card);
            } else if (!back.includes(card) && back.length < 5) {
                back.push(card);
            }
        } else if (front.includes(card)) {
            front = front.filter(c => c !== card);
        } else if (back.includes(card)) {
            back = back.filter(c => c !== card);
        }
        renderAll();
        msgBar.textContent = '';
    });

    return div;
}

function renderRow(parent, arr, max) {
    parent.innerHTML = '';
    arr.forEach(card => parent.appendChild(createCardElem(card)));
    for (let i = arr.length; i < max; ++i) {
        const ph = document.createElement('div');
        ph.className = 'drop-placeholder';
        parent.appendChild(ph);
    }
    // 自适应牌宽度（flex:1）
    const all = parent.querySelectorAll('.card-container, .drop-placeholder');
    all.forEach(el => {
        el.style.flex = `1 1 0`;
        el.style.minWidth = 0;
        el.style.maxWidth = "52px";
        el.style.width = "100%";
    });
}


function renderMiddleHand(parent, cards) {
    parent.innerHTML = '';
    // 13张牌横向一行显示，不堆叠，每张等宽
    cards.forEach(card => parent.appendChild(createCardElem(card)));
    for (let i = cards.length; i < 13; ++i) {
        const ph = document.createElement('div');
        ph.className = 'drop-placeholder';
        parent.appendChild(ph);
    }
    // 等宽分布
    const all = parent.querySelectorAll('.card-container, .drop-placeholder');
    all.forEach(el => {
        el.style.flex = `0 1 6.8%`;
        el.style.minWidth = "46px";
        el.style.maxWidth = "52px";
        el.style.width = "6.8%";
    });
}

function setupDragAndDrop() {
    [frontHand, backHand, middleHand].forEach(zone => {
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
            if (!draggingCard) return;
            moveCardToZone(draggingCard, zone.id);
            draggingCard = null;
        });
    });
}
function moveCardToZone(card, targetId) {
    front = front.filter(c => c !== card);
    back = back.filter(c => c !== card);
    // 只允许任意手牌拖到头道或尾道，拖回middle
    if (targetId === 'front-hand' && front.length < 3) front.push(card);
    else if (targetId === 'back-hand' && back.length < 5) back.push(card);
    else if (targetId === 'middle-hand') {
        // 拖回手牌区
        // nothing: just removed from front/back above
    }
    renderAll();
    msgBar.textContent = '';
}

// 智能分牌：大到小排序后头道3/尾道5
function autoGroup() {
    if (!hand.length) return;
    let sorted = [...hand].sort((a, b) => cardValue(b) - cardValue(a));
    front = sorted.slice(0, 3);
    back = sorted.slice(3, 8);
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
        front = [], back = [];
        renderAll();
        msgBar.textContent = '';
    } catch (e) {
        msgBar.textContent = '发牌失败，请重试';
    }
    dealBtn.disabled = false;
};
autoBtn.onclick = autoGroup;
resetBtn.onclick = function() {
    front = [], back = [];
    renderAll();
    msgBar.textContent = '';
};
submitBtn.onclick = async function() {
    if (front.length !== 3 || back.length !== 5 || hand.length !== 13) {
        msgBar.textContent = '请将3张牌放到头道、5张牌放到尾道，其余留在手牌区';
        return;
    }
    // middle区就是剩下的5张
    let middle = hand.filter(c => !front.includes(c) && !back.includes(c));
    if (middle.length !== 5) {
        msgBar.textContent = '请将3张牌放到头道、5张牌放到尾道，其余留在手牌区';
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
    } catch (e) {
        msgBar.textContent = '判定失败，请重试';
    }
    submitBtn.disabled = false;
};

setupDragAndDrop();
renderAll();
