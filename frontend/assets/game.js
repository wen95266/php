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
// 其它函数如登录、注册、房间详情、比牌、托管等...

window.onload = () => {
    updateUserBar();
    loadRoomList();
    setInterval(() => {
        if (currentRoomId) showRoomDetail(currentRoomId);
        else loadRoomList();
    }, 3000);
    // 其它事件绑定...
};
