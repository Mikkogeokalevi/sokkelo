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
    let isDying = false; 
    let gravityCheckInterval = null; 
    let isPlayerMoving = false; 

    // Muutetaan fallingObjects array objektien muotoon: { id: ..., row: ..., col: ..., type: ... }
    // Annettiin niille id, jotta niitä on helpompi seurata.
    let fallingObjects = []; 
    let nextFallingObjectId = 0;

    const LEVELS = [
        // LEVEL 1 (Uusin antamasi ruudukko)
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
                [1, 2, 2, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1],
                [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
                [1, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1],
                [1, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 1],
                [1, 2, 4, 1, 2, 3, 2, 2, 2, 3, 2, 1, 2, 6, 1],
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
            ],
            requiredDiamonds: 2
        },
        // LEVEL 2 (Vanha pysyy ennallaan)
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
        fallingObjects = []; 
        nextFallingObjectId = 0; // Resetoi id:t
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

        // Tärkeää: timantit ja oven tila resetoidaan TASON alussa
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
                    case CELL_TYPES.DIAMOND:
                        cell.classList.add('dirt'); 
                        break;
                    case CELL_TYPES.BOMB:
                        cell.classList.add('bomb');
                        cell.innerHTML = '💣';
                        break;
                    case CELL_TYPES.END:
                        cell.classList.add('dirt'); 
                        cell.classList.add('end-hidden'); 
                        break;
                    case CELL_TYPES.EMPTY:
                        break;
                }
                gameArea.appendChild(cell);
            });
        });
        placePlayer();
        checkEndCellVisibility(); 
        
        // Varmista, että timantit näkyvät, jos ne ovat jo "paljastuneet" (esim. räjähdyksen takia)
        for (let r = 0; r < mazeSize; r++) {
            for (let c = 0; c < mazeSize; c++) {
                if (maze[r][c] === CELL_TYPES.DIAMOND) {
                    const cellEl = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
                    if (cellEl && !cellEl.classList.contains('dirt')) { 
                        cellEl.innerHTML = '💎';
                    }
                }
            }
        }
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
        if (isDying || isPlayerMoving) return;
        isPlayerMoving = true; 

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

                // Työnnä kivi (päivitä maze heti)
                maze[newRow][rockNewCol] = CELL_TYPES.ROCK;
                maze[newRow][newCol] = CELL_TYPES.EMPTY;

                // Päivitä visuaalisesti
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
            const objectAboveOldPosRow = playerPosition.row - 1;
            const objectAboveOldPosCol = playerPosition.col;

            if (objectAboveOldPosRow >= 0) {
                const objectAboveType = maze[objectAboveOldPosRow][objectAboveOldPosCol];
                if (objectAboveType === CELL_TYPES.ROCK || objectAboveType === CELL_TYPES.BOMB) {
                    // Merkitään objekti putoavaksi tähän kohtaan, josta pelaaja juuri lähti
                    // Varsinainen pudotus ja osumatarkistus tapahtuu vasta applyGravity-kutsussa.
                    // Tämä antaa pelaajalle yhden pelisyklin aikaa liikkua pois.
                    fallingObjects.push({ 
                        id: nextFallingObjectId++,
                        row: objectAboveOldPosRow, 
                        col: objectAboveOldPosCol, 
                        type: objectAboveType,
                        targetRow: playerPosition.row, 
                        targetCol: playerPosition.col
                    });
                    maze[objectAboveOldPosRow][objectAboveOldPosCol] = CELL_TYPES.EMPTY; 
                    
                    const oldObjCellEl = document.querySelector(`.cell[data-row="${objectAboveOldPosRow}"][data-col="${objectAboveOldPosCol}"]`);
                    if (oldObjCellEl) {
                        oldObjCellEl.classList.remove('rock', 'bomb', 'active');
                        oldObjCellEl.innerHTML = '';
                    }
                }
            }
        }

        if (targetCellType === CELL_TYPES.DIRT || targetCellType === CELL_TYPES.DIAMOND || targetCellType === CELL_TYPES.END || targetCellType === CELL_TYPES.EMPTY) {
            const cellElement = document.querySelector(`.cell[data-row="${newRow}"][data-col="${newCol}"]`);

            if (targetCellType === CELL_TYPES.DIAMOND) {
                diamondsCollected++;
                messageDisplay.textContent = `Kerättyjä timantteja: ${diamondsCollected}/${currentRequiredDiamonds}`;
                if (cellElement) {
                    cellElement.classList.remove('dirt'); 
                    cellElement.innerHTML = '💎'; 
                    setTimeout(() => { 
                        if (cellElement) cellElement.innerHTML = '';
                    }, 200);
                }
                checkEndCellVisibility(); 
            }

            if (targetCellType !== CELL_TYPES.END || endCellActivated) { 
                maze[newRow][newCol] = CELL_TYPES.EMPTY; 
                if (cellElement && cellElement.classList.contains('dirt')) {
                    cellElement.classList.remove('dirt');
                }
            }
        }

        updatePlayerPosition(newRow, newCol);
        isPlayerMoving = false; 
        checkWinCondition();
    }

    function updatePlayerPosition(row, col) {
        const oldCell = document.querySelector(`.cell[data-row="${playerPosition.row}"][data-col="${playerPosition.col}"]`);
        const playerElement = oldCell ? oldCell.querySelector('.player') : null;
        
        if (playerElement) {
            oldCell.remove(); // Poista koko vanha solu
        }
        
        // Päivitä vanhan solun tyyppiä, jotta se ei jää pelaajaksi
        // This is tricky. If player moves from a dirt, that dirt should become empty.
        // But if player moves from a rock, it should remain rock.
        // Instead of removing the entire cell and re-creating (which createMazeHTML does),
        // we should just ensure the old cell updates its appearance.
        const oldMazeCellType = maze[playerPosition.row][playerPosition.col];
        if (oldCell) { // Varmista, että vanha solu on olemassa
             oldCell.classList.remove('player-cell'); // Poista mahdollinen pelaaja-luokka
             if (oldMazeCellType === CELL_TYPES.EMPTY) {
                oldCell.classList.remove('dirt', 'rock', 'bomb', 'diamond', 'end', 'wall');
                oldCell.innerHTML = '';
             }
             // Muussa tapauksessa sen pitäisi jo olla oikea tyyppi (esim. rock, bomb)
        }

        playerPosition.row = row;
        playerPosition.col = col;
        const newCell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
        if (newCell) {
            let newPlayerElement = document.querySelector('.player');
            if (!newPlayerElement) {
                newPlayerElement = createPlayerElement();
            }
            newCell.appendChild(newPlayerElement);
            // newCell.classList.add('player-cell'); // Lisää luokka pelaajan sijaintiin
        } else {
            console.error("Virhe: Kohdesolua pelaajalle ei löytynyt!", {row, col});
        }
    }

    function createPlayerElement() {
        const player = document.createElement('div');
        player.classList.add('player');
        return player;
    }

    function applyGravity() {
        if (isDying) return; 

        let newMazeState = JSON.parse(JSON.stringify(maze));
        let playerKilledByFalling = false;

        // Käsittele ensin kaikki putoavat esineet, jotka on merkattu fallingObjects-listaan
        // Luo kopio käsiteltävistä objekteista ja tyhjennä alkuperäinen lista seuraavaa kierrosta varten.
        const currentFallingObjects = [...fallingObjects];
        fallingObjects = []; 

        currentFallingObjects.forEach(obj => {
            const nextRow = obj.row + 1; // Seuraava rivi, johon kivi/pommi putoaa

            if (nextRow < mazeSize) {
                const cellBelow = newMazeState[nextRow][obj.col];

                if (cellBelow === CELL_TYPES.EMPTY) {
                    // Jos alla on tyhjää, siirrä esine sinne
                    newMazeState[nextRow][obj.col] = obj.type;
                    newMazeState[obj.row][obj.col] = CELL_TYPES.EMPTY; // Tyhjennä vanha paikka
                    // Lisää esine takaisin fallingObjects-listaan, jos se jatkaa putoamista
                    fallingObjects.push({ ...obj, row: nextRow }); 
                } else {
                    // Putoaminen pysähtyi tai osui johonkin
                    newMazeState[obj.row][obj.col] = obj.type; // Aseta takaisin alkuperäiseen paikkaan, jos ei pudonnut
                    // Mutta jos se putosi tähän, niin se jää tähän.
                    // TÄRKEÄÄ: Tarkista osuma tässä vaiheessa, jos se osui pelaajaan!
                    if (nextRow === playerPosition.row && obj.col === playerPosition.col) {
                        if (obj.type === CELL_TYPES.ROCK) {
                            messageDisplay.textContent = "Kivi putosi päällesi! 😵";
                            playerKilledByFalling = true;
                        } else if (obj.type === CELL_TYPES.BOMB) {
                            messageDisplay.textContent = "💥 Pommi putosi päällesi! Räjähti!";
                            explodeBomb(playerPosition.row, playerPosition.col); // Räjäytä pommi heti
                            playerKilledByFalling = true;
                        }
                    } else if (obj.type === CELL_TYPES.BOMB && cellBelow === CELL_TYPES.BOMB) {
                        // Pommi osui toiseen pommiin, aktivoi se
                        activateBomb(nextRow, obj.col);
                    }
                }
            } else {
                // Putoaminen pysähtyi kartan reunaan
                newMazeState[obj.row][obj.col] = obj.type; 
            }
        });


        // Suorita "luonnollinen" painovoima koko karttaan alhaalta ylöspäin (vain jos ei vielä käsitelty fallingObjects-listalla)
        for (let r = mazeSize - 2; r >= 0; r--) {
            for (let c = 0; c < mazeSize; c++) {
                const currentCellType = maze[r][c];
                const cellBelowType = maze[r + 1][c];

                // Vain jos ruutua ei ole jo merkattu putoavaksi tässä syklissä
                if (!currentFallingObjects.some(f => f.row === r && f.col === c) &&
                    (currentCellType === CELL_TYPES.ROCK || currentCellType === CELL_TYPES.DIAMOND || currentCellType === CELL_TYPES.BOMB) &&
                    (cellBelowType === CELL_TYPES.EMPTY)) {
                    
                    // Jos alla on pelaaja ja pelaaja on juuri liikkunut pois
                    // Tässä kohtaa emme halua välitöntä kuolemaa. Tämä tarkoittaa, että
                    // esine putoaa ruutuun, jossa pelaaja oli Aiemmin, mutta pelaaja on jo liikkunut pois.
                    // Jos pelaaja olisi NYT alla, se olisi käsiteltävä ylemmässä "fallingObjects"-lohkossa.
                    // Mutta varmistetaan: Jos kivi/pommi putoaa pelaajan NYKYISEEN ruutuun, tappaa.
                    if (r + 1 === playerPosition.row && c === playerPosition.col) {
                        if (currentCellType === CELL_TYPES.ROCK) {
                            messageDisplay.textContent = "Kivi putosi päällesi! 😵";
                            playerKilledByFalling = true;
                        } else if (currentCellType === CELL_TYPES.BOMB) {
                            messageDisplay.textContent = "💥 Pommi putosi päällesi! Räjähti!";
                            explodeBomb(playerPosition.row, playerPosition.col);
                            playerKilledByFalling = true;
                        }
                    } else { // Normaalit putoamiset, jos pelaaja ei ole alla
                        newMazeState[r + 1][c] = currentCellType;
                        newMazeState[r][c] = CELL_TYPES.EMPTY;
                    }
                }
                // Jos pommi putoaa toisen pommin päälle, aktivoi se
                else if (currentCellType === CELL_TYPES.BOMB && cellBelowType === CELL_TYPES.BOMB) {
                     if (!activeBombs.some(bomb => bomb.row === r + 1 && bomb.col === c)) {
                        activateBomb(r + 1, c);
                    }
                }
            }
        }

        maze = newMazeState;
        createMazeHTML(); 
        placePlayer(); 

        if (playerKilledByFalling) {
            playerDies();
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

        // Käsittele ensin kaikki pommit räjähdysalueella (ketjureaktio)
        // Luo kopio, koska activeBombs-lista muuttuu loopin aikana
        const currentActiveBombs = [...activeBombs]; 
        currentActiveBombs.forEach(bomb => {
            if (cellsToExplode.some(pos => pos.row === bomb.row && pos.col === bomb.col)) {
                clearTimeout(bomb.timerId); // Tyhjennä pommin ajastin
                activeBombs = activeBombs.filter(ab => ab.id !== bomb.id); // Poista listasta ID:n perusteella
                
                // Tyhjennä pommiruutu heti visuaalisesti ja datasta
                maze[bomb.row][bomb.col] = CELL_TYPES.EMPTY;
                const bombEl = document.querySelector(`.cell[data-row="${bomb.row}"][data-col="${bomb.col}"]`);
                if(bombEl) {
                    bombEl.classList.remove('bomb', 'active');
                    bombEl.innerHTML = '';
                }
            }
        });

        // Nyt tuhotaan ruudut ja tarkistetaan pelaajaosuma
        cellsToExplode.forEach(pos => {
            const cellType = maze[pos.row][pos.col];
            const cellElement = document.querySelector(`.cell[data-row="${pos.row}"][data-col="${pos.col}"]`);

            if (pos.row === playerPosition.row && pos.col === playerPosition.col) {
                playerHit = true;
            } 
            
            if (cellType === CELL_TYPES.DIRT || cellType === CELL_TYPES.ROCK) { 
                maze[pos.row][pos.col] = CELL_TYPES.EMPTY;
                if (cellElement) {
                    cellElement.classList.remove('dirt', 'rock');
                    cellElement.innerHTML = '';
                }
            } else if (cellType === CELL_TYPES.DIAMOND) {
                if (cellElement) {
                    cellElement.classList.remove('dirt');
                    cellElement.innerHTML = '💎';
                }
            }
        });

        if (playerHit) {
            messageDisplay.textContent = "💥 Jäit räjähdykseen! 😵";
            playerDies();
        }
        createMazeHTML(); 
        placePlayer();
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
        nextFallingObjectId = 0; // Varmista että ID:t nollaantuu
        if (gravityCheckInterval) {
            clearInterval(gravityCheckInterval);
            gravityCheckInterval = null;
        }

        if (lives <= 0) {
            gameOver("Kaikki elämät menneet! Yritä uudelleen.");
            currentLevelIndex = 0; 
            lives = maxLives; 
            isDying = false; 
        } else {
            setTimeout(() => {
                respawnPlayer();
                // Tärkeä korjaus: resetoi diamondsCollected kuolemassa, jotta ovi piilotetaan
                diamondsCollected = 0; 
                checkEndCellVisibility(); // Tarkista oven tila uudelleen respawnin jälkeen
                messageDisplay.textContent = `Taso ${currentLevelIndex + 1}. Kerää ${diamondsCollected}/${currentRequiredDiamonds} timanttia ja etsi kätkö!`;
                isDying = false; 
                if (!gravityCheckInterval) {
                    gravityCheckInterval = setInterval(applyGravity, 200);
                }
            }, 1500);
        }
    }

    function respawnPlayer() {
        const oldPlayerEl = document.querySelector('.player');
        if (oldPlayerEl) {
            oldPlayerEl.remove();
        }

        // TÄRKEÄ KORJAUS: Lataa kartta uudelleen alkuperäisestä tilasta
        maze = JSON.parse(JSON.stringify(LEVELS[currentLevelIndex].map));

        let startRow = -1;
        let startCol = -1;
        for (let r = 0; r < mazeSize; r++) {
            for (let c = 0; c < mazeSize; c++) {
                if (maze[r][c] === CELL_TYPES.START) {
                    startRow = r;
                    startCol = c;
                    break;
                }
            }
            if (startRow !== -1) break;
        }

        if (startRow !== -1) {
            playerPosition = { row: startRow, col: startCol };
            maze[startRow][startCol] = CELL_TYPES.EMPTY; 
        } else {
            console.error("Respawn-aloituspistettä ei löydy kartasta!");
            playerPosition = { row: 1, col: 1 }; 
            maze[1][1] = CELL_TYPES.EMPTY;
        }

        fallingObjects = [];
        activeBombs.forEach(bomb => clearTimeout(bomb.timerId));
        activeBombs = [];
        nextFallingObjectId = 0;

        createMazeHTML(); 
        placePlayer();
        // checkEndCellVisibility() kutsutaan createMazeHTML:n lopussa
    }

    function checkEndCellVisibility() {
        let endRow = -1;
        let endCol = -1;
        for (let r = 0; r < mazeSize; r++) {
            for (let c = 0; c < mazeSize; c++) {
                // Etsi maalin sijainti alkuperäisestä kartasta
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

        const endCellEl = document.querySelector(`.cell[data-row="${endRow}"][data-col="${endCol}"]`);
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
            maze[endRow][endCol] = CELL_TYPES.END; 
        } else {
            if (endCellActivated) { 
                endCellActivated = false;
            }
            endCellEl.classList.add('end-hidden', 'dirt'); 
            endCellEl.classList.remove('end'); 
            endCellEl.innerHTML = ''; 
            // Palauta se alkuperäiseksi tyypiksi Levels-kartasta, mikäli se ei ole jo (esim. räjähdyksen takia)
            if (LEVELS[currentLevelIndex].map[endRow][endCol] === CELL_TYPES.END) {
                maze[endRow][endCol] = CELL_TYPES.END; // Pidä tyyppinä END, mutta piilota CSS:llä
            } else {
                maze[endRow][endCol] = LEVELS[currentLevelIndex].map[endRow][endCol]; // Palauta alkuperäinen tyyppi
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
        createMazeHTML();
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
