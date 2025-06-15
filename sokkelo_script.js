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

    // ----- UUDET MUUTTUJAT POMMIEN SEURANTAAN -----
    let activeBombs = []; // {id, row, col, timerId}
    let nextBombId = 0; // Antaa jokaiselle pommille uniikin tunnisteen
    // ---------------------------------------------

    let isDying = false; // Estää useita playerDies() kutsuja
    let gravityTimer = null; // Hallitsee painovoiman päivitystä
    let isMoving = false; // Estää pelaajan liikkumisen useaan kertaan ennen painovoiman vaikutusta

    const LEVELS = [
        // LEVEL 1 (Esimerkki bommilla)
        {
            map: [
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                [1, 5, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
                [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
                [1, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1],
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
        maze = JSON.parse(JSON.stringify(level.map)); // Kloonataan kenttä
        currentRequiredDiamonds = level.requiredDiamonds;

        // Tyhjennä aktiiviset pommit aina uuden tason alussa
        activeBombs.forEach(bomb => clearTimeout(bomb.timerId));
        activeBombs = [];
        nextBombId = 0; // Nollaa pommien ID-laskuri
        if (gravityTimer) { // Tyhjennä mahdollinen aiempi painovoima-ajastin
            clearTimeout(gravityTimer);
            gravityTimer = null;
        }
        isMoving = false;

        let startFound = false;
        for (let r = 0; r < mazeSize; r++) {
            for (let c = 0; c < mazeSize; c++) {
                if (maze[r][c] === CELL_TYPES.START) {
                    initialPlayerPosition = { row: r, col: c };
                    playerPosition = { row: r, col: c };
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
            playerPosition = { row: 1, col: 1 };
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
                    case CELL_TYPES.WALL: cell.classList.add('wall'); break;
                    case CELL_TYPES.DIRT: cell.classList.add('dirt'); break;
                    case CELL_TYPES.ROCK: cell.classList.add('rock'); cell.innerHTML = '🪨'; break;
                    case CELL_TYPES.DIAMOND: cell.classList.add('dirt'); break;
                    case CELL_TYPES.BOMB: cell.classList.add('bomb'); cell.innerHTML = '💣'; break;
                    case CELL_TYPES.END:
                        if (endCellActivated) {
                            cell.classList.add('end');
                        } else {
                            cell.classList.add('dirt');
                            cell.classList.add('end-hidden');
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
            setTimeout(() => { isMoving = false; }, 100);
            return;
        }

        const targetCellType = maze[newRow][newCol];

        if (targetCellType === CELL_TYPES.WALL) {
            setTimeout(() => { isMoving = false; }, 100);
            return;
        }

        if (targetCellType === CELL_TYPES.ROCK) {
            const rockPushDirection = dx !== 0 ? dx : 0;
            const rockNewCol = newCol + rockPushDirection;

            if (dy === 0 && rockNewCol >= 0 && rockNewCol < mazeSize && maze[newRow][rockNewCol] === CELL_TYPES.EMPTY) {
                maze[newRow][rockNewCol] = CELL_TYPES.ROCK;
                maze[newRow][newCol] = CELL_TYPES.EMPTY;
                updatePlayerPosition(newRow, newCol);
                applyGravityWithDelay();
                isMoving = false;
                return;
            } else {
                setTimeout(() => { isMoving = false; }, 100);
                return;
            }
        }

        if (targetCellType === CELL_TYPES.BOMB) {
            if (!activeBombs.some(bomb => bomb.row === newRow && bomb.col === newCol)) {
                activateBomb(newRow, newCol);
            }
            isMoving = false;
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
        playerPosition.row = row;
        playerPosition.col = col;
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
                if (currentCellType !== CELL_TYPES.ROCK && currentCellType !== CELL_TYPES.DIAMOND && currentCellType !== CELL_TYPES.BOMB) {
                    continue;
                }

                const cellBelowType = maze[r + 1][c];
                const isPlayerBelow = playerPosition.row === r + 1 && playerPosition.col === c;

                if (cellBelowType === CELL_TYPES.EMPTY && !isPlayerBelow) {
                    if (currentCellType === CELL_TYPES.BOMB) {
                        const movingBomb = activeBombs.find(b => b.row === r && b.col === c);
                        if (movingBomb) {
                            movingBomb.row = r + 1; // Päivitä pommin sijainti seurantaan
                        }
                    }
                    maze[r + 1][c] = currentCellType;
                    maze[r][c] = CELL_TYPES.EMPTY;
                    somethingMoved = true;
                } else if (currentCellType === CELL_TYPES.BOMB && cellBelowType === CELL_TYPES.EMPTY && isPlayerBelow) {
                    activateBomb(r, c);
                }
            }
        }

        if (somethingMoved) {
            createMazeHTML();
            placePlayer();
            applyGravityWithDelay();
        }
    }

    function activateBomb(row, col) {
        if (activeBombs.some(bomb => bomb.row === row && bomb.col === col)) {
            return;
        }

        const bombId = nextBombId++;
        const bombElement = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
        if (bombElement) bombElement.classList.add('active');
        
        const timerId = setTimeout(() => {
            const currentBomb = activeBombs.find(b => b.id === bombId);
            if (currentBomb) {
                activeBombs = activeBombs.filter(b => b.id !== bombId);
                explodeBomb(currentBomb.row, currentBomb.col);
            }
        }, 3000);

        activeBombs.push({ id: bombId, row, col, timerId });
    }

    function explodeBomb(bombRow, bombCol) {
        if (maze[bombRow][bombCol] !== CELL_TYPES.BOMB) return;

        maze[bombRow][bombCol] = CELL_TYPES.EMPTY;
        let playerHit = false;
        const chainReactionQueue = [];

        for (let r = bombRow - 1; r <= bombRow + 1; r++) {
            for (let c = bombCol - 1; c <= bombCol + 1; c++) {
                if (r < 0 || r >= mazeSize || c < 0 || c >= mazeSize) continue;

                if (r === playerPosition.row && c === playerPosition.col) playerHit = true;
                
                const cellType = maze[r][c];
                const isBorder = r === 0 || r === mazeSize - 1 || c === 0 || c === mazeSize - 1;

                switch (cellType) {
                    case CELL_TYPES.BOMB:
                        chainReactionQueue.push({ row: r, col: c });
                        break;
                    case CELL_TYPES.DIAMOND:
                        diamondsCollected++;
                        checkEndCellVisibility();
                        maze[r][c] = CELL_TYPES.EMPTY;
                        break;
                    case CELL_TYPES.ROCK:
                    case CELL_TYPES.DIRT:
                    case CELL_TYPES.END:
                        maze[r][c] = CELL_TYPES.EMPTY;
                        break;
                    case CELL_TYPES.WALL:
                        if (!isBorder) maze[r][c] = CELL_TYPES.EMPTY;
                        break;
                }
            }
        }

        chainReactionQueue.forEach(pos => {
            const bombInList = activeBombs.find(b => b.row === pos.row && b.col === pos.col);
            if (bombInList) {
                clearTimeout(bombInList.timerId);
                activeBombs = activeBombs.filter(b => b.id !== bombInList.id);
            }
            explodeBomb(pos.row, pos.col);
        });

        if (playerHit) {
            playerDies();
        }

        createMazeHTML();
        placePlayer();
        messageDisplay.textContent = `Kerättyjä timantteja: ${diamondsCollected}/${currentRequiredDiamonds}`;
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
        playerPosition = { ...initialPlayerPosition };
        loadLevel(currentLevelIndex); // Ladataan taso uudelleen kuoleman jälkeen
        initGame(); // Alustetaan peli uudelleen
    }

    function checkEndCellVisibility() {
        if (diamondsCollected >= currentRequiredDiamonds && !endCellActivated) {
            endCellActivated = true;
            messageDisplay.textContent = `Maali (kätkö) ilmestyi! Kerätty: ${diamondsCollected}/${currentRequiredDiamonds}`;
        }
    }

    function checkWinCondition() {
        let endRow = -1, endCol = -1;
        for (let r = 0; r < mazeSize; r++) {
            for (let c = 0; c < mazeSize; c++) {
                if (LEVELS[currentLevelIndex].map[r][c] === CELL_TYPES.END) {
                    endRow = r; endCol = c; break;
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
        resetButton.style.display = 'block';
    }

    function initGame() {
        loadLevel(currentLevelIndex);
        createMazeHTML();
        messageDisplay.textContent = `Taso ${currentLevelIndex + 1}. Kerää ${currentRequiredDiamonds} timanttia!`;
        updateLivesDisplay();
        checkEndCellVisibility();

        document.removeEventListener('keydown', handleKeyPress);
        document.addEventListener('keydown', handleKeyPress);
        
        resetButton.style.display = 'block';
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
