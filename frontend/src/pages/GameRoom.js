import React, { useEffect, useState } from 'react';
import Card from '../ui/Card';

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
  const [roomId, setRoomId] = useState('');
  const [nickname, setNickname] = useState('');
  const [players, setPlayers] = useState([]);
  const [myHand, setMyHand] = useState([]);
  const [played, setPlayed] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState('');

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
          if (data.success) {
            setPlayers(data.players || []);
            setMyHand(data.myHand || []);
            const me = data.players.find(p => p.nickname === nickname);
            setPlayed(me && me.cards ? true : false);
          }
          timer = setTimeout(fetchState, 2000);
        });
    };
    fetchState();
    return () => clearTimeout(timer);
  }, [roomId, nickname]);

  // 出牌
  const handlePlay = () => {
    fetch(API_BASE + "play_cards.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, nickname, cards: myHand })
    })
      .then(res => res.json())
      .then(data => {
        setMessage(data.message || (data.success ? "已出牌" : "出牌失败"));
      });
  };

  // 自动比牌和显示胜者
  useEffect(() => {
    if (!roomId || !players.length) return;
    const allPlayed = players.every(p => p.cards && p.cards.length === 13);
    if (allPlayed) {
      fetch(API_BASE + "compare_cards.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.result) {
            setResult("所有玩家已出牌，本局结束。");
          }
        });
    }
  }, [players, roomId]);

  return (
    <div>
      <h2>房间号: {roomId || '正在创建房间...'}</h2>
      <div>我的昵称: {nickname}</div>
      <div>
        <h3>我的手牌</h3>
        <div style={{display: 'flex', flexWrap: 'wrap'}}>
          {sortCards(myHand).map(card => <Card key={card} name={card} />)}
        </div>
        {!played && <button onClick={handlePlay}>出牌</button>}
        {message && <div>{message}</div>}
      </div>
      <h3>玩家</h3>
      <ul>
        {players.map(p => (
          <li key={p.nickname}>
            {p.nickname}：{p.cards && p.cards.length === 13 ? "已出牌" : "未出牌"}
          </li>
        ))}
      </ul>
      {result && <div style={{marginTop: 20, color: "green", fontWeight: "bold"}}>{result}</div>}
      <button onClick={() => window.location.reload()}>再来一局</button>
    </div>
  );
}
