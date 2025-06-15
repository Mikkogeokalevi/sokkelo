document.addEventListener('DOMContentLoaded', () => {
    const gameArea = document.getElementById('game-area');
    const messageDisplay = document.getElementById('game-message');
    const resetButton = document.getElementById('reset-button');
    const livesDisplay = document.getElementById('lives-display');

    const mazeSize = 15;
    let playerPosition = { row: 0, col: 0 };
    let maze = [];
    let initialPlayerPosition = { row: 0, col: 0 };

    const CELL_TYPES = {
        EMPTY: 0,
        WALL: 1,
        DIRT: 2,
        ROCK: 3,
        DIAMOND: 4,
        START: 5,
        END: 6,
        BOMB: 7
    };

    let diamondsCollected = 0;
    let endCellActivated = false;

    let lives = 3;
    const maxLives = 3;

    let activeBombs = []; // {id, row, col, timerId}
    let nextBombId = 0;

    let isDying = false;
    let gravityTimer = null;
    let isMoving = false;

    const LEVELS = [
        // LEVEL 1 (Esimerkki bommilla)
        {
            map: [
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                [1, 5, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
                [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
                [1, 2, 2, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2, 2, 1],
                [1, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 1],
                [1, 2, 2, 1, 2, 3, 2, 7, 2, 3, 2, 1, 2, 2, 1], // Pommi (7) täällä!
                [1, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 1],
                [1, 2, 2, 1, 2, 4, 2, 2, 2, 2, 2, 1, 2, 2, 1],
                [1, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 1],
                [1, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1],
                [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
                [1, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1],
                [1, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 1],
                [1, 2, 4, 1, 2, 3, 2, 2, 2, 3, 2, 1, 2, 6, 1],
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
            ],
            requiredDiamonds: 2
        },
        // LEVEL 2
        {
            map: [
                [1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
                [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 6, 2],
                [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
                [2, 2, 3, 2, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2],
                [2, 2, 3, 2, 1, 4, 1, 2, 2, 2, 2, 2, 2, 2, 2],
                [2, 2, 3, 2, 1, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2],
                [2, 2, 3, 2, 1, 2, 1, 2, 2, 1, 2, 2, 2, 2, 2],
                [2, 2, 3, 2, 2, 2, 1, 1, 4, 1, 2, 2, 2, 2, 2],
                [2, 2, 3, 2, 2, 2, 2, 1, 2, 1, 2, 2, 2, 2, 2],
                [2, 2, 3, 2, 2, 2, 2, 1, 1, 1, 2, 2, 2, 2, 2],
                [2, 2, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
                [2, 2, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
                [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
                [2, 5, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
                [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]
            ],
            requiredDiamonds: 2
        }
    ];

    let currentLevelIndex = 0;
    let currentRequiredDiamonds = 0;

    function loadLevel(levelIndex) {
        if (levelIndex >= LEVELS.length) {
            gameOver("Onneksi olkoon! Olet ratkaissut kaikki tasot ja löytänyt Lahen kadonneet vihjeet!");
            return;
        }

        const level = LEVELS[levelIndex];
        maze = JSON.parse(JSON.stringify(level.map));
        currentRequiredDiamonds = level.requiredDiamonds;

        activeBombs.forEach(bomb => clearTimeout(bomb.timerId));
        activeBombs = [];
        nextBombId = 0;
        if (gravityTimer) {
            clearTimeout(gravityTimer);
            gravityTimer = null;
        }
        isMoving = false;

        let startFound = false;
        for (let r = 0; r < mazeSize; r++) {
            for (let c = 0; c < mazeSize; c++) {
                if (maze[r][c] === CELL_TYPES.START) {
                    initialPlayerPosition = { row: r, col: c };
                    playerPosition = { ...initialPlayerPosition };
                    maze[r][c] = CELL_TYPES.EMPTY;
                    startFound = true;
                    break;
                }
            }
            if (startFound) break;
        }
        if (!startFound) {
            console.error("Virhe: Aloituspistettä ei löytynyt tasolta!");
            initialPlayerPosition = { row: 1, col: 1 };
            playerPosition = { ...initialPlayerPosition };
        }

        diamondsCollected = 0;
        endCellActivated = false;
        updateLivesDisplay();
    }

    function createMazeHTML() {
        gameArea.innerHTML = '';
        gameArea.style.gridTemplateColumns = `repeat(${mazeSize}, 1fr)`;
        maze.forEach((row, rowIndex) => {
            row.forEach((cellType, colIndex) => {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                const isBorder = rowIndex === 0 || rowIndex === mazeSize - 1 || colIndex === 0 || colIndex === mazeSize - 1;

                switch (cellType) {
                    case CELL_TYPES.WALL:
                        cell.classList.add(isBorder ? 'steel-wall' : 'wall');
                        break;
                    case CELL_TYPES.DIRT: cell.classList.add('dirt'); break;
                    case CELL_TYPES.ROCK: cell.classList.add('rock'); break;
                    case CELL_TYPES.DIAMOND: cell.classList.add('diamond'); break;
                    case CELL_TYPES.BOMB: cell.classList.add('bomb'); break;
                    case CELL_TYPES.END:
                        if (endCellActivated) {
                            cell.classList.add('end');
                        } else {
                            cell.classList.add('dirt', 'end-hidden');
                        }
                        break;
                    case CELL_TYPES.EMPTY: break;
                }
                cell.dataset.row = rowIndex;
                cell.dataset.col = colIndex;
                gameArea.appendChild(cell);
            });
        });
        placePlayer();
    }

    function placePlayer() {
        const existingPlayer = document.querySelector('.player');
        if (existingPlayer) existingPlayer.remove();

        const player = document.createElement('div');
        player.classList.add('player');
        const currentCell = document.querySelector(`.cell[data-row="${playerPosition.row}"][data-col="${playerPosition.col}"]`);
        if (currentCell) {
            currentCell.appendChild(player);
        }
    }

    function updateLivesDisplay() {
        livesDisplay.innerHTML = 'Elämät: ';
        for (let i = 0; i < lives; i++) {
            livesDisplay.innerHTML += '<span class="heart">❤️</span>';
        }
    }

    function movePlayer(dx, dy) {
        if (isDying || isMoving) return;

        const newRow = playerPosition.row + dy;
        const newCol = playerPosition.col + dx;

        if (newRow < 0 || newRow >= mazeSize || newCol < 0 || newCol >= mazeSize) return;

        isMoving = true;
        const targetCellType = maze[newRow][newCol];

        let canMove = false;

        switch (targetCellType) {
            case CELL_TYPES.EMPTY:
            case CELL_TYPES.DIRT:
                canMove = true;
                break;

            case CELL_TYPES.DIAMOND:
                diamondsCollected++;
                messageDisplay.textContent = `Kerättyjä timantteja: ${diamondsCollected}/${currentRequiredDiamonds}`;
                checkEndCellVisibility();
                canMove = true;
                break;

            case CELL_TYPES.END:
                if (endCellActivated) {
                    canMove = true;
                }
                break;

            case CELL_TYPES.ROCK:
                if (dy === 0) { // Can only push rocks sideways
                    const rockNewCol = newCol + dx;
                    if (rockNewCol >= 0 && rockNewCol < mazeSize && maze[newRow][rockNewCol] === CELL_TYPES.EMPTY) {
                        maze[newRow][rockNewCol] = CELL_TYPES.ROCK;
                        canMove = true;
                    }
                }
                break;

            case CELL_TYPES.BOMB:
                 if (!activeBombs.some(bomb => bomb.row === newRow && bomb.col === newCol)) {
                    activateBomb(newRow, newCol);
                }
                break;
        }

        if (canMove) {
            maze[playerPosition.row][playerPosition.col] = CELL_TYPES.EMPTY;
            updatePlayerPosition(newRow, newCol);
            maze[newRow][newCol] = CELL_TYPES.EMPTY; // Clear target cell
            checkWinCondition();
        }

        createMazeHTML();
        applyGravityWithDelay();
        setTimeout(() => { isMoving = false; }, 100); // Debounce movement
    }


    function updatePlayerPosition(row, col) {
        playerPosition.row = row;
        playerPosition.col = col;
    }

    function applyGravityWithDelay() {
        if (gravityTimer) clearTimeout(gravityTimer);
        gravityTimer = setTimeout(() => {
            applyGravity();
            gravityTimer = null;
        }, 150);
    }

    function applyGravity() {
        let somethingMoved = false;

        for (let r = mazeSize - 2; r >= 0; r--) {
            for (let c = 0; c < mazeSize; c++) {
                const currentCellType = maze[r][c];
                if (currentCellType !== CELL_TYPES.ROCK && currentCellType !== CELL_TYPES.DIAMOND && currentCellType !== CELL_TYPES.BOMB) {
                    continue;
                }

                const isPlayerBelow = playerPosition.row === r + 1 && playerPosition.col === c;
                if (maze[r + 1][c] === CELL_TYPES.EMPTY && !isPlayerBelow) {
                    // Update bomb's position in the tracking array if it's an active bomb
                    const movingBomb = activeBombs.find(b => b.row === r && b.col === c);
                    if (movingBomb) {
                        movingBomb.row = r + 1;
                    }

                    maze[r + 1][c] = currentCellType;
                    maze[r][c] = CELL_TYPES.EMPTY;
                    somethingMoved = true;
                }
            }
        }

        if (somethingMoved) {
            createMazeHTML();
            applyGravityWithDelay(); // Chain gravity checks
        } else {
             // Check for falling objects hitting the player ONLY after everything has settled
            checkFallingObjects();
        }
    }

     function checkFallingObjects() {
        if (isDying) return;
        const r = playerPosition.row - 1;
        const c = playerPosition.col;
        if (r >= 0) {
            const cellAboveType = maze[r][c];
            // If a rock or bomb was above the player and is now trying to fall into their space
            // (but couldn't because the player was there), it's considered a hit.
            if (cellAboveType === CELL_TYPES.ROCK || cellAboveType === CELL_TYPES.BOMB) {
                 playerDies();
            }
        }
    }


    function activateBomb(row, col) {
        if (activeBombs.some(bomb => bomb.row === row && bomb.col === col)) return;

        const bombId = nextBombId++;
        const bombElement = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
        if (bombElement) bombElement.classList.add('active');
        
        const timerId = setTimeout(() => {
            const currentBomb = activeBombs.find(b => b.id === bombId);
            if (currentBomb) {
                explodeBomb(currentBomb.row, currentBomb.col);
            }
        }, 3000);

        activeBombs.push({ id: bombId, row, col, timerId });
    }

    function explodeBomb(bombRow, bombCol) {
        // Remove the bomb that is exploding from the active list
        activeBombs = activeBombs.filter(b => !(b.row === bombRow && b.col === bombCol));
        
        let playerHit = false;

        for (let r = bombRow - 1; r <= bombRow + 1; r++) {
            for (let c = bombCol - 1; c <= bombCol + 1; c++) {
                if (r < 0 || r >= mazeSize || c < 0 || c >= mazeSize) continue;
                
                // Check for player hit in the 3x3 area
                if (r === playerPosition.row && c === playerPosition.col) {
                    playerHit = true;
                }
                
                const cellType = maze[r][c];
                const isBorder = r === 0 || r === mazeSize - 1 || c === 0 || c === mazeSize - 1;

                // Determine what to destroy
                switch (cellType) {
                    case CELL_TYPES.DIRT:
                    case CELL_TYPES.ROCK:
                        maze[r][c] = CELL_TYPES.EMPTY;
                        break;
                    case CELL_TYPES.WALL:
                        if (!isBorder) { // Only destroy non-border walls
                           maze[r][c] = CELL_TYPES.EMPTY;
                        }
                        break;
                    case CELL_TYPES.BOMB:
                        // Trigger chain reaction without waiting for the timer
                        const bombToChain = activeBombs.find(b => b.row === r && b.col === c);
                        if(bombToChain) {
                            clearTimeout(bombToChain.timerId);
                            explodeBomb(r, c);
                        }
                        break;
                    case CELL_TYPES.DIAMOND:
                        // Do nothing, diamonds are indestructible by bombs
                        break;
                }
            }
        }

        if (playerHit) {
            playerDies();
        }

        createMazeHTML();
        applyGravityWithDelay();
    }


    function playerDies() {
        if (isDying) return;
        isDying = true;
        lives--;
        updateLivesDisplay();
        
        activeBombs.forEach(bomb => clearTimeout(bomb.timerId));
        activeBombs = [];
        if (gravityTimer) clearTimeout(gravityTimer);
        gravityTimer = null;

        if (lives <= 0) {
            gameOver("Kaikki elämät menneet! Yritä uudelleen.");
        } else {
            messageDisplay.textContent = `Voi ei! Menetit elämän. Elämiä jäljellä: ${lives}`;
            setTimeout(() => {
                respawnPlayer();
            }, 2000);
        }
    }

    function respawnPlayer() {
        isDying = false;
        loadLevel(currentLevelIndex);
        initGame();
    }

    function checkEndCellVisibility() {
        if (diamondsCollected >= currentRequiredDiamonds && !endCellActivated) {
            endCellActivated = true;
            messageDisplay.textContent = `Maali (kätkö) ilmestyi! Kerätty: ${diamondsCollected}/${currentRequiredDiamonds}`;
            createMazeHTML(); // Redraw maze to show the end cell
        }
    }

    function checkWinCondition() {
        let endRow = -1, endCol = -1;
        const originalMap = LEVELS[currentLevelIndex].map;
        for (let r = 0; r < mazeSize; r++) {
            for (let c = 0; c < mazeSize; c++) {
                if (originalMap[r][c] === CELL_TYPES.END) {
                    endRow = r; endCol = c; break;
                }
            }
        }

        if (playerPosition.row === endRow && playerPosition.col === endCol) {
            if (endCellActivated) {
                currentLevelIndex++;
                if (currentLevelIndex < LEVELS.length) {
                    messageDisplay.textContent = `Taso ${currentLevelIndex} läpäisty! Valmistaudutaan seuraavaan...`;
                    setTimeout(initGame, 2000);
                } else {
                    gameOver("Onneksi olkoon! Olet ratkaissut kaikki tasot ja löytänyt Lahen kadonneet vihjeet!");
                }
            } else {
                 messageDisplay.textContent = `Tarvitset vielä ${currentRequiredDiamonds - diamondsCollected} timanttia!`;
            }
        }
    }

    function gameOver(message) {
        messageDisplay.textContent = message;
        document.removeEventListener('keydown', handleKeyPress);
        resetButton.textContent = 'Aloita alusta';
    }

    function initGame() {
        loadLevel(currentLevelIndex);
        createMazeHTML();
        messageDisplay.textContent = `Taso ${currentLevelIndex + 1}. Kerää ${currentRequiredDiamonds} timanttia!`;
        updateLivesDisplay();
        isDying = false;

        document.removeEventListener('keydown', handleKeyPress);
        document.addEventListener('keydown', handleKeyPress);
        
        resetButton.textContent = 'Aloita taso alusta';
    }

    const handleKeyPress = (e) => {
        if (isDying) return;
        switch (e.key) {
            case 'ArrowUp': movePlayer(0, -1); break;
            case 'ArrowDown': movePlayer(0, 1); break;
            case 'ArrowLeft': movePlayer(-1, 0); break;
            case 'ArrowRight': movePlayer(1, 0); break;
        }
        e.preventDefault();
    };

    resetButton.addEventListener('click', () => {
        if (lives <= 0) { // If game was over, reset completely
            currentLevelIndex = 0;
            lives = maxLives;
        }
        initGame();
    });

    initGame();
});
