// server/services/gameLogic.service.js
const cardService = require('./card.service');
const db = require("../models"); // For updating scores and game records
const User = db.User;
const RoundPlayerData = db.RoundPlayerData;
const GameRound = db.GameRound;
const GameTable = db.GameTable;

/**
 * Calculates scores between two evaluated player hands.
 * @param {object} p1Data - { arranged_eval, all_cards, special_type, user_id }
 * @param {object} p2Data - { arranged_eval, all_cards, special_type, user_id }
 * @returns {object} { p1ScoreChange, p2ScoreChange, details: [], segmentResults: {}, p1SpecialName, p2SpecialName }
 */
function calculatePlayerScores(p1Data, p2Data) {
    // TODO: Translate your PHP calculateScores logic here.
    // This will use cardService.compareEvaluatedHands for each segment.
    // It needs to handle:
    // 1. Overall special hand settlement first (p1Data.special_type vs p2Data.special_type)
    // 2. If no overriding special hands, compare each of the three segments.
    // 3. Calculate points for each segment, including bonuses for specific hand types in segments.
    // 4. Check for "打枪" (scoop) and double points.

    console.log("Calculating scores between:", p1Data.user_id, "and", p2Data.user_id);
    // Placeholder result:
    let p1ScoreChange = 0;
    let p2ScoreChange = 0;
    const details = [];
    const segmentResults = {};
    
    const p1SpecialName = cardService.getSpecialHandName(p1Data.special_type);
    const p2SpecialName = cardService.getSpecialHandName(p2Data.special_type);

     // Simplified special hand logic (winner takes all based on predefined scores)
     const overallSpecialHandScores = {
         [cardService.SPECIAL_HAND_TYPE.THIRTEEN_UNIQUE_FLUSH]: 26,
         [cardService.SPECIAL_HAND_TYPE.ONE_DRAGON]: 13,
         [cardService.SPECIAL_HAND_TYPE.THREE_FLUSHES]: 6,
         [cardService.SPECIAL_HAND_TYPE.THREE_STRAIGHTS]: 6,
         [cardService.SPECIAL_HAND_TYPE.SIX_PAIRS_HALF]: 4,
     };

     const p1SpecialValue = overallSpecialHandScores[p1Data.special_type] || 0;
     const p2SpecialValue = overallSpecialHandScores[p2Data.special_type] || 0;

     if (p1SpecialValue > 0 || p2SpecialValue > 0) {
         if (p1SpecialValue > p2SpecialValue) {
             p1ScoreChange = p1SpecialValue;
             p2ScoreChange = -p1SpecialValue;
             details.push(`玩家 ${p1Data.user_id} (${p1SpecialName}) 胜过 玩家 ${p2Data.user_id} (${p2SpecialName || '普通牌'})，赢得 ${p1SpecialValue} 分。`);
         } else if (p2SpecialValue > p1SpecialValue) {
             p2ScoreChange = p2SpecialValue;
             p1ScoreChange = -p2SpecialValue;
             details.push(`玩家 ${p2Data.user_id} (${p2SpecialName}) 胜过 玩家 ${p1Data.user_id} (${p1SpecialName || '普通牌'})，赢得 ${p2SpecialValue} 分。`);
         } else { // Same special hand strength (or both none but one has a value, which shouldn't happen if logic is correct)
              details.push(`双方特殊牌型 (${p1SpecialName}) 等级相同或无效比较，按普通道结算。`);
              // Fall through to regular comparison if special hands are equal or one is minor and doesn't auto-win
              gotoRegularComparison = true;
         }
         if(!gotoRegularComparison) {
             return { p1ScoreChange, p2ScoreChange, details, segmentResults, p1SpecialName, p2SpecialName};
         }
     }

    // Regular comparison if no overriding special hands
    let p1SegmentWins = 0;
    let p2SegmentWins = 0;
    const segments = ['first', 'middle', 'last'];
    const specialSegmentScores = { /* ... (same as your PHP version) ... */ };


    for (const segment of segments) {
        const p1Eval = p1Data.arranged_eval[segment];
        const p2Eval = p2Data.arranged_eval[segment];
        const comparison = cardService.compareEvaluatedHands(p1Eval, p2Eval);
        // ... (Logic for segment win/loss, bonus points, add to details) ...
        // This part needs careful translation from your PHP version.
         let baseSegmentScore = 1;
         let p1Bonus = 0; let p2Bonus = 0;
         const p1SegName = p1Eval?.name || 'N/A';
         const p2SegName = p2Eval?.name || 'N/A';

         if (comparison > 0) { 
             p1SegmentWins++; segmentResults[segment] = 'p1_wins';
             // if (specialSegmentScores[segment]?.[p1Eval.type]) p1Bonus = specialSegmentScores[segment][p1Eval.type];
             let currentSegmentScore = baseSegmentScore + p1Bonus;
             p1ScoreChange += currentSegmentScore; p2ScoreChange -= currentSegmentScore;
             details.push(`${segment}: P1 +${currentSegmentScore} [${p1SegName}] vs [${p2SegName}]`);
         } else if (comparison < 0) {
             p2SegmentWins++; segmentResults[segment] = 'p2_wins';
             // if (specialSegmentScores[segment]?.[p2Eval.type]) p2Bonus = specialSegmentScores[segment][p2Eval.type];
             let currentSegmentScore = baseSegmentScore + p2Bonus;
             p2ScoreChange += currentSegmentScore; p1ScoreChange -= currentSegmentScore;
             details.push(`${segment}: P2 +${currentSegmentScore} [${p2SegName}] vs [${p1SegName}]`);
         } else {
             segmentResults[segment] = 'draw';
             details.push(`${segment}: 平局 [${p1SegName}] vs [${p2SegName}]`);
         }
    }

    if (p1SegmentWins === 3 && p2SegmentWins === 0) {
        details.push("P1 打枪! 道积分翻倍.");
        p1ScoreChange *= 2; p2ScoreChange *= 2;
    } else if (p2SegmentWins === 3 && p1SegmentWins === 0) {
        details.push("P2 打枪! 道积分翻倍.");
        p2ScoreChange *= 2; p1ScoreChange *= 2;
    }


    return { p1ScoreChange, p2ScoreChange, details, segmentResults, p1SpecialName, p2SpecialName };
}

