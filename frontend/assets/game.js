const API = "https://wenge.cloudns.ch/backend/api/game.php";
let csrf_token = '';
let currentUser = null;
let currentRoomId = null;
let myCards = [];
let splitTimer = null;

function showModal(html) {
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal').style.display = 'block';
}
function closeModal() {
    document.getElementById('modal').style.display = 'none';
}
function fetchAPI(action, data = {}, method = 'POST') {
    let opts = {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
    };
    if (method === 'POST') opts.body = JSON.stringify({ ...data, action, csrf_token });
    return fetch(API + (method === 'GET' ? `?action=${action}&${new URLSearchParams(data)}` : ''), opts)
        .then(r => r.json())
        .then(res => {
            if(res.csrf_token) csrf_token = res.csrf_token;
            return res;
        });
}
function updateUserBar() {
    fetchAPI('profile', {}, 'GET').then(res => {
        if (res.result === 'ok') {
            currentUser = res.user;
            csrf_token = res.csrf_token;
            document.getElementById('user-info').innerText = `欢迎，${currentUser.phone}（积分：${currentUser.score}）`;
            document.getElementById('login-btn').style.display = 'none';
            document.getElementById('logout-btn').style.display = '';
        } else {
            currentUser = null;
            document.getElementById('user-info').innerText = "未登录";
            document.getElementById('login-btn').style.display = '';
            document.getElementById('logout-btn').style.display = 'none';
        }
    });
}
// ... 其余代码同前文，包括登录、注册、房间、练习、比牌、AI托管、牌桌UI等 ...

// 新牌桌UI
function renderTable(room_id, members, room) {
    fetchAPI('game_status', { room_id }, 'GET').then(res => {
        if (res.result !== 'ok') return;
        let g = res;
        let seats = members.map(m => {
            let uid = m.user_id;
            let isMe = (uid == currentUser.id);
            let userLabel = m.phone || (uid < 0 ? 'AI玩家' : '?');
            let timeoutHtml = '';
            if (isMe && !g.split && g.deal_time) {
                let left = Math.max(0, 90 - Math.floor((Date.now()/1000) - g.deal_time));
                if (left > 0)
                    timeoutHtml = `<div class="timeout">剩余${left}秒自动托管</div>`;
                else
                    timeoutHtml = `<div class="timeout">已自动托管</div>`;
                if (splitTimer) clearTimeout(splitTimer);
                splitTimer = setTimeout(() => renderTable(room_id, members, room), 1000);
            }
            let cardsHtml = '';
            if (g.split && isMe) {
                cardsHtml = `
                    <div>头道：${g.split.head.map(renderCard).join(' ')} (${g.types.head.type})</div>
                    <div>中道：${g.split.mid.map(renderCard).join(' ')} (${g.types.mid.type})</div>
                    <div>尾道：${g.split.tail.map(renderCard).join(' ')} (${g.types.tail.type})</div>
                `;
            } else if (isMe && g.hand && !g.split) {
                cardsHtml = g.hand.map((c,i)=>renderCard(c)).join(' ');
            }
            let trusteeFlag = '';
            if ((g.trustee && isMe) || (g.trustees && g.trustees[uid])) {
                trusteeFlag = `<span class="trustee">[托管]</span>`;
            }
            return `<div class="seat ${isMe?'me':''}">
                <div>${userLabel} ${trusteeFlag}</div>
                ${timeoutHtml}
                ${cardsHtml}
            </div>`;
        }).join('');
        document.getElementById('table-wrap').innerHTML = `<div class="table">${seats}</div>`;
    });
}
function renderCard(card) {
    return `<span class="card">${card}</span>`;
}
// ... 其它如分牌弹窗、托管、比牌等同前，省略 ...
window.onload = () => {
    updateUserBar();
    loadRoomList();
    setInterval(() => {
        if (currentRoomId) showRoomDetail(currentRoomId);
        else loadRoomList();
    }, 3000);
    // 其余按钮事件绑定...
};
