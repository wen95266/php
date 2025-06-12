<?php
// 仅结构示例，具体十三水比牌规则需自行补充
header('Content-Type: application/json');
$data = json_decode(file_get_contents('php://input'), true);
$roomId = trim($data['roomId'] ?? '');
$roomfile = "../data/room_$roomId.json";
if (!file_exists($roomfile)) { echo json_encode(['success'=>false,'message'=>'房间不存在']); exit; }
$room = json_decode(file_get_contents($roomfile), true);
// 这里只返回玩家和牌，实际应比牌并计算输赢
$result = [];
foreach($room['players'] as $p) {
  $result[] = ['nickname'=>$p['nickname'], 'cards'=>$p['cards']];
}
echo json_encode(['success'=>true,'result'=>$result]);
