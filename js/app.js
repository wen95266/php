// portal-frontend/js/app.js
import { registerUser, loginUser, getUserProfile, logoutUser, getToken, getCurrentUser, transferScore } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("Portal_App.js: DOMContentLoaded event fired.");
    const path = window.location.pathname;
    console.log("Portal_App.js: Current path:", path);

    // 根据当前页面路径初始化对应的功能
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

    // --- 模态框事件监听器 (在 DOMContentLoaded 中确保只绑定一次) ---
    const transferScoreModal = document.getElementById('transferScoreModal');
    const closeTransferModalBtn = document.getElementById('closeTransferModalBtn');
    const transferScoreForm = document.getElementById('transferScoreForm');
    const scoreManagementBtn = document.getElementById('scoreManagementBtn');

    if (scoreManagementBtn && transferScoreModal) {
        scoreManagementBtn.addEventListener('click', () => {
            console.log("Portal_App.js: Score Management button clicked.");
            const transferMessageEl = document.getElementById('transferMessage');
            transferScoreModal.style.display = 'flex'; // 使用 flex 来居中模态框内容
            if(transferMessageEl) {
                transferMessageEl.style.display = 'none';
                transferMessageEl.textContent = '';
                transferMessageEl.className = 'message'; // 重置 class
            }
            if(transferScoreForm) transferScoreForm.reset(); // 重置表单
            const submitTransferBtn = document.getElementById('submitTransferBtn');
            if(submitTransferBtn) {
                submitTransferBtn.disabled = false;
                submitTransferBtn.textContent = '确认赠送';
            }
        });
    }

    if (closeTransferModalBtn && transferScoreModal) {
        closeTransferModalBtn.addEventListener('click', () => {
            transferScoreModal.style.display = 'none';
        });
    }

    if (transferScoreModal) { // 点击模态框外部区域关闭
        window.addEventListener('click', (event) => {
            if (event.target === transferScoreModal) { // 确保点击的是模态框背景本身
                transferScoreModal.style.display = 'none';
            }
        });
    }

    if (transferScoreForm) {
        transferScoreForm.addEventListener('submit', handleTransferScoreSubmit);
    }

}); // End of DOMContentLoaded


async function handleTransferScoreSubmit(event) {
    event.preventDefault();
    console.log("Portal_App.js: Transfer score form submitted.");
    const transferMessageEl = document.getElementById('transferMessage');
    const submitTransferBtn = document.getElementById('submitTransferBtn');
    const transferScoreModal = document.getElementById('transferScoreModal');
    const amountInput = document.getElementById('transferAmount'); // 获取输入框元素
    const recipientPhoneInput = document.getElementById('recipientPhone'); // 获取手机号输入框

    if(!transferMessageEl || !submitTransferBtn || !transferScoreModal || !amountInput || !recipientPhoneInput) {
        console.error("Portal_App.js: Missing elements for transfer score submit.");
        if(transferMessageEl) transferMessageEl.textContent = "表单元素错误，请刷新页面。";
        return;
    }

    transferMessageEl.style.display = 'none';
    transferMessageEl.className = 'message'; // 重置
    submitTransferBtn.disabled = true;
    submitTransferBtn.textContent = '处理中...';

    const gameType = document.getElementById('transferGameType').value;
    const amount = amountInput.value;
    const recipientPhone = recipientPhoneInput.value;

    if (!amount || parseInt(amount, 10) <= 0) {
        transferMessageEl.textContent = '赠送数量必须为大于0的整数。';
        transferMessageEl.classList.add('error');
        transferMessageEl.style.display = 'block';
        submitTransferBtn.disabled = false;
        submitTransferBtn.textContent = '确认赠送';
        amountInput.focus();
        return;
    }
    if (!/^[0-9]{11}$/.test(recipientPhone)) { // 简单11位手机号校验
        transferMessageEl.textContent = '接收方手机号格式不正确 (应为11位数字)。';
        transferMessageEl.classList.add('error');
        transferMessageEl.style.display = 'block';
        submitTransferBtn.disabled = false;
        submitTransferBtn.textContent = '确认赠送';
        recipientPhoneInput.focus();
        return;
    }

    try {
        const result = await transferScore(gameType, amount, recipientPhone); // 调用api.js中的函数
        console.log("Portal_App.js: transferScore API response:", result);
        if (result && result.success) {
            transferMessageEl.textContent = result.message || '积分赠送成功！';
            transferMessageEl.classList.add('success');
            // 刷新当前用户的积分显示
            // 我们需要重新调用 initIndexPage 的部分逻辑来更新 scoresEl
            // 或者，如果后端返回了赠送者的新积分，可以直接更新
            console.log("Portal_App.js: Score transfer successful, attempting to refresh scores display.");
            const token = getToken();
            if(token){ // 只有登录用户才能赠送，所以token应该存在
                 const profileData = await getUserProfile(); // 重新获取用户信息和积分
                 if(profileData && profileData.success && profileData.user){
                     const scoresEl = document.getElementById('scoresDisplay');
                     if(scoresEl) { // 确保元素存在
                        let scoresHTML = '<h3>你的游戏积分:</h3><ul class="scores-list">';
                        const gameNames = { 'doudizhu': '斗地主', 'chudadi': '锄大地', 'shisanshui': '十三水' };
                        const gameTypes = ['doudizhu', 'chudadi', 'shisanshui'];
                        const scores = profileData.scores || {};
                        gameTypes.forEach(gt => {
                            const gd = scores[gt] || { score: 0, matches_played: 0, wins: 0 };
                            scoresHTML += `<li><span class="game-name">${gameNames[gt]||gt}:</span> <span class="game-score">${gd.score}分</span> <span class="game-stats">(局数: ${gd.matches_played}, 胜场: ${gd.wins})</span></li>`;
                        });
                        scoresHTML += '</ul>';
                        scoresEl.innerHTML = scoresHTML;
                        console.log("Portal_App.js: Scores display refreshed after transfer.");
                     }
                 }
            }

            setTimeout(() => {
                if (transferScoreModal.style.display === 'flex') {
                    transferScoreModal.style.display = 'none';
                }
            }, 2500); // 延迟关闭模态框
        } else {
            transferMessageEl.textContent = (result && result.message) ? result.message : '积分赠送失败。';
            transferMessageEl.classList.add('error');
        }
    } catch (error) {
        transferMessageEl.textContent = (error && error.message) ? error.message : '赠送时发生网络错误。';
        transferMessageEl.classList.add('error');
        console.error("Portal_App.js: Error during score transfer API call:", error);
    } finally {
        transferMessageEl.style.display = 'block';
        submitTransferBtn.disabled = false;
        submitTransferBtn.textContent = '确认赠送';
    }
}


