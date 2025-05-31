<?php
require_once '../config.php';
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$phone = preg_replace('/\D/', '', $data['phone'] ?? '');
if (!$phone) exit(json_encode(['success'=>false, 'message'=>'手机号不能为空']));

$db = get_db();
$stmt = $db->prepare("SELECT id, phone FROM users WHERE phone=?");
$stmt->bind_param('s', $phone);
$stmt->execute();
$stmt->store_result();
if ($stmt->num_rows === 0) {
    // 注册
    $stmt2 = $db->prepare("INSERT INTO users (phone) VALUES (?)");
    $stmt2->bind_param('s', $phone);
    $stmt2->execute();
    $user_id = $stmt2->insert_id;
} else {
    $stmt->bind_result($user_id, $phone_db);
    $stmt->fetch();
}
$stmt->close();
$token = base64_encode($user_id.'|'.$phone.'|'.md5(JWT_SECRET.$user_id));
echo json_encode(['success'=>true, 'token'=>$token]);
