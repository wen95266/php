const API = 'https://wenge.cloudns.ch';

// ==== 注册/登录/积分功能 ====
function showLogin() {
  document.getElementById('loginForm').style.display = '';
  document.getElementById('registerForm').style.display = 'none';
}
function showRegister() {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('registerForm').style.display = '';
}
function login() {
  const phoneVal = document.getElementById('phone').value;
  const passwordVal = document.getElementById('password').value;
  if (!phoneVal || !passwordVal) {
    alert("请输入手机号和密码");
    return;
  }
  fetch(API + '/login.php', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    credentials: 'include',
    body: JSON.stringify({
      phone: phoneVal,
      password: passwordVal
    })
  })
  .then(res => res.json())
  .then(r => {
    if(r.ok) {
      onLoginSuccess();
    } else {
      alert(r.error);
    }
  })
  .catch(e => {
    alert("登录请求失败：" + e);
  });
}
function register() {
  const regPhoneVal = document.getElementById('regPhone').value;
  const regNicknameVal = document.getElementById('regNickname').value;
  const regPasswordVal = document.getElementById('regPassword').value;
  if (!regPhoneVal || !regPasswordVal) {
    alert("请填写手机号和密码");
    return;
  }
  fetch(API + '/register.php', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      phone: regPhoneVal,
      nickname: regNicknameVal,
      password: regPasswordVal
    })
  })
  .then(res => res.json())
  .then(r => {
    if(r.ok) { alert('注册成功'); showLogin(); }
    else alert(r.error);
  })
  .catch(e => {
    alert("注册请求失败：" + e);
  });
}
function logout() {
  fetch(API + '/logout.php', { credentials: 'include' })
    .then(()=> {
      document.getElementById('userInfoArea').style.display = 'none';
      document.getElementById('authArea').style.display = '';
      document.getElementById('gameArea').style.display = 'none';
      showLogin();
    });
}
function onLoginSuccess() {
  fetch(API + '/userinfo.php', { credentials: 'include' })
    .then(res=>res.json())
    .then(r=>{
      if(r.phone) {
        document.getElementById('authArea').style.display = 'none';
        document.getElementById('userInfoArea').style.display = '';
        document.getElementById('nickname').innerText = r.nickname;
        document.getElementById('score').innerText = ' 积分:' + r.score;
        document.getElementById('adminPanel').style.display = r.is_admin ? '' : 'none';
        document.getElementById('gameArea').style.display = '';
        initTableUI(r.nickname, r.score);
      } else {
        document.getElementById('userInfoArea').style.display = 'none';
        document.getElementById('authArea').style.display = '';
        document.getElementById('gameArea').style.display = 'none';
        showLogin();
      }
    });
}
function showAdminAdd() {
  document.getElementById('adminAddPanel').style.display = '';
}
function hideAdminAdd() {
  document.getElementById('adminAddPanel').style.display = 'none';
}
function adminAdd() {
  fetch(API + '/score_add.php', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    credentials: 'include',
    body: JSON.stringify({
      phone: document.getElementById('addPhone').value,
      value: document.getElementById('addValue').value
    })
  }).then(res=>res.json()).then(r=>{
    if(r.ok) alert('加分成功，新积分：'+r.newscore);
    else alert(r.error);
    hideAdminAdd();
    onLoginSuccess();
  });
}
function showAdminSub() {
  document.getElementById('adminSubPanel').style.display = '';
}
function hideAdminSub() {
  document.getElementById('adminSubPanel').style.display = 'none';
}
function adminSub() {
  fetch(API + '/score_sub.php', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    credentials: 'include',
    body: JSON.stringify({
      phone: document.getElementById('subPhone').value,
      value: document.getElementById('subValue').value
    })
  }).then(res=>res.json()).then(r=>{
    if(r.ok) alert('减分成功，新积分：'+r.newscore);
    else alert(r.error);
    hideAdminSub();
    onLoginSuccess();
  });
}
function showHistory() {
  fetch(API + '/score_history.php', { credentials:'include' }).then(res=>res.json()).then(list=>{
    let html = '<table><tr><th>变化</th><th>后积分</th><th>类型</th><th>备注</th><th>时间</th></tr>';
    list.forEach(r=>{
      html += `<tr><td>${r.change_val}</td><td>${r.after_val}</td><td>${r.change_type}</td><td>${r.remark}</td><td>${r.create_time}</td></tr>`;
    });
    html += '</table>';
    document.getElementById('historyList').innerHTML = html;
    document.getElementById('historyPanel').style.display = '';
  });
}
function hideHistory() {
  document.getElementById('historyPanel').style.display = 'none';
}

