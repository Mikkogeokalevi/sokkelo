document.addEventListener('DOMContentLoaded', () => {
    const gameArea = document.getElementById('game-area');
    const messageDisplay = document.getElementById('game-message');
    const resetButton = document.getElementById('reset-button');

    const mazeSize = 15;
    let playerPosition = { row: 0, col: 0 };
    let maze = [];

    const CELL_TYPES = {
        EMPTY: 0,
        WALL: 1,
        DIRT: 2,
        ROCK: 3,
        DIAMOND: 4,
        START: 5,
        END: 6
    };

    let diamondsCollected = 0;
    // requiredDiamonds määritellään nyt levelData-objektissa
    let endCellActivated = false;

    let previousPlayerPosition = { row: -1, col: -1 };

    // TÄMÄ ON NYT TASOJEN LISTA!
    const LEVELS = [
        // LEVEL 1
        {
            map: [
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // Rivi 0
                [1, 5, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1], // Rivi 1 (Aloituspiste 5)
                [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1], // Rivi 2
                [1, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1], // Rivi 3 (Seinärivi)
                [1, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 1], // Rivi 4
                [1, 2, 2, 1, 2, 3, 2, 2, 2, 3, 2, 2, 2, 2, 1], // Rivi 5 (Kiviä 3)
                [1, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 1], // Rivi 6
                [1, 2, 2, 1, 2, 4, 2, 2, 2, 2, 2, 1, 2, 2, 1], // Rivi 7 (Timantti 4 - piilossa!)
                [1, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 1], // Rivi 8
                [1, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1], // Rivi 9
                [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1], // Rivi 10
                [1, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1], // Rivi 11
                [1, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 1], // Rivi 12
                [1, 2, 4, 1, 2, 3, 2, 2, 2, 3, 2, 1, 2, 6, 1], // Rivi 13 (Toinen timantti 4 - piilossa!, Kiviä 3, Maali 6)
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]  // Rivi 14
            ],
            requiredDiamonds: 2 // Tähän tasoon vaadittavat timantit
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
        // Voit lisätä tästä seuraavat tasot
        /*
        ,
        {
            map: [
                // Kolmannen tason kartta
            ],
            requiredDiamonds: 3 // Esimerkiksi kolmanteen tasoon tarvitaan 3 timanttia
        }
        */
    ];

    let currentLevelIndex = 0; // Aloitetaan ensimmäisestä tasosta (indeksi 0)
    let currentRequiredDiamonds = 0; // Päivitetään tason latauksen yhteydessä

    function loadLevel(levelIndex) {
        // Estä indeksin meneminen yli tasojen määrän
        if (levelIndex >= LEVELS.length) {
            gameOver("Onneksi olkoon! Olet ratkaissut kaikki tasot ja löytänyt Lahen kadonneet vihjeet!");
            return;
        }

        const level = LEVELS[levelIndex];
        maze = JSON.parse(JSON.stringify(level.map)); // Kloonataan kenttä
        currentRequiredDiamonds = level.requiredDiamonds; // Asetetaan tason vaatimukset

        // Etsi aloituspaikka ja päivitä playerPosition
        let startFound = false;
        for (let r = 0; r < mazeSize; r++) {
            for (let c = 0; c < mazeSize; c++) {
                if (maze[r][c] === CELL_TYPES.START) {
                    playerPosition = { row: r, col: c };
                    maze[r][c] = CELL_TYPES.EMPTY; // Muuta START-solu tyhjäksi, koska pelaaja on siinä
                    startFound = true;
                    break;
                }
            }
            if (startFound) break;
        }
        if (!startFound) {
            console.error("Virhe: Aloituspistettä ei löytynyt tasolta!");
            // Aseta oletusarvo, jotta peli ei kaadu
            playerPosition = { row: 1, col: 1 };
        }

        diamondsCollected = 0; // Nollataan kerätyt timantit uuden tason alussa
        endCellActivated = false; // Nollataan maalin tila uuden tason alussa
    }

    function createMazeHTML() {
        gameArea.innerHTML = '';
        gameArea.style.gridTemplateColumns = `repeat(${mazeSize}, 1fr)`;
        maze.forEach((row, rowIndex) => {
            row.forEach((cellType, colIndex) => {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                
                if (cellType === CELL_TYPES.DIAMOND) {
                    cell.classList.add('dirt');
                } else if (cellType === CELL_TYPES.END) {
                    cell.classList.add('end-hidden');
                    cell.classList.add('dirt'); // Nyt piilotettu maali näyttää mullalta
                }
                else {
                    switch (cellType) {
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
                        case CELL_TYPES.START: // Tässä ei pitäisi enää olla START-solua, koska se muutetaan EMPTYksi
                            cell.classList.add('start'); // Tätä ei käytetä enää aktiivisesti pelissä
                            break;
                        case CELL_TYPES.EMPTY:
                            break;
                    }
                }
                cell.dataset.row = rowIndex;
                cell.dataset.col = colIndex;
                gameArea.appendChild(cell);
            });
        });
        placePlayer();
    }

    function placePlayer() {
        const player = document.createElement('div');
        player.classList.add('player');
        const currentCell = document.querySelector(`.cell[data-row="${playerPosition.row}"][data-col="${playerPosition.col}"]`);
        currentCell.appendChild(player);
    }

    function movePlayer(dx, dy) {
        previousPlayerPosition = { ...playerPosition };

        const newRow = playerPosition.row + dy;
        const newCol = playerPosition.col + dx;

        if (newRow < 0 || newRow >= mazeSize || newCol < 0 || newCol >= mazeSize) {
            messageDisplay.textContent = "Osuit pelialueen reunaan!";
            setTimeout(() => messageDisplay.textContent = "", 1500);
            return;
        }

        const targetCellType = maze[newRow][newCol];

        if (targetCellType === CELL_TYPES.WALL) {
            messageDisplay.textContent = "Et voi kaivaa tämän seinän läpi!";
            setTimeout(() => messageDisplay.textContent = "", 1500);
            return;
        }

        if (targetCellType === CELL_TYPES.ROCK) {
            const rockPushDirection = dx !== 0 ? dx : 0;
            const rockNewCol = newCol + rockPushDirection;

            if (dy === 0 &&
                rockNewCol >= 0 && rockNewCol < mazeSize &&
                (maze[newRow][rockNewCol] === CELL_TYPES.EMPTY)) {

                maze[newRow][rockNewCol] = CELL_TYPES.ROCK;
                maze[newRow][newCol] = CELL_TYPES.EMPTY;

                const oldRockCellEl = document.querySelector(`.cell[data-row="${newRow}"][data-col="${newCol}"]`);
                const newRockCellEl = document.querySelector(`.cell[data-row="${newRow}"][data-col="${rockNewCol}"]`);

                oldRockCellEl.classList.remove('rock', 'dirt');
                oldRockCellEl.innerHTML = '';
                
                newRockCellEl.classList.add('rock');
                newRockCellEl.innerHTML = '🪨';

                updatePlayerPosition(newRow, newCol);
                applyGravityWithDelay();
                return;
            } else {
                messageDisplay.textContent = "Et voi työntää kiveä tähän suuntaan!";
                setTimeout(() => messageDisplay.textContent = "", 1500);
                return;
            }
        }

        if (targetCellType === CELL_TYPES.DIRT || targetCellType === CELL_TYPES.DIAMOND || targetCellType === CELL_TYPES.END) {
            const cellElement = document.querySelector(`.cell[data-row="${newRow}"][data-col="${newCol}"]`);

            if (targetCellType === CELL_TYPES.DIAMOND) {
                diamondsCollected++;
                messageDisplay.textContent = `Kerättyjä timantteja: ${diamondsCollected}/${currentRequiredDiamonds}`;
                cellElement.innerHTML = '💎';
                cellElement.classList.add('diamond');
                
                setTimeout(() => {
                    cellElement.classList.remove('diamond');
                    cellElement.innerHTML = '';
                }, 200);
                checkEndCellVisibility();
            }
            
            if (targetCellType === CELL_TYPES.END) {
                cellElement.classList.remove('end-hidden', 'dirt');
            } else {
                cellElement.classList.remove('dirt');
            }

            maze[newRow][newCol] = CELL_TYPES.EMPTY;
        }
        
        updatePlayerPosition(newRow, newCol);
        applyGravityWithDelay();
        checkWinCondition();
    }

    function updatePlayerPosition(row, col) {
        const oldCell = document.querySelector(`.cell[data-row="${playerPosition.row}"][data-col="${playerPosition.col}"]`);
        const playerElement = oldCell.querySelector('.player');
        if (playerElement) {
            oldCell.removeChild(playerElement);
        }

        playerPosition.row = row;
        playerPosition.col = col;
        const newCell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
        newCell.appendChild(playerElement || createPlayerElement());
    }

    function createPlayerElement() {
        const player = document.createElement('div');
        player.classList.add('player');
        return player;
    }

    function applyGravityWithDelay() {
        setTimeout(() => {
            applyGravity();
        }, 100);
    }

    function applyGravity() {
        let somethingMoved;
        let iterationCount = 0;
        const maxIterations = mazeSize * mazeSize;

        do {
            somethingMoved = false;
            iterationCount++;
            if (iterationCount > maxIterations) {
                console.error("Gravity loop exceeded max iterations. Possible infinite loop.");
                break;
            }
            for (let r = mazeSize - 2; r >= 0; r--) {
                for (let c = 0; c < mazeSize; c++) {
                    const currentCellType = maze[r][c];
                    const cellBelowType = maze[r + 1][c];

                    if ((currentCellType === CELL_TYPES.ROCK || currentCellType === CELL_TYPES.DIAMOND) &&
                        (cellBelowType === CELL_TYPES.EMPTY)) {

                        if (playerPosition.row === r + 1 && playerPosition.col === c) {
                            continue;
                        }

                        maze[r + 1][c] = currentCellType;
                        maze[r][c] = CELL_TYPES.EMPTY;
                        somethingMoved = true;

                        const oldCellEl = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
                        const newCellEl = document.querySelector(`.cell[data-row="${r + 1}"][data-col="${c}"]`);

                        oldCellEl.classList.remove('rock', 'diamond', 'dirt');
                        oldCellEl.innerHTML = '';

                        if (currentCellType === CELL_TYPES.ROCK) {
                            newCellEl.classList.add('rock');
                            newCellEl.innerHTML = '🪨';
                        } else if (currentCellType === CELL_TYPES.DIAMOND) {
                            newCellEl.classList.add('dirt');
                            newCellEl.innerHTML = '';
                        }
                    }
                }
            }
        } while (somethingMoved);
    }

    function checkEndCellVisibility() {
        if (diamondsCollected >= currentRequiredDiamonds && !endCellActivated) {
            endCellActivated = true;
            // Etsi maalisolun HTML-elementti kartasta, ei alkuperäisestä LEVEL_1:stä
            let endRow = -1;
            let endCol = -1;
            for (let r = 0; r < mazeSize; r++) {
                for (let c = 0; c < mazeSize; c++) {
                    // Tärkeä muutos: etsi maali alkuperäisestä tasorakenteesta, ei muutetusta 'maze'-muuttujasta
                    // 'maze' muuttuu, kun pelaaja liikkuu, mutta alkuperäinen LEVEL_X.map säilyy
                    if (LEVELS[currentLevelIndex].map[r][c] === CELL_TYPES.END) {
                        endRow = r;
                        endCol = c;
                        break;
                    }
                }
                if (endRow !== -1) break;
            }

            const endCellEl = document.querySelector(`.cell[data-row="${endRow}"][data-col="${endCol}"]`);
            if (endCellEl) {
                endCellEl.classList.remove('end-hidden', 'dirt'); 
                endCellEl.classList.add('end');
                messageDisplay.textContent = `Maali (kätkö) ilmestyi tasolla ${currentLevelIndex + 1}! Kerätty: ${diamondsCollected}/${currentRequiredDiamonds}`;
            }
        }
    }

    function checkWinCondition() {
        // Etsi maalisolun sijainti alkuperäisestä tasokartasta
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
                // Taso läpäisty!
                currentLevelIndex++; // Siirry seuraavaan tasoon
                if (currentLevelIndex < LEVELS.length) {
                    // Lataa seuraava taso
                    messageDisplay.textContent = `Taso ${currentLevelIndex} läpäisty! Valmistaudutaan seuraavaan...`;
                    setTimeout(() => {
                        initGame(); // Käynnistä peli uudelleen, joka lataa seuraavan tason
                    }, 2000); // Pieni viive siirtymiseen
                } else {
                    // Kaikki tasot läpäisty
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
        gameArea.removeEventListener('touchend', handleTouchEnd);
    }

    function initGame() {
        loadLevel(currentLevelIndex); // Lataa nykyinen taso
        createMazeHTML();
        messageDisplay.textContent = `Taso ${currentLevelIndex + 1}. Kerää ${currentRequiredDiamonds} timanttia ja etsi kätkö!`;
        
        // Varmista, että event listenerit lisätään vain kerran
        document.removeEventListener('keydown', handleKeyPress);
        gameArea.removeEventListener('touchstart', handleTouchStart);
        gameArea.removeEventListener('touchend', handleTouchEnd);

        document.addEventListener('keydown', handleKeyPress);
        gameArea.addEventListener('touchstart', handleTouchStart);
        gameArea.addEventListener('touchend', handleTouchEnd);

        checkEndCellVisibility(); // Tarkista maalin tila alussa (ei näy, ellei timantteja jo kerätty)
    }

    const handleKeyPress = (e) => {
        if (messageDisplay.textContent.startsWith("Peli ohi!")) return;
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
    const handleTouchEnd = (e) => {
        if (messageDisplay.textContent.startsWith("Peli ohi!")) return;

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
        e.preventDefault();
    };
    
    resetButton.addEventListener('click', () => {
        currentLevelIndex = 0; // Aloita alusta, jos painetaan reset-nappia
        initGame();
    });

    initGame(); // Käynnistä peli
});