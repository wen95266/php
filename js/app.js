// portal-frontend/js/app.js
// ... (import 语句和顶层 DOMContentLoaded, initRegisterPage, initLoginPage 保持不变) ...
// 你应该使用上一轮我提供的 portal-frontend/js/app.js 的完整版本作为基础

async function initIndexPage() {
    console.log("Portal_App.js: initIndexPage called");
    const token = getToken();
    console.log("Portal_App.js: Token for Index Page:", token ? token.substring(0,10)+'...' : "NO_TOKEN");

    const userInfoEl = document.getElementById('userInfo');
    const scoresEl = document.getElementById('scoresDisplay'); // 这个是包含h3和ul的整个div
    const gameLinksEl = document.getElementById('gameLinks');
    const loginLinkEl = document.getElementById('loginLink');
    const registerLinkEl = document.getElementById('registerLink'); // 获取注册链接
    const manageLinkEl = document.getElementById('manageLink');     // 获取管理链接
    const logoutButtonEl = document.getElementById('logoutButton');

    // 确保所有元素都存在
    if (!userInfoEl || !scoresEl || !gameLinksEl || !loginLinkEl || !registerLinkEl || !manageLinkEl || !logoutButtonEl) {
        console.error("Portal_App.js: One or more critical UI elements for Index Page not found.");
        if(document.body) document.body.innerHTML = "<h1>页面初始化错误(UI_Missing_Elements)，请联系管理员。</h1>";
        return;
    }

    if (!token) {
        console.log("Portal_App.js: No token, showing login/register links.");
        loginLinkEl.style.display = 'inline-block';
        registerLinkEl.style.display = 'inline-block';
        manageLinkEl.style.display = 'none';
        logoutButtonEl.style.display = 'none';
        userInfoEl.innerHTML = '<p>请先<a href="login.html">登录</a>或<a href="register.html">注册</a>以查看更多内容。</p>';
        scoresEl.innerHTML = '<h3>你的游戏积分</h3><ul class="scores-list"><li class="loading-text">请先登录查看积分。</li></ul>';
        gameLinksEl.style.display = 'none';
        return;
    }

    console.log("Portal_App.js: Token exists. Showing manage/logout, hiding login/register.");
    loginLinkEl.style.display = 'none';
    registerLinkEl.style.display = 'none';
    manageLinkEl.style.display = 'inline-block'; // 显示管理中心
    logoutButtonEl.style.display = 'block';

    if (!logoutButtonEl.dataset.listenerAttached) {
        logoutButtonEl.addEventListener('click', logoutUser);
        logoutButtonEl.dataset.listenerAttached = 'true';
    }
    // manageLinkEl.href = 'profile.html'; // 如果你有单独的profile页面

    try {
        userInfoEl.innerHTML = '<p class="loading-text">正在加载用户信息...</p>';
        scoresEl.innerHTML = '<h3>你的游戏积分</h3><ul class="scores-list"><li class="loading-text">正在加载积分...</li></ul>';
        gameLinksEl.style.display = 'none';

        const profileData = await getUserProfile();
        console.log("Portal_App.js: Profile data received:", profileData);

        if (profileData && profileData.success && profileData.user) {
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
            let hasAnyScoreRecord = false;

            gameTypes.forEach(gameType => {
                const gameData = scores[gameType] || { score: 0, matches_played: 0, wins: 0 };
                scoresHTML += `
                    <li>
                        <span class="game-name">${gameNames[gameType] || gameType}:</span>
                        <span class="game-score">${gameData.score}分</span>
                        <span class="game-stats">(局数: ${gameData.matches_played}, 胜场: ${gameData.wins})</span>
                    </li>`;
                if (gameData.matches_played > 0) hasAnyScoreRecord = true;
            });
            // 如果用户没有任何游戏的任何记录，可以显示一个统一的提示，但目前是每个游戏都显示0
            // if (!hasAnyScoreRecord) {
            //     scoresHTML += '<li>暂无任何游戏记录。</li>';
            // }
            scoresHTML += '</ul>';
            scoresEl.innerHTML = scoresHTML;

            console.log("Portal_App.js: Preparing game links.");
            gameLinksEl.style.display = 'block'; // 显示游戏链接区域
            const doudizhuGameUrl = 'https://dzz.9526.ip-ddns.com'; // 斗地主前端URL
            const currentTokenForLink = getToken();

            if (currentTokenForLink) {
                gameLinksEl.innerHTML = `
                    <h2>选择游戏</h2>
                    <ul class="game-card-list">
                        <li>
                            <a href="${doudizhuGameUrl}/?token=${currentTokenForLink}" target="_blank">
                                <!-- <img src="assets/doudizhu_thumbnail.png" alt="斗地主" class="game-thumbnail"> -->
                                <h4>斗地主</h4>
                                <p class="game-description">经典三人扑克游戏，等你来战！</p>
                            </a>
                        </li>
                        <li>
                            <a href="#" onclick="alert('锄大地游戏待开发'); return false;">
                                <!-- <img src="assets/chudadi_thumbnail.png" alt="锄大地" class="game-thumbnail"> -->
                                <h4>锄大地</h4>
                                <p class="game-description">港式扑克，出牌技巧大比拼！</p>
                            </a>
                        </li>
                        <li>
                            <a href="#" onclick="alert('十三水游戏待开发'); return false;">
                                <!-- <img src="assets/shisanshui_thumbnail.png" alt="十三水" class="game-thumbnail"> -->
                                <h4>十三水</h4>
                                <p class="game-description">智慧与运气的结合，摆出最强牌型！</p>
                            </a>
                        </li>
                    </ul>
                `;
            } else {
                gameLinksEl.innerHTML = `<p style="color:red;">错误：无法生成游戏链接，请重新登录。</p>`;
            }
        } else {
            const errMsg = (profileData && profileData.message) ? profileData.message : "无法连接或会话无效";
            console.warn("Portal_App.js: Failed to get profile. Message:", errMsg);
            userInfoEl.innerHTML = `<p>获取用户信息失败: ${errMsg}。请尝试<a href="login.html">重新登录</a>。</p>`;
            scoresEl.innerHTML = '<h3>你的游戏积分</h3><ul class="scores-list"><li class="loading-text">无法加载积分。</li></ul>';
        }
    } catch (error) {
        console.error("Portal_App.js: Exception in initIndexPage:", error);
        if (userInfoEl) userInfoEl.innerHTML = `<p>加载页面时发生错误: ${error.message}。</p>`;
        if (scoresEl) scoresEl.innerHTML = '<h3>你的游戏积分</h3><ul class="scores-list"><li class="loading-text">加载积分出错。</li></ul>';
    }
}

// 确保你已从之前的版本复制了 initRegisterPage 和 initLoginPage 的完整函数定义
// function initRegisterPage() { /* ... */ }
// function initLoginPage() { /* ... */ }
