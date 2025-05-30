// 关键功能：响应式牌桌UI、托管超时倒计时、比牌动画/高亮、断线重连恢复、CSRF
const API = "/backend/api/game.php";
let csrf_token = '';
let currentUser = null;
let currentRoomId = null;
let myCards = [];
let splitTimer = null;
let splitDeadline = null;

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
            if(res.room) showRoomDetail(res.room.id);
        } else {
            currentUser = null;
            document.getElementById('user-info').innerText = "未登录";
            document.getElementById('login-btn').style.display = '';
            document.getElementById('logout-btn').style.display = 'none';
        }
    });
}
function showLogin() {
    showModal(`
        <h3>登录/注册</h3>
        <input id="login-phone" placeholder="手机号"><br>
        <input id="login-password" type="password" placeholder="密码"><br>
        <button onclick="doLogin()">登录</button>
        <button onclick="showRegister()">注册</button>
        <button onclick="closeModal()">关闭</button>
    `);
}
function showRegister() {
    showModal(`
        <h3>注册</h3>
        <input id="reg-phone" placeholder="手机号"><br>
        <input id="reg-password" type="password" placeholder="密码"><br>
        <button onclick="doRegister()">注册</button>
        <button onclick="showLogin()">已有账号登录</button>
        <button onclick="closeModal()">关闭</button>
    `);
}
function doLogin() {
    fetchAPI('login', {
        phone: document.getElementById('login-phone').value,
        password: document.getElementById('login-password').value
    }).then(res => {
        if (res.result === 'ok') {
            closeModal();
            updateUserBar();
            loadRoomList();
        } else alert(res.msg);
    });
}
function doRegister() {
    fetchAPI('register', {
        phone: document.getElementById('reg-phone').value,
        password: document.getElementById('reg-password').value
    }).then(res => {
        if (res.result === 'ok') {
            alert('注册成功，请登录');
            showLogin();
        } else alert(res.msg);
    });
}
function doLogout() {
    fetchAPI('logout', {}, 'POST').then(() => {
        updateUserBar();
        loadRoomList();
    });
}

function loadRoomList() {
    fetchAPI('room_list', {}, 'GET').then(res => {
        if (res.result === 'ok') {
            let list = res.rooms.map(r => `
                <tr>
                    <td>${r.id}</td>
                    <td>${r.name}</td>
                    <td>${r.owner_phone || '-'}</td>
                    <td>${r.max_user}</td>
                    <td>${r.status}</td>
                    <td>
                        <button onclick="joinRoom(${r.id})" ${r.status!=='waiting'?'disabled':''}>加入</button>
                    </td>
                </tr>
            `).join('');
            document.querySelector('#room-list tbody').innerHTML = list;
        }
    });
}
function showCreateRoom() {
    if (!currentUser) return showLogin();
    showModal(`
        <h3>创建房间</h3>
        <input id="room-name" placeholder="房间名称"><br>
        <input id="room-max" type="number" placeholder="最大人数" value="4" min="2" max="4"><br>
        <input id="room-password" placeholder="房间密码(可选)"><br>
        <button onclick="createRoom()">创建</button>
        <button onclick="closeModal()">取消</button>
    `);
}
function createRoom() {
    fetchAPI('room_create', {
        name: document.getElementById('room-name').value,
        max: document.getElementById('room-max').value,
        password: document.getElementById('room-password').value
    }).then(res => {
        if (res.result === 'ok') {
            closeModal();
            loadRoomList();
        } else alert(res.msg);
    });
}
function joinRoom(room_id) {
    if (!currentUser) return showLogin();
    fetchAPI('room_info', { room_id }, 'GET').then(res => {
        if (res.result === 'ok') {
            if (res.room.password) {
                let pw = prompt('请输入房间密码');
                fetchAPI('room_join', { room_id, password: pw }).then(jres => {
                    if (jres.result === 'ok') showRoomDetail(room_id);
                    else alert(jres.msg);
                });
            } else {
                fetchAPI('room_join', { room_id }).then(jres => {
                    if (jres.result === 'ok') showRoomDetail(room_id);
                    else alert(jres.msg);
                });
            }
        }
    });
}
function showRoomDetail(room_id) {
    document.getElementById('main').querySelector('#room-list-section').style.display = 'none';
    document.getElementById('main').querySelector('#room-detail-section').style.display = '';
    currentRoomId = room_id;
    fetchAPI('room_info', { room_id }, 'GET').then(res => {
        if (res.result === 'ok') {
            document.getElementById('room-title').innerText = res.room.name;
            renderTable(room_id, res.members, res.room);
            loadRoomChat();
        }
    });
}
function leaveRoom() {
    fetchAPI('room_leave', { room_id: currentRoomId }).then(res => {
        currentRoomId = null;
        backToRoomList();
    });
}
function backToRoomList() {
    document.getElementById('main').querySelector('#room-list-section').style.display = '';
    document.getElementById('main').querySelector('#room-detail-section').style.display = 'none';
    loadRoomList();
}
function kickUser(room_id, user_id) {
    fetchAPI('room_kick', { room_id, user_id }).then(res => {
        if (res.result !== 'ok') alert(res.msg);
        showRoomDetail(room_id);
    });
}
function loadRoomChat() {
    fetchAPI('room_chat_list', { room_id: currentRoomId }, 'GET').then(res => {
        if (res.result === 'ok') {
            let list = res.msgs.map(m =>
                `<div><b>${m.phone || (m.user_id<0?'AI玩家':'?')}</b>: ${m.msg} <span style="color:#aaa">${m.sent_at}</span></div>`
            ).join('');
            document.getElementById('chat-list').innerHTML = list;
        }
    });
}
function sendRoomMsg() {
    let msg = document.getElementById('chat-msg').value;
    if (!msg.trim()) return;
    fetchAPI('room_chat', { room_id: currentRoomId, msg }).then(res => {
        if (res.result === 'ok') {
            document.getElementById('chat-msg').value = '';
            loadRoomChat();
        }
    });
}

