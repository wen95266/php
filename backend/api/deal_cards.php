<?php
error_reporting(E_ERROR | E_PARSE);
ini_set('display_errors', 0);
header('Content-Type: application/json');

try {
    // 参数校验
    $data = json_decode(file_get_contents('php://input'), true);
    $roomId = isset($data['roomId']) ? trim($data['roomId']) : '';
    if (!$roomId) {
        echo json_encode(['success'=>false,'message'=>'缺少房间号参数']);
        exit;
    }
    $roomfile = __DIR__ . "/rooms/{$roomId}.json";
    if (!file_exists($roomfile)) {
        echo json_encode(['success'=>false,'message'=>'房间不存在']);
        exit;
    }

    $room = json_decode(file_get_contents($roomfile), true);

    // 准备扑克牌
    $deck = [];
    $suits = ['spades','hearts','diamonds','clubs'];
    $ranks = ['2','3','4','5','6','7','8','9','10','jack','queen','king','ace'];
    foreach($suits as $s) foreach($ranks as $r) $deck[] = "{$r}_of_{$s}";
    shuffle($deck);

    // 发牌
    foreach($room['players'] as &$p) {
        $p['cards'] = array_splice($deck,0,13);
        $p['played'] = false;
    }
    $room['status'] = 'dealt';

    if (file_put_contents($roomfile, json_encode($room, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)) === false) {
        echo json_encode(['success'=>false,'message'=>'发牌写入失败']);
        exit;
    }
    echo json_encode(['success'=>true]);
} catch(Exception $e) {
    echo json_encode(['success'=>false,'message'=>'后端异常: '.$e->getMessage()]);
    exit;
}
