// frontend/auth.js

document.addEventListener('DOMContentLoaded', () => {
    // API端点URL，请根据你的实际后端部署路径进行调整
    // 如果你的auth.php在 backend/api/ 目录下，并且前端直接在域名根，那么这个路径可能是对的
    // 如果前端也在一个子目录，比如 frontend/，而后端在另一个同级目录 backend/
    // 且你的前端HTML文件是从 frontend/ 目录提供服务的，那么路径可能是 '../backend/api/auth.php'
    // 但由于你的错误信息显示 auth.js 是从根路径加载的，我们假设后端API也是相对于网站根的某个路径
    const API_AUTH_URL = 'backend/api/auth.php'; // 标准路径，假设前端在根，后端在 backend/api/

    // 获取不同页面的元素
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginMessagesDiv = document.getElementById('loginMessages');
    const registerMessagesDiv = document.getElementById('registerMessages');
    
    // 多个页面可能都有登出按钮和用户信息显示区域
    const logoutButtons = {
        lobby: document.getElementById('logoutBtnLobby'),
        index: document.getElementById('logoutBtnIndex') 
    };
    const userInfoDisplays = {
        lobby: document.getElementById('userInfoLobby'),
        index: document.getElementById('userInfo') 
    };

    /**
     * 显示认证相关的消息
     * @param {HTMLElement} element 显示消息的DOM元素
     * @param {string} message 要显示的消息
     * @param {string} type 消息类型 ('error', 'success', 'info')
     */
    function showAuthMessage(element, message, type = 'error') {
        if (element) {
            element.textContent = message;
            element.className = `messages-placeholder ${type}`;
            console.log(`Auth Message [${type}]: ${message}`);
        } else {
            console.warn("Message element not found for auth message:", message);
        }
    }

    /**
     * 处理认证API的响应
     * @param {object} data API返回的JSON数据
     * @param {HTMLElement} messagesElement 显示消息的DOM元素
     * @param {string|null} redirectUrl 成功后重定向的URL
     */
    async function handleAuthResponse(data, messagesElement, redirectUrl = null) {
        if (data && data.success) {
            showAuthMessage(messagesElement, data.message, 'success');
            if (data.user) { // 登录或checkAuth成功时会有user对象
                localStorage.setItem('userData', JSON.stringify(data.user));
            } else if (data.action === 'logout') { // 登出时清除
                localStorage.removeItem('userData');
            }
            
            // 统一调用更新所有页面的用户信息显示
            if (typeof window.updateUserInfoDisplay === 'function') {
                window.updateUserInfoDisplay();
            } else {
                console.warn("window.updateUserInfoDisplay function is not defined globally. User info might not update across pages.");
            }

            if (redirectUrl) {
                setTimeout(() => {
                    window.location.href = redirectUrl;
                }, 1000); // 延迟1秒跳转，让用户看到成功消息
            }
        } else if (data) {
            showAuthMessage(messagesElement, data.message || '发生未知错误', 'error');
        } else {
            showAuthMessage(messagesElement, '无法连接到服务器或无效响应', 'error');
        }
    }
    
    // 登录表单处理
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(loginForm);
            formData.append('action', 'login'); // 添加action参数
            
            loginForm.querySelector('button[type="submit"]').disabled = true; // 禁用按钮防止重复提交
            showAuthMessage(loginMessagesDiv, "正在登录...", "info");

            try {
                const response = await fetch(API_AUTH_URL, { method: 'POST', body: formData });
                const data = await response.json();
                handleAuthResponse(data, loginMessagesDiv, 'lobby.html'); // 登录成功后跳转到大厅
            } catch (error) {
                console.error("Login fetch error:", error);
                showAuthMessage(loginMessagesDiv, "登录请求失败，请检查网络连接。", "error");
            } finally {
                loginForm.querySelector('button[type="submit"]').disabled = false;
            }
        });
    }

    // 注册表单处理
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(registerForm);
            formData.append('action', 'register'); // 添加action参数

            registerForm.querySelector('button[type="submit"]').disabled = true;
            showAuthMessage(registerMessagesDiv, "正在注册...", "info");

            try {
                const response = await fetch(API_AUTH_URL, { method: 'POST', body: formData });
                const data = await response.json();
                // 注册成功后跳转到登录页
                handleAuthResponse(data, registerMessagesDiv, data.success ? 'login.html' : null); 
            } catch (error) {
                console.error("Register fetch error:", error);
                showAuthMessage(registerMessagesDiv, "注册请求失败，请检查网络连接。", "error");
            } finally {
                registerForm.querySelector('button[type="submit"]').disabled = false;
            }
        });
    }
    
    // 登出处理函数
    async function handleLogout() {
        // 禁用所有可能的登出按钮
        Object.values(logoutButtons).forEach(btn => { if(btn) btn.disabled = true; });
        
        try {
            // 使用 POST 请求登出更符合 RESTful 实践，即使没有body
            const response = await fetch(API_AUTH_URL, { 
                method: 'POST', 
                headers: {'Content-Type': 'application/x-www-form-urlencoded'}, // 必须，即使body为空或只有action
                body: new URLSearchParams('action=logout') 
            });
            const data = await response.json();
            
            // 在 handleAuthResponse 中统一处理 localStorage 和 UI 更新
            data.action = 'logout'; // 附加一个标记给 handleAuthResponse
            handleAuthResponse(data, null, 'login.html'); // 登出后统一跳登录页, messagesElement为null表示不显示特定消息
            if (data.success) {
                alert("已成功登出。"); // 可以用更美观的提示
            }

        } catch (error) {
            console.error("Logout fetch error:", error);
            alert("登出请求失败，请检查网络连接。");
        } finally {
            // 恢复所有登出按钮状态 (如果需要的话，但通常登出后会跳转页面)
            Object.values(logoutButtons).forEach(btn => { if(btn) btn.disabled = false; });
        }
    }

    // 为所有登出按钮绑定事件
    Object.values(logoutButtons).forEach(btn => {
        if (btn) {
            btn.addEventListener('click', handleLogout);
        }
    });


    /**
     * 全局函数：检查用户认证状态
     * 这个函数会被其他JS文件（如script.js, lobby.js）调用
     * 它返回一个Promise，包含认证结果
     */
    window.checkUserAuthentication = async function() {
        console.log("checkUserAuthentication called");
        try {
            const response = await fetch(`${API_AUTH_URL}?action=checkAuth`, {credentials: 'include'});
            if (!response.ok) { // 检查非2xx的状态码
                console.error(`checkAuth API request failed with status: ${response.status}`);
                localStorage.removeItem('userData'); // 出错时也清除本地存储
                if (typeof window.updateUserInfoDisplay === 'function') window.updateUserInfoDisplay();
                return { success: false, isAuthenticated: false, message: `认证服务器错误 (${response.status})` };
            }
            const data = await response.json();
            console.log("checkAuth response data:", data);

            if (data && data.success && data.isAuthenticated && data.user) {
                localStorage.setItem('userData', JSON.stringify(data.user));
            } else {
                localStorage.removeItem('userData');
            }
            
            if (typeof window.updateUserInfoDisplay === 'function') {
                window.updateUserInfoDisplay();
            }
            return data; // 返回后端原始的认证结果
        } catch (error) {
            console.error("checkUserAuthentication fetch error:", error);
            localStorage.removeItem('userData');
            if (typeof window.updateUserInfoDisplay === 'function') window.updateUserInfoDisplay();
            return { success: false, isAuthenticated: false, message: '检查认证状态请求失败，网络可能存在问题。' };
        }
    };

    /**
     * 全局函数：更新页面上的用户信息显示区域
     * 会被 checkUserAuthentication 和 handleAuthResponse 调用
     */
    window.updateUserInfoDisplay = function() {
        const userDataString = localStorage.getItem('userData');
        let userData = null;
        try {
            if (userDataString) userData = JSON.parse(userDataString);
        } catch (e) {
            console.error("Error parsing userData from localStorage:", e);
            localStorage.removeItem('userData'); // 清除损坏的数据
        }
        
        console.log("updateUserInfoDisplay called, userData:", userData);

        Object.entries(userInfoDisplays).forEach(([key, infoDiv]) => {
            const logoutBtn = logoutButtons[key];
            if (infoDiv) {
                if (userData && userData.nickname) {
                    let gamesPlayed = parseInt(userData.games_played) || 0;
                    let gamesWon = parseInt(userData.games_won) || 0;
                    let winRate = gamesPlayed > 0 ? ((gamesWon / gamesPlayed) * 100).toFixed(1) + '%' : 'N/A';
                    
                    infoDiv.innerHTML = `欢迎, <strong>${userData.nickname}</strong> (总分: ${userData.total_score || 0}) 
                                       <small>[局:${gamesPlayed} 胜:${gamesWon} 胜率:${winRate}]</small> `;
                    if (logoutBtn) {
                         infoDiv.appendChild(logoutBtn); 
                         logoutBtn.style.display = 'inline-block';
                    }
                } else {
                    infoDiv.innerHTML = `<a href="login.html">登录</a> | <a href="register.html">注册</a>`;
                    if (logoutBtn) logoutBtn.style.display = 'none';
                }
            }
        });
    };
    
    // 页面加载时自动检查一次认证状态并更新UI
    // 这个调用会确保即使直接访问需要登录的页面，用户信息也能被尝试加载和显示
    // 并且如果其他脚本依赖于此，它们可以通过返回的Promise来同步
    if (typeof window.checkUserAuthentication === 'function') { // 确保函数已定义
        window.checkUserAuthentication();
    } else {
        console.error("CRITICAL: window.checkUserAuthentication is not defined when auth.js is loaded.");
    }
});
