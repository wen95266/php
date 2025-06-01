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
    const player1HandDiv = document.getElementById('player1Hand');
    const arrangementZoneDivs = {
        first: document.getElementById('firstHeadCards'),
        middle: document.getElementById('middleWayCards'),
        last: document.getElementById('lastWayCards')
    };
    const player1ArrangedDisplay = document.getElementById('player1ArrangedDisplay');

    const player2NameSpan = document.getElementById('player2Name');
    const player2ScoreSpan = document.getElementById('player2ScoreDisplay');
    const player2StatusSpan = document.getElementById('player2Status');
    const player2ArrangedDisplay = document.getElementById('player2ArrangedDisplay');
    
    const resultsArea = document.getElementById('resultsArea');
    const roundResultTextContainer = document.getElementById('roundResultTextContainer');

    // --- Game State Variables ---
    let currentPlayerId = 'player1'; // 假设当前用户总是player1
    let playerHandData = []; // 存放当前玩家手牌的完整对象 {image, suit, rank, value, ...}
    let arrangedCardsData = { first: [], middle: [], last: [] }; // 存放已摆放牌的 image 名称

    let draggedCardElement = null; // 当前拖拽的卡牌DOM元素
    let draggedCardImage = null;   // 当前拖拽卡牌的 image 名称
    let draggedCardOriginZone = null; // 'hand', 'first', 'middle', 'last'

    let gameStatePollInterval = null;
    let fullDeckForCurrentHand = []; // 用于从摆牌区拖回手牌时恢复完整card对象

    // --- Helper Functions ---
    function showMessage(text, type = 'info') { // types: info, success, error
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
        player1HandDiv.innerHTML = ''; // 清空
        if (playerHandData.length === 0 && player1HandDiv.querySelector('.placeholder-text')) {
             player1HandDiv.querySelector('.placeholder-text').style.display = 'block';
        } else if (player1HandDiv.querySelector('.placeholder-text')) {
             player1HandDiv.querySelector('.placeholder-text').style.display = 'none';
        }

        playerHandData.sort((a, b) => b.value - a.value || b.suitValue - a.suitValue); // 可选：手牌排序
        playerHandData.forEach(cardObj => {
            player1HandDiv.appendChild(createCardElement(cardObj));
        });
    }

    function renderArrangementZone(zoneName) {
        const zoneDiv = arrangementZoneDivs[zoneName];
        zoneDiv.innerHTML = '';
        arrangedCardsData[zoneName].forEach(cardImage => {
            // 从 fullDeckForCurrentHand 找到完整的 card 对象来创建元素，确保信息完整
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
        // arrangedObjects: {first: [{image:'...', suit:'...', ...}], ...}
        // evalResult: {first: {name:'乌龙', primary_value:14}, ...}
        playerDisplayDiv.style.display = 'block';
        ['first', 'middle', 'last'].forEach(segment => {
            const cardsContainer = playerDisplayDiv.querySelector(`.${segment}-cards`);
            const evalSpan = playerDisplayDiv.querySelector(`.${segment}-eval`);
            cardsContainer.innerHTML = '';
            
            if (arrangedObjects && arrangedObjects[segment] && Array.isArray(arrangedObjects[segment])) {
                arrangedObjects[segment].forEach(cardObj => {
                    cardsContainer.appendChild(createCardElement(cardObj, false)); // 结果区卡牌不可拖拽
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
    function handleDragStart(event) {
        draggedCardElement = event.target.closest('.card');
        if (!draggedCardElement) return;

        draggedCardImage = draggedCardElement.dataset.image;
        draggedCardElement.classList.add('dragging');
        event.dataTransfer.setData('text/plain', draggedCardImage);
        event.dataTransfer.effectAllowed = 'move';

        // 判断拖拽源
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
            // 清除其他区域的高亮
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            targetZone.classList.add('drag-over');
        }
    }
    
    function handleDragLeave(event) {
        const targetZone = event.target.closest('.droppable-area');
         // 确保鼠标确实离开了该区域，而不是进入了其子元素
        if (targetZone && !targetZone.contains(event.relatedTarget)) {
            targetZone.classList.remove('drag-over');
        } else if (!targetZone) { // 如果离开了浏览器窗口或非拖放区域
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

        // 检查目标区域是否已满 (如果不是手牌区，并且不是从本区拖出再拖回)
        if (targetZoneName !== 'hand' && targetZoneName !== draggedCardOriginZone) {
            const zoneMaxSize = parseInt(targetDropArea.dataset.size);
            if (arrangedCardsData[targetZoneName].length >= zoneMaxSize) {
                showMessage(`${targetZoneName === 'first' ? '头' : targetZoneName === 'middle' ? '中' : '尾'}道已满`, 'error');
                return;
            }
        }
        
        // --- 更新数据模型 ---
        // 1. 从原位置数据中移除
        if (draggedCardOriginZone === 'hand') {
            playerHandData = playerHandData.filter(c => c.image !== draggedCardImage);
        } else if (arrangedCardsData[draggedCardOriginZone]) {
            arrangedCardsData[draggedCardOriginZone] = arrangedCardsData[draggedCardOriginZone].filter(img => img !== draggedCardImage);
        }

        // 2. 添加到新位置数据中
        if (targetZoneName === 'hand') {
            const cardToReturn = fullDeckForCurrentHand.find(c => c.image === draggedCardImage);
            if (cardToReturn) playerHandData.push(cardToReturn);
        } else if (arrangementZoneDivs[targetZoneName]) {
            // 确保不重复添加
            if (!arrangedCardsData[targetZoneName].includes(draggedCardImage)) {
                 arrangedCardsData[targetZoneName].push(draggedCardImage);
            }
        }
        
        // --- 重新渲染受影响的UI ---
        renderPlayerHand();
        renderAllArrangementZones();
    }

    // 给所有可拖放区域绑定事件
    document.querySelectorAll('.droppable-area').forEach(area => {
        area.addEventListener('dragover', handleDragOver);
        area.addEventListener('dragleave', handleDragLeave);
        area.addEventListener('drop', handleDrop);
    });

    // --- API Calls & Game Logic ---
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

    function resetGameUI() {
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

        player1ScoreSpan.textContent = '(总分: 0)';
        player2ScoreSpan.textContent = '(总分: 0)';
        player2StatusSpan.textContent = '等待中...';
        document.querySelectorAll('.segment-display').forEach(el => {
            el.classList.remove('segment-win', 'segment-lose', 'segment-draw');
        });
        if (gameStatePollInterval) {
            clearInterval(gameStatePollInterval);
            gameStatePollInterval = null;
        }
    }
    
    async function handleStartGame() {
        resetGameUI();
        showMessage('正在开始新游戏...', 'info');
        startGameBtn.disabled = true;
        playAgainBtn.disabled = true;

        const data = await fetchApi('startGame', 'POST');
        startGameBtn.disabled = false;
        playAgainBtn.disabled = false;

        if (data.success) {
            showMessage(data.message, 'success');
            playerHandData = data.player1_hand; // 后端应返回 {image, suit, rank, value, ...} 结构
            fullDeckForCurrentHand = [...data.player1_hand]; // 备份用于拖拽恢复
            renderPlayerHand();
            submitArrangementBtn.style.display = 'inline-block';
            submitArrangementBtn.disabled = false;
            // 可以在这里获取最新的玩家信息（名字，分数等）
            pollGameState(); // 开始轮询获取游戏状态
        } else {
            showMessage(data.message || '开始游戏失败', 'error');
        }
    }

    async function handleSubmitArrangement() {
        // 简单前端校验张数
        if (arrangedCardsData.first.length !== 3 || 
            arrangedCardsData.middle.length !== 5 || 
            arrangedCardsData.last.length !== 5) {
            showMessage('请确保头道3张，中道5张，尾道5张。', 'error');
            return;
        }
        if (playerHandData.length > 0) {
            showMessage('还有手牌未摆放！', 'error');
            return;
        }
        
        submitArrangementBtn.disabled = true;
        showMessage('正在提交摆牌...', 'info');

        const payload = {
            playerId: currentPlayerId,
            arrangedCards: arrangedCardsData // {first: [img1,...], ...}
        };
        const data = await fetchApi('arrangeCards', 'POST', payload);
        
        if (data.success) {
            showMessage(data.message, 'success');
            // submitArrangementBtn.style.display = 'none'; // 隐藏提交按钮直到下一局
            if (data.round_results) { 
                displayRoundResultsAndUpdateScores(data.round_results);
                if (gameStatePollInterval) { clearInterval(gameStatePollInterval); gameStatePollInterval = null; }
            } else {
                // 等待AI或其他人，轮询会自动处理
                showMessage(data.message + ' 等待对手...', 'info');
                if (!gameStatePollInterval) pollGameState(); // 确保轮询已启动
            }
        } else {
            showMessage(data.message || '提交摆牌失败', 'error');
            submitArrangementBtn.disabled = false; // 允许重新提交
        }
    }
    
    function displayRoundResultsAndUpdateScores(results) {
        player1ArrangedDisplay.style.display = 'block';
        player2ArrangedDisplay.style.display = 'block';
        resultsArea.style.display = 'block';
        submitArrangementBtn.style.display = 'none'; // 结果出来后隐藏提交按钮

        // results.playerX_arranged_for_display, results.playerX_cards_eval_display
        displayArrangedHandsAfterCompare(player1ArrangedDisplay, results.player1_arranged_for_display, results.player1_cards_eval_display);
        displayArrangedHandsAfterCompare(player2ArrangedDisplay, results.player2_arranged_for_display, results.player2_cards_eval_display);
        
        roundResultTextContainer.innerHTML = ''; // 清空旧结果
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

    async function handleResetGame() { // 这个是测试用的，会清除服务器session
        if (!confirm("确定要重置游戏并清除服务器状态吗？这将影响所有会话。")) return;
        const data = await fetchApi('resetGame', 'POST');
        if (data.success) {
            showMessage(data.message, 'success');
            resetGameUI(); // 彻底重置UI
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
                
                // 更新玩家信息 (名字, 总分)
                if(gs.players[0]) {
                    player1NameSpan.textContent = gs.players[0].name || '玩家1';
                    player1ScoreSpan.textContent = `(总分: ${gs.players[0].score || 0})`;
                }
                if(gs.players[1]) {
                    player2NameSpan.textContent = gs.players[1].name || '电脑';
                    player2ScoreSpan.textContent = `(总分: ${gs.players[1].score || 0})`;
                }


                // 更新对手状态
                if (gs.players[1]) {
                    let p2status = '等待中...';
                    if (gs.status === 'arranging') {
                        p2status = gs.players[1].is_ready ? '已摆牌，等待你提交' : '正在摆牌...';
                    } else if (gs.status === 'comparing' || gs.status === 'finished') {
                        p2status = '已亮牌';
                    }
                    player2StatusSpan.textContent = p2status;
                }

                // 如果游戏结束且结果已出，但前端还未显示
                if (gs.status === 'finished' && gs.round_results && resultsArea.style.display === 'none') {
                    displayRoundResultsAndUpdateScores(gs.round_results);
                    showMessage("比牌完成！", 'success');
                    clearInterval(gameStatePollInterval);
                    gameStatePollInterval = null;
                }
                // 如果所有人都已准备，但仍在arranging状态（例如，AI刚提交，后端还没转到comparing）
                // 后端应该在AI提交后直接进入comparing/finished并返回结果，所以前端这里可能不需要特别处理
                
            } else {
                console.warn("Polling getState failed or no gameState received.");
                // 可以在连续失败几次后停止轮询
            }
        }, 3000); // 每3秒轮询一次
    }

    // --- Initial Setup ---
    startGameBtn.addEventListener('click', handleStartGame);
    resetGameBtn.addEventListener('click', handleResetGame);
    submitArrangementBtn.addEventListener('click', handleSubmitArrangement);
    playAgainBtn.addEventListener('click', handleStartGame); // "再来一局"

    // 初始时获取一次游戏状态，看是否需要恢复
    fetchApi('getState').then(data => {
        if (data.success && data.gameState) {
            const gs = data.gameState;
            player1NameSpan.textContent = gs.players[0].name || '玩家1';
            player1ScoreSpan.textContent = `(总分: ${gs.players[0].score || 0})`;
            player2NameSpan.textContent = gs.players[1].name || '电脑';
            player2ScoreSpan.textContent = `(总分: ${gs.players[1].score || 0})`;

            if (gs.status === 'arranging' && gs.players[0] && gs.players[0].hand_count > 0 && !gs.players[0].is_ready) {
                // 尝试恢复未完成的牌局 (需要后端在getState时返回当前玩家手牌)
                // 目前startGame会重置，所以这个恢复逻辑可能用不上，除非getState能返回手牌
                // showMessage("检测到未完成的游戏，请继续摆牌。", "info");
                // 如果需要恢复，这里应该请求手牌并渲染
                // submitArrangementBtn.style.display = 'inline-block';
                // submitArrangementBtn.disabled = false;
                // pollGameState();
                showMessage("欢迎回来！点击“开始新游戏”", "info"); // 简化处理
            } else if (gs.status === 'finished' && gs.round_results) {
                displayRoundResultsAndUpdateScores(gs.round_results);
                showMessage("这是上一局的结果。", "info");
            }
            else {
                 showMessage("欢迎来到十三水！点击“开始新游戏”", "info");
            }
        } else {
            showMessage("欢迎来到十三水！点击“开始新游戏”", "info");
        }
    }).catch(err => {
        showMessage("无法连接到游戏服务器，请稍后再试。", "error");
    });
});
