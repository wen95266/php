<?php
require 'config.php';
$data = json_decode(file_get_contents("php://input"), true);
$phone = trim($data['phone'] ?? '');
$password = trim($data['password'] ?? '');

$res = $db->prepare("SELECT id, nickname, password, score, is_admin FROM users WHERE phone=?");
$res->bind_param('s', $phone);
$res->execute();
$res->store_result();
$res->bind_result($uid, $nickname, $pwdhash, $score, $is_admin);

if ($res->num_rows === 0) die(json_encode(['error'=>'手机号或密码错误']));
$res->fetch();
if (!password_verify($password, $pwdhash)) die(json_encode(['error'=>'手机号或密码错误']));

$_SESSION['uid'] = $uid;
$_SESSION['phone'] = $phone;
$_SESSION['nickname'] = $nickname;
$_SESSION['is_admin'] = $is_admin;

$db->query("UPDATE users SET last_login=NOW() WHERE id=$uid");
echo json_encode(['ok'=>1, 'nickname'=>$nickname, 'score'=>$score, 'is_admin'=>$is_admin]);
?>