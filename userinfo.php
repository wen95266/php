<?php
require 'config.php';
if (!isset($_SESSION['uid'])) die(json_encode(['error'=>'未登录']));
$uid = $_SESSION['uid'];

$res = $db->query("SELECT phone, nickname, score, is_admin FROM users WHERE id=$uid");
if ($user = $res->fetch_assoc()) {
    echo json_encode($user);
} else {
    echo json_encode(['error'=>'未找到用户']);
}
?>