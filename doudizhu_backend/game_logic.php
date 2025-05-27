<?php

require_once 'cards.php';

/**
 * Shuffles the deck of cards.
 *
 * @param array $deck The deck of cards (array of Card objects). Passed by reference.
 */
function shuffleDeck(array &$deck): void {
    // Using PHP's built-in shuffle function
    shuffle($deck);
}

/**
 * Deals cards for a game of Dou Dizhu.
 * Assumes a standard 54-card deck.
 * Deals 17 cards to each of the 3 players, and 3 cards for the landlord's pile.
 *
 * @param array $deck A shuffled deck of Card objects.
 * @return array An associative array containing:
 *               'player1Hand' => array of 17 Card objects,
 *               'player2Hand' => array of 17 Card objects,
 *               'player3Hand' => array of 17 Card objects,
 *               'landlordCards' => array of 3 Card objects
 */
function dealCards(array $deck): array {
    if (count($deck) !== 54) {
        // Or handle this error more gracefully
        throw new InvalidArgumentException("A full shuffled deck of 54 cards is required for dealing.");
    }

    $player1Hand = array_slice($deck, 0, 17);
    $player2Hand = array_slice($deck, 17, 17);
    $player3Hand = array_slice($deck, 34, 17);
    $landlordCards = array_slice($deck, 51, 3);

    return [
        'player1Hand'   => $player1Hand,
        'player2Hand'   => $player2Hand,
        'player3Hand'   => $player3Hand,
        'landlordCards' => $landlordCards,
    ];
}

// Example usage (for testing - can be removed or commented out later):
/*
$deck = createDeck();
echo "Original deck order (first 5 cards): 
";
for ($i = 0; $i < 5; $i++) {
    echo $deck[$i]->displayName . " ";
}
echo "

";

shuffleDeck($deck);
echo "Shuffled deck order (first 5 cards): 
";
for ($i = 0; $i < 5; $i++) {
    echo $deck[$i]->displayName . " ";
}
echo "

";

$deal = dealCards($deck);

echo "Player 1 Hand (" . count($deal['player1Hand']) . " cards):
";
foreach ($deal['player1Hand'] as $card) {
    echo $card->displayName . " ";
}
echo "

";

echo "Player 2 Hand (" . count($deal['player2Hand']) . " cards):
";
foreach ($deal['player2Hand'] as $card) {
    echo $card->displayName . " ";
}
echo "

";

echo "Player 3 Hand (" . count($deal['player3Hand']) . " cards):
";
foreach ($deal['player3Hand'] as $card) {
    echo $card->displayName . " ";
}
echo "

";

echo "Landlord Cards (" . count($deal['landlordCards']) . " cards):
";
foreach ($deal['landlordCards'] as $card) {
    echo $card->displayName . " ";
}
echo "
";
*/

?>
