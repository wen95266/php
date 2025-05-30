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
const dealBtn = document.getElementById('dealCardsBtn');
const autoBtn = document.getElementById('autoGroupBtn');
const resetBtn = document.getElementById('resetArrangementBtn');
const submitBtn = document.getElementById('submitHandsBtn');
const msgBar = document.getElementById('game-message');

const cardOrder = (() => {
    const suitOrder = { '♠': 4, '♥': 3, '♣': 2, '♦': 1 };
    const valueOrder = { 'A': 14, 'K': 13, 'Q': 12, 'J': 11 };
    for (let i = 2; i <= 10; ++i) valueOrder[i + ''] = i;
    return function(card) {
        const suit = card[0];
        const v = card.slice(1);
        return (valueOrder[v] || 0) * 10 + (suitOrder[suit] || 0);
    };
})();

function sortCards(arr) {
    return arr.slice().sort((a, b) => cardOrder(b) - cardOrder(a));
}

function renderAll() {
    front = sortCards(front);
    back = sortCards(back);
    const left = sortCards(hand.filter(c => !front.includes(c) && !back.includes(c)));
    renderRow(frontHand, front);
    renderRowMiddle(middleHand, left);
    renderRow(backHand, back);

    resetBtn.disabled = hand.length === 0;
    let middle = hand.filter(c => !front.includes(c) && !back.includes(c));
    submitBtn.disabled = !(
        front.length >= 3 &&
        back.length >= 5 &&
        middle.length === 5 &&
        hand.length === 13
    );
    autoBtn.disabled = hand.length === 0;

    [frontHand, backHand].forEach(zone => adjustCardFillFlex(zone));
    adjustCardFillGrid(middleHand, 13);
}

function adjustCardFillFlex(zone) {
    const cards = zone.querySelectorAll('.card-container');
    if (!cards.length) return;
    let available = zone.clientWidth - 2;
    let cardNum = cards.length;
    let gapTotal = (cardNum - 1) * 0;
    let width = cardNum > 0 ? (available - gapTotal) / cardNum : available;
    let height = width * (1/1.45);
    let maxHeight = zone.clientHeight || window.innerHeight / 4;
    if (height > maxHeight) {
        height = maxHeight;
        width = height * 1.45;
    }
    cards.forEach(card => {
        card.style.width = width + "px";
        card.style.height = height + "px";
        card.style.minWidth = width + "px";
        card.style.maxWidth = width + "px";
        card.style.minHeight = height + "px";
        card.style.maxHeight = height + "px";
    });
}

function adjustCardFillGrid(zone, count) {
    // 13格均分，每格1fr，高度取父容器高度
    const cards = zone.querySelectorAll('.card-container');
    const gridCols = count;
    let height = zone.clientHeight;
    cards.forEach(card => {
        card.style.width = "100%";
        card.style.height = height + "px";
        card.style.minWidth = "0";
        card.style.maxWidth = "none";
        card.style.minHeight = height + "px";
        card.style.maxHeight = height + "px";
    });
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
            front = front.filter(c => c !== card);
            back = back.filter(c => c !== card);
            if (front.length < back.length) front.push(card);
            else back.push(card);
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

function renderRow(parent, arr) {
    parent.innerHTML = '';
    arr.forEach(card => parent.appendChild(createCardElem(card)));
}

function renderRowMiddle(parent, arr) {
    parent.innerHTML = '';
    // 13格，没牌的放空div
    for(let i=0; i<13; ++i) {
        if(arr[i]) {
            parent.appendChild(createCardElem(arr[i]));
        } else {
            const empty = document.createElement("div");
            empty.className = "card-container";
            empty.style.background = "none";
            empty.style.boxShadow = "none";
            empty.style.cursor = "default";
            empty.style.pointerEvents = "none";
            empty.style.borderRadius = "0";
            parent.appendChild(empty);
        }
    }
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
    if (targetId === 'front-hand') front.push(card);
    else if (targetId === 'back-hand') back.push(card);
    renderAll();
    msgBar.textContent = '';
}

function autoGroup() {
    if (!hand.length) return;
    let sorted = sortCards(hand);
    front = sorted.slice(0, 3);
    back = sorted.slice(3, 8);
    renderAll();
    msgBar.textContent = '已智能分牌，可手动微调！';
}
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

dealBtn.onclick = async function() {
    dealBtn.disabled = true;
    msgBar.textContent = '正在发牌...';
    try {
        const res = await fetch(API_DEAL);
        const data = await res.json();
        hand = sortCards(data.cards);
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
    let middle = hand.filter(c => !front.includes(c) && !back.includes(c));
    if (!(front.length >= 3 && back.length >= 5 && middle.length === 5 && hand.length === 13)) {
        msgBar.textContent = '请将至少3张牌放到头道、5张牌放到尾道，其余5张在手牌区';
        return;
    }
    let head = front.slice(0, 3);
    let tail = back.slice(0, 5);
    let middle5 = middle;
    msgBar.textContent = '正在判定...';
    submitBtn.disabled = true;
    try {
        const res = await fetch(API_JUDGE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ head, middle: middle5, tail })
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

window.addEventListener('resize', () => { renderAll(); });

setupDragAndDrop();
renderAll();
