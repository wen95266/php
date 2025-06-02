// frontend/src/utils/cardUtils.js

// 假设您的牌背图片名为 card_back.svg 存放在 public/cards/ 目录下
const CARD_BACK_IMAGE = '/cards/card_back.svg';

export const getCardImagePath = (card) => {
    if (!card || !card.id || card.facedown) { // 添加 facedown 属性判断
        return CARD_BACK_IMAGE;
    }
    // card.id 应该是类似 'ace_of_spades' 的格式
    // card.image 应该是类似 'ace_of_spades.svg' 的格式
    // 我们统一使用 card.id 来构造图片名，并添加 .svg 后缀
    return `/cards/${card.id}.svg`;
};

// 排序卡牌 (十三水通常按A最大，再按花色排序的需求较少，主要按点数)
// 如果需要更复杂的排序，可以在这里实现
export const sortCardsByValue = (cards) => {
    if (!cards) return [];
    const rankOrder = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
    // 花色顺序仅用于相同点数时的稳定排序，十三水中不直接影响大小比较逻辑
    // const suitOrder = ['clubs', 'diamonds', 'hearts', 'spades'];

    return [...cards].sort((a, b) => {
        const rankDiff = rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank);
        // if (rankDiff !== 0) return rankDiff;
        // return suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit); // 可选的花色排序
        return rankDiff;
    });
};

// 将后端Card对象转换为前端易于使用的格式 (如果需要)
// 示例：后端 card 对象 { suit: 'spades', rank: 'ace', value: 14, id: 'ace_of_spades', image: 'ace_of_spades.svg'}
// 前端可能直接使用这个格式，或者转换
export const transformCardForFrontend = (backendCard) => {
    return {
        ...backendCard,
        // imagePath: getCardImagePath(backendCard) // 也可以在组件中直接调用 getCardImagePath
    };
};
