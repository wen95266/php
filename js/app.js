// js/app.js
import { registerUser, loginUser, getUserProfile, logoutUser, getToken, getCurrentUser } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed."); // 调试：确认DOM加载完成
    const path = window.location.pathname;
    console.log("Current path:", path); // 调试：当前路径

    // 修正路径匹配逻辑
    if (path.endsWith('/register.html') || path.endsWith('/register')) {
        console.log("Initializing Register Page for path:", path);
        initRegisterPage();
    } else if (path.endsWith('/login.html') || path.endsWith('/login')) {
        console.log("Initializing Login Page for path:", path);
        initLoginPage();
    } else if (path.endsWith('/index.html') || path === '/' || path.endsWith('/portal-frontend/') || path.endsWith('/portal-frontend')) {
        console.log("Initializing Index Page for path:", path);
        initIndexPage();
    } else {
        console.log("Path not explicitly handled for initialization:", path);
    }
});

function initRegisterPage() {
    const registerForm = document.getElementById('registerForm');
    const messageEl = document.getElementById('message');

    if (registerForm) {
        console.log("Register form found.");
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            console.log("Register form submitted.");
            const phone = document.getElementById('phone').value;
            const password = document.getElementById('password').value;
            const username = document.getElementById('username').value;

            if (!/^[0-9]{5,20}$/.test(phone)) {
                messageEl.textContent = '请输入有效的手机号 (5-20位数字)。';
                messageEl.style.color = 'red';
                console.warn("Invalid phone number format on register:", phone);
                return;
            }
            if (password.length < 6) {
                messageEl.textContent = '密码长度至少6位。';
                messageEl.style.color = 'red';
                console.warn("Password too short on register.");
                return;
            }

            try {
                console.log("Attempting to register user:", { phone, username });
                const result = await registerUser(phone, password, username || null);
                console.log("Registration API response:", result);
                messageEl.textContent = result.message;
                if (result.success) {
                    messageEl.style.color = 'green';
                    notifyAdminViaBot(`新用户注册: ${phone}`);
                    setTimeout(() => window.location.href = 'login.html', 2000);
                } else {
                    messageEl.style.color = 'red';
                }
            } catch (error) {
                console.error("Error during registration:", error);
                messageEl.textContent = error.message || '注册过程中发生错误。';
                messageEl.style.color = 'red';
            }
        });
    } else {
        console.warn("Register form not found on register page.");
    }
}

function initLoginPage() {
    const loginForm = document.getElementById('loginForm');
    const messageEl = document.getElementById('message');

    if (loginForm) {
        console.log("Login form found.");
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            console.log("Login form submitted.");
            const phone = document.getElementById('phone').value;
            const password = document.getElementById('password').value;

            try {
                console.log("Attempting to login user:", phone);
                const result = await loginUser(phone, password);
                console.log("Login API response:", result);
                if (result.success) {
                    messageEl.textContent = '登录成功！正在跳转...';
                    messageEl.style.color = 'green';
                    notifyAdminViaBot(`用户登录: ${phone}`);
                    setTimeout(() => window.location.href = 'index.html', 1000);
                } else {
                    messageEl.textContent = result.message;
                    messageEl.style.color = 'red';
                }
            } catch (error) {
                console.error("Error during login:", error);
                messageEl.textContent = error.message || '登录过程中发生错误。';
                messageEl.style.color = 'red';
            }
        });
    } else {
        console.warn("Login form not found on login page.");
    }
}

