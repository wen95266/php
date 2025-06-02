// backend/src/game/Deck.js
const { Card, SUITS, RANKS } = require('./Card');

class Deck {
    constructor() {
        this.cards = [];
        this.reset();
        this.shuffle();
    }

    reset() {
        this.cards = [];
        for (const suit of SUITS) {
            for (const rank of RANKS) {
                this.cards.push(new Card(suit, rank));
            }
        }
    }

    shuffle() {
        // Fisher-Yates shuffle
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    deal(numCards) {
        if (numCards > this.cards.length) {
            throw new Error("Not enough cards to deal.");
        }
        return this.cards.splice(0, numCards);
    }

    get length() {
        return this.cards.length;
    }
}

module.exports = Deck;
