document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://wenge.cloudns.ch/api/game.php'; // 你的后端API地址
    const CARD_IMG_PATH = './cards/'; // 卡牌图片路径

    const startGameBtn = document.getElementById('startGameBtn');
    const resetGameBtn = document.getElementById('resetGameBtn');
    const submitArrangementBtn = document.getElementById('submitArrangementBtn');
    
    const player1HandDiv = document.getElementById('player1Hand');
    const arrangementZonesDivs = {
        first: document.querySelector('#firstHead .cards-in-zone'),
        middle: document.querySelector('#middleWay .cards-in-zone'),
        last: document.querySelector('#lastWay .cards-in-zone')
    };
    const messagesDiv = document.getElementById('messages');
    
    const player1ArrangedDisplay = document.getElementById('player1ArrangedDisplay');
    const player2ArrangedDisplay = document.getElementById('player2ArrangedDisplay');
    const resultsArea = document.getElementById('resultsArea');


    let selectedPlayerCard = null; // 当前玩家选中的手牌元素
    let playerHand = []; // 存放玩家手牌对象 {suit, rank, value, image}
    let arrangedCards = { first: [], middle: [], last: [] }; // 存放已摆放的牌的 image 名称

    // --- Helper Functions ---
    function showMessage(text, type = 'info') {
        messagesDiv.textContent = text;
        messagesDiv.className = type; // 'info' or 'error'
    }

    function createCardElement(cardData) { // cardData = {image: 'ace_of_spades.svg', ...}
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        cardDiv.dataset.image = cardData.image; // 存储图片名，用于提交
        
        const img = document.createElement('img');
        img.src = CARD_IMG_PATH + cardData.image;
        img.alt = cardData.image.replace('_of_', ' ').replace('.svg', '');
        cardDiv.appendChild(img);
        return cardDiv;
    }

    function renderPlayerHand(handCards) { // handCards = array of cardData objects
        player1HandDiv.innerHTML = '';
        playerHand = handCards; // 更新全局手牌数据
        handCards.forEach(cardData => {
            const cardEl = createCardElement(cardData);
            cardEl.addEventListener('click', () => handlePlayerCardClick(cardEl, cardData));
            player1HandDiv.appendChild(cardEl);
        });
    }

    function renderArrangedZone(zoneName) { // zoneName = 'first', 'middle', 'last'
         const zoneDiv = arrangementZonesDivs[zoneName];
         zoneDiv.innerHTML = '';
         arrangedCards[zoneName].forEach(cardImage => {
             const cardEl = createCardElement({ image: cardImage }); // 只需要 image 来渲染
             // 允许从摆牌区点击移回手牌
             cardEl.addEventListener('click', () => handleArrangedCardClick(cardEl, cardImage, zoneName));
             zoneDiv.appendChild(cardEl);
         });
    }
    
    function displayArrangedHandsAfterCompare(playerDisplayDiv, arrangedData, evalData) {
         // arrangedData: {first: [{image:'...'}]} evalData: {first: {type:0, value:14}}
         playerDisplayDiv.style.display = 'block';
         ['first', 'middle', 'last'].forEach(segment => {
             const cardsContainer = playerDisplayDiv.querySelector(`.${segment}-cards`);
             const evalSpan = playerDisplayDiv.querySelector(`.${segment}-eval`);
             cardsContainer.innerHTML = '';
             if (arrangedData && arrangedData[segment]) {
                 arrangedData[segment].forEach(cardObj => {
                     cardsContainer.appendChild(createCardElement(cardObj));
                 });
             }
             if (evalData && evalData[segment]) {
                 evalSpan.textContent = `(类型: ${getHandTypeName(evalData[segment].type)}, 值: ${evalData[segment].value})`;
             } else {
                 evalSpan.textContent = '(未评估)';
             }
         });
    }

    function getHandTypeName(typeId) {
         const names = ["乌龙", "一对", "两对", "三条", "顺子", "同花", "葫芦", "铁支", "同花顺"];
         return names[typeId] || "未知牌型";
    }


    // --- Event Handlers ---
    function handlePlayerCardClick(cardEl, cardData) {
        if (selectedPlayerCard) {
            selectedPlayerCard.classList.remove('selected');
        }
        if (selectedPlayerCard === cardEl) { // 重复点击取消选择
             selectedPlayerCard = null;
        } else {
            selectedPlayerCard = cardEl;
            selectedPlayerCard.classList.add('selected');
        }
    }

    function handleArrangementZoneClick(zoneName) {
        const zoneDiv = arrangementZonesDivs[zoneName];
        const zoneMaxSize = parseInt(document.getElementById(
            zoneName === 'first' ? 'firstHead' : (zoneName === 'middle' ? 'middleWay' : 'lastWay')
        ).dataset.size);

        if (selectedPlayerCard && arrangedCards[zoneName].length < zoneMaxSize) {
            const cardImage = selectedPlayerCard.dataset.image;
            
            // 从手牌中移除
            playerHand = playerHand.filter(c => c.image !== cardImage);
            selectedPlayerCard.remove();
            selectedPlayerCard = null;

            // 添加到摆牌区
            arrangedCards[zoneName].push(cardImage);
            renderArrangedZone(zoneName);
        } else if (!selectedPlayerCard) {
             showMessage('请先从手牌中选择一张牌', 'error');
        } else if (arrangedCards[zoneName].length >= zoneMaxSize) {
             showMessage(`${zoneName}区已满`, 'error');
        }
    }

    function handleArrangedCardClick(cardEl, cardImage, zoneName) {
         // 从摆牌区移除
         arrangedCards[zoneName] = arrangedCards[zoneName].filter(img => img !== cardImage);
         renderArrangedZone(zoneName); // 重新渲染该区域

         // 将牌添加回手牌数据 (需要原始的cardData对象，而不仅仅是image)
         // 为了简单，我们假设 image 是唯一的，并能从原始牌组找到
         // 实际中，你可能需要一个包含所有卡牌信息的全局列表来恢复它
         // 这里简化：我们知道image，从服务器获取手牌时应该有完整信息
         // 暂时只创建带image的cardData
         const cardDataForHand = { image: cardImage }; // 可能需要从初始手牌中找回完整数据
         playerHand.push(cardDataForHand); 
         renderPlayerHand(playerHand); // 重新渲染手牌
    }


    // --- API Calls ---
    async function fetchApi(action, method = 'GET', body = null) {
        const options = {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include' // 确保session cookie被发送 (如果后端依赖session)
        };
        if (body) {
            options.body = JSON.stringify(body);
        }
        const url = `${API_BASE_URL}?action=${action}`;
        
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error("API call failed:", error);
            showMessage(`API请求失败: ${error.message}`, 'error');
            return { success: false, message: `API请求失败: ${error.message}` };
        }
    }

    async function handleStartGame() {
        const data = await fetchApi('startGame', 'POST');
        if (data.success) {
            showMessage(data.message);
            renderPlayerHand(data.player1_hand); // 后端应返回 player1_hand
            // 重置摆牌区
            arrangedCards = { first: [], middle: [], last: [] };
            renderArrangedZone('first');
            renderArrangedZone('middle');
            renderArrangedZone('last');
            submitArrangementBtn.style.display = 'block';
            player1ArrangedDisplay.style.display = 'none';
            player2ArrangedDisplay.style.display = 'none';
            resultsArea.style.display = 'none';
            document.getElementById('player2Status').textContent = '等待摆牌...';

        } else {
            showMessage(data.message || '开始游戏失败', 'error');
        }
    }

    async function handleSubmitArrangement() {
        // 检查张数是否正确
        if (arrangedCards.first.length !== 3 || 
            arrangedCards.middle.length !== 5 || 
            arrangedCards.last.length !== 5) {
            showMessage('请确保头道3张，中道5张，尾道5张。', 'error');
            return;
        }

        // 确保所有手牌都已摆放 (13张)
        let totalArranged = arrangedCards.first.length + arrangedCards.middle.length + arrangedCards.last.length;
        if (totalArranged !== 13) {
             showMessage(`已摆放 ${totalArranged} 张牌，需要摆放13张。`, 'error');
             return;
        }

        const payload = {
            playerId: 'player1', // 将来可以扩展
            arrangedCards: arrangedCards
        };
        const data = await fetchApi('arrangeCards', 'POST', payload);
        
        if (data.success) {
            showMessage(data.message);
            submitArrangementBtn.style.display = 'none'; // 隐藏提交按钮
            if (data.round_results) { // 如果所有人都已提交，直接显示结果
                displayRoundResults(data.round_results);
            } else {
                // 等待其他玩家... (这里简化，可能需要轮询 getState)
                document.getElementById('player1Area').querySelector('h2').textContent = '我的手牌 (已提交，等待对手)';
            }
        } else {
            showMessage(data.message || '提交摆牌失败', 'error');
        }
    }
    
    function displayRoundResults(results) {
         player1ArrangedDisplay.style.display = 'block';
         player2ArrangedDisplay.style.display = 'block';
         resultsArea.style.display = 'block';

         // results.playerX_cards_eval, results.playerX_arranged_for_display
         displayArrangedHandsAfterCompare(player1ArrangedDisplay, results.player1_arranged_for_display, results.player1_cards_eval);
         displayArrangedHandsAfterCompare(player2ArrangedDisplay, results.player2_arranged_for_display, results.player2_cards_eval);
         
         document.getElementById('roundResultText').textContent = 
             `本局得分: 你 ${results.player1_score_change} vs 对手 ${results.player2_score_change}`;
         document.getElementById('player1TotalScore').textContent = results.player1_total_score;
         document.getElementById('player2TotalScore').textContent = results.player2_total_score;

         document.getElementById('player2Status').textContent = '已亮牌';

         // TODO: 这里可以加一个按钮 "再来一局" 来调用 startGame
    }


    async function handleResetGame() {
        const data = await fetchApi('resetGame', 'POST');
        if (data.success) {
            showMessage(data.message);
            player1HandDiv.innerHTML = '';
            arrangedCards = { first: [], middle: [], last: [] };
            renderArrangedZone('first');
            renderArrangedZone('middle');
            renderArrangedZone('last');
            submitArrangementBtn.style.display = 'none';
            player1ArrangedDisplay.style.display = 'none';
            player2ArrangedDisplay.style.display = 'none';
            resultsArea.style.display = 'none';
            document.getElementById('player1Area').querySelector('h2').textContent = '我的手牌 (玩家1)';
            document.getElementById('player2Status').textContent = '等待中...';

        } else {
            showMessage(data.message || '重置游戏失败', 'error');
        }
    }
    
    // --- Initial Setup ---
    startGameBtn.addEventListener('click', handleStartGame);
    resetGameBtn.addEventListener('click', handleResetGame);
    submitArrangementBtn.addEventListener('click', handleSubmitArrangement);

    Object.keys(arrangementZonesDivs).forEach(zoneName => {
        arrangementZonesDivs[zoneName].parentElement.addEventListener('click', () => handleArrangementZoneClick(zoneName));
        // 给zone父级添加点击事件，使得点击空白区域也能触发
        // 也可以给 .cards-in-zone 添加，看交互需求
    });

    // 初始时可以尝试获取一次游戏状态，如果之前有未完成的游戏
    // fetchApi('getState').then(data => {
    //    if (data.success && data.gameState) {
    //        // 根据 gameState 更新UI (这部分逻辑较复杂，暂时省略)
    //        console.log("Initial game state:", data.gameState);
    //        if (data.gameState.status === 'arranging' && data.gameState.players[0].hand.length > 0) {
    //             // 假设player1是玩家0，并且有手牌，可以渲染
    //             // 需要后端在getState时，如果游戏在进行中，能正确返回当前玩家的手牌
    //        }
    //    }
    // });
    showMessage("欢迎来到十三水！点击“开始新游戏”");
});