async function initIndexPage() {
    console.log("initIndexPage called"); // 调试1

    const token = getToken();
    console.log("Token on index page (from localStorage):", token); // 调试2

    const userInfoEl = document.getElementById('userInfo');
    const scoresEl = document.getElementById('scoresDisplay');
    const gameLinksEl = document.getElementById('gameLinks');
    console.log("gameLinksEl (HTML element found by getElementById):", gameLinksEl); // 调试3

    const loginLinkEl = document.getElementById('loginLink');
    const logoutButtonEl = document.getElementById('logoutButton');

    if (!token) {
        console.log("No token found in localStorage, user is not logged in. Showing login link."); // 调试4
        if (loginLinkEl) loginLinkEl.style.display = 'block';
        if (logoutButtonEl) logoutButtonEl.style.display = 'none';
        if (userInfoEl) userInfoEl.innerHTML = '<p>请先<a href="login.html">登录</a>查看内容。</p>';
        if (gameLinksEl) {
            console.log("Hiding gameLinksEl because no token.");
            gameLinksEl.style.display = 'none';
        }
        return; // 结束函数执行，因为用户未登录
    }

    // 如果代码执行到这里，说明 token 存在
    console.log("Token found in localStorage. User is considered logged in. Proceeding to fetch profile and show game links."); // 调试5
    if (loginLinkEl) loginLinkEl.style.display = 'none';
    if (logoutButtonEl) {
        logoutButtonEl.style.display = 'block';
        // 确保只添加一次事件监听器
        if (!logoutButtonEl.dataset.listenerAttached) {
            logoutButtonEl.addEventListener('click', () => {
                console.log("Logout button clicked.");
                const currentUser = getCurrentUser();
                if (currentUser) {
                    notifyAdminViaBot(`用户登出: ${currentUser.phone_number || currentUser.username}`);
                }
                logoutUser();
            });
            logoutButtonEl.dataset.listenerAttached = 'true';
        }
    }

    try {
        console.log("Attempting to fetch user profile with token:", token);
        const profileData = await getUserProfile(); // getUserProfile 内部会处理 401 并可能重定向
        console.log("User profile API response:", profileData);

        if (profileData && profileData.success) { // 确保profileData不是undefined/null
            const user = profileData.user;
            const scores = profileData.scores;

            if (userInfoEl) {
                console.log("Updating userInfoEl with user data:", user);
                userInfoEl.innerHTML = `
                    <p>欢迎, <strong>${user.username || user.phone_number}</strong>!</p>
                    <p>手机号: ${user.phone_number}</p>
                    <p>注册时间: ${new Date(user.created_at).toLocaleDateString()}</p>
                `;
            } else {
                console.warn("userInfoEl not found on index page.");
            }

            if (scoresEl) {
                console.log("Updating scoresEl with scores data:", scores);
                let scoresHTML = '<h3>你的游戏积分:</h3><ul>';
                const gameNames = {
                    'doudizhu': '斗地主',
                    'chudadi': '锄大地',
                    'shisanshui': '十三水'
                };
                if (scores && Object.keys(scores).length > 0) {
                    for (const gameType in scores) {
                        const gameData = scores[gameType];
                        scoresHTML += `<li>${gameNames[gameType] || gameType}: ${gameData.score}分 (局数: ${gameData.matches_played}, 胜场: ${gameData.wins})</li>`;
                    }
                } else {
                    scoresHTML += '<li>暂无游戏记录</li>';
                }
                scoresHTML += '</ul>';
                scoresEl.innerHTML = scoresHTML;
            } else {
                console.warn("scoresEl not found on index page.");
            }

            if (gameLinksEl) {
                console.log("gameLinksEl found. Preparing to show game links."); // 调试6
                gameLinksEl.style.display = 'block';
                const doudizhuGameUrl = 'https://dzz.9526.ip-ddns.com'; // 请务必再次确认这里是你替换后的URL
                // const chudadiGameUrl = 'https://your-chudadi-game.pages.dev';
                // const shisanshuiGameUrl = 'https://your-shisanshui-game.pages.dev';
                console.log("Using doudizhuGameUrl:", doudizhuGameUrl); // 调试7
                console.log("Token being used for link construction:", token); // 调试8

                gameLinksEl.innerHTML = `
                    <h3>开始游戏:</h3>
                    <ul>
                        <li><a href="${doudizhuGameUrl}?token=${token}" target="_blank">斗地主</a></li>
                        <li><a href="#" onclick="alert('锄大地游戏待开发'); return false;">锄大地 (待开发)</a></li>
                        <li><a href="#" onclick="alert('十三水游戏待开发'); return false;">十三水 (待开发)</a></li>
                    </ul>
                `;
                console.log("Game links HTML has been set into gameLinksEl."); // 调试9
            } else {
                // 这个情况理论上不应该发生，因为如果 gameLinksEl 为 null，上面的 console.log(调试3)就会显示
                console.error("Critical: gameLinksEl is null or undefined at the point of setting HTML, even though it was checked before. This should not happen."); // 调试10
            }

        } else {
            // profileData.success is false OR profileData is null/undefined
            console.warn("Failed to get user profile or profile data indicates failure. Message:", profileData ? profileData.message : "No profile data returned");
            if (userInfoEl) userInfoEl.innerHTML = `<p>获取用户信息失败: ${profileData ? profileData.message : "请检查网络连接。"} 请尝试<a href="login.html">重新登录</a>。</p>`;
            // 注意: getUserProfile 内部的 request 函数在遇到 401 时会自动调用 logoutUser 并重定向
            // 所以如果这里执行，通常是token有效但后端返回了 success: false 的情况
        }
    } catch (error) {
        console.error("Error during initIndexPage while fetching profile or updating UI:", error);
        if (userInfoEl) userInfoEl.innerHTML = `<p>加载用户信息时出错: ${error.message}。请<a href="login.html">尝试重新登录</a>。</p>`;
    }
}

// 辅助函数：通过Telegram Bot发送通知 (前端 -> 后端 -> Telegram)
async function notifyAdminViaBot(message) {
    console.log("Simulating BOT NOTIFICATION:", message);
}
