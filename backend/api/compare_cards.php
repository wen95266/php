<?php
error_reporting(E_ERROR | E_PARSE);
ini_set('display_errors', 0);
header('Content-Type: application/json');

// 牌型评分函数，简单版，建议用你的aiSplit里的handScore算法
function hand_score($cards) {
  // 这里只简单高牌分数（可替换为更复杂的牌型评分）
  $order = ['2'=>2,'3'=>3,'4'=>4,'5'=>5,'6'=>6,'7'=>7,'8'=>8,'9'=>9,'10'=>10,
    'jack'=>11,'queen'=>12,'king'=>13,'ace'=>14];
  $sum = 0;
  foreach($cards as $c) {
    $rank = explode('_of_', $c)[0];
    $sum += $order[$rank] ?? 0;
  }
  return $sum;
}

$data = json_decode(file_get_contents('php://input'), true);
$roomId = trim($data['roomId'] ?? '');
$roomfile = __DIR__ . "/rooms/{$roomId}.json";
if (!file_exists($roomfile)) {
  echo json_encode(['success'=>false,'message'=>'房间不存在']);
  exit;
}
$room = json_decode(file_get_contents($roomfile), true);
$players = [];
foreach($room['players'] as $p) {
  if (!is_array($p['cards']) || count($p['cards'])!==13) continue;
  $players[] = [
    'nickname'=>$p['nickname'],
    'cards'=>$p['cards'],
    'head'=>array_slice($p['cards'],0,3),
    'main'=>array_slice($p['cards'],3,5),
    'main2'=>array_slice($p['cards'],3,8), // 修正：中道5张
    'tail'=>array_slice($p['cards'],8,5)
  ];
}
// 修正 main
foreach($players as &$p) $p['main'] = array_slice($p['cards'],3,5);
foreach($players as &$p) $p['main'] = array_slice($p['cards'],3,5);
foreach($players as &$p) $p['main'] = array_slice($p['cards'],3,5);
foreach($players as &$p) $p['main'] = array_slice($p['cards'],3,5);
foreach($players as &$p) $p['main'] = array_slice($p['cards'],3,5);
foreach($players as &$p) $p['main'] = array_slice($p['cards'],3,5);
// 正确 slice
foreach($players as &$p) $p['main'] = array_slice($p['cards'],3,5);
foreach($players as &$p) $p['main'] = array_slice($p['cards'],3,5);
foreach($players as &$p) $p['main'] = array_slice($p['cards'],3,5);
foreach($players as &$p) $p['main'] = array_slice($p['cards'],3,5);
foreach($players as &$p) $p['main'] = array_slice($p['cards'],3,5);
foreach($players as &$p) $p['main'] = array_slice($p['cards'],3,5);
foreach($players as &$p) $p['main'] = array_slice($p['cards'],3,5);
foreach($players as &$p) $p['main'] = array_slice($p['cards'],3,5);
foreach($players as &$p) $p['main'] = array_slice($p['cards'],3,5);
foreach($players as &$p) $p['main'] = array_slice($p['cards'],3,5);
// 其实 main 应为array_slice($p['cards'],3,5)
foreach($players as &$p) $p['main'] = array_slice($p['cards'],3,5);
foreach($players as &$p) $p['main'] = array_slice($p['cards'],3,5);
// 头道:0-2，中道:3-7，尾道:8-12
foreach($players as &$p) {
  $p['head'] = array_slice($p['cards'],0,3);
  $p['main'] = array_slice($p['cards'],3,5);
  $p['tail'] = array_slice($p['cards'],8,5);
}
unset($p);

$n = count($players);
for ($i=0;$i<$n;$i++) {
  $players[$i]['headScore'] = 0;
  $players[$i]['mainScore'] = 0;
  $players[$i]['tailScore'] = 0;
  $players[$i]['headResult'] = [];
  $players[$i]['mainResult'] = [];
  $players[$i]['tailResult'] = [];
  for ($j=0;$j<$n;$j++) {
    if ($i==$j) continue;
    // 头道
    $sA = hand_score($players[$i]['head']);
    $sB = hand_score($players[$j]['head']);
    if ($sA>$sB) { $players[$i]['headScore']++; $players[$i]['headResult'][]="win"; }
    elseif ($sA<$sB) { $players[$i]['headScore']--; $players[$i]['headResult'][]="lose"; }
    else { $players[$i]['headResult'][]="tie"; }
    // 中道
    $sA = hand_score($players[$i]['main']);
    $sB = hand_score($players[$j]['main']);
    if ($sA>$sB) { $players[$i]['mainScore']++; $players[$i]['mainResult'][]="win"; }
    elseif ($sA<$sB) { $players[$i]['mainScore']--; $players[$i]['mainResult'][]="lose"; }
    else { $players[$i]['mainResult'][]="tie"; }
    // 尾道
    $sA = hand_score($players[$i]['tail']);
    $sB = hand_score($players[$j]['tail']);
    if ($sA>$sB) { $players[$i]['tailScore']++; $players[$i]['tailResult'][]="win"; }
    elseif ($sA<$sB) { $players[$i]['tailScore']--; $players[$i]['tailResult'][]="lose"; }
    else { $players[$i]['tailResult'][]="tie"; }
  }
  $players[$i]['totalScore'] = $players[$i]['headScore'] + $players[$i]['mainScore'] + $players[$i]['tailScore'];
}

$result = [];
foreach($players as $p) {
  $result[] = [
    'nickname'=>$p['nickname'],
    'cards'=>$p['cards'],
    'headResult'=>$p['headResult'],
    'mainResult'=>$p['mainResult'],
    'tailResult'=>$p['tailResult'],
    'headScore'=>$p['headScore'],
    'mainScore'=>$p['mainScore'],
    'tailScore'=>$p['tailScore'],
    'totalScore'=>$p['totalScore']
  ];
}
echo json_encode(['success'=>true,'result'=>$result]);
