import React, { useEffect, useState } from 'react';
import Card from '../ui/Card';
import { aiSplit } from '../ai/shisanshui'; // 必须是极致AI算法
const API_BASE = "https://wenge.cloudns.ch/backend/api/";

function randomNickname() {
  return '玩家' + Math.floor(1000 + Math.random() * 9000);
}

const CARD_ORDER = {
  '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,
  'jack':11,'queen':12,'king':13,'ace':14
};

function sortCards(cards) {
  const suitOrder = { spades: 0, hearts: 1, clubs: 2, diamonds: 3 };
  return [...(cards || [])].sort((a, b) => {
    const [rankA, suitA] = a.split('_of_');
    const [rankB, suitB] = b.split('_of_');
    if (suitOrder[suitA] !== suitOrder[suitB]) {
      return suitOrder[suitA] - suitOrder[suitB];
    }
    return CARD_ORDER[rankA] - CARD_ORDER[rankB];
  });
}

export default function GameRoom() {
  // 基础状态
  const [roomId, setRoomId] = useState('');
  const [nickname, setNickname] = useState('');
  const [players, setPlayers] = useState([]);
  const [originHand, setOriginHand] = useState([]);
  const [played, setPlayed] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCompare, setShowCompare] = useState(false);
  const [compareData, setCompareData] = useState([]);

  // 理牌区
  const [head, setHead] = useState([]);   // 头道 3张
  const [main, setMain] = useState([]);   // 中道 5张
  const [tail, setTail] = useState([]);   // 尾道 5张
  const [hand, setHand] = useState([]);   // 剩余手牌

  // 拖拽状态
  const [dragCard, setDragCard] = useState(null);
  const [dragFrom, setDragFrom] = useState(null);

  // 自动创建房间
  useEffect(() => {
    const nick = randomNickname();
    setNickname(nick);
    fetch(API_BASE + "create_room.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: nick })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.roomId) {
          setRoomId(data.roomId);
        } else {
          setMessage(data.message || "房间创建失败");
        }
      });
  }, []);

  // 自动发牌
  useEffect(() => {
    if (roomId) {
      fetch(API_BASE + "deal_cards.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId })
      });
    }
  }, [roomId]);

  // 长轮询拉取状态
  useEffect(() => {
    if (!roomId || !nickname) return;
    let timer;
    const fetchState = () => {
      fetch(API_BASE + "room_state.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, nickname })
      })
        .then(res => res.json())
        .then(data => {
          setLoading(false);
          if (data.success) {
            setPlayers(data.players || []);
            if (!originHand.length && Array.isArray(data.myHand)) {
              setOriginHand(data.myHand);
              setHand(data.myHand);
              setHead([]); setMain([]); setTail([]);
            }
            const me = data.players.find(p => p.nickname === nickname);
            setPlayed(me && me.cards ? true : false);
          }
          timer = setTimeout(fetchState, 1500);
        });
    };
    fetchState();
    return () => clearTimeout(timer);
    // eslint-disable-next-line
  }, [roomId, nickname, originHand.length]);

  // 拖拽实现
  const onDragStart = (card, from) => {
    setDragCard(card);
    setDragFrom(from);
  };
  const onDragEnd = () => {
    setDragCard(null);
    setDragFrom(null);
  };
  const allowDrop = e => e.preventDefault();

  const onDropTo = (toZone) => {
    if (!dragCard) return;
    let fromArr, setFromArr;
    if (dragFrom === 'hand') { fromArr = hand; setFromArr = setHand; }
    else if (dragFrom === 'head') { fromArr = head; setFromArr = setHead; }
    else if (dragFrom === 'main') { fromArr = main; setFromArr = setMain; }
    else if (dragFrom === 'tail') { fromArr = tail; setFromArr = setTail; }
    else return;
    let toArr, setToArr, maxLen;
    if (toZone === 'head') { toArr = head; setToArr = setHead; maxLen = 3; }
    else if (toZone === 'main') { toArr = main; setToArr = setMain; maxLen = 5; }
    else if (toZone === 'tail') { toArr = tail; setToArr = setTail; maxLen = 5; }
    else if (toZone === 'hand') { toArr = hand; setToArr = setHand; maxLen = 13; }
    else return;
    if (toArr.includes(dragCard)) return onDragEnd();
    if (toArr.length >= maxLen) return onDragEnd();
    setFromArr(fromArr.filter(c => c !== dragCard));
    setToArr([...toArr, dragCard]);
    onDragEnd();
  };
  const onDropToHand = () => onDropTo('hand');

  // 自动识别“手牌=5张”转“中道”
  useEffect(() => {
    if (hand.length === 5 && head.length === 3 && tail.length === 5) {
      setMain(hand);
      setHand([]);
    }
    if (main.length && (head.length !== 3 || tail.length !== 5)) {
      setHand([...main]);
      setMain([]);
    }
    if (main.length === 0 && !hand.length && originHand.length) {
      if (head.length === 3 && tail.length === 5) return;
      setHand(originHand.filter(c => !head.includes(c) && !tail.includes(c)));
    }
    // eslint-disable-next-line
  }, [head, tail, hand, main, originHand]);

  // AI智能分牌
  const handleAISplit = () => {
    if (!originHand.length) return;
    const aiResult = aiSplit(originHand);
    setHead(aiResult.head);
    setMain(aiResult.main);
    setTail(aiResult.tail);
    setHand([]);
  };

  // 出牌并比牌
  const handlePlay = async () => {
    if (head.length !== 3 || main.length !== 5 || tail.length !== 5) {
      setMessage("请完成理牌（头道3，中道5，尾道5）再出牌");
      return;
    }
    const playCards = [...head, ...main, ...tail];
    await fetch(API_BASE + "play_cards.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, nickname, cards: playCards })
    });

    // AI自动分牌并出牌
    for (const p of players) {
      if (p.nickname.startsWith("AI-") && !p.cards && Array.isArray(p.hand) && p.hand.length === 13) {
        const aiResult = aiSplit(p.hand);
        const aiCards = [...aiResult.head, ...aiResult.main, ...aiResult.tail];
        await fetch(API_BASE + "play_cards.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, nickname: p.nickname, cards: aiCards })
        });
      }
    }

    setTimeout(async () => {
      const resp = await fetch(API_BASE + "compare_cards.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId })
      });
      const resData = await resp.json();
      if (resData.success && resData.result) {
        setCompareData(resData.result);
        setShowCompare(true);
      }
    }, 500);
  };

  // UI渲染部分
  return (
    <div style={{padding: 18, fontFamily: 'system-ui'}}>
      <h2 style={{ color: "#1677ff" }}>十三水牌桌</h2>
      <div style={{marginBottom: 10, fontSize: 15}}>
        房间号：<b>{roomId}</b> &nbsp; 我的昵称：<b>{nickname}</b>
      </div>
      <div style={{marginBottom: 12}}>
        {players.map(p =>
          <span key={p.nickname} style={{
            display: 'inline-block', minWidth: 80, marginRight: 30,
            color: p.nickname === nickname ? '#1677ff' : '#888',
            fontWeight: p.nickname === nickname ? 'bold' : 'normal'
          }}>
            {p.nickname === nickname ? '你' : p.nickname}
            <br />
            {p.cards ? '已出牌' : '未出牌'}
          </span>
        )}
      </div>
      <div style={{marginBottom: 16, padding: 8, background: '#f8fafc', borderRadius: 8}}>
        <div>
          <b>头道</b>
          <div
            style={{ minHeight: 56, border: '1.5px dashed #e3e8f0', borderRadius: 8, margin: '8px 0', display: 'flex' }}
            onDragOver={allowDrop}
            onDrop={() => onDropTo('head')}
          >
            {head.map(card => (
              <div key={card}
                draggable
                onDragStart={() => onDragStart(card, 'head')}
                onDragEnd={onDragEnd}
              >
                <Card name={card} border />
              </div>
            ))}
          </div>
        </div>
        <div>
          <b>中道</b>
          <div
            style={{ minHeight: 56, border: '1.5px dashed #e3e8f0', borderRadius: 8, margin: '8px 0', display: 'flex' }}
            onDragOver={allowDrop}
            onDrop={() => onDropTo('main')}
          >
            {main.map(card => (
              <div key={card}
                draggable
                onDragStart={() => onDragStart(card, 'main')}
                onDragEnd={onDragEnd}
              >
                <Card name={card} border />
              </div>
            ))}
          </div>
        </div>
        <div>
          <b>尾道</b>
          <div
            style={{ minHeight: 56, border: '1.5px dashed #e3e8f0', borderRadius: 8, margin: '8px 0', display: 'flex' }}
            onDragOver={allowDrop}
            onDrop={() => onDropTo('tail')}
          >
            {tail.map(card => (
              <div key={card}
                draggable
                onDragStart={() => onDragStart(card, 'tail')}
                onDragEnd={onDragEnd}
              >
                <Card name={card} border />
              </div>
            ))}
          </div>
        </div>
        <div>
          <b>手牌</b>
          <div
            style={{ minHeight: 56, border: '1.5px dashed #e3e8f0', borderRadius: 8, margin: '8px 0', display: 'flex' }}
            onDragOver={allowDrop}
            onDrop={onDropToHand}
          >
            {hand.map(card => (
              <div key={card}
                draggable
                onDragStart={() => onDragStart(card, 'hand')}
                onDragEnd={onDragEnd}
              >
                <Card name={card} border />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{marginBottom: 10}}>
        <button onClick={handlePlay} disabled={played} style={{marginRight: 10}}>出牌</button>
        <button onClick={handleAISplit} disabled={played} style={{marginRight: 10}}>AI智能分牌</button>
        <button onClick={() => window.location.reload()}>再来一局</button>
      </div>
      {message && <div style={{ color: 'red', marginTop: 8 }}>{message}</div>}

      {showCompare && (
        <div style={{
          position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.08)', zIndex: 99
        }}>
          <div style={{
            background: '#fff', width: 700, margin: '60px auto', borderRadius: 12, padding: 18
          }}>
            <h3>比牌结果</h3>
            <div>
              {compareData.map(p => (
                <div key={p.nickname} style={{ marginBottom: 16 }}>
                  <b>{p.nickname}</b>
                  <div>头道: {p.headResult.join(', ')}（{p.headScore}分）</div>
                  <div>中道: {p.mainResult.join(', ')}（{p.mainScore}分）</div>
                  <div>尾道: {p.tailResult.join(', ')}（{p.tailScore}分）</div>
                  <div>总分: {p.totalScore}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowCompare(false)}>关闭</button>
          </div>
        </div>
      )}
    </div>
  );
}
