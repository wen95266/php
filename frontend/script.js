document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://wenge.cloudns.ch/backend/api/game.php';
    const CARD_IMG_PATH = './cards/';

    // --- DOM Elements ---
    const startGameBtn = document.getElementById('startGameBtn');
    const resetGameBtn = document.getElementById('resetGameBtn');
    const submitArrangementBtn = document.getElementById('submitArrangementBtn');
    const playAgainBtn = document.getElementById('playAgainBtn');

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

    const player2NameSpan = document.getElementById('player2Name');
    const player2ScoreSpan = document.getElementById('player2ScoreDisplay');
    const player2SpecialHandNameSpan = document.getElementById('player2SpecialHandName');
    const player2StatusSpan = document.getElementById('player2Status');
    const player2ArrangedDisplay = document.getElementById('player2ArrangedDisplay');
    
    const resultsArea = document.getElementById('resultsArea');
    const roundResultTextContainer = document.getElementById('roundResultTextContainer');

    // --- Game State Variables ---
    let currentPlayerId = 'player1'; 
    let playerHandData = []; 
    let arrangedCardsData = { first: [], middle: [], last: [] }; 

    let draggedCardElement = null; 
    let draggedCardImage = null;   
    let draggedCardOriginZone = null; 

    let gameStatePollInterval = null;
    let fullDeckForCurrentHand = []; 

    // --- Helper Functions ---
    // ... (showMessage, createCardElement, renderPlayerHand, renderArrangementZone, renderAllArrangementZones, displayArrangedHandsAfterCompare 与上一版本相同)
    function showMessage(text, type = 'info') { 
        messagesDiv.textContent = text;
        messagesDiv.className = type;
    }

    function createCardElement(cardData, draggable = true) {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        cardDiv.dataset.image = cardData.image;
        cardDiv.draggable = draggable;

        const img = document.createElement('img');
        img.src = CARD_IMG_PATH + cardData.image;
        img.alt = cardData.image.replace(/_of_|\.svg/g, ' ').trim();
        cardDiv.appendChild(img);

        if (draggable) {
            cardDiv.addEventListener('dragstart', handleDragStart);
            cardDiv.addEventListener('dragend', handleDragEnd);
        }
        return cardDiv;
    }

    function renderPlayerHand() {
        player1HandDiv.innerHTML = ''; 
        if (playerHandData.length === 0 && player1HandDiv.querySelector('.placeholder-text')) {
             player1HandDiv.querySelector('.placeholder-text').style.display = 'block';
        } else if (player1HandDiv.querySelector('.placeholder-text')) {
             player1HandDiv.querySelector('.placeholder-text').style.display = 'none';
        }

        playerHandData.sort((a, b) => b.value - a.value || b.suitValue - a.suitValue); 
        playerHandData.forEach(cardObj => {
            player1HandDiv.appendChild(createCardElement(cardObj));
        });
    }

    function renderArrangementZone(zoneName) {
        const zoneDiv = arrangementZoneDivs[zoneName];
        zoneDiv.innerHTML = '';
        arrangedCardsData[zoneName].forEach(cardImage => {
            const cardObj = fullDeckForCurrentHand.find(c => c.image === cardImage) || { image: cardImage };
            zoneDiv.appendChild(createCardElement(cardObj));
        });
    }
    
    function renderAllArrangementZones() {
        renderArrangementZone('first');
        renderArrangementZone('middle');
        renderArrangementZone('last');
    }

    function displayArrangedHandsAfterCompare(playerDisplayDiv, arrangedObjects, evalResult) {
        playerDisplayDiv.style.display = 'block';
        ['first', 'middle', 'last'].forEach(segment => {
            const cardsContainer = playerDisplayDiv.querySelector(`.${segment}-cards`);
            const evalSpan = playerDisplayDiv.querySelector(`.${segment}-eval`);
            cardsContainer.innerHTML = '';
            
            if (arrangedObjects && arrangedObjects[segment] && Array.isArray(arrangedObjects[segment])) {
                arrangedObjects[segment].forEach(cardObj => {
                    cardsContainer.appendChild(createCardElement(cardObj, false)); 
                });
            }
            if (evalResult && evalResult[segment]) {
                evalSpan.textContent = `${evalResult[segment].name} (主值: ${evalResult[segment].primary_value})`;
            } else {
                evalSpan.textContent = '(未评估)';
            }
        });
    }

    // --- Drag and Drop Handlers ---
    // ... (handleDragStart, handleDragEnd, handleDragOver, handleDragLeave, handleDrop 与上一版本相同)
    function handleDragStart(event) {
        draggedCardElement = event.target.closest('.card');
        if (!draggedCardElement) return;

        draggedCardImage = draggedCardElement.dataset.image;
        draggedCardElement.classList.add('dragging');
        event.dataTransfer.setData('text/plain', draggedCardImage);
        event.dataTransfer.effectAllowed = 'move';

        if (draggedCardElement.parentElement.id === 'player1Hand') {
            draggedCardOriginZone = 'hand';
        } else {
            draggedCardOriginZone = draggedCardElement.closest('.droppable-area').dataset.zoneName;
        }
    }

    function handleDragEnd() {
        if (draggedCardElement) {
            draggedCardElement.classList.remove('dragging');
        }
        draggedCardElement = null;
        draggedCardImage = null;
        draggedCardOriginZone = null;
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    }

    function handleDragOver(event) {
        event.preventDefault(); 
        event.dataTransfer.dropEffect = 'move';
        const targetZone = event.target.closest('.droppable-area');
        if (targetZone && !targetZone.classList.contains('drag-over')) {
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            targetZone.classList.add('drag-over');
        }
    }
    
    function handleDragLeave(event) {
        const targetZone = event.target.closest('.droppable-area');
        if (targetZone && !targetZone.contains(event.relatedTarget)) {
            targetZone.classList.remove('drag-over');
        } else if (!targetZone) { 
             document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        }
    }

    function handleDrop(event) {
        event.preventDefault();
        const targetDropArea = event.target.closest('.droppable-area');
        if (!targetDropArea || !draggedCardImage) {
            if(draggedCardElement) draggedCardElement.classList.remove('dragging');
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            return;
        }
        targetDropArea.classList.remove('drag-over');

        const targetZoneName = targetDropArea.dataset.zoneName;

        if (targetZoneName !== 'hand' && targetZoneName !== draggedCardOriginZone) {
            const zoneMaxSize = parseInt(targetDropArea.dataset.size);
            if (arrangedCardsData[targetZoneName].length >= zoneMaxSize) {
                showMessage(`${targetZoneName === 'first' ? '头' : targetZoneName === 'middle' ? '中' : '尾'}道已满`, 'error');
                return;
            }
        }
        
        if (draggedCardOriginZone === 'hand') {
            playerHandData = playerHandData.filter(c => c.image !== draggedCardImage);
        } else if (arrangedCardsData[draggedCardOriginZone]) {
            arrangedCardsData[draggedCardOriginZone] = arrangedCardsData[draggedCardOriginZone].filter(img => img !== draggedCardImage);
        }

        if (targetZoneName === 'hand') {
            const cardToReturn = fullDeckForCurrentHand.find(c => c.image === draggedCardImage);
            if (cardToReturn && !playerHandData.find(c => c.image === cardToReturn.image)) { // 避免重复添加
                 playerHandData.push(cardToReturn);
            }
        } else if (arrangementZoneDivs[targetZoneName]) {
            if (!arrangedCardsData[targetZoneName].includes(draggedCardImage)) {
                 arrangedCardsData[targetZoneName].push(draggedCardImage);
            }
        }
        
        renderPlayerHand();
        renderAllArrangementZones();
    }


    document.querySelectorAll('.droppable-area').forEach(area => {
        area.addEventListener('dragover', handleDragOver);
        area.addEventListener('dragleave', handleDragLeave);
        area.addEventListener('drop', handleDrop);
    });

    // --- API Calls & Game Logic ---
    // ... (fetchApi 与上一版本相同)
    async function fetchApi(action, method = 'GET', body = null) {
        const options = {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        };
        if (body) {
            options.body = JSON.stringify(body);
        }
        const url = `${API_BASE_URL}?action=${action}`;
        
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `HTTP error ${response.status}` }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error("API call failed:", action, error);
            showMessage(`API请求失败: ${error.message}`, 'error');
            return { success: false, message: `API请求失败: ${error.message}` };
        }
    }


    function resetGameUI(isFullReset = false) {
        playerHandData = [];
        arrangedCardsData = { first: [], middle: [], last: [] };
        fullDeckForCurrentHand = [];
        renderPlayerHand();
        renderAllArrangementZones();

        player1ArrangedDisplay.style.display = 'none';
        player2ArrangedDisplay.style.display = 'none';
        resultsArea.style.display = 'none';
        submitArrangementBtn.style.display = 'none';
        submitArrangementBtn.disabled = true;
        
        player1SpecialHandNameSpan.textContent = '';
        player2SpecialHandNameSpan.textContent = '';


        if (isFullReset) { // 通常是 resetGameBtn 按下时
            player1ScoreSpan.textContent = '(总分: 0)';
            player2ScoreSpan.textContent = '(总分: 0)';
        }
        // player2StatusSpan.textContent = '等待中...'; // 这个会在 pollGameState 中更新
        document.querySelectorAll('.segment-display').forEach(el => {
            el.classList.remove('segment-win', 'segment-lose', 'segment-draw');
        });
        if (gameStatePollInterval) {
            clearInterval(gameStatePollInterval);
            gameStatePollInterval = null;
        }
    }
    
    async function handleStartGame() {
        resetGameUI(false); // false 表示不是完全重置，保留总分
        showMessage('正在开始新游戏...', 'info');
        startGameBtn.disabled = true;
        playAgainBtn.disabled = true;

        const data = await fetchApi('startGame', 'POST');
        startGameBtn.disabled = false;
        playAgainBtn.disabled = false;

        if (data.success) {
            showMessage(data.message, 'success');
            playerHandData = data.player1_hand || []; 
            fullDeckForCurrentHand = [...(data.player1_hand || [])]; 
            renderPlayerHand();
            submitArrangementBtn.style.display = 'inline-block';
            submitArrangementBtn.disabled = false;
            pollGameState(); 
        } else {
            showMessage(data.message || '开始游戏失败', 'error');
        }
    }

    async function handleSubmitArrangement() {
        if (arrangedCardsData.first.length !== 3 || 
            arrangedCardsData.middle.length !== 5 || 
            arrangedCardsData.last.length !== 5) {
            showMessage('请确保头道3张，中道5张，尾道5张。', 'error');
            return;
        }
        let totalArrangedCount = arrangedCardsData.first.length + arrangedCardsData.middle.length + arrangedCardsData.last.length;
        if (totalArrangedCount !== 13) { // 确保13张牌都被摆放
            showMessage(`已摆放 ${totalArrangedCount} 张牌，请摆放所有13张牌。`, 'error');
            return;
        }
        if (playerHandData.length > 0) { // 确保手牌区没有牌了
             showMessage('还有手牌未放入摆牌区！', 'error');
             return;
        }
        
        submitArrangementBtn.disabled = true;
        showMessage('正在提交摆牌...', 'info');

        const payload = {
            playerId: currentPlayerId,
            arrangedCards: arrangedCardsData 
        };
        const data = await fetchApi('arrangeCards', 'POST', payload);
        
        if (data.success) {
            showMessage(data.message, 'success');
            if (data.round_results) { 
                displayRoundResultsAndUpdateScores(data.round_results);
                if (gameStatePollInterval) { clearInterval(gameStatePollInterval); gameStatePollInterval = null; }
            } else {
                showMessage(data.message + ' 等待对手...', 'info');
                if (!gameStatePollInterval) pollGameState(); 
            }
        } else {
            showMessage(data.message || '提交摆牌失败', 'error');
            submitArrangementBtn.disabled = false; 
        }
    }
    
    function displayRoundResultsAndUpdateScores(results) {
        player1ArrangedDisplay.style.display = 'block';
        player2ArrangedDisplay.style.display = 'block';
        resultsArea.style.display = 'block';
        submitArrangementBtn.style.display = 'none'; 

        displayArrangedHandsAfterCompare(player1ArrangedDisplay, results.player1_arranged_for_display, results.player1_cards_eval_display);
        displayArrangedHandsAfterCompare(player2ArrangedDisplay, results.player2_arranged_for_display, results.player2_cards_eval_display);
        
        player1SpecialHandNameSpan.textContent = results.player1_special_type_name ? `(${results.player1_special_type_name})` : '';
        player2SpecialHandNameSpan.textContent = results.player2_special_type_name ? `(${results.player2_special_type_name})` : '';


        roundResultTextContainer.innerHTML = ''; 
        if (results.score_details && results.score_details.length > 0) {
            results.score_details.forEach(detail => {
                const p = document.createElement('p');
                p.textContent = detail;
                roundResultTextContainer.appendChild(p);
            });
        } else {
            const p = document.createElement('p');
            p.textContent = `你获得 ${results.player1_score_change} 分, 对手获得 ${results.player2_score_change} 分.`;
            roundResultTextContainer.appendChild(p);
        }

        player1ScoreSpan.textContent = `(总分: ${results.player1_total_score})`;
        player2ScoreSpan.textContent = `(总分: ${results.player2_total_score})`;
        player2StatusSpan.textContent = '已亮牌';

        if (results.segment_results) {
            ['first', 'middle', 'last'].forEach(segment => {
                const p1SegmentDiv = player1ArrangedDisplay.querySelector(`.segment-display:has(.${segment}-cards)`);
                const p2SegmentDiv = player2ArrangedDisplay.querySelector(`.segment-display:has(.${segment}-cards)`);
                
                [p1SegmentDiv, p2SegmentDiv].forEach(div => div.classList.remove('segment-win', 'segment-lose', 'segment-draw'));

                if (results.segment_results[segment] === 'p1_wins') {
                    p1SegmentDiv.classList.add('segment-win');
                    p2SegmentDiv.classList.add('segment-lose');
                } else if (results.segment_results[segment] === 'p2_wins') {
                    p1SegmentDiv.classList.add('segment-lose');
                    p2SegmentDiv.classList.add('segment-win');
                } else {
                    p1SegmentDiv.classList.add('segment-draw');
                    p2SegmentDiv.classList.add('segment-draw');
                }
            });
        }
    }

    async function handleResetGame() { 
        if (!confirm("确定要重置游戏并清除服务器状态吗？这将影响所有会话。")) return;
        const data = await fetchApi('resetGame', 'POST');
        if (data.success) {
            showMessage(data.message, 'success');
            resetGameUI(true); // true 表示完全重置UI，包括总分
        } else {
            showMessage(data.message || '重置游戏失败', 'error');
        }
    }
    
    async function pollGameState() {
        if (gameStatePollInterval) clearInterval(gameStatePollInterval);

        gameStatePollInterval = setInterval(async () => {
            const data = await fetchApi('getState');
            if (data.success && data.gameState) {
                const gs = data.gameState;
                
                if(gs.players[0]) {
                    player1NameSpan.textContent = gs.players[0].name || '玩家1';
                    player1ScoreSpan.textContent = `(总分: ${gs.players[0].score || 0})`;
                    player1SpecialHandNameSpan.textContent = gs.players[0].special_hand_type_name ? `(${gs.players[0].special_hand_type_name})` : '';

                }
                if(gs.players[1]) {
                    player2NameSpan.textContent = gs.players[1].name || '电脑';
                    player2ScoreSpan.textContent = `(总分: ${gs.players[1].score || 0})`;
                    player2SpecialHandNameSpan.textContent = gs.players[1].special_hand_type_name ? `(${gs.players[1].special_hand_type_name})` : '';

                    let p2status = '等待中...';
                    if (gs.status === 'arranging') {
                        p2status = gs.players[1].is_ready ? '已摆牌，等待你提交' : '正在摆牌...';
                         if (gs.players[0].is_ready && !gs.players[1].is_ready && gs.players[1].is_ai) {
                            p2status = '电脑正在思考...';
                        }
                    } else if (gs.status === 'comparing' || gs.status === 'finished') {
                        p2status = '已亮牌';
                    }
                    player2StatusSpan.textContent = p2status;
                }


                if (gs.status === 'finished' && gs.round_results && resultsArea.style.display === 'none') {
                    displayRoundResultsAndUpdateScores(gs.round_results);
                    showMessage("比牌完成！", 'success');
                    clearInterval(gameStatePollInterval);
                    gameStatePollInterval = null;
                }
                // 如果当前玩家已提交，但游戏还在进行中（等待AI或网络对手）
                else if (gs.status === 'arranging' && gs.players[0] && gs.players[0].is_ready && submitArrangementBtn.style.display !== 'none') {
                     showMessage('您已提交，等待对手...', 'info');
                     // submitArrangementBtn.style.display = 'none'; // 可以考虑在这里隐藏
                }
                
            } else {
                console.warn("Polling getState failed or no gameState received.");
            }
        }, 3000); 
    }

    // --- Initial Setup ---
    startGameBtn.addEventListener('click', handleStartGame);
    resetGameBtn.addEventListener('click', handleResetGame);
    submitArrangementBtn.addEventListener('click', handleSubmitArrangement);
    playAgainBtn.addEventListener('click', handleStartGame); 

    fetchApi('getState').then(data => {
        let initialMessage = "欢迎来到十三水！点击“开始新游戏”";
        if (data.success && data.gameState) {
            const gs = data.gameState;
            if(gs.players[0]) {
                player1NameSpan.textContent = gs.players[0].name || '玩家1';
                player1ScoreSpan.textContent = `(总分: ${gs.players[0].score || 0})`;
                player1SpecialHandNameSpan.textContent = gs.players[0].special_hand_type_name ? `(${gs.players[0].special_hand_type_name})` : '';
            }
            if(gs.players[1]) {
                player2NameSpan.textContent = gs.players[1].name || '电脑';
                player2ScoreSpan.textContent = `(总分: ${gs.players[1].score || 0})`;
                player2SpecialHandNameSpan.textContent = gs.players[1].special_hand_type_name ? `(${gs.players[1].special_hand_type_name})` : '';
            }


            if (gs.status === 'finished' && gs.round_results) {
                displayRoundResultsAndUpdateScores(gs.round_results);
                initialMessage = "这是上一局的结果。";
            } else if (gs.status === 'arranging') {
                // 尝试恢复进行中的游戏 (如果getState能返回当前玩家手牌)
                // 目前startGame会重置，所以恢复逻辑需要后端配合在getState返回手牌
                initialMessage = "检测到可能未完成的牌局，点击“开始新游戏”以重新开始。";
                // 如果要实现恢复，这里需要调用 pollGameState()
            }
        }
        showMessage(initialMessage, "info");
    }).catch(err => {
        showMessage("无法连接到游戏服务器，请稍后再试。", "error");
    });
});
