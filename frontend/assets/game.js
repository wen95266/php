const backend = "https://wenge.cloudns.ch/backend/api/game.php";
const CARD_IMG_PATH = "assets/cards/";

function getCardImage(card) {
    const suitMap = { S: "spades", H: "hearts", D: "diamonds", C: "clubs" };
    const rankMap = {
        "A":"ace", "K":"king", "Q":"queen", "J":"jack",
        "T":"10", "10":"10", "9":"9", "8":"8", "7":"7", "6":"6", "5":"5", "4":"4", "3":"3", "2":"2"
    };
    let match = card.match(/^([ATKQJ2-9]{1,2})([SHDC])$/);
    if (!match) return "back.svg";
    let [_, rank, suit] = match;
    rank = rank === "T" ? "10" : rank;
    return `${CARD_IMG_PATH}${rankMap[rank].toLowerCase()}_of_${suitMap[suit].toLowerCase()}.svg`;
}

let currentCards = [];
let duns = {head:[], mid:[], tail:[]};

function renderDuns() {
    for (const dun of ['head','mid','tail']) {
        let container = document.getElementById(dun+'-dun');
        container.innerHTML = "";
        duns[dun].forEach((card, idx) => {
            let div = document.createElement("div");
            div.className = "card";
            let img = document.createElement("img");
            img.src = getCardImage(card);
            img.alt = card;
            div.appendChild(img);
            div.title = "点击移回牌池";
            div.onclick = () => {
                duns[dun].splice(idx,1);
                renderAll();
            };
            container.appendChild(div);
        });
    }
    renderPool();
}

function renderPool() {
    let pool = currentCards.filter(c => !duns.head.includes(c) && !duns.mid.includes(c) && !duns.tail.includes(c));
    let container = document.getElementById('card-pool');
    container.innerHTML = "";
    pool.forEach((card) => {
        let div = document.createElement("div");
        div.className = "card";
        let img = document.createElement("img");
        img.src = getCardImage(card);
        img.alt = card;
        div.appendChild(img);
        div.title = "点击分配到头/中/尾墩";
        div.onclick = () => {
            // 自动分配：优先头墩没满、再中、再尾
            let target = duns.head.length < 3 ? 'head' : (duns.mid.length < 5 ? 'mid' : (duns.tail.length < 5 ? 'tail' : null));
            if (!target) return;
            duns[target].push(card);
            renderAll();
        };
        container.appendChild(div);
    });
}

function renderAll() {
    renderDuns();
    updateStatus();
}

function updateStatus() {
    let msg = "";
    if (duns.head.length!==3) msg += `头墩已选${duns.head.length}/3张；`;
    if (duns.mid.length!==5) msg += `中墩已选${duns.mid.length}/5张；`;
    if (duns.tail.length!==5) msg += `尾墩已选${duns.tail.length}/5张；`;
    if (msg==="") msg = "可以提交比牌！";
    showStatus(msg, msg==="可以提交比牌！" ? "#43a047" : "#2196f3");
    document.getElementById("submit-btn").disabled = !(duns.head.length===3 && duns.mid.length===5 && duns.tail.length===5);
}

function showStatus(msg, color="#d32f2f") {
    const el = document.getElementById("game-status");
    el.textContent = msg;
    el.style.color = color;
}

document.getElementById("start-btn").onclick = async () => {
    showStatus("正在发牌...", "#555");
    let res = await fetch(`${backend}?action=start`);
    let data = await res.json();
    if (data.cards) {
        currentCards = data.cards;
        duns = {head:[], mid:[], tail:[]};
        document.getElementById('result-area').innerHTML = "";
        renderAll();
    } else {
        showStatus("发牌失败");
    }
};

document.getElementById("submit-btn").onclick = async () => {
    if (duns.head.length!==3||duns.mid.length!==5||duns.tail.length!==5) {
        showStatus("三墩牌数不对，无法提交");
        return;
    }
    showStatus("正在判定...", "#555");
    let res = await fetch(`${backend}?action=submit`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            head: duns.head,
            mid: duns.mid,
            tail: duns.tail
        })
    });
    let data = await res.json();
    if (data.result === "ok") {
        let html = `<h3>判定结果</h3>
        <div>头墩：${data.head.type}</div>
        <div>中墩：${data.mid.type}</div>
        <div>尾墩：${data.tail.type}</div>`;
        document.getElementById('result-area').innerHTML = html;
        showStatus("已判定", "#43a047");
    } else {
        showStatus("提交失败：" + (data.error || "未知错误"));
    }
};

document.addEventListener("DOMContentLoaded", ()=>{
    document.getElementById('player-cards').innerHTML = `
        <div class="dun-label">头墩(3张)</div>
        <div id="head-dun" class="dun"></div>
        <div class="dun-label">中墩(5张)</div>
        <div id="mid-dun" class="dun"></div>
        <div class="dun-label">尾墩(5张)</div>
        <div id="tail-dun" class="dun"></div>
        <div class="dun-label">待分配牌池</div>
        <div id="card-pool" class="dun"></div>
    `;
    renderAll();
    showStatus("点击“开始新游戏”发牌，点击牌池牌自动分配三墩，点三墩牌可移回池");
});
