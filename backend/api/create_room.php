<?php
header('Content-Type: application/json');
$data = json_decode(file_get_contents('php://input'), true);
$nickname = trim($data['nickname'] ?? '');
if (!$nickname) { echo json_encode(['success'=>false,'message'=>'无昵称']); exit; }
$roomId = substr(md5(uniqid()),0,6);
session_start();
file_put_contents("../data/room_$roomId.json", json_encode([
  'roomId' => $roomId,
  'players' => [ ['nickname'=>$nickname, 'cards'=>[], 'played'=>false] ],
  'status' => 'waiting',
]));
echo json_encode(['success'=>true, 'roomId'=>$roomId]);
