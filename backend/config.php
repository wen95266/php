<?php
// 数据库连接配置
define('DB_HOST', 'localhost'); // serv00数据库地址
define('DB_USER', 'your_db_user'); // 数据库用户名
define('DB_PASS', 'your_db_password'); // 数据库密码
define('DB_NAME', 'your_db_name'); // 数据库名

function get_db() {
    $db = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    if ($db->connect_errno) {
        http_response_code(500);
        exit(json_encode(['success'=>false, 'message'=>'数据库连接失败']));
    }
    $db->set_charset('utf8mb4');
    return $db;
}

define('JWT_SECRET', 'your_jwt_secret'); // JWT密钥（请更换）
define('TELEGRAM_BOT_TOKEN', 'your_telegram_bot_token'); // Telegram Bot Token
define('TELEGRAM_ADMIN_IDS', '123456789'); // 逗号分隔的管理员TG用户id
?>
