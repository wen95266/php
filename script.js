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
const aiBestBtn = document.getElementById('aiBestBtn');
const aiExplainBtn = document.getElementById('aiExplainBtn');
const aiSpecialBtn = document.getElementById('aiSpecialBtn');
const resetBtn = document.getElementById('resetArrangementBtn');
const compareBtn = document.getElementById('compareBtn');
const msgBar = document.getElementById('game-message');
const compareModal = document.getElementById('compareModal');
const compareResult = document.getElementById('compareResult');
const trusteeModal = document.getElementById('trusteeModal');
const explainModal = document.getElementById('explainModal');
const explainResult = document.getElementById('explainResult');

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
    aiBestBtn.disabled = hand.length === 0;
    aiExplainBtn.disabled = hand.length === 0;
    aiSpecialBtn.disabled = hand.length === 0;

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
        // 分法3：AI优先组合同花/顺子/四条/三条等
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
    // 自动防止倒水（先试全部模式，选第一个不倒水的，没有则第一个）
    let bestFront = [], bestBack = [];
    for (let i = 0; i < modes.length; ++i) {
        let tryFront = [], tryBack = [];
        front = []; back = [];
        modes[(aiGroupIndex+i)%modes.length]();
        let mid = hand.filter(c => !front.includes(c) && !back.includes(c));
        if (!isReverse(front, mid, back)) {
            bestFront = [...front];
            bestBack = [...back];
            aiGroupIndex = (aiGroupIndex+i+1)%modes.length;
            break;
        }
        if (i===0) { bestFront = [...front]; bestBack = [...back]; }
    }
    front = bestFront;
    back = bestBack;
    renderAll();
    msgBar.textContent = `AI分牌（防倒水），再点切换分法！`;
}

// AI最优分牌（枚举所有分法，选最大分数且不倒水的）
function aiBestGroup() {
    if (hand.length !== 13) return;
    let all = getAllSplits(hand);
    let best = null, bestScore = -Infinity;
    for (let i = 0; i < all.length; ++i) {
        let {front: f, middle: m, back: b} = all[i];
        if (isReverse(f, m, b)) continue;
        let score = evaluateSplit(f, m, b);
        if (score > bestScore) {
            best = all[i]; bestScore = score;
        }
    }
    if (best) {
        front = best.front;
        back = best.back;
        renderAll();
        msgBar.textContent = `AI最优分牌已完成！（分数: ${bestScore}）`;
    } else {
        aiGroup(); // fallback
        msgBar.textContent = `未找到合理分牌，已执行AI分牌`;
    }
}

// AI讲解当前分牌理由
function aiExplain() {
    let middle = hand.filter(c => !front.includes(c) && !back.includes(c));
    let text = '';
    if (front.length === 3 && back.length === 5 && middle.length === 5) {
        text += `头道：${front.join(' ')}\n中道：${middle.join(' ')}\n尾道：${back.join(' ')}\n`;
        text += explainSplit(front, middle, back);
    } else {
        text = '请先AI分牌或手动分好13张牌后再点讲解。';
    }
    explainResult.innerHTML = text.replace(/\n/g,"<br>");
    explainModal.classList.add("active");
}
window.closeExplainModal = function () {
    explainModal.classList.remove("active");
}

