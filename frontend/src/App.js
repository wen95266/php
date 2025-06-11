import React, { useState, useEffect, useRef } from 'react';
import GameBoard from './components/GameBoard';
import PlayerInfo from './components/PlayerInfo';
import AIControl from './components/AIControl';
import './index.css';

// 牌型辅助
const valueMap = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'jack': 11, 'queen': 12, 'king': 13, 'ace': 14
};
const countBy = (arr, key) => arr.reduce((obj, c) => { obj[c[key]] = (obj[c[key]] || 0) + 1; return obj; }, {});
const isFlush = cards => cards.length > 0 && cards.every(c => c.suit === cards[0].suit);
const isStraight = (cards) => {
  if (cards.length < 5) return false;
  let vals = cards.map(c => valueMap[c.value]).sort((a, b) => a - b);
  const isLowAceStraight = vals.join(',') === '2,3,4,5,14';
  if (isLowAceStraight) return true;
  for (let i = 1; i < vals.length; ++i) if (vals[i] !== vals[i - 1] + 1) return false;
  return true;
};
const isStraightFlush = cards => isFlush(cards) && isStraight(cards);
const getHandRank = (cards) => {
  const vcnt = Object.values(countBy(cards, 'value')).sort((a, b) => b - a);
  if (cards.length < 3) return 0;
  if (cards.length === 3) {
    if (vcnt[0] === 3) return 3;
    if (vcnt[0] === 2) return 1;
    return 0;
  }
  if (isStraightFlush(cards)) return 8;
  if (vcnt[0] === 4) return 7;
  if (vcnt[0] === 3 && vcnt[1] === 2) return 6;
  if (isFlush(cards)) return 5;
  if (isStraight(cards)) return 4;
  if (vcnt[0] === 3) return 3;
  if (vcnt[0] === 2 && vcnt[1] === 2) return 2;
  if (vcnt[0] === 2) return 1;
  return 0;
};
const handRankName = ['高牌','一对','两对','三条','顺子','同花','葫芦','四条','同花顺'];

function getInitialStats() {
  return {
    totalGames: 0,
    aiDivides: 0,
    lastResult: null,
  };
}

// 生成13张随机牌
function generateInitialCards() {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
  const cards = [];
  suits.forEach(suit => {
    values.forEach(value => {
      cards.push({
        id: `${value}_of_${suit}`,
        value,
        suit,
        image: `${value}_of_${suit}.svg`
      });
    });
  });
  return cards.sort(() => Math.random() - 0.5).slice(0, 13);
}

// 牌型比较分数（简化，头中尾顺序比牌，赢1分，输扣1分，平0分）
function compareThreeHands(h1, h2) {
  let score = 0;
  for (let i = 0; i < 3; ++i) {
    const r1 = getHandRank(h1[i]);
    const r2 = getHandRank(h2[i]);
    if (r1 > r2) score += 1;
    else if (r1 < r2) score -= 1;
    else score += 0;
  }
  return score;
}

