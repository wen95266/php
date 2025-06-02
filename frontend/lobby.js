// frontend/lobby.js
document.addEventListener('DOMContentLoaded', async () => {
    // --- MODIFICATION: Point to your Serv00 backend URLs ---
    const API_LOBBY_URL = 'https://wenge.cloudns.ch/backend/api/lobby.php';
    const API_GAME_URL = 'https://wenge.cloudns.ch/backend/api/game.php'; 
    // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // IMPORTANT: Ensure these are YOUR correct Serv00 backend URLs

    const lobbyMessagesDiv = document.getElementById('lobbyMessages');
    const createTableBtn = document.getElementById('createTableBtn');
    const joinTableCodeInput = document.getElementById('joinTableCodeInput');
    const joinTableBtn = document.getElementById('joinTableBtn');
    const tablesListDiv = document.getElementById('tablesList');
    const refreshTablesBtn = document.getElementById('refreshTablesBtn');
    const leaderboardListDiv = document.getElementById('leaderboardList');
    const gameHistoryListDiv = document.getElementById('gameHistoryList');
    const currentTableInfoDiv = document.getElementById('currentTableInfo');
    const currentTableCodeSpan = document.getElementById('currentTableCode');
    const currentTableHostSpan = document.getElementById('currentTableHost');
    const currentTableStatusSpan = document.getElementById('currentTableStatus');
    const currentTablePlayersDiv = document.getElementById('currentTablePlayers');
    const playerReadyBtn = document.getElementById('playerReadyBtn');
    const startGameOnTableBtn = document.getElementById('startGameOnTableBtn');
    const leaveTableBtn = document.getElementById('leaveTableBtn');
    const gameInterfaceLinkDiv = document.getElementById('gameInterfaceLink');
    const goToGameBtn = document.getElementById('goToGameBtn');

    let currentTableId = localStorage.getItem('currentTableId');
    let currentTableData = null;
    let pollTableStateInterval = null;
    let localPlayerIsReady = false;

    // --- MODIFICATION: Ensure all fetch calls use credentials: 'include' ---
    async function fetchLobbyApi(action, method = 'GET', bodyParams = null) {
        const options = { 
            method: method, 
            credentials: 'include' // <<< ADDED/ENSURED
        };
        let url = `${API_LOBBY_URL}?action=${action}`;

        if (method === 'POST' && bodyParams) {
            const formData = new FormData();
            for (const key in bodyParams) {
                formData.append(key, bodyParams[key]);
            }
            options.body = formData;
        } else if (method === 'GET' && bodyParams) {
            url += '&' + new URLSearchParams(bodyParams).toString();
        }
        
        try {
            const response = await fetch(url, options);
            const data = await response.json();
            if (data.redirectToLogin) {
                showLobbyMessage('会话已过期或未登录，请重新登录。', 'error');
                localStorage.removeItem('userData'); localStorage.removeItem('currentTableId');
                window.updateUserInfoDisplay?.(); 
                setTimeout(() => window.location.href = 'login.html', 2000);
                return null; 
            }
            return data;
        } catch (error) {
            console.error("Lobby API call failed:", action, error);
            const contentType = error.response?.headers?.get("content-type"); // Check if error object has response
            if (contentType && contentType.indexOf("application/json") === -1) {
                 const errorText = await error.response?.text() || "未知错误文本";
                 console.error("Lobby API non-JSON error response:", errorText.substring(0,500));
                 showLobbyMessage(`大厅请求失败: 服务器响应格式错误。`, 'error');
            } else {
                showLobbyMessage(`大厅请求失败: ${error.message}`, 'error');
            }
            return { success: false, message: `大厅请求失败: ${error.message}` };
        }
    }

    // ... (showLobbyMessage, loadTablesList, handleCreateTable, handleJoinTable, updateCurrentTableUI, loadCurrentTableState, startPollingTableState, stopPollingTableState, _getCurrentUser, loadLeaderboard, loadGameHistory 与上一版本类似，但内部的fetch已经通过fetchLobbyApi处理)
    function showLobbyMessage(message, type = 'error') { if (lobbyMessagesDiv) { lobbyMessagesDiv.textContent = message; lobbyMessagesDiv.className = `messages-placeholder ${type}`;}}
    async function loadTablesList() { tablesListDiv.innerHTML = '<p>正在加载桌子列表...</p>'; const data = await fetchLobbyApi('getTables'); if (data && data.success && data.tables) { if (data.tables.length === 0) { tablesListDiv.innerHTML = '<p>当前没有等待中的桌子。</p>'; } else { tablesListDiv.innerHTML = '<ul>' + data.tables.map(table => `<li>桌号: <strong>${table.table_code}</strong> (房主: ${table.host_nickname}) - ${table.current_player_count}/${table.max_players}人 <button class="join-table-list-btn small-btn" data-table-code="${table.table_code}">加入</button></li>`).join('') + '</ul>'; tablesListDiv.querySelectorAll('.join-table-list-btn').forEach(btn => { btn.addEventListener('click', async (e) => { joinTableCodeInput.value = e.target.dataset.tableCode; await handleJoinTable(); });});}} else { tablesListDiv.innerHTML = `<p>${data ? data.message : '加载桌子列表失败。'}</p>`;}}
    async function handleCreateTable() { createTableBtn.disabled = true; const data = await fetchLobbyApi('createTable', 'POST'); createTableBtn.disabled = false; if (data && data.success) { showLobbyMessage(`桌子 ${data.tableCode} 创建成功！`, 'success'); localStorage.setItem('currentTableId', data.tableId); currentTableId = data.tableId; loadCurrentTableState(); loadTablesList();} else if (data) { showLobbyMessage(data.message, 'error');}}
    async function handleJoinTable() { const tableCode = joinTableCodeInput.value.trim(); if (!tableCode) { showLobbyMessage('请输入桌子码。', 'error'); return;} joinTableBtn.disabled = true; const data = await fetchLobbyApi('joinTable', 'POST', { tableCode: tableCode }); joinTableBtn.disabled = false; if (data && data.success) { showLobbyMessage(`成功加入桌子 ${data.tableCode || tableCode}!`, 'success'); localStorage.setItem('currentTableId', data.tableId); currentTableId = data.tableId; loadCurrentTableState();} else if (data) { showLobbyMessage(data.message, 'error');}}
    function updateCurrentTableUI(tableState) { /* ... (与上一版本完全相同) ... */ currentTableData = tableState; if (!tableState) { currentTableInfoDiv.style.display = 'none'; return;} currentTableInfoDiv.style.display = 'block'; currentTableCodeSpan.textContent = tableState.table_code; currentTableHostSpan.textContent = tableState.host_nickname; currentTableStatusSpan.textContent = tableState.status === 'waiting' ? '等待中' : tableState.status === 'playing' ? '游戏中' : '已结束'; currentTablePlayersDiv.innerHTML = '<h4>玩家列表:</h4><ul>' + tableState.players.map(p => { let readyStatus = p.is_ready ? '(已准备)' : '(未准备)'; if (tableState.status === 'playing') { readyStatus = p.has_submitted_this_round ? '(已出牌)' : '(思考中)';} return `<li>${p.nickname} ${p.user_id == (_getCurrentUser()?.id) ? '(你)' : ''} - ${readyStatus}</li>`;}).join('') + '</ul>'; const currentUserData = _getCurrentUser(); const amIInThisTable = currentUserData && tableState.players.some(p => p.user_id == currentUserData.id); const amIHost = currentUserData && tableState.host_user_id == currentUserData.id; const myPlayerData = amIInThisTable ? tableState.players.find(p => p.user_id == currentUserData.id) : null; if (amIInThisTable && tableState.status === 'waiting') { playerReadyBtn.style.display = 'inline-block'; playerReadyBtn.textContent = myPlayerData?.is_ready ? '取消准备' : '准备'; localPlayerIsReady = myPlayerData?.is_ready || false; if (amIHost) { const allPlayersReady = tableState.players.length === tableState.max_players && tableState.players.every(p => p.is_ready); startGameOnTableBtn.style.display = allPlayersReady ? 'inline-block' : 'none';} else { startGameOnTableBtn.style.display = 'none';} leaveTableBtn.style.display = 'inline-block'; gameInterfaceLinkDiv.style.display = 'none';} else if (amIInThisTable && tableState.status === 'playing') { playerReadyBtn.style.display = 'none'; startGameOnTableBtn.style.display = 'none'; leaveTableBtn.style.display = 'none'; gameInterfaceLinkDiv.style.display = 'block'; goToGameBtn.dataset.tableId = tableState.id; goToGameBtn.dataset.roundId = tableState.current_round_id;} else if (amIInThisTable && tableState.status === 'finished') { playerReadyBtn.style.display = 'inline-block'; playerReadyBtn.textContent = '准备开始新一局'; if (amIHost) startGameOnTableBtn.style.display = 'inline-block'; else startGameOnTableBtn.style.display = 'none'; leaveTableBtn.style.display = 'inline-block'; gameInterfaceLinkDiv.style.display = 'none'; } else { currentTableInfoDiv.style.display = 'none'; localStorage.removeItem('currentTableId'); currentTableId = null;}}
    async function loadCurrentTableState() { if (!currentTableId) { updateCurrentTableUI(null); stopPollingTableState(); return;} const data = await fetchLobbyApi('getTableState', 'GET', { tableId: currentTableId }); if (data && data.success && data.tableState) { updateCurrentTableUI(data.tableState); if (data.tableState.status === 'playing' || data.tableState.status === 'waiting') { startPollingTableState();} else { stopPollingTableState();}} else { showLobbyMessage(data ? data.message : '加载当前桌子状态失败。', 'error'); localStorage.removeItem('currentTableId'); currentTableId = null; updateCurrentTableUI(null); stopPollingTableState();}}
    function startPollingTableState() { if (pollTableStateInterval) clearInterval(pollTableStateInterval); if (currentTableId) { pollTableStateInterval = setInterval(loadCurrentTableState, 3000); }}
    function stopPollingTableState() { if (pollTableStateInterval) clearInterval(pollTableStateInterval); pollTableStateInterval = null;}
    function _getCurrentUser() { const userDataString = localStorage.getItem('userData'); return userDataString ? JSON.parse(userDataString) : null;}
    async function loadLeaderboard() { /* ... (与上一版本相同，内部已用fetchLobbyApi) ... */ if (!leaderboardListDiv) return; leaderboardListDiv.innerHTML = '<p>正在加载排行榜...</p>'; const data = await fetchLobbyApi('getLeaderboard', 'GET', { limit: 10 }); if (data && data.success && data.leaderboard) { if (data.leaderboard.length === 0) { leaderboardListDiv.innerHTML = '<p>排行榜暂无数据。</p>';} else { let rank = 1; leaderboardListDiv.innerHTML = '<table><thead><tr><th>排名</th><th>昵称</th><th>总积分</th><th>总局数</th><th>胜场</th></tr></thead><tbody>' + data.leaderboard.map(player => `<tr><td>${rank++}</td><td>${player.nickname}</td><td>${player.total_score}</td><td>${player.games_played}</td><td>${player.games_won}</td></tr>`).join('') + '</tbody></table>';}} else { leaderboardListDiv.innerHTML = `<p>${data ? data.message : '加载排行榜失败。'}</p>`;}}
    async function loadGameHistory() { /* ... (与上一版本相同，内部已用fetchLobbyApi) ... */  if (!gameHistoryListDiv) return; const currentUser = _getCurrentUser(); if (!currentUser) { gameHistoryListDiv.innerHTML = '<p>请先登录查看游戏历史。</p>'; return;} gameHistoryListDiv.innerHTML = '<p>正在加载游戏历史...</p>'; const data = await fetchLobbyApi('getGameHistory', 'GET', { limit: 10 }); if (data && data.success && data.history) { if (data.history.length === 0) { gameHistoryListDiv.innerHTML = '<p>暂无游戏历史记录。</p>';} else { gameHistoryListDiv.innerHTML = '<ul>' + data.history.map(game => { let resultText = game.my_score_change > 0 ? `<span class="score-win">+${game.my_score_change}</span>` : game.my_score_change < 0 ? `<span class="score-lose">${game.my_score_change}</span>` : `<span>${game.my_score_change}</span>`; let specialText = game.my_special_hand_name ? ` (${game.my_special_hand_name})` : ''; let opponents = game.opponents_nicknames || '未知对手'; let opponentScores = game.opponents_score_changes || 'N/A'; return `<li><strong>桌号 ${game.table_code}</strong> - ${new Date(game.end_time).toLocaleString()}<br>对手: ${opponents} (得分: ${opponentScores})<br>我的得分: ${resultText}${specialText}</li>`;}).join('') + '</ul>';}} else { gameHistoryListDiv.innerHTML = `<p>${data ? data.message : '加载游戏历史失败。'}</p>`;}}
    
    // 修改 startGameOnTableBtn 的事件处理器中的 fetch
    if (startGameOnTableBtn) {
        startGameOnTableBtn.addEventListener('click', async () => {
            if (!currentTableId || !currentTableData) return;
            const allPlayersReady = currentTableData.players.length === currentTableData.max_players && currentTableData.players.every(p => p.is_ready);
            if (!allPlayersReady) {
                showLobbyMessage('尚有玩家未准备或人数不足。', 'error');
                return;
            }
            startGameOnTableBtn.disabled = true;
            // --- MODIFICATION: Use API_GAME_URL and credentials ---
            const gameApiData = await fetch(`${API_GAME_URL}?action=startGameForTable`, { // API_GAME_URL 已是完整URL
                method: 'POST',
                credentials: 'include', // <<< ADDED/ENSURED
                body: new URLSearchParams({tableId: currentTableId}) // POST body
            }).then(res => res.json())
              .catch(err => { // Catch fetch or .json() errors
                console.error("startGameForTable API call failed:", err);
                showLobbyMessage(`开始游戏请求失败: ${err.message}`, 'error');
                return { success: false, message: `开始游戏请求失败: ${err.message}` };
              });
            startGameOnTableBtn.disabled = false;

            if (gameApiData && gameApiData.success) {
                showLobbyMessage(gameApiData.message, 'success');
                localStorage.setItem('currentRoundId', gameApiData.roundId);
                loadCurrentTableState(); 
            } else if (gameApiData) { // gameApiData might exist even if success is false
                showLobbyMessage(gameApiData.message || '开始游戏失败 (未知错误)', 'error');
            }
        });
    }

    // 初始化
    if (typeof window.checkUserAuthentication === 'function') {
        window.checkUserAuthentication().then(authData => {
            if (authData && authData.isAuthenticated) {
                loadGameHistory(); // 只有登录用户才加载历史
            } else {
                if (gameHistoryListDiv) gameHistoryListDiv.innerHTML = '<p>登录后可查看游戏历史。</p>';
            }
            // 确保用户信息显示已更新
            if (typeof window.updateUserInfoDisplay === 'function') window.updateUserInfoDisplay();

            // 无论是否登录，都加载公共信息
            loadTablesList();
            loadLeaderboard();
            currentTableId = localStorage.getItem('currentTableId');
            if (currentTableId) {
                loadCurrentTableState();
            } else {
                updateCurrentTableUI(null);
            }
        });
    } else { // Fallback if auth.js hasn't loaded checkUserAuthentication yet
        loadTablesList();
        loadLeaderboard();
         if (gameHistoryListDiv) gameHistoryListDiv.innerHTML = '<p>请先登录以查看游戏历史。</p>';
    }
    if (createTableBtn) createTableBtn.addEventListener('click', handleCreateTable);
    if (joinTableBtn) joinTableBtn.addEventListener('click', handleJoinTable);
    if (refreshTablesBtn) refreshTablesBtn.addEventListener('click', loadTablesList);
    if (playerReadyBtn) { playerReadyBtn.addEventListener('click', async () => { if (!currentTableId) return; playerReadyBtn.disabled = true; localPlayerIsReady = !localPlayerIsReady; const data = await fetchLobbyApi('playerReady', 'POST', { tableId: currentTableId, isReady: localPlayerIsReady }); playerReadyBtn.disabled = false; if (data && data.success) { showLobbyMessage(data.message, 'success'); loadCurrentTableState(); } else if (data) { showLobbyMessage(data.message, 'error'); localPlayerIsReady = !localPlayerIsReady; }});}
    if (leaveTableBtn) { leaveTableBtn.addEventListener('click', async () => { if (!currentTableId || !confirm("确定要离开当前桌子吗？")) return; leaveTableBtn.disabled = true; const data = await fetchLobbyApi('leaveTable', 'POST', {tableId: currentTableId}); leaveTableBtn.disabled = false; if (data && data.success) { showLobbyMessage(data.message, 'success'); localStorage.removeItem('currentTableId'); currentTableId = null; updateCurrentTableUI(null); stopPollingTableState(); loadTablesList(); } else if (data) { showLobbyMessage(data.message, 'error'); }}); }
    if (goToGameBtn) { goToGameBtn.addEventListener('click', (e) => { e.preventDefault(); const tableId = e.target.dataset.tableId; const roundId = e.target.dataset.roundId; if (tableId && roundId) { localStorage.setItem('activeGameTableId', tableId); localStorage.setItem('activeGameRoundId', roundId); window.location.href = `index.html?table=${tableId}&round=${roundId}`; }}); }
});
