<?php
error_reporting(E_ERROR | E_PARSE);
ini_set('display_errors', 0);
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$nickname = trim($data['nickname'] ?? '');
$roomId = trim($data['roomId'] ?? '');
if (!$nickname || !$roomId) { echo json_encode(['success'=>false,'message'=>'参数错误']); exit; }
$roomfile = __DIR__ . "/rooms/{$roomId}.json";
if (!file_exists($roomfile)) { echo json_encode(['success'=>false,'message'=>'房间不存在']); exit; }
$room = json_decode(file_get_contents($roomfile), true);
foreach($room['players'] as $p) if ($p['nickname']===$nickname) {
  echo json_encode(['success'=>true]); exit;
}
$room['players'][] = ['nickname'=>$nickname, 'cards'=>[], 'played'=>false, 'isAI'=>false];
file_put_contents($roomfile, json_encode($room, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
echo json_encode(['success'=>true]);
