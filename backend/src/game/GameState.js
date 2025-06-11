// backend/src/game/GameState.js
const { v4: uuidv4 } = require('uuid');
const Deck = require('./Deck');
const { evaluateHand, validateOverallHand, compareEvaluatedHands } = require('./HandEvaluator');

const MAX_PLAYERS = 4; // Max 4 players
const AI_NAMES = ["机器人A", "机器人B", "机器人C", "机器人D"];
const AI_THINKING_TIME = [1800, 2200, 2600, 3000]; // ms, for random AI delay

/**
 * 辅助函数：按rank从大到小排序
 */
function sortByRankDesc(cards) {
    return [...cards].sort((a, b) => b.value - a.value);
}

/**
 * 简单AI理牌算法：
 * 1. 按点数从大到小排序
 * 2. 尾道优先放最大对子/三条/顺子/同花，否则最大单张
 * 3. 中道找次大对子或顺子，否则次强单张
 * 4. 剩下给头道
 * 尽量保证不乌龙，但不保证最优
 */
function aiSmartArrange(cards) {
    let remain = sortByRankDesc(cards);
    const used = new Set();

    // 简单找对子/三条/顺子/同花
    function findBestGroup(cards, count) {
        // 先找三条、再对子
        let counts = {};
        for (let c of cards) counts[c.value] = (counts[c.value] || 0) + 1;
        let trip = Object.entries(counts).find(([v, ct]) => ct >= 3);
        if (trip) {
            let group = cards.filter(c => c.value == trip[0]).slice(0, 3);
            if (group.length >= count) return group.slice(0, count);
        }
        // 再找对子
        let pair = Object.entries(counts).find(([v, ct]) => ct >= 2);
        if (pair) {
            let group = cards.filter(c => c.value == pair[0]).slice(0, 2);
            if (group.length >= count) return group.slice(0, count);
        }
        // 没对子三条就取最大单牌
        return cards.slice(0, count);
    }

    // 尾道优先找三条/对子
    let back = findBestGroup(remain, 5);
    // 补足5张
    if (back.length < 5) {
        let need = 5 - back.length;
        let others = remain.filter(c => !back.includes(c)).slice(0, need);
        back = back.concat(others);
    }
    back.forEach(c => used.add(c));

    // 中道再找三条/对子
    let remainMid = remain.filter(c => !used.has(c));
    let middle = findBestGroup(remainMid, 5);
    if (middle.length < 5) {
        let need = 5 - middle.length;
        let others = remainMid.filter(c => !middle.includes(c)).slice(0, need);
        middle = middle.concat(others);
    }
    middle.forEach(c => used.add(c));

    // 剩下的给头道
    let front = remain.filter(c => !used.has(c)).slice(0, 3);

    // 兜底处理，保证各道数量
    if (front.length < 3) {
        let allUsed = new Set([...back, ...middle]);
        front = remain.filter(c => !allUsed.has(c)).slice(0, 3);
    }

    // 尝试保证不乌龙，如果有问题则随机分配兜底
    try {
        const evalFront = evaluateHand(front);
        const evalMiddle = evaluateHand(middle);
        const evalBack = evaluateHand(back);
        if (!validateOverallHand(evalFront, evalMiddle, evalBack)) {
            throw new Error('AI理牌结果乌龙，降级为随机分配');
        }
    } catch (e) {
        // fallback: 随机分配
        let shuffled = [...cards].sort(() => Math.random() - 0.5);
        return {
            front: shuffled.slice(0, 3),
            middle: shuffled.slice(3, 8),
            back: shuffled.slice(8, 13)
        };
    }

    return { front, middle, back };
}

class GameState {
    constructor() {
        this.rooms = {};
        this.timers = {}; // roomId => { playerId: timerObj }
    }

    createRoom(hostId, hostName) {
        const roomId = uuidv4().substring(0, 6).toUpperCase();
        this.rooms[roomId] = {
            id: roomId,
            players: [],
            deck: new Deck(),
            status: 'waiting',
            hostId: hostId,
            turnTimeout: null,
            playerHands: {},
            comparisonResults: null,
            timeLeft: {}, // 新增：每个玩家剩余倒计时
        };
        this.addPlayerToRoom(roomId, hostId, hostName);
        return this.rooms[roomId];
    }

    getRoom(roomId) {
        return this.rooms[roomId];
    }

