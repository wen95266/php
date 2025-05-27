<?php

class Card {
    public string $suit; // e.g., 'Spades', 'Hearts', 'Clubs', 'Diamonds', 'Joker'
    public string $rank; // e.g., 'A', '2', '3', ..., '10', 'J', 'Q', 'K', 'Black', 'Red'
    public int $value;  // Numerical value for sorting/comparison in Dou Dizhu
    public string $imageFilename; // e.g., 'ace_of_spades.png'
    public string $displayName; // e.g., "♠A", "♥K", "大鬼"

    public function __construct(string $suit, string $rank, int $value, string $imageFilename, string $displayName) {
        $this->suit = $suit;
        $this->rank = $rank;
        $this->value = $value;
        $this->imageFilename = $imageFilename;
        $this->displayName = $displayName;
    }
}

function createDeck(): array {
    $deck = [];
    $suits = [
        'Spades'   => ['icon' => '♠', 'name_cn' => '黑桃'],
        'Hearts'   => ['icon' => '♥', 'name_cn' => '红桃'],
        'Clubs'    => ['icon' => '♣', 'name_cn' => '梅花'],
        'Diamonds' => ['icon' => '♦', 'name_cn' => '方块']
    ];
    // Ranks for Dou Dizhu: 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A, 2
    // Jokers: Black Joker, Red Joker
    // Values: 3=3, ..., K=13, A=14, 2=16 (15 is reserved for Jokers or specific sort order)
    // Red Joker=17, Black Joker=16 (or vice-versa, Red is usually higher)
    // For simplicity here, let's use a common ranking:
    // 3-10: literal value
    // J: 11, Q: 12, K: 13
    // A: 14
    // 2: 15 (often called 'Big 2')
    // Black Joker: 16
    // Red Joker: 17

    $ranks = [
        '3' => 3, '4' => 4, '5' => 5, '6' => 6, '7' => 7, '8' => 8, '9' => 9, '10' => 10,
        'J' => 11, 'Q' => 12, 'K' => 13, 'A' => 14, '2' => 15
    ];

    foreach ($suits as $suitName => $suitInfo) {
        foreach ($ranks as $rankName => $rankValue) {
            $imageRank = strtolower($rankName);
            if ($rankName === 'A' || $rankName === 'K' || $rankName === 'Q' || $rankName === 'J') {
                 // User convention: ace_of_spades.png, king_of_diamonds.png
                 $imageRank = ($rankName === 'A') ? 'ace' : (($rankName === 'K') ? 'king' : (($rankName === 'Q') ? 'queen' : 'jack'));
            }
            $imageFilename = $imageRank . '_of_' . strtolower($suitName) . '.png';
            $displayName = $suitInfo['icon'] . $rankName;
            $deck[] = new Card($suitName, $rankName, $rankValue, $imageFilename, $displayName);
        }
    }

    // Add Jokers
    // Value for Black Joker: 16, Red Joker: 17
    $deck[] = new Card('Joker', 'Black', 16, 'black_joker.png', '小鬼'); // 小鬼 (Little Joker)
    $deck[] = new Card('Joker', 'Red', 17, 'red_joker.png', '大鬼');     // 大鬼 (Big Joker)

    return $deck;
}

// Example usage (for testing - can be removed or commented out later):
/*
$myDeck = createDeck();
echo "Deck created with " . count($myDeck) . " cards.
";
foreach ($myDeck as $card) {
    echo "Card: {$card->displayName} (Value: {$card->value}, Image: {$card->imageFilename})
";
}
*/

?>
