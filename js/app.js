// js/app.js
// 确保你的 api.js 文件与此文件在同一目录，或者路径正确
import { registerUser, loginUser, getUserProfile, logoutUser, getToken, getCurrentUser } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("Portal_App.js: DOMContentLoaded event fired.");
    const path = window.location.pathname;
    console.log("Portal_App.js: Current path:", path);

    // 根据当前页面路径初始化对应的功能
    // 使用 endsWith 来匹配，更灵活应对 Cloudflare Pages 可能的路径处理
    if (path.endsWith('/register.html') || path.endsWith('/register')) {
        console.log("Portal_App.js: Initializing Register Page for path:", path);
        initRegisterPage();
    } else if (path.endsWith('/login.html') || path.endsWith('/login')) {
        console.log("Portal_App.js: Initializing Login Page for path:", path);
        initLoginPage();
    } else if (path.endsWith('/index.html') || path === '/' || path.endsWith('/portal-frontend/') || path.endsWith('/portal-frontend') || path === '/portal-frontend') { // 覆盖几种可能的首页路径
        console.log("Portal_App.js: Initializing Index Page for path:", path);
        initIndexPage();
    } else {
        console.warn("Portal_App.js: Path not explicitly handled for initialization:", path);
    }
});

function initRegisterPage() {
    const registerForm = document.getElementById('registerForm');
    const messageEl = document.getElementById('message');

    if (registerForm && messageEl) {
        console.log("Portal_App.js: Register form and message element found.");
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            console.log("Portal_App.js: Register form submitted.");
            const phone = document.getElementById('phone').value;
            const password = document.getElementById('password').value;
            const username = document.getElementById('username').value;

            messageEl.textContent = ''; // 清空之前的消息

            if (!/^[0-9]{5,20}$/.test(phone)) {
                messageEl.textContent = '请输入有效的手机号 (5-20位数字)。';
                messageEl.style.color = 'red';
                return;
            }
            if (password.length < 6) {
                messageEl.textContent = '密码长度至少6位。';
                messageEl.style.color = 'red';
                return;
            }

            try {
                const result = await registerUser(phone, password, username || null);
                messageEl.textContent = result.message;
                if (result.success) {
                    messageEl.style.color = 'green';
                    // notifyAdminViaBot(`新用户注册: ${phone}`); // 如果有这个函数
                    setTimeout(() => { window.location.href = 'login.html'; }, 2000);
                } else {
                    messageEl.style.color = 'red';
                }
            } catch (error) {
                messageEl.textContent = (error && error.message) ? error.message : '注册过程中发生错误。';
                messageEl.style.color = 'red';
            }
        });
    } else {
        console.warn("Portal_App.js: Register form or message element not found on register page.");
    }
}

function initLoginPage() {
    const loginForm = document.getElementById('loginForm');
    const messageEl = document.getElementById('message');

    if (loginForm && messageEl) {
        console.log("Portal_App.js: Login form and message element found.");
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            console.log("Portal_App.js: Login form submitted.");
            const phone = document.getElementById('phone').value;
            const password = document.getElementById('password').value;
            messageEl.textContent = '';

            try {
                const result = await loginUser(phone, password); // loginUser 内部应处理 token 存储
                if (result && result.success) {
                    messageEl.textContent = '登录成功！正在跳转...';
                    messageEl.style.color = 'green';
                    // notifyAdminViaBot(`用户登录: ${phone}`);
                    setTimeout(() => { window.location.href = 'index.html'; }, 1000);
                } else {
                    messageEl.textContent = (result && result.message) ? result.message : '登录失败，请检查凭证。';
                    messageEl.style.color = 'red';
                }
            } catch (error) {
                messageEl.textContent = (error && error.message) ? error.message : '登录过程中发生错误。';
                messageEl.style.color = 'red';
            }
        });
    } else {
        console.warn("Portal_App.js: Login form or message element not found on login page.");
    }
}

