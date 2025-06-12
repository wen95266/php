<?php
error_reporting(E_ERROR | E_PARSE);
ini_set('display_errors', 0);
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$roomId = trim($data['roomId'] ?? '');
$nickname = trim($data['nickname'] ?? '');
$cards = $data['cards'] ?? [];
$roomfile = __DIR__ . "/rooms/{$roomId}.json";
if (!file_exists($roomfile)) { echo json_encode(['success'=>false,'message'=>'房间不存在']); exit; }
$room = json_decode(file_get_contents($roomfile), true);
foreach($room['players'] as &$p) {
  if ($p['nickname']===$nickname) {
    $p['cards'] = $cards;
    $p['played'] = true;
  }
}
file_put_contents($roomfile, json_encode($room, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
echo json_encode(['success'=>true,'message'=>'出牌成功']);
