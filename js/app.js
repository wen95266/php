// portal-frontend/js/app.js
import { registerUser, loginUser, getUserProfile, logoutUser, getToken, getCurrentUser } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("Portal_App.js: DOMContentLoaded event fired.");
    const path = window.location.pathname;
    console.log("Portal_App.js: Current path:", path);

    if (path.endsWith('/register.html') || path.endsWith('/register')) {
        console.log("Portal_App.js: Initializing Register Page");
        initRegisterPage();
    } else if (path.endsWith('/login.html') || path.endsWith('/login')) {
        console.log("Portal_App.js: Initializing Login Page");
        initLoginPage();
    } else if (path.endsWith('/index.html') || path === '/' || path.includes('portal-frontend')) {
        console.log("Portal_App.js: Initializing Index Page");
        initIndexPage();
    } else {
        console.warn("Portal_App.js: Path not explicitly handled:", path);
    }
});

function initRegisterPage() {
    const registerForm = document.getElementById('registerForm');
    const messageEl = document.getElementById('message');
    if (!registerForm || !messageEl) { console.error("Portal_App.js: Missing elements for RegisterPage."); return; }
    console.log("Portal_App.js: Register form and messageEl found.");
    registerForm.addEventListener('submit', async (event) => { /* ... (与你上一版完整的 register 逻辑一致) ... */ });
}

function initLoginPage() {
    const loginForm = document.getElementById('loginForm');
    const messageEl = document.getElementById('message');
    if (!loginForm || !messageEl) { console.error("Portal_App.js: Missing elements for LoginPage."); return; }
    console.log("Portal_App.js: Login form and messageEl found.");
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        messageEl.textContent = '正在登录...';
        const phone = document.getElementById('phone').value;
        const password = document.getElementById('password').value;
        try {
            const result = await loginUser(phone, password); // loginUser 现在会处理 token 存储
            if (result && result.success) {
                messageEl.textContent = '登录成功！正在跳转...';
                messageEl.style.color = 'green';
                setTimeout(() => { window.location.href = 'index.html'; }, 1000);
            } else {
                messageEl.textContent = (result && result.message) ? result.message : '登录失败，请重试。';
                messageEl.style.color = 'red';
            }
        } catch (error) {
            messageEl.textContent = (error && error.message) ? error.message : '登录时发生网络或未知错误。';
            messageEl.style.color = 'red';
        }
    });
}

async function initIndexPage() {
    console.log("Portal_App.js: initIndexPage called");
    const token = getToken(); // 从 api.js 获取，它从 localStorage 读取
    console.log("Portal_App.js: Token for Index Page (from getToken()):", token ? token.substring(0,10)+'...' : "NO_TOKEN");

    const userInfoEl = document.getElementById('userInfo');
    const scoresEl = document.getElementById('scoresDisplay');
    const gameLinksEl = document.getElementById('gameLinks');
    const loginLinkEl = document.getElementById('loginLink');
    const logoutButtonEl = document.getElementById('logoutButton');

    if (!userInfoEl || !scoresEl || !gameLinksEl || !loginLinkEl || !logoutButtonEl) {
        console.error("Portal_App.js: One or more critical UI elements for Index Page not found.");
        if(document.body) document.body.innerHTML = "<h1>页面初始化错误，请联系管理员。</h1>"; // 严重错误
        return;
    }

    if (!token) {
        console.log("Portal_App.js: No token, showing login link.");
        loginLinkEl.style.display = 'block'; logoutButtonEl.style.display = 'none';
        userInfoEl.innerHTML = '<p>请先<a href="login.html">登录</a>查看内容。</p>';
        scoresEl.innerHTML = ''; gameLinksEl.style.display = 'none';
        return;
    }

    console.log("Portal_App.js: Token exists, proceeding to fetch profile.");
    loginLinkEl.style.display = 'none'; logoutButtonEl.style.display = 'block';
    if (!logoutButtonEl.dataset.listenerAttached) {
        logoutButtonEl.addEventListener('click', logoutUser); // logoutUser 会处理跳转
        logoutButtonEl.dataset.listenerAttached = 'true';
    }

    try {
        userInfoEl.innerHTML = '<p>正在加载用户信息...</p>'; scoresEl.innerHTML = ''; gameLinksEl.style.display = 'none';
        const profileData = await getUserProfile();
        console.log("Portal_App.js: Profile data received:", profileData);

        if (profileData && profileData.success && profileData.user) {
            const user = profileData.user;
            const scores = profileData.scores || {};
            userInfoEl.innerHTML = `<p>欢迎, <strong>${user.username || user.phone_number}</strong>!</p><p>手机号: ${user.phone_number}</p><p>注册时间: ${new Date(user.created_at).toLocaleDateString()}</p>`;
            let scoresHTML = '<h3>你的游戏积分:</h3><ul>'; /* ... (积分显示逻辑与你上一版一致) ... */ scoresHTML += '</ul>'; scoresEl.innerHTML = scoresHTML;

            console.log("Portal_App.js: Preparing game links. Current token:", token ? token.substring(0,10)+'...' : "NULL_TOKEN_UNEXPECTED");
            gameLinksEl.style.display = 'block';
            const doudizhuGameUrl = 'https://dzz.9526.ip-ddns.com'; // 斗地主前端URL
            if (token) { // 再次确认token存在
                gameLinksEl.innerHTML = `<h3>开始游戏:</h3><ul><li><a href="${doudizhuGameUrl}/?token=${token}" target="_blank">斗地主</a></li><li><a href="#" onclick="alert('锄大地待开发');return false;">锄大地</a></li><li><a href="#" onclick="alert('十三水待开发');return false;">十三水</a></li></ul>`;
                console.log("Portal_App.js: Game links generated with token.");
            } else {
                gameLinksEl.innerHTML = `<p>错误: 用户令牌丢失，无法生成游戏链接。</p>`;
                console.error("Portal_App.js: Token became null before link generation!");
            }
        } else {
            const errMsg = (profileData && profileData.message) ? profileData.message : "无法获取用户信息";
            console.warn("Portal_App.js: Failed to get profile or profile invalid. Message:", errMsg);
            userInfoEl.innerHTML = `<p>获取用户信息失败: ${errMsg}。请尝试<a href="login.html">重新登录</a>。</p>`;
            // 如果是401，api.js中的request函数应该已经处理了跳转
        }
    } catch (error) {
        console.error("Portal_App.js: Exception in initIndexPage (fetching profile/UI update):", error);
        if (userInfoEl) userInfoEl.innerHTML = `<p>加载页面时出错: ${error.message}。</p>`;
    }
}
// initRegisterPage 的完整实现，请从你之前的版本复制，这里只提供框架
// function initRegisterPage() { /* ... */ }
