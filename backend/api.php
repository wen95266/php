<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Access-Control-Allow-Methods: *");
session_start();

$roomsFile = __DIR__ . '/rooms.json';
$matchFile = __DIR__ . '/matching.json';
if (!file_exists($roomsFile)) file_put_contents($roomsFile, "{}");
if (!file_exists($matchFile)) file_put_contents($matchFile, "[]");

function loadRooms() {
    global $roomsFile;
    return json_decode(file_get_contents($roomsFile), true);
}
function saveRooms($rooms) {
    global $roomsFile;
    file_put_contents($roomsFile, json_encode($rooms));
}
function loadMatchPool() {
    global $matchFile;
    return json_decode(file_get_contents($matchFile), true);
}
function saveMatchPool($matchPool) {
    global $matchFile;
    file_put_contents($matchFile, json_encode($matchPool));
}
function createDeck() {
    $suits = ['spades', 'hearts', 'diamonds', 'clubs'];
    $values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    $deck = [];
    foreach ($suits as $s) foreach ($values as $v) $deck[] = ["value" => $v, "suit" => $s];
    shuffle($deck);
    return $deck;
}
function cardValue($val) {
    $map = ['A'=>14, 'K'=>13, 'Q'=>12, 'J'=>11, '10'=>10, '9'=>9, '8'=>8, '7'=>7, '6'=>6, '5'=>5, '4'=>4, '3'=>3, '2'=>2];
    return $map[$val];
}
function sortCards($cards) {
    usort($cards, function($a, $b) { return cardValue($b['value']) - cardValue($a['value']); });
    return $cards;
}
function getCounts($hand) {
    $vcount = [];
    $scount = [];
    foreach ($hand as $c) {
        $v = cardValue($c['value']);
        $s = $c['suit'];
        $vcount[$v] = ($vcount[$v] ?? 0) + 1;
        $scount[$s] = ($scount[$s] ?? 0) + 1;
    }
    return [$vcount, $scount];
}
function isStraight($hand) {
    $vals = [];
    foreach ($hand as $c) $vals[] = cardValue($c['value']);
    sort($vals);
    $vals = array_unique($vals);
    if (count($vals) !== count($hand)) return false;
    $min = min($vals); $max = max($vals);
    if ($max == 14 && $vals[0] == 2 && $vals[1] == 3 && $vals[2] == 4 && $vals[3] == 5) return 5;
    if ($max - $min == count($hand)-1) return $max;
    return false;
}
function getHandType($hand) {
    $len = count($hand);
    $hand = sortCards($hand);
    list($vcount, $scount) = getCounts($hand);
    $vals = array_keys($vcount);
    rsort($vals);
    $isFlush = false;
    foreach ($scount as $s => $cnt) if ($cnt == $len) $isFlush = true;
    $straightHigh = isStraight($hand);
    if ($len == 5) {
        if ($isFlush && $straightHigh) return [9, "同花顺", $straightHigh];
        if (in_array(4, $vcount)) {
            $four = array_search(4, $vcount); $single = array_search(1, $vcount);
            return [8, "四条", $four, $single];
        }
        if (in_array(3, $vcount) && in_array(2, $vcount)) {
            $three = array_search(3, $vcount); $two = array_search(2, $vcount);
            return [7, "葫芦", $three, $two];
        }
        if ($isFlush) return [6, "同花", $vals];
        if ($straightHigh) return [5, "顺子", $straightHigh];
        if (in_array(3, $vcount)) {
            $three = array_search(3, $vcount);
            $other = [];
            foreach ($vals as $v) if ($v != $three) $other[] = $v;
            return [4, "三条", $three, $other];
        }
        $pairs = [];
        foreach ($vcount as $v => $cnt) if ($cnt == 2) $pairs[] = $v;
        if (count($pairs) == 2) {
            rsort($pairs);
            $single = array_search(1, $vcount);
            return [3, "两对", $pairs, $single];
        }
        if (count($pairs) == 1) {
            $pair = $pairs[0];
            $other = [];
            foreach ($vals as $v) if ($v != $pair) $other[] = $v;
            return [2, "一对", $pair, $other];
        }
        return [1, "散牌", $vals];
    }
    if ($len == 3) {
        if (in_array(3, $vcount)) {
            $three = array_search(3, $vcount);
            return [4, "三条", $three];
        }
        $pairs = [];
        foreach ($vcount as $v => $cnt) if ($cnt == 2) $pairs[] = $v;
        if (count($pairs) == 1) {
            $pair = $pairs[0];
            $single = array_search(1, $vcount);
            return [2, "一对", $pair, $single];
        }
        return [1, "散牌", $vals];
    }
    return [0, "无效", 0];
}
function compareHand($hand1, $hand2) {
    $t1 = getHandType($hand1);
    $t2 = getHandType($hand2);
    if ($t1[0] != $t2[0]) return $t1[0] > $t2[0] ? 1 : -1;
    for ($i=2; $i<count($t1); ++$i) {
        if (is_array($t1[$i]) && is_array($t2[$i])) {
            for ($j=0;$j<count($t1[$i]);++$j) {
                if (!isset($t2[$i][$j])) return 1;
                if ($t1[$i][$j] != $t2[$i][$j]) return $t1[$i][$j] > $t2[$i][$j] ? 1 : -1;
            }
        } else {
            if ($t1[$i] != $t2[$i]) return $t1[$i] > $t2[$i] ? 1 : -1;
        }
    }
    return 0;
}
function isLegalSplit($split) {
    if (count($split) !== 3 || count($split[0]) !== 3 || count($split[1]) !== 5 || count($split[2]) !== 5) return false;
    $t0 = getHandType($split[0]);
    $t1 = getHandType($split[1]);
    $t2 = getHandType($split[2]);
    if ($t0[0] > $t1[0] || $t1[0] > $t2[0]) return false;
    if ($t0[0] == $t1[0] && compareHand($split[0], $split[1]) > 0) return false;
    if ($t1[0] == $t2[0] && compareHand($split[1], $split[2]) > 0) return false;
    return true;
}

