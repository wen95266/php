<?php
require 'config.php';
if (!isset($_SESSION['uid'])) die(json_encode(['error'=>'未登录']));
$uid = $_SESSION['uid'];
$res = $db->query("SELECT change_val, after_val, change_type, remark, create_time FROM score_history WHERE user_id=$uid ORDER BY id DESC LIMIT 50");
$list = [];
while ($row = $res->fetch_assoc()) $list[] = $row;
echo json_encode($list);
?>