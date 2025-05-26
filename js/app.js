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

// !!! 确保你已经从之前的版本复制了 initRegisterPage 和 initLoginPage 的完整、正确的函数定义到这里 !!!
// function initRegisterPage() { /* ... */ }
// function initLoginPage() { /* ... */ }


async function initIndexPage() {
    console.log("Portal_App.js: initIndexPage called - V2_Debug");
    const token = getToken(); // 从 api.js (localStorage) 获取 token
    console.log("Portal_App.js: Token for Index Page (from getToken()):", token ? token.substring(0,10)+'...' : "NO_TOKEN_FOUND");

    const userInfoEl = document.getElementById('userInfo');
    const scoresEl = document.getElementById('scoresDisplay');
    const gameLinksEl = document.getElementById('gameLinks');
    const loginLinkEl = document.getElementById('loginLink');
    const registerLinkEl = document.getElementById('registerLink');
    const manageLinkEl = document.getElementById('manageLink');
    const logoutButtonEl = document.getElementById('logoutButton');

    // 先确保所有DOM元素都获取到了，如果获取不到，这是HTML结构问题
    if (!userInfoEl) console.error("Portal_App.js: userInfoEl NOT FOUND!");
    if (!scoresEl) console.error("Portal_App.js: scoresEl NOT FOUND!");
    if (!gameLinksEl) console.error("Portal_App.js: gameLinksEl NOT FOUND!");
    if (!loginLinkEl) console.error("Portal_App.js: loginLinkEl NOT FOUND!");
    if (!registerLinkEl) console.error("Portal_App.js: registerLinkEl NOT FOUND!");
    if (!manageLinkEl) console.error("Portal_App.js: manageLinkEl NOT FOUND!");
    if (!logoutButtonEl) console.error("Portal_App.js: logoutButtonEl NOT FOUND!");

    if (!userInfoEl || !scoresEl || !gameLinksEl || !loginLinkEl || !registerLinkEl || !manageLinkEl || !logoutButtonEl) {
        console.error("Portal_App.js: CRITICAL - One or more UI elements missing. Page cannot render correctly.");
        if(document.body) document.body.innerHTML = "<h1>页面元素加载错误，请联系管理员。</h1>";
        return;
    }

    // 根据Token状态设置初始UI
    if (!token) {
        console.log("Portal_App.js: No token. Setting UI for logged out state.");
        loginLinkEl.style.display = 'inline-block';
        registerLinkEl.style.display = 'inline-block';
        manageLinkEl.style.display = 'none';
        logoutButtonEl.style.display = 'none';
        userInfoEl.innerHTML = '<p>请先<a href="login.html">登录</a>或<a href="register.html">注册</a>以查看更多内容。</p>';
        scoresEl.innerHTML = '<h3>你的游戏积分</h3><ul class="scores-list"><li class="loading-text">请先登录查看积分。</li></ul>';
        gameLinksEl.style.display = 'none';
        return; // 结束函数，因为未登录
    }

    // 如果有Token，则尝试获取用户资料
    console.log("Portal_App.js: Token exists. Setting UI for logged in state (pre-API call).");
    loginLinkEl.style.display = 'none';
    registerLinkEl.style.display = 'none';
    manageLinkEl.style.display = 'inline-block'; // 先显示管理按钮
    logoutButtonEl.style.display = 'block';     // 显示登出按钮

    if (!logoutButtonEl.dataset.listenerAttached) {
        logoutButtonEl.addEventListener('click', () => {
            console.log("Portal_App.js: Logout button clicked.");
            logoutUser(); // logoutUser 应该处理 token 清理和页面跳转
        });
        logoutButtonEl.dataset.listenerAttached = 'true';
    }

    // 设置加载状态文本
    userInfoEl.innerHTML = '<p class="loading-text">正在加载用户信息...</p>';
    scoresEl.innerHTML = '<h3>你的游戏积分</h3><ul class="scores-list"><li class="loading-text">正在加载积分...</li></ul>';
    gameLinksEl.style.display = 'none'; // 先隐藏游戏链接，获取到数据后再显示

    try {
        console.log("Portal_App.js: Attempting to call getUserProfile(). Token:", token ? token.substring(0,10)+'...' : "NULL_TOKEN_UNEXPECTED");
        const profileData = await getUserProfile(); // API调用
        console.log("Portal_App.js: getUserProfile() response received:", profileData);

        if (profileData && profileData.success && profileData.user) {
            console.log("Portal_App.js: getUserProfile successful. Updating UI with user data.");
            const user = profileData.user;
            const scores = profileData.scores || {};

            userInfoEl.innerHTML = `
                <p class="welcome-message">欢迎, <strong>${user.username || user.phone_number}!</strong></p>
                <div class="user-details">
                    <p><strong>手机号:</strong> ${user.phone_number}</p>
                    <p><strong>注册时间:</strong> ${new Date(user.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' })}</p>
                </div>
            `;

            let scoresHTML = '<h3>你的游戏积分:</h3><ul class="scores-list">';
            const gameNames = { 'doudizhu': '斗地主', 'chudadi': '锄大地', 'shisanshui': '十三水' };
            const gameTypes = ['doudizhu', 'chudadi', 'shisanshui'];
            gameTypes.forEach(gameType => {
                const gameData = scores[gameType] || { score: 0, matches_played: 0, wins: 0 };
                scoresHTML += `<li><span class="game-name">${gameNames[gameType]||gameType}:</span> <span class="game-score">${gameData.score}分</span> <span class="game-stats">(局数: ${gameData.matches_played}, 胜场: ${gameData.wins})</span></li>`;
            });
            scoresHTML += '</ul>';
            scoresEl.innerHTML = scoresHTML;

            console.log("Portal_App.js: Preparing game links area.");
            gameLinksEl.style.display = 'block'; // 显示游戏链接区域
            const doudizhuGameUrl = 'https://dzz.9526.ip-ddns.com';
            const currentTokenForLink = getToken(); // 再次获取最新的token
            console.log("Portal_App.js: Token for game link generation (after profile fetch):", currentTokenForLink ? currentTokenForLink.substring(0,10)+'...' : "!!_NO_TOKEN_FOR_LINK_AFTER_PROFILE_!!");

            if (currentTokenForLink) {
                gameLinksEl.innerHTML = `
                    <h2>选择游戏</h2>
                    <ul class="game-card-list">
                        <li><a href="${doudizhuGameUrl}/?token=${currentTokenForLink}" target="_blank"><h4>斗地主</h4><p class="game-description">经典扑克，等你来战！</p></a></li>
                        <li><a href="#" onclick="alert('锄大地待开发');return false;"><h4>锄大地</h4><p class="game-description">技巧比拼！</p></a></li>
                        <li><a href="#" onclick="alert('十三水待开发');return false;"><h4>十三水</h4><p class="game-description">智慧对决！</p></a></li>
                    </ul>`;
                console.log("Portal_App.js: Game links HTML set.");
            } else {
                gameLinksEl.innerHTML = `<p style="color:red;">错误：用户令牌丢失，无法生成游戏链接。请重新登录。</p>`;
                console.error("Portal_App.js: Token became null before link generation, AFTER profile fetch attempt.");
            }
        } else {
            // getUserProfile() 调用不成功或返回数据不合法
            const errMsg = (profileData && profileData.message) ? profileData.message : "无法连接服务器或会话已过期";
            console.warn("Portal_App.js: getUserProfile failed or returned invalid data. Message:", errMsg, "Full response:", profileData);
            userInfoEl.innerHTML = `<p style="color:red;">获取用户信息失败: ${errMsg}。</p><p>请尝试<a href="login.html">重新登录</a>。</p>`;
            scoresEl.innerHTML = '<h3>你的游戏积分</h3><ul class="scores-list"><li>无法加载积分。</li></ul>';
            gameLinksEl.style.display = 'none'; // 获取用户信息失败，不显示游戏链接
            // 如果API明确返回401，api.js中的request函数应该已经处理了登出和跳转
            // 但如果不是401，而是其他错误，用户可能仍然“登录”着（有token），但看不到数据
            // 这种情况可以让用户手动登出
        }
    } catch (error) {
        console.error("Portal_App.js: Exception in initIndexPage (API call or UI update):", error);
        if (userInfoEl) userInfoEl.innerHTML = `<p style="color:red;">加载页面时发生严重错误: ${error.message}。</p>`;
        if (scoresEl) scoresEl.innerHTML = '<h3>你的游戏积分</h3><ul class="scores-list"><li>加载积分出错。</li></ul>';
        gameLinksEl.style.display = 'none';
    }
}

// !!! 确保你已经从之前的版本复制了 initRegisterPage 和 initLoginPage 的完整、正确的函数定义到这里 !!!
// function initRegisterPage() { /* ... */ }
// function initLoginPage() { /* ... */ }
