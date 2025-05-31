<?php
require_once '../config.php';
require_once '_util.php';
header('Content-Type: application/json');
$roomId = intval($_GET['room'] ?? 0);
$userId = getUserId();
$db = get_db();
$ru = $db->query("SELECT cards FROM room_users WHERE room_id=$roomId AND user_id=$userId")->fetch_assoc();
if(!$ru) exit(json_encode(['success'=>false]));
$cards = json_decode($ru['cards']);
usort($cards, function($a,$b){
    $na = (int)explode('_',$a)[0];
    $nb = (int)explode('_',$b)[0];
    return $nb-$na;
});
$newcards = json_encode($cards);
$db->query("UPDATE room_users SET cards='$newcards' WHERE room_id=$roomId AND user_id=$userId");
echo json_encode(['success'=>true, 'sorted_cards'=>$cards]);