// ----------- 提升智能AI分牌 --------------
// 组合枚举函数
function combinations($arr, $n) {
    $result = [];
    $len = count($arr);
    if ($n > $len) return $result;
    $indexes = range(0, $n - 1);
    while (true) {
        $comb = [];
        for ($i = 0; $i < $n; ++$i) $comb[] = $arr[$indexes[$i]];
        $result[] = $comb;
        $i = $n - 1;
        while ($i >= 0 && $indexes[$i] == $len - $n + $i) $i--;
        if ($i < 0) break;
        $indexes[$i]++;
        for ($j = $i + 1; $j < $n; ++$j)
            $indexes[$j] = $indexes[$j - 1] + 1;
    }
    return $result;
}

// 更高级的评估函数：头道不能鸡蛋，尾道/中道优先大牌型，三条/两对头道加权
function aiSplitScore($split) {
    $scoreTable = [
        "同花顺"=>900, "四条"=>800, "葫芦"=>650, "同花"=>500, "顺子"=>400,
        "三条"=>310, "两对"=>180, "一对"=>80, "散牌"=>0
    ];
    $t0 = getHandType($split[0]);
    $t1 = getHandType($split[1]);
    $t2 = getHandType($split[2]);
    $penalty = ($t0[1] === "散牌") ? -200 : 0;
    $bonus = 0;
    if ($t0[1] === "三条") $bonus += 100;
    if ($t0[1] === "两对") $bonus += 50;
    if ($t1[1] === "葫芦" || $t2[1] === "葫芦") $bonus += 40;
    if ($t2[1] === "同花顺") $bonus += 100;
    // 牌型分+头道点数+中道点数+尾道点数
    $score = $scoreTable[$t2[1]] * 8 + $scoreTable[$t1[1]] * 3 + $scoreTable[$t0[1]] + $penalty + $bonus;
    $score += (is_numeric($t0[2]) ? $t0[2] : 0) + (is_numeric($t1[2]) ? $t1[2] : 0) + (is_numeric($t2[2]) ? $t2[2] : 0);
    return $score;
}

