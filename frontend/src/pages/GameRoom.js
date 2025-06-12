import React, { useEffect, useState } from 'react';
import Card from '../ui/Card';
import { aiSplit } from '../ai/shisanshui'; // AI分牌模块

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
  // 基础游戏状态
  const [roomId, setRoomId] = useState('');
  const [nickname, setNickname] = useState('');
  const [players, setPlayers] = useState([]);
  const [originHand, setOriginHand] = useState([]);
  const [played, setPlayed] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(true);

  // 理牌区状态
  const [head, setHead] = useState([]);   // 头道 3张
  const [tail, setTail] = useState([]);   // 尾道 5张
  const [main, setMain] = useState([]);   // 中道 5张
  const [hand, setHand] = useState([]);   // 临时手牌>5张时

  // 拖拽状态
  const [dragCard, setDragCard] = useState(null);
  const [dragFrom, setDragFrom] = useState(null);

  // 比牌弹窗
  const [showCompare, setShowCompare] = useState(false);
  const [compareData, setCompareData] = useState([]);

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

  // 长轮询获取状态
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
            // 初始化理牌，仅一次
            if (!originHand.length && Array.isArray(data.myHand)) {
              setOriginHand(data.myHand);
              setHand(data.myHand); setHead([]); setTail([]); setMain([]);
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

  // 拖放到理牌区
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
    // 调试输出
    console.log('AI分牌结果:', aiResult);
    setHead(aiResult.head);
    setMain(aiResult.main);
    setTail(aiResult.tail);
    setHand([]);
  };

  // 出牌并展示比牌界面
  const handlePlay = async () => {
    if (head.length !==3 || main.length !==5 || tail.length !==5) {
      setMessage("请完成理牌（头道3，中道5，尾道5）再出牌");
      return;
    }
    const playCards = [...head, ...main, ...tail];
    // 调试输出
    console.log('玩家出牌顺序:', playCards);

    // 玩家出牌
    await fetch(API_BASE + "play_cards.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, nickname, cards: playCards })
    });

    // AI自动分牌并出牌（用各自的hand字段！）
    for (const p of players) {
      if (p.nickname.startsWith("AI-") && !p.cards && Array.isArray(p.hand) && p.hand.length === 13) {
        const aiResult = aiSplit(p.hand);
        const aiCards = [...aiResult.head, ...aiResult.main, ...aiResult.tail];
        // 调试输出
        console.log(`AI[${p.nickname}]分牌:`, aiResult);
        console.log(`AI[${p.nickname}]出牌顺序:`, aiCards);
        await fetch(API_BASE + "play_cards.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, nickname: p.nickname, cards: aiCards })
        });
      }
    }

    // 查询比牌数据
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

  // ... UI渲染部分保持不变（省略，见原文件） ...
  // 请直接用你原有的UI渲染部分，无需变动

  // 省略的部分见你原文件，或直接将此逻辑块替换进你现有GameRoom.js即可
}
