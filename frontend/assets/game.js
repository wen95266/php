const API = "https://wenge.cloudns.ch/backend/api/game.php";
let currentUser = null;

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
    if (method === 'POST') opts.body = JSON.stringify({ ...data, action });
    return fetch(API + (method === 'GET' ? `?action=${action}&${new URLSearchParams(data)}` : ''), opts)
        .then(r => r.json());
}

function updateUserBar() {
    fetchAPI('profile', {}, 'GET').then(res => {
        if (res.result === 'ok') {
            currentUser = res.user;
            document.getElementById('user-info').innerText = `欢迎，${currentUser.phone}（积分：${currentUser.score}）`;
            document.getElementById('login-btn').style.display = 'none';
            document.getElementById('logout-btn').style.display = '';
            showUserDetail(currentUser);
        } else {
            currentUser = null;
            document.getElementById('user-info').innerText = "未登录";
            document.getElementById('login-btn').style.display = '';
            document.getElementById('logout-btn').style.display = 'none';
            document.getElementById('user-detail').innerHTML = '';
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
    });
}

function showGift() {
    if (!currentUser) return showLogin();
    showModal(`
        <h3>积分赠送</h3>
        <input id="gift-phone" placeholder="对方手机号"><br>
        <input id="gift-amt" placeholder="赠送积分" type="number"><br>
        <button onclick="doGift()">赠送</button>
        <button onclick="closeModal()">取消</button>
    `);
}
function doGift() {
    let phone = document.getElementById('gift-phone').value;
    let amt = Number(document.getElementById('gift-amt').value);
    if (!phone || !amt) return alert('信息不完整');
    fetchAPI('search_user', { phone }, 'GET').then(res => {
        if (res.result !== 'ok') return alert(res.msg);
        let to = res.user.id;
        fetchAPI('gift_score', { to, amt }).then(res2 => {
            alert(res2.msg);
            closeModal();
            updateUserBar();
        });
    });
}

function showSearchUser() {
    showModal(`
        <h3>查找用户</h3>
        <input id="search-phone" placeholder="手机号"><br>
        <button onclick="doSearchUser()">查找</button>
        <button onclick="closeModal()">关闭</button>
    `);
}
function doSearchUser() {
    let phone = document.getElementById('search-phone').value;
    if (!phone) return alert('请输入手机号');
    fetchAPI('search_user', { phone }, 'GET').then(res => {
        if (res.result !== 'ok') return alert(res.msg);
        closeModal();
        showUserDetail(res.user);
    });
}
function showUserDetail(user) {
    if (!user) return;
    document.getElementById('user-detail').innerHTML = `
        <h4>用户信息</h4>
        <ul>
            <li>手机号：${user.phone}</li>
            <li>积分：${user.score}</li>
            <li>胜：${user.win || 0}</li>
            <li>负：${user.lose || 0}</li>
            <li>注册时间：${user.created_at}</li>
        </ul>
    `;
}

// 事件绑定
window.onload = () => {
    updateUserBar();

    document.getElementById('login-btn').onclick = showLogin;
    document.getElementById('logout-btn').onclick = doLogout;
    document.getElementById('modal').onclick = e => { if(e.target.id==='modal') closeModal(); };
};
