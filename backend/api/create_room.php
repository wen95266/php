<?php
header('Content-Type: application/json');

// 获取原始 POST 数据（JSON 格式）
$input = json_decode(file_get_contents('php://input'), true);

// 检查参数
if (!$input || !isset($input['nickname']) || !$input['nickname']) {
    echo json_encode([
        "success" => false,
        "message" => "缺少昵称参数"
    ]);
    exit;
}

$nickname = trim($input['nickname']);

// TODO: 这里你需要连接数据库或文件系统，实现房间创建逻辑
// 示例：生成一个唯一房间号（实际可用更复杂的逻辑）
$roomId = strtoupper(substr(md5(uniqid('', true)), 0, 6));

// 假设你用文件存储（仅演示，生产建议用数据库）
$roomFile = __DIR__ . "/rooms/{$roomId}.json";
if (!is_dir(__DIR__ . "/rooms")) {
    mkdir(__DIR__ . "/rooms", 0777, true);
}

$roomData = [
    "roomId" => $roomId,
    "createdAt" => date('Y-m-d H:i:s'),
    "players" => [
        [
            "nickname" => $nickname,
            "cards" => null
        ]
    ]
];

if (file_put_contents($roomFile, json_encode($roomData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)) === false) {
    echo json_encode([
        "success" => false,
        "message" => "房间创建失败，请检查服务器权限"
    ]);
    exit;
}

echo json_encode([
    "success" => true,
    "roomId" => $roomId
]);
