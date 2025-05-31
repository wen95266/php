<?php
require_once '../config.php';
require_once '_util.php';
header('Content-Type: application/json');
$db = get_db();
$action = $_GET['action'] ?? $_POST['action'] ?? '';

if ($action == 'match') {
    // 查询等待房间或新建
    $room = $db->query("SELECT id FROM rooms WHERE status='waiting' LIMIT 1")->fetch_assoc();
    if (!$room) {
        $db->query("INSERT INTO rooms (status) VALUES ('waiting')");
        $roomId = $db->insert_id;
    } else {
        $roomId = $room['id'];
    }
    // 加入房间
    $userId = getUserId();
    $db->query("INSERT IGNORE INTO room_users (room_id, user_id, position) VALUES ($roomId, $userId, FLOOR(1+RAND()*4))");
    // 检查人数
    $c = $db->query("SELECT COUNT(*) as c FROM room_users WHERE room_id=$roomId")->fetch_assoc()['c'];
    if ($c >= 4) {
        // 发牌并开局
        $suits = ['spades','hearts','clubs','diamonds'];
        $deck = [];
        foreach($suits as $s)
            foreach(range(1,13) as $n) $deck[] = $n.'_'.$s;
        shuffle($deck);
        $users = $db->query("SELECT * FROM room_users WHERE room_id=$roomId")->fetch_all(MYSQLI_ASSOC);
        $i = 0;
        foreach($users as $user) {
            $user_cards = json_encode(array_slice($deck, $i*13, 13));
            $uid = $user['user_id'];
            $db->query("UPDATE room_users SET cards='$user_cards' WHERE room_id=$roomId AND user_id=$uid");
            $i++;
        }
        $db->query("UPDATE rooms SET status='started', started_at=NOW() WHERE id=$roomId");
    }
    echo json_encode(['success'=>true, 'roomId'=>$roomId]);
    exit;
}
if ($action == 'status') {
    $roomId = intval($_GET['room'] ?? 0);
    $userId = getUserId();
    $room = $db->query("SELECT status FROM rooms WHERE id=$roomId")->fetch_assoc();
    $ru = $db->query("SELECT cards FROM room_users WHERE room_id=$roomId AND user_id=$userId")->fetch_assoc();
    echo json_encode([
        'started'=>isset($room) && $room['status']=='started',
        'cards'=>isset($ru['cards']) ? json_decode($ru['cards']) : []
    ]);
    exit;
}
if ($action == 'trustee') {
    $roomId = intval($_POST['room'] ?? $_GET['room'] ?? 0);
    $userId = getUserId();
    $db->query("UPDATE room_users SET is_trustee=1 WHERE room_id=$roomId AND user_id=$userId");
    echo json_encode(['success'=>true]);
    exit;
}
