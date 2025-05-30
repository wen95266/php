// 后端 API 域名
const API = 'https://wenge.cloudns.ch';

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
    body: JSON.stringify({ phone: phone.value, password: password.value })
  })
  .then(res => res.json())
  .then(r => {
    if(r.ok) {
      showUser();
    } else alert(r.error);
  });
}
function register() {
  fetch(API + '/register.php', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ phone: regPhone.value, nickname: regNickname.value, password: regPassword.value })
  })
  .then(res => res.json())
  .then(r => {
    if(r.ok) { alert('注册成功'); showLogin(); }
    else alert(r.error);
  });
}
function logout() {
  fetch(API + '/logout.php', {
    credentials: 'include'
  }).then(()=> {
    document.getElementById('userInfo').style.display = 'none';
    document.getElementById('auth').style.display = '';
    showLogin();
  });
}
function showUser() {
  fetch(API + '/userinfo.php', {
    credentials: 'include'
  }).then(res=>res.json()).then(r=>{
    if(r.phone) {
      document.getElementById('auth').style.display = 'none';
      document.getElementById('userInfo').style.display = '';
      document.getElementById('nick').innerText = r.nickname;
      document.getElementById('myscore').innerText = ' 积分:' + r.score;
      document.getElementById('adminPanel').style.display = r.is_admin ? '' : 'none';
    } else {
      document.getElementById('userInfo').style.display = 'none';
      document.getElementById('auth').style.display = '';
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
    body: JSON.stringify({ phone: addPhone.value, value: addValue.value })
  }).then(res=>res.json()).then(r=>{
    if(r.ok) alert('加分成功，新积分：'+r.newscore);
    else alert(r.error);
    hideAdminAdd();
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
    body: JSON.stringify({ phone: subPhone.value, value: subValue.value })
  }).then(res=>res.json()).then(r=>{
    if(r.ok) alert('减分成功，新积分：'+r.newscore);
    else alert(r.error);
    hideAdminSub();
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
hideAdminAdd();
hideAdminSub();
hideHistory();
showUser();
