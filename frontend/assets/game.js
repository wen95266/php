const backend = "https://wenge.cloudns.ch/backend/api/game.php";
const CARD_IMG_PATH = "assets/cards/";

// 扑克牌图片文件名映射
function getCardImage(card) {
    // card: "AS" "10C" "KH"等
    const suitMap = { S: "spades", H: "hearts", D: "diamonds", C: "clubs" };
    const rankMap = {
        "A":"ace", "K":"king", "Q":"queen", "J":"jack",
        "T":"10", "10":"10", "9":"9", "8":"8", "7":"7", "6":"6", "5":"5", "4":"4", "3":"3", "2":"2"
    };
    // 处理10特殊
    let match = card.match(/^([ATKQJ2-9]{1,2})([SHDC])$/);
    if (!match) return "back.svg";
    let [_, rank, suit] = match;
    rank = rank === "T" ? "10" : rank;
    return `${CARD_IMG_PATH}${rankMap[rank].toLowerCase()}_of_${suitMap[suit].toLowerCase()}.svg`;
}

// 渲染手牌
function renderCards(cards, containerId="player-cards", selectable=false, selected=[]) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";
    cards.forEach((card, idx) => {
        const div = document.createElement("div");
        div.className = "card" + (selected.includes(idx) ? " selected" : "");
        const img = document.createElement("img");
        img.src = getCardImage(card);
        img.alt = card;
        div.appendChild(img);
        if (selectable) {
            div.onclick = () => {
                if (selected.includes(idx)) {
                    selected.splice(selected.indexOf(idx), 1);
                } else {
                    selected.push(idx);
                }
                renderCards(cards, containerId, selectable, selected);
            }
        }
        container.appendChild(div);
    });
    return selected;
}

// 游戏状态
let currentCards = [];
let selectedCards = [];

function showStatus(msg, color="#d32f2f") {
    const el = document.getElementById("game-status");
    el.textContent = msg;
    el.style.color = color;
}

document.getElementById("start-btn").onclick = async () => {
    showStatus("正在发牌...", "#555");
    let res = await fetch(`${backend}?action=start`, { credentials: "omit" });
    let data = await res.json();
    if (data.cards) {
        currentCards = data.cards;
        selectedCards = [];
        renderCards(currentCards, "player-cards", true, selectedCards);
        renderActions();
        showStatus("请选择要出的牌型并提交", "#444");
    } else {
        showStatus("发牌失败，请重试");
    }
};

function renderActions() {
    const actions = document.getElementById("actions");
    actions.innerHTML = "";
    // 示例：出牌按钮
    const submitBtn = document.createElement("button");
    submitBtn.textContent = "提交牌型";
    submitBtn.onclick = submitHand;
    actions.appendChild(submitBtn);
}

async function submitHand() {
    if (!currentCards.length) return;
    // 示例：提交全部手牌
    showStatus("提交中...", "#666");
    let res = await fetch(`${backend}?action=submit`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({cards: currentCards})
    });
    let data = await res.json();
    if (data.result === "ok") {
        showStatus("提交成功，结果：" + (data.type || "未知"));
    } else {
        showStatus("提交失败：" + (data.error || "未知错误"));
    }
}

// 初始加载
showStatus("点击“开始新游戏”以发牌", "#888");
