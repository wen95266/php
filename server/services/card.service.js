// --- Constants for Hand Types (mirror PHP defines) ---
const HAND_TYPE = {
    HIGH_CARD: 0, ONE_PAIR: 1, TWO_PAIR: 2, THREE_OF_A_KIND: 3,
    STRAIGHT: 4, FLUSH: 5, FULL_HOUSE: 6, FOUR_OF_A_KIND: 7,
    STRAIGHT_FLUSH: 8
};
const SPECIAL_HAND_TYPE = {
    NONE: 0, THREE_FLUSHES: 1, THREE_STRAIGHTS: 2,
    SIX_PAIRS_HALF: 3, ONE_DRAGON: 4, THIRTEEN_UNIQUE_FLUSH: 5
};

class Card {
    constructor(suit, rank) {
        this.suit = suit; // 'clubs', 'diamonds', 'hearts', 'spades'
        this.rank = rank; // '2', '3', ..., '9', 'T', 'J', 'Q', 'K', 'A' (use 'T' for 10 for consistency)
        this.value = Card.getRankValue(rank);
        this.suitValue = Card.getSuitValue(suit);
        this.image = Card.generateImageName(suit, rank); // Match frontend image names
    }

    static getRankValue(rank) {
        if (rank >= '2' && rank <= '9') return parseInt(rank);
        if (rank === 'T') return 10; // Ten
        if (rank === 'J') return 11;
        if (rank === 'Q') return 12;
        if (rank === 'K') return 13;
        if (rank === 'A') return 14;
        return 0;
    }

    static getSuitValue(suit) {
        const suits = { 'diamonds': 1, 'clubs': 2, 'hearts': 3, 'spades': 4 };
        return suits[suit] || 0;
    }
    
    static generateImageName(suit, rankStr) { // rankStr is like 'A', 'K', '10', '2'
        let rankLower = rankStr.toLowerCase();
        if (rankStr === '10') rankLower = '10';
        else if (rankStr === 'J') rankLower = 'jack';
        else if (rankStr === 'Q') rankLower = 'queen';
        else if (rankStr === 'K') rankLower = 'king';
        else if (rankStr === 'A') rankLower = 'ace';
        return `${rankLower}_of_${suit}.svg`;
    }

    toArray() { // For sending to client or DB
        return { suit: this.suit, rank: this.rank, value: this.value, suitValue: this.suitValue, image: this.image };
    }
}

function createDeck() {
    const suits = ['clubs', 'diamonds', 'hearts', 'spades'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']; // Use 'T' for Ten
    let deck = [];
    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push(new Card(suit, rank));
        }
    }
    return deck;
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function dealCards(deck, numPlayers = 2, cardsPerPlayer = 13) {
    let hands = Array(numPlayers).fill(null).map(() => []);
    for (let i = 0; i < cardsPerPlayer; i++) {
        for (let j = 0; j < numPlayers; j++) {
            if (deck.length > 0) {
                hands[j].push(deck.pop());
            } else {
                break; // Out of cards
            }
        }
    }
    return hands;
}

// --- getHandDetails, compareEvaluatedHands, validateArrangement, checkOverallSpecialHand ---
// --- These need to be translated from PHP to JavaScript. This is a significant task. ---
// --- Below is a VERY simplified placeholder for getHandDetails. You MUST implement the full logic. ---

/**
 * Evaluates a set of cards (3 or 5) and returns its type and ranking values.
 * @param {Card[]} cards - Array of Card objects.
 * @returns {object} { type: HAND_TYPE, name: string, primary_value: number, secondary_value: number, kickers: number[], original_cards: Card[] }
 */
