const backend = "https://wenge.cloudns.ch/backend/api/game.php";
const CARD_IMG_PATH = "assets/cards/";

let user = null;
let token = "";
let roomId = "";
let isOwner = false;
let currentCards = [];
let duns = {head:[], mid:[], tail:[]};
let gameStarted = false;
let submitted = false;
let roomPlayers = {};
let trustAI = false;
let lastFriend = null;

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

function showStatus(msg, color="#d32f2f") {
    const el = document.getElementById("game-status");
    el.textContent = msg;
    el.style.color = color;
}

function showUserInfo() {
    if (!user) return;
    document.getElementById("user-info").textContent = `欢迎, ${user.nick} (ID:${user.id}, 积分:${user.score})`;
    document.getElementById("game-area").style.display = "";
}

function renderDuns() {
    for (const dun of ['head','mid','tail']) {
        let container = document.getElementById(dun+'-dun');
        if (!container) continue;
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
                if (submitted || !gameStarted || trustAI) return;
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
    if (!container) return;
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
            if (submitted || !gameStarted || trustAI) return;
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
    if (!gameStarted) {
        msg = "请等待房主开始新局";
    } else if (duns.head.length!==3) msg += `头墩已选${duns.head.length}/3张；`;
    else if (duns.mid.length!==5) msg += `中墩已选${duns.mid.length}/5张；`;
    else if (duns.tail.length!==5) msg += `尾墩已选${duns.tail.length}/5张；`;
    else if (submitted) msg = "已提交分墩，等待他人提交";
    else msg = "可以提交比牌！";
    showStatus(msg, msg==="可以提交比牌！" ? "#43a047" : "#2196f3");
    document.getElementById("auto-dun-btn").disabled = !(gameStarted && !submitted && !trustAI && currentCards.length === 13);
    document.getElementById("ai-btn").disabled = !(gameStarted && !submitted && !trustAI && currentCards.length === 13);
    document.getElementById("submit-btn").disabled = !(gameStarted && !submitted && !trustAI && duns.head.length===3 && duns.mid.length===5 && duns.tail.length===5);
    document.getElementById("reset-btn").disabled = !(gameStarted && !submitted && !trustAI && (duns.head.length || duns.mid.length || duns.tail.length));
}

function getCardImageHtml(card) {
    return `<img src="${getCardImage(card)}" alt="${card}" style="height:36px;margin:0 2px;vertical-align:middle;">`;
}

document.getElementById("login-btn").onclick = async () => {
    let phone = document.getElementById("user-phone").value.trim();
    let nick = document.getElementById("user-nick").value.trim();
    if (!phone || !nick) return alert("手机号和昵称必填");
    let res = await fetch(`${backend}?action=register`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({phone, nick})
    });
    let data = await res.json();
    if (data.result === "ok") {
        user = data.user;
        token = data.token;
        showUserInfo();
        document.getElementById("user-area").style.display = "none";
    } else {
        alert("注册/登录失败："+(data.error||"未知错误"));
    }
};

document.getElementById("logout-btn").onclick = function(){
    location.reload();
};

document.getElementById("join-room-btn").onclick = async () => {
    let r = document.getElementById("room-id").value.trim();
    if (!r) return alert("请输入房间号");
    let res = await fetch(`${backend}?action=join_room`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({room: r, user: user.id, token})
    });
    let data = await res.json();
    if (data.result === "ok") {
        roomId = r;
        isOwner = data.is_owner;
        document.getElementById("start-btn").disabled = !isOwner;
        pollRoom();
        document.getElementById("room-status").textContent = `已加入房间【${roomId}】`;
    } else {
        showStatus("加入失败：" + data.error);
    }
};

document.getElementById("quick-match-btn").onclick = async () => {
    let res = await fetch(`${backend}?action=quick_match`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({user: user.id, token})
    });
    let data = await res.json();
    if (data.result === "ok") {
        roomId = data.room;
        isOwner = data.is_owner;
        document.getElementById("start-btn").disabled = !isOwner;
        pollRoom();
        document.getElementById("room-status").textContent = `已匹配到房间【${roomId}】`;
    } else {
        showStatus("匹配失败：" + data.error);
    }
};

document.getElementById("start-btn").onclick = async () => {
    let res = await fetch(`${backend}?action=start_game`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({room: roomId, user: user.id, token})
    });
    let data = await res.json();
    if (data.result === "ok") {
        showStatus("已发牌，准备分墩", "#43a047");
        pollRoom(true);
    } else {
        showStatus("发牌失败：" + data.error);
    }
};

document.getElementById("auto-dun-btn").onclick = async () => {
    showStatus("正在智能分墩...", "#555");
    let res = await fetch(`${backend}?action=auto_dun`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({room: roomId, user: user.id, token, cards: currentCards})
    });
    let data = await res.json();
    if(data.result==="ok") {
        duns = {head:data.head, mid:data.mid, tail:data.tail};
        renderAll();
        showStatus("已智能分墩", "#43a047");
    } else {
        showStatus("智能分墩失败：" + data.error);
    }
};

