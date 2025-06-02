// frontend/src/utils/cardUtils.js
export const getCardImagePath = (card) => {
    if (!card || !card.image) {
        // Return a path to a placeholder or default back image
        return `/cards/card_back_red.svg`; // Make sure you have a card_back_red.svg
    }
    return `/cards/${card.image}`;
};

// For sorting cards in hand if needed
export const sortCards = (cards) => {
    const rankOrder = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
    const suitOrder = ['clubs', 'diamonds', 'hearts', 'spades']; // Optional for secondary sort

    return [...cards].sort((a, b) => {
        const rankDiff = rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank);
        if (rankDiff !== 0) return rankDiff;
        return suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
    });
};
