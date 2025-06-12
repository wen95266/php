<?php
error_reporting(E_ERROR | E_PARSE);
ini_set('display_errors', 0);
header('Content-Type: application/json');

try {
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

    // 生成唯一房间号
    $roomId = strtoupper(substr(md5(uniqid('', true)), 0, 6));

    // 文件路径统一
    $roomDir = __DIR__ . "/rooms";
    if (!is_dir($roomDir)) {
        if (!mkdir($roomDir, 0777, true)) {
            echo json_encode([
                "success" => false,
                "message" => "房间目录创建失败"
            ]);
            exit;
        }
    }
    $roomFile = "$roomDir/{$roomId}.json";

    // 自动添加3个AI玩家
    $roomData = [
        "roomId" => $roomId,
        "createdAt" => date('Y-m-d H:i:s'),
        "players" => [
            [
                "nickname" => $nickname,
                "isAI" => false,
                "cards" => null,
                "played" => false
            ],
            [
                "nickname" => "AI-1",
                "isAI" => true,
                "cards" => null,
                "played" => false
            ],
            [
                "nickname" => "AI-2",
                "isAI" => true,
                "cards" => null,
                "played" => false
            ],
            [
                "nickname" => "AI-3",
                "isAI" => true,
                "cards" => null,
                "played" => false
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
} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => "后端异常: " . $e->getMessage()
    ]);
    exit;
}