async function initIndexPage() {
    console.log("Portal_App.js: initIndexPage called");

    const token = getToken(); // 从 localStorage 获取 token
    console.log("Portal_App.js: Token on index page (from localStorage):", token ? token.substring(0,10)+'...' : null);

    const userInfoEl = document.getElementById('userInfo');
    const scoresEl = document.getElementById('scoresDisplay');
    const gameLinksEl = document.getElementById('gameLinks');
    const loginLinkEl = document.getElementById('loginLink');
    const logoutButtonEl = document.getElementById('logoutButton');

    if (!userInfoEl || !scoresEl || !gameLinksEl || !loginLinkEl || !logoutButtonEl) {
        console.error("Portal_App.js: One or more critical UI elements for index page not found. Aborting initIndexPage.");
        return;
    }

    if (!token) {
        console.log("Portal_App.js: No token found, user is not logged in. Showing login link.");
        loginLinkEl.style.display = 'block';
        logoutButtonEl.style.display = 'none';
        userInfoEl.innerHTML = '<p>请先<a href="login.html">登录</a>查看内容。</p>';
        scoresEl.innerHTML = ''; // 清空积分区
        gameLinksEl.style.display = 'none';
        return;
    }

    console.log("Portal_App.js: Token found. User logged in. Proceeding to fetch profile.");
    loginLinkEl.style.display = 'none';
    logoutButtonEl.style.display = 'block';
    if (!logoutButtonEl.dataset.listenerAttached) { // 防止重复添加监听器
        logoutButtonEl.addEventListener('click', () => {
            console.log("Portal_App.js: Logout button clicked.");
            // const currentUser = getCurrentUser(); // getCurrentUser 依赖 localStorage
            // if (currentUser) {
            //     notifyAdminViaBot(`用户登出: ${currentUser.phone_number || currentUser.username}`);
            // }
            logoutUser(); // logoutUser 内部应处理 localStorage 清理和页面跳转
        });
        logoutButtonEl.dataset.listenerAttached = 'true';
    }

    try {
        userInfoEl.innerHTML = '<p>正在加载用户信息...</p>'; // 初始提示
        scoresEl.innerHTML = '';
        gameLinksEl.style.display = 'none'; // 先隐藏游戏链接

        const profileData = await getUserProfile(); // getUserProfile 内部应使用 token
        console.log("Portal_App.js: User profile API response:", profileData);

        if (profileData && profileData.success && profileData.user) {
            const user = profileData.user;
            const scores = profileData.scores || {}; //确保scores是对象

            userInfoEl.innerHTML = `
                <p>欢迎, <strong>${user.username || user.phone_number}</strong>!</p>
                <p>手机号: ${user.phone_number}</p>
                <p>注册时间: ${new Date(user.created_at).toLocaleDateString()}</p>
            `;

            let scoresHTML = '<h3>你的游戏积分:</h3><ul>';
            const gameNames = { 'doudizhu': '斗地主', 'chudadi': '锄大地', 'shisanshui': '十三水' };
            const gameTypes = ['doudizhu', 'chudadi', 'shisanshui']; // 定义一个顺序

            let hasScores = false;
            gameTypes.forEach(gameType => {
                if (scores[gameType]) {
                    const gameData = scores[gameType];
                    scoresHTML += `<li>${gameNames[gameType] || gameType}: ${gameData.score || 0}分 (局数: ${gameData.matches_played || 0}, 胜场: ${gameData.wins || 0})</li>`;
                    hasScores = true;
                } else {
                    // 如果某个游戏没有积分记录，也可以显示为0
                    scoresHTML += `<li>${gameNames[gameType] || gameType}: 0分 (局数: 0, 胜场: 0)</li>`;
                }
            });
            if (!hasScores && Object.keys(scores).length === 0 ) { // 如果scores对象为空
                 scoresHTML += '<li>暂无任何游戏积分记录。</li>';
            }
            scoresHTML += '</ul>';
            scoresEl.innerHTML = scoresHTML;

            // ==============================================================
            // 关键修改：更新斗地主游戏的URL并确保token正确传递
            // ==============================================================
            console.log("Portal_App.js: Preparing to show game links.");
            gameLinksEl.style.display = 'block'; // 显示游戏链接区域

            const doudizhuGameUrl = 'https://dzz.9526.ip-ddns.com'; // 你的新的斗地主前端URL
            // const chudadiGameUrl = 'YOUR_CHUDADI_GAME_URL_HERE';
            // const shisanshuiGameUrl = 'YOUR_SHISANSHUI_GAME_URL_HERE';

            console.log("Portal_App.js: Using doudizhuGameUrl:", doudizhuGameUrl);
            const currentTokenForLink = getToken(); // 再次获取最新的token，以防万一
            console.log("Portal_App.js: Token being used for link construction:", currentTokenForLink ? currentTokenForLink.substring(0,10)+'...' : null);

            if (currentTokenForLink) { // 只有当token存在时才生成带token的链接
                gameLinksEl.innerHTML = `
                    <h3>开始游戏:</h3>
                    <ul>
                        <li><a href="${doudizhuGameUrl}/?token=${currentTokenForLink}" target="_blank">斗地主</a></li>
                        <li><a href="#" onclick="alert('锄大地游戏待开发'); return false;">锄大地 (待开发)</a></li>
                        <li><a href="#" onclick="alert('十三水游戏待开发'); return false;">十三水 (待开发)</a></li>
                    </ul>
                    <p><small>游戏将在新标签页打开。</small></p>
                `;
            } else {
                // 理论上不应该到这里，因为函数开头已经检查过token了
                gameLinksEl.innerHTML = `<p>无法生成游戏链接，请尝试重新登录。</p>`;
                console.error("Portal_App.js: Token was present at start of function but is now null before link generation. This is unexpected.");
            }
            console.log("Portal_App.js: Game links HTML has been set.");

        } else {
            const errMsg = (profileData && profileData.message) ? profileData.message : "无法连接到服务器或凭证无效";
            console.warn("Portal_App.js: Failed to get user profile or profile data invalid. Message:", errMsg);
            userInfoEl.innerHTML = `<p>获取用户信息失败: ${errMsg}。请尝试<a href="login.html">重新登录</a>。</p>`;
            scoresEl.innerHTML = '';
            gameLinksEl.style.display = 'none';
            // 可选：如果 getUserProfile 明确因为 token 无效而失败 (例如API返回401)，则登出用户
            // if (profileData && profileData.message && profileData.message.toLowerCase().includes('未授权')) {
            //     logoutUser();
            // }
        }
    } catch (error) {
        console.error("Portal_App.js: Exception during initIndexPage while fetching profile or updating UI:", error);
        if (userInfoEl) userInfoEl.innerHTML = `<p>加载用户信息时发生错误: ${error.message}。请<a href="login.html">尝试重新登录</a>。</p>`;
        scoresEl.innerHTML = '';
        gameLinksEl.style.display = 'none';
    }
}

// 你的 api.js 导出的其他函数（registerUser, loginUser, etc.）应保持不变
// 以及可能的 notifyAdminViaBot 函数
