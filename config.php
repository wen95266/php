<?php
$db = new mysqli("mysql12.serv00.com", "m10300_yh", "Wenxiu1234*", "m10300_sj");
if ($db->connect_errno) {
    die("数据库连接失败: " . $db->connect_error);
}
$db->set_charset("utf8mb4");
session_start();
?>