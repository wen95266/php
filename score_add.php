<?php
require 'config.php';
if (!isset($_SESSION['uid']) || !$_SESSION['is_admin']) die(json_encode(['error'=>'仅管理员可加分']));
$data = json_decode(file_get_contents("php://input"), true);
$phone = trim($data['phone'] ?? '');
$value = intval($data['value'] ?? 0);
if (!$phone || !$value) die(json_encode(['error'=>'参数错误']));
$res = $db->query("SELECT id, score FROM users WHERE phone='$phone'");
if (!($u = $res->fetch_assoc())) die(json_encode(['error'=>'用户不存在']));
$newscore = $u['score'] + $value;
$db->query("UPDATE users SET score=$newscore WHERE id={$u['id']}");
$db->query("INSERT INTO score_history (user_id, change_val, after_val, change_type, remark, create_time) VALUES ({$u['id']}, $value, $newscore, 'admin_add', '管理员加分', NOW())");
echo json_encode(['ok'=>1, 'newscore'=>$newscore]);
?>