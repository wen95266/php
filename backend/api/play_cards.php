<?php
header('Content-Type: application/json');
$data = json_decode(file_get_contents('php://input'), true);
$roomId = trim($data['roomId'] ?? '');
$nickname = trim($data['nickname'] ?? '');
$cards = $data['cards'] ?? [];
$roomfile = "../data/room_$roomId.json";
if (!file_exists($roomfile)) { echo json_encode(['success'=>false,'message'=>'房间不存在']); exit; }
$room = json_decode(file_get_contents($roomfile), true);
foreach($room['players'] as &$p) {
  if ($p['nickname']===$nickname) {
    $p['cards'] = $cards;
    $p['played'] = true;
  }
}
file_put_contents($roomfile, json_encode($room));
echo json_encode(['success'=>true,'message'=>'出牌成功']);