async function initIndexPage() {
    console.log("Portal_App.js: initIndexPage called - V3_ScoreManagement_UI_Final");
    const token = getToken();
    console.log("Portal_App.js: Token for Index Page:", token ? token.substring(0,10)+'...' : "NO_TOKEN");

    const userInfoEl = document.getElementById('userInfo');
    const scoresEl = document.getElementById('scoresDisplay');
    const gameLinksEl = document.getElementById('gameLinks');
    const loginLinkEl = document.getElementById('loginLink');
    const registerLinkEl = document.getElementById('registerLink');
    const scoreManagementBtn = document.getElementById('scoreManagementBtn'); // 已改为 button
    const logoutButtonEl = document.getElementById('logoutButton');

    if (!userInfoEl || !scoresEl || !gameLinksEl || !loginLinkEl || !registerLinkEl || !scoreManagementBtn || !logoutButtonEl) {
        console.error("Portal_App.js: One or more critical UI elements for Index Page not found.");
        if(document.body) document.body.innerHTML = "<h1>页面初始化错误(UI_Elements_Missing_OnInit)，请联系管理员。</h1>";
        return;
    }

    if (!token) {
        loginLinkEl.style.display = 'inline-block'; registerLinkEl.style.display = 'inline-block';
        scoreManagementBtn.style.display = 'none'; logoutButtonEl.style.display = 'none';
        userInfoEl.innerHTML = '<p>请先<a href="login.html">登录</a>或<a href="register.html">注册</a>。</p>';
        scoresEl.innerHTML = '<h3>你的游戏积分</h3><ul class="scores-list"><li class="loading-text">请先登录。</li></ul>';
        gameLinksEl.style.display = 'none';
        return;
    }

    loginLinkEl.style.display = 'none'; registerLinkEl.style.display = 'none';
    scoreManagementBtn.style.display = 'inline-block'; // 显示积分管理按钮
    logoutButtonEl.style.display = 'block';
    if (!logoutButtonEl.dataset.listenerAttached) {
        logoutButtonEl.addEventListener('click', logoutUser);
        logoutButtonEl.dataset.listenerAttached = 'true';
    }

    try {
        userInfoEl.innerHTML = '<p class="loading-text">正在加载用户信息...</p>';
        scoresEl.innerHTML = '<h3>你的游戏积分</h3><ul class="scores-list"><li class="loading-text">正在加载积分...</li></ul>';
        gameLinksEl.style.display = 'none';

        const profileData = await getUserProfile();
        console.log("Portal_App.js: Profile data received for index page:", profileData);

        if (profileData && profileData.success && profileData.user) {
            const user = profileData.user;
            const scores = profileData.scores || {};
            userInfoEl.innerHTML = `<p class="welcome-message">欢迎, <strong>${user.username || user.phone_number}!</strong></p><div class="user-details"><p><strong>手机号:</strong> ${user.phone_number}</p><p><strong>注册时间:</strong> ${new Date(user.created_at).toLocaleDateString('zh-CN',{year:'numeric',month:'numeric',day:'numeric'})}</p></div>`;
            let scoresHTML = '<h3>你的游戏积分:</h3><ul class="scores-list">';
            const gameNames = {'doudizhu':'斗地主','chudadi':'锄大地','shisanshui':'十三水'};
            const gameTypes = ['doudizhu','chudadi','shisanshui'];
            gameTypes.forEach(gt => { const gd = scores[gt] || {score:0,matches_played:0,wins:0}; scoresHTML += `<li><span class="game-name">${gameNames[gt]||gt}:</span> <span class="game-score">${gd.score}分</span> <span class="game-stats">(局数: ${gd.matches_played}, 胜场: ${gd.wins})</span></li>`; });
            scoresHTML += '</ul>';
            scoresEl.innerHTML = scoresHTML;

            gameLinksEl.style.display = 'block';
            const doudizhuGameUrl = 'https://dzz.9526.ip-ddns.com';
            const currentTokenForLink = getToken();
            if (currentTokenForLink) {
                gameLinksEl.innerHTML = `<h2>选择游戏</h2><ul class="game-card-list"><li><a href="${doudizhuGameUrl}/?token=${currentTokenForLink}" target="_blank"><h4>斗地主</h4><p class="game-description">经典对战！</p></a></li><li><a href="#" onclick="alert('锄大地待开发');return false;"><h4>锄大地</h4><p class="game-description">技巧比拼！</p></a></li><li><a href="#" onclick="alert('十三水待开发');return false;"><h4>十三水</h4><p class="game-description">智慧对决！</p></a></li></ul>`;
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
