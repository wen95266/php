// frontend/auth.js

document.addEventListener('DOMContentLoaded', () => {
    const API_AUTH_URL = 'https://wenge.cloudns.ch/backend/api/auth.php'; 

    // --- DOM Elements ---
    // We will re-fetch these inside updateUserInfoDisplay to ensure they are current
    // const logoutButtons = { lobby: document.getElementById('logoutBtnLobby'), index: document.getElementById('logoutBtnIndex')};
    // const userInfoDisplays = { lobby: document.getElementById('userInfoLobby'), index: document.getElementById('userInfo')};
    // ^^^ It's better to get these elements inside the functions that use them, or ensure they are globally available after DOM load

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginMessagesDiv = document.getElementById('loginMessages');
    const registerMessagesDiv = document.getElementById('registerMessages');


    function showAuthMessage(element, message, type = 'error') {
        // ... (与上一版本相同)
        if (element) {
            element.textContent = message;
            element.className = `messages-placeholder ${type}`;
            console.log(`Auth Message [${type}]: ${message}`);
        } else {
            // console.warn("Message element not found for auth message:", message);
        }
    }

    async function handleAuthResponse(data, messagesElement, redirectUrl = null) {
        const currentPath = window.location.pathname; // Get current page path

        if (data && data.success) {
            if (messagesElement) showAuthMessage(messagesElement, data.message, 'success');
            
            if (data.user) { 
                localStorage.setItem('userData', JSON.stringify(data.user));
                console.log("User data set in localStorage:", data.user);
            } else if (data.action === 'logout') { 
                localStorage.removeItem('userData');
                console.log("User data removed from localStorage.");
            }
            
            // Crucial: Force UI update AFTER localStorage is set/removed
            if (typeof window.updateUserInfoDisplay === 'function') {
                window.updateUserInfoDisplay();
            } else {
                console.warn("window.updateUserInfoDisplay function is not defined globally when handleAuthResponse is called.");
            }

            if (redirectUrl) {
                // Don't redirect immediately if on the target page already (e.g. lobby after login)
                // to allow user to see success message or if UI update is slightly delayed.
                // Or, if a full page reload is desired after login/logout to ensure clean state:
                // window.location.href = redirectUrl; // This would reload the page
                
                // For now, simple redirect after a delay
                setTimeout(() => {
                    window.location.href = redirectUrl;
                }, data.user ? 1000 : 500); // Shorter delay for logout
            }
        } else if (data) {
            showAuthMessage(messagesElement, data.message || '发生未知错误', 'error');
        } else {
            showAuthMessage(messagesElement, '无法连接到服务器或无效响应', 'error');
        }
    }
    
    // --- 登录、注册、登出逻辑与上一版本相同，确保 fetch 中有 credentials: 'include' ---
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
        const logoutBtns = [document.getElementById('logoutBtnLobby'), document.getElementById('logoutBtnIndex')];
        logoutBtns.forEach(btn => { if(btn) btn.disabled = true; });
        try {
            const response = await fetch(API_AUTH_URL, { method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: new URLSearchParams('action=logout'), credentials: 'include' });
            const data = await response.json(); data.action = 'logout'; handleAuthResponse(data, null, 'login.html'); 
            if (data.success) { /* alert("已成功登出。"); // handleAuthResponse handles UI & redirect */}
        } catch (error) { console.error("Logout fetch/json error:", error); alert("登出请求失败或服务器响应格式错误。");
        } finally { logoutBtns.forEach(btn => { if(btn) btn.disabled = false; });}
    }
    // Bind logout to any logout buttons found
    [document.getElementById('logoutBtnLobby'), document.getElementById('logoutBtnIndex')].forEach(btn => {
        if (btn) btn.addEventListener('click', handleLogout);
    });

    // 全局函数：检查用户认证状态
    window.checkUserAuthentication = async function() {
        console.log("checkUserAuthentication called with API_AUTH_URL:", `${API_AUTH_URL}?action=checkAuth`);
        try {
            const response = await fetch(`${API_AUTH_URL}?action=checkAuth`, {credentials: 'include'}); 
            const contentType = response.headers.get("content-type");
            if (!response.ok) { 
                console.error(`checkAuth API request failed with status: ${response.status}`); const errorText = await response.text(); console.error("Server error response:", errorText);
                localStorage.removeItem('userData'); 
                if (typeof window.updateUserInfoDisplay === 'function') window.updateUserInfoDisplay();
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

    // 全局函数：更新页面上的用户信息显示区域
    window.updateUserInfoDisplay = function() {
        // --- MODIFICATION: Get elements fresh each time ---
        const userInfoDisplays = {
            lobby: document.getElementById('userInfoLobby'),
            index: document.getElementById('userInfo') 
        };
        const logoutButtons = {
            lobby: document.getElementById('logoutBtnLobby'),
            index: document.getElementById('logoutBtnIndex')
        };
        // --- END MODIFICATION ---

        const userDataString = localStorage.getItem('userData');
        let userData = null;
        try { if (userDataString) userData = JSON.parse(userDataString); } 
        catch (e) { console.error("Error parsing userData from localStorage:", e); localStorage.removeItem('userData'); }
        
        console.log("updateUserInfoDisplay called. userData from localStorage:", userData);

        Object.entries(userInfoDisplays).forEach(([key, infoDiv]) => {
            const logoutBtn = logoutButtons[key];
            if (infoDiv) { // Check if the userInfo div for this page exists
                if (userData && userData.nickname) {
                    let gamesPlayed = parseInt(userData.games_played) || 0; 
                    let gamesWon = parseInt(userData.games_won) || 0;
                    let winRate = gamesPlayed > 0 ? ((gamesWon / gamesPlayed) * 100).toFixed(1) + '%' : 'N/A';
                    
                    // Clear previous content and rebuild to avoid duplicate buttons
                    infoDiv.innerHTML = `欢迎, <strong>${userData.nickname}</strong> (总分: ${userData.total_score || 0}) 
                                       <small>[局:${gamesPlayed} 胜:${gamesWon} 胜率:${winRate}]</small> `;
                    if (logoutBtn) { 
                        // Important: Re-add event listener if button is re-created or its content changed,
                        // OR ensure logoutBtn reference is stable and just show/hide it.
                        // For simplicity here, we assume logoutBtn is a stable reference.
                        infoDiv.appendChild(logoutBtn); // Append the existing button
                        logoutBtn.style.display = 'inline-block';
                    } else {
                        // If logout button for this specific page wasn't found initially, create it? Or log warning.
                        // console.warn(`Logout button for '${key}' not found during UI update.`);
                    }
                } else {
                    infoDiv.innerHTML = `<a href="login.html">登录</a> | <a href="register.html">注册</a>`;
                    if (logoutBtn) logoutBtn.style.display = 'none';
                }
            } else {
                // console.log(`userInfoDisplay for '${key}' not found on this page.`);
            }
        });
    };
    
    // 页面加载时自动检查一次认证状态并更新UI
    if (typeof window.checkUserAuthentication === 'function') {
        // Call it and then ensure UI is updated, especially if it's the first load on a page
        window.checkUserAuthentication().then(() => {
            // Potentially call updateUserInfoDisplay again here if checkUserAuth doesn't always trigger it
            // or if there's a race condition with DOM elements not being ready.
            // However, checkUserAuthentication already calls updateUserInfoDisplay internally.
        });
    } else {
        console.error("CRITICAL: window.checkUserAuthentication is not defined when auth.js is loaded.");
        // Fallback UI update attempt if checkUserAuthentication isn't ready but localStorage might have data
        if(typeof window.updateUserInfoDisplay === 'function') window.updateUserInfoDisplay();
    }
});
