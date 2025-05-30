<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Content-Type: application/json');

function parse_cards($cards) {
    $parsed = [];
    foreach ($cards as $c) {
        $suit = mb_substr($c, 0, 1, 'UTF-8');
        $point = mb_substr($c, 1, null, 'UTF-8');
        $valMap = [
            'A' => 14, 'K' => 13, 'Q' => 12, 'J' => 11,
            '10' => 10, '9' => 9,  '8' => 8, '7' => 7,
            '6' => 6,  '5' => 5,   '4' => 4, '3' => 3, '2' => 2
        ];
        $value = isset($valMap[$point]) ? $valMap[$point] : intval($point);
        $parsed[] = ['suit' => $suit, 'point' => $point, 'value' => $value];
    }
    return $parsed;
}

function judge_type($cards) {
    $parsed = parse_cards($cards);
    $points = array_column($parsed, 'value');
    $suits = array_column($parsed, 'suit');
    sort($points);
    $uniquePoints = array_unique($points);
    $uniqueSuits = array_unique($suits);

    $isFlush = count($uniqueSuits) === 1;
    $isStraight = false;
    if (count($uniquePoints) === count($points)) {
        $isStraight = ($points[count($points)-1] - $points[0] === count($points)-1);
        if (!$isStraight && $points === [2,3,4,5,14]) $isStraight = true;
    }

    $counts = array_count_values($points);
    rsort($counts);

    if (count($cards) === 3) {
        if ($counts[0] === 3) return "三条";
        if ($counts[0] === 2) return "对子";
        return "散牌";
    } else if (count($cards) === 5) {
        if ($isFlush && $isStraight) {
            if ($points[0] === 10) return "皇家同花顺";
            return "同花顺";
        }
        if ($counts[0] === 4) return "四条";
        if ($counts[0] === 3 && $counts[1] === 2) return "葫芦";
        if ($isFlush) return "同花";
        if ($isStraight) return "顺子";
        if ($counts[0] === 3) return "三条";
        if ($counts[0] === 2 && $counts[1] === 2) return "两对";
        if ($counts[0] === 2) return "对子";
        return "散牌";
    }
    return "无效";
}

$raw = file_get_contents("php://input");
$data = json_decode($raw, true);

if (!is_array($data) || !isset($data['head']) || !isset($data['middle']) || !isset($data['tail'])) {
    echo json_encode(['error' => '数据格式错误']);
    exit;
}
if (count($data['head']) !== 3 || count($data['middle']) !== 5 || count($data['tail']) !== 5) {
    echo json_encode(['error' => '三道数量不对']);
    exit;
}

$headType = judge_type($data['head']);
$middleType = judge_type($data['middle']);
$tailType = judge_type($data['tail']);

$typeOrder = [
    "散牌"=>1,"对子"=>2,"两对"=>3,"三条"=>4,"顺子"=>5,"同花"=>6,"葫芦"=>7,"四条"=>8,"同花顺"=>9,"皇家同花顺"=>10
];
$valid = true;
if ($typeOrder[$headType] > $typeOrder[$middleType] || $typeOrder[$middleType] > $typeOrder[$tailType]) {
    $valid = false;
}
echo json_encode([
    'headType' => $headType,
    'middleType' => $middleType,
    'tailType' => $tailType,
    'valid' => $valid,
    'error' => $valid ? '' : '摆牌顺序错误（倒水）！'
]);