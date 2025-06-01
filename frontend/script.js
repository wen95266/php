// frontend/script.js
document.addEventListener('DOMContentLoaded', async () => {
    const API_GAME_URL = 'backend/api/game.php';
    const CARD_IMG_PATH = './cards/';

    // --- DOM Elements ---
    const messagesDiv = document.getElementById('messages');
    // ... (其他 DOM 元素获取)
    const player1NameSpan = document.getElementById('player1Name');
    const player1ScoreSpan = document.getElementById('player1ScoreDisplay');
    // ...

    // --- Game State Variables ---
    // ... (与上一版本相同)

    // --- Drag and Drop (与上一版本相同) ---
    // ...

    // --- Helper Functions ---
    function showMessage(text, type = 'info') {
        if (messagesDiv) {
            messagesDiv.textContent = text;
            messagesDiv.className = `messages-placeholder ${type}`; // 更新类名以改变样式
            console.log(`Message displayed: [${type}] ${text}`); // 增加日志，方便调试
        } else {
            console.error("messagesDiv is not found in the DOM!");
        }
    }
    // ... (其他 helper 函数 createCardElement, renderPlayerHand, etc. 与上一版本相同)

    // --- API Calls & Game Logic ---
    async function fetchGameApi(action, method = 'POST', bodyParams = null) {
        // ... (与上一版本相同)
        // 在开始请求前，可以显示一个更具体的loading，如果需要
        // showMessage("正在请求服务器...", "info"); 
        const options = { method: method, credentials: 'include' };
        let url = `${API_GAME_URL}?action=${action}`;
        if (bodyParams && method !== 'GET') { // GET 参数已在action中
            const formData = new FormData();
            for (const key in bodyParams) {
                if (typeof bodyParams[key] === 'object' && bodyParams[key] !== null) {
                    formData.append(key, JSON.stringify(bodyParams[key]));
                } else {
                    formData.append(key, bodyParams[key]);
                }
            }
            options.body = formData;
        } else if (bodyParams && method === 'GET') {
             url += '&' + new URLSearchParams(bodyParams).toString();
        }

        try {
            const response = await fetch(url, options);
            const data = await response.json();
            if (data.redirectToLogin) {
                showMessage('会话已过期或未登录，请重新登录。', 'error');
                localStorage.removeItem('userData'); localStorage.removeItem('activeGameTableId'); localStorage.removeItem('activeGameRoundId');
                window.updateUserInfoDisplay?.(); 
                setTimeout(() => window.location.href = 'login.html', 2000);
                return null; 
            }
            return data;
        } catch (error) {
            console.error("Game API call failed:", action, error);
            // 避免覆盖掉 "正在连接游戏" 这种初始消息，除非是明确的API错误
            if (action !== 'getState' || !messagesDiv.textContent.includes("正在连接游戏")) {
                 showMessage(`游戏请求失败: ${error.message}`, 'error');
            }
            return { success: false, message: `游戏请求失败: ${error.message}` };
        }
    }

    function resetGameScreenUI() {
        // ... (与上一版本相同)
    }

    async function loadCurrentGameAndPlayerInfo() {
        // 确保 auth.js 的 checkUserAuthentication 已经执行并更新了 localStorage
        // 或者直接在这里再次调用 checkUserAuthentication (如果 auth.js 还没完全跑完)
        // await window.checkUserAuthentication?.(); // 可选，确保用户信息最新

        const userData = JSON.parse(localStorage.getItem('userData'));
        if (userData && userData.id) { // 确保userData和id存在
            currentPlayerId = userData.id;
            if (player1NameSpan) player1NameSpan.textContent = userData.nickname || userData.username;
            if (player1ScoreSpan) player1ScoreSpan.textContent = `(总分: ${userData.total_score || 0})`;
        } else {
            showMessage("身份验证失败，请重新登录。", "error"); // 更明确的错误
            setTimeout(() => window.location.href = 'login.html', 2000);
            return false;
        }

        const params = new URLSearchParams(window.location.search);
        currentTableId = params.get('table') || localStorage.getItem('activeGameTableId');
        currentRoundId = params.get('round') || localStorage.getItem('activeGameRoundId');

        if (!currentTableId || !currentRoundId) {
            showMessage("无效的游戏链接或未找到进行中的游戏信息，将返回大厅。", "error");
            setTimeout(() => window.location.href = 'lobby.html', 3000);
            return false;
        }
        localStorage.setItem('activeGameTableId', currentTableId);
        localStorage.setItem('activeGameRoundId', currentRoundId);
        console.log(`Game page loaded for Table ID: ${currentTableId}, Round ID: ${currentRoundId}`);
        return true;
    }
    
    // ... (handleSuggestArrangementForGame, handleSubmitArrangementForGame 与上一版本相同)

    function updateGameScreenWithState(gameStateData) {
        // ... (与上一版本相同，确保在开始时或关键步骤更新消息)
        localGameData = gameStateData; 
        if (!gameStateData || !gameStateData.table_status) {
            // 如果是初始加载，这个错误可能导致 "正在连接游戏" 消息停留
            showMessage("获取游戏状态异常或数据不完整。", "error");
            // 可以考虑是否停止轮询或做其他处理
            return;
        }
        
        // 只有当游戏状态明确后，才更新主消息，避免覆盖 "正在连接..."
        if (gameStateData.table_status === 'waiting') {
            showMessage("等待其他玩家准备...", "info");
        } else if (gameStateData.table_status === 'playing') {
            const myPlayerData = gameStateData.players.find(p => p.user_id == currentPlayerId);
            if (myPlayerData && !myPlayerData.has_submitted_this_round) {
                showMessage("轮到您摆牌。", "info");
            } else if (myPlayerData && myPlayerData.has_submitted_this_round) {
                showMessage("您已提交，等待其他玩家...", "info");
            } else {
                showMessage("游戏中...", "info"); // 通用游戏进行中消息
            }
        } else if (gameStateData.table_status === 'finished' && gameStateData.round_results) {
            // 结果显示时，showMessage 会被 displayRoundResultsAndUpdateScores 中的消息覆盖
        }


        // ... (其余UI更新逻辑与上一版本相同) ...
    }
    
    async function pollGameTableState() {
        // ... (与上一版本相同)
    }

    // --- Initial Setup for Game Page ---
    async function initializeGamePage() {
        resetGameScreenUI(); // 重置UI，但保留初始的 "正在连接游戏..." 消息
        showMessage("正在加载并验证游戏信息...", "info"); // 可以稍微改动一下初始消息

        const canLoadGame = await loadCurrentGameAndPlayerInfo();
        if (canLoadGame) {
            showMessage("正在获取当前牌局状态...", "info"); // 在 loadCurrentGameAndPlayerInfo 成功后再更新一次消息
            
            const initialData = await fetchGameApi(`getGameState&tableId=${currentTableId}&roundId=${currentRoundId}`, 'GET');
            
            if (initialData && initialData.success && initialData.gameState) {
                updateGameScreenWithState(initialData.gameState); // 这个函数会根据状态设置合适的消息
                // 根据游戏状态决定是否开始轮询
                if (initialData.gameState.table_status === 'playing') {
                     const myPlayerData = initialData.gameState.players.find(p => p.user_id == currentPlayerId);
                     if (myPlayerData && !myPlayerData.has_submitted_this_round) { // 我还没提交
                        pollGameTableState();
                     } else if (myPlayerData && myPlayerData.has_submitted_this_round && initialData.gameState.players.some(p => p.user_id != currentPlayerId && !p.has_submitted_this_round)) { // 我提交了，但有别人没提交
                        pollGameTableState();
                     }
                     // 如果游戏已结束，或者我提交了且所有人都提交了，则 updateGameScreenWithState 会处理，不需要轮询
                } else if (initialData.gameState.table_status === 'waiting') {
                    pollGameTableState(); // 等待状态也需要轮询，看其他人是否准备或游戏是否开始
                }
            } else {
                // fetchGameApi 内部会调用 showMessage 显示错误
                if (!initialData?.redirectToLogin) { // 如果不是因为重定向到登录
                    showMessage(initialData?.message || "无法加载初始游戏状态，请返回大厅重试。", "error");
                    setTimeout(() => window.location.href = 'lobby.html', 3000);
                }
            }
        }
        // else: loadCurrentGameAndPlayerInfo 内部已经处理了跳转和消息

        // 隐藏或改变不再直接使用的旧控制按钮功能
        if(startGameBtn) startGameBtn.style.display = 'none';
        if(resetGameBtn) resetGameBtn.style.display = 'none'; 
        if(playAgainBtn) { 
             playAgainBtn.textContent = "返回大厅";
             playAgainBtn.onclick = () => { 
                 localStorage.removeItem('activeGameTableId'); 
                 localStorage.removeItem('activeGameRoundId'); 
                 window.location.href = 'lobby.html'; 
             };
        }
    }

    // 确保只在游戏主页(index.html)执行初始化逻辑
    if (document.getElementById('player1Hand') && document.getElementById('opponentAreasContainer')) { 
        // 初始消息设置
        showMessage("正在连接游戏...", "info");

        // 确保 auth.js 的 checkUserAuthentication 方法存在且已经执行完毕
        // auth.js 应该在全局暴露一个 Promise 或者一个状态来表明其初始化完成
        if (typeof window.checkUserAuthentication === 'function') {
            window.checkUserAuthentication().then(authData => {
                if (authData && authData.isAuthenticated) {
                    initializeGamePage();
                } else if (!localStorage.getItem('userData')) { 
                    showMessage("请先登录以进行游戏。", "error");
                    setTimeout(() => window.location.href = 'login.html', 2000);
                } else { // userData存在但checkAuth返回未认证，可能是session问题
                     showMessage("身份验证信息已过期，请重新登录。", "error");
                     localStorage.removeItem('userData'); // 清除过期的本地数据
                     setTimeout(() => window.location.href = 'login.html', 2000);
                }
            }).catch(err => {
                console.error("Auth check promise failed on game page:", err);
                showMessage("身份验证过程出错，请尝试刷新或重新登录。", "error");
                 // setTimeout(() => window.location.href = 'login.html', 3000);
            });
        } else {
            // 如果 auth.js 或其方法还未准备好，可以稍作等待或提示错误
            console.error("auth.js or checkUserAuthentication function not ready.");
            showMessage("页面初始化错误，请刷新重试。", "error");
        }
        
        if(submitArrangementBtn) submitArrangementBtn.addEventListener('click', handleSubmitArrangementForGame);
        if(suggestArrangementBtn) suggestArrangementBtn.addEventListener('click', handleSuggestArrangementForGame);
    } else {
        // 如果不是游戏主界面，则不执行游戏初始化逻辑
        console.log("Not on the main game page (index.html with expected elements). Game script initialization skipped.");
    }
});
