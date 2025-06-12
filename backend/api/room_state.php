<?php
header('Content-Type: application/json');
$data = json_decode(file_get_contents('php://input'), true);
$roomId = trim($data['roomId'] ?? '');
$nickname = trim($data['nickname'] ?? '');
$roomfile = __DIR__ . "/rooms/{$roomId}.json";
if (!file_exists($roomfile)) { echo json_encode(['success'=>false,'message'=>'房间不存在']); exit; }
$room = json_decode(file_get_contents($roomfile), true);
$myHand = [];
foreach($room['players'] as $p) if ($p['nickname']===$nickname) $myHand = $p['cards'];
echo json_encode([
  'success'=>true,
  'players'=>array_map(function($p){
    return ['nickname'=>$p['nickname'], 'cards'=>$p['played']?$p['cards']:null];
  }, $room['players']),
  'myHand'=>$myHand,
]);