// 尝试部分优先策略，先枚举尾道大牌型，再枚举中道，头道留给三条/两对/对子/高牌
function aiAutoSplit($hand) {
    if (count($hand) !== 13) {
        return [
            array_slice($hand, 0, 3),
            array_slice($hand, 3, 8),
            array_slice($hand, 8, 13)
        ];
    }
    $allIdx = range(0, 12);
    $bestSplit = null;
    $bestScore = -999999;
    $tailCombos = combinations($allIdx, 5);
    // 先按尾道优先炸弹/葫芦/同花顺/同花/顺子/三条/两对
    $priorTypes = ["同花顺"=>9,"四条"=>8,"葫芦"=>7,"同花"=>6,"顺子"=>5,"三条"=>4,"两对"=>3,"一对"=>2,"散牌"=>1];
    $tailCombosSorted = [];
    foreach ($tailCombos as $combo) {
        $cards = [$hand[$combo[0]],$hand[$combo[1]],$hand[$combo[2]],$hand[$combo[3]],$hand[$combo[4]]];
        $typ = getHandType($cards);
        $tailCombosSorted[] = [$combo, $priorTypes[$typ[1]] ?? 0, $typ[0]];
    }
    // 优先高牌型
    usort($tailCombosSorted, function($a, $b) {
        if ($a[1] != $b[1]) return $b[1] - $a[1];
        return $b[2] - $a[2];
    });
    // 外层优先高牌型尾道
    foreach ($tailCombosSorted as $tc) {
        $tailIdx = $tc[0];
        $remain1 = array_diff($allIdx, $tailIdx);
        $midCombos = combinations($remain1, 5);
        foreach ($midCombos as $midIdx) {
            $headIdx = array_values(array_diff($remain1, $midIdx));
            if (count($headIdx) !== 3) continue;
            $head = [$hand[$headIdx[0]], $hand[$headIdx[1]], $hand[$headIdx[2]]];
            $mid = [$hand[$midIdx[0]], $hand[$midIdx[1]], $hand[$midIdx[2]], $hand[$midIdx[3]], $hand[$midIdx[4]]];
            $tail = [$hand[$tailIdx[0]], $hand[$tailIdx[1]], $hand[$tailIdx[2]], $hand[$tailIdx[3]], $hand[$tailIdx[4]]];
            $split = [$head, $mid, $tail];
            if (!isLegalSplit($split)) continue;
            $score = aiSplitScore($split);
            if ($score > $bestScore) {
                $bestScore = $score;
                $bestSplit = $split;
            }
        }
    }
    if ($bestSplit) return $bestSplit;
    // 兜底
    return [
        array_slice($hand, 0, 3),
        array_slice($hand, 3, 8),
        array_slice($hand, 8, 13)
    ];
}

// ---- 多人自动匹配池 ----
function doMatchPool() {
    $matchPool = loadMatchPool();
    $rooms = loadRooms();
    $changed = false;
    while (count($matchPool) >= 4) {
        $players = array_splice($matchPool, 0, 4);
        $roomId = substr(md5(uniqid('', true)), 0, 6);
        $rooms[$roomId] = [
            "players" => $players,
            "status" => "waiting",
            "hands" => [],
            "submits" => [],
            "results" => null
        ];
        // 发牌
        $deck = createDeck();
        $hands = [];
        foreach ($players as $p) $hands[$p] = array_splice($deck, 0, 13);
        $rooms[$roomId]['hands'] = $hands;
        $rooms[$roomId]['status'] = "playing";
        $rooms[$roomId]['submits'] = [];
        $rooms[$roomId]['results'] = null;
        foreach ($players as $p) {
            $rooms[$roomId]['playerMap'][$p] = $roomId;
        }
        $rooms[$roomId]['created_at'] = time();
        $rooms[$roomId]['matched'] = true;
        $rooms[$roomId]['orig_players'] = $players;
        $changed = true;
        file_put_contents(__DIR__.'/matchlog.txt', "[".date('c')."] match: ".json_encode($players)."\n", FILE_APPEND);
    }
    if ($changed) {
        saveRooms($rooms);
        saveMatchPool($matchPool);
    }
    return [$rooms, $matchPool];
}

