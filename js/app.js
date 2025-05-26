// portal-frontend/js/app.js
import {
    registerUser,
    loginUser,
    getUserProfile,
    logoutUser,
    getToken,
    getCurrentUser,
    transferScore
} from './api.js'; // 确保api.js路径正确并导出了这些函数

document.addEventListener('DOMContentLoaded', () => {
    console.log("Portal_App.js: DOMContentLoaded event fired. V_COMPLETE_APP_JS");
    const path = window.location.pathname;
    console.log("Portal_App.js: Current path:", path);

    // 初始化通用模态框逻辑 (只在index页面实际使用，但监听器可以先设置好)
    const transferScoreModal = document.getElementById('transferScoreModal');
    const closeTransferModalBtn = document.getElementById('closeTransferModalBtn');
    const transferScoreForm = document.getElementById('transferScoreForm');
    const scoreManagementBtn = document.getElementById('scoreManagementBtn');

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
    } else {
        // 在非index页面这些元素可能不存在，是正常的
        // console.warn("Portal_App.js: scoreManagementBtn or transferScoreModal not found at DOMContentLoaded (might be other page).");
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
        console.log("Portal_App.js: Initializing Register Page");
        initRegisterPage();
    } else if (path.endsWith('/login.html') || path.endsWith('/login')) {
        console.log("Portal_App.js: Initializing Login Page");
        initLoginPage();
    } else if (path.endsWith('/index.html') || path === '/' || path.includes('portal-frontend')) { // 涵盖可能的首页路径
        console.log("Portal_App.js: Initializing Index Page");
        initIndexPage();
    } else {
        console.warn("Portal_App.js: Path not explicitly handled for initialization:", path);
    }
}); // End of DOMContentLoaded


async function handleTransferScoreSubmit(event) {
    event.preventDefault();
    console.log("Portal_App.js: Transfer score form submitted.");
    const transferMessageEl = document.getElementById('transferMessage');
    const submitTransferBtn = document.getElementById('submitTransferBtn');
    const transferScoreModal = document.getElementById('transferScoreModal');
    const amountInput = document.getElementById('transferAmount');
    const recipientPhoneInput = document.getElementById('recipientPhone');

    if(!transferMessageEl || !submitTransferBtn || !transferScoreModal || !amountInput || !recipientPhoneInput) {
        console.error("Portal_App.js: Missing elements for transfer score submit.");
        if(transferMessageEl) transferMessageEl.textContent = "表单元素错误，请刷新页面。";
        return;
    }

    transferMessageEl.style.display = 'none'; transferMessageEl.className = 'message';
    submitTransferBtn.disabled = true; submitTransferBtn.textContent = '处理中...';
    const gameType = document.getElementById('transferGameType').value;
    const amount = amountInput.value; const recipientPhone = recipientPhoneInput.value;

    if (!amount || parseInt(amount, 10) <= 0) {
        transferMessageEl.textContent = '赠送数量必须为大于0的整数。';
        transferMessageEl.classList.add('error'); transferMessageEl.style.display = 'block';
        submitTransferBtn.disabled = false; submitTransferBtn.textContent = '确认赠送';
        amountInput.focus(); return;
    }
    if (!/^[0-9]{11}$/.test(recipientPhone)) {
        transferMessageEl.textContent = '接收方手机号格式不正确 (应为11位数字)。';
        transferMessageEl.classList.add('error'); transferMessageEl.style.display = 'block';
        submitTransferBtn.disabled = false; submitTransferBtn.textContent = '确认赠送';
        recipientPhoneInput.focus(); return;
    }

    try {
        const result = await transferScore(gameType, amount, recipientPhone);
        console.log("Portal_App.js: transferScore API response:", result);
        if (result && result.success) {
            transferMessageEl.textContent = result.message || '积分赠送成功！';
            transferMessageEl.classList.add('success');
            await refreshScoresDisplay();
            setTimeout(() => { if (transferScoreModal.style.display === 'flex') transferScoreModal.style.display = 'none'; }, 2500);
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
        submitTransferBtn.disabled = false; submitTransferBtn.textContent = '确认赠送';
    }
}

async function refreshScoresDisplay() {
    console.log("Portal_App.js: refreshScoresDisplay called.");
    const scoresEl = document.getElementById('scoresDisplay');
    const token = getToken();
    if (!scoresEl || !token) { console.warn("Portal_App.js: Cannot refresh scores, element or token missing."); return; }
    scoresEl.innerHTML = '<h3>你的游戏积分</h3><ul class="scores-list"><li class="loading-text">正在刷新积分...</li></ul>';
    try {
        const profileData = await getUserProfile();
        if (profileData && profileData.success && profileData.user && profileData.scores) {
            populateScores(profileData.scores);
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
    if (!scoresEl) { console.error("Portal_App.js: scoresEl not found in populateScores."); return; }
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


function initRegisterPage() {
    console.log("Portal_App.js: Initializing Register Page logic.");
    const registerForm = document.getElementById('registerForm');
    const messageEl = document.getElementById('message');
    if (!registerForm || !messageEl) { console.error("Portal_App.js: Missing elements for RegisterPage init."); return; }

    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        messageEl.textContent = '处理中...'; messageEl.className = 'message';
        const phone = document.getElementById('phone').value;
        const password = document.getElementById('password').value;
        const username = document.getElementById('username').value; // 可选

        if (!/^[0-9]{11}$/.test(phone)) { // 假设中国11位手机号
            messageEl.textContent = '请输入有效的11位手机号。'; messageEl.classList.add('error'); return;
        }
        if (password.length < 6) {
            messageEl.textContent = '密码长度至少6位。'; messageEl.classList.add('error'); return;
        }

        try {
            const result = await registerUser(phone, password, username || null);
            messageEl.textContent = result.message;
            if (result.success) {
                messageEl.classList.add('success');
                setTimeout(() => { window.location.href = 'login.html'; }, 2000);
            } else {
                messageEl.classList.add('error');
            }
        } catch (error) {
            messageEl.textContent = (error && error.message) ? error.message : '注册时发生错误。';
            messageEl.classList.add('error');
        }
    });
}

function initLoginPage() {
    console.log("Portal_App.js: Initializing Login Page logic.");
    const loginForm = document.getElementById('loginForm');
    const messageEl = document.getElementById('message');
    if (!loginForm || !messageEl) { console.error("Portal_App.js: Missing elements for LoginPage init."); return; }

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        messageEl.textContent = '正在登录...'; messageEl.className = 'message';
        const phone = document.getElementById('phone').value;
        const password = document.getElementById('password').value;
        try {
            const result = await loginUser(phone, password);
            if (result && result.success) {
                messageEl.textContent = '登录成功！正在跳转...'; messageEl.classList.add('success');
                setTimeout(() => { window.location.href = 'index.html'; }, 1000);
            } else {
                messageEl.textContent = (result && result.message) ? result.message : '登录失败，请检查。';
                messageEl.classList.add('error');
            }
        } catch (error) {
            messageEl.textContent = (error && error.message) ? error.message : '登录时发生错误。';
            messageEl.classList.add('error');
        }
    });
}

