<?php
require 'config.php';
$data = json_decode(file_get_contents("php://input"), true);
$phone = trim($data['phone'] ?? '');
$nickname = trim($data['nickname'] ?? $phone);
$password = trim($data['password'] ?? '');

if (!$phone || !$password) die(json_encode(['error'=>'手机号或密码不能为空']));
if (!preg_match('/^\d{6,16}$/', $phone)) die(json_encode(['error'=>'手机号格式不正确']));

$exists = $db->prepare("SELECT id FROM users WHERE phone=?");
$exists->bind_param('s', $phone);
$exists->execute();
$exists->store_result();
if ($exists->num_rows > 0) die(json_encode(['error'=>'手机号已注册']));

$pwdhash = password_hash($password, PASSWORD_BCRYPT);
$now = date('Y-m-d H:i:s');
$stmt = $db->prepare("INSERT INTO users (phone, nickname, password, reg_time, score) VALUES (?, ?, ?, ?, 1000)");
$stmt->bind_param('ssss', $phone, $nickname, $pwdhash, $now);
$stmt->execute();
$uid = $stmt->insert_id;
$db->query("INSERT INTO score_history (user_id, change_val, after_val, change_type, remark, create_time) VALUES ($uid, 1000, 1000, 'register', '注册赠送', '$now')");
echo json_encode(['ok'=>1]);
?>