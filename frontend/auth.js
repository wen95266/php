// frontend/auth.js
document.addEventListener('DOMContentLoaded', () => {
    const API_AUTH_URL = 'https://wenge.cloudns.ch/backend/api/auth.php';

    const getLoginMessagesDiv = () => document.getElementById('loginMessages');
    const getRegisterMessagesDiv = () => document.getElementById('registerMessages');
    const getLoginForm = () => document.getElementById('loginForm');
    const getRegisterForm = () => document.getElementById('registerForm');

    function getUserInfoDisplayElements() {
        // 这些ID应该在你的 lobby.html 和 index.html 中分别存在
        return {
            lobby: document.getElementById('userInfoLobby'), 
            index: document.getElementById('userInfo')      
        };
    }
    function getLogoutButtons() {
         return {
            lobby: document.getElementById('logoutBtnLobby'),
            index: document.getElementById('logoutBtnIndex')
        };
    }

    function showAuthMessage(element, message, type = 'info') {
        if (element) {
            element.textContent = message;
            element.className = `messages-placeholder ${type}`;
            // console.log(`Auth Message [${type}]: ${message}`); // 可以暂时注释掉，减少日志噪音
        }
    }

    async function handleAuthResponse(data, messagesElement, redirectUrl = null) {
        if (data && data.success) {
            if (messagesElement) showAuthMessage(messagesElement, data.message, 'success');
            
            if (data.user) { 
                localStorage.setItem('userData', JSON.stringify(data.user));
                console.log("Auth Success: User data set in localStorage:", JSON.parse(localStorage.getItem('userData')));
            } else if (data.action === 'logout' || (data.isAuthenticated === false && !data.user)) { 
                localStorage.removeItem('userData');
                console.log("Auth Action: User data removed from localStorage.");
            }
            
            // --- CRUCIAL CALL ---
            window.updateUserInfoDisplay(); 

            if (redirectUrl) {
                setTimeout(() => { window.location.href = redirectUrl; }, data.user ? 1200 : 700); 
            }
        } else if (data) {
            showAuthMessage(messagesElement, data.message || '发生未知错误', 'error');
        } else {
            showAuthMessage(messagesElement, '无法连接到服务器或无效响应', 'error');
        }
    }
    
    const loginFormInstance = getLoginForm();
    if (loginFormInstance) {
        loginFormInstance.addEventListener('submit', async (e) => { /* ... (与上一版本相同) ... */ e.preventDefault(); const formData = new FormData(loginFormInstance); formData.append('action', 'login'); const submitButton = loginFormInstance.querySelector('button[type="submit"]'); if(submitButton) submitButton.disabled = true; showAuthMessage(getLoginMessagesDiv(), "正在登录...", "info"); try { const response = await fetch(API_AUTH_URL, { method: 'POST', body: formData, credentials: 'include' }); const data = await response.json(); handleAuthResponse(data, getLoginMessagesDiv(), 'lobby.html');} catch (error) { console.error("Login fetch/json error:", error); showAuthMessage(getLoginMessagesDiv(), "登录请求失败或服务器响应格式错误。", "error");} finally { if(submitButton) submitButton.disabled = false; }});
    }

    const registerFormInstance = getRegisterForm();
    if (registerFormInstance) {
        registerFormInstance.addEventListener('submit', async (e) => { /* ... (与上一版本相同) ... */ e.preventDefault(); const formData = new FormData(registerFormInstance); formData.append('action', 'register'); const submitButton = registerFormInstance.querySelector('button[type="submit"]'); if(submitButton) submitButton.disabled = true; showAuthMessage(getRegisterMessagesDiv(), "正在注册...", "info"); try { const response = await fetch(API_AUTH_URL, { method: 'POST', body: formData, credentials: 'include' }); const data = await response.json(); handleAuthResponse(data, getRegisterMessagesDiv(), data.success ? 'login.html' : null); } catch (error) { console.error("Register fetch/json error:", error); showAuthMessage(getRegisterMessagesDiv(), "注册请求失败或服务器响应格式错误。", "error");} finally { if(submitButton) submitButton.disabled = false;}});
    }
    
    async function handleLogout() { /* ... (与上一版本相同) ... */ const logoutBtns = getLogoutButtons(); Object.values(logoutBtns).forEach(btn => { if(btn) btn.disabled = true; }); try { const response = await fetch(API_AUTH_URL, { method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: new URLSearchParams('action=logout'), credentials: 'include' }); const data = await response.json(); data.action = 'logout'; handleAuthResponse(data, null, 'login.html'); if (data.success) { /* alert("已成功登出。"); */} } catch (error) { console.error("Logout fetch/json error:", error); alert("登出请求失败或服务器响应格式错误。");} finally { Object.values(logoutBtns).forEach(btn => { if(btn) btn.disabled = false; });}}
    Object.values(getLogoutButtons()).forEach(btn => { if (btn) { btn.addEventListener('click', handleLogout); }});

    window.checkUserAuthentication = async function() {
        // console.log("checkUserAuthentication called. API Endpoint:", `${API_AUTH_URL}?action=checkAuth`); // 减少日志
        let authResult = { success: false, isAuthenticated: false, message: '检查认证状态时发生初始错误。' };
        try {
            const response = await fetch(`${API_AUTH_URL}?action=checkAuth`, {credentials: 'include'}); 
            const contentType = response.headers.get("content-type");
            if (!response.ok) { 
                const errorText = await response.text().catch(() => "无法读取错误响应体"); 
                console.error(`checkAuth API request failed with status: ${response.status}. Response: ${errorText.substring(0,300)}`);
                authResult = { success: false, isAuthenticated: false, message: `认证服务器错误 (${response.status})` };
            } else if (contentType && contentType.indexOf("application/json") !== -1) {
                authResult = await response.json();
                // console.log("checkAuth response data (JSON):", authResult); // 减少日志
                if (authResult && authResult.success && authResult.isAuthenticated && authResult.user) {
                    localStorage.setItem('userData', JSON.stringify(authResult.user));
                } else {
                    localStorage.removeItem('userData');
                }
            } else {
                const htmlError = await response.text().catch(() => "无法读取非JSON响应体");
                console.error("checkAuth received non-JSON response:", htmlError.substring(0, 500) + "..."); 
                authResult = { success: false, isAuthenticated: false, message: '认证服务响应格式错误。' };
            }
        } catch (error) { 
            console.error("checkUserAuthentication fetch or JSON parsing error:", error);
            authResult = { success: false, isAuthenticated: false, message: '检查认证状态请求失败 (网络或解析错误)。' };
        } finally {
            if (!(authResult.success && authResult.isAuthenticated && authResult.user)) {
                localStorage.removeItem('userData'); // 确保失败或未认证时清除
            }
            // --- CRUCIAL CALL ---
            window.updateUserInfoDisplay(); 
        }
        return authResult;
    };

    /**
     * Globally exposed function to update user information display on the page.
     * This function will be called after any auth state change or on page load.
     */
    window.updateUserInfoDisplay = function() {
        const userInfoDisplays = getUserInfoDisplayElements(); 
        const logoutBtns = getLogoutButtons(); 

        const userDataString = localStorage.getItem('userData');
        let userData = null;
        try { 
            if (userDataString) userData = JSON.parse(userDataString); 
        } catch (e) { 
            console.error("Error parsing userData from localStorage during UI update:", e); 
            localStorage.removeItem('userData'); 
        }
        
        console.log("updateUserInfoDisplay is EXECUTING. Parsed userData:", userData); // 增加执行日志

        Object.entries(userInfoDisplays).forEach(([key, infoDiv]) => {
            const logoutBtn = logoutBtns[key]; // Get the specific logout button for this display area

            if (infoDiv) { 
                console.log(`Updating UI for display area: '${key}', Found element:`, infoDiv);
                if (userData && userData.nickname) { // User is logged in
                    console.log(`User ${userData.nickname} is logged in. Updating display for '${key}'.`);
                    let gamesPlayed = parseInt(userData.games_played) || 0; 
                    let gamesWon = parseInt(userData.games_won) || 0;
                    let winRate = gamesPlayed > 0 ? ((gamesWon / gamesPlayed) * 100).toFixed(1) + '%' : 'N/A';
                    
                    infoDiv.innerHTML = `欢迎, <strong>${userData.nickname}</strong> (总分: ${userData.total_score || 0}) 
                                       <small>[局:${gamesPlayed} 胜:${gamesWon} 胜率:${winRate}]</small> `;
                    
                    if (logoutBtn) { 
                        if (!infoDiv.contains(logoutBtn)) { // Only append if not already a child
                            infoDiv.appendChild(logoutBtn); 
                        }
                        logoutBtn.style.display = 'inline-block';
                        console.log(`Logout button for '${key}' displayed.`);
                    } else {
                        console.warn(`Logout button for '${key}' (e.g., id='logoutBtn${key.charAt(0).toUpperCase() + key.slice(1)}') NOT found.`);
                    }
                } else { // User is not logged in
                    console.log(`User is not logged in. Setting default display for '${key}'.`);
                    infoDiv.innerHTML = `<a href="login.html">登录</a> | <a href="register.html">注册</a>`;
                    if (logoutBtn) {
                        logoutBtn.style.display = 'none';
                        console.log(`Logout button for '${key}' hidden.`);
                    }
                }
            } else {
                // console.log(`User info display area for '${key}' (e.g., id='userInfo${key.charAt(0).toUpperCase() + key.slice(1)}') NOT found on this page.`);
            }
        });
    };
    
    // Initial authentication check and UI update when the script loads
    if (typeof window.checkUserAuthentication === 'function') {
        window.checkUserAuthentication(); 
    } else {
        console.error("CRITICAL: window.checkUserAuthentication is not defined when auth.js is loaded. Attempting fallback UI update.");
        if(typeof window.updateUserInfoDisplay === 'function') window.updateUserInfoDisplay();
    }
});
