// 牌名转图片文件名
function cardShortToFilename(shortCode) {
  const suitMap = {
    S: "spades",
    H: "hearts",
    C: "clubs",
    D: "diamonds"
  };
  const rankMap = {
    A: "ace",
    J: "jack",
    Q: "queen",
    K: "king"
  };
  let match = shortCode.match(/^([2-9]|10|A|J|Q|K)([SHCD])$/i);
  if (!match) return null;
  let [, rank, suit] = match;
  rank = rankMap[rank.toUpperCase()] || rank;
  let suitStr = suitMap[suit.toUpperCase()];
  return `${rank}_of_${suitStr}.svg`;
}

// 用户管理弹窗逻辑
function showUserModal() {
  document.getElementById('userModalMask').classList.remove('hidden');
  document.getElementById('userModal').classList.remove('hidden');
  checkLogin();
}
function closeUserModal() {
  document.getElementById('userModalMask').classList.add('hidden');
  document.getElementById('userModal').classList.add('hidden');
}
// 登录状态检测
function checkLogin() {
  fetch('/api/game.php?action=profile')
    .then(r=>r.json()).then(data=>{
      if(data.result === 'ok') {
        showProfile(data.user);
      } else {
        showLogin();
      }
    });
}
// 显示登录、注册、用户面板
function showProfile(user) {
  document.getElementById('userPanel').classList.remove('hidden');
  document.getElementById('loginBox').classList.add('hidden');
  document.getElementById('registerBox').classList.add('hidden');
  document.getElementById('profile').innerHTML = 
    `用户名: <b>${user.username}</b><br>手机号: ${user.phone}<br>积分: <b>${user.score}</b><br>胜场: ${user.win||0} 负场: ${user.lose||0} <br>注册时间: ${user.created_at}`;
  document.getElementById('friendInfo').innerHTML = "";
  document.getElementById('searchKey').value = "";
}
function showLogin() {
  document.getElementById('loginBox').classList.remove('hidden');
  document.getElementById('registerBox').classList.add('hidden');
  document.getElementById('userPanel').classList.add('hidden');
}
function showRegister() {
  document.getElementById('registerBox').classList.remove('hidden');
  document.getElementById('loginBox').classList.add('hidden');
  document.getElementById('userPanel').classList.add('hidden');
}
// 登录
function login() {
  const username = document.getElementById('login_username').value.trim();
  const password = document.getElementById('login_password').value.trim();
  if(!username || !password) { alert("请输入账号和密码"); return; }
  fetch('/api/game.php?action=login', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({username, password})
  })
  .then(r=>r.json()).then(data=>{
    if(data.result==='ok'){
      checkLogin();
    } else {
      alert(data.msg||'登录失败');
    }
  });
}
// 注册
function register() {
  const username = document.getElementById('reg_username').value.trim();
  const phone = document.getElementById('reg_phone').value.trim();
  const password = document.getElementById('reg_password').value.trim();
  const password2 = document.getElementById('reg_password2').value.trim();
  if(!username || !phone || !password || !password2) {
    alert("请填写完整信息"); return;
  }
  if(password !== password2) { alert("两次密码不一致"); return; }
  fetch('/api/game.php?action=register', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({username, phone, password})
  })
  .then(r=>r.json()).then(data=>{
    if(data.result==='ok'){
      alert('注册成功，请登录');
      showLogin();
    } else {
      alert(data.msg||'注册失败');
    }
  });
}
// 登出
function logout() {
  fetch('/api/game.php?action=logout')
  .then(()=>checkLogin());
}
// 查找朋友
function searchFriend() {
  const key = document.getElementById('searchKey').value.trim();
  if(!key) return;
  fetch(`/api/game.php?action=search_user&key=${encodeURIComponent(key)}`)
  .then(r=>r.json()).then(data=>{
    if(data.result==='ok'){
      document.getElementById('friendInfo').innerHTML = 
        `用户名:${data.user.username} 积分:${data.user.score}
        <input id="giftAmt" type="number" min="1" placeholder="赠送积分数">
        <button onclick="giftScore(${data.user.id})">赠送积分</button>`;
    }else{
      document.getElementById('friendInfo').innerHTML = "未找到该用户";
    }
  });
}
// 赠送积分
function giftScore(friendId) {
  const amt = parseInt(document.getElementById('giftAmt').value);
  if(!amt || amt<=0) { alert("请输入正确的积分数"); return; }
  fetch('/api/game.php?action=gift_score', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({to: friendId, amt})
  })
  .then(r=>r.json()).then(data=>{
    alert(data.msg||'操作失败');
    if(data.result==='ok') checkLogin();
  });
}
// 支持ESC关闭弹窗
document.addEventListener('keydown', function(e){
  if(e.key === "Escape") closeUserModal();
});
document.getElementById('userModalMask').onclick = closeUserModal;