document.getElementById("ai-btn").onclick = async () => {
    trustAI = true;
    showStatus("AI托管中...", "#555");
    let res = await fetch(`${backend}?action=trust_ai`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({room: roomId, user: user.id, token})
    });
    let data = await res.json();
    if(data.result==="ok") {
        showStatus("AI已托管，等待结果", "#43a047");
    } else {
        showStatus("AI托管失败：" + data.error);
        trustAI = false;
    }
};

document.getElementById("submit-btn").onclick = async () => {
    if (duns.head.length!==3||duns.mid.length!==5||duns.tail.length!==5) {
        showStatus("三墩牌数不对，无法提交");
        return;
    }
    showStatus("正在提交...", "#555");
    let res = await fetch(`${backend}?action=submit_dun`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            room: roomId,
            user: user.id,
            token,
            head: duns.head, mid: duns.mid, tail: duns.tail
        })
    });
    let data = await res.json();
    if (data.result === "ok") {
        submitted = true;
        renderAll();
        showStatus("已提交，等待其他玩家", "#43a047");
    } else {
        showStatus("提交失败：" + (data.error || "未知错误"));
    }
};

document.getElementById("reset-btn").onclick = function(){
    if (!gameStarted || submitted || trustAI) return;
    duns = {head:[], mid:[], tail:[]};
    renderAll();
};

function renderRoomPlayers() {
    let el = document.getElementById("room-players");
    if (!roomPlayers || Object.keys(roomPlayers).length === 0) {
        el.innerHTML = "";
        return;
    }
    let html = `<h3>房间玩家</h3><table class="player-table"><tr><th>昵称</th><th>状态</th><th>积分</th><th>分墩</th></tr>`;
    for (let uid in roomPlayers) {
        let p = roomPlayers[uid];
        html += `<tr><td>${p.nick}${uid===user.id?"（你）":""}</td><td>${p.state||""}${p.ai?"(AI)":" "}</td><td>${p.score||0}</td><td>`;
        if (p.head && p.head.length===3) html += p.head.map(getCardImageHtml).join("") + " | ";
        if (p.mid && p.mid.length===5) html += p.mid.map(getCardImageHtml).join("") + " | ";
        if (p.tail && p.tail.length===5) html += p.tail.map(getCardImageHtml).join("");
        html += "</td></tr>";
    }
    html += "</table>";
    el.innerHTML = html;
}

function pollRoom(fresh=false) {
    fetch(`${backend}?action=room_status&room=${roomId}`)
        .then(res=>res.json())
        .then(data=>{
            if(data.result==="ok") {
                roomPlayers = data.players || {};
                gameStarted = data.game_started;
                let my = roomPlayers[user.id]||{};
                currentCards = my.cards||[];
                submitted = !!my.submitted;
                trustAI = !!my.ai;
                if (fresh && currentCards.length === 13) {
                    duns = {head:[], mid:[], tail:[]};
                }
                renderAll();
                renderRoomPlayers();
                document.getElementById("score-panel").textContent = `本局底分：${data.base_score||1}`;
                if (!data.all_submitted) setTimeout(()=>pollRoom(), 3000);
                else showRoomResult(data.results||{});
            }
        });
}

function showRoomResult(results) {
    let el = document.getElementById("result-area");
    let html = `<h3>本局结果</h3>`;
    for (let uid in results) {
        let r = results[uid];
        html += `<div><b>${r.nick}</b>：头墩${r.head_type} | 中墩${r.mid_type} | 尾墩${r.tail_type}`;
        html += `，本局得分：${r.delta_score}，剩余积分：${r.score}`;
        html += r.winner ? " <span style='color:#43a047'>(赢家)</span>" : "";
        html += "</div>";
    }
    el.innerHTML = html;
}

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
    showStatus("请先注册/登录");
});

// 查找朋友
document.getElementById("query-friend-btn").onclick = async () => {
    let q = document.getElementById("friend-query").value.trim();
    if (!q) return;
    let res = await fetch(`${backend}?action=query_user&query=${encodeURIComponent(q)}`);
    let data = await res.json();
    if (data.result === "ok" && data.user) {
        lastFriend = data.user;
        document.getElementById("friend-info").textContent = `ID: ${data.user.id}, 昵称: ${data.user.nick}, 积分: ${data.user.score}`;
    } else {
        document.getElementById("friend-info").textContent = "未找到该玩家";
        lastFriend = null;
    }
};
// 赠送积分
document.getElementById("gift-btn").onclick = async () => {
    let amt = parseInt(document.getElementById("gift-amount").value);
    if (!lastFriend || !amt || amt<=0) return alert("请先查找朋友并输入正整数积分");
    let res = await fetch(`${backend}?action=gift_score`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({from: user.id, token, to: lastFriend.id, amount: amt})
    });
    let data = await res.json();
    if (data.result === "ok") {
        document.getElementById("gift-status").textContent = "赠送成功";
    } else {
        document.getElementById("gift-status").textContent = "赠送失败：" + (data.error||"未知错误");
    }
};
