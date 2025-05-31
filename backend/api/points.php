<?php
require_once '../config.php';
require_once '_util.php';
header('Content-Type: application/json');
$db = get_db();
$action = $_GET['action'] ?? $_POST['action'] ?? '';
$userId = getUserId();

if ($action == 'my') {
    $u = $db->query("SELECT points FROM users WHERE id=$userId")->fetch_assoc();
    echo json_encode(['points'=>$u['points']]);
    exit;
}
if ($action == 'transfer') {
    $toPhone = $_POST['to'] ?? '';
    $points = intval($_POST['points']);
    if ($points<=0) exit(json_encode(['success'=>false,'message'=>'积分必须正数']));
    $toUser = $db->query("SELECT id FROM users WHERE phone='$toPhone'")->fetch_assoc();
    if(!$toUser) exit(json_encode(['success'=>false, 'message'=>'目标不存在']));
    $fromUser = $db->query("SELECT points FROM users WHERE id=$userId")->fetch_assoc();
    if($fromUser['points'] < $points) exit(json_encode(['success'=>false,'message'=>'积分不足']));
    $toId = $toUser['id'];
    $db->query("UPDATE users SET points=points-$points WHERE id=$userId");
    $db->query("UPDATE users SET points=points+$points WHERE id=$toId");
    $db->query("INSERT INTO points_log (from_user, to_user, points, reason) VALUES ($userId, $toId, $points, 'gift')");
    echo json_encode(['success'=>true]);
    exit;
}