    // --- AI相关 ---
    addAIPlayer(roomId) {
        const room = this.getRoom(roomId);
        if (!room) return { error: "Room not found" };
        if (room.players.length >= MAX_PLAYERS) return { error: "Room full" };

        // 生成唯一AI名
        let aiName = AI_NAMES[room.players.filter(p => p.isAI).length] || `电脑${room.players.length + 1}`;
        let aiId = `AI_${uuidv4().slice(0,8)}`;
        const aiPlayer = {
            id: aiId,
            name: aiName,
            isAI: true,
            isReady: false,
            score: 0,
            roundPoints: 0,
            cards: [],
        };
        room.players.push(aiPlayer);
        return { room, aiId };
    }

    addPlayerToRoom(roomId, playerId, playerName, opts = {}) {
        const room = this.getRoom(roomId);
        if (!room) return { error: "Room not found" };
        if (room.players.length >= MAX_PLAYERS) return { error: "Room is full" };
        if (room.players.find(p => p.id === playerId)) return { error: "Player already in room" };

        const player = {
            id: playerId,
            name: playerName || `Player ${playerId.substring(0, 4)}`,
            cards: [],
            isReady: false,
            score: 0,
            roundPoints: 0,
            isAI: opts.isAI || playerId.startsWith('AI_'),
        };
        room.players.push(player);
        return { room };
    }

    removePlayerFromRoom(roomId, playerId) {
        const room = this.getRoom(roomId);
        if (!room) return;

        room.players = room.players.filter(p => p.id !== playerId);
        delete room.playerHands[playerId];
        delete room.timeLeft?.[playerId];

        if (room.players.length === 0) {
            delete this.rooms[roomId];
            delete this.timers[roomId];
            return { roomDeleted: true };
        }
        if (room.hostId === playerId && room.players.length > 0) {
            room.hostId = room.players[0].id;
        }
        return { room };
    }

    setPlayerReady(roomId, playerId, isReady) {
        const room = this.getRoom(roomId);
        if (!room) return { error: "Room not found" };
        const player = room.players.find(p => p.id === playerId);
        if (!player) return { error: "Player not found" };
        player.isReady = isReady;

        // AI自动准备
        if (player.isAI) player.isReady = true;

        const readyPlayers = room.players.filter(p => p.isReady);
        if (readyPlayers.length === room.players.length && room.players.length >= 2) {
            this.startGame(roomId);
            return { room, gameStarted: true };
        }
        return { room, gameStarted: false };
    }

    // --- 游戏流程 ---
    startGame(roomId) {
        const room = this.getRoom(roomId);
        if (!room || room.status !== 'waiting') return { error: "Cannot start game" };

        room.status = 'dealing';
        room.deck.reset();
        room.deck.shuffle();
        room.playerHands = {};
        room.comparisonResults = null;
        room.timeLeft = {};

        room.players.forEach(player => {
            player.cards = room.deck.deal(13);
            player.isReady = false;
            room.playerHands[player.id] = {
                front: [], middle: [], back: [],
                submitted: false,
                isDaGong: false,
                isQuanLeiDa: false,
                isWuLong: false,
                evaluated: {}
            };
        });
        room.status = 'playing';
        this.startTurnTimers(roomId);
    }

    startTurnTimers(roomId) {
        // 每人30s倒计时，AI自动提交
        const room = this.getRoom(roomId);
        if (!room) return;
        if (!this.timers[roomId]) this.timers[roomId] = {};
        room.players.forEach(player => {
            this.clearTurnTimer(roomId, player.id);
            const isAI = player.isAI;
            let duration = isAI ? (AI_THINKING_TIME[Math.floor(Math.random()*AI_THINKING_TIME.length)]) : 30000;
            room.timeLeft[player.id] = duration;
            // 设置倒计时
            this.timers[roomId][player.id] = setTimeout(() => {
                this.handleTimeout(roomId, player.id);
            }, duration);

            // AI自动理牌（优化后）
            if (isAI) {
                setTimeout(() => {
                    if (room.playerHands[player.id] && !room.playerHands[player.id].submitted) {
                        const hand = aiSmartArrange(player.cards);
                        this.submitPlayerHand(roomId, player.id, hand);
                        this.clearTurnTimer(roomId, player.id);
                    }
                }, duration - 400); // 比剩余时间略早提交
            }
        });

        // 开启tick定时器
        if (!this.timers[roomId]._interval) {
            this.timers[roomId]._interval = setInterval(() => {
                let changed = false;
                room.players.forEach(player => {
                    if (room.timeLeft[player.id] > 0 && !room.playerHands[player.id].submitted) {
                        room.timeLeft[player.id] -= 1000;
                        if (room.timeLeft[player.id] < 0) room.timeLeft[player.id] = 0;
                        changed = true;
                    }
                });
                if (changed && this.onTimeLeftUpdate) this.onTimeLeftUpdate(roomId, room.timeLeft);
            }, 1000);
        }
    }

