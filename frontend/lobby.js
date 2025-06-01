// frontend/lobby.js
document.addEventListener('DOMContentLoaded', async () => {
    // ... (所有已有的变量和函数声明)
    const leaderboardListDiv = document.getElementById('leaderboardList');
    const gameHistoryListDiv = document.getElementById('gameHistoryList');
    const userInfoLobbyDiv = document.getElementById('userInfoLobby'); // 用于更新胜率等

    // ... (已有的 fetchLobbyApi, showLobbyMessage, etc.)
    // ... (已有的 handleCreateTable, handleJoinTable, updateCurrentTableUI, loadCurrentTableState, etc.)
    async function fetchLobbyApi(action, method = 'GET', bodyParams = null) { /* ... */ 
        const options = { method: method, credentials: 'include' }; let url = `${API_LOBBY_URL}?action=${action}`;
        if (method === 'POST' && bodyParams) { const formData = new FormData(); for (const key in bodyParams) { formData.append(key, bodyParams[key]); } options.body = formData; } 
        else if (method === 'GET' && bodyParams) { url += '&' + new URLSearchParams(bodyParams).toString(); }
        try {
            const response = await fetch(url, options); const data = await response.json();
            if (data.redirectToLogin) { showLobbyMessage('会话已过期或未登录，请重新登录。', 'error'); localStorage.removeItem('userData'); localStorage.removeItem('currentTableId'); window.updateUserInfoDisplay?.(); setTimeout(() => window.location.href = 'login.html', 2000); return null; }
            return data;
        } catch (error) { console.error("Lobby API call failed:", action, error); showLobbyMessage(`大厅请求失败: ${error.message}`, 'error'); return { success: false, message: `大厅请求失败: ${error.message}` };}
    }
    function showLobbyMessage(message, type = 'error') { /* ... */ if (lobbyMessagesDiv) { lobbyMessagesDiv.textContent = message; lobbyMessagesDiv.className = `messages-placeholder ${type}`;}}
    async function loadTablesList() { /* ... (与上一版本相同) ... */
        tablesListDiv.innerHTML = '<p>正在加载桌子列表...</p>'; const data = await fetchLobbyApi('getTables');
        if (data && data.success && data.tables) {
            if (data.tables.length === 0) { tablesListDiv.innerHTML = '<p>当前没有等待中的桌子。</p>'; } 
            else {
                tablesListDiv.innerHTML = '<ul>' + data.tables.map(table => `<li>桌号: <strong>${table.table_code}</strong> (房主: ${table.host_nickname}) - ${table.current_player_count}/${table.max_players}人 <button class="join-table-list-btn small-btn" data-table-code="${table.table_code}">加入</button></li>`).join('') + '</ul>';
                tablesListDiv.querySelectorAll('.join-table-list-btn').forEach(btn => { btn.addEventListener('click', async (e) => { joinTableCodeInput.value = e.target.dataset.tableCode; await handleJoinTable(); });});
            }
        } else { tablesListDiv.innerHTML = `<p>${data ? data.message : '加载桌子列表失败。'}</p>`;}
    }
    async function handleCreateTable() { /* ... (与上一版本相同) ... */
        createTableBtn.disabled = true; const data = await fetchLobbyApi('createTable', 'POST'); createTableBtn.disabled = false;
        if (data && data.success) { showLobbyMessage(`桌子 ${data.tableCode} 创建成功！`, 'success'); localStorage.setItem('currentTableId', data.tableId); currentTableId = data.tableId; loadCurrentTableState(); loadTablesList();} 
        else if (data) { showLobbyMessage(data.message, 'error');}
    }
    async function handleJoinTable() { /* ... (与上一版本相同) ... */
        const tableCode = joinTableCodeInput.value.trim(); if (!tableCode) { showLobbyMessage('请输入桌子码。', 'error'); return;}
        joinTableBtn.disabled = true; const data = await fetchLobbyApi('joinTable', 'POST', { tableCode: tableCode }); joinTableBtn.disabled = false;
        if (data && data.success) { showLobbyMessage(`成功加入桌子 ${data.tableCode || tableCode}!`, 'success'); localStorage.setItem('currentTableId', data.tableId); currentTableId = data.tableId; loadCurrentTableState();} 
        else if (data) { showLobbyMessage(data.message, 'error');}
    }
    function updateCurrentTableUI(tableState) { /* ... (与上一版本相同) ... */
        currentTableData = tableState; 
        if (!tableState) { currentTableInfoDiv.style.display = 'none'; return;}
        currentTableInfoDiv.style.display = 'block'; currentTableCodeSpan.textContent = tableState.table_code; currentTableHostSpan.textContent = tableState.host_nickname;
        currentTableStatusSpan.textContent = tableState.status === 'waiting' ? '等待中' : tableState.status === 'playing' ? '游戏中' : '已结束';
        currentTablePlayersDiv.innerHTML = '<h4>玩家列表:</h4><ul>' + tableState.players.map(p => { let readyStatus = p.is_ready ? '(已准备)' : '(未准备)'; if (tableState.status === 'playing') { readyStatus = p.has_submitted_this_round ? '(已出牌)' : '(思考中)';} return `<li>${p.nickname} ${p.user_id == (_getCurrentUser()?.id) ? '(你)' : ''} - ${readyStatus}</li>`;}).join('') + '</ul>';
        const currentUserData = _getCurrentUser(); const amIInThisTable = currentUserData && tableState.players.some(p => p.user_id == currentUserData.id); const amIHost = currentUserData && tableState.host_user_id == currentUserData.id; const myPlayerData = amIInThisTable ? tableState.players.find(p => p.user_id == currentUserData.id) : null;
        if (amIInThisTable && tableState.status === 'waiting') {
            playerReadyBtn.style.display = 'inline-block'; playerReadyBtn.textContent = myPlayerData?.is_ready ? '取消准备' : '准备'; localPlayerIsReady = myPlayerData?.is_ready || false; 
            if (amIHost) { const allPlayersReady = tableState.players.length === tableState.max_players && tableState.players.every(p => p.is_ready); startGameOnTableBtn.style.display = allPlayersReady ? 'inline-block' : 'none';} else { startGameOnTableBtn.style.display = 'none';}
            leaveTableBtn.style.display = 'inline-block'; gameInterfaceLinkDiv.style.display = 'none';
        } else if (amIInThisTable && tableState.status === 'playing') {
            playerReadyBtn.style.display = 'none'; startGameOnTableBtn.style.display = 'none'; leaveTableBtn.style.display = 'none'; 
            gameInterfaceLinkDiv.style.display = 'block'; goToGameBtn.dataset.tableId = tableState.id; goToGameBtn.dataset.roundId = tableState.current_round_id;
        } else if (amIInThisTable && tableState.status === 'finished') {
            playerReadyBtn.style.display = 'inline-block'; playerReadyBtn.textContent = '准备开始新一局'; // 允许准备下一局
            if (amIHost) startGameOnTableBtn.style.display = 'inline-block'; else startGameOnTableBtn.style.display = 'none';
            leaveTableBtn.style.display = 'inline-block'; gameInterfaceLinkDiv.style.display = 'none'; 
        } else { currentTableInfoDiv.style.display = 'none'; localStorage.removeItem('currentTableId'); currentTableId = null;}
    }
     async function loadCurrentTableState() { /* ... (与上一版本相同) ... */
        if (!currentTableId) { updateCurrentTableUI(null); stopPollingTableState(); return;}
        const data = await fetchLobbyApi('getTableState', 'GET', { tableId: currentTableId });
        if (data && data.success && data.tableState) {
            updateCurrentTableUI(data.tableState);
            if (data.tableState.status === 'playing' || data.tableState.status === 'waiting') { startPollingTableState();} 
            else { stopPollingTableState();}
        } else { showLobbyMessage(data ? data.message : '加载当前桌子状态失败。', 'error'); localStorage.removeItem('currentTableId'); currentTableId = null; updateCurrentTableUI(null); stopPollingTableState();}
    }
    function startPollingTableState() { /* ... */ if (pollTableStateInterval) clearInterval(pollTableStateInterval); if (currentTableId) { pollTableStateInterval = setInterval(loadCurrentTableState, 3000); }}
    function stopPollingTableState() { /* ... */ if (pollTableStateInterval) clearInterval(pollTableStateInterval); pollTableStateInterval = null;}
    function _getCurrentUser() { /* ... */ const userDataString = localStorage.getItem('userData'); return userDataString ? JSON.parse(userDataString) : null;}


    async function loadLeaderboard() {
        if (!leaderboardListDiv) return;
        leaderboardListDiv.innerHTML = '<p>正在加载排行榜...</p>';
        const data = await fetchLobbyApi('getLeaderboard', 'GET', { limit: 10 });
        if (data && data.success && data.leaderboard) {
            if (data.leaderboard.length === 0) {
                leaderboardListDiv.innerHTML = '<p>排行榜暂无数据。</p>';
            } else {
                let rank = 1;
                leaderboardListDiv.innerHTML = '<table><thead><tr><th>排名</th><th>昵称</th><th>总积分</th><th>总局数</th><th>胜场</th></tr></thead><tbody>' + 
                data.leaderboard.map(player => 
                    `<tr>
                        <td>${rank++}</td>
                        <td>${player.nickname}</td>
                        <td>${player.total_score}</td>
                        <td>${player.games_played}</td>
                        <td>${player.games_won}</td>
                    </tr>`
                ).join('') + '</tbody></table>';
            }
        } else {
            leaderboardListDiv.innerHTML = `<p>${data ? data.message : '加载排行榜失败。'}</p>`;
        }
    }

    async function loadGameHistory() {
        if (!gameHistoryListDiv) return;
        const currentUser = _getCurrentUser();
        if (!currentUser) {
            gameHistoryListDiv.innerHTML = '<p>请先登录查看游戏历史。</p>';
            return;
        }
        gameHistoryListDiv.innerHTML = '<p>正在加载游戏历史...</p>';
        const data = await fetchLobbyApi('getGameHistory', 'GET', { limit: 10 }); // userId由后端session获取

        if (data && data.success && data.history) {
            if (data.history.length === 0) {
                gameHistoryListDiv.innerHTML = '<p>暂无游戏历史记录。</p>';
            } else {
                gameHistoryListDiv.innerHTML = '<ul>' + 
                data.history.map(game => {
                    let resultText = game.my_score_change > 0 ? `<span class="score-win">+${game.my_score_change}</span>` : 
                                     game.my_score_change < 0 ? `<span class="score-lose">${game.my_score_change}</span>` : 
                                     `<span>${game.my_score_change}</span>`;
                    let specialText = game.my_special_hand_name ? ` (${game.my_special_hand_name})` : '';
                    let opponents = game.opponents_nicknames || '未知对手';
                    let opponentScores = game.opponents_score_changes || 'N/A';

                    return `<li>
                                <strong>桌号 ${game.table_code}</strong> - ${new Date(game.end_time).toLocaleString()}
                                <br>对手: ${opponents} (得分: ${opponentScores})
                                <br>我的得分: ${resultText}${specialText}
                            </li>`;
                }).join('') + '</ul>';
            }
        } else {
            gameHistoryListDiv.innerHTML = `<p>${data ? data.message : '加载游戏历史失败。'}</p>`;
        }
    }
    
    // 更新用户信息的显示，加入胜率等
    window.updateUserInfoDisplay = function() { // 覆盖 auth.js 中的，或确保 auth.js 先定义
        const userData = JSON.parse(localStorage.getItem('userData'));
        const elementsToUpdate = [
            {infoDiv: userInfoLobbyDiv, logoutBtn: document.getElementById('logoutBtnLobby')},
            {infoDiv: document.getElementById('userInfo'), logoutBtn: document.getElementById('logoutBtnIndex')} // 假设主页也有
        ];

        elementsToUpdate.forEach(group => {
            if (group.infoDiv) {
                if (userData && userData.nickname) {
                    let gamesPlayed = parseInt(userData.games_played) || 0;
                    let gamesWon = parseInt(userData.games_won) || 0;
                    let winRate = gamesPlayed > 0 ? ((gamesWon / gamesPlayed) * 100).toFixed(1) + '%' : 'N/A';
                    group.infoDiv.innerHTML = `欢迎, <strong>${userData.nickname}</strong> (总分: ${userData.total_score || 0}) 
                                               <small>[局数:${gamesPlayed} 胜:${gamesWon} 胜率:${winRate}]</small> `;
                    if (group.logoutBtn) {
                         group.infoDiv.appendChild(group.logoutBtn); 
                         group.logoutBtn.style.display = 'inline-block';
                    }
                } else {
                    group.infoDiv.innerHTML = `<a href="login.html">登录</a> | <a href="register.html">注册</a>`;
                    if (group.logoutBtn) group.logoutBtn.style.display = 'none';
                }
            }
        });
    };


    // 初始化
    if (createTableBtn) createTableBtn.addEventListener('click', handleCreateTable);
    // ... (其他按钮事件绑定与上一版本相同)
    if (joinTableBtn) joinTableBtn.addEventListener('click', handleJoinTable);
    if (refreshTablesBtn) refreshTablesBtn.addEventListener('click', loadTablesList);
    if (playerReadyBtn) { playerReadyBtn.addEventListener('click', async () => { /* ... (同上) ... */ if (!currentTableId) return; playerReadyBtn.disabled = true; localPlayerIsReady = !localPlayerIsReady; const data = await fetchLobbyApi('playerReady', 'POST', { tableId: currentTableId, isReady: localPlayerIsReady }); playerReadyBtn.disabled = false; if (data && data.success) { showLobbyMessage(data.message, 'success'); loadCurrentTableState(); } else if (data) { showLobbyMessage(data.message, 'error'); localPlayerIsReady = !localPlayerIsReady; }});}
    if (startGameOnTableBtn) { startGameOnTableBtn.addEventListener('click', async () => { /* ... (同上) ... */ if (!currentTableId || !currentTableData) return; const allPlayersReady = currentTableData.players.length === currentTableData.max_players && currentTableData.players.every(p => p.is_ready); if (!allPlayersReady) { showLobbyMessage('尚有玩家未准备或人数不足。', 'error'); return;} startGameOnTableBtn.disabled = true; const gameApiData = await fetch(`${API_GAME_URL}?action=startGameForTable`, { method: 'POST', credentials: 'include', body: new URLSearchParams({tableId: currentTableId})}).then(res => res.json()); startGameOnTableBtn.disabled = false; if (gameApiData && gameApiData.success) { showLobbyMessage(gameApiData.message, 'success'); localStorage.setItem('currentRoundId', gameApiData.roundId); loadCurrentTableState(); } else if (gameApiData) { showLobbyMessage(gameApiData.message, 'error');}}); }
    if (leaveTableBtn) { leaveTableBtn.addEventListener('click', async () => { /* ... (同上) ... */ if (!currentTableId || !confirm("确定要离开当前桌子吗？")) return; leaveTableBtn.disabled = true; const data = await fetchLobbyApi('leaveTable', 'POST', {tableId: currentTableId}); leaveTableBtn.disabled = false; if (data && data.success) { showLobbyMessage(data.message, 'success'); localStorage.removeItem('currentTableId'); currentTableId = null; updateCurrentTableUI(null); stopPollingTableState(); loadTablesList(); } else if (data) { showLobbyMessage(data.message, 'error'); }}); }
    if (goToGameBtn) { goToGameBtn.addEventListener('click', (e) => { /* ... (同上) ... */ e.preventDefault(); const tableId = e.target.dataset.tableId; const roundId = e.target.dataset.roundId; if (tableId && roundId) { localStorage.setItem('activeGameTableId', tableId); localStorage.setItem('activeGameRoundId', roundId); window.location.href = `index.html?table=${tableId}&round=${roundId}`; }}); }

    // 页面加载时执行
    const authDataCheck = await window.checkUserAuthentication(); // 确保用户信息已加载
    loadTablesList();
    loadLeaderboard();
    if (authDataCheck.isAuthenticated) { // 只有登录用户才加载历史
        loadGameHistory();
    } else {
        if (gameHistoryListDiv) gameHistoryListDiv.innerHTML = '<p>登录后可查看游戏历史。</p>';
    }

    currentTableId = localStorage.getItem('currentTableId'); // 再次获取，因为 auth check 可能清除了它
    if (currentTableId) {
        loadCurrentTableState();
    } else {
        updateCurrentTableUI(null); // 确保如果没当前桌子，UI是干净的
    }
});
