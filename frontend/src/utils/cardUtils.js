// frontend/src/utils/cardUtils.js
const CARD_BACK_IMAGE = '/cards/abstract.svg';

export const getCardImagePath = (card) => {
    if (!card || !card.id || card.facedown) {
        return CARD_BACK_IMAGE;
    }
    return `/cards/${card.id}.svg`;
};

export const sortCardsByValue = (cards) => {
    if (!cards) return [];
    const rankOrder = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
    return [...cards].sort((a, b) => {
        const rankDiff = rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank);
        return rankDiff;
    });
};

export const transformCardForFrontend = (backendCard) => {
    return {
        ...backendCard,
    };
};
