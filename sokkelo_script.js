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
        BOMB: 7,
        BRITTLE_WALL: 8 // <-- UUSI RIKKOUTUVA SEINÄ
    };

    let diamondsCollected = 0;
    let endCellActivated = false;

    let lives = 3;
    const maxLives = 3;

    let activeBombs = []; // {row, col, timerId}
    let isDying = false; 
    let gravityTimer = null; 
    let isMoving = false; 

    const LEVELS = [
        // LEVEL 1
        {
            map: [
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                [1, 5, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
                [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
                [1, 2, 2, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2, 2, 1],
                [1, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 1],
                [1, 2, 2, 1, 2, 3, 2, 7, 2, 3, 2, 1, 2, 2, 1],
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
        // LEVEL 2 - MUOKATTU SISÄLTÄMÄÄN RIKKOUTUVIA SEINIÄ (8)
        {
            map: [
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                [1, 5, 2, 4, 2, 1, 2, 4, 2, 1, 2, 4, 2, 6, 1],
                [1, 8, 8, 8, 8, 1, 8, 8, 8, 1, 8, 8, 8, 8, 1],
                [1, 2, 3, 2, 2, 1, 2, 3, 2, 1, 2, 3, 2, 2, 1],
                [1, 8, 8, 8, 8, 1, 8, 8, 8, 1, 8, 8, 8, 8, 1],
                [1, 4, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 4, 1],
                [1, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 1],
                [1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1],
                [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
                [1, 2, 1, 1, 1, 1, 1, 7, 1, 1, 1, 1, 1, 2, 1],
                [1, 2, 1, 4, 2, 2, 2, 2, 2, 2, 2, 4, 1, 2, 1],
                [1, 2, 1, 8, 1, 1, 1, 1, 1, 1, 1, 8, 1, 2, 1],
                [1, 2, 1, 2, 4, 2, 2, 3, 2, 2, 4, 2, 1, 2, 1],
                [1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1],
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
            ],
            requiredDiamonds: 8
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

                switch (cellType) {
                    case CELL_TYPES.WALL:
                        cell.classList.add('wall');
                        break;
                    case CELL_TYPES.BRITTLE_WALL: // <-- PIIRRÄ UUSI SEINÄ
                        cell.classList.add('brittle-wall');
                        break;
                    case CELL_TYPES.DIRT:
                        cell.classList.add('dirt');
                        break;
                    case CELL_TYPES.ROCK:
                        cell.classList.add('rock');
                        cell.innerHTML = '🪨';
                        break;
                    case CELL_TYPES.DIAMOND:
                        cell.classList.add('dirt');
                        break;
                    case CELL_TYPES.BOMB:
                        cell.classList.add('bomb');
                        cell.innerHTML = '💣';
                        break;
                    case CELL_TYPES.END:
                        if (endCellActivated) {
                            cell.classList.add('end');
                        } else {
                            cell.classList.add('dirt');
                            cell.classList.add('end-hidden');
                        }
                        break;
                    case CELL_TYPES.EMPTY:
                        break;
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
        if (existingPlayer) {
            existingPlayer.remove();
        }

        const player = document.createElement('div');
        player.classList.add('player');
        const currentCell = document.querySelector(`.cell[data-row="${playerPosition.row}"][data-col="${playerPosition.col}"]`);
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
        if (isDying || isMoving) return;
        isMoving = true;

        const newRow = playerPosition.row + dy;
        const newCol = playerPosition.col + dx;

        if (newRow < 0 || newRow >= mazeSize || newCol < 0 || newCol >= mazeSize) {
            messageDisplay.textContent = "Osuit pelialueen reunaan!";
            setTimeout(() => { messageDisplay.textContent = ""; isMoving = false; }, 1500);
            return;
        }

        const targetCellType = maze[newRow][newCol];

        // --- UUSI LOHKO RIKKOUTUVALLE SEINÄLLE ---
        if (targetCellType === CELL_TYPES.BRITTLE_WALL) {
            maze[newRow][newCol] = CELL_TYPES.EMPTY; // Muuta seinä tyhjäksi
            createMazeHTML(); // Piirrä kenttä uudelleen heti
            messageDisplay.textContent = "Mursit seinän!";
            setTimeout(() => {
                messageDisplay.textContent = "";
                isMoving = false; // Salli liike taas pienen viiveen jälkeen
            }, 500);
            return; // Lopeta liike tähän, pelaaja ei siirry
        }
        // --- LOHKO PÄÄTTYY ---

        if (targetCellType === CELL_TYPES.WALL) {
            messageDisplay.textContent = "Et voi kaivaa tämän seinän läpi!";
            setTimeout(() => { messageDisplay.textContent = ""; isMoving = false; }, 1500);
            return;
        }

        if (targetCellType === CELL_TYPES.ROCK) {
            const rockPushDirection = dx !== 0 ? dx : 0;
            const rockNewCol = newCol + rockPushDirection;
            
            if (dy === 0 && rockNewCol >= 0 && rockNewCol < mazeSize && (maze[newRow][rockNewCol] === CELL_TYPES.EMPTY || maze[newRow][rockNewCol] === CELL_TYPES.BOMB)) {
                if (maze[newRow][rockNewCol] === CELL_TYPES.BOMB) {
                    activateBomb(newRow, rockNewCol);
                }
                maze[newRow][rockNewCol] = CELL_TYPES.ROCK;
                maze[newRow][newCol] = CELL_TYPES.EMPTY;
                
                updatePlayerPosition(newRow, newCol);
                applyGravityWithDelay();
                isMoving = false;
                return;
            } else {
                messageDisplay.textContent = "Et voi työntää kiveä tähän suuntaan!";
                setTimeout(() => { messageDisplay.textContent = ""; isMoving = false; }, 1500);
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
                isMoving = false;
            }, 1500);
            return;
        }
        
        if (targetCellType === CELL_TYPES.DIRT || targetCellType === CELL_TYPES.DIAMOND || targetCellType === CELL_TYPES.END || targetCellType === CELL_TYPES.EMPTY) {
            if (targetCellType === CELL_TYPES.DIAMOND) {
                diamondsCollected++;
                messageDisplay.textContent = `Kerättyjä timantteja: ${diamondsCollected}/${currentRequiredDiamonds}`;
                checkEndCellVisibility();
            }
            maze[newRow][newCol] = CELL_TYPES.EMPTY;
        }

        updatePlayerPosition(newRow, newCol);
        applyGravityWithDelay();
        isMoving = false;
        checkWinCondition();
    }

    function updatePlayerPosition(row, col) {
        maze[playerPosition.row][playerPosition.col] = CELL_TYPES.EMPTY;
        playerPosition.row = row;
        playerPosition.col = col;
        createMazeHTML();
    }

    function applyGravityWithDelay() {
        if (gravityTimer) {
            clearTimeout(gravityTimer);
        }
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
                const cellBelowType = maze[r + 1][c];
                const isPlayerBelow = playerPosition.row === r + 1 && playerPosition.col === c;

                if (currentCellType === CELL_TYPES.ROCK || currentCellType === CELL_TYPES.DIAMOND) {
                    if (cellBelowType === CELL_TYPES.EMPTY && !isPlayerBelow) {
                        maze[r + 1][c] = currentCellType;
                        maze[r][c] = CELL_TYPES.EMPTY;
                        somethingMoved = true;
                    }
                }
                else if (currentCellType === CELL_TYPES.BOMB) {
                    if (cellBelowType === CELL_TYPES.EMPTY) {
                        if (isPlayerBelow) {
                            activateBomb(r, c);
                        }
                        else {
                            maze[r + 1][c] = CELL_TYPES.BOMB;
                            maze[r][c] = CELL_TYPES.EMPTY;
                            somethingMoved = true;
                        }
                    }
                    else if (cellBelowType === CELL_TYPES.BOMB) {
                        if (!activeBombs.some(bomb => bomb.row === r + 1 && bomb.col === c)) {
                            activateBomb(r + 1, c);
                        }
                    }
                }
            }
        }

        if (somethingMoved) {
            createMazeHTML();
            applyGravityWithDelay();
        }
    }


    function activateBomb(row, col) {
        if (activeBombs.some(bomb => bomb.row === row && bomb.col === col)) {
            return;
        }

        const bombElement = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
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
    }


    function explodeBomb(bombRow, bombCol) {
        if (isDying) return;

        let playerHit = false;

        for (let r = bombRow - 1; r <= bombRow + 1; r++) {
            for (let c = bombCol - 1; c <= bombCol + 1; c++) {
                if (r < 0 || r >= mazeSize || c < 0 || c >= mazeSize) continue;
                if (r === playerPosition.row && c === playerPosition.col) playerHit = true;
                
                const cellType = maze[r][c];
                
                // Pommi tuhoaa myös rikkoutuvat seinät
                if (cellType === CELL_TYPES.DIRT || cellType === CELL_TYPES.ROCK || cellType === CELL_TYPES.BRITTLE_WALL) {
                    maze[r][c] = CELL_TYPES.EMPTY;
                }
            }
        }
        
        maze[bombRow][bombCol] = CELL_TYPES.EMPTY; // Poista pommi itsessään

        if (playerHit) {
            messageDisplay.textContent = "💥 Jäit räjähdykseen! 😵";
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
        
        if (lives <= 0) {
            gameOver("Kaikki elämät menneet! Yritä uudelleen.");
            currentLevelIndex = 0;
            lives = maxLives;
            isDying = false;
        } else {
            messageDisplay.textContent = `Voi ei! Menetit elämän. Elämiä jäljellä: ${lives}`;
            setTimeout(() => {
                respawnPlayer();
                isDying = false;
            }, 1500);
        }
    }

    function respawnPlayer() {
        loadLevel(currentLevelIndex);
        initGame();
    }

    function checkEndCellVisibility() {
        if (diamondsCollected >= currentRequiredDiamonds && !endCellActivated) {
            endCellActivated = true;
            createMazeHTML();
            messageDisplay.textContent = `Maali (kätkö) ilmestyi! Kerätty: ${diamondsCollected}/${currentRequiredDiamonds}`;
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
                    setTimeout(initGame, 2000);
                } else {
                    gameOver("Onneksi olkoon! Olet ratkaissut kaikki tasot!");
                }
            }
        }
    }

    function gameOver(message) {
        messageDisplay.textContent = `Peli ohi! ${message}`;
        document.removeEventListener('keydown', handleKeyPress);
    }

    function initGame() {
        loadLevel(currentLevelIndex);
        createMazeHTML();
        messageDisplay.textContent = `Taso ${currentLevelIndex + 1}. Kerää ${currentRequiredDiamonds} timanttia!`;
        updateLivesDisplay();
        
        document.removeEventListener('keydown', handleKeyPress);
        document.addEventListener('keydown', handleKeyPress);
    }

    const handleKeyPress = (e) => {
        if (messageDisplay.textContent.startsWith("Peli ohi!")) return;
        switch (e.key) {
            case 'ArrowUp': movePlayer(0, -1); break;
            case 'ArrowDown': movePlayer(0, 1); break;
            case 'ArrowLeft': movePlayer(-1, 0); break;
            case 'ArrowRight': movePlayer(1, 0); break;
        }
        e.preventDefault();
    };
    
    resetButton.addEventListener('click', () => {
        currentLevelIndex = 0;
        lives = maxLives;
        initGame();
    });

    initGame();
});
