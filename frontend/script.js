// frontend/script.js
document.addEventListener('DOMContentLoaded', async () => {
    const API_GAME_URL = 'backend/api/game.php';
    const CARD_IMG_PATH = './cards/';

    // --- DOM Elements ---
    const messagesDiv = document.getElementById('messages');
    const player1NameSpan = document.getElementById('player1Name');
    const player1ScoreSpan = document.getElementById('player1ScoreDisplay');
    const player1SpecialHandNameSpan = document.getElementById('player1SpecialHandName');
    const player1HandDiv = document.getElementById('player1Hand');
    const arrangementZoneDivs = {
        first: document.getElementById('firstHeadCards'),
        middle: document.getElementById('middleWayCards'),
        last: document.getElementById('lastWayCards')
    };
    const player1ArrangedDisplay = document.getElementById('player1ArrangedDisplay');
    const submitArrangementBtn = document.getElementById('submitArrangementBtn');
    const suggestArrangementBtn = document.getElementById('suggestArrangementBtn');
    const opponentAreasContainer = document.getElementById('opponentAreasContainer');
    const resultsArea = document.getElementById('resultsArea');
    const roundResultTextContainer = document.getElementById('roundResultTextContainer');
    const playAgainBtn = document.getElementById('playAgainBtn');
    const startGameBtn = document.getElementById('startGameBtn');
    const resetGameBtn = document.getElementById('resetGameBtn');

    // --- Game State Variables ---
    let currentPlayerId = null;
    let currentTableId = null;
    let currentRoundId = null;
    let playerHandData = [];
    let arrangedCardsData = { first: [], middle: [], last: [] };
    let fullDeckForCurrentHand = [];
    let gameStatePollInterval = null;
    let localGameData = null;

    // --- Drag and Drop (与上一版本相同) ---
    let draggedCardElement = null; 
    let draggedCardImage = null;   
    let draggedCardOriginZone = null; 
    function handleDragStart(event) { /* ... (同上) ... */ draggedCardElement = event.target.closest('.card'); if (!draggedCardElement) return; draggedCardImage = draggedCardElement.dataset.image; draggedCardElement.classList.add('dragging'); event.dataTransfer.setData('text/plain', draggedCardImage); event.dataTransfer.effectAllowed = 'move'; if (draggedCardElement.parentElement.id === 'player1Hand') { draggedCardOriginZone = 'hand';} else { draggedCardOriginZone = draggedCardElement.closest('.droppable-area').dataset.zoneName;}}
    function handleDragEnd() { /* ... (同上) ... */ if (draggedCardElement) { draggedCardElement.classList.remove('dragging');} draggedCardElement = null; draggedCardImage = null; draggedCardOriginZone = null; document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));}
    function handleDragOver(event) { /* ... (同上) ... */ event.preventDefault(); event.dataTransfer.dropEffect = 'move'; const targetZone = event.target.closest('.droppable-area'); if (targetZone && !targetZone.classList.contains('drag-over')) { document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over')); targetZone.classList.add('drag-over'); }}
    function handleDragLeave(event) { /* ... (同上) ... */ const targetZone = event.target.closest('.droppable-area'); if (targetZone && !targetZone.contains(event.relatedTarget)) { targetZone.classList.remove('drag-over');} else if (!targetZone) { document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));}}
    function handleDrop(event) { /* ... (同上) ... */ event.preventDefault(); const targetDropArea = event.target.closest('.droppable-area'); if (!targetDropArea || !draggedCardImage) { if(draggedCardElement) draggedCardElement.classList.remove('dragging'); document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over')); return; } targetDropArea.classList.remove('drag-over'); const targetZoneName = targetDropArea.dataset.zoneName; if (targetZoneName !== 'hand' && targetZoneName !== draggedCardOriginZone) { const zoneMaxSize = parseInt(targetDropArea.dataset.size); if (arrangedCardsData[targetZoneName].length >= zoneMaxSize) { showMessage(`${targetZoneName === 'first' ? '头' : targetZoneName === 'middle' ? '中' : '尾'}道已满`, 'error'); return; }} if (draggedCardOriginZone === 'hand') { playerHandData = playerHandData.filter(c => c.image !== draggedCardImage);} else if (arrangedCardsData[draggedCardOriginZone]) { arrangedCardsData[draggedCardOriginZone] = arrangedCardsData[draggedCardOriginZone].filter(img => img !== draggedCardImage);} if (targetZoneName === 'hand') { const cardToReturn = fullDeckForCurrentHand.find(c => c.image === draggedCardImage); if (cardToReturn && !playerHandData.find(c => c.image === cardToReturn.image)) { playerHandData.push(cardToReturn);}} else if (arrangementZoneDivs[targetZoneName]) { if (!arrangedCardsData[targetZoneName].includes(draggedCardImage)) { arrangedCardsData[targetZoneName].push(draggedCardImage);}} renderPlayerHand(); renderAllArrangementZones();}
    document.querySelectorAll('.droppable-area').forEach(area => { area.addEventListener('dragover', handleDragOver); area.addEventListener('dragleave', handleDragLeave); area.addEventListener('drop', handleDrop);});

    // --- Helper Functions ---
    function showMessage(text, type = 'info') { messagesDiv.textContent = text; messagesDiv.className = `messages-placeholder ${type}`; }
    function createCardElement(cardData, draggable = true) { const cardDiv = document.createElement('div'); cardDiv.classList.add('card'); cardDiv.dataset.image = cardData.image; cardDiv.draggable = draggable; const img = document.createElement('img'); img.src = CARD_IMG_PATH + cardData.image; img.alt = cardData.image.replace(/_of_|\.svg/g, ' ').trim(); cardDiv.appendChild(img); if (draggable) { cardDiv.addEventListener('dragstart', handleDragStart); cardDiv.addEventListener('dragend', handleDragEnd); } return cardDiv; }
    function renderPlayerHand() { player1HandDiv.innerHTML = ''; if (playerHandData.length === 0 && player1HandDiv.querySelector('.placeholder-text')) { player1HandDiv.querySelector('.placeholder-text').style.display = 'block'; } else if (player1HandDiv.querySelector('.placeholder-text')) { player1HandDiv.querySelector('.placeholder-text').style.display = 'none';} playerHandData.sort((a,b) => (b.value - a.value) || (b.suitValue - a.suitValue)); playerHandData.forEach(cardObj => { player1HandDiv.appendChild(createCardElement(cardObj));}); }
    function renderArrangementZone(zoneName) { const zoneDiv = arrangementZoneDivs[zoneName]; zoneDiv.innerHTML = ''; arrangedCardsData[zoneName].forEach(cardImage => { const cardObj = fullDeckForCurrentHand.find(c => c.image === cardImage) || { image: cardImage }; zoneDiv.appendChild(createCardElement(cardObj)); }); }
    function renderAllArrangementZones() { renderArrangementZone('first'); renderArrangementZone('middle'); renderArrangementZone('last');}
    
    function displayArrangedHandsForPlayer(playerDisplayContainer, arrangedObjects, evalResult, playerName = "对手") {
        if (!playerDisplayContainer) return;
        playerDisplayContainer.style.display = 'block';
        let h4 = playerDisplayContainer.querySelector('h4');
        if(!h4) { h4 = document.createElement('h4'); playerDisplayContainer.insertBefore(h4, playerDisplayContainer.firstChild); }
        h4.textContent = `${playerName}的亮牌：`;

        ['first', 'middle', 'last'].forEach(segment => {
            const cardsContainer = playerDisplayContainer.querySelector(`.${segment}-cards`);
            const evalSpan = playerDisplayContainer.querySelector(`.${segment}-eval`);
            if (!cardsContainer || !evalSpan) return;
            
            // 确保应用横向显示类 (如果HTML中没有直接写死)
            cardsContainer.classList.add('horizontal-cards-display'); 
            cardsContainer.innerHTML = '';
            
            if (arrangedObjects && arrangedObjects[segment] && Array.isArray(arrangedObjects[segment])) {
                arrangedObjects[segment].forEach(cardObj => { cardsContainer.appendChild(createCardElement(cardObj, false)); });
            }
            if (evalResult && evalResult[segment]) {
                evalSpan.textContent = `${evalResult[segment].name || 'N/A'}`;
                if(typeof evalResult[segment].primary_value !== 'undefined') evalSpan.textContent += ` (主值: ${evalResult[segment].primary_value})`;
            } else { evalSpan.textContent = '(未评估)';}
        });
    }

    // --- API Calls & Game Logic (与上一版本相同，这里不再重复所有，只列出关键部分) ---
    async function fetchGameApi(action, method = 'POST', bodyParams = null) { /* ... (同上) ... */ const options = { method: method, credentials: 'include' }; let url = `${API_GAME_URL}?action=${action}`; if (bodyParams) { const formData = new FormData(); for (const key in bodyParams) { if (typeof bodyParams[key] === 'object' && bodyParams[key] !== null) { formData.append(key, JSON.stringify(bodyParams[key])); } else { formData.append(key, bodyParams[key]);}} options.body = formData;} try { const response = await fetch(url, options); const data = await response.json(); if (data.redirectToLogin) { showMessage('会话已过期或未登录，请重新登录。', 'error'); localStorage.removeItem('userData'); localStorage.removeItem('activeGameTableId'); localStorage.removeItem('activeGameRoundId'); window.updateUserInfoDisplay?.(); setTimeout(() => window.location.href = 'login.html', 2000); return null; } return data;} catch (error) { console.error("Game API call failed:", action, error); showMessage(`游戏请求失败: ${error.message}`, 'error'); return { success: false, message: `游戏请求失败: ${error.message}` };}}
    function resetGameScreenUI() { /* ... (同上) ... */ playerHandData = []; arrangedCardsData = { first: [], middle: [], last: [] }; fullDeckForCurrentHand = []; renderPlayerHand(); renderAllArrangementZones(); player1ArrangedDisplay.style.display = 'none'; if (opponentAreasContainer) opponentAreasContainer.innerHTML = ''; resultsArea.style.display = 'none'; submitArrangementBtn.style.display = 'none'; submitArrangementBtn.disabled = true; suggestArrangementBtn.style.display = 'none'; player1SpecialHandNameSpan.textContent = ''; if (gameStatePollInterval) { clearInterval(gameStatePollInterval); gameStatePollInterval = null;}}
    async function loadCurrentGameAndPlayerInfo() { /* ... (同上) ... */ const userData = JSON.parse(localStorage.getItem('userData')); if (userData) { currentPlayerId = userData.id; player1NameSpan.textContent = userData.nickname || userData.username; player1ScoreSpan.textContent = `(总分: ${userData.total_score || 0})`; } else { showMessage("请先登录以进行游戏。", "error"); setTimeout(() => window.location.href = 'login.html', 1500); return false;} const params = new URLSearchParams(window.location.search); currentTableId = params.get('table') || localStorage.getItem('activeGameTableId'); currentRoundId = params.get('round') || localStorage.getItem('activeGameRoundId'); if (!currentTableId || !currentRoundId) { showMessage("无效的游戏链接或未找到游戏信息，将返回大厅。", "error"); setTimeout(() => window.location.href = 'lobby.html', 2000); return false;} localStorage.setItem('activeGameTableId', currentTableId); localStorage.setItem('activeGameRoundId', currentRoundId); return true;}
    async function handleSuggestArrangementForGame() { /* ... (同上) ... */ if (!currentTableId || !currentRoundId) { showMessage("不在有效的游戏中，无法推荐。", "error"); return;} let totalCardsAvailable = playerHandData.length + arrangedCardsData.first.length + arrangedCardsData.middle.length + arrangedCardsData.last.length; if (totalCardsAvailable !== 13) { showMessage("手牌不完整，无法推荐。", "error"); return;} suggestArrangementBtn.disabled = true; showMessage("正在获取推荐摆法...", "info"); const data = await fetchGameApi(`suggestArrangement&playerId=${currentPlayerId}&tableId=${currentTableId}&roundId=${currentRoundId}`, 'GET'); suggestArrangementBtn.disabled = false; if (data && data.success && data.suggestion) { showMessage("已获取推荐摆法，请查看并可拖拽调整。", "success"); playerHandData = [...fullDeckForCurrentHand]; arrangedCardsData = { first: [], middle: [], last: [] }; Object.keys(data.suggestion).forEach(zone => { data.suggestion[zone].forEach(img => { if (playerHandData.find(c => c.image === img)) { playerHandData = playerHandData.filter(c => c.image !== img); arrangedCardsData[zone].push(img);}});}); renderPlayerHand(); renderAllArrangementZones();} else { showMessage(data ? data.message : "获取推荐失败。", "error");}}
    async function handleSubmitArrangementForGame() { /* ... (同上) ... */ if (!currentTableId || !currentRoundId) { showMessage("不在有效的游戏中，无法提交。", "error"); return;} if (arrangedCardsData.first.length !== 3 || arrangedCardsData.middle.length !== 5 || arrangedCardsData.last.length !== 5) { showMessage('请确保头道3张，中道5张，尾道5张。', 'error'); return;} if (playerHandData.length > 0) { showMessage('还有手牌未放入摆牌区！', 'error'); return;} submitArrangementBtn.disabled = true; suggestArrangementBtn.disabled = true; showMessage('正在提交摆牌...', 'info'); const payload = {tableId: currentTableId, roundId: currentRoundId, arrangedCards: arrangedCardsData }; const data = await fetchGameApi('submitArrangement', 'POST', payload); if (data && data.success) { showMessage(data.message, 'success'); submitArrangementBtn.style.display = 'none'; suggestArrangementBtn.style.display = 'none'; if (data.round_results) { updateGameScreenWithState(data.gameState); if (gameStatePollInterval) { clearInterval(gameStatePollInterval); gameStatePollInterval = null; }} else { if (!gameStatePollInterval) pollGameTableState(); }} else { showMessage(data ? data.message : '提交摆牌失败', 'error'); submitArrangementBtn.disabled = false; suggestArrangementBtn.disabled = false;}}
    
    function updateGameScreenWithState(gameStateData) {
        localGameData = gameStateData; 
        if (!gameStateData || !gameStateData.table_status) {
            showMessage("获取游戏状态异常。", "error");
            return;
        }
        
        const me = gameStateData.players?.find(p => p.user_id == currentPlayerId);
        if (me) {
            player1NameSpan.textContent = me.nickname;
        }

        if (opponentAreasContainer) opponentAreasContainer.innerHTML = ''; 
        gameStateData.players?.forEach(player => {
            if (player.user_id != currentPlayerId) {
                const opponentDivId = `opponentArea_${player.user_id}`;
                // let opponentOuterContainer = document.getElementById(opponentDivId); // 这个ID是外层容器
                // if (!opponentOuterContainer) { // 如果不存在则创建
                const opponentOuterContainer = document.createElement('div');
                opponentOuterContainer.id = opponentDivId; 
                opponentOuterContainer.classList.add('opponent-area-ingame'); 
                opponentOuterContainer.innerHTML = `
                    <h2>
                        <span class="opponent-name">${player.nickname}</span> 
                        <span class="opponent-special-hand special-hand-name"></span>
                    </h2>
                    <p>状态: <span class="opponent-status"></span></p>
                    <div class="arranged-display" style="display:none;"> 
                         <h4>对手亮牌：</h4>
                         <div class="segment-display">头道: <span class="eval-text first-eval"></span><div class="cards-display first-cards horizontal-cards-display"></div></div>
                         <div class="segment-display">中道: <span class="eval-text middle-eval"></span><div class="cards-display middle-cards horizontal-cards-display"></div></div>
                         <div class="segment-display">尾道: <span class="eval-text last-eval"></span><div class="cards-display last-cards horizontal-cards-display"></div></div>
                    </div>`;
                opponentAreasContainer.appendChild(opponentOuterContainer);
                // }
                
                const opponentNameSpan = opponentOuterContainer.querySelector('.opponent-name');
                if(opponentNameSpan) opponentNameSpan.textContent = player.nickname;

                const opponentStatusSpan = opponentOuterContainer.querySelector('.opponent-status');
                if (opponentStatusSpan) {
                    if (gameStateData.table_status === 'playing') {
                        opponentStatusSpan.textContent = player.has_submitted_this_round ? '已出牌' : '思考中...';
                    } else if (gameStateData.table_status === 'finished') {
                        opponentStatusSpan.textContent = '已亮牌';
                    } else {
                        opponentStatusSpan.textContent = player.is_ready ? '已准备' : '等待中';
                    }
                }
            }
        });

        if (gameStateData.table_status === 'playing') {
            // ... (与上一版本相同)
            resultsArea.style.display = 'none'; playAgainBtn.style.display = 'none'; 
            const myPlayerData = gameStateData.players.find(p => p.user_id == currentPlayerId);
            if (myPlayerData && !myPlayerData.has_submitted_this_round) {
                if (gameStateData.yourHand && playerHandData.length === 0 && arrangedCardsData.first.length === 0) { 
                    playerHandData = gameStateData.yourHand; fullDeckForCurrentHand = [...gameStateData.yourHand]; renderPlayerHand();
                }
                submitArrangementBtn.style.display = 'inline-block'; submitArrangementBtn.disabled = false;
                suggestArrangementBtn.style.display = 'inline-block'; suggestArrangementBtn.disabled = false;
            } else if (myPlayerData && myPlayerData.has_submitted_this_round) {
                showMessage("您已提交，等待其他玩家...", "info");
                submitArrangementBtn.style.display = 'none'; suggestArrangementBtn.style.display = 'none';
            }
        } else if (gameStateData.table_status === 'finished' && gameStateData.round_results) {
            // ... (与上一版本相同，确保调用 displayArrangedHandsForPlayer)
            submitArrangementBtn.style.display = 'none'; suggestArrangementBtn.style.display = 'none';
            resultsArea.style.display = 'block'; playAgainBtn.textContent = "返回大厅"; playAgainBtn.style.display = 'inline-block';
            const roundResults = gameStateData.round_results;
            const myResultDetails = roundResults.player_details?.[currentPlayerId];
            if (myResultDetails) {
                displayArrangedHandsForPlayer(player1ArrangedDisplay, myResultDetails.arranged_hand_for_display, myResultDetails.cards_eval_display, player1NameSpan.textContent);
                player1SpecialHandNameSpan.textContent = myResultDetails.special_hand_type_name ? `(${myResultDetails.special_hand_type_name})` : '';
            }
            gameStateData.players?.forEach(player => {
                if (player.user_id != currentPlayerId) {
                    const opponentOuterContainer = document.getElementById(`opponentArea_${player.user_id}`);
                    const opponentArrangedDisplay = opponentOuterContainer?.querySelector('.arranged-display');
                    const opponentResultDetails = roundResults.player_details?.[player.user_id];
                    if (opponentArrangedDisplay && opponentResultDetails) {
                        displayArrangedHandsForPlayer(opponentArrangedDisplay, opponentResultDetails.arranged_hand_for_display, opponentResultDetails.cards_eval_display, player.nickname);
                        opponentOuterContainer.querySelector('.opponent-special-hand').textContent = opponentResultDetails.special_hand_type_name ? `(${opponentResultDetails.special_hand_type_name})` : '';
                    }
                }
            });
            roundResultTextContainer.innerHTML = ''; 
            if (roundResults.score_details && roundResults.score_details.length > 0) { roundResults.score_details.forEach(detail => { const p = document.createElement('p'); p.textContent = detail; roundResultTextContainer.appendChild(p);});}
            const finalMyData = gameStateData.players.find(p => p.user_id == currentPlayerId);
            if (finalMyData && typeof finalMyData.total_score !== 'undefined') { 
                 player1ScoreSpan.textContent = `(总分: ${finalMyData.total_score})`;
                 const storedUser = JSON.parse(localStorage.getItem('userData'));
                 if(storedUser && storedUser.id == currentPlayerId) { storedUser.total_score = finalMyData.total_score; localStorage.setItem('userData', JSON.stringify(storedUser));}
            }
            if (gameStatePollInterval) { clearInterval(gameStatePollInterval); gameStatePollInterval = null; }
        }
    }
    
    async function pollGameTableState() { /* ... (与上一版本相同) ... */ if (gameStatePollInterval) clearInterval(gameStatePollInterval); if (!currentTableId || !currentRoundId) return; gameStatePollInterval = setInterval(async () => { if (!currentTableId || !currentRoundId) { clearInterval(gameStatePollInterval); gameStatePollInterval = null; return;} const data = await fetchGameApi(`getGameState&tableId=${currentTableId}&roundId=${currentRoundId}`, 'GET'); if (data && data.success && data.gameState) { updateGameScreenWithState(data.gameState); if (data.gameState.table_status === 'finished') { clearInterval(gameStatePollInterval); gameStatePollInterval = null;}} else { console.warn("Polling game state failed or no gameState received.");}}, 3000); }

    // --- Initial Setup for Game Page (与上一版本相同) ---
    async function initializeGamePage() { /* ... (同上) ... */ resetGameScreenUI(); const canLoadGame = await loadCurrentGameAndPlayerInfo(); if (canLoadGame) { showMessage("正在加载游戏...", "info"); const initialData = await fetchGameApi(`getGameState&tableId=${currentTableId}&roundId=${currentRoundId}`, 'GET'); if (initialData && initialData.success && initialData.gameState) { updateGameScreenWithState(initialData.gameState); if (initialData.gameState.table_status === 'playing') { pollGameTableState();}} else { showMessage(initialData?.message || "无法加载游戏状态，请返回大厅。", "error"); setTimeout(() => window.location.href = 'lobby.html', 2000);}} if(startGameBtn) startGameBtn.style.display = 'none'; if(resetGameBtn) resetGameBtn.style.display = 'none'; if(playAgainBtn) { playAgainBtn.textContent = "返回大厅"; playAgainBtn.onclick = () => { window.location.href = 'lobby.html'; };}}
    if (window.location.pathname.includes('index.html')) { window.checkUserAuthentication().then(authData => { if (authData.isAuthenticated) { initializeGamePage(); } else if (!localStorage.getItem('userData')) { showMessage("请先登录以进行游戏。", "error"); setTimeout(() => window.location.href = 'login.html', 1500);}}); if(submitArrangementBtn) submitArrangementBtn.addEventListener('click', handleSubmitArrangementForGame); if(suggestArrangementBtn) suggestArrangementBtn.addEventListener('click', handleSuggestArrangementForGame);}
});
