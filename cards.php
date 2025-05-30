<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Content-Type: application/json');

$suits = ['♠', '♥', '♣', '♦'];
$values = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
$deck = [];
foreach ($suits as $suit) {
    foreach ($values as $value) {
        $deck[] = $suit . $value;
    }
}
shuffle($deck);

echo json_encode([
    'cards' => array_slice($deck, 0, 13)
]);