function App() {
  // 玩家
  const [topPile, setTopPile] = useState([]);
  const [middlePile, setMiddlePile] = useState([]);
  const [bottomPile, setBottomPile] = useState([]);
  // 3个AI
  const [aiPlayers, setAIPlayers] = useState([
    { name: 'AI1', top: [], middle: [], bottom: [], status: '等待中', score: 0 },
    { name: 'AI2', top: [], middle: [], bottom: [], status: '等待中', score: 0 },
    { name: 'AI3', top: [], middle: [], bottom: [], status: '等待中', score: 0 },
  ]);
  const [playerName] = useState('玩家1');
  const [gameStatus, setGameStatus] = useState('waiting');
  const [stats, setStats] = useState(getInitialStats());
  const workerRef = useRef(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDivisions, setAiDivisions] = useState([]);
  const [aiDivisionIndex, setAiDivisionIndex] = useState(0);
  // 比牌后得分
  const [compareResult, setCompareResult] = useState(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./aiWorker.js', import.meta.url));
    return () => { workerRef.current && workerRef.current.terminate(); };
  }, []);

  // 初始化一局
  const initGame = () => {
    setTopPile([]);
    setMiddlePile(generateInitialCards());
    setBottomPile([]);
    setGameStatus('playing');
    setStats(s => ({ ...s, totalGames: s.totalGames + 1, lastResult: null }));
    setAiDivisions([]);
    setAiDivisionIndex(0);
    setCompareResult(null);

    // 给3个AI发牌
    const aiInit = [];
    for (let i = 0; i < 3; ++i) {
      aiInit.push({
        name: `AI${i + 1}`,
        cards: generateInitialCards(),
        top: [],
        middle: [],
        bottom: [],
        status: '等待中',
        score: 0
      });
    }
    setAIPlayers(aiInit);
  };

  // 拖拽
  const handleDrop = (target, card, from) => {
    if (from === target) return;
    if (from === 'top') setTopPile(prev => prev.filter(c => c.id !== card.id));
    if (from === 'middle') setMiddlePile(prev => prev.filter(c => c.id !== card.id));
    if (from === 'bottom') setBottomPile(prev => prev.filter(c => c.id !== card.id));
    if (target === 'top') setTopPile(prev => [...prev, card]);
    if (target === 'middle') setMiddlePile(prev => [...prev, card]);
    if (target === 'bottom') setBottomPile(prev => [...prev, card]);
    setAiDivisions([]);
    setAiDivisionIndex(0);
  };

  // 玩家AI智能分牌（多分法可切换）
  const handleAIDivide = () => {
    setGameStatus('dividing');
    setAiLoading(true);
    const all = [...topPile, ...middlePile, ...bottomPile];
    if (all.length !== 13) {
      setAiLoading(false);
      setGameStatus('playing');
      alert('牌数量不是13，无法AI分牌');
      return;
    }
    if (aiDivisions.length > 0 && aiDivisionIndex < aiDivisions.length - 1) {
      const nextIndex = aiDivisionIndex + 1;
      const next = aiDivisions[nextIndex];
      setTopPile(next.top);
      setMiddlePile(next.middle);
      setBottomPile(next.bottom);
      setAiDivisionIndex(nextIndex);
      setGameStatus('completed');
      setStats(s => ({
        ...s,
        aiDivides: s.aiDivides + 1,
        lastResult: {
          top: handRankName[getHandRank(next.top)],
          middle: handRankName[getHandRank(next.middle)],
          bottom: handRankName[getHandRank(next.bottom)]
        }
      }));
      setAiLoading(false);
      return;
    }
    workerRef.current.postMessage({ cards: all });
    workerRef.current.onmessage = (e) => {
      setAiLoading(false);
      const d = e.data;
      if (d.error) {
        setGameStatus('playing');
        alert(d.error);
        return;
      }
      const options = d.results || [];
      if (options.length === 0) {
        setGameStatus('playing');
        alert('AI未能找到合法分法');
        return;
      }
      setAiDivisions(options);
      setAiDivisionIndex(0);
      setTopPile(options[0].top);
      setMiddlePile(options[0].middle);
      setBottomPile(options[0].bottom);
      setGameStatus('completed');
      setStats(s => ({
        ...s,
        aiDivides: s.aiDivides + 1,
        lastResult: {
          top: handRankName[getHandRank(options[0].top)],
          middle: handRankName[getHandRank(options[0].middle)],
          bottom: handRankName[getHandRank(options[0].bottom)]
        }
      }));
    };
  };

  // AI分牌
  const aiAutoDivideAll = () => {
    // 对3个AI并行分牌
    const promises = aiPlayers.map((ai, idx) => {
      return new Promise(resolve => {
        const aiWorker = new Worker(new URL('./aiWorker.js', import.meta.url));
        aiWorker.postMessage({ cards: ai.cards });
        aiWorker.onmessage = e => {
          const d = e.data;
          aiWorker.terminate();
          if (d.results && d.results.length > 0) {
            resolve({
              ...ai,
              top: d.results[0].top,
              middle: d.results[0].middle,
              bottom: d.results[0].bottom,
              status: '已分牌'
            });
          } else {
            resolve({
              ...ai,
              top: [],
              middle: [],
              bottom: [],
              status: '分牌失败'
            });
          }
        }
      });
    });
    Promise.all(promises).then(newAIPlayers => {
      setAIPlayers(newAIPlayers);
    });
  };

  // 比牌
  const handleCompare = () => {
    // 保证已分牌
    if (
      topPile.length !== 3 ||
      middlePile.length !== 5 ||
      bottomPile.length !== 5 ||
      aiPlayers.some(ai => ai.top.length !== 3 || ai.middle.length !== 5 || ai.bottom.length !== 5)
    ) {
      alert('请先完成所有分牌！');
      return;
    }
    // 玩家和3AI互相比牌，三家各自和你比
    let playerScore = 0;
    let aiScores = [0, 0, 0];
    const playerHands = [topPile, middlePile, bottomPile];
    const aiResults = [];
    for (let i = 0; i < 3; ++i) {
      const aiHands = [aiPlayers[i].top, aiPlayers[i].middle, aiPlayers[i].bottom];
      const score = compareThreeHands(playerHands, aiHands);
      playerScore += score;
      aiScores[i] += -score;
      aiResults.push(score);
    }
    // 更新AI状态
    setAIPlayers(prev =>
      prev.map((ai, idx) => ({
        ...ai,
        score: aiScores[idx],
        status: '比牌完成'
      }))
    );
    setCompareResult({
      playerScore,
      aiScores,
      aiResults
    });
    setGameStatus('compared');
  };

  const resetGame = () => {
    setAiDivisions([]);
    setAiDivisionIndex(0);
    setCompareResult(null);
    initGame();
  };

  useEffect(() => {
    initGame();
    // eslint-disable-next-line
  }, []);

  // 横幅显示所有玩家和AI
  const TopBanner = () => (
    <div style={{
      display: 'flex',
      padding: '16px 0',
      background: 'rgba(0,0,0,0.25)',
      borderRadius: 12,
      justifyContent: 'space-around',
      alignItems: 'center',
      marginBottom: 10
    }}>
      <PlayerInfo name={playerName} status={gameStatus} />
      {aiPlayers.map((ai, idx) =>
        <div key={ai.name} style={{ minWidth: 120, textAlign: 'center' }}>
          <div style={{
            background: '#333',
            borderRadius: 10,
            padding: '6px 12px',
            marginBottom: 4,
            color: '#f1c40f',
            fontWeight: 'bold'
          }}>{ai.name}</div>
          <div style={{
            fontSize: '0.96rem',
            color: '#fff'
          }}>{ai.status}</div>
          {ai.score !== undefined &&
            <div style={{
              marginTop: 2,
              color: ai.score > 0 ? '#2ecc71' : (ai.score < 0 ? '#e74c3c' : '#fff')
            }}>
              {ai.score ? `得分：${ai.score}` : ''}
            </div>}
        </div>
      )}
    </div>
  );

  const StatsPanel = () => (
    <div style={{
      background: '#222c36',
      color: '#fff',
      borderRadius: 8,
      padding: 12,
      maxWidth: 400,
      margin: '12px auto',
      fontSize: '1rem',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
    }}>
      <div>总局数：{stats.totalGames}</div>
      <div>AI智能分牌次数：{stats.aiDivides}</div>
      {stats.lastResult && (
        <div style={{marginTop:8}}>
          <div>上局AI牌型：</div>
          <div>头道：{stats.lastResult.top}</div>
          <div>中道：{stats.lastResult.middle}</div>
          <div>尾道：{stats.lastResult.bottom}</div>
        </div>
      )}
    </div>
  );

  // 新增底部按钮区
  const BottomButtonBar = () => (
    <div style={{
      width: '100%',
      marginTop: 30,
      display: 'flex',
      justifyContent: 'center',
      gap: '32px'
    }}>
      <button
        onClick={() => {
          aiAutoDivideAll();
        }}
        className="ai-button"
        style={{minWidth: 120}}
      >
        让三个AI自动分牌
      </button>
      <button
        onClick={handleCompare}
        className="ai-button"
        style={{background:'#e67e22',minWidth:120}}
      >
        开始比牌
      </button>
      <button
        onClick={resetGame}
        className="reset-button"
        style={{minWidth:120}}
      >
        重新开始
      </button>
    </div>
  );

  // 比牌结果展示
  const CompareResultPanel = () => (
    compareResult && (
      <div style={{
        margin: '18px auto',
        background: '#1a222d',
        color: '#fff',
        padding: 18,
        borderRadius: 12,
        maxWidth: 500,
        fontSize: '1.15rem',
        textAlign: 'center'
      }}>
        <div style={{fontWeight:'bold',fontSize:'1.25rem'}}>本局比牌结果</div>
        <div style={{margin:'10px 0'}}>你的总分：<span style={{color:compareResult.playerScore>0?'#2ecc71':compareResult.playerScore<0?'#e74c3c':'#fff'}}>{compareResult.playerScore}</span></div>
        {aiPlayers.map((ai, idx) =>
          <div key={ai.name}>
            {ai.name} 分数：<span style={{color:compareResult.aiScores[idx]>0?'#2ecc71':compareResult.aiScores[idx]<0?'#e74c3c':'#fff'}}>{compareResult.aiScores[idx]}</span>
            <span style={{marginLeft:8}}>（对你：{compareResult.aiResults[idx]>0?'你胜':compareResult.aiResults[idx]<0?'你负':'平局'}）</span>
          </div>
        )}
      </div>
    )
  );

  return (
    <div className="app">
      <header className="app-header">
        <TopBanner />
      </header>
      <main className="game-container new-horizontal-layout">
        <div className="main-board-column">
          <GameBoard
            topPile={topPile}
            middlePile={middlePile}
            bottomPile={bottomPile}
            onDrop={handleDrop}
            gameStatus={gameStatus}
          />
          <div className="ai-banner">
            <AIControl
              onAIDivide={handleAIDivide}
              onReset={resetGame}
              gameStatus={gameStatus}
            />
          </div>
          {aiLoading && (
            <div style={{
              textAlign: 'center',
              fontWeight: 'bold',
              color: '#2ecc71',
              margin: '16px 0'
            }}>AI分牌中，请稍候...</div>
          )}
          <StatsPanel />
          <CompareResultPanel />
          <BottomButtonBar />
        </div>
      </main>
    </div>
  );
}

export default App;
