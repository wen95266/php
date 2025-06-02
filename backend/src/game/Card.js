// backend/src/game/Card.js
const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
const RANK_VALUES = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'jack': 11, 'queen': 12, 'king': 13, 'ace': 14 // Ace高
};

class Card {
    constructor(suit, rank) {
        if (!SUITS.includes(suit) || !RANKS.includes(rank)) {
            throw new Error(`Invalid card: ${rank} of ${suit}`);
        }
        this.suit = suit;
        this.rank = rank;
        this.value = RANK_VALUES[rank];
        this.id = `${rank}_of_${suit}`; // e.g., ace_of_spades
        this.image = `${this.id}.svg`; // frontend image name
    }

    toString() {
        return `${this.rank.toUpperCase()}${this.suit.charAt(0).toUpperCase()}`; // e.g., AS for Ace of Spades
    }
}

module.exports = { Card, SUITS, RANKS, RANK_VALUES };
