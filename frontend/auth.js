// frontend/auth.js
document.addEventListener('DOMContentLoaded', () => {
    const API_AUTH_URL = 'https://wenge.cloudns.ch/backend/api/auth.php'; // 完整后端URL
    // ... (其余代码与上一条回复中的 auth.js 完全相同，确保所有 fetch 都包含 credentials: 'include') ...

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginMessagesDiv = document.getElementById('loginMessages');
    const registerMessagesDiv = document.getElementById('registerMessages');
    const logoutButtons = { lobby: document.getElementById('logoutBtnLobby'), index: document.getElementById('logoutBtnIndex')};
    const userInfoDisplays = { lobby: document.getElementById('userInfoLobby'), index: document.getElementById('userInfo')};

    function showAuthMessage(element, message, type = 'error') { if (element) { element.textContent = message; element.className = `messages-placeholder ${type}`; console.log(`Auth Message [${type}]: ${message}`); } else { console.warn("Message element not found for auth message:", message); }}
    async function handleAuthResponse(data, messagesElement, redirectUrl = null) {
        if (data && data.success) {
            showAuthMessage(messagesElement, data.message, 'success');
            if (data.user) { localStorage.setItem('userData', JSON.stringify(data.user));} 
            else if (data.action === 'logout') { localStorage.removeItem('userData');}
            if (typeof window.updateUserInfoDisplay === 'function') { window.updateUserInfoDisplay();} 
            else { console.warn("window.updateUserInfoDisplay function is not defined globally.");}
            if (redirectUrl) { setTimeout(() => { window.location.href = redirectUrl; }, 1000);}
        } else if (data) { showAuthMessage(messagesElement, data.message || '发生未知错误', 'error');
        } else { showAuthMessage(messagesElement, '无法连接到服务器或无效响应', 'error');}
    }
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); const formData = new FormData(loginForm); formData.append('action', 'login');
            const submitButton = loginForm.querySelector('button[type="submit"]'); if(submitButton) submitButton.disabled = true; showAuthMessage(loginMessagesDiv, "正在登录...", "info");
            try { const response = await fetch(API_AUTH_URL, { method: 'POST', body: formData, credentials: 'include' }); const data = await response.json(); handleAuthResponse(data, loginMessagesDiv, 'lobby.html');
            } catch (error) { console.error("Login fetch/json error:", error); showAuthMessage(loginMessagesDiv, "登录请求失败或服务器响应格式错误。", "error");
            } finally { if(submitButton) submitButton.disabled = false; }
        });
    }
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault(); const formData = new FormData(registerForm); formData.append('action', 'register');
            const submitButton = registerForm.querySelector('button[type="submit"]'); if(submitButton) submitButton.disabled = true; showAuthMessage(registerMessagesDiv, "正在注册...", "info");
            try { const response = await fetch(API_AUTH_URL, { method: 'POST', body: formData, credentials: 'include' }); const data = await response.json(); handleAuthResponse(data, registerMessagesDiv, data.success ? 'login.html' : null); 
            } catch (error) { console.error("Register fetch/json error:", error); showAuthMessage(registerMessagesDiv, "注册请求失败或服务器响应格式错误。", "error");
            } finally { if(submitButton) submitButton.disabled = false;}
        });
    }
    async function handleLogout() {
        Object.values(logoutButtons).forEach(btn => { if(btn) btn.disabled = true; });
        try {
            const response = await fetch(API_AUTH_URL, { method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: new URLSearchParams('action=logout'), credentials: 'include' });
            const data = await response.json(); data.action = 'logout'; handleAuthResponse(data, null, 'login.html'); 
            if (data.success) { alert("已成功登出。"); }
        } catch (error) { console.error("Logout fetch/json error:", error); alert("登出请求失败或服务器响应格式错误。");
        } finally { Object.values(logoutButtons).forEach(btn => { if(btn) btn.disabled = false; });}
    }
    Object.values(logoutButtons).forEach(btn => { if (btn) { btn.addEventListener('click', handleLogout);}});

    window.checkUserAuthentication = async function() {
        console.log("checkUserAuthentication called with API_AUTH_URL:", `${API_AUTH_URL}?action=checkAuth`);
        try {
            const response = await fetch(`${API_AUTH_URL}?action=checkAuth`, {credentials: 'include'}); 
            const contentType = response.headers.get("content-type");
            if (!response.ok) { 
                console.error(`checkAuth API request failed with status: ${response.status}`); const errorText = await response.text(); console.error("Server error response:", errorText);
                localStorage.removeItem('userData'); if (typeof window.updateUserInfoDisplay === 'function') window.updateUserInfoDisplay();
                return { success: false, isAuthenticated: false, message: `认证服务器错误 (${response.status})` };
            }
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await response.json(); console.log("checkAuth response data (JSON):", data);
                if (data && data.success && data.isAuthenticated && data.user) { localStorage.setItem('userData', JSON.stringify(data.user));} 
                else { localStorage.removeItem('userData');}
                if (typeof window.updateUserInfoDisplay === 'function') { window.updateUserInfoDisplay();}
                return data;
            } else {
                const htmlError = await response.text(); console.error("checkAuth received non-JSON response:", htmlError.substring(0, 500) + "..."); 
                localStorage.removeItem('userData'); if (typeof window.updateUserInfoDisplay === 'function') window.updateUserInfoDisplay();
                return { success: false, isAuthenticated: false, message: '认证服务响应格式错误 (URL可能错误)。' };
            }
        } catch (error) { 
            console.error("checkUserAuthentication fetch/processing error:", error); localStorage.removeItem('userData');
            if (typeof window.updateUserInfoDisplay === 'function') window.updateUserInfoDisplay();
            return { success: false, isAuthenticated: false, message: '检查认证状态请求失败，网络或服务器响应异常。' };
        }
    };
    window.updateUserInfoDisplay = function() {
        const userDataString = localStorage.getItem('userData'); let userData = null;
        try { if (userDataString) userData = JSON.parse(userDataString); } catch (e) { console.error("Error parsing userData from localStorage:", e); localStorage.removeItem('userData'); }
        console.log("updateUserInfoDisplay called, userData:", userData);
        Object.entries(userInfoDisplays).forEach(([key, infoDiv]) => {
            const logoutBtn = logoutButtons[key];
            if (infoDiv) {
                if (userData && userData.nickname) {
                    let gamesPlayed = parseInt(userData.games_played) || 0; let gamesWon = parseInt(userData.games_won) || 0;
                    let winRate = gamesPlayed > 0 ? ((gamesWon / gamesPlayed) * 100).toFixed(1) + '%' : 'N/A';
                    infoDiv.innerHTML = `欢迎, <strong>${userData.nickname}</strong> (总分: ${userData.total_score || 0}) <small>[局:${gamesPlayed} 胜:${gamesWon} 胜率:${winRate}]</small> `;
                    if (logoutBtn) { infoDiv.appendChild(logoutBtn); logoutBtn.style.display = 'inline-block';}
                } else {
                    infoDiv.innerHTML = `<a href="login.html">登录</a> | <a href="register.html">注册</a>`;
                    if (logoutBtn) logoutBtn.style.display = 'none';
                }
            }
        });
    };
    if (typeof window.checkUserAuthentication === 'function') { window.checkUserAuthentication();} 
    else { console.error("CRITICAL: window.checkUserAuthentication is not defined when auth.js is loaded.");}
});
