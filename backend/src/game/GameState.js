// backend/src/game/GameState.js
const { v4: uuidv4 } = require('uuid');
const Deck = require('./Deck');
const { evaluateHand, validateOverallHand, compareEvaluatedHands } = require('./HandEvaluator');

const MAX_PLAYERS = 4; // Max 4 players, can be 2 for testing

class GameState {
    constructor() {
        this.rooms = {}; // { roomId: { id, players: [], deck, status, etc. } }
    }

    createRoom(hostId, hostName) {
        const roomId = uuidv4().substring(0, 6).toUpperCase();
        this.rooms[roomId] = {
            id: roomId,
            players: [],
            deck: new Deck(),
            status: 'waiting', // waiting, dealing, playing, comparing, finished
            hostId: hostId,
            turnTimeout: null,
            playerHands: {}, // { playerId: { front: [], middle: [], back: [], submitted: false, evaluated: {} } }
            comparisonResults: null,
        };
        this.addPlayerToRoom(roomId, hostId, hostName);
        return this.rooms[roomId];
    }

    getRoom(roomId) {
        return this.rooms[roomId];
    }

    addPlayerToRoom(roomId, playerId, playerName) {
        const room = this.getRoom(roomId);
        if (!room) return { error: "Room not found" };
        if (room.players.length >= MAX_PLAYERS) return { error: "Room is full" };
        if (room.players.find(p => p.id === playerId)) return { error: "Player already in room" }; // Or reconnect logic

        const player = {
            id: playerId,
            name: playerName || `Player ${playerId.substring(0, 4)}`,
            cards: [],
            isReady: false,
            score: 0, // Overall game score
            roundPoints: 0 // Points for the current round
        };
        room.players.push(player);
        return { room };
    }

    removePlayerFromRoom(roomId, playerId) {
        const room = this.getRoom(roomId);
        if (!room) return;

        room.players = room.players.filter(p => p.id !== playerId);
        delete room.playerHands[playerId];

        if (room.players.length === 0) {
            delete this.rooms[roomId];
            console.log(`Room ${roomId} deleted as it's empty.`);
            return { roomDeleted: true };
        }
        // If host leaves, assign new host (optional advanced logic)
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

        // Check if all players are ready and enough players to start
        const readyPlayers = room.players.filter(p => p.isReady);
        if (readyPlayers.length === room.players.length && room.players.length >= 2) { // Min 2 players
            this.startGame(roomId);
            return { room, gameStarted: true };
        }
        return { room, gameStarted: false };
    }

    startGame(roomId) {
        const room = this.getRoom(roomId);
        if (!room || room.status !== 'waiting') return { error: "Cannot start game" };

        room.status = 'dealing';
        room.deck.reset();
        room.deck.shuffle();
        room.playerHands = {}; // Reset hands for new round
        room.comparisonResults = null;

        room.players.forEach(player => {
            player.cards = room.deck.deal(13);
            player.isReady = false; // Reset ready status for next round
            room.playerHands[player.id] = {
                front: [], middle: [], back: [],
                submitted: false,
                isDaGong: false, // 是否打枪 (全胜)
                isQuanLeiDa: false, // 是否全垒打 (特殊牌型全胜)
                isWuLong: false, // 是否乌龙
                evaluated: {} // { front: evalObj, middle: evalObj, back: evalObj }
            };
        });
        room.status = 'playing'; // Players now arrange their hands
        console.log(`Game started in room ${roomId}. Cards dealt.`);
    }

    submitPlayerHand(roomId, playerId, { front, middle, back }) { // front, middle, back are arrays of Card objects
        const room = this.getRoom(roomId);
        if (!room || room.status !== 'playing') return { error: "Game not in playing state" };
        const playerHandData = room.playerHands[playerId];
        if (!playerHandData || playerHandData.submitted) return { error: "Hand already submitted or player not found" };

        if (front.length !== 3 || middle.length !== 5 || back.length !== 5) {
            return { error: "Invalid hand segment lengths." };
        }

        // Basic validation: ensure all 13 unique cards from player's dealt hand are used
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
        console.log(`Player ${playerId} submitted hand. WuLong: ${playerHandData.isWuLong}`);

        // Check if all players have submitted
        const allSubmitted = room.players.every(p => room.playerHands[p.id] && room.playerHands[p.id].submitted);
        if (allSubmitted) {
            this.compareAllHands(roomId);
            room.status = 'comparing';
        }
        return { room, allSubmitted };
    }