async function initIndexPage() {
    console.log("Portal_App.js: initIndexPage called - V_COMPLETE_UI_FOCUS");
    const token = getToken();
    console.log("Portal_App.js: Token for Index Page (from getToken()):", token ? token.substring(0,10)+'...' : "NO_TOKEN");

    const userInfoEl = document.getElementById('userInfo');
    const scoresEl = document.getElementById('scoresDisplay');
    const gameLinksEl = document.getElementById('gameLinks');
    const loginLinkEl = document.getElementById('loginLink');
    const registerLinkEl = document.getElementById('registerLink');
    const scoreManagementBtn = document.getElementById('scoreManagementBtn');
    const logoutButtonEl = document.getElementById('logoutButton');

    if (!userInfoEl || !scoresEl || !gameLinksEl || !loginLinkEl || !registerLinkEl || !scoreManagementBtn || !logoutButtonEl) {
        console.error("Portal_App.js: CRITICAL - One or more UI elements missing on Index Page. Check HTML IDs.");
        if(document.body) document.body.innerHTML = "<h1>页面元素加载错误(UI_IDS_MISMATCH)，请联系管理员。</h1>";
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
            populateScores(profileData.scores);

            gameLinksEl.style.display = 'block';
            const doudizhuGameUrl = 'https://dzz.9526.ip-ddns.com'; // 斗地主前端URL
            // !!! 将 YOUR_DEPLOYED_SHISANSHUI_FRONTEND_URL 替换为你新部署的十三水前端的实际URL !!!
            const shisanshuiGameUrl = 'YOUR_DEPLOYED_SHISANSHUI_FRONTEND_URL_HERE';
            // const chudadiGameUrl = 'YOUR_CHUDADI_GAME_URL_HERE'; // 锄大地URL

            const currentTokenForLink = getToken();
            if (currentTokenForLink) {
                gameLinksEl.innerHTML = `
                    <h2>选择游戏</h2>
                    <ul class="game-card-list">
                        <li><a href="${doudizhuGameUrl}/?token=${currentTokenForLink}" target="_blank"><h4>斗地主</h4><p class="game-description">经典对战！</p></a></li>
                        <li><a href="#" onclick="alert('锄大地游戏待开发');return false;"><h4>锄大地</h4><p class="game-description">技巧比拼！</p></a></li>
                        <li><a href="${shisanshuiGameUrl}/?token=${currentTokenForLink}" target="_blank"><h4>十三水</h4><p class="game-description">智慧对决！</p></a></li>
                    </ul>
                    <p class="section-footer-info">所有游戏均使用同一账户积分。</p>`;
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