// AI冲特殊（优先凑“全小”、“全大”、“六对半”、“三顺子”、“三同花”、“十二皇族”、“清龙”等特殊）
function aiSpecialGroup() {
    if (hand.length !== 13) return;
    // 检查特殊型，优先级从高到低
    let special = detectSpecial(hand);
    if (special) {
        // 特殊型直接全放头道
        front = [...hand];
        back = [];
        renderAll();
        msgBar.textContent = `AI已发现特殊牌型：【${special}】`;
    } else {
        aiBestGroup();
        msgBar.textContent += '（未发现特殊型）';
    }
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

// 检查倒水
function isReverse(front, middle, back) {
    const typeOrder = {
        "散牌": 1, "对子": 2, "两对": 3, "三条": 4, "顺子": 5,
        "同花": 6, "葫芦": 7, "四条": 8, "同花顺": 9, "皇家同花顺": 10
    };
    let ft = judgeType(front), mt = judgeType(middle), bt = judgeType(back);
    return typeOrder[ft] > typeOrder[mt] || typeOrder[mt] > typeOrder[bt];
}

// 最优分牌：暴力枚举所有不倒水的分组（仅适用于13张手牌，性能可接受）
function getAllSplits(cards) {
    let all = [];
    let n = cards.length;
    let arr = [...cards];
    function comb(arr, k, cb, prefix=[]) {
        if (k === 0) { cb(prefix); return; }
        for (let i = 0; i <= arr.length - k; ++i) {
            comb(arr.slice(i+1), k-1, cb, prefix.concat(arr[i]));
        }
    }
    let used = new Set();
    comb(arr, 3, f => {
        let remain1 = arr.filter(c=>!f.includes(c));
        comb(remain1, 5, m => {
            let b = remain1.filter(c=>!m.includes(c));
            let key = [...f,...m,...b].sort().join(",");
            if (used.has(key)) return;
            used.add(key);
            all.push({front: f, middle: m, back: b});
        });
    });
    return all;
}

// 分数简单估算：额外加分给葫芦、顺子、同花、四条、同花顺等，头道对子加分
function evaluateSplit(f, m, b) {
    let order = {
        "散牌": 0, "对子": 10, "两对": 15, "三条": 25, "顺子": 30,
        "同花": 30, "葫芦": 45, "四条": 60, "同花顺": 100, "皇家同花顺": 120
    };
    let ft = judgeType(f), mt = judgeType(m), bt = judgeType(b);
    let score = order[ft] + order[mt]*2 + order[bt]*2.5;
    // 头道对子及以上加权
    if (ft === "对子" || ft === "三条") score += 10;
    // 顺子及以上再奖励
    if (mt === "顺子" || mt === "同花" || mt === "同花顺" || mt === "皇家同花顺") score += 10;
    if (bt === "顺子" || bt === "同花" || bt === "同花顺" || bt === "皇家同花顺") score += 12;
    return score;
}

// 牌型判定
function judgeType(cards) {
    if (!cards || cards.length < 3) return "散牌";
    let values = cards.map(c => {
        let v = c.slice(1);
        if (v === "A") return 14;
        if (v === "K") return 13;
        if (v === "Q") return 12;
        if (v === "J") return 11;
        return parseInt(v);
    });
    let suits = cards.map(c => c[0]);
    let uniqVals = [...new Set(values)];
    let uniqSuits = [...new Set(suits)];
    let counts = {};
    values.forEach(v => counts[v] = (counts[v] || 0) + 1);
    let countArr = Object.values(counts).sort((a, b) => b - a);
    let isFlush = uniqSuits.length === 1;
    let isStraight = uniqVals.length === cards.length &&
        (Math.max(...uniqVals) - Math.min(...uniqVals) === cards.length - 1 ||
            (uniqVals.includes(14) && uniqVals.includes(2) && uniqVals.includes(3) && uniqVals.includes(4) && uniqVals.includes(5)));
    if (cards.length === 3) {
        if (countArr[0] === 3) return "三条";
        if (countArr[0] === 2) return "对子";
        return "散牌";
    }
    if (cards.length === 5) {
        if (isFlush && isStraight && Math.min(...uniqVals) === 10) return "皇家同花顺";
        if (isFlush && isStraight) return "同花顺";
        if (countArr[0] === 4) return "四条";
        if (countArr[0] === 3 && countArr[1] === 2) return "葫芦";
        if (isFlush) return "同花";
        if (isStraight) return "顺子";
        if (countArr[0] === 3) return "三条";
        if (countArr[0] === 2 && countArr[1] === 2) return "两对";
        if (countArr[0] === 2) return "对子";
        return "散牌";
    }
    return "散牌";
}

// AI讲解
function explainSplit(f, m, b) {
    let ft = judgeType(f), mt = judgeType(m), bt = judgeType(b);
    let txt = `头道为${ft}，中道为${mt}，尾道为${bt}。`;
    if (isReverse(f, m, b)) {
        txt += "（存在倒水，建议调整顺序以避免头道强于中道或中道强于尾道）";
    } else {
        txt += "（顺序合理，未出现倒水）";
    }
    if (bt === "葫芦" || bt === "四条" || bt === "同花顺" || bt === "皇家同花顺") {
        txt += " 尾道较强，可冲击高分。";
    }
    if (ft === "三条") txt += " 头道三条，极为罕见！";
    if (ft === "对子" && mt === "三条" && bt === "四条") txt += " 三道依次递增，极佳分法。";
    return txt;
}

// 检查特殊型
function detectSpecial(cards) {
    // 全大(8-A), 全小(2-8), 十二皇族, 六对半, 三顺子, 三同花, 清龙
    let vmap = cards.map(c=>c.slice(1));
    let allBig = vmap.every(v=>["8","9","10","J","Q","K","A"].includes(v));
    let allSmall = vmap.every(v=>["2","3","4","5","6","7","8"].includes(v));
    let allFace = vmap.filter(v=>["J","Q","K"].includes(v)).length>=12;
    let pairs = {};
    for(let v of vmap) pairs[v] = (pairs[v]||0)+1;
    let pairCnt = Object.values(pairs).filter(cnt=>cnt===2).length;
    let threeStraight = countThreeStraight(cards);
    let threeFlush = countThreeFlush(cards);
    let straightFlush = findStraightFlush13(cards);
    if (straightFlush) return "清龙";
    if (allBig) return "全大";
    if (allSmall) return "全小";
    if (allFace) return "十二皇族";
    if (pairCnt >= 6) return "六对半";
    if (threeStraight) return "三顺子";
    if (threeFlush) return "三同花";
    return null;
}
function countThreeStraight(cards) {
    // 暴力拆分所有三组顺子
    let vals = cards.map(card => {
        let v = card.slice(1);
        let n = (v==='A')?14:((v==='K')?13:((v==='Q')?12:((v==='J')?11:parseInt(v))));
        return {c:card, n};
    }).sort((a,b)=>b.n-a.n);
    // 这里只简单判断，不做完全穷举
    let used = new Set();
    let cnt = 0;
    for (let i=0;i<3;i++) {
        let arr = [];
        let prev = null;
        for (let j=0;j<vals.length;j++) {
            if (used.has(vals[j].c)) continue;
            if (arr.length === 0 || vals[j].n === prev-1) {
                arr.push(vals[j].c); prev = vals[j].n;
                if (arr.length === 5) break;
            }
        }
        if (arr.length === 5) { cnt++; arr.forEach(c=>used.add(c)); }
        else break;
    }
    return cnt===3;
}
function countThreeFlush(cards) {
    let suitMap = {};
    cards.forEach(c=>{
        let suit = c[0];
        if(!suitMap[suit]) suitMap[suit]=[];
        suitMap[suit].push(c);
    });
    let cnt = 0;
    for(let suit in suitMap) cnt += Math.floor(suitMap[suit].length/5);
    return cnt>=3;
}
function findStraightFlush13(cards) {
    // 判断清龙（同花色A-K连成顺子）
    let suitMap = {};
    cards.forEach(c=>{
        let suit = c[0];
        if(!suitMap[suit]) suitMap[suit]=[];
        suitMap[suit].push(c);
    });
    for(let suit in suitMap) {
        let vals = suitMap[suit].map(card => {
            let v = card.slice(1);
            let n = (v==='A')?14:((v==='K')?13:((v==='Q')?12:((v==='J')?11:parseInt(v)));
            return n;
        }).sort((a,b)=>b-a);
        let all = [14,13,12,11,10,9,8,7,6,5,4,3,2];
        if (all.every(v=>vals.includes(v))) return true;
    }
    return false;
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
window.doTrustee = async function (count) {
    closeTrusteeModal();
    msgBar.textContent = `AI托管${count}局中...`;
    for(let i=1;i<=count;i++) {
        await dealCardsAndAIGroup();
        await sleep(500);
    }
    msgBar.textContent = `AI托管${count}局完成！`;
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function dealCardsAndAIGroup() {
    await dealCards();
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
aiBestBtn.onclick = aiBestGroup;
aiExplainBtn.onclick = aiExplain;
aiSpecialBtn.onclick = aiSpecialGroup;
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
