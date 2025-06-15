document.addEventListener('DOMContentLoaded', () => {
    const gameArea = document.getElementById('game-area');
    const messageDisplay = document.getElementById('game-message');
    const resetButton = document.getElementById('reset-button');
    const livesDisplay = document.getElementById('lives-display');

    const mazeSize = 15;
    let playerPosition = { row: 0, col: 0 };
    let maze = []; // Tämä on pelin nykyinen, muuttuva tila
    let initialMaze = []; // Tallentaa tason alkuperäisen tilan respawnia varten (kun elämiä jäljellä)
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

    let activeBombs = []; // {row, col, timerId}
    let isDying = false;
    let gravityCheckInterval = null;
    let isPlayerMoving = false;

    let fallingObjects = [];
    let nextFallingObjectId = 0;

    const LEVELS = [
        {
            map: [
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                [1, 5, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
                [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
                [1, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1],
                [1, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 1],
                [1, 2, 2, 1, 2, 3, 2, 7, 2, 3, 2, 1, 2, 2, 1],
                [1, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 1],
                [1, 2, 2, 1, 2, 4, 2, 2, 2, 2, 2, 1, 2, 2, 1],
                [1, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 1],
                [1, 2, 2, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1],
                [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
                [1, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1],
                [1, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 1],
                [1, 2, 4, 1, 2, 3, 2, 2, 2, 3, 2, 1, 2, 6, 1],
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
            ],
            requiredDiamonds: 2
        },
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

    // Helper function to get a cell element
    function getCellElement(row, col) {
        return document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    }

    // Helper function to update a single cell's appearance
    function updateCellAppearance(row, col, newType) {
        const cell = getCellElement(row, col);
        if (!cell) {
            console.warn(`Cell element not found at ${row}, ${col}`);
            return;
        }

        // Remove all type-specific classes
        cell.classList.remove('wall', 'dirt', 'rock', 'diamond', 'bomb', 'end', 'empty', 'end-hidden');
        cell.innerHTML = ''; // Clear content

        switch (newType) {
            case CELL_TYPES.WALL:
                cell.classList.add('wall');
                break;
            case CELL_TYPES.DIRT:
                cell.classList.add('dirt');
                break;
            case CELL_TYPES.ROCK:
                cell.classList.add('rock');
                cell.innerHTML = '🪨';
                break;
            case CELL_TYPES.DIAMOND:
                cell.classList.add('dirt'); // Diamond is initially hidden under dirt
                break;
            case CELL_TYPES.BOMB:
                cell.classList.add('bomb');
                cell.innerHTML = '💣';
                break;
            case CELL_TYPES.END:
                cell.classList.add('dirt'); // End is initially hidden under dirt
                cell.classList.add('end-hidden');
                // checkEndCellVisibility will update this
                break;
            case CELL_TYPES.EMPTY:
                cell.classList.add('empty'); // Add empty class for styling purposes
                break;
        }
    }


    function loadLevel(levelIndex) {
        if (levelIndex >= LEVELS.length) {
            gameOver("Onneksi olkoon! Olet ratkaissut kaikki tasot ja löytänyt Lahen kadonneet vihjeet!");
            return;
        }

        const level = LEVELS[levelIndex];
        // Reset maze to original map for the new level
        maze = JSON.parse(JSON.stringify(level.map)); 
        initialMaze = JSON.parse(JSON.stringify(level.map)); // Save initial state for respawn
        currentRequiredDiamonds = level.requiredDiamonds;

        activeBombs.forEach(bomb => clearTimeout(bomb.timerId));
        activeBombs = [];
        fallingObjects = []; 
        nextFallingObjectId = 0; 
        if (gravityCheckInterval) {
            clearInterval(gravityCheckInterval);
            gravityCheckInterval = null;
        }
        isPlayerMoving = false;
        isDying = false;

        let startFound = false;
        for (let r = 0; r < mazeSize; r++) {
            for (let c = 0; c < mazeSize; c++) {
                if (maze[r][c] === CELL_TYPES.START) {
                    initialPlayerPosition = { row: r, col: c };
                    playerPosition = { row: r, col: c };
                    maze[r][c] = CELL_TYPES.EMPTY; // Set start cell to empty in current maze state
                    startFound = true;
                    break;
                }
            }
            if (startFound) break;
        }
        if (!startFound) {
            console.error("Virhe: Aloituspistettä ei löytynyt tasolta!");
            initialPlayerPosition = { row: 1, col: 1 };
            playerPosition = { row: 1, col: 1 };
        }

        // Reset diamonds and end cell activation only at the start of a new level
        diamondsCollected = 0; 
        endCellActivated = false; 
        updateLivesDisplay();
        
        if (!gravityCheckInterval) {
            gravityCheckInterval = setInterval(applyGravity, 200); 
        }
    }

    function createMazeHTML() {
        gameArea.innerHTML = '';
        gameArea.style.gridTemplateColumns = `repeat(${mazeSize}, 1fr)`;
        maze.forEach((row, rowIndex) => {
            row.forEach((cellType, colIndex) => {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = rowIndex;
                cell.dataset.col = colIndex;

                updateCellAppearance(rowIndex, colIndex, cellType); // Use helper for initial setup
                
                // Manually add symbols for rocks, bombs, end based on the map's initial state if needed
                // Or just rely on updateCellAppearance, which is better
                if (cellType === CELL_TYPES.ROCK) {
                    cell.innerHTML = '🪨';
                } else if (cellType === CELL_TYPES.BOMB) {
                    cell.innerHTML = '💣';
                }
                
                gameArea.appendChild(cell);
            });
        });
        placePlayer();
        checkEndCellVisibility(); 
    }

    function placePlayer() {
        // Find existing player and remove it
        const existingPlayer = document.querySelector('.player');
        if (existingPlayer) {
            existingPlayer.remove();
        }

        // Create new player element
        const player = document.createElement('div');
        player.classList.add('player');
        
        // Place player in the current position
        const currentCell = getCellElement(playerPosition.row, playerPosition.col);
        if (currentCell) {
            currentCell.appendChild(player);
        } else {
            console.error("Virhe: Kohdesolua pelaajalle ei löytynyt!", playerPosition);
        }
    }

    function updateLivesDisplay() {
        livesDisplay.innerHTML = '';
        for (let i = 0; i < lives; i++) {
            livesDisplay.innerHTML += '<span class="heart">❤️</span>';
        }
    }

    function movePlayer(dx, dy) {
        if (isDying || isPlayerMoving) return;
        isPlayerMoving = true; 

        const oldPlayerRow = playerPosition.row;
        const oldPlayerCol = playerPosition.col;

        const newRow = playerPosition.row + dy;
        const newCol = playerPosition.col + dx;

        if (newRow < 0 || newRow >= mazeSize || newCol < 0 || newCol >= mazeSize) {
            messageDisplay.textContent = "Osuit pelialueen reunaan!";
            setTimeout(() => { messageDisplay.textContent = ""; isPlayerMoving = false; }, 500);
            return;
        }

        const targetCellType = maze[newRow][newCol];

        if (targetCellType === CELL_TYPES.WALL) {
            messageDisplay.textContent = "Et voi kaivaa tämän seinän läpi!";
            setTimeout(() => { messageDisplay.textContent = ""; isPlayerMoving = false; }, 500);
            return;
        }

        if (targetCellType === CELL_TYPES.ROCK) {
            const rockPushDirection = dx !== 0 ? dx : 0;
            const rockNewCol = newCol + rockPushDirection;

            if (dy === 0 && 
                rockNewCol >= 0 && rockNewCol < mazeSize &&
                (maze[newRow][rockNewCol] === CELL_TYPES.EMPTY || maze[newRow][rockNewCol] === CELL_TYPES.BOMB)) {

                if (maze[newRow][rockNewCol] === CELL_TYPES.BOMB) {
                    activateBomb(newRow, rockNewCol);
                }

                maze[newRow][rockNewCol] = CELL_TYPES.ROCK;
                updateCellAppearance(newRow, rockNewCol, CELL_TYPES.ROCK); // Update new rock position
                
                maze[newRow][newCol] = CELL_TYPES.EMPTY; // Clear old rock position
                updateCellAppearance(newRow, newCol, CELL_TYPES.EMPTY); // Update old rock position visually

                updatePlayerPosition(newRow, newCol); // Move player to the old rock position
                isPlayerMoving = false;
                return;
            } else {
                messageDisplay.textContent = "Et voi työntää kiveä tähän suuntaan!";
                setTimeout(() => { messageDisplay.textContent = ""; isPlayerMoving = false; }, 500);
                return;
            }
        }

        if (targetCellType === CELL_TYPES.BOMB) {
            if (!activeBombs.some(bomb => bomb.row === newRow && bomb.col === newCol)) {
                activateBomb(newRow, newCol);
            }
            messageDisplay.textContent = "💥 Pommi aktivoitu! Väistä!";
            setTimeout(() => {
                if (!messageDisplay.textContent.includes("Peli ohi!")) {
                    messageDisplay.textContent = "";
                }
                isPlayerMoving = false; 
            }, 1000);
            return; 
        }

        // TÄRKEÄ MUUTOS: Jos liikutaan alas (dy > 0) ja yläpuolella on putoava esine
        if (dy > 0) {
            const objectAboveOldPosRow = oldPlayerRow - 1; // Corrected to use oldPlayerRow
            const objectAboveOldPosCol = oldPlayerCol; // Corrected to use oldPlayerCol

            if (objectAboveOldPosRow >= 0) {
                const objectAboveType = maze[objectAboveOldPosRow][objectAboveOldPosCol];
                if (objectAboveType === CELL_TYPES.ROCK || objectAboveType === CELL_TYPES.BOMB) {
                    fallingObjects.push({ 
                        id: nextFallingObjectId++,
                        row: objectAboveOldPosRow, 
                        col: objectAboveOldPosCol, 
                        type: objectAboveType
                    });
                    maze[objectAboveOldPosRow][objectAboveOldPosCol] = CELL_TYPES.EMPTY; 
                    updateCellAppearance(objectAboveOldPosRow, objectAboveOldPosCol, CELL_TYPES.EMPTY);
                }
            }
        }

        // Kaivetaan ruutu (multa, timantti, maali, tyhjä)
        if (targetCellType === CELL_TYPES.DIRT || targetCellType === CELL_TYPES.DIAMOND || targetCellType === CELL_TYPES.END || targetCellType === CELL_TYPES.EMPTY) {
            if (targetCellType === CELL_TYPES.DIAMOND) {
                diamondsCollected++;
                messageDisplay.textContent = `Kerättyjä timantteja: ${diamondsCollected}/${currentRequiredDiamonds}`;
                updateCellAppearance(newRow, newCol, CELL_TYPES.EMPTY); // Diamond becomes empty after collection
                // Briefly show diamond symbol
                const diamondCellEl = getCellElement(newRow, newCol);
                if(diamondCellEl) {
                    diamondCellEl.innerHTML = '💎';
                    setTimeout(() => {
                        if(diamondCellEl) diamondCellEl.innerHTML = ''; // Remove symbol after a short delay
                    }, 200);
                }
                checkEndCellVisibility(); 
            } else if (targetCellType === CELL_TYPES.DIRT) {
                maze[newRow][newCol] = CELL_TYPES.EMPTY;
                updateCellAppearance(newRow, newCol, CELL_TYPES.EMPTY);
            } else if (targetCellType === CELL_TYPES.END && !endCellActivated) {
                // If trying to move to hidden end, just update message and don't change cell type
                messageDisplay.textContent = `Tarvitset vielä ${currentRequiredDiamonds - diamondsCollected} timanttia avataksesi kätkön!`;
                isPlayerMoving = false;
                return;
            }
        }
        
        // Move player position
        playerPosition.row = newRow;
        playerPosition.col = newCol;

        // Update player's visual position
        placePlayer();

        // Update old player's cell visually (now empty)
        updateCellAppearance(oldPlayerRow, oldPlayerCol, maze[oldPlayerRow][oldPlayerCol]);


        isPlayerMoving = false; 
        checkWinCondition();
    }

    function applyGravity() {
        if (isDying) return; 

        let cellsChanged = []; // Keep track of cells that need visual update

        // Phase 1: Handle falling objects (marked by movePlayer)
        const currentFallingObjects = [...fallingObjects];
        fallingObjects = []; 

        currentFallingObjects.forEach(obj => {
            const nextRow = obj.row + 1; 

            if (nextRow < mazeSize) {
                const cellBelowType = maze[nextRow][obj.col];

                if (cellBelowType === CELL_TYPES.EMPTY) {
                    // If empty below, move object down
                    maze[nextRow][obj.col] = obj.type;
                    cellsChanged.push({row: nextRow, col: obj.col, type: obj.type});

                    maze[obj.row][obj.col] = CELL_TYPES.EMPTY; 
                    cellsChanged.push({row: obj.row, col: obj.col, type: CELL_TYPES.EMPTY});

                    fallingObjects.push({ ...obj, row: nextRow }); // Keep falling
                } else {
                    // Object stopped falling or hit something
                    // If it hit the player's CURRENT position, kill player
                    if (nextRow === playerPosition.row && obj.col === playerPosition.col) {
                        if (obj.type === CELL_TYPES.ROCK) {
                            messageDisplay.textContent = "Kivi putosi päällesi! 😵";
                        } else if (obj.type === CELL_TYPES.BOMB) {
                            messageDisplay.textContent = "💥 Pommi putosi päällesi! Räjähti!";
                            explodeBomb(playerPosition.row, playerPosition.col);
                        }
                        playerDies();
                        return; // Player died, stop gravity checks for now
                    } else if (obj.type === CELL_TYPES.BOMB && cellBelowType === CELL_TYPES.BOMB) {
                        activateBomb(nextRow, obj.col);
                    }
                    // Place the object at its final resting spot if it stopped falling
                    maze[obj.row][obj.col] = obj.type; // It stays where it was if it couldn't fall further
                    cellsChanged.push({row: obj.row, col: obj.col, type: obj.type}); // Ensure it's visually updated
                }
            } else {
                // Object fell off the bottom of the maze (unlikely with walls, but safe)
                maze[obj.row][obj.col] = obj.type; // It stays where it was
                cellsChanged.push({row: obj.row, col: obj.col, type: obj.type});
            }
        });

        // Phase 2: Natural gravity for the rest of the maze
        for (let r = mazeSize - 2; r >= 0; r--) {
            for (let c = 0; c < mazeSize; c++) {
                const currentCellType = maze[r][c];
                const cellBelowType = maze[r + 1][c];

                if (!fallingObjects.some(f => f.row === r && f.col === c) && // Not already handled as falling
                    (currentCellType === CELL_TYPES.ROCK || currentCellType === CELL_TYPES.DIAMOND || currentCellType === CELL_TYPES.BOMB) &&
                    (cellBelowType === CELL_TYPES.EMPTY)) {
                    
                    // If it would fall onto the player's CURRENT position, kill player
                    if (r + 1 === playerPosition.row && c === playerPosition.col) {
                        if (currentCellType === CELL_TYPES.ROCK) {
                            messageDisplay.textContent = "Kivi putosi päällesi! 😵";
                        } else if (currentCellType === CELL_TYPES.BOMB) {
                            messageDisplay.textContent = "💥 Pommi putosi päällesi! Räjähti!";
                            explodeBomb(playerPosition.row, playerPosition.col);
                        }
                        playerDies();
                        return; // Player died, stop gravity checks for now
                    } else { 
                        maze[r + 1][c] = currentCellType;
                        cellsChanged.push({row: r + 1, col: c, type: currentCellType});

                        maze[r][c] = CELL_TYPES.EMPTY;
                        cellsChanged.push({row: r, col: c, type: CELL_TYPES.EMPTY});
                    }
                }
                else if (currentCellType === CELL_TYPES.BOMB && cellBelowType === CELL_TYPES.BOMB) {
                     if (!activeBombs.some(bomb => bomb.row === r + 1 && bomb.col === c)) {
                        activateBomb(r + 1, c);
                    }
                }
            }
        }

        // Apply visual updates only for changed cells
        cellsChanged.forEach(change => {
            updateCellAppearance(change.row, change.col, change.type);
        });
        placePlayer(); // Always ensure player is placed correctly after gravity
    }


    function activateBomb(row, col) {
        if (activeBombs.some(bomb => bomb.row === row && bomb.col === col)) {
            return;
        }

        const bombElement = getCellElement(row, col);
        if (bombElement) {
            bombElement.classList.add('active'); 
        }

        const timerId = setTimeout(() => {
            activeBombs = activeBombs.filter(bomb => !(bomb.row === row && bomb.col === col));
            if (bombElement) {
                bombElement.classList.remove('active'); 
            }
            explodeBomb(row, col);
        }, 3000); 

        activeBombs.push({ row, col, timerId });
        messageDisplay.textContent = `💥 Pommi aktivoitu (${row},${col})! Juokse!`;
        setTimeout(() => {
            if (!messageDisplay.textContent.includes("Peli ohi!")) {
                 messageDisplay.textContent = "";
            }
        }, 1500);
    }


    function explodeBomb(bombRow, bombCol) {
        if (isDying) return;

        const explosionRadius = 1;
        const cellsToExplode = [];

        for (let r = bombRow - explosionRadius; r <= bombRow + explosionRadius; r++) {
            for (let c = bombCol - explosionRadius; c <= bombCol + explosionRadius; c++) {
                if (r >= 0 && r < mazeSize && c >= 0 && c < mazeSize) {
                    cellsToExplode.push({ row: r, col: c });
                }
            }
        }

        let playerHit = false;
        let cellsToUpdate = new Set(); // To store unique cells that need visual update

        // Handle chain reactions first: bombs inside explosion radius
        const bombsToDetonateNow = activeBombs.filter(bomb => 
            cellsToExplode.some(pos => pos.row === bomb.row && pos.col === bomb.col)
        );

        bombsToDetonateNow.forEach(bomb => {
            clearTimeout(bomb.timerId);
            activeBombs = activeBombs.filter(ab => ab.id !== bomb.id);
            
            // Immediately remove bomb visually and from maze data
            maze[bomb.row][bomb.col] = CELL_TYPES.EMPTY;
            cellsToUpdate.add(`${bomb.row},${bomb.col}`);
        });


        // Now process all cells within the explosion radius
        cellsToExplode.forEach(pos => {
            const cellType = maze[pos.row][pos.col];

            if (pos.row === playerPosition.row && pos.col === playerPosition.col) {
                playerHit = true;
            } 
            
            if (cellType === CELL_TYPES.DIRT || cellType === CELL_TYPES.ROCK || cellType === CELL_TYPES.BOMB) { 
                // Only destroy dirt, rock, or bomb that wasn't already handled by chain reaction
                maze[pos.row][pos.col] = CELL_TYPES.EMPTY;
                cellsToUpdate.add(`${pos.row},${pos.col}`);
            } else if (cellType === CELL_TYPES.DIAMOND) {
                // Diamond revealed, not destroyed
                cellsToUpdate.add(`${pos.row},${pos.col}`); // Still need to update appearance (remove dirt)
            }
            // Walls and End cells are not affected by explosions
        });

        // Apply visual updates only for changed cells
        cellsToUpdate.forEach(coords => {
            const [r, c] = coords.split(',').map(Number);
            updateCellAppearance(r, c, maze[r][c]);
            // If it's a diamond, make sure the diamond symbol appears
            if (maze[r][c] === CELL_TYPES.DIAMOND) {
                const diamondCellEl = getCellElement(r,c);
                if (diamondCellEl) diamondCellEl.innerHTML = '💎';
            }
        });

        placePlayer(); // Ensure player is placed correctly

        if (playerHit) {
            messageDisplay.textContent = "💥 Jäit räjähdykseen! 😵";
            playerDies();
        }
    }

    function playerDies() {
        if (isDying) return;
        isDying = true;

        lives--;
        updateLivesDisplay();
        messageDisplay.textContent = `Voi ei! Menetit elämän. Elämiä jäljellä: ${lives}`;

        activeBombs.forEach(bomb => clearTimeout(bomb.timerId));
        activeBombs = [];
        fallingObjects = [];
        nextFallingObjectId = 0; 
        if (gravityCheckInterval) {
            clearInterval(gravityCheckInterval);
            gravityCheckInterval = null;
        }

        if (lives <= 0) {
            gameOver("Kaikki elämät menneet! Yritä uudelleen.");
            // When game over, truly reset everything for the level
            currentLevelIndex = 0; 
            lives = maxLives; 
            isDying = false; 
            initGame(); // Re-initialize the game from scratch
        } else {
            setTimeout(() => {
                respawnPlayer();
                // Tärkeää: timanttilaskuri ja oven tila eivät nollaannu TÄSSÄ vaiheessa
                // Vain pelaajan sijainti ja pelikentän 'puhtaus' palautetaan
                messageDisplay.textContent = `Taso ${currentLevelIndex + 1}. Kerää ${diamondsCollected}/${currentRequiredDiamonds} timanttia ja etsi kätkö!`;
                isDying = false; 
                if (!gravityCheckInterval) {
                    gravityCheckInterval = setInterval(applyGravity, 200);
                }
            }, 1500);
        }
    }

    function respawnPlayer() {
        // Poista pelaaja vanhasta paikasta
        const oldPlayerEl = document.querySelector('.player');
        if (oldPlayerEl) {
            const oldCell = oldPlayerEl.parentElement;
            if (oldCell) {
                oldCell.removeChild(oldPlayerEl);
            }
        }
        
        // Aseta pelaaja alkuperäiseen aloituspaikkaan (initialPlayerPosition)
        playerPosition = { row: initialPlayerPosition.row, col: initialPlayerPosition.col };

        // Tyhjennä pommit ja putoavat objektit
        fallingObjects = [];
        activeBombs.forEach(bomb => clearTimeout(bomb.timerId));
        activeBombs = [];
        nextFallingObjectId = 0;

        // Vain päivitä pelaajan sijainti, ei piirrä koko kenttää uudelleen
        placePlayer();
        // Check end cell visibility is still important as diamond count may be affected across respawns if diamonds are not collected.
        // But in this logic, diamondsCollected is NOT reset during respawn, so endCellActivated state should persist.
        // We still call it to ensure visual state is correct after a respawn.
        checkEndCellVisibility(); 
    }

    function checkEndCellVisibility() {
        let endRow = -1;
        let endCol = -1;
        // Find end cell position from the original map, not the current dynamic 'maze'
        for (let r = 0; r < mazeSize; r++) {
            for (let c = 0; c < mazeSize; c++) {
                if (LEVELS[currentLevelIndex].map[r][c] === CELL_TYPES.END) {
                    endRow = r;
                    endCol = c;
                    break;
                }
            }
            if (endRow !== -1) break;
        }

        if (endRow === -1) {
            console.warn("Maali-solua ei löytynyt nykyiseltä tasolta!");
            return;
        }

        const endCellEl = getCellElement(endRow, endCol);
        if (!endCellEl) {
            console.error("Maali-solun HTML-elementtiä ei löytynyt!");
            return;
        }

        if (diamondsCollected >= currentRequiredDiamonds) {
            if (!endCellActivated) { 
                endCellActivated = true;
                messageDisplay.textContent = `Maali (kätkö) ilmestyi tasolla ${currentLevelIndex + 1}! Kerätty: ${diamondsCollected}/${currentRequiredDiamonds}`;
            }
            endCellEl.classList.remove('end-hidden', 'dirt'); 
            endCellEl.classList.add('end'); 
            endCellEl.innerHTML = '🚪'; 
            // Also update the maze data to reflect it being an END cell (if it was Dirt/Empty before)
            if (maze[endRow][endCol] !== CELL_TYPES.END) {
                 maze[endRow][endCol] = CELL_TYPES.END;
            }
        } else {
            // If not enough diamonds, ensure the door is hidden
            if (endCellActivated) { 
                endCellActivated = false;
            }
            endCellEl.classList.add('end-hidden', 'dirt'); 
            endCellEl.classList.remove('end'); 
            endCellEl.innerHTML = ''; 
            // If the maze data has been changed (e.g., from explosion making it empty),
            // revert it to its original type as per the level map if it was END
            if (LEVELS[currentLevelIndex].map[endRow][endCol] === CELL_TYPES.END) {
                maze[endRow][endCol] = CELL_TYPES.END; // Keep type as END, but CSS hides it
            } else {
                maze[endRow][endCol] = LEVELS[currentLevelIndex].map[endRow][endCol]; // Revert to original type
            }
        }
    }


    function checkWinCondition() {
        let endRow = -1;
        let endCol = -1;
        for (let r = 0; r < mazeSize; r++) {
            for (let c = 0; c < mazeSize; c++) {
                if (LEVELS[currentLevelIndex].map[r][c] === CELL_TYPES.END) {
                    endRow = r;
                    endCol = c;
                    break;
                }
            }
            if (endRow !== -1) break;
        }

        if (playerPosition.row === endRow && playerPosition.col === endCol) {
            if (endCellActivated) { 
                currentLevelIndex++;
                if (currentLevelIndex < LEVELS.length) {
                    messageDisplay.textContent = `Taso ${currentLevelIndex} läpäisty! Valmistaudutaan seuraavaan...`;
                    setTimeout(() => {
                        initGame(); 
                    }, 2000);
                } else {
                    gameOver("Onneksi olkoon! Olet ratkaissut kaikki tasot ja löytänyt Lahen kadonneet vihjeet!");
                }
            } else {
                messageDisplay.textContent = `Tarvitset vielä ${currentRequiredDiamonds - diamondsCollected} timanttia avataksesi kätkön!`;
            }
        }
    }

    function gameOver(message) {
        messageDisplay.textContent = `Peli ohi! ${message}`;
        document.removeEventListener('keydown', handleKeyPress);
        gameArea.removeEventListener('touchstart', handleTouchStart);
        gameArea.removeEventListener('touchmove', handleTouchMove);
        gameArea.removeEventListener('touchend', handleTouchEnd);
        if (gravityCheckInterval) {
            clearInterval(gravityCheckInterval);
            gravityCheckInterval = null;
        }
        resetButton.style.display = 'block';
    }

    function initGame() {
        loadLevel(currentLevelIndex);
        createMazeHTML(); // Full redraw only at level load
        messageDisplay.textContent = `Taso ${currentLevelIndex + 1}. Kerää ${diamondsCollected}/${currentRequiredDiamonds} timanttia ja etsi kätkö!`;
        updateLivesDisplay();

        document.removeEventListener('keydown', handleKeyPress);
        gameArea.removeEventListener('touchstart', handleTouchStart);
        gameArea.removeEventListener('touchmove', handleTouchMove);
        gameArea.removeEventListener('touchend', handleTouchEnd);

        document.addEventListener('keydown', handleKeyPress);
        gameArea.addEventListener('touchstart', handleTouchStart);
        gameArea.addEventListener('touchmove', handleTouchMove, { passive: false });
        gameArea.addEventListener('touchend', handleTouchEnd);

        resetButton.style.display = 'block';
    }

    const handleKeyPress = (e) => {
        if (messageDisplay.textContent.startsWith("Peli ohi!") || isDying || isPlayerMoving) return; 
        switch (e.key) {
            case 'ArrowUp':
                movePlayer(0, -1);
                break;
            case 'ArrowDown':
                movePlayer(0, 1);
                break;
            case 'ArrowLeft':
                movePlayer(-1, 0);
                break;
            case 'ArrowRight':
                movePlayer(1, 0);
                break;
        }
        e.preventDefault();
    };

    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchStart = (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        e.preventDefault();
    };

    const handleTouchMove = (e) => {
        e.preventDefault();
    };

    const handleTouchEnd = (e) => {
        if (messageDisplay.textContent.startsWith("Peli ohi!") || isDying || isPlayerMoving) return;

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;

        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;

        const sensitivity = 30;

        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > sensitivity) {
            if (dx > 0) {
                movePlayer(1, 0);
            } else {
                movePlayer(-1, 0);
            }
        } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > sensitivity) {
            if (dy > 0) {
                movePlayer(0, 1);
            } else {
                movePlayer(0, -1);
            }
        }
    };

    resetButton.addEventListener('click', () => {
        currentLevelIndex = 0;
        lives = maxLives;
        initGame();
    });

    initGame();
});
