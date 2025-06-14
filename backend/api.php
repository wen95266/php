<?php
// 简易内存型存储，可换为数据库
session_start();
$roomsFile = __DIR__ . '/rooms.json';
if (!file_exists($roomsFile)) file_put_contents($roomsFile, "{}");

// 读存储
function loadRooms() {
    global $roomsFile;
    return json_decode(file_get_contents($roomsFile), true);
}
function saveRooms($rooms) {
    global $roomsFile;
    file_put_contents($roomsFile, json_encode($rooms));
}

function createDeck() {
    $suits = ['spades', 'hearts', 'diamonds', 'clubs'];
    $values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    $deck = [];
    foreach ($suits as $s) foreach ($values as $v) $deck[] = ["value" => $v, "suit" => $s];
    shuffle($deck);
    return $deck;
}

// API
$action = $_GET['action'] ?? '';
header('Content-Type: application/json');
$rooms = loadRooms();

if ($action === 'create_room') {
    $roomId = substr(md5(uniqid('', true)), 0, 6);
    $player = $_GET['player'];
    $rooms[$roomId] = [
        "players" => [$player],
        "status" => "waiting",
        "hands" => [],
        "submits" => [],
        "results" => null
    ];
    saveRooms($rooms);
    echo json_encode(["roomId" => $roomId]);
    exit;
}

if ($action === 'join_room') {
    $room = $_GET['room'];
    $player = $_GET['player'];
    if (!isset($rooms[$room])) die(json_encode(["success" => false]));
    if (!in_array($player, $rooms[$room]['players'])) $rooms[$room]['players'][] = $player;
    saveRooms($rooms);
    echo json_encode(["success" => true]);
    exit;
}

if ($action === 'start_game') {
    $room = $_GET['room'];
    if (!isset($rooms[$room])) die(json_encode(["success" => false]));
    $deck = createDeck();
    $hands = [];
    foreach ($rooms[$room]['players'] as $p) $hands[$p] = array_splice($deck, 0, 13);
    $rooms[$room]['hands'] = $hands;
    $rooms[$room]['status'] = "playing";
    $rooms[$room]['submits'] = [];
    $rooms[$room]['results'] = null;
    saveRooms($rooms);
    echo json_encode(["success" => true]);
    exit;
}

if ($action === 'room_state') {
    $room = $_GET['room'];
    $player = $_GET['player'] ?? null;
    $state = $rooms[$room] ?? null;
    if (!$state) die(json_encode(["error" => "no room"]));
    $ret = [
        "players" => $state['players'],
        "status" => $state['status'],
        "results" => $state['results']
    ];
    if ($player && isset($state["hands"][$player])) $ret["myHand"] = $state["hands"][$player];
    echo json_encode($ret);
    exit;
}

if ($action === 'submit_hand') {
    $room = $_GET['room'];
    $player = $_GET['player'];
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($rooms[$room])) die(json_encode(["error" => "no room"]));
    $rooms[$room]['submits'][$player] = $data['hand'];
    // 是否全部提交
    if (count($rooms[$room]['submits']) === count($rooms[$room]['players'])) {
        $rooms[$room]['status'] = 'finished';
        // 简单比牌逻辑：TODO 完善十三水牌型比较
        $scores = [];
        foreach ($rooms[$room]['players'] as $p) $scores[$p]=0;
        foreach ($rooms[$room]['players'] as $p1) foreach ($rooms[$room]['players'] as $p2) {
            if ($p1 >= $p2) continue;
            // 逐道比大小，这里用牌点简单累计（可改为标准十三水规则）
            for ($i=0;$i<3;++$i) {
                $v1 = sumHand($rooms[$room]['submits'][$p1][$i]);
                $v2 = sumHand($rooms[$room]['submits'][$p2][$i]);
                if ($v1 > $v2) $scores[$p1]++;
                elseif ($v1 < $v2) $scores[$p2]++;
            }
        }
        $rooms[$room]['results'] = $scores;
    }
    saveRooms($rooms);
    echo json_encode(["success" => true]);
    exit;
}

if ($action === 'get_results') {
    $room = $_GET['room'];
    if (!isset($rooms[$room])) die(json_encode(["error" => "no room"]));
    echo json_encode(["results" => $rooms[$room]['results']]);
    exit;
}

// 牌型简化评比函数，可按十三水规则扩展
function sumHand($cards) {
    $map = ['A'=>14, 'K'=>13, 'Q'=>12, 'J'=>11, '10'=>10, '9'=>9, '8'=>8, '7'=>7, '6'=>6, '5'=>5, '4'=>4, '3'=>3, '2'=>2];
    $sum = 0;
    foreach ($cards as $c) $sum += $map[$c['value']];
    return $sum;
}

echo json_encode(["error" => "unknown action"]);
exit;
?>
