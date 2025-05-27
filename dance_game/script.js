const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Placeholder canvas size
canvas.width = 800;
canvas.height = 600;

// Simple placeholder for game state or character
let player = {
    x: 50,
    y: canvas.height - 100, // Positioned near the bottom
    width: 50,
    height: 50,
    color: 'blue',
    dx: 2 // Movement speed
};

function drawPlayer() {
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
}

function updatePlayer() {
    // Simple animation: move back and forth
    player.x += player.dx;
    if (player.x + player.width > canvas.width || player.x < 0) {
        player.dx *= -1; // Reverse direction
        // Change color on bounce for visual feedback
        player.color = player.color === 'blue' ? 'red' : 'blue';
    }
}

function gameLoop() {
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update game objects
    updatePlayer();

    // Draw game objects
    drawPlayer();

    // Request the next frame
    requestAnimationFrame(gameLoop);
}

// Placeholder for input handling
function handleKeyPress(event) {
    console.log('Key pressed:', event.key);
    // Example: Change player color on 'c' key press
    if (event.key === 'c') {
        player.color = '#' + Math.floor(Math.random()*16777215).toString(16); // Random color
    }
}

// Start the game loop
console.log("Starting game loop...");
gameLoop();

// Add event listener for key presses
window.addEventListener('keydown', handleKeyPress);

console.log("Game script loaded. Canvas and context initialized.");
console.log("Player object:", player);