    clearTurnTimer(roomId, playerId) {
        if (this.timers[roomId] && this.timers[roomId][playerId]) {
            clearTimeout(this.timers[roomId][playerId]);
            delete this.timers[roomId][playerId];
        }
    }

    clearAllTimers(roomId) {
        if (!this.timers[roomId]) return;
        Object.values(this.timers[roomId]).forEach(timer => clearTimeout(timer));
        if (this.timers[roomId]._interval) clearInterval(this.timers[roomId]._interval);
        delete this.timers[roomId];
    }

    handleTimeout(roomId, playerId) {
        // 超时自动生成乌龙牌并提交
        const room = this.getRoom(roomId);
        if (!room) return;
        const player = room.players.find(p => p.id === playerId);
        if (!player) return;
        if (room.playerHands[playerId].submitted) return;
        const hand = this.generateWuLongHand(player.cards);
        this.submitPlayerHand(roomId, playerId, hand);
    }

    generateWuLongHand(cards) {
        // 简单分配为乌龙：按顺序分配
        const front = cards.slice(0, 3);
        const middle = cards.slice(3, 8);
        const back = cards.slice(8, 13);
        return { front, middle, back };
    }

    // 已废弃（AI理牌现在用aiSmartArrange）
    aiArrangeHand(cards) {
        let shuffled = [...cards].sort(() => Math.random() - 0.5);
        return {
            front: shuffled.slice(0, 3),
            middle: shuffled.slice(3, 8),
            back: shuffled.slice(8, 13)
        };
    }

    submitPlayerHand(roomId, playerId, { front, middle, back }) {
        const room = this.getRoom(roomId);
        if (!room || room.status !== 'playing') return { error: "Game not in playing state" };
        const playerHandData = room.playerHands[playerId];
        if (!playerHandData || playerHandData.submitted) return { error: "Hand already submitted or player not found" };

        if (front.length !== 3 || middle.length !== 5 || back.length !== 5) {
            return { error: "Invalid hand segment lengths." };
        }
        const player = room.players.find(p=>p.id === playerId);
        const allSubmittedCards = [...front, ...middle, ...back];
        if (allSubmittedCards.length !== 13) return { error: "Must submit exactly 13 cards."};
        const dealtCardIds = new Set(player.cards.map(c => c.id));
        const submittedCardIds = new Set(allSubmittedCards.map(c => c.id));
        if (dealtCardIds.size !== submittedCardIds.size) return {error: "Submitted cards don't match dealt cards."};
        for(const id of submittedCardIds){
            if(!dealtCardIds.has(id)) return {error: "Submitted cards contain invalid cards."};
        }

        playerHandData.front = front;
        playerHandData.middle = middle;
        playerHandData.back = back;

        try {
            playerHandData.evaluated.front = evaluateHand(front);
            playerHandData.evaluated.middle = evaluateHand(middle);
            playerHandData.evaluated.back = evaluateHand(back);
        } catch (e) {
            console.error("Error evaluating hand:", e.message);
            return { error: `Error evaluating hand: ${e.message}` };
        }
        playerHandData.isWuLong = !validateOverallHand(
            playerHandData.evaluated.front,
            playerHandData.evaluated.middle,
            playerHandData.evaluated.back
        );
        playerHandData.submitted = true;
        this.clearTurnTimer(roomId, playerId);

        // 检查是否全部提交
        const allSubmitted = room.players.every(p => room.playerHands[p.id] && room.playerHands[p.id].submitted);
        if (allSubmitted) {
            this.clearAllTimers(roomId);
            this.compareAllHands(roomId);
            room.status = 'comparing';
        }
        return { room, allSubmitted };
    }

    compareAllHands(roomId) {
        // ...（原有逻辑不变）
        const room = this.getRoom(roomId);
        if (!room) return;
        // ...保持原有比牌和计分逻辑...
        // 结算时可清理倒计时
        this.clearAllTimers(roomId);
        room.status = 'finished';
    }

    // --- 新增：服务端倒计时推送 ---
    getSanitizedRoom(roomId) {
        const room = this.getRoom(roomId);
        if (!room) return null;
        const sanitizedRoom = JSON.parse(JSON.stringify(room));
        delete sanitizedRoom.deck;
        return sanitizedRoom;
    }
}

module.exports = new GameState();
