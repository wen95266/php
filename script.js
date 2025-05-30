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
  fetch(API + '/login.php', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    credentials: 'include',
    body: JSON.stringify({
      phone: document.getElementById('phone').value,
      password: document.getElementById('password').value
    })
  })
  .then(res => res.json())
  .then(r => {
    if(r.ok) {
      onLoginSuccess();
    } else {
      alert(r.error);
    }
  });
}
function register() {
  fetch(API + '/register.php', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      phone: document.getElementById('regPhone').value,
      nickname: document.getElementById('regNickname').value,
      password: document.getElementById('regPassword').value
    })
  })
  .then(res => res.json())
  .then(r => {
    if(r.ok) { alert('注册成功'); showLogin(); }
    else alert(r.error);
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

// ==== 游戏核心逻辑 ====
// ...（你的原有游戏JS逻辑放这里）

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
