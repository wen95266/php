<?php
error_reporting(E_ERROR | E_PARSE);
ini_set('display_errors', 0);
header('Content-Type: application/json');

try {
    // 扑克牌顺序
    const CARD_ORDER = [
      '2'=>2,'3'=>3,'4'=>4,'5'=>5,'6'=>6,'7'=>7,'8'=>8,'9'=>9,'10'=>10,
      'jack'=>11,'queen'=>12,'king'=>13,'ace'=>14
    ];

    // 花色顺序: 黑桃>红桃>梅花>方块
    function suit_order($suit) {
        switch ($suit) {
            case 'spades': return 4;
            case 'hearts': return 3;
            case 'clubs': return 2;
            case 'diamonds': return 1;
        }
        return 0;
    }
    function get_max_card($cs) {
        $max = $cs[0];
        foreach ($cs as $c) {
            if ($c['value'] > $max['value']) $max = $c;
            else if ($c['value'] === $max['value'] && suit_order($c['suit']) > suit_order($max['suit'])) $max = $c;
        }
        return $max;
    }

    // 解析牌名为数组 ['rank'=>, 'suit'=>, 'name'=>, 'value'=>]
    function parse_cards($cards) {
      $res = [];
      foreach ($cards as $c) {
        if (strpos($c, '_of_') !== false) {
          [$rank, $suit] = explode('_of_', $c);
          $res[] = [
            'rank' => $rank,
            'suit' => $suit,
            'name' => $c,
            'value' => CARD_ORDER[$rank] ?? 0
          ];
        }
      }
      return $res;
    }

    function is_flush($cs) {
      if (count($cs) < 2) return true;
      $first = $cs[0]['suit'];
      foreach ($cs as $c) if ($c['suit'] !== $first) return false;
      return true;
    }
    function is_straight($cs) {
      $vs = array_map(function($c){ return $c['value']; }, $cs);
      sort($vs);
      // 特判A2345
      if (count($vs) === 5 && implode(',',$vs) === '2,3,4,5,14') return true;
      for($i=1;$i<count($vs);$i++) if($vs[$i]-$vs[$i-1]!==1) return false;
      return true;
    }
    function is_straight_flush($cs) {
      return is_flush($cs) && is_straight($cs);
    }
    function get_groups($cs) {
      $m = [];
      foreach($cs as $c) {
        $v = $c['value'];
        $m[$v] = ($m[$v]??0) + 1;
      }
      $ret = [];
      foreach($m as $v=>$cnt) $ret[] = [$cnt, intval($v)];
      usort($ret, function($a,$b){
        if ($a[0] != $b[0]) return $b[0]-$a[0];
        return $b[1]-$a[1];
      });
      return $ret;
    }
    function hand_type($cs) {
      $len = count($cs);
      if ($len === 5) {
        if (is_straight_flush($cs)) return 8;
        if (get_groups($cs)[0][0] === 4) return 7;
        if (get_groups($cs)[0][0] === 3 && get_groups($cs)[1][0] === 2) return 6;
        if (is_flush($cs)) return 5;
        if (is_straight($cs)) return 4;
        if (get_groups($cs)[0][0] === 3) return 3;
        if (get_groups($cs)[0][0] === 2 && get_groups($cs)[1][0] === 2) return 2;
        if (get_groups($cs)[0][0] === 2) return 1;
        return 0;
      } elseif ($len === 3) {
        if (get_groups($cs)[0][0] === 3) return 3;
        if (get_groups($cs)[0][0] === 2) return 1;
        return 0;
      }
      return 0;
    }
    function hand_score($cs) {
      $type = hand_type($cs);
      $groups = get_groups($cs);
      $values = array_map(function($g){return $g[1];}, $groups);
      while (count($values) < count($cs)) $values[] = 0;
      // 返回 [type, 主值, 副值, ...]，用于逐项比较
      array_unshift($values, $type);
      return $values;
    }
    function compare_hand($a, $b) {
      $sa = hand_score($a);
      $sb = hand_score($b);
      $n = max(count($sa), count($sb));
      for($i=0;$i<$n;$i++) {
        $va = $sa[$i] ?? 0;
        $vb = $sb[$i] ?? 0;
        if ($va > $vb) return 1;
        if ($va < $vb) return -1;
      }
      // 新增：同花型/同花顺/顺子时，最大牌点数相同再比最大牌花色
      $typeA = hand_type($a);
      $typeB = hand_type($b);
      if (in_array($typeA, [5,8,4]) && $typeA === $typeB) {
        $maxA = get_max_card($a);
        $maxB = get_max_card($b);
        if ($maxA['value'] > $maxB['value']) return 1;
        if ($maxA['value'] < $maxB['value']) return -1;
        // 点数相同时，比花色
        $orderA = suit_order($maxA['suit']);
        $orderB = suit_order($maxB['suit']);
        if ($orderA > $orderB) return 1;
        if ($orderA < $orderB) return -1;
      }
      return 0;
    }

    // 读取房间和玩家
    $data = json_decode(file_get_contents('php://input'), true);
    $roomId = trim($data['roomId'] ?? '');
    if (!$roomId) {
      echo json_encode(['success'=>false, 'message'=>'缺少房间号参数']);
      exit;
    }
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
        'main2'=>array_slice($p['cards'],3,8), // 兼容旧数据
        'tail'=>array_slice($p['cards'],8,5)
      ];
    }
    if (count($players) < 2) {
      echo json_encode(['success'=>false, 'message'=>'出牌玩家不足，无法比牌']);
      exit;
    }
    // 修正分道
    foreach($players as &$p) {
      $p['head'] = array_slice($p['cards'],0,3);
      $p['main'] = array_slice($p['cards'],3,5);
      $p['tail'] = array_slice($p['cards'],8,5);
    }
    unset($p);

    // 比牌
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
        $a_head = parse_cards($players[$i]['head']);
        $b_head = parse_cards($players[$j]['head']);
        $cmp = compare_hand($a_head, $b_head);
        if ($cmp > 0) { $players[$i]['headScore']++; $players[$i]['headResult'][]="win"; }
        elseif ($cmp < 0) { $players[$i]['headScore']--; $players[$i]['headResult'][]="lose"; }
        else { $players[$i]['headResult'][]="tie"; }
        // 中道
        $a_main = parse_cards($players[$i]['main']);
        $b_main = parse_cards($players[$j]['main']);
        $cmp = compare_hand($a_main, $b_main);
        if ($cmp > 0) { $players[$i]['mainScore']++; $players[$i]['mainResult'][]="win"; }
        elseif ($cmp < 0) { $players[$i]['mainScore']--; $players[$i]['mainResult'][]="lose"; }
        else { $players[$i]['mainResult'][]="tie"; }
        // 尾道
        $a_tail = parse_cards($players[$i]['tail']);
        $b_tail = parse_cards($players[$j]['tail']);
        $cmp = compare_hand($a_tail, $b_tail);
        if ($cmp > 0) { $players[$i]['tailScore']++; $players[$i]['tailResult'][]="win"; }
        elseif ($cmp < 0) { $players[$i]['tailScore']--; $players[$i]['tailResult'][]="lose"; }
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
} catch(Exception $e) {
    echo json_encode(['success'=>false, 'message'=>'后端异常: '.$e->getMessage()]);
    exit;
}
