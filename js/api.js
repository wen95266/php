// js/api.js
const API_BASE_URL = 'https://9526.ip-ddns.com/api'; // 替换成你的API根路径

async function request(endpoint, method = 'POST', data = null, requiresAuth = false) {
    const url = `${API_BASE_URL}/${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
    };

    if (requiresAuth) {
        const token = localStorage.getItem('authToken');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        } else {
            // 如果需要授权但没有token，可以提前处理，比如跳转登录
            console.warn('需要授权的请求，但未找到token');
            // window.location.href = 'login.html'; // 示例跳转
            // return Promise.reject({ success: false, message: '未授权' });
        }
    }

    const config = {
        method: method,
        headers: headers,
    };

    if (data && (method === 'POST' || method === 'PUT')) {
        config.body = JSON.stringify(data);
    } else if (data && method === 'GET') {
        // 如果是GET请求且有数据，将其作为查询参数附加到URL
        // (get_user_profile.php 兼容了从请求体或参数获取token，但通常GET不带body)
        // 这里为了简化，假设带数据的GET请求参数已包含在 endpoint 中，或者 token 走 header
    }


    try {
        const response = await fetch(url, config);
        if (response.status === 401 && requiresAuth) { // 未授权
            console.error('API请求未授权 (401)');
            localStorage.removeItem('authToken'); // 清除无效token
            localStorage.removeItem('currentUser');
            if (window.location.pathname !== '/login.html' && window.location.pathname !== '/register.html') {
                 window.location.href = 'login.html'; // 跳转到登录页
            }
            return Promise.reject({ success: false, message: '会话已过期或无效，请重新登录。' });
        }
        // 尝试解析JSON，如果不是JSON，则返回原始响应
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return response.json();
        } else {
            return response.text(); // 或者 response.blob() 等
        }
    } catch (error) {
        console.error('API请求失败:', error);
        return Promise.reject({ success: false, message: '网络错误或API调用失败: ' + error.message });
    }
}

// 用户认证相关
export async function registerUser(phone_number, password, username = null) {
    return request('register_phone.php', 'POST', { phone_number, password, username });
}

export async function loginUser(phone_number, password) {
    const response = await request('login_phone.php', 'POST', { phone_number, password });
    if (response.success && response.token) {
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('currentUser', JSON.stringify(response.user)); // 存储用户信息
    }
    return response;
}

export async function getUserProfile() {
    // get_user_profile.php 可以通过 Authorization Bearer Token 获取，所以data可以为null
    return request('get_user_profile.php', 'GET', null, true);
}

export function logoutUser() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    // 可选：调用后端API使服务器端session失效，但对于JWT风格的令牌，前端删除即可
    // request('logout.php', 'POST', null, true); // 如果有logout API
    if (window.location.pathname !== '/login.html') {
        window.location.href = 'login.html';
    }
}

export function getToken() {
    return localStorage.getItem('authToken');
}

export function getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
}
