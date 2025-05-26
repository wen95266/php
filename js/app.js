// portal-frontend/js/app.js
import { registerUser, loginUser, getUserProfile, logoutUser, getToken, getCurrentUser, transferScore } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("Portal_App.js: DOMContentLoaded event fired. V_Final_Focus");
    const path = window.location.pathname;
    console.log("Portal_App.js: Current path:", path);

    // 初始化通用模态框逻辑
    const transferScoreModal = document.getElementById('transferScoreModal');
    const closeTransferModalBtn = document.getElementById('closeTransferModalBtn');
    const transferScoreForm = document.getElementById('transferScoreForm');
    const scoreManagementBtn = document.getElementById('scoreManagementBtn'); // 这个按钮的显示由initIndexPage控制

    if (scoreManagementBtn && transferScoreModal) {
        scoreManagementBtn.addEventListener('click', () => {
            console.log("Portal_App.js: Score Management button clicked.");
            const transferMessageEl = document.getElementById('transferMessage');
            transferScoreModal.style.display = 'flex';
            if(transferMessageEl) {
                transferMessageEl.style.display = 'none'; transferMessageEl.textContent = ''; transferMessageEl.className = 'message';
            }
            if(transferScoreForm) transferScoreForm.reset();
            const submitTransferBtn = document.getElementById('submitTransferBtn');
            if(submitTransferBtn) { submitTransferBtn.disabled = false; submitTransferBtn.textContent = '确认赠送';}
        });
    }
    if (closeTransferModalBtn && transferScoreModal) {
        closeTransferModalBtn.addEventListener('click', () => { transferScoreModal.style.display = 'none'; });
    }
    if (transferScoreModal) {
        window.addEventListener('click', (event) => { if (event.target === transferScoreModal) transferScoreModal.style.display = 'none'; });
    }
    if (transferScoreForm) {
        transferScoreForm.addEventListener('submit', handleTransferScoreSubmit);
    }

    // 页面特定初始化
    if (path.endsWith('/register.html') || path.endsWith('/register')) {
        initRegisterPage();
    } else if (path.endsWith('/login.html') || path.endsWith('/login')) {
        initLoginPage();
    } else if (path.endsWith('/index.html') || path === '/' || path.includes('portal-frontend')) {
        initIndexPage();
    } else {
        console.warn("Portal_App.js: Path not explicitly handled:", path);
    }
});

async function handleTransferScoreSubmit(event) {
    event.preventDefault();
    console.log("Portal_App.js: Transfer score form submitted.");
    const transferMessageEl = document.getElementById('transferMessage');
    const submitTransferBtn = document.getElementById('submitTransferBtn');
    const transferScoreModal = document.getElementById('transferScoreModal');
    const amountInput = document.getElementById('transferAmount');
    const recipientPhoneInput = document.getElementById('recipientPhone');

    if(!transferMessageEl || !submitTransferBtn || !transferScoreModal || !amountInput || !recipientPhoneInput) {return;}

    transferMessageEl.style.display = 'none'; transferMessageEl.className = 'message';
    submitTransferBtn.disabled = true; submitTransferBtn.textContent = '处理中...';
    const gameType = document.getElementById('transferGameType').value;
    const amount = amountInput.value; const recipientPhone = recipientPhoneInput.value;

    if (!amount || parseInt(amount, 10) <= 0) { /* ...错误处理... */ return; }
    if (!/^[0-9]{11}$/.test(recipientPhone)) { /* ...错误处理... */ return; }

    try {
        const result = await transferScore(gameType, amount, recipientPhone);
        if (result && result.success) {
            transferMessageEl.textContent = result.message || '积分赠送成功！';
            transferMessageEl.classList.add('success');
            await refreshScoresDisplay(); // 调用新的刷新积分函数
            setTimeout(() => { if (transferScoreModal.style.display === 'flex') transferScoreModal.style.display = 'none'; }, 2500);
        } else { /* ...错误处理... */ }
    } catch (error) { /* ...错误处理... */ }
    finally { /* ...按钮状态恢复... */ }
}

async function refreshScoresDisplay() {
    console.log("Portal_App.js: refreshScoresDisplay called.");
    const scoresEl = document.getElementById('scoresDisplay');
    const token = getToken(); // 确保token仍然有效
    if (!scoresEl || !token) {
        console.warn("Portal_App.js: Cannot refresh scores, element or token missing.");
        return;
    }
    scoresEl.innerHTML = '<h3>你的游戏积分</h3><ul class="scores-list"><li class="loading-text">正在刷新积分...</li></ul>';
    try {
        const profileData = await getUserProfile(); // 重新获取包含最新积分的用户信息
        if (profileData && profileData.success && profileData.user && profileData.scores) {
            populateScores(profileData.scores); // 调用填充积分的函数
        } else {
            scoresEl.innerHTML = '<h3>你的游戏积分</h3><ul class="scores-list"><li>刷新积分失败。</li></ul>';
        }
    } catch (error) {
        console.error("Portal_App.js: Error refreshing scores:", error);
        scoresEl.innerHTML = '<h3>你的游戏积分</h3><ul class="scores-list"><li>刷新积分出错。</li></ul>';
    }
}

