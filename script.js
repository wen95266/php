const API_DEAL = 'https://wenge.cloudns.ch/cards.php';
const API_JUDGE = 'https://wenge.cloudns.ch/judge.php';
const CARD_IMG_DIR = 'cards/';

let hand = [];
let front = [];
let back = [];
let draggingCard = null;
let selectedCard = null;
let history = [];
let historyPointer = -1;

const frontHand = document.getElementById('front-hand');
const backHand = document.getElementById('back-hand');
const middleHand = document.getElementById('middle-hand');
const dealBtn = document.getElementById('dealCardsBtn');
const autoBtn = document.getElementById('autoGroupBtn');
const resetBtn = document.getElementById('resetArrangementBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const submitBtn = document.getElementById('submitHandsBtn');
const msgBar = document.getElementById('game-message');

const frontCount = document.getElementById('front-count');
const middleCount = document.getElementById('middle-count');
const backCount = document.getElementById('back-count');
const historyList = document.getElementById('history-list');

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

// ---------- 状态快照与历史 ----------
function saveHistory() {
    // 截断重做分支
    history = history.slice(0, historyPointer + 1);
    history.push({
        hand: [...hand],
        front: [...front],
        back: [...back]
    });
    historyPointer = history.length - 1;
    updateHistoryList();
}
function restoreHistory(idx) {
    if (idx < 0 || idx >= history.length) return;
    let st = history[idx];
    hand = [...st.hand];
    front = [...st.front];
    back = [...st.back];
    renderAll();
}
function updateHistoryList() {
    historyList.innerHTML = '';
    history.forEach((item, i) => {
        let li = document.createElement('li');
        li.textContent = `头道(${item.front.length}) | 中道(${item.hand.filter(c => !item.front.includes(c) && !item.back.includes(c)).length}) | 尾道(${item.back.length})`;
        if (i === historyPointer) li.style.color = "#ffe080";
        li.onclick = () => { restoreHistory(i); historyPointer = i; updateHistoryList(); };
        historyList.appendChild(li);
    });
    undoBtn.disabled = historyPointer <= 0;
    redoBtn.disabled = historyPointer >= history.length - 1;
}

function renderAll() {
    front = sortCards(front);
    back = sortCards(back);
    const left = sortCards(hand.filter(c => !front.includes(c) && !back.includes(c)));
    renderRow(frontHand, front, 'front');
    renderRow(middleHand, left, 'middle');
    renderRow(backHand, back, 'back');

    frontCount.textContent = `${front.length}张`;
    middleCount.textContent = `${left.length}张`;
    backCount.textContent = `${back.length}张`;

    resetBtn.disabled = hand.length === 0;
    let middle = hand.filter(c => !front.includes(c) && !back.includes(c));
    submitBtn.disabled = !(
        front.length >= 3 &&
        back.length >= 5 &&
        middle.length === 5 &&
        hand.length === 13
    );
    autoBtn.disabled = hand.length === 0;

    [frontHand, middleHand, backHand].forEach(zone => adjustCardFillFlex(zone));
    setTimeout(() => { // 保证高度适配
        [frontHand, middleHand, backHand].forEach(zone => adjustCardFillFlex(zone));
    }, 60);
}

function adjustCardFillFlex(zone) {
    const cards = zone.querySelectorAll('.card-container');
    if (!cards.length) return;
    let height = zone.clientHeight;
    cards.forEach(card => {
        card.style.height = height + "px";
        card.style.minHeight = height + "px";
        card.style.maxHeight = height + "px";
    });
}

function createCardElem(card, area) {
    const div = document.createElement('div');
    div.className = 'card-container';
    div.setAttribute('data-card', card);
    div.draggable = true;
    if (selectedCard === card && area === 'middle') div.classList.add('selected');
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

    // 单击选中/移动
    div.addEventListener('click', e => {
        if (area === 'middle') {
            if (selectedCard === card) {
                selectedCard = null;
            } else {
                selectedCard = card;
            }
            renderAll();
            return;
        }
        if (area === 'front' || area === 'back') {
            // 返回到手牌区
            if (front.includes(card)) front = front.filter(c => c !== card);
            if (back.includes(card)) back = back.filter(c => c !== card);
            saveHistory();
            renderAll();
            msgBar.textContent = '';
        }
    });

    // 双击：中道→头道/尾道，头道/尾道→中道
    div.addEventListener('dblclick', e => {
        if (area === 'middle') {
            // 优先头道未满3→头道，否则尾道未满5→尾道
            if (front.length < 3) front.push(card);
            else if (back.length < 5) back.push(card);
            saveHistory();
            renderAll();
        } else {
            // 返回中道
            if (front.includes(card)) front = front.filter(c => c !== card);
            if (back.includes(card)) back = back.filter(c => c !== card);
            saveHistory();
            renderAll();
        }
    });

    return div;
}

function renderRow(parent, arr, area) {
    parent.innerHTML = '';
    arr.forEach(card => parent.appendChild(createCardElem(card, area)));
}

// 拖拽支持
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
    saveHistory();
    renderAll();
    msgBar.textContent = '';
}

// 智能分牌
function autoGroup() {
    if (!hand.length) return;
    let sorted = sortCards(hand);
    front = sorted.slice(0, 3);
    back = sorted.slice(3, 8);
    saveHistory();
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
        selectedCard = null;
        history = [];
        historyPointer = -1;
        saveHistory();
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
    selectedCard = null;
    saveHistory();
    renderAll();
    msgBar.textContent = '';
};
submitBtn.onclick = async function() {
    let middle = hand.filter(c => !front.includes(c) && !back.includes(c));
    if (!(front.length >= 3 && back.length >= 5 && middle.length === 5 && hand.length === 13)) {
        msgBar.textContent = '请将至少3张牌放到头道、5张牌放到尾道，其余5张在中道';
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
undoBtn.onclick = function() {
    if (historyPointer > 0) {
        historyPointer--;
        restoreHistory(historyPointer);
        updateHistoryList();
    }
};
redoBtn.onclick = function() {
    if (historyPointer < history.length - 1) {
        historyPointer++;
        restoreHistory(historyPointer);
        updateHistoryList();
    }
};

// 键盘操作
document.addEventListener('keydown', e => {
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) undoBtn.click();
    if (e.key === 'y' && (e.ctrlKey || e.metaKey)) redoBtn.click();
    if (e.key === 'a' && selectedCard !== null) {
        // 选中的牌自动头道或尾道
        if (front.length < 3) front.push(selectedCard);
        else if (back.length < 5) back.push(selectedCard);
        saveHistory();
        renderAll();
    }
    if (e.key === 'Escape') {
        selectedCard = null;
        renderAll();
    }
});

window.addEventListener('resize', () => { renderAll(); });

setupDragAndDrop();
renderAll();
