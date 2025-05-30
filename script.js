const API_DEAL = 'https://wenge.cloudns.ch/cards.php';
const API_JUDGE = 'https://wenge.cloudns.ch/judge.php';
const CARD_IMG_DIR = 'cards/';

let hand = [];
let front = [];
let back = [];
let draggingCard = null;

// 智能分牌模式
let autoGroupIndex = 0;

const frontHand = document.getElementById('front-hand');
const backHand = document.getElementById('back-hand');
const middleHand = document.getElementById('middle-hand');
const dealBtn = document.getElementById('dealCardsBtn');
const autoBtn = document.getElementById('autoGroupBtn');
const trusteeBtn = document.getElementById('trusteeBtn');
const resetBtn = document.getElementById('resetArrangementBtn');
const compareBtn = document.getElementById('compareBtn');
const msgBar = document.getElementById('game-message');
const compareModal = document.getElementById('compareModal');
const compareResult = document.getElementById('compareResult');
const trusteeModal = document.getElementById('trusteeModal');

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
    renderRow(middleHand, left);
    renderRow(backHand, back);

    resetBtn.disabled = hand.length === 0;
    let middle = hand.filter(c => !front.includes(c) && !back.includes(c));
    compareBtn.disabled = !(
        front.length >= 3 &&
        back.length >= 5 &&
        middle.length === 5 &&
        hand.length === 13
    );
    autoBtn.disabled = hand.length === 0;
    trusteeBtn.disabled = hand.length === 0;
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

// 智能分牌——每次点击展示不同的分法（轮流常用几种类型）
function autoGroup() {
    if (!hand.length) return;
    let sorted = sortCards(hand);
    let modes = [
        // 模式1：头3大，中5次，尾5小
        function() {
            front = sorted.slice(0, 3);
            back = sorted.slice(3, 8);
        },
        // 模式2：头3小，中5大，尾5次
        function() {
            front = sorted.slice(-3);
            back = sorted.slice(0, 5);
        },
        // 模式3：随机分配
        function() {
            let copy = [...sorted];
            shuffle(copy);
            front = copy.slice(0, 3);
            back = copy.slice(3, 8);
        },
        // 模式4：隔一张分
        function() {
            let copy = sorted.filter((c,i)=>i%2===0);
            let copy2 = sorted.filter((c,i)=>i%2!==0);
            front = copy.slice(0, 3);
            back = copy2.slice(0, 5);
        }
    ];
    modes[autoGroupIndex % modes.length]();
    autoGroupIndex++;
    renderAll();
    msgBar.textContent = `已智能分牌（第${((autoGroupIndex-1)%modes.length)+1}种）可继续点击换分法！`;
}

// Fisher–Yates shuffle
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// 智能托管弹窗
trusteeBtn.onclick = function() {
    trusteeModal.classList.add("active");
}
window.closeTrusteeModal = function () {
    trusteeModal.classList.remove("active");
}
// 托管指定局数
window.doTrustee = async function (count) {
    closeTrusteeModal();
    msgBar.textContent = `正在托管${count}局...`;
    for(let i=1;i<=count;i++) {
        await dealCardsAndAutoGroup();
        await sleep(500); // 让用户看到变化
    }
    msgBar.textContent = `托管${count}局完成！`;
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function dealCardsAndAutoGroup() {
    await dealCards();
    autoGroupIndex = Math.floor(Math.random()*1000); // 保证每次不同分法
    autoGroup();
}
async function dealCards() {
    dealBtn.disabled = true;
    try {
        const res = await fetch(API_DEAL);
        const data = await res.json();
        hand = sortCards(data.cards);
        front = [], back = [];
        renderAll();
    } catch (e) {
        msgBar.textContent = '发牌失败，请重试';
    }
    dealBtn.disabled = false;
}

// 比牌（弹窗显示结果）
compareBtn.onclick = async function() {
    let middle = hand.filter(c => !front.includes(c) && !back.includes(c));
    if (!(front.length >= 3 && back.length >= 5 && middle.length === 5 && hand.length === 13)) {
        msgBar.textContent = '请将至少3张牌放到头道、5张牌放到尾道，其余5张在手牌区';
        return;
    }
    let head = front.slice(0, 3);
    let tail = back.slice(0, 5);
    let middle5 = middle;
    compareBtn.disabled = true;
    try {
        const res = await fetch(API_JUDGE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ head, middle: middle5, tail })
        });
        const data = await res.json();
        showCompareModal(formatCompareResult(data, head, middle5, tail));
    } catch (e) {
        showCompareModal('比牌失败，请重试');
    }
    compareBtn.disabled = false;
};

function formatCompareResult(data, head, middle, tail) {
    if (data.error) return '错误：' + data.error;
    let res = '';
    res += `<b>头道：</b>${head.join(' ')}<br>牌型：${data.headType}<br>`;
    res += `<b>中道：</b>${middle.join(' ')}<br>牌型：${data.middleType}<br>`;
    res += `<b>尾道：</b>${tail.join(' ')}<br>牌型：${data.tailType}<br>`;
    if (data.valid === false) res += `<span style="color:red;">顺序错误（倒水）！</span>`;
    return res;
}

function showCompareModal(html) {
    compareResult.innerHTML = html;
    compareModal.classList.add("active");
}
window.closeCompareModal = function () {
    compareModal.classList.remove("active");
}

dealBtn.onclick = async function() {
    await dealCards();
    autoGroupIndex = 0;
    msgBar.textContent = '';
};
autoBtn.onclick = autoGroup;
resetBtn.onclick = function() {
    front = [], back = [];
    renderAll();
    msgBar.textContent = '';
};

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

window.addEventListener('resize', () => { renderAll(); });
setupDragAndDrop();
renderAll();
