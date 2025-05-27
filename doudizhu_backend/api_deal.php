<?php
// api_deal.php

// Set the content type to application/json for the response
header('Content-Type: application/json');

// Allow requests from any origin (CORS) - for development purposes.
// For production, you should restrict this to your frontend's domain.
header('Access-Control-Allow-Origin: *');
// If you need to allow other methods or headers in the future:
// header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
// header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS requests for CORS
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once 'game_logic.php'; // This will also include cards.php

try {
    $deck = createDeck();
    shuffleDeck($deck);
    $deal = dealCards($deck);

    // Successfully created and dealt the cards
    echo json_encode([
        'success' => true,
        'data' => $deal
    ]);

} catch (Exception $e) {
    // In case of any error during deck creation, shuffle, or deal
    http_response_code(500); // Internal Server Error
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred while preparing the game: ' . $e->getMessage()
    ]);
}

?>
