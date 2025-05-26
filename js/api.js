// portal-frontend/js/api.js
const API_BASE_URL = 'https://9526.ip-ddns.com/api'; // 你的后端API基地址

// 这是一个通用的请求函数封装，你需要根据你的实际情况调整
// 假设它能正确处理请求、错误和返回JSON
async function request(endpoint, method = 'POST', data = null, requiresAuth = false) {
    const url = `${API_BASE_URL}/${endpoint}`;
    const headers = { 'Content-Type': 'application/json' };
    let currentToken = null;

    if (requiresAuth) {
        currentToken = getToken(); // 从localStorage获取
        if (currentToken) {
            headers['Authorization'] = `Bearer ${currentToken}`;
        } else {
            console.warn(`Portal_API.js: Request to ${endpoint} requires auth, but no token found.`);
            // 可以在这里提前返回错误或让请求继续（后端会返回401）
        }
    }

    const config = { method: method, headers: headers };
    if (data && (method === 'POST' || method === 'PUT')) {
        config.body = JSON.stringify(data);
    }

    // console.log(`Portal_API.js: Sending request to ${url}`, config.body ? `with body: ${config.body}` : '');

    try {
        const response = await fetch(url, config);
        // console.log(`Portal_API.js: Raw response from ${endpoint}: Status ${response.status}`);
        const responseData = await response.json();
        // console.log(`Portal_API.js: Parsed response from ${endpoint}:`, responseData);
        if (!response.ok && response.status === 401 && requiresAuth) { // 特别处理401
            console.error(`Portal_API.js: Unauthorized (401) from ${endpoint}. Clearing token.`);
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            if (window.location.pathname.indexOf('login.html') === -1 && window.location.pathname.indexOf('register.html') === -1) {
                window.location.href = 'login.html'; // 跳转到登录页
            }
        }
        return responseData;
    } catch (error) {
        console.error(`Portal_API.js: Error fetching ${endpoint}:`, error);
        return { success: false, message: `请求失败: ${error.message}` }; // 返回一个错误对象
    }
}


export async function registerUser(phone_number, password, username = null) {
    return request('register_phone.php', 'POST', { phone_number, password, username });
}

export async function loginUser(phone_number, password) {
    console.log("Portal_API.js: loginUser called for phone:", phone_number);
    // login_phone.php 是我们之前定义的API端点
    const response = await request('login_phone.php', 'POST', { phone_number, password });
    console.log("Portal_API.js: loginUser API raw response:", response);

    if (response && response.success && response.token && response.user) {
        console.log("Portal_API.js: Login successful. Storing token and user data to localStorage.");
        try {
            localStorage.setItem('authToken', response.token);
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            const storedToken = localStorage.getItem('authToken');
            const storedUser = localStorage.getItem('currentUser');
            console.log("Portal_API.js: authToken stored in localStorage:", storedToken ? storedToken.substring(0,10)+'...' : null);
            console.log("Portal_API.js: currentUser stored in localStorage:", storedUser);
        } catch (e) {
            console.error("Portal_API.js: Error saving to localStorage:", e);
            alert("无法保存用户会话，请检查浏览器设置。");
        }
    } else {
        console.error("Portal_API.js: Login failed or API response format incorrect. Response:", response);
        // 登录失败时，清除可能存在的旧token
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        console.log("Portal_API.js: Cleared any existing authToken and currentUser due to login failure.");
    }
    return response;
}

export async function getUserProfile() {
    console.log("Portal_API.js: getUserProfile called.");
    return request('get_user_profile.php', 'GET', null, true); // 假设GET请求，或者你的request函数能处理
}

export function logoutUser() {
    console.log("Portal_API.js: logoutUser called. Clearing localStorage.");
    const tokenBeforeLogout = localStorage.getItem('authToken');
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    const tokenAfterLogout = localStorage.getItem('authToken');
    console.log("Portal_API.js: authToken before logout:", tokenBeforeLogout ? tokenBeforeLogout.substring(0,10)+'...' : null, "After logout:", tokenAfterLogout);
    // 可选：调用后端API使服务器端session失效
    // request('logout.php', 'POST', null, true);
    if (window.location.pathname.indexOf('login.html') === -1) { // 避免在login页面无限重定向
        window.location.href = 'login.html';
    }
}

export function getToken() {
    const token = localStorage.getItem('authToken');
    // console.log("Portal_API.js: getToken() called, returning:", token ? token.substring(0,10)+'...' : null);
    return token;
}

export function getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    // console.log("Portal_API.js: getCurrentUser() called, returning:", userStr);
    try {
        return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
        console.error("Portal_API.js: Error parsing currentUser from localStorage", e);
        return null;
    }
}
