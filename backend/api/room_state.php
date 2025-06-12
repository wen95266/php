<?php
error_reporting(E_ERROR | E_PARSE);
ini_set('display_errors', 0);
header('Content-Type: application/json');

try {
    $data = json_decode(file_get_contents('php://input'), true);
    $roomId = isset($data['roomId']) ? trim($data['roomId']) : '';
    $nickname = isset($data['nickname']) ? trim($data['nickname']) : '';
    if (!$roomId || !$nickname) {
        echo json_encode(['success'=>false, 'message'=>'缺少房间号或昵称参数']);
        exit;
    }
    $roomfile = __DIR__ . "/rooms/{$roomId}.json";
    if (!file_exists($roomfile)) {
        echo json_encode(['success'=>false,'message'=>'房间不存在']);
        exit;
    }
    $room = json_decode(file_get_contents($roomfile), true);

    $myHand = [];
    $meFound = false;
    foreach($room['players'] as $p) {
        if ($p['nickname']===$nickname) {
            $meFound = true;
            $myHand = isset($p['cards']) ? $p['cards'] : [];
            break;
        }
    }
    if (!$meFound) {
        echo json_encode(['success'=>false, 'message'=>'玩家不存在']);
        exit;
    }

    echo json_encode([
        'success'=>true,
        'players'=>array_map(function($p){
            return [
                'nickname'=>$p['nickname'],
                'cards'=>(isset($p['played']) && $p['played']) ? $p['cards'] : null,
                'hand'=>(!isset($p['played']) || !$p['played']) && is_array($p['cards']) && count($p['cards'])===13 ? $p['cards'] : null
            ];
        }, $room['players']),
        'myHand'=>$myHand,
    ]);
} catch(Exception $e) {
    echo json_encode(['success'=>false,'message'=>'后端异常: '.$e->getMessage()]);
    exit;
}
