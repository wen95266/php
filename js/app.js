// portal-frontend/js/app.js
// 确保你的 api.js 文件与此文件在同一目录，或者路径正确
// 并且 api.js 中 loginUser 能正确存储token, getToken 能正确读取token
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
    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        messageEl.textContent = '处理中...';
        const phone = document.getElementById('phone').value;
        const password = document.getElementById('password').value;
        const username = document.getElementById('username').value;
        try {
            const result = await registerUser(phone, password, username || null);
            messageEl.textContent = result.message;
            if (result.success) {
                messageEl.style.color = 'green';
                setTimeout(() => { window.location.href = 'login.html'; }, 2000);
            } else {
                messageEl.style.color = 'red';
            }
        } catch (error) {
            messageEl.textContent = (error && error.message) ? error.message : '注册时发生错误。';
            messageEl.style.color = 'red';
        }
    });
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
            const result = await loginUser(phone, password); // loginUser 内部会处理 token 存储
            if (result && result.success) {
                messageEl.textContent = '登录成功！正在跳转...';
                messageEl.style.color = 'green';
                setTimeout(() => { window.location.href = 'index.html'; }, 1000);
            } else {
                messageEl.textContent = (result && result.message) ? result.message : '登录失败，请检查凭证。';
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
    const tokenForPageLoad = getToken(); // 从 api.js (localStorage) 获取 token
    console.log("Portal_App.js: Token for Index Page at page load (from getToken()):", tokenForPageLoad ? tokenForPageLoad.substring(0,10)+'...' : "NO_TOKEN_AT_PAGE_LOAD");

    const userInfoEl = document.getElementById('userInfo');
    const scoresEl = document.getElementById('scoresDisplay');
    const gameLinksEl = document.getElementById('gameLinks');
    const loginLinkEl = document.getElementById('loginLink');
    const logoutButtonEl = document.getElementById('logoutButton');

    if (!userInfoEl || !scoresEl || !gameLinksEl || !loginLinkEl || !logoutButtonEl) {
        console.error("Portal_App.js: One or more critical UI elements for Index Page not found.");
        if(document.body) document.body.innerHTML = "<h1>页面初始化错误(UI Missing)，请联系管理员。</h1>";
        return;
    }

    if (!tokenForPageLoad) {
        console.log("Portal_App.js: No token at page load, showing login link.");
        loginLinkEl.style.display = 'block'; logoutButtonEl.style.display = 'none';
        userInfoEl.innerHTML = '<p>请先<a href="login.html">登录</a>查看内容。</p>';
        scoresEl.innerHTML = ''; gameLinksEl.style.display = 'none';
        return;
    }

    console.log("Portal_App.js: Token exists. Proceeding to fetch profile.");
    loginLinkEl.style.display = 'none'; logoutButtonEl.style.display = 'block';
    if (!logoutButtonEl.dataset.listenerAttached) {
        logoutButtonEl.addEventListener('click', () => {
            console.log("Portal_App.js: Logout button clicked.");
            logoutUser(); // logoutUser 会处理 localStorage 清理和页面跳转
        });
        logoutButtonEl.dataset.listenerAttached = 'true';
    }

    try {
        userInfoEl.innerHTML = '<p>正在加载用户信息...</p>'; scoresEl.innerHTML = ''; gameLinksEl.style.display = 'none';
        const profileData = await getUserProfile(); // getUserProfile 内部会使用 getToken()
        console.log("Portal_App.js: Profile data received:", profileData);

        if (profileData && profileData.success && profileData.user) {
            const user = profileData.user;
            const scores = profileData.scores || {};
            userInfoEl.innerHTML = `<p>欢迎, <strong>${user.username || user.phone_number}</strong>!</p><p>手机号: ${user.phone_number}</p><p>注册时间: ${new Date(user.created_at).toLocaleDateString()}</p>`;
            let scoresHTML = '<h3>你的游戏积分:</h3><ul>';
            const gameNames = { 'doudizhu': '斗地主', 'chudadi': '锄大地', 'shisanshui': '十三水' };
            const gameTypes = ['doudizhu', 'chudadi', 'shisanshui'];
            let hasScores = false;
            gameTypes.forEach(gameType => {
                if (scores[gameType]) {
                    const gameData = scores[gameType];
                    scoresHTML += `<li>${gameNames[gameType] || gameType}: ${gameData.score || 0}分 (局数: ${gameData.matches_played || 0}, 胜场: ${gameData.wins || 0})</li>`;
                    hasScores = true;
                } else {
                    scoresHTML += `<li>${gameNames[gameType] || gameType}: 0分 (局数: 0, 胜场: 0)</li>`;
                }
            });
            if (!hasScores && Object.keys(scores).length === 0 ) {
                 scoresHTML += '<li>暂无任何游戏积分记录。</li>';
            }
            scoresHTML += '</ul>';
            scoresEl.innerHTML = scoresHTML;

            // ==============================================================
            // 关键部分：生成游戏链接
            // ==============================================================
            console.log("Portal_App.js: Preparing game links.");
            gameLinksEl.style.display = 'block';

            const doudizhuGameUrl = 'https://dzz.9526.ip-ddns.com'; // 斗地主前端URL
            // 确保我们使用的是当前最新的token来生成链接
            const tokenForGameLink = getToken(); // 再次从 localStorage 获取最新的 token
            console.log("Portal_App.js: Token specifically for game link generation:", tokenForGameLink ? tokenForGameLink.substring(0,10)+'...' : "!!_NO_TOKEN_FOR_LINK_!!");

            if (tokenForGameLink) {
                gameLinksEl.innerHTML = `
                    <h3>开始游戏:</h3>
                    <ul>
                        <li><a href="${doudizhuGameUrl}/?token=${tokenForGameLink}" target="_blank">斗地主</a></li>
                        <li><a href="#" onclick="alert('锄大地游戏待开发'); return false;">锄大地 (待开发)</a></li>
                        <li><a href="#" onclick="alert('十三水游戏待开发'); return false;">十三水 (待开发)</a></li>
                    </ul>
                    <p><small>游戏将在新标签页打开。</small></p>
                `;
                console.log("Portal_App.js: Game links generated. URL for Doudizhu will be approximately: " + `${doudizhuGameUrl}/?token=${tokenForGameLink.substring(0,10)}...`);
            } else {
                gameLinksEl.innerHTML = `<p style="color:red;">错误：用户令牌丢失，无法生成游戏链接。请尝试重新登录。</p>`;
                console.error("Portal_App.js: CRITICAL - Token is null or undefined just before generating game links, even though user was thought to be logged in!");
            }
        } else {
            const errMsg = (profileData && profileData.message) ? profileData.message : "无法获取用户信息或会话已过期";
            console.warn("Portal_App.js: Failed to get user profile or profile invalid. Message:", errMsg);
            userInfoEl.innerHTML = `<p>获取用户信息失败: ${errMsg}。请尝试<a href="login.html">重新登录</a>。</p>`;
            // 如果 getUserProfile 因为token问题失败，api.js中的request函数应该已经处理了登出和跳转
        }
    } catch (error) {
        console.error("Portal_App.js: Exception in initIndexPage (fetching profile/UI update):", error);
        if (userInfoEl) userInfoEl.innerHTML = `<p>加载页面时发生严重错误: ${error.message}。</p>`;
    }
}

// 确保你有 initRegisterPage 和其他必要的函数定义，或者从之前的版本复制过来
// function initRegisterPage() { /* ... 你的注册页面逻辑 ... */ }
