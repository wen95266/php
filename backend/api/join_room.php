<?php
error_reporting(E_ERROR | E_PARSE);
ini_set('display_errors', 0);
header('Content-Type: application/json');

try {
    $data = json_decode(file_get_contents('php://input'), true);
    $nickname = isset($data['nickname']) ? trim($data['nickname']) : '';
    $roomId = isset($data['roomId']) ? trim($data['roomId']) : '';

    // 参数校验
    if (!$nickname || !$roomId) {
        echo json_encode(['success'=>false,'message'=>'缺少昵称或房间号参数']);
        exit;
    }
    $roomfile = __DIR__ . "/rooms/{$roomId}.json";
    if (!file_exists($roomfile)) {
        echo json_encode(['success'=>false,'message'=>'房间不存在']);
        exit;
    }
    $room = json_decode(file_get_contents($roomfile), true);

    // 昵称唯一性校验
    foreach($room['players'] as $p) {
        if ($p['nickname'] === $nickname) {
            echo json_encode(['success'=>false, 'message'=>'该昵称已存在，请换一个昵称']);
            exit;
        }
    }

    $room['players'][] = [
        'nickname'=>$nickname,
        'cards'=>[],
        'played'=>false,
        'isAI'=>false
    ];

    if (file_put_contents($roomfile, json_encode($room, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)) === false) {
        echo json_encode(['success'=>false, 'message'=>'加入房间失败，写入文件错误']);
        exit;
    }
    echo json_encode(['success'=>true]);
} catch (Exception $e) {
    echo json_encode(['success'=>false, 'message'=>'后端异常: '.$e->getMessage()]);
    exit;
}
