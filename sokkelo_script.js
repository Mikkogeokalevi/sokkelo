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

    let activeBombs = []; // {row, col, timerId}

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
                [1, 2, 2, 2, 2, 4, 2, 2, 2, 2, 2, 1, 2, 2, 1],
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

                if (cellType === CELL_TYPES.DIAMOND) {
                    cell.classList.add('dirt');
                } else if (cellType === CELL_TYPES.END) {
                    cell.classList.add('end-hidden');
                    cell.classList.add('dirt');
                } else {
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
                        case CELL_TYPES.BOMB:
                            cell.classList.add('bomb');
                            cell.innerHTML = '💣';
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

    function updateLivesDisplay() {
        livesDisplay.innerHTML = '';
        for (let i = 0; i < lives; i++) {
            livesDisplay.innerHTML += '<span class="heart">❤️</span>';
        }
    }

    function movePlayer(dx, dy) {
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

            // Kiven työntäminen, jos työnnetään tyhjään tai pommin päälle
            if (dy === 0 &&
                rockNewCol >= 0 && rockNewCol < mazeSize &&
                (maze[newRow][rockNewCol] === CELL_TYPES.EMPTY || maze[newRow][rockNewCol] === CELL_TYPES.BOMB)) {

                // Jos kivi työnnetään pommin päälle, aktivoi pommi
                if (maze[newRow][rockNewCol] === CELL_TYPES.BOMB) {
                    activateBomb(newRow, rockNewCol);
                }

                maze[newRow][rockNewCol] = CELL_TYPES.ROCK;
                maze[newRow][newCol] = CELL_TYPES.EMPTY;

                const oldRockCellEl = document.querySelector(`.cell[data-row="${newRow}"][data-col="${newCol}"]`);
                const newRockCellEl = document.querySelector(`.cell[data-row="${newRow}"][data-col="${rockNewCol}"]`);

                if (oldRockCellEl) {
                    oldRockCellEl.classList.remove('rock', 'dirt');
                    oldRockCellEl.innerHTML = '';
                }
                if (newRockCellEl) {
                    newRockCellEl.classList.add('rock');
                    newRockCellEl.innerHTML = '🪨';
                }

                updatePlayerPosition(newRow, newCol);
                applyGravityWithDelay();
                return;
            } else {
                messageDisplay.textContent = "Et voi työntää kiveä tähän suuntaan!";
                setTimeout(() => messageDisplay.textContent = "", 1500);
                return;
            }
        }

        if (targetCellType === CELL_TYPES.BOMB) {
            // Jos pelaaja yrittää astua pommin päälle, aktivoi pommi ja estä liike
            if (!activeBombs.some(bomb => bomb.row === newRow && bomb.col === newCol)) {
                activateBomb(newRow, newCol);
            }
            messageDisplay.textContent = "💥 Pommi aktivoitu! Väistä!";
            setTimeout(() => {
                if (!messageDisplay.textContent.includes("Peli ohi!")) {
                    messageDisplay.textContent = "";
                }
            }, 1500);
            return; // Estä pelaajan liike pommin päälle
        }

        // Jos ei ole seinä, kiven työntöä tai pommia (tai pommi on jo käsitelty), kaiva ja liiku
        if (targetCellType === CELL_TYPES.DIRT || targetCellType === CELL_TYPES.DIAMOND || targetCellType === CELL_TYPES.END || targetCellType === CELL_TYPES.EMPTY) {
            const cellElement = document.querySelector(`.cell[data-row="${newRow}"][data-col="${newCol}"]`);

            if (targetCellType === CELL_TYPES.DIAMOND) {
                diamondsCollected++;
                messageDisplay.textContent = `Kerättyjä timantteja: ${diamondsCollected}/${currentRequiredDiamonds}`;
                cellElement.innerHTML = '💎';

                setTimeout(() => {
                    cellElement.classList.remove('diamond');
                    cellElement.innerHTML = '';
                    cellElement.classList.remove('dirt');
                }, 200);
                checkEndCellVisibility();
            }

            if (targetCellType === CELL_TYPES.END) {
                cellElement.classList.remove('end-hidden', 'dirt');
            } else if (cellElement.classList.contains('dirt')) {
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
        const playerElement = oldCell ? oldCell.querySelector('.player') : null;
        if (playerElement) {
            oldCell.removeChild(playerElement);
        }

        playerPosition.row = row;
        playerPosition.col = col;
        const newCell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
        if (newCell) {
            newCell.appendChild(playerElement || createPlayerElement());
        }
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

                    // Kivi tai Timantti putoaa, JOS ALLA ON TYHJÄÄ
                    if ((currentCellType === CELL_TYPES.ROCK || currentCellType === CELL_TYPES.DIAMOND) &&
                        (cellBelowType === CELL_TYPES.EMPTY)) {

                        // Jos pelaaja on putoavan kiven alla
                        if (playerPosition.row === r + 1 && playerPosition.col === c && currentCellType === CELL_TYPES.ROCK) {
                            messageDisplay.textContent = "Kivi putosi päällesi! 😵";
                            setTimeout(() => messageDisplay.textContent = "", 2000);
                            playerDies();
                            return;
                        }

                        maze[r + 1][c] = currentCellType;
                        maze[r][c] = CELL_TYPES.EMPTY;
                        somethingMoved = true;

                        const oldCellEl = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
                        const newCellEl = document.querySelector(`.cell[data-row="${r + 1}"][data-col="${c}"]`);

                        if (oldCellEl) {
                            oldCellEl.classList.remove('rock', 'diamond', 'bomb', 'dirt', 'active');
                            oldCellEl.innerHTML = '';
                        }
                        if (newCellEl) {
                            if (currentCellType === CELL_TYPES.ROCK) {
                                newCellEl.classList.add('rock');
                                newCellEl.innerHTML = '🪨';
                            } else if (currentCellType === CELL_TYPES.DIAMOND) {
                                newCellEl.classList.add('dirt');
                                newCellEl.innerHTML = '';
                            }
                        }
                    }
                    // UUSI LOGIIKKA POMMEILLE:
                    else if (currentCellType === CELL_TYPES.BOMB) {
                        // Jos pommi putoaa tyhjään soluun
                        if (cellBelowType === CELL_TYPES.EMPTY) {
                            // Siirrä pommi uuteen paikkaan ensin
                            maze[r + 1][c] = CELL_TYPES.BOMB;
                            maze[r][c] = CELL_TYPES.EMPTY;
                            somethingMoved = true;

                            const oldBombEl = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
                            const newBombEl = document.querySelector(`.cell[data-row="${r + 1}"][data-col="${c}"]`);
                            
                            // Päivitä visuaalisesti
                            if (oldBombEl) {
                                oldBombEl.classList.remove('bomb', 'active'); // Poista aktiivisuus
                                oldBombEl.innerHTML = '';
                            }
                            if (newBombEl) {
                                newBombEl.classList.add('bomb');
                                newBombEl.innerHTML = '💣';
                            }

                            // Jos pelaaja on uudessa pommin paikassa, räjäytä välittömästi (pommi putosi pelaajan päälle)
                            if (playerPosition.row === r + 1 && playerPosition.col === c) {
                                messageDisplay.textContent = "💥 Pommi putosi päällesi! Räjähti!";
                                setTimeout(() => messageDisplay.textContent = "", 2000);
                                explodeBomb(r + 1, c);
                                playerDies();
                                return; // Pysäytä painovoima, peli jatkuu vasta respawnin jälkeen
                            }
                            // TÄRKEÄ MUUTOS: ÄLÄ AKITVOI POMMIA TÄSSÄ, KOSKA SE EI OLE VUOROVAIKUTUKSESSA PELAAJAN KANSSA
                            // Pommin aktivointi tapahtuu vasta, kun pelaaja kävelee sen vierestä tai työntää sen päälle.
                        }
                        // Jos pommi putoaa toisen pommin päälle
                        else if (cellBelowType === CELL_TYPES.BOMB) {
                            // Jos alempi pommi ei ole aktiivinen, aktivoi se
                            if (!activeBombs.some(bomb => bomb.row === r + 1 && bomb.col === c)) {
                                activateBomb(r + 1, c);
                            }
                        }
                        // Jos pommi pysähtyy jonkin muun kuin tyhjän solun päälle (dirt, rock, wall)
                        // TÄRKEÄ MUUTOS: ÄLÄ AKITVOI POMMIA TÄSSÄ AUTOMAATTISESTI
                        // Aktivoi pommi vain, kun pelaaja vuorovaikuttaa sen kanssa.
                    }
                }
            }
        } while (somethingMoved);
    }


    function activateBomb(row, col) {
        // Estä useita aktivointeja samalle pommille
        if (activeBombs.some(bomb => bomb.row === row && bomb.col === col)) {
            return;
        }

        const bombElement = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
        if (bombElement) {
            bombElement.classList.add('active'); // Lisää aktiivinen-luokka animaatiota varten
        }

        const timerId = setTimeout(() => {
            // Poista pommi aktiivisista pommeista
            activeBombs = activeBombs.filter(bomb => !(bomb.row === row && bomb.col === col));

            if (bombElement) {
                bombElement.classList.remove('active'); // Poista aktiivinen-luokka
            }
            explodeBomb(row, col);
        }, 3000); // 3 sekunnin viive räjähdykseen

        activeBombs.push({ row, col, timerId });
        messageDisplay.textContent = `💥 Pommi aktivoitu (${row},${col})! Juokse!`;
        setTimeout(() => {
            if (!messageDisplay.textContent.includes("Peli ohi!")) {
                 messageDisplay.textContent = "";
            }
        }, 1500);
    }


    function explodeBomb(bombRow, bombCol) {
        const explosionRadius = 1;
        const cellsToExplode = [];

        for (let r = bombRow - explosionRadius; r <= bombRow + explosionRadius; r++) {
            for (let c = bombCol - explosionRadius; c <= bombCol + explosionRadius; c++) {
                if (r >= 0 && r < mazeSize && c >= 0 && c < mazeSize) {
                    cellsToExplode.push({ row: r, col: c });
                }
            }
        }

        // Tuhota ensin kaikki pommit räjähdysalueella, jotta ne eivät laukaise toisiaan peräkkäin räjähtäessään
        cellsToExplode.forEach(pos => {
            if (maze[pos.row][pos.col] === CELL_TYPES.BOMB) {
                // Tyhjennä aktiivisten pommien ajastin, jos se on räjähdysalueella
                activeBombs = activeBombs.filter(bomb => {
                    if (bomb.row === pos.row && bomb.col === pos.col) {
                        clearTimeout(bomb.timerId);
                        const bombEl = document.querySelector(`.cell[data-row="${pos.row}"][data-col="${pos.col}"]`);
                        if(bombEl) bombEl.classList.remove('active');
                        return false; // Poista listalta
                    }
                    return true;
                });
                maze[pos.row][pos.col] = CELL_TYPES.EMPTY; // Pommi tuhoutuu
                const bombEl = document.querySelector(`.cell[data-row="${pos.row}"][data-col="${pos.col}"]`);
                if(bombEl) {
                    bombEl.classList.remove('bomb');
                    bombEl.innerHTML = '';
                }
            }
        });

        // Nyt käsittele muut tuhoutuvat solut ja pelaaja
        let playerHit = false;
        cellsToExplode.forEach(pos => {
            const cellType = maze[pos.row][pos.col];
            const cellElement = document.querySelector(`.cell[data-row="${pos.row}"][data-col="${pos.col}"]`);

            if (pos.row === playerPosition.row && pos.col === playerPosition.col) {
                playerHit = true;
            } else if (cellType === CELL_TYPES.DIAMOND) {
                // Timantti paljastuu mutta ei tuhoudu
                cellElement.classList.remove('dirt');
                cellElement.innerHTML = '💎';
            } else if (cellType !== CELL_TYPES.EMPTY && cellType !== CELL_TYPES.WALL) { // Kaikki muu paitsi tyhjä solu ja seinä tuhoutuu
                maze[pos.row][pos.col] = CELL_TYPES.EMPTY;
                if (cellElement) {
                    cellElement.classList.remove('dirt', 'rock', 'end-hidden', 'end');
                    cellElement.innerHTML = '';
                }
            }
        });

        if (playerHit) {
            messageDisplay.textContent = "💥 Jäit räjähdykseen! 😵";
            setTimeout(() => messageDisplay.textContent = "", 2000);
            playerDies();
        }
        applyGravityWithDelay();
    }

    function playerDies() {
        lives--;
        updateLivesDisplay();
        messageDisplay.textContent = `Voi ei! Menetit elämän. Elämiä jäljellä: ${lives}`;

        if (lives <= 0) {
            gameOver("Kaikki elämät menneet! Yritä uudelleen.");
            currentLevelIndex = 0;
            lives = maxLives;
        } else {
            setTimeout(() => {
                respawnPlayer();
                messageDisplay.textContent = `Taso ${currentLevelIndex + 1}. Kerää ${diamondsCollected}/${currentRequiredDiamonds} timanttia ja etsi kätkö!`;
            }, 1500);
        }
    }

    function respawnPlayer() {
        const oldPlayerEl = document.querySelector(`.cell[data-row="${playerPosition.row}"][data-col="${playerPosition.col}"] .player`);
        if (oldPlayerEl) {
            oldPlayerEl.remove();
        }

        let respawnCandidate = { ...initialPlayerPosition };
        // Varmista, että respawn-paikka on tyhjä, jos se ei jo ole
        if (maze[initialPlayerPosition.row][initialPlayerPosition.col] !== CELL_TYPES.EMPTY) {
            let found = false;
            const directions = [[0,0], [0,1], [0,-1], [1,0], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]]; // Aloituspaikka ja ympäröivät

            for (const [dr, dc] of directions) {
                const checkRow = initialPlayerPosition.row + dr;
                const checkCol = initialPlayerPosition.col + dc;

                if (checkRow >= 0 && checkRow < mazeSize && checkCol >= 0 && checkCol < mazeSize &&
                    maze[checkRow][checkCol] === CELL_TYPES.EMPTY) {
                    respawnCandidate = { row: checkRow, col: checkCol };
                    found = true;
                    break;
                }
            }
            if (!found) {
                // Viimeinen keino: etsi mikä tahansa vapaa paikka
                for (let r = 0; r < mazeSize; r++) {
                    for (let c = 0; c < mazeSize; c++) {
                        if (maze[r][c] === CELL_TYPES.EMPTY) {
                            respawnCandidate = { row: r, col: c };
                            found = true;
                            break;
                        }
                    }
                    if (found) break;
                }
            }
        }
        playerPosition = { ...respawnCandidate };

        // Luo kartta uudelleen ja aseta pelaaja
        createMazeHTML();
        placePlayer();
        applyGravityWithDelay();
    }

    function checkEndCellVisibility() {
        if (diamondsCollected >= currentRequiredDiamonds && !endCellActivated) {
            endCellActivated = true;
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

            const endCellEl = document.querySelector(`.cell[data-row="${endRow}"][data-col="${endCol}"]`);
            if (endCellEl) {
                endCellEl.classList.remove('end-hidden', 'dirt');
                endCellEl.classList.add('end');
                messageDisplay.textContent = `Maali (kätkö) ilmestyi tasolla ${currentLevelIndex + 1}! Kerätty: ${diamondsCollected}/${currentRequiredDiamonds}`;
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
        resetButton.style.display = 'block';
    }

    function initGame() {
        loadLevel(currentLevelIndex);
        createMazeHTML();
        messageDisplay.textContent = `Taso ${currentLevelIndex + 1}. Kerää ${currentRequiredDiamonds} timanttia ja etsi kätkö!`;
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
        checkEndCellVisibility();
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

    const handleTouchMove = (e) => {
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
    };

    resetButton.addEventListener('click', () => {
        currentLevelIndex = 0;
        lives = maxLives;
        initGame();
    });

    initGame();
});
