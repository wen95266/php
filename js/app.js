// js/app.js
import { registerUser, loginUser, getUserProfile, logoutUser, getToken, getCurrentUser } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    // 根据当前页面执行不同逻辑
    const path = window.location.pathname;

    if (path.includes('register.html')) {
        initRegisterPage();
    } else if (path.includes('login.html')) {
        initLoginPage();
    } else if (path.includes('index.html') || path === '/' || path.endsWith('/portal-frontend/')) { // 假设index是主页
        initIndexPage();
    }
    // 可以为 profile.html 等其他页面添加初始化函数
});

function initRegisterPage() {
    const registerForm = document.getElementById('registerForm');
    const messageEl = document.getElementById('message');

    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const phone = document.getElementById('phone').value;
            const password = document.getElementById('password').value;
            const username = document.getElementById('username').value; // 可选用户名

            // 简单前端验证
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
                    notifyAdminViaBot(`新用户注册: ${phone}`); // 通过Bot通知
                    setTimeout(() => window.location.href = 'login.html', 2000);
                } else {
                    messageEl.style.color = 'red';
                }
            } catch (error) {
                messageEl.textContent = error.message || '注册过程中发生错误。';
                messageEl.style.color = 'red';
            }
        });
    }
}

function initLoginPage() {
    const loginForm = document.getElementById('loginForm');
    const messageEl = document.getElementById('message');

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const phone = document.getElementById('phone').value;
            const password = document.getElementById('password').value;

            try {
                const result = await loginUser(phone, password);
                if (result.success) {
                    messageEl.textContent = '登录成功！正在跳转...';
                    messageEl.style.color = 'green';
                    notifyAdminViaBot(`用户登录: ${phone}`); // 通过Bot通知
                    setTimeout(() => window.location.href = 'index.html', 1000);
                } else {
                    messageEl.textContent = result.message;
                    messageEl.style.color = 'red';
                }
            } catch (error) {
                messageEl.textContent = error.message || '登录过程中发生错误。';
                messageEl.style.color = 'red';
            }
        });
    }
}

async function initIndexPage() {
    const token = getToken();
    const userInfoEl = document.getElementById('userInfo');
    const scoresEl = document.getElementById('scoresDisplay');
    const gameLinksEl = document.getElementById('gameLinks');
    const loginLinkEl = document.getElementById('loginLink');
    const logoutButtonEl = document.getElementById('logoutButton');

    if (!token) {
        // 未登录，显示登录链接，隐藏用户信息和游戏链接
        if (loginLinkEl) loginLinkEl.style.display = 'block';
        if (logoutButtonEl) logoutButtonEl.style.display = 'none';
        if (userInfoEl) userInfoEl.innerHTML = '<p>请先<a href="login.html">登录</a>查看内容。</p>';
        if (gameLinksEl) gameLinksEl.style.display = 'none';
        return;
    }

    // 已登录
    if (loginLinkEl) loginLinkEl.style.display = 'none';
    if (logoutButtonEl) {
        logoutButtonEl.style.display = 'block';
        logoutButtonEl.addEventListener('click', () => {
            const currentUser = getCurrentUser();
            if (currentUser) {
                notifyAdminViaBot(`用户登出: ${currentUser.phone_number}`);
            }
            logoutUser();
        });
    }

    try {
        const profileData = await getUserProfile();
        if (profileData.success) {
            const user = profileData.user;
            const scores = profileData.scores;

            if (userInfoEl) {
                userInfoEl.innerHTML = `
                    <p>欢迎, <strong>${user.username || user.phone_number}</strong>!</p>
                    <p>手机号: ${user.phone_number}</p>
                    <p>注册时间: ${new Date(user.created_at).toLocaleDateString()}</p>
                `;
            }

            if (scoresEl) {
                let scoresHTML = '<h3>你的游戏积分:</h3><ul>';
                const gameNames = {
                    'doudizhu': '斗地主',
                    'chudadi': '锄大地',
                    'shisanshui': '十三水'
                };
                for (const gameType in scores) {
                    const gameData = scores[gameType];
                    scoresHTML += `<li>${gameNames[gameType] || gameType}: ${gameData.score}分 (局数: ${gameData.matches_played}, 胜场: ${gameData.wins})</li>`;
                }
                if (Object.keys(scores).length === 0) {
                    scoresHTML += '<li>暂无游戏记录</li>';
                }
                scoresHTML += '</ul>';
                scoresEl.innerHTML = scoresHTML;
            }

            if (gameLinksEl) {
                gameLinksEl.style.display = 'block';
                // 实际的游戏链接需要替换成你部署的Cloudflare Pages游戏前端地址
                // 并且可能需要将 token 通过 URL 参数传递给游戏前端，或者游戏前端直接从 localStorage 读取
                gameLinksEl.innerHTML = `
                    <h3>开始游戏:</h3>
                    <ul>
                        <li><a href="https://doudizhu-your-game.pages.dev?token=${token}" target="_blank">斗地主</a></li>
                        <li><a href="https://chudadi-your-game.pages.dev?token=${token}" target="_blank">锄大地</a></li>
                        <li><a href="https://shisanshui-your-game.pages.dev?token=${token}" target="_blank">十三水</a></li>
                    </ul>
                    <p><small>提示: 游戏链接为示例，你需要替换为实际部署地址。</small></p>
                    <p><small>令牌通过URL传递仅为简单示例，更安全的方式是游戏前端从共享的localStorage读取 (如果同主域) 或采用其他安全的传递机制。</small></p>
                `;
            }

        } else {
            // token无效或获取失败
            if (userInfoEl) userInfoEl.innerHTML = `<p>获取用户信息失败: ${profileData.message} 请尝试<a href="login.html">重新登录</a>。</p>`;
            logoutUser(); // 强制登出
        }
    } catch (error) {
        console.error("获取用户信息时出错:", error);
        if (userInfoEl) userInfoEl.innerHTML = `<p>加载用户信息时出错。请<a href="login.html">尝试重新登录</a>。</p>`;
        if (error.message.includes('重新登录')) { // 如果API.js中已处理401并跳转，这里可能不会执行
            // logoutUser();
        }
    }
}

// 辅助函数：通过Telegram Bot发送通知 (前端 -> 后端 -> Telegram)
// 这只是一个概念，实际实现需要一个后端API端点来接收前端的通知请求，然后再由后端PHP调用Telegram API
// 为简化，这里只在控制台打印，实际你可以创建一个 /api/notify_admin.php
async function notifyAdminViaBot(message) {
    console.log("模拟Bot通知:", message);
    // 真实场景:
    // try {
    //     await request('notify_admin.php', 'POST', { message: message }, true); // 假设有这样一个后端点
    // } catch (error) {
    //     console.warn("发送管理员通知失败:", error);
    // }
}