function populateScores(scoresData) {
    const scoresEl = document.getElementById('scoresDisplay');
    if (!scoresEl) return;
    let scoresHTML = '<h3>你的游戏积分:</h3><ul class="scores-list">';
    const gameNames = {'doudizhu':'斗地主','chudadi':'锄大地','shisanshui':'十三水'};
    const gameTypes = ['doudizhu','chudadi','shisanshui'];
    const scores = scoresData || {};
    gameTypes.forEach(gt => {
        const gd = scores[gt] || {score:0,matches_played:0,wins:0};
        scoresHTML += `<li><span class="game-name">${gameNames[gt]||gt}:</span> <span class="game-score">${gd.score}分</span> <span class="game-stats">(局数: ${gd.matches_played}, 胜场: ${gd.wins})</span></li>`;
    });
    scoresHTML += '</ul>';
    scoresEl.innerHTML = scoresHTML;
    console.log("Portal_App.js: Scores display populated.");
}


async function initIndexPage() {
    console.log("Portal_App.js: initIndexPage called - V_Final_UI_Focus");
    const token = getToken();
    console.log("Portal_App.js: Token for Index Page:", token ? token.substring(0,10)+'...' : "NO_TOKEN");

    const userInfoEl = document.getElementById('userInfo');
    const scoresEl = document.getElementById('scoresDisplay');
    const gameLinksEl = document.getElementById('gameLinks');
    const loginLinkEl = document.getElementById('loginLink');
    const registerLinkEl = document.getElementById('registerLink');
    const scoreManagementBtn = document.getElementById('scoreManagementBtn');
    const logoutButtonEl = document.getElementById('logoutButton');

    if (!userInfoEl || !scoresEl || !gameLinksEl || !loginLinkEl || !registerLinkEl || !scoreManagementBtn || !logoutButtonEl) {
        console.error("Portal_App.js: Critical UI elements missing on Index Page.");
        return;
    }

    if (!token) {
        loginLinkEl.style.display = 'inline-block'; registerLinkEl.style.display = 'inline-block';
        scoreManagementBtn.style.display = 'none'; logoutButtonEl.style.display = 'none';
        userInfoEl.innerHTML = '<p>请先<a href="login.html">登录</a>或<a href="register.html">注册</a>。</p>';
        scoresEl.innerHTML = '<h3>你的游戏积分</h3><ul class="scores-list"><li>请先登录。</li></ul>';
        gameLinksEl.style.display = 'none';
        return;
    }

    loginLinkEl.style.display = 'none'; registerLinkEl.style.display = 'none';
    scoreManagementBtn.style.display = 'inline-block'; logoutButtonEl.style.display = 'block';
    if (!logoutButtonEl.dataset.listenerAttached) {
        logoutButtonEl.addEventListener('click', logoutUser);
        logoutButtonEl.dataset.listenerAttached = 'true';
    }

    userInfoEl.innerHTML = '<p class="loading-text">正在加载用户信息...</p>';
    scoresEl.innerHTML = '<h3>你的游戏积分</h3><ul class="scores-list"><li class="loading-text">正在加载积分...</li></ul>';
    gameLinksEl.style.display = 'none';

    try {
        const profileData = await getUserProfile();
        console.log("Portal_App.js: Profile data for index page:", profileData);

        if (profileData && profileData.success && profileData.user) {
            const user = profileData.user;
            userInfoEl.innerHTML = `<p class="welcome-message">欢迎, <strong>${user.username || user.phone_number}!</strong></p><div class="user-details"><p><strong>手机号:</strong> ${user.phone_number}</p><p><strong>注册时间:</strong> ${new Date(user.created_at).toLocaleDateString('zh-CN',{year:'numeric',month:'numeric',day:'numeric'})}</p></div>`;
            populateScores(profileData.scores); // 使用新函数填充积分

            gameLinksEl.style.display = 'block';
            const doudizhuGameUrl = 'https://dzz.9526.ip-ddns.com';
            const currentTokenForLink = getToken();
            if (currentTokenForLink) {
                gameLinksEl.innerHTML = `<h2>选择游戏</h2><ul class="game-card-list"><li><a href="${doudizhuGameUrl}/?token=${currentTokenForLink}" target="_blank"><h4>斗地主</h4><p class="game-description">经典对战！</p></a></li><li><a href="#" onclick="alert('锄大地待开发');return false;"><h4>锄大地</h4><p class="game-description">技巧比拼！</p></a></li><li><a href="#" onclick="alert('十三水待开发');return false;"><h4>十三水</h4><p class="game-description">智慧对决！</p></a></li></ul> <p class="section-footer-info">所有游戏均使用同一账户积分。</p>`;
            } else { gameLinksEl.innerHTML = `<p style="color:red;">无法生成游戏链接，令牌丢失。</p>`;}
        } else {
            const errMsg = (profileData && profileData.message) ? profileData.message : "无法获取用户信息";
            userInfoEl.innerHTML = `<p style="color:red;">获取用户信息失败: ${errMsg}。</p><p>请尝试<a href="login.html">重新登录</a>。</p>`;
            scoresEl.innerHTML = '<h3>你的游戏积分</h3><ul class="scores-list"><li>无法加载积分。</li></ul>';
        }
    } catch (error) {
        console.error("Portal_App.js: Exception in initIndexPage (API/UI):", error);
        if (userInfoEl) userInfoEl.innerHTML = `<p style="color:red;">加载页面出错: ${error.message}。</p>`;
    }
}

// !!! 确保你已从之前的版本复制了 initRegisterPage 和 initLoginPage 的完整函数定义到这里 !!!
function initRegisterPage() { /* ... 你的完整注册页面逻辑 ... */ }
function initLoginPage() { /* ... 你的完整登录页面逻辑 ... */ }