// ---- API ----
$action = $_GET['action'] ?? '';
header('Content-Type: application/json');
$rooms = loadRooms();
if ($action === 'create_room') {
    $roomId = substr(md5(uniqid('', true)), 0, 6);
    $player = $_GET['player'];
    $rooms[$roomId] = [
        "players" => [$player],
        "status" => "waiting",
        "hands" => [],
        "submits" => [],
        "results" => null
    ];
    saveRooms($rooms);
    echo json_encode(["roomId" => $roomId]);
    exit;
}
if ($action === 'join_room') {
    $room = $_GET['room'];
    $player = $_GET['player'];
    if (!isset($rooms[$room])) die(json_encode(["success" => false]));
    if (!in_array($player, $rooms[$room]['players'])) $rooms[$room]['players'][] = $player;
    saveRooms($rooms);
    echo json_encode(["success" => true]);
    exit;
}
if ($action === 'start_game') {
    $room = $_GET['room'];
    if (!isset($rooms[$room])) die(json_encode(["success" => false]));
    $deck = createDeck();
    $hands = [];
    foreach ($rooms[$room]['players'] as $p) $hands[$p] = array_splice($deck, 0, 13);
    $rooms[$room]['hands'] = $hands;
    $rooms[$room]['status'] = "playing";
    $rooms[$room]['submits'] = [];
    $rooms[$room]['results'] = null;
    saveRooms($rooms);
    echo json_encode(["success" => true]);
    exit;
}
if ($action === 'room_state') {
    $room = $_GET['room'];
    $player = $_GET['player'] ?? null;
    $state = $rooms[$room] ?? null;
    if (!$state) die(json_encode(["error" => "no room"]));
    $ret = [
        "players" => $state['players'],
        "status" => $state['status'],
        "results" => $state['results'],
        "submits" => $state['submits']
    ];
    if ($player && isset($state["hands"][$player])) $ret["myHand"] = $state["hands"][$player];
    echo json_encode($ret);
    exit;
}
if ($action === 'submit_hand') {
    $room = $_GET['room'];
    $player = $_GET['player'];
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($rooms[$room])) die(json_encode(["error" => "no room"]));
    $split = $data['hand'];
    if (count($split) != 3 || count($split[0]) != 3 || count($split[1]) != 5 || count($split[2]) != 5) {
        die(json_encode(["error" => "牌型结构错误"]));
    }
    if (!isLegalSplit($split)) {
        die(json_encode(["error" => "前中后道不符合规则"]));
    }
    $rooms[$room]['submits'][$player] = $split;

    // ------ AI自动分牌：智能增强 ------
    foreach ($rooms[$room]['players'] as $p) {
        if (!isset($rooms[$room]['submits'][$p]) && preg_match('/^AI-/', $p)) {
            $hand = $rooms[$room]['hands'][$p];
            if (count($hand) != 13) continue;
            $ai_split = aiAutoSplit($hand);
            if (
                !isLegalSplit($ai_split) ||
                count($ai_split[0])!=3 ||
                count($ai_split[1])!=5 ||
                count($ai_split[2])!=5
            ) {
                $found = false;
                for ($try = 0; $try < 3000; ++$try) {
                    $idx = range(0, 12);
                    shuffle($idx);
                    $head = [$hand[$idx[0]], $hand[$idx[1]], $hand[$idx[2]]];
                    $mid = [$hand[$idx[3]], $hand[$idx[4]], $hand[$idx[5]], $hand[$idx[6]], $hand[$idx[7]]];
                    $tail = [$hand[$idx[8]], $hand[$idx[9]], $hand[$idx[10]], $hand[$idx[11]], $hand[$idx[12]]];
                    $candidate = [$head, $mid, $tail];
                    if (isLegalSplit($candidate)) {
                        $ai_split = $candidate;
                        $found = true;
                        break;
                    }
                }
                if (!$found) {
                    $ai_split = [
                        array_slice($hand, 0, 3),
                        array_slice($hand, 3, 8),
                        array_slice($hand, 8, 13)
                    ];
                }
            }
            if (
                count($ai_split[0])==3 &&
                count($ai_split[1])==5 &&
                count($ai_split[2])==5
            ) {
                $rooms[$room]['submits'][$p] = $ai_split;
            }
        }
    }

    // 结果计算
    if (count($rooms[$room]['submits']) === count($rooms[$room]['players'])) {
        $rooms[$room]['status'] = 'finished';
        $scores = [];
        $details = [];
        foreach ($rooms[$room]['players'] as $p) {
            $scores[$p]=0;
            $details[$p] = ["每道得分"=>[0,0,0], "牌型"=>[
                getHandType($rooms[$room]['submits'][$p][0])[1],
                getHandType($rooms[$room]['submits'][$p][1])[1],
                getHandType($rooms[$room]['submits'][$p][2])[1]
            ]];
        }
        $players = $rooms[$room]['players'];
        for ($i=0; $i<count($players); ++$i) {
            for ($j=$i+1; $j<count($players); ++$j) {
                $p1 = $players[$i]; $p2 = $players[$j];
                $res = [0,0,0];
                for ($d=0;$d<3;++$d) {
                    $cmp = compareHand($rooms[$room]['submits'][$p1][$d], $rooms[$room]['submits'][$p2][$d]);
                    if ($cmp > 0) {
                        $scores[$p1]++;
                        $details[$p1]["每道得分"][$d]++;
                    } else if ($cmp < 0) {
                        $scores[$p2]++;
                        $details[$p2]["每道得分"][$d]++;
                    }
                }
                $win1 = 0; $win2 = 0;
                for ($d=0;$d<3;++$d) {
                    $cmp = compareHand($rooms[$room]['submits'][$p1][$d], $rooms[$room]['submits'][$p2][$d]);
                    if ($cmp > 0) $win1++;
                    else if ($cmp < 0) $win2++;
                }
                if ($win1 == 3) { $scores[$p1] += 3; $details[$p1]["打枪"] = ($details[$p1]["打枪"] ?? 0) + 1; }
                if ($win2 == 3) { $scores[$p2] += 3; $details[$p2]["打枪"] = ($details[$p2]["打枪"] ?? 0) + 1; }
            }
        }
        $rooms[$room]['results'] = ["总分"=>$scores, "详情"=>$details];
    }
    saveRooms($rooms);
    echo json_encode(["success" => true]);
    exit;
}
if ($action === 'get_results') {
    $room = $_GET['room'];
    if (!isset($rooms[$room])) die(json_encode(["error" => "no room"]));
    echo json_encode(["results" => $rooms[$room]['results']]);
    exit;
}
if ($action === 'join_match') {
    $player = $_GET['player'];
    $matchPool = loadMatchPool();
    if (!in_array($player, $matchPool)) $matchPool[] = $player;
    saveMatchPool($matchPool);
    list($roomsNew, $matchPoolNew) = doMatchPool();
    $rooms = $roomsNew;
    $matchPool = $matchPoolNew;
    foreach ($rooms as $rid=>$rm) {
        if (isset($rm['matched']) && in_array($player, $rm['players'])) {
            echo json_encode(["status"=>"matched", "roomId"=>$rid]);
            exit;
        }
    }
    echo json_encode(["status"=>"waiting"]);
    exit;
}
if ($action === 'cancel_match') {
    $player = $_GET['player'];
    $matchPool = loadMatchPool();
    if (($k = array_search($player, $matchPool)) !== false) {
        array_splice($matchPool, $k, 1);
        saveMatchPool($matchPool);
    }
    echo json_encode(["success"=>true]);
    exit;
}
echo json_encode(["error" => "unknown action"]);
exit;
?>