function getHandDetails(cards) {
    if (!cards || cards.length === 0) return { type: HAND_TYPE.HIGH_CARD, name: getHandTypeName(HAND_TYPE.HIGH_CARD), primary_value: 0, secondary_value: 0, kickers: [], original_cards: [] };
    
    // Sort cards by value (desc), then suit (desc) - important for kickers and some comparisons
    cards.sort((a, b) => {
        if (b.value === a.value) return b.suitValue - a.suitValue;
        return b.value - a.value;
    });

    const ranks = cards.map(c => c.value);
    const suits = cards.map(c => c.suit);
    // const rankCounts = ranks.reduce((acc, rank) => { acc[rank] = (acc[rank] || 0) + 1; return acc; }, {});
    
    // TODO: Implement full十三水牌型判断逻辑 here (this is just a placeholder)
    // This will involve checking for pairs, threes, straights, flushes, etc.
    // based on the logic in your PHP game_rules.php
    
    // Placeholder:
    let handType = HAND_TYPE.HIGH_CARD;
    let primaryValue = ranks[0] || 0;
    let secondaryValue = ranks[1] || 0;
    let kickers = ranks;

    // Example: very basic pair check for 3 cards
    if (cards.length === 3) {
        if (ranks[0] === ranks[1] || ranks[1] === ranks[2]) handType = HAND_TYPE.ONE_PAIR;
        if (ranks[0] === ranks[1] && ranks[1] === ranks[2]) handType = HAND_TYPE.THREE_OF_A_KIND;
         primaryValue = ranks[1]; // Typically the pair/trips rank
    }
    // Example: very basic pair check for 5 cards
    if (cards.length === 5) {
        // This is where your complex logic from PHP needs to be ported
    }


    return {
        type: handType,
        name: getHandTypeName(handType),
        primary_value: primaryValue,
        secondary_value: secondaryValue, // Adjust based on actual hand type
        kickers: kickers, // Adjust based on actual hand type
        original_cards: cards
    };
}

function getHandTypeName(typeId) {
    const names = {
        [HAND_TYPE.HIGH_CARD]: "乌龙", [HAND_TYPE.ONE_PAIR]: "一对",
        [HAND_TYPE.TWO_PAIR]: "两对", [HAND_TYPE.THREE_OF_A_KIND]: "三条",
        [HAND_TYPE.STRAIGHT]: "顺子", [HAND_TYPE.FLUSH]: "同花",
        [HAND_TYPE.FULL_HOUSE]: "葫芦", [HAND_TYPE.FOUR_OF_A_KIND]: "铁支",
        [HAND_TYPE.STRAIGHT_FLUSH]: "同花顺"
    };
    return names[typeId] || "未知牌型";
}
function getSpecialHandName(specialTypeId) {
    const names = {
        [SPECIAL_HAND_TYPE.NONE]: "", [SPECIAL_HAND_TYPE.THREE_FLUSHES]: "三同花",
        [SPECIAL_HAND_TYPE.THREE_STRAIGHTS]: "三顺子", [SPECIAL_HAND_TYPE.SIX_PAIRS_HALF]: "六对半",
        [SPECIAL_HAND_TYPE.ONE_DRAGON]: "一条龙", [SPECIAL_HAND_TYPE.THIRTEEN_UNIQUE_FLUSH]: "至尊清龙"
    };
    return names[specialTypeId] || "未知特殊牌型";
}

function compareEvaluatedHands(eval1, eval2) {
    // TODO: Translate PHP compareEvaluatedHands logic
    if (eval1.type !== eval2.type) return eval1.type - eval2.type;
    if (eval1.primary_value !== eval2.primary_value) return eval1.primary_value - eval2.primary_value;
    // ... more kicker comparisons ...
    return 0; // Placeholder
}

function validateArrangement(arrangedHandObjects) {
    // TODO: Translate PHP validateArrangement logic
    if (!arrangedHandObjects.first || !arrangedHandObjects.middle || !arrangedHandObjects.last) return false;
    if (arrangedHandObjects.first.length !== 3 || arrangedHandObjects.middle.length !== 5 || arrangedHandObjects.last.length !== 5) {
        return false;
    }
    const firstEval = getHandDetails(arrangedHandObjects.first);
    const middleEval = getHandDetails(arrangedHandObjects.middle);
    const lastEval = getHandDetails(arrangedHandObjects.last);

    if (compareEvaluatedHands(middleEval, firstEval) < 0) return false;
    if (compareEvaluatedHands(lastEval, middleEval) < 0) return false;
    return true;
}

function checkOverallSpecialHand(fullHandEval, all13Cards) {
    // TODO: Translate PHP checkOverallSpecialHand logic
    return SPECIAL_HAND_TYPE.NONE; // Placeholder
}


module.exports = {
    Card,
    createDeck,
    shuffleDeck,
    dealCards,
    getHandDetails,
    getHandTypeName,
    getSpecialHandName,
    compareEvaluatedHands,
    validateArrangement,
    checkOverallSpecialHand,
    HAND_TYPE,
    SPECIAL_HAND_TYPE
};
```
