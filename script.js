const API_DEAL = 'https://wenge.cloudns.ch/cards.php';
const API_JUDGE = 'https://wenge.cloudns.ch/judge.php';
const CARD_IMG_DIR = 'cards/';

let hand = [];
let front = [];
let back = [];
let draggingCard = null;
let aiGroupIndex = 0;

const frontHand = document.getElementById('front-hand');
const backHand = document.getElementById('back-hand');
const middleHand = document.getElementById('middle-hand');
const dealBtn = document.getElementById('dealCardsBtn');
const aiBtn = document.getElementById('aiGroupBtn');
const trusteeBtn = document.getElementById('aiTrusteeBtn');
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
    aiBtn.disabled = hand.length === 0;
    trusteeBtn.disabled = hand.length === 0;

    [frontHand, middleHand, backHand].forEach(zone => adjustCardFillFlex(zone));
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

// AI分牌——每次点击展示不同的分法（支持多种分法&AI分析）
function aiGroup() {
    if (!hand.length) return;
    let sorted = sortCards(hand);
    let modes = [
        // 分法1：头道最大，中道次大，尾道最小
        function() {
            front = sorted.slice(0, 3);
            back = sorted.slice(3, 8);
        },
        // 分法2：头道最小，中道最大，尾道次小
        function() {
            front = sorted.slice(-3);
            back = sorted.slice(0, 5);
        },
        // 分法3：AI简单对“同花/顺子/对子”优先分组
        function() {
            let copy = [...hand];
            let flush = findFlush(copy, 5);
            let straight = findStraight(copy, 5);
            let quads = findXOfAKind(copy, 4);
            if (flush.length === 5) {
                back = flush;
                copy = copy.filter(c => !flush.includes(c));
            } else if (straight.length === 5) {
                back = straight;
                copy = copy.filter(c => !straight.includes(c));
            } else if (quads.length === 4) {
                back = quads.concat(copy.filter(c=>!quads.includes(c)).slice(0,1));
                copy = copy.filter(c => !back.includes(c));
            } else {
                back = copy.slice(0,5);
                copy = copy.slice(5);
            }
            let pair = findXOfAKind(copy, 2);
            if (pair.length === 2) {
                front = pair.concat(copy.filter(c=>!pair.includes(c)).slice(0,1));
            } else {
                front = copy.slice(0,3);
            }
        },
        // 分法4：随机分配
        function() {
            let copy = [...sorted];
            shuffle(copy);
            front = copy.slice(0, 3);
            back = copy.slice(3, 8);
        },
        // 分法5：隔一张分
        function() {
            let copy = sorted.filter((c,i)=>i%2===0);
            let copy2 = sorted.filter((c,i)=>i%2!==0);
            front = copy.slice(0, 3);
            back = copy2.slice(0, 5);
        }
    ];
    modes[aiGroupIndex % modes.length]();
    aiGroupIndex++;
    renderAll();
    msgBar.textContent = `AI分牌（第${((aiGroupIndex-1)%modes.length)+1}种），继续点击可切换分法！`;
}

// 查找同花
function findFlush(cards, count) {
    let suitMap = {};
    cards.forEach(c=>{
        let suit = c[0];
        if(!suitMap[suit]) suitMap[suit]=[];
        suitMap[suit].push(c);
    });
    for(let suit in suitMap) {
        if (suitMap[suit].length >= count) return suitMap[suit].slice(0,count);
    }
    return [];
}
// 查找顺子
function findStraight(cards, count) {
    let vals = cards.map(card => {
        let v = card.slice(1);
        let n = (v==='A')?14:((v==='K')?13:((v==='Q')?12:((v==='J')?11:parseInt(v))));
        return {c:card, n};
    }).sort((a,b)=>b.n-a.n);
    for(let i=0;i<=vals.length-count;i++) {
        let arr = [vals[i]];
        let prev = vals[i].n;
        for(let j=i+1;j<vals.length&&arr.length<count;j++) {
            if(vals[j].n===prev-1) {
                arr.push(vals[j]);
                prev--;
            }
        }
        if(arr.length===count) return arr.map(x=>x.c);
    }
    return [];
}
// 查找对子、三条、四条
function findXOfAKind(cards, num) {
    let countMap = {};
    cards.forEach(c=>{
        let v = c.slice(1);
        if(!countMap[v]) countMap[v]=[];
        countMap[v].push(c);
    });
    for(let v in countMap) {
        if(countMap[v].length>=num) return countMap[v].slice(0,num);
    }
    return [];
}

// Fisher–Yates shuffle
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// AI托管弹窗
trusteeBtn.onclick = function() {
    trusteeModal.classList.add("active");
}
window.closeTrusteeModal = function () {
    trusteeModal.classList.remove("active");
}
// 托管指定局数，多种AI分法轮流用
window.doTrustee = async function (count) {
    closeTrusteeModal();
    msgBar.textContent = `AI托管${count}局中...`;
    for(let i=1;i<=count;i++) {
        await dealCardsAndAIGroup();
        await sleep(500); // 让用户看到变化
    }
    msgBar.textContent = `AI托管${count}局完成！`;
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function dealCardsAndAIGroup() {
    await dealCards();
    // 切换多种AI分法
    aiGroupIndex = Math.floor(Math.random()*5);
    aiGroup();
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
    aiGroupIndex = 0;
    msgBar.textContent = '';
};
aiBtn.onclick = aiGroup;
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
