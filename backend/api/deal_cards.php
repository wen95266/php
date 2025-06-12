<?php
// 洗牌、发牌
header('Content-Type: application/json');
$data = json_decode(file_get_contents('php://input'), true);
$roomId = trim($data['roomId'] ?? '');
$roomfile = __DIR__ . "/rooms/{$roomId}.json";
if (!file_exists($roomfile)) { echo json_encode(['success'=>false,'message'=>'房间不存在']); exit; }
$room = json_decode(file_get_contents($roomfile), true);
$deck = [];
$suits = ['spades','hearts','diamonds','clubs'];
$ranks = ['2','3','4','5','6','7','8','9','10','jack','queen','king','ace'];
foreach($suits as $s) foreach($ranks as $r) $deck[] = "{$r}_of_{$s}";
shuffle($deck);
foreach($room['players'] as &$p) {
  $p['cards'] = array_splice($deck,0,13);
  $p['played'] = false;
}
$room['status'] = 'dealt';
file_put_contents($roomfile, json_encode($room, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
echo json_encode(['success'=>true]);