// ==== 游戏桌面布局与基本逻辑 ====

// 玩家数据，假设本地演示4位玩家，实际可联机或实时同步
let players = [
  {name:'你', score:1000, cards:[]},
  {name:'玩家二', score:1000, cards:[]},
  {name:'玩家三', score:1000, cards:[]},
  {name:'玩家四', score:1000, cards:[]}
];

// 初始化牌桌UI
function initTableUI(myName, myScore) {
  players[0].name = myName || "你";
  players[0].score = myScore || 1000;
  for(let i=0;i<4;i++) {
    document.querySelector('#player'+i+' .player-name').innerText = players[i].name;
    document.querySelector('#player'+i+' .player-score').innerText = "积分: "+players[i].score;
    renderPlayerCards(i, []);
  }
  renderMyCards([]);
  document.getElementById('resultArea').innerText = '';
}

// 扑克牌生成与洗牌
const suits = ['♠','♥','♣','♦'];
const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
function createDeck() {
  let deck = [];
  for(let s=0;s<4;s++) {
    for(let r=0;r<13;r++) {
      deck.push({suit:suits[s], rank:ranks[r], code: suits[s]+ranks[r]});
    }
  }
  return deck;
}
function shuffle(deck) {
  for(let i=deck.length-1;i>0;i--) {
    let j = Math.floor(Math.random()*(i+1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

// 发牌
function dealCards() {
  let deck = createDeck();
  shuffle(deck);
  for(let i=0; i<4; i++) {
    players[i].cards = deck.slice(i*13, (i+1)*13);
    renderPlayerCards(i, i===0?players[0].cards:[]);
  }
  renderMyCards(players[0].cards);
  document.getElementById('resultArea').innerText = '已发牌，请理牌并提交！';
}

// 渲染玩家手牌
function renderPlayerCards(idx, cards) {
  let area = document.querySelector('#player'+idx+' .player-cards');
  area.innerHTML = '';
  for(let c=0; c<cards.length; c++) {
    let card = cards[c];
    let div = document.createElement('span');
    div.className = "card";
    div.innerText = card.code;
    area.appendChild(div);
  }
}

// 渲染“我的手牌”区
function renderMyCards(cards) {
  let area = document.getElementById('myCards');
  area.innerHTML = '';
  for(let i=0;i<cards.length;i++) {
    let card = cards[i];
    let div = document.createElement('span');
    div.className = "card";
    div.innerText = card.code;
    area.appendChild(div);
  }
}

// 提交牌型（这里只做演示，实际可集成判牌算法或后端接口）
function submitHand() {
  if(players[0].cards.length<13) {
    document.getElementById('resultArea').innerText = '请先发牌！';
    return;
  }
  document.getElementById('resultArea').innerText = '已提交牌型！（可在此集成判牌和结算）';
}

// ==== 页面初始化 ====
window.onload = function() {
  hideAdminAdd();
  hideAdminSub();
  hideHistory();
  document.getElementById('gameArea').style.display = 'none';
  // 自动检查登录状态
  fetch(API + '/userinfo.php', { credentials: 'include' })
    .then(res=>res.json())
    .then(r=>{
      if(r.phone) {
        onLoginSuccess();
      } else {
        document.getElementById('authArea').style.display = '';
        document.getElementById('userInfoArea').style.display = 'none';
        document.getElementById('gameArea').style.display = 'none';
        showLogin();
      }
    });
};
