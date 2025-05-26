// portal-frontend/js/api.js

// ========================================================================
// 后端API的基础URL，请确保这个地址指向你的PHP API脚本所在的目录
// ========================================================================
const API_BASE_URL = 'https://9526.ip-ddns.com/api'; // 例如: 'https://your-username.serv00.net/api'

/**
 * 通用的API请求函数 (之前版本已有，这里确保其完整性)
 * @param {string} endpoint API的端点，例如 'login_phone.php'
 * @param {string} method HTTP方法，默认为 'POST'
 * @param {object|null} data 要发送的数据对象，对于POST/PUT会转为JSON字符串
 * @param {boolean} requiresAuth 此请求是否需要Authorization头部 (携带token)
 * @returns {Promise<object>} 返回一个Promise，resolve时为API的JSON响应，reject时为错误对象
 */
async function request(endpoint, method = 'POST', data = null, requiresAuth = false) {
    const url = `${API_BASE_URL}/${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
    };
    let currentToken = null;

    if (requiresAuth) {
        currentToken = getToken(); // 从localStorage获取当前存储的token
        if (currentToken) {
            headers['Authorization'] = `Bearer ${currentToken}`;
        } else {
            console.warn(`Portal_API.js: Request to ${endpoint} requires authentication, but no token was found in localStorage.`);
            // 如果没有token但请求需要授权，后端会返回401，这里也可以提前处理
            // return Promise.resolve({ success: false, message: "未授权：请先登录" }); // 或者让后端处理
        }
    }

    const config = {
        method: method,
        headers: headers,
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) { // PATCH也可能带body
        config.body = JSON.stringify(data);
    } else if (data && method === 'GET') {
        // 如果是GET请求且有数据，可以构建查询字符串
        const queryParams = new URLSearchParams(data).toString();
        // url = `${url}?${queryParams}`; // 注意：如果endpoint本身已有参数，这里需要处理&符号
        // 为简单起见，假设GET请求的数据较少，或者后端能处理来自其他地方的参数
        // 或者，对于需要大量参数的GET，后端可以设计为接受POST
    }

    console.log(`Portal_API.js: Sending ${method} request to ${url}`, data ? `with data: ${JSON.stringify(data)}` : '');
    if (requiresAuth && currentToken) console.log(`Portal_API.js: Using token: ${currentToken.substring(0,10)}...`);


    try {
        const response = await fetch(url, config);
        const responseText = await response.text(); // 先获取文本，再尝试解析JSON
        console.log(`Portal_API.js: Raw response from ${endpoint} (Status ${response.status}): <<<${responseText}>>>`);

        if (response.status === 401 && requiresAuth) {
            console.error(`Portal_API.js: Unauthorized (401) from ${endpoint}. Clearing token and redirecting to login.`);
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            // 避免在已经是登录页时无限重定向
            if (window.location.pathname.indexOf('login.html') === -1 && window.location.pathname.indexOf('register.html') === -1) {
                window.location.href = 'login.html';
            }
            return { success: false, message: "会话已过期或无效，请重新登录。" }; // 返回一个错误对象
        }

        if (!response.ok) { // 处理其他非2xx的HTTP错误
            let errorMessage = `服务器错误 (状态: ${response.status} ${response.statusText})`;
            if (responseText) {
                try { // 尝试解析错误响应体是否为JSON
                    const errorJson = JSON.parse(responseText);
                    if (errorJson && errorJson.message) {
                        errorMessage = errorJson.message;
                    }
                } catch (e) { /* 忽略解析错误，使用原始文本 */ }
                 if(responseText.length > 150) errorMessage += `. 详情: ${responseText.substring(0, 150)}...`;
                 else errorMessage += `. 详情: ${responseText}`;
            }
            console.error(`Portal_API.js: HTTP error from ${endpoint}: ${errorMessage}`);
            // throw new Error(errorMessage); // 或者返回一个包含错误信息的对象
            return { success: false, message: errorMessage, status: response.status };
        }

        // 尝试解析JSON
        try {
            const jsonData = JSON.parse(responseText);
            console.log(`Portal_API.js: Parsed JSON response from ${endpoint}:`, jsonData);
            return jsonData;
        } catch (e) {
            console.error(`Portal_API.js: Failed to parse JSON response from ${endpoint}. Error:`, e, "Response text:", responseText);
            return { success: false, message: "服务器响应格式错误。", rawResponse: responseText };
        }

    } catch (error) { // 主要捕获fetch本身的错误，如网络问题
        console.error(`Portal_API.js: Error fetching ${endpoint}:`, error);
        return { success: false, message: `网络请求失败: ${error.message}` };
    }
}

// ========================================================================
// 用户认证和管理相关的API函数
// ========================================================================

export async function registerUser(phone_number, password, username = null) {
    console.log("Portal_API.js: registerUser called for phone:", phone_number);
    return request('register_phone.php', 'POST', { phone_number, password, username });
}

export async function loginUser(phone_number, password) {
    console.log("Portal_API.js: loginUser called for phone:", phone_number);
    const response = await request('login_phone.php', 'POST', { phone_number, password });
    console.log("Portal_API.js: loginUser API raw response:", response);

    if (response && response.success && response.token && response.user) {
        console.log("Portal_API.js: Login successful. Storing token and user data to localStorage.");
        try {
            localStorage.setItem('authToken', response.token);
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            // console.log("Portal_API.js: authToken stored:", localStorage.getItem('authToken') ? localStorage.getItem('authToken').substring(0,10)+'...' : null);
            // console.log("Portal_API.js: currentUser stored:", localStorage.getItem('currentUser'));
        } catch (e) {
            console.error("Portal_API.js: Error saving to localStorage:", e);
            // alert("无法保存用户会话，请检查浏览器设置。"); // 这个alert可能过于打扰
        }
    } else {
        console.warn("Portal_API.js: Login failed or API response format incorrect. Response:", response);
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
    }
    return response; // 返回原始响应给 app.js
}

export async function getUserProfile() {
    console.log("Portal_API.js: getUserProfile called.");
    // get_user_profile.php 后端应能处理从 Authorization Bearer Token 获取token
    // 如果设计为GET，后端也应能从query参数获取token
    // 为简单起见，如果后端 get_user_profile.php 能从 Authorization 头获取，则data为null
    return request('get_user_profile.php', 'GET', null, true);
}

export function logoutUser() {
    console.log("Portal_API.js: logoutUser called. Clearing localStorage.");
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    // 可选：未来可以添加调用后端API使服务器端session失效的逻辑
    // request('logout_api.php', 'POST', null, true);
    if (window.location.pathname.indexOf('login.html') === -1) {
        window.location.href = 'login.html'; // 跳转到登录页
    } else {
        // 如果已经在登录页，可能不需要强制刷新，或者可以提示用户已登出
        console.log("Portal_API.js: Already on login page or logout initiated from login page.");
    }
}

export function getToken() {
    const token = localStorage.getItem('authToken');
    return token;
}

export function getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    try {
        return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
        console.error("Portal_API.js: Error parsing currentUser from localStorage", e);
        localStorage.removeItem('currentUser'); // 解析失败，清除无效数据
        return null;
    }
}

// ========================================================================
// 新增：积分管理相关的API函数
// ========================================================================
export async function transferScore(gameType, amount, recipientPhone) {
    console.log("Portal_API.js: transferScore called with:", { gameType, amount, recipientPhone });
    return request('transfer_score.php', 'POST', {
        game_type: gameType,
        amount: parseInt(amount, 10), // 确保amount是数字
        recipient_phone: recipientPhone
    }, true); // true 表示这个请求需要授权 (会携带token)
}