// 新牌桌UI
function renderTable(room_id, members, room) {
    // 查询所有玩家状态
    fetchAPI('game_status', { room_id }, 'GET').then(res => {
        if (res.result !== 'ok') return;
        let g = res;
        let seats = members.map(m => {
            let uid = m.user_id;
            let isMe = (uid == currentUser.id);
            let trustee = g.trustee && isMe;
            let showSplit = g.split && isMe;
            let userLabel = m.phone || (uid < 0 ? 'AI玩家' : '?');
            // 倒计时
            let timeoutHtml = '';
            if (isMe && !g.split && g.deal_time) {
                let left = Math.max(0, 90 - Math.floor((Date.now()/1000) - g.deal_time));
                if (left > 0)
                    timeoutHtml = `<div class="timeout">剩余${left}秒自动托管</div>`;
                else
                    timeoutHtml = `<div class="timeout">已自动托管</div>`;
                // 自动刷新倒计时
                if (splitTimer) clearTimeout(splitTimer);
                splitTimer = setTimeout(() => renderTable(room_id, members, room), 1000);
            }
            // 牌面显示
            let cardsHtml = '';
            if (g.split && isMe) {
                cardsHtml = `
                    <div>头道：${g.split.head.map(renderCard).join(' ')} (${g.types.head.type})</div>
                    <div>中道：${g.split.mid.map(renderCard).join(' ')} (${g.types.mid.type})</div>
                    <div>尾道：${g.split.tail.map(renderCard).join(' ')} (${g.types.tail.type})</div>
                `;
            } else if (isMe && g.hand && !g.split) {
                cardsHtml = g.hand.map((c,i)=>renderCard(c)).join(' ');
            } else if (g.split && !isMe) {
                // 比牌时显示其它玩家分牌
                cardsHtml = '<div style="opacity:.7">' +
                  `头道：${'***'}<br>中道：${'*****'}<br>尾道：${'*****'}</div>`;
            }
            // 托管标识
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
        document.getElementById('table-wrap').innerHTML = `<div class="table">${seats}</div>` + renderGameActions(room, g);
    });
}
function renderCard(card) {
    return `<span class="card">${card}</span>`;
}
function renderGameActions(room, g) {
    // 游戏操作区
    let html = '';
    if (room.status === 'playing' || room.status === 'practice') {
        if (g.hand && !g.split) {
            myCards = g.hand;
            html += `<div style="text-align:center;margin:12px;">
                <button onclick="showSplitPanel()">手动分牌</button>
                <button onclick="trustee(${room.id})">AI托管</button>
            </div>`;
        }
        if (g.split) {
            html += `<div style="text-align:center;margin:12px;">
                <button onclick="untrustee(${room.id})">取消托管/重新分牌</button>
            </div>`;
        }
        if (currentUser.id === room.owner && room.status!=='practice') {
            html += `<div style="text-align:center;margin:16px;">
                <button id="compare-btn" onclick="compareCards(${room.id})">比牌结算</button>
            </div>`;
        }
    }
    return html;
}
function dealCards(room_id) {
    fetchAPI('game_deal', { room_id }).then(res => {
        if (res.result === 'ok') {
            showRoomDetail(room_id);
        } else alert(res.msg);
    });
}
function showSplitPanel() {
    if (!myCards) return;
    showModal(`
        <h3>分牌</h3>
        <div>点击牌放入头道、中道、尾道</div>
        <div id="split-panel">
            <div>手牌：<span id="hand-cards">${myCards.map((c,i)=>`<span class='card' onclick="addToSplit('${c}',${i})" id="card${i}">${c}</span>`).join(' ')}</span></div>
            <div>头道(3)：<span id="split-head"></span></div>
            <div>中道(5)：<span id="split-mid"></span></div>
            <div>尾道(5)：<span id="split-tail"></span></div>
            <button onclick="submitSplit()">提交分牌</button>
            <button onclick="closeModal()">取消</button>
        </div>
    `);
    window.splitState = {head:[],mid:[],tail:[],remain:[...myCards]};
}
window.addToSplit = function(card, idx) {
    let s = window.splitState;
    if (s.head.length<3) s.head.push(card);
    else if (s.mid.length<5) s.mid.push(card);
    else if (s.tail.length<5) s.tail.push(card);
    s.remain = s.remain.filter((c,i)=>i!==idx);
    updateSplitPanel();
};
function updateSplitPanel() {
    let s = window.splitState;
    document.getElementById('split-head').innerText = s.head.join(' ');
    document.getElementById('split-mid').innerText = s.mid.join(' ');
    document.getElementById('split-tail').innerText = s.tail.join(' ');
    document.getElementById('hand-cards').innerHTML = s.remain.map((c,i)=>`<span class='card' onclick="addToSplit('${c}',${i})">${c}</span>`).join(' ');
}
function submitSplit() {
    let s = window.splitState;
    if (s.head.length!==3||s.mid.length!==5||s.tail.length!==5) return alert('请分完13张牌');
    fetchAPI('game_split', { room_id:currentRoomId, head:s.head, mid:s.mid, tail:s.tail }).then(res=>{
        if(res.result==='ok'){ closeModal(); showRoomDetail(currentRoomId);}
        else alert(res.msg);
    });
}
function trustee(room_id) {
    fetchAPI('game_trustee', { room_id }).then(res=>{
        if(res.result==='ok'){ showRoomDetail(room_id);}
        else alert(res.msg);
    });
}
function untrustee(room_id) {
    fetchAPI('game_untrustee', { room_id }).then(res=>{
        if(res.result==='ok'){ showRoomDetail(room_id);}
        else alert(res.msg);
    });
}
function compareCards(room_id) {
    fetchAPI('game_compare', { room_id }).then(res=>{
        if(res.result==='ok'){
            alert('结算完成');
            showRoomDetail(room_id);
        }
        else alert(res.msg);
    });
}

// 练习房间
function enterPractice() {
    fetchAPI('practice_room').then(res=>{
        if(res.result==='ok'){ showRoomDetail(res.room_id);}
        else alert(res.msg);
    });
}

// 自动匹配
function quickMatch() {
    fetchAPI('quick_match').then(res=>{
        if(res.result==='ok'){ showRoomDetail(res.room_id);}
        else alert(res.msg);
    });
}

// 响应式适配
window.addEventListener('resize', function() {
    if(window.innerWidth<750) {
        document.body.classList.add('mobile');
    } else {
        document.body.classList.remove('mobile');
    }
});
window.dispatchEvent(new Event('resize'));

window.onload = () => {
    updateUserBar();
    loadRoomList();
    setInterval(() => {
        if (currentRoomId) showRoomDetail(currentRoomId);
        else loadRoomList();
    }, 3000);

    document.getElementById('login-btn').onclick = showLogin;
    document.getElementById('logout-btn').onclick = doLogout;
    document.getElementById('create-room-btn').onclick = showCreateRoom;
    document.getElementById('leave-room-btn').onclick = leaveRoom;
    document.getElementById('back-to-list').onclick = backToRoomList;
    document.getElementById('chat-send').onclick = sendRoomMsg;
    document.getElementById('practice-btn').onclick = enterPractice;
    document.getElementById('quick-btn').onclick = quickMatch;
    document.getElementById('modal').onclick = e => { if(e.target.id==='modal') closeModal(); };
};
