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
  const [loading, setLoading] = useState(true);

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
            setMyHand(data.myHand || []);
            const me = data.players.find(p => p.nickname === nickname);
            setPlayed(me && me.cards ? true : false);
          }
          timer = setTimeout(fetchState, 1200);
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
            // 这里可做详细结果展示
            setResult("所有玩家已出牌，本局结束。");
          }
        });
    }
  }, [players, roomId]);

  // 界面样式
  const styles = {
    container: {
      fontFamily: 'system-ui, sans-serif',
      maxWidth: 820,
      margin: '30px auto 0 auto',
      background: '#f9f9fa',
      borderRadius: 12,
      boxShadow: '0 2px 18px #ddd',
      padding: 25,
      minHeight: 460
    },
    hand: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8,
      background: '#fff',
      borderRadius: 7,
      padding: '12px 0',
      minHeight: 120,
      marginBottom: 10,
      boxShadow: '0 1px 4px #eee'
    },
    btn: {
      padding: '8px 24px',
      fontSize: 18,
      borderRadius: 6,
      background: '#2e91f7',
      color: '#fff',
      border: 'none',
      margin: '12px 0 0 0',
      cursor: 'pointer',
      fontWeight: 600
    },
    btnDisabled: {
      background: '#b2b6bb',
      color: '#fff',
      cursor: 'not-allowed'
    },
    playerList: {
      margin: '10px 0 10px 0',
      padding: 0,
      listStyle: 'none'
    },
    playerLi: (isSelf, isPlayed) => ({
      padding: '5px 0',
      fontWeight: isSelf ? 700 : 400,
      color: isSelf ? '#2e91f7' : (isPlayed ? '#4caf50' : '#333'),
      background: isSelf ? '#eaf2ff' : 'transparent',
      borderRadius: 5,
      display: 'flex',
      alignItems: 'center'
    }),
    dot: color => ({
      display: 'inline-block',
      width: 10,
      height: 10,
      borderRadius: '50%',
      background: color,
      marginRight: 7,
      marginLeft: 2
    }),
    msg: {
      color: '#ff9800',
      fontWeight: 500,
      margin: '10px 0'
    },
    result: {
      margin: '18px 0 5px 0',
      color: '#43a047',
      fontWeight: 700,
      fontSize: 18
    },
    again: {
      padding: '7px 18px',
      fontSize: 15,
      borderRadius: 5,
      border: '1px solid #2e91f7',
      background: '#fff',
      color: '#2e91f7',
      marginLeft: 6,
      cursor: 'pointer',
      fontWeight: 600
    }
  };

  return (
    <div style={styles.container}>
      <div style={{display:'flex',alignItems:'center',gap:20,flexWrap:'wrap'}}>
        <h2 style={{margin:0,fontSize:24,color:'#2e91f7',letterSpacing:1}}>十三水牌桌</h2>
        <span style={{fontSize:14,color:'#888'}}>房间号: <b>{roomId || '正在创建房间...'}</b></span>
        <span style={{fontSize:14,color:'#888'}}>我的昵称: <b style={{color:'#2e91f7'}}>{nickname}</b></span>
      </div>

      <h3 style={{margin:'18px 0 6px 0',fontSize:18}}>我的手牌</h3>
      <div style={styles.hand}>
        {!loading ?
          sortCards(myHand).map(card => <Card key={card} name={card} />)
        :
          <span style={{color:'#888'}}>正在获取手牌...</span>
        }
      </div>
      <div>
        {!played && !loading && (
          <button
            style={styles.btn}
            onClick={handlePlay}
          >出牌</button>
        )}
        {played && (
          <span style={{marginLeft:12, color:'#4caf50',fontSize:16,fontWeight:600}}>已出牌</span>
        )}
      </div>
      {message && <div style={styles.msg}>{message}</div>}

      <h3 style={{margin:'20px 0 8px 0',fontSize:17}}>玩家状态</h3>
      <ul style={styles.playerList}>
        {players.map(p => {
          const isSelf = p.nickname === nickname;
          const isPlayed = p.cards && p.cards.length === 13;
          return (
            <li key={p.nickname} style={styles.playerLi(isSelf, isPlayed)}>
              <span style={styles.dot(isPlayed ? '#4caf50' : '#f44336')} />
              <span>{p.nickname}</span>
              <span style={{marginLeft:8,fontSize:13}}>
                {isSelf ? '（你）' : ''}
                {isPlayed ? <span style={{color:'#4caf50'}}>已出牌</span> : <span style={{color:'#f44336'}}>未出牌</span>}
              </span>
            </li>
          );
        })}
      </ul>
      {result && <div style={styles.result}>{result}</div>}

      <button style={styles.again} onClick={() => window.location.reload()}>再来一局</button>
    </div>
  );
}
