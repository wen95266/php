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
            setResult("所有玩家已出牌，本局结束。");
          }
        });
    }
  }, [players, roomId]);

  // ------- UI 相关 ---------
  // 顶部横幅玩家状态
  const renderPlayersBanner = () => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 32, marginBottom: 18, padding: '8px 0',
      borderBottom: '1.5px solid #eee', background: '#fff', borderRadius: 8, boxShadow:'0 1px 6px #f4f4f8'
    }}>
      {players.map(p => {
        const isSelf = p.nickname === nickname;
        const isPlayed = p.cards && p.cards.length === 13;
        return (
          <div key={p.nickname} style={{
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            minWidth:90, padding:'0 8px'
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', background: isSelf ? '#2e91f7' : '#eee',
              display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',
              fontSize:20, fontWeight:700, marginBottom:2
            }}>{isSelf ? '你' : p.nickname.substring(0,2)}</div>
            <div style={{
              fontWeight: isSelf ? 700 : 500, color: isSelf ? '#2e91f7' : '#222', fontSize:15,
            }}>
              {isSelf ? `${p.nickname}（你）` : p.nickname}
            </div>
            <div style={{
              marginTop: 2, fontSize: 12,
              color: isPlayed ? '#43a047' : '#e53935', fontWeight: 600,
              letterSpacing:1
            }}>
              {isPlayed ? '已出牌' : '未出牌'}
            </div>
          </div>
        );
      })}
    </div>
  );

  // 头道/尾道静态区
  const renderLane = (title) => (
    <div style={{
      minHeight: 110, background:'#f7faff', border:'1.5px dashed #cde6ff',
      borderRadius:8, margin: '6px 0 12px 0', display: 'flex', alignItems:'center', paddingLeft:12
    }}>
      <span style={{
        fontWeight: 600, color: '#2e91f7', fontSize:16, marginRight: 16, minWidth:60
      }}>{title}</span>
      <span style={{color:'#bbb',fontSize:14}}>（拖动手牌到此处理牌，敬请期待...）</span>
    </div>
  );

  // 手牌样式更大
  const cardSize = { width: 92, height: 140 }; // 比原来大
  const handStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    background: '#fff',
    borderRadius: 9,
    padding: '18px 0',
    minHeight: 160,
    marginBottom: 8,
    boxShadow: '0 1px 4px #eee',
    justifyContent: 'flex-start'
  };

  return (
    <div style={{
      fontFamily: 'system-ui, sans-serif',
      maxWidth: 990,
      margin: '30px auto 0 auto',
      background: '#f9f9fa',
      borderRadius: 16,
      boxShadow: '0 2px 22px #e8eaf0',
      padding: 30,
      minHeight: 520
    }}>
      {/* 顶部横幅 */}
      <div style={{display:'flex',alignItems:'center',gap:24,marginBottom:4}}>
        <h2 style={{margin:0,fontSize:26,color:'#2e91f7',letterSpacing:1}}>十三水牌桌</h2>
        <span style={{fontSize:15,color:'#888'}}>房间号: <b>{roomId || '正在创建房间...'}</b></span>
        <span style={{fontSize:15,color:'#888'}}>我的昵称: <b style={{color:'#2e91f7'}}>{nickname}</b></span>
      </div>

      {/* 玩家状态横幅 */}
      {renderPlayersBanner()}

      {/* 头道理牌区 */}
      {renderLane("头道")}

      {/* 手牌区 */}
      <h3 style={{margin:'6px 0 4px 0',fontSize:17}}>我的手牌</h3>
      <div style={handStyle}>
        {!loading ?
          sortCards(myHand).map(card => (
            <div key={card} style={{width:cardSize.width, height:cardSize.height}}>
              <Card name={card} size={cardSize} />
            </div>
          ))
        :
          <span style={{color:'#888'}}>正在获取手牌...</span>
        }
      </div>
      <div>
        {!played && !loading && (
          <button
            style={{
              padding: '10px 30px',
              fontSize: 20,
              borderRadius: 7,
              background: '#2e91f7',
              color: '#fff',
              border: 'none',
              margin: '16px 0 0 0',
              cursor: 'pointer',
              fontWeight: 600
            }}
            onClick={handlePlay}
          >出牌</button>
        )}
        {played && (
          <span style={{marginLeft:16, color:'#4caf50',fontSize:17,fontWeight:600}}>已出牌</span>
        )}
      </div>
      {message && <div style={{color:'#ff9800',fontWeight:500,margin:'10px 0'}}>{message}</div>}

      {/* 尾道理牌区 */}
      {renderLane("尾道")}

      {result && <div style={{
        margin: '20px 0 8px 0',
        color: '#43a047',
        fontWeight: 700,
        fontSize: 20
      }}>{result}</div>}

      <button style={{
        padding: '8px 26px',
        fontSize: 17,
        borderRadius: 7,
        border: '1.5px solid #2e91f7',
        background: '#fff',
        color: '#2e91f7',
        marginLeft: 10,
        marginTop: 5,
        cursor: 'pointer',
        fontWeight: 600
      }} onClick={() => window.location.reload()}>再来一局</button>
    </div>
  );
}
