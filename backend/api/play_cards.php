<?php
error_reporting(E_ERROR | E_PARSE);
ini_set('display_errors', 0);
header('Content-Type: application/json');

try {
    $data = json_decode(file_get_contents('php://input'), true);

    // 参数校验
    $roomId = isset($data['roomId']) ? trim($data['roomId']) : '';
    $nickname = isset($data['nickname']) ? trim($data['nickname']) : '';
    $cards = isset($data['cards']) && is_array($data['cards']) ? $data['cards'] : [];

    if (!$roomId || !$nickname) {
        echo json_encode(['success'=>false, 'message'=>'缺少房间号或昵称参数']);
        exit;
    }
    if (count($cards) !== 13) {
        echo json_encode(['success'=>false, 'message'=>'请提交13张牌']);
        exit;
    }

    $roomfile = __DIR__ . "/rooms/{$roomId}.json";
    if (!file_exists($roomfile)) {
        echo json_encode(['success'=>false, 'message'=>'房间不存在']);
        exit;
    }

    $room = json_decode(file_get_contents($roomfile), true);
    $found = false;
    foreach($room['players'] as &$p) {
        if ($p['nickname']===$nickname) {
            $p['cards'] = $cards;
            $p['played'] = true;
            $found = true;
        }
    }
    if (!$found) {
        echo json_encode(['success'=>false, 'message'=>'玩家不存在']);
        exit;
    }
    file_put_contents($roomfile, json_encode($room, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    echo json_encode(['success'=>true,'message'=>'出牌成功']);
} catch (Exception $e) {
    echo json_encode(['success'=>false, 'message'=>'后端异常: '.$e->getMessage()]);
    exit;
}
