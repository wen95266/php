<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// 扑克牌值映射
$cardValues = [
    '2' => 2, '3' => 3, '4' => 4, '5' => 5, '6' => 6, '7' => 7, '8' => 8, '9' => 9, '10' => 10,
    'jack' => 11, 'queen' => 12, 'king' => 13, 'ace' => 14
];

// 处理AI分牌请求
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $cards = $input['cards'] ?? [];
    
    if (empty($cards)) {
        echo json_encode(['error' => '未提供扑克牌数据']);
        exit;
    }
    
    // 根据牌面值排序
    usort($cards, function($a, $b) use ($cardValues) {
        $aValue = $cardValues[$a['value']] ?? 0;
        $bValue = $cardValues[$b['value']] ?? 0;
        return $bValue - $aValue;
    });
    
    // 简单分牌逻辑：最大5张放尾道，中间5张放中道，最小3张放头道
    $result = [
        'top' => array_slice($cards, 10, 3),
        'middle' => array_slice($cards, 5, 5),
        'bottom' => array_slice($cards, 0, 5)
    ];
    
    echo json_encode($result);
    exit;
}

// 无效请求处理
echo json_encode(['error' => '无效请求']);
