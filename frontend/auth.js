// frontend/auth.js

document.addEventListener('DOMContentLoaded', () => {
    const API_AUTH_URL = 'https://wenge.cloudns.ch/backend/api/auth.php';

    // --- DOM Element Getters (get elements when needed to ensure they exist) ---
    const getLoginMessagesDiv = () => document.getElementById('loginMessages');
    const getRegisterMessagesDiv = () => document.getElementById('registerMessages');
    const getLoginForm = () => document.getElementById('loginForm');
    const getRegisterForm = () => document.getElementById('registerForm');

    function getUserInfoDisplayElements() {
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

    /**
     * Displays authentication-related messages.
     * @param {HTMLElement} element - The DOM element to display the message in.
     * @param {string} message - The message to display.
     * @param {string} type - The type of message ('error', 'success', 'info').
     */
    function showAuthMessage(element, message, type = 'info') {
        if (element) {
            element.textContent = message;
            element.className = `messages-placeholder ${type}`;
            console.log(`Auth Message [${type}]: ${message}`);
        } else {
            // It's possible a message div isn't on every page, so only warn if critical
            // console.warn("Message element not found for auth message:", message);
        }
    }

    /**
     * Handles responses from authentication API calls.
     * @param {object} data - The JSON data returned from the API.
     * @param {HTMLElement|null} messagesElement - Element to show messages, or null.
     * @param {string|null} redirectUrl - URL to redirect to on success.
     */
    async function handleAuthResponse(data, messagesElement, redirectUrl = null) {
        if (data && data.success) {
            if (messagesElement) showAuthMessage(messagesElement, data.message, 'success');
            
            if (data.user) { 
                localStorage.setItem('userData', JSON.stringify(data.user));
                console.log("User data set in localStorage:", data.user);
            } else if (data.action === 'logout' || (data.isAuthenticated === false && !data.user)) { 
                // Ensure logout or failed checkAuth (where no user is returned) clears data
                localStorage.removeItem('userData');
                console.log("User data removed from localStorage due to logout or failed auth check.");
            }
            
            window.updateUserInfoDisplay(); // Always update UI after auth state change

            if (redirectUrl) {
                setTimeout(() => {
                    window.location.href = redirectUrl;
                }, data.user ? 1000 : 500); // Shorter delay if no user data (e.g. logout)
            }
        } else if (data) {
            showAuthMessage(messagesElement, data.message || '发生未知错误', 'error');
        } else {
            showAuthMessage(messagesElement, '无法连接到服务器或无效响应', 'error');
        }
    }
    
    // --- Event Listeners for Forms ---
    const loginFormInstance = getLoginForm();
    if (loginFormInstance) {
        loginFormInstance.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(loginFormInstance);
            formData.append('action', 'login');
            const submitButton = loginFormInstance.querySelector('button[type="submit"]');
            
            if(submitButton) submitButton.disabled = true;
            showAuthMessage(getLoginMessagesDiv(), "正在登录...", "info");

            try {
                const response = await fetch(API_AUTH_URL, { method: 'POST', body: formData, credentials: 'include' });
                const data = await response.json();
                handleAuthResponse(data, getLoginMessagesDiv(), 'lobby.html');
            } catch (error) {
                console.error("Login fetch/json error:", error);
                showAuthMessage(getLoginMessagesDiv(), "登录请求失败或服务器响应格式错误。", "error");
            } finally {
                if(submitButton) submitButton.disabled = false;
            }
        });
    }

    const registerFormInstance = getRegisterForm();
    if (registerFormInstance) {
        registerFormInstance.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(registerFormInstance);
            formData.append('action', 'register');
            const submitButton = registerFormInstance.querySelector('button[type="submit"]');

            if(submitButton) submitButton.disabled = true;
            showAuthMessage(getRegisterMessagesDiv(), "正在注册...", "info");

            try {
                const response = await fetch(API_AUTH_URL, { method: 'POST', body: formData, credentials: 'include' });
                const data = await response.json();
                handleAuthResponse(data, getRegisterMessagesDiv(), data.success ? 'login.html' : null); 
            } catch (error) {
                console.error("Register fetch/json error:", error);
                showAuthMessage(getRegisterMessagesDiv(), "注册请求失败或服务器响应格式错误。", "error");
            } finally {
                if(submitButton) submitButton.disabled = false;
            }
        });
    }
    
    // --- Logout Functionality ---
    async function handleLogout() {
        const logoutBtns = getLogoutButtons();
        Object.values(logoutBtns).forEach(btn => { if(btn) btn.disabled = true; });
        
        try {
            const response = await fetch(API_AUTH_URL, { 
                method: 'POST', 
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: new URLSearchParams('action=logout'), 
                credentials: 'include' 
            });
            const data = await response.json();
            data.action = 'logout'; // Mark action for handleAuthResponse
            handleAuthResponse(data, null, 'login.html'); 
            if (data.success) {
                // alert("已成功登出。"); // Optional, as handleAuthResponse might redirect quickly
            }
        } catch (error) {
            console.error("Logout fetch/json error:", error);
            alert("登出请求失败或服务器响应格式错误。");
        } finally {
            Object.values(logoutBtns).forEach(btn => { if(btn) btn.disabled = false; });
        }
    }

    // Bind logout to any logout buttons found
    Object.values(getLogoutButtons()).forEach(btn => {
        if (btn) {
            btn.addEventListener('click', handleLogout);
        }
    });

    /**
     * Globally exposed function to check user authentication status.
     * Returns a Promise with the authentication result.
     */
    window.checkUserAuthentication = async function() {
        console.log("checkUserAuthentication called. API Endpoint:", `${API_AUTH_URL}?action=checkAuth`);
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
                console.log("checkAuth response data (JSON):", authResult);
                if (authResult && authResult.success && authResult.isAuthenticated && authResult.user) {
                    localStorage.setItem('userData', JSON.stringify(authResult.user));
                } else {
                    localStorage.removeItem('userData'); // Ensure consistency
                }
            } else {
                const htmlError = await response.text().catch(() => "无法读取非JSON响应体");
                console.error("checkAuth received non-JSON response (likely HTML error):", htmlError.substring(0, 500) + "..."); 
                authResult = { success: false, isAuthenticated: false, message: '认证服务响应格式错误。' };
            }
        } catch (error) { 
            console.error("checkUserAuthentication fetch or JSON parsing error:", error);
            authResult = { success: false, isAuthenticated: false, message: '检查认证状态请求失败 (网络或解析错误)。' };
        } finally {
            // Always remove local user data if the check wasn't definitively successful and authenticated
            if (!(authResult.success && authResult.isAuthenticated && authResult.user)) {
                localStorage.removeItem('userData');
            }
            window.updateUserInfoDisplay(); // Always update UI based on the outcome
        }
        return authResult; // Return the result of the authentication check
    };

    /**
     * Globally exposed function to update user information display on the page.
     */
    window.updateUserInfoDisplay = function() {
        const userInfoDisplays = getUserInfoDisplayElements(); // Get fresh elements
        const logoutBtns = getLogoutButtons();

        const userDataString = localStorage.getItem('userData');
        let userData = null;
        try { 
            if (userDataString) userData = JSON.parse(userDataString); 
        } catch (e) { 
            console.error("Error parsing userData from localStorage during UI update:", e); 
            localStorage.removeItem('userData'); 
        }
        
        console.log("updateUserInfoDisplay called. Parsed userData:", userData);

        Object.entries(userInfoDisplays).forEach(([key, infoDiv]) => {
            const logoutBtn = logoutBtns[key];
            if (infoDiv) {
                if (userData && userData.nickname) {
                    let gamesPlayed = parseInt(userData.games_played) || 0; 
                    let gamesWon = parseInt(userData.games_won) || 0;
                    let winRate = gamesPlayed > 0 ? ((gamesWon / gamesPlayed) * 100).toFixed(1) + '%' : 'N/A';
                    
                    infoDiv.innerHTML = `欢迎, <strong>${userData.nickname}</strong> (总分: ${userData.total_score || 0}) 
                                       <small>[局:${gamesPlayed} 胜:${gamesWon} 胜率:${winRate}]</small> `;
                    if (logoutBtn) { 
                        // Check if button is already a child, if not, append.
                        if (!infoDiv.contains(logoutBtn)) {
                            infoDiv.appendChild(logoutBtn); 
                        }
                        logoutBtn.style.display = 'inline-block';
                    }
                } else {
                    infoDiv.innerHTML = `<a href="login.html">登录</a> | <a href="register.html">注册</a>`;
                    if (logoutBtn) logoutBtn.style.display = 'none';
                }
            }
        });
    };
    
    // Initial authentication check and UI update when the script loads
    if (typeof window.checkUserAuthentication === 'function') {
        window.checkUserAuthentication(); // This already calls updateUserInfoDisplay inside its 'finally'
    } else {
        // This case should ideally not happen if auth.js loads correctly.
        console.error("CRITICAL: window.checkUserAuthentication is not defined immediately after its definition in auth.js.");
        // As a fallback, try to update UI based on whatever is in localStorage.
        if(typeof window.updateUserInfoDisplay === 'function') window.updateUserInfoDisplay();
    }
});
