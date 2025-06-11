import axios from 'axios';

const API_BASE_URL = 'https://wenge.cloudns.ch:10758/api';

export const divideCards = async (cards) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/divide`, { cards });
    return response.data;
  } catch (error) {
    console.error('AI分牌请求失败:', error);
    // 模拟AI分牌作为后备
    return simulateAIDivision(cards);
  }
};

const simulateAIDivision = (cards) => {
  // 简单分牌逻辑：按牌面值排序
  const sortedCards = [...cards].sort((a, b) => {
    const valueMap = {
      '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
      'jack': 11, 'queen': 12, 'king': 13, 'ace': 14
    };
    return valueMap[b.value] - valueMap[a.value];
  });
  
  return {
    top: sortedCards.slice(10),
    middle: sortedCards.slice(5, 10),
    bottom: sortedCards.slice(0, 5)
  };
};
