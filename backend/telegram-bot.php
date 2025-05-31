<?php
require_once 'config.php';

// 解析输入
$update = json_decode(file_get_contents('php://input'), true);
if (!$update || !isset($update['message'])) exit('ok');
$message = $update['message'];
$chat_id = $message['chat']['id'];
$user_id = $message['from']['id'];
$text = trim($message['text'] ?? '');
$admin_ids = explode(',', TELEGRAM_ADMIN_IDS);

// 管理员命令: /add 13812345678 100
function send($chat_id, $text) {
    $url = "https://api.telegram.org/bot".TELEGRAM_BOT_TOKEN."/sendMessage";
    file_get_contents($url."?chat_id=".$chat_id."&text=".urlencode($text));
}
if (in_array($user_id, $admin_ids)) {
    if (preg_match('/^\/add\s+(\d+)\s+(-?\d+)$/', $text, $m)) {
        $phone = $m[1];
        $n = intval($m[2]);
        $db = get_db();
        $db->query("UPDATE users SET points=points+$n WHERE phone='$phone'");
        send($chat_id, "为{$phone}增加{$n}分");
        exit('ok');
    }
    if (preg_match('/^\/sub\s+(\d+)\s+(-?\d+)$/', $text, $m)) {
        $phone = $m[1];
        $n = intval($m[2]);
        $db = get_db();
        $db->query("UPDATE users SET points=points-$n WHERE phone='$phone'");
        send($chat_id, "为{$phone}减少{$n}分");
        exit('ok');
    }
    if (preg_match('/^\/points\s+(\d+)$/', $text, $m)) {
        $phone = $m[1];
        $db = get_db();
        $row = $db->query("SELECT points FROM users WHERE phone='$phone'")->fetch_assoc();
        send($chat_id, "用户{$phone}当前积分: ".($row ? $row['points'] : '未注册'));
        exit('ok');
    }
}
// 用户可查积分
if (preg_match('/^\/mypoints$/', $text)) {
    $db = get_db();
    $row = $db->query("SELECT points FROM users WHERE id=(SELECT id FROM users WHERE phone='$chat_id')")->fetch_assoc();
    send($chat_id, "您的积分: ".($row ? $row['points'] : '未注册'));
    exit('ok');
}
send($chat_id, "欢迎使用十三水Bot！\n管理员命令:\n/add 手机号 数量\n/sub 手机号 数量\n/points 手机号\n普通用户命令:/mypoints");
