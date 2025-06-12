import React, { useEffect, useState } from 'react';
import Card from '../ui/Card';

const AI_NAMES = ['AI-1', 'AI-2', 'AI-3'];
const SUITS = ['♠', '♥', '♣', '♦'];
const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const CARD_ORDER = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14 };

function createDeck() {
  const deck = [];
  for (const s of SUITS) {
    for (const r of RANKS) {
      deck.push(s + r);
    }
  }
  return deck;
}

function shuffleDeck(deck) {
  const d = deck.slice();
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function getMaxCard(cards) {
  let max = 0;
  for (const card of cards) {
    let rank = card.slice(1);
    if (CARD_ORDER[rank] > max) max = CARD_ORDER[rank];
  }
  return max;
}

export default function GameRoom() {
  // 房间和玩家
  const url = new URL(window.location.href);
  const params = new URLSearchParams(url.search);
  const myName = params.get('nickname') || '你';
  const roomId = window.location.pathname.split('/').pop();

  // 状态
  const [players, setPlayers] = useState([]);
  const [myHand, setMyHand] = useState([]);
  const [played, setPlayed] = useState(false);
  const [aiHands, setAiHands] = useState({});
  const [aiPlayed, setAiPlayed] = useState({});
  const [result, setResult] = useState('');
  const [message, setMessage] = useState('');

  // 初始化房间与发牌
  useEffect(() => {
    // 组装4人
    const allPlayers = [myName, ...AI_NAMES];
    // 洗牌&发牌
    const deck = shuffleDeck(createDeck());
    const hands = {};
    for (let i = 0; i < 4; i++) {
      hands[allPlayers[i]] = deck.slice(i*13, (i+1)*13);
    }
    setPlayers(allPlayers);
    setMyHand(hands[myName]);
    setAiHands({
      'AI-1': hands['AI-1'],
      'AI-2': hands['AI-2'],
      'AI-3': hands['AI-3'],
    });
    setAiPlayed({'AI-1': false, 'AI-2': false, 'AI-3': false});
    setPlayed(false);
    setResult('');
    setMessage('');
  }, [roomId, myName]);

  // AI自动出牌（页面加载后，2秒后出牌）
  useEffect(() => {
    if (!players.length) return;
    const timers = [];
    AI_NAMES.forEach(ai => {
      if (!aiPlayed[ai]) {
        timers.push(setTimeout(() => {
          setAiPlayed(prev => ({...prev, [ai]: true}));
        }, 1000 + Math.random()*1000)); // 随机1-2秒后AI出牌
      }
    });
    return () => timers.forEach(clearTimeout);
  }, [players]);

  // 玩家点击出牌
  const handlePlay = () => {
    setPlayed(true);
    setMessage('你已出牌，等待其他玩家...');
  };

  // 判断是否全部出牌，自动比牌
  useEffect(() => {
    if (!players.length) return;
    if (played && AI_NAMES.every(ai => aiPlayed[ai])) {
      // 所有玩家都出牌
      const allSubmits = {
        [myName]: myHand,
        ...aiHands
      };
      const scores = {};
      players.forEach(p => {
        scores[p] = getMaxCard(allSubmits[p]);
      });
      const maxScore = Math.max(...Object.values(scores));
      const winners = players.filter(p => scores[p] === maxScore);
      setResult(`本局结束，胜者：${winners.join('、')}`);
      setMessage('');
    }
  }, [played, aiPlayed, players, aiHands, myHand, myName]);

  return (
    <div>
      <h2>房间号: {roomId}</h2>
      <div>我的昵称: {myName}</div>
      <div>
        <h3>我的手牌</h3>
        <div style={{display: 'flex', flexWrap: 'wrap'}}>
          {myHand.map(card => <Card key={card} name={card} />)}
        </div>
        {!played && <button onClick={handlePlay}>出牌</button>}
        {message && <div>{message}</div>}
      </div>
      <h3>玩家</h3>
      <ul>
        <li><b>{myName}</b>：{played ? "已出牌" : "未出牌"}</li>
        {AI_NAMES.map(ai =>
          <li key={ai}>{ai}：{aiPlayed[ai] ? "已出牌" : "未出牌"}</li>
        )}
      </ul>
      {result && <div style={{marginTop: 20, color: "green", fontWeight: "bold"}}>{result}</div>}
      <button onClick={() => window.location.reload()}>再来一局</button>
    </div>
  );
}
