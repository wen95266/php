<?php
require_once '../config.php';
function getUserId() {
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if(strpos($auth,'Bearer ')===0) $auth = substr($auth,7);
    if(substr_count(base64_decode($auth), '|')<2) exit(json_encode(['success'=>false,'message'=>'认证失败']));
    list($id, $phone, $hash) = explode('|', base64_decode($auth));
    if(md5(JWT_SECRET.$id) === $hash) return intval($id);
    exit(json_encode(['success'=>false, 'message'=>'认证失败']));
}
?>