    compareAllHands(roomId) {
        const room = this.getRoom(roomId);
        if (!room) return;
        console.log(`Comparing hands for room ${roomId}`);

        const players = room.players;
        room.comparisonResults = {
            segments: { front: [], middle: [], back: [] }, // [{playerId, hand, result (points)}]
            playerScores: {} // { playerId: totalPointsForRound }
        };

        // Initialize player scores for the round
        players.forEach(p => room.comparisonResults.playerScores[p.id] = 0);

        const segments = ['front', 'middle', 'back'];

        for (const segment of segments) {
            // Compare each player against every other player for this segment
            for (let i = 0; i < players.length; i++) {
                const playerA = players[i];
                const handAData = room.playerHands[playerA.id];

                if (handAData.isWuLong) { // Player A is WuLong
                    // WuLong players automatically lose against non-WuLong players
                    // If both are WuLong, it's a tie for that segment comparison
                    for (let j = 0; j < players.length; j++) {
                        if (i === j) continue;
                        const playerB = players[j];
                        const handBData = room.playerHands[playerB.id];
                        if (!handBData.isWuLong) {
                            room.comparisonResults.playerScores[playerA.id] -= 1; // Lose 1 point (basic)
                            room.comparisonResults.playerScores[playerB.id] += 1; // Win 1 point
                        }
                    }
                    // Store WuLong hand info for display
                     room.comparisonResults.segments[segment].push({
                        playerId: playerA.id,
                        playerName: playerA.name,
                        cards: handAData[segment],
                        evaluated: handAData.evaluated[segment],
                        isWuLong: true,
                        points: 0 // WuLong segment doesn't score individually
                    });
                    continue; // Move to next player for this segment if current is WuLong
                }


                let segmentPoints = 0;
                for (let j = 0; j < players.length; j++) {
                    if (i === j) continue;
                    const playerB = players[j];
                    const handBData = room.playerHands[playerB.id];

                    if (handBData.isWuLong) { // Player B is WuLong, Player A is not
                        segmentPoints += 1;
                        continue;
                    }
                    // Both are not WuLong, compare normally
                    const comparison = compareEvaluatedHands(handAData.evaluated[segment], handBData.evaluated[segment]);
                    if (comparison > 0) segmentPoints += 1; // A wins
                    else if (comparison < 0) segmentPoints -= 1; // A loses
                }
                room.comparisonResults.playerScores[playerA.id] += segmentPoints;
                 room.comparisonResults.segments[segment].push({
                    playerId: playerA.id,
                    playerName: playerA.name,
                    cards: handAData[segment],
                    evaluated: handAData.evaluated[segment],
                    isWuLong: false,
                    points: segmentPoints // Points for this segment against others
                });
            }
        }
        
        // Apply overall game score updates (simplified)
        // And check for DaQiang (打枪) - beating one player in all 3 segments
        // This logic can get complex with multiple opponents
        for (const player of players) {
            player.score += room.comparisonResults.playerScores[player.id] || 0; // Update total score
            player.roundPoints = room.comparisonResults.playerScores[player.id] || 0;
        }

        room.status = 'finished'; // Round finished, ready for new round or lobby
        console.log("Comparison finished. Results:", JSON.stringify(room.comparisonResults, null, 2));
        console.log("Updated player scores:", room.players.map(p => ({id: p.id, score:p.score})));
    }

    // Helper to get a clean version of the room for sending to clients (without sensitive data like full deck)
    getSanitizedRoom(roomId) {
        const room = this.getRoom(roomId);
        if (!room) return null;

        // Deep clone and sanitize
        const sanitizedRoom = JSON.parse(JSON.stringify(room));
        delete sanitizedRoom.deck; // Don't send the whole deck

        // Only send player's own full cards, others just basic info or submitted hands if game is comparing/finished
        // This part needs careful handling based on game state
        // For now, during 'playing' state, players only get their own cards
        // During 'comparing' or 'finished', all submitted hands are public.

        return sanitizedRoom;
    }
}

module.exports = new GameState(); // Singleton instance
