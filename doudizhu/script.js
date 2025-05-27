document.addEventListener('DOMContentLoaded', () => {
    const player1HandEl = document.getElementById('player1-hand');
    const player2HandEl = document.getElementById('player2-hand');
    const player3HandEl = document.getElementById('player3-hand');
    const landlordCardsAreaEl = document.getElementById('landlord-cards-area');

    const player1CardCountEl = document.querySelector('#player1-area .card-count');
    const player2CardCountEl = document.querySelector('#player2-area .card-count');
    const player3CardCountEl = document.querySelector('#player3-area .card-count');

    // Backend URL - confirmed by user
    const backendBaseUrl = 'http://9525.ip-ddns.com'; 
    // Assuming the PHP files are directly in doudizhu_backend, and doudizhu_backend is served at the root of backendBaseUrl
    // If doudizhu_backend is a subdirectory visible under backendBaseUrl, then it would be:
    // const apiUrl = `${backendBaseUrl}/doudizhu_backend/api_deal.php`;
    // Let's assume for now the user will place api_deal.php at a path that resolves correctly with this:
    const apiUrl = `${backendBaseUrl}/doudizhu_backend/api_deal.php`;


    function createCardElement(card) {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card-placeholder'); // Use existing styling for now
        // card.displayName is like "♠A", "♥K", "大鬼" from PHP Card class
        cardDiv.textContent = card.displayName; 
        // Later, we can add logic here to use card.imageFilename to show an <img>
        // For now, this text representation helps verify data flow.
        return cardDiv;
    }

    function updatePlayerHand(handElement, cardCountElement, cards) {
        if (!handElement || !cardCountElement) return;

        // Clear previous cards/placeholders
        handElement.innerHTML = ''; 
        
        if (Array.isArray(cards)) {
            cards.forEach(card => {
                handElement.appendChild(createCardElement(card));
            });
            cardCountElement.textContent = `${cards.length} 张`; // "X cards"
        } else {
            cardCountElement.textContent = '0 张';
        }
    }
    
    function updateLandlordCards(landlordAreaElement, cards) {
        if (!landlordAreaElement) return;
        // Clear previous cards/placeholders (remove the "底牌 (Landlord's Cards):" label first if it's inside)
        const label = landlordAreaElement.querySelector('.area-label');
        landlordAreaElement.innerHTML = ''; // Clear all
        if (label) landlordAreaElement.appendChild(label); // Add label back

        if (Array.isArray(cards)) {
            cards.forEach(card => {
                landlordAreaElement.appendChild(createCardElement(card));
            });
        }
    }

    async function fetchAndDisplayInitialDeal() {
        console.log(`Fetching initial deal from: ${apiUrl}`);
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Network response was not ok: ${response.status} ${response.statusText}. Details: ${errorText}`);
            }
            const result = await response.json();

            if (result.success && result.data) {
                console.log('Deal data received:', result.data);
                updatePlayerHand(player1HandEl, player1CardCountEl, result.data.player1Hand);
                updatePlayerHand(player2HandEl, player2CardCountEl, result.data.player2Hand);
                updatePlayerHand(player3HandEl, player3CardCountEl, result.data.player3Hand);
                updateLandlordCards(landlordCardsAreaEl, result.data.landlordCards);
                console.log('Frontend updated with dealt card data.');
            } else {
                throw new Error(result.message || 'Failed to get valid deal data from backend.');
            }
        } catch (error) {
            console.error('Error fetching or displaying initial deal:', error);
            // Display error to user?
            if (player1HandEl) player1HandEl.textContent = `Error loading cards: ${error.message}`;
            if (player1CardCountEl) player1CardCountEl.textContent = 'Error';
            if (player2CardCountEl) player2CardCountEl.textContent = 'Error';
            if (player3CardCountEl) player3CardCountEl.textContent = 'Error';
        }
    }

    // Initial setup
    console.log('Dou Dizhu frontend script loaded.');
    fetchAndDisplayInitialDeal();

    // Basic button functionality (logging to console for now)
    const buttons = document.querySelectorAll('#player-actions button');
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            console.log(`${button.textContent.trim()} button clicked. Functionality not implemented yet.`);
        });
    });
});