/**
 * Finalizes a game round: calculates scores, updates DB, prepares results for client.
 * @param {string} roomId
 * @param {string} roundId
 * @returns {Promise<object|null>} The results to be broadcasted, or null on failure.
 */
async function finalizeRound(roomId, roundId) {
     // 1. Fetch all player data for this round from DB (arranged_hand, hand_dealt, user_id, special_hand_type)
     // 2. For each pair of players (or all players if > 2), call calculatePlayerScores.
     //    For >2 players, score calculation is sum of head-to-head results.
     //    e.g., P1 vs P2, P1 vs P3. P1's total change is sum from these.
     // 3. Start a DB transaction.
     // 4. Update each player's total_score in Users table.
     // 5. Update score_change in RoundPlayerData table for each player.
     // 6. Update games_played, games_won in Users table.
     // 7. Update GameRound table with end_time and a snapshot of results.
     // 8. Update GameTable status to 'finished'.
     // 9. Reset is_ready for players in TablePlayers for this table.
     // 10. Commit transaction.
     // 11. Format and return the results object for broadcasting.
     console.log(`Finalizing round ${roundId} for room ${roomId}`);
     // This is a complex function that needs full implementation
     // Placeholder:
     return {
         message: "Round finalized (placeholder)",
         player_details: { /* detailed results for each player */ },
         score_details: ["Game finished (placeholder details)"],
         segment_results: {}, // if applicable
     };
}

 /**
 * AI Logic to arrange cards.
 * @param {Card[]} hand - Array of 13 Card objects.
 * @returns {object|null} { first: Card[], middle: Card[], last: Card[] } or null
 */
function runAIArrangementLogic(hand) {
     // TODO: Translate your PHP AI logic (runAIArrangementLogic) to JavaScript.
     // This will involve shuffling, trying combinations, validating, and evaluating.
     console.log("AI is arranging cards (placeholder logic)");
     if (hand.length !== 13) return null;
     // Placeholder: just a valid (but likely bad) arrangement
     return {
         first: hand.slice(0, 3),
         middle: hand.slice(3, 8),
         last: hand.slice(8, 13)
     };
}


module.exports = {
    calculatePlayerScores,
    finalizeRound,
    runAIArrangementLogic
};
