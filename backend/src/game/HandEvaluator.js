// backend/src/game/HandEvaluator.js
const { RANK_VALUES } = require('./Card');

// 牌型常量 (值越大牌型越大)
const HAND_TYPES = {
    HIGH_CARD: 1,
    ONE_PAIR: 2,
    TWO_PAIR: 3,
    THREE_OF_A_KIND: 4,
    STRAIGHT: 5,
    FLUSH: 6,
    FULL_HOUSE: 7,
    FOUR_OF_A_KIND: 8,
    STRAIGHT_FLUSH: 9,
    // 十三水特殊牌型 (同花十三水/一条龙, 三同花顺等, 此处简化)
};

function evaluateHand(cards) { // cards is an array of Card objects
    if (!cards || (cards.length !== 3 && cards.length !== 5)) {
        throw new Error("Hand must have 3 or 5 cards.");
    }

    cards.sort((a, b) => a.value - b.value); // Sort by rank value

    const isFlush = cards.every(card => card.suit === cards[0].suit);
    const isStraight = (() => {
        for (let i = 0; i < cards.length - 1; i++) {
            if (cards[i+1].value !== cards[i].value + 1) {
                 // Handle A-2-3-4-5 straight (Ace as 1)
                if (cards[cards.length - 1].rank === 'ace' && cards[0].rank === '2' && cards.length === 5) {
                    const tempCards = cards.slice(0, -1).map(c => c.value);
                    if (tempCards.join(',') === '2,3,4,5') return true;
                }
                return false;
            }
        }
        return true;
    })();

    const counts = cards.reduce((acc, card) => {
        acc[card.value] = (acc[card.value] || 0) + 1;
        return acc;
    }, {});

    const frequencies = Object.values(counts).sort((a, b) => b - a);
    const rankValuesForTieBreaking = cards.map(c => c.value).sort((a,b) => b-a); // highest to lowest

    if (isStraight && isFlush) {
        return { type: HAND_TYPES.STRAIGHT_FLUSH, name: "同花顺", primaryRank: rankValuesForTieBreaking[0], ranks: rankValuesForTieBreaking };
    }
    if (frequencies[0] === 4) {
        const fourKindRank = parseInt(Object.keys(counts).find(k => counts[k] === 4));
        const kicker = parseInt(Object.keys(counts).find(k => counts[k] === 1));
        return { type: HAND_TYPES.FOUR_OF_A_KIND, name: "铁支", primaryRank: fourKindRank, kicker: kicker, ranks: [fourKindRank, kicker] };
    }
    if (frequencies[0] === 3 && frequencies[1] === 2) {
        const threeKindRank = parseInt(Object.keys(counts).find(k => counts[k] === 3));
        const pairRank = parseInt(Object.keys(counts).find(k => counts[k] === 2));
        return { type: HAND_TYPES.FULL_HOUSE, name: "葫芦", primaryRank: threeKindRank, secondaryRank: pairRank, ranks: [threeKindRank, pairRank] };
    }
    if (isFlush) {
        return { type: HAND_TYPES.FLUSH, name: "同花", ranks: rankValuesForTieBreaking };
    }
    if (isStraight) {
        // For A-2-3-4-5, highest card is 5 for comparison purposes, not Ace.
        const primaryRank = (cards[cards.length - 1].rank === 'ace' && cards[0].rank === '2') ? RANK_VALUES['5'] : rankValuesForTieBreaking[0];
        return { type: HAND_TYPES.STRAIGHT, name: "顺子", primaryRank: primaryRank, ranks: rankValuesForTieBreaking };
    }
    if (frequencies[0] === 3) {
        const threeKindRank = parseInt(Object.keys(counts).find(k => counts[k] === 3));
        const kickers = cards.filter(c => c.value !== threeKindRank).map(c => c.value).sort((a,b) => b-a);
        return { type: HAND_TYPES.THREE_OF_A_KIND, name: "三条", primaryRank: threeKindRank, kickers: kickers, ranks: [threeKindRank, ...kickers] };
    }
    if (frequencies[0] === 2 && frequencies[1] === 2) {
        const pairs = Object.keys(counts).filter(k => counts[k] === 2).map(Number).sort((a,b) => b-a);
        const kicker = cards.find(c => c.value !== pairs[0] && c.value !== pairs[1]).value;
        return { type: HAND_TYPES.TWO_PAIR, name: "两对", primaryRank: pairs[0], secondaryRank: pairs[1], kicker: kicker, ranks: [...pairs, kicker] };
    }
    if (frequencies[0] === 2) {
        const pairRank = parseInt(Object.keys(counts).find(k => counts[k] === 2));
        const kickers = cards.filter(c => c.value !== pairRank).map(c => c.value).sort((a,b) => b-a);
        return { type: HAND_TYPES.ONE_PAIR, name: "一对", primaryRank: pairRank, kickers: kickers, ranks: [pairRank, ...kickers] };
    }
    return { type: HAND_TYPES.HIGH_CARD, name: "散牌", ranks: rankValuesForTieBreaking };
}

// Compare two evaluated hands (handA, handB are results from evaluateHand)
function compareEvaluatedHands(handA, handB) {
    if (handA.type !== handB.type) {
        return handA.type > handB.type ? 1 : -1; // 1 if A > B, -1 if B > A
    }
    // Same type, compare by ranks
    for (let i = 0; i < handA.ranks.length; i++) {
        if (handA.ranks[i] !== handB.ranks[i]) {
            return handA.ranks[i] > handB.ranks[i] ? 1 : -1;
        }
    }
    return 0; // Tie
}

// Validates if player's submitted hands (front, middle, back) are in correct order of strength
// Returns true if valid, false otherwise (乌龙)
function validateOverallHand(evaluatedFront, evaluatedMiddle, evaluatedBack) {
    const frontMiddleComparison = compareEvaluatedHands(evaluatedMiddle, evaluatedFront);
    const middleBackComparison = compareEvaluatedHands(evaluatedBack, evaluatedMiddle);
    // Middle must be >= Front, Back must be >= Middle
    // If equal, still valid (though some rules might penalize this depending on house rules)
    // For simplicity, we allow equality as long as they are not "stronger then weaker"
    return frontMiddleComparison >= 0 && middleBackComparison >= 0;
}


module.exports = { evaluateHand, compareEvaluatedHands, validateOverallHand, HAND_TYPES };
