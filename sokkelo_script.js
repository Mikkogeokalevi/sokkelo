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
    let endCellActivated = false; // Tämä pitää muistaa pitää oikeassa tilassa tasojen välilläkin

    let lives = 3;
    const maxLives = 3;

    let activeBombs = []; // {row, col, timerId}
    let isDying = false; // Estää useita playerDies() kutsuja
    let gravityCheckInterval = null; // Hallitsee painovoiman päivitystä säännöllisesti
    let isPlayerMoving = false; // Estää pelaajan liikkumisen useaan kertaan

    // Seuraava muuttuja pitää kirjaa putoavista esineistä
    // {row, col, type, originalRow, originalCol}
    let fallingObjects = []; 

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
        maze = JSON.parse(JSON.stringify(level.map)); // Kloonataan kenttä
        currentRequiredDiamonds = level.requiredDiamonds;

        // Tyhjennä kaikki ajastimet ja tilat tason latauksen yhteydessä
        activeBombs.forEach(bomb => clearTimeout(bomb.timerId));
        activeBombs = [];
        fallingObjects = []; // Tyhjennä putoavat objektit
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
        
        // Aloita säännöllinen painovoiman tarkistus
        // Tämä on "pelisykli", joka tarkistaa putoamiset jatkuvasti
        if (!gravityCheckInterval) {
            gravityCheckInterval = setInterval(applyGravity, 200); // Tarkista painovoima 200ms välein
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
                        cell.classList.add('dirt'); // Timantti on piilossa mullan alla
                        // Timantin symboli lisätään vasta kun kerätään (tai jos näkyy mapissa alunperin)
                        break;
                    case CELL_TYPES.BOMB:
                        cell.classList.add('bomb');
                        cell.innerHTML = '💣';
                        break;
                    case CELL_TYPES.END:
                        cell.classList.add('dirt'); // Maali on piilossa mullan alla
                        cell.classList.add('end-hidden'); // Piilotetaan maali kunnes timantit kerätty
                        break;
                    case CELL_TYPES.EMPTY:
                        break;
                }
                gameArea.appendChild(cell);
            });
        });
        placePlayer();
        // Varmista, että ovi päivittyy heti renderöinnin jälkeen
        checkEndCellVisibility(); 
        
        // Varmista, että timantit näkyvät, jos ne ovat jo "paljastuneet" (esim. räjähdyksen takia)
        for (let r = 0; r < mazeSize; r++) {
            for (let c = 0; c < mazeSize; c++) {
                if (maze[r][c] === CELL_TYPES.DIAMOND) {
                    const cellEl = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
                    if (cellEl && !cellEl.classList.contains('dirt')) { // Jos ei ole enää mullan alla
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
        isPlayerMoving = true; // Estä muita liikkeitä kunnes tämä on käsitelty

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

            // Kiven työntö: vain jos työnnetään tyhjään tai pommin päälle, ja vain vaakasuoraan
            if (dy === 0 && // Vain vaakasuora työntö
                rockNewCol >= 0 && rockNewCol < mazeSize &&
                (maze[newRow][rockNewCol] === CELL_TYPES.EMPTY || maze[newRow][rockNewCol] === CELL_TYPES.BOMB)) {

                // Jos kivi työnnetään pommin päälle, aktivoi pommi
                if (maze[newRow][rockNewCol] === CELL_TYPES.BOMB) {
                    activateBomb(newRow, rockNewCol);
                }

                maze[newRow][rockNewCol] = CELL_TYPES.ROCK;
                maze[newRow][newCol] = CELL_TYPES.EMPTY;

                // Päivitä vain kyseiset kaksi ruutua visuaalisesti
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
                // Painovoima hoitaa tämänkin jälkikäteen
                isPlayerMoving = false;
                return;
            } else {
                messageDisplay.textContent = "Et voi työntää kiveä tähän suuntaan!";
                setTimeout(() => { messageDisplay.textContent = ""; isPlayerMoving = false; }, 500);
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
                isPlayerMoving = false; // Vapauta liikkuminen viestin jälkeen
            }, 1000);
            return; // Estä pelaajan liike pommin päälle
        }

        // Jos liikutaan ALAS (dy > 0)
        // ja vanhan sijainnin yläpuolella on kivi tai pommi, merkitään se putoavaksi
        if (dy > 0) {
            const objectAboveOldPosRow = playerPosition.row - 1;
            const objectAboveOldPosCol = playerPosition.col;

            if (objectAboveOldPosRow >= 0) {
                const objectAboveType = maze[objectAboveOldPosRow][objectAboveOldPosCol];
                if (objectAboveType === CELL_TYPES.ROCK || objectAboveType === CELL_TYPES.BOMB) {
                    // Merkitään objekti putoavaksi tähän kohtaan, josta pelaaja juuri lähti
                    // Nyt `applyGravity` hoitaa varsinaisen pudotuksen ja kuoleman tarkistuksen myöhemmin
                    fallingObjects.push({ 
                        row: objectAboveOldPosRow, 
                        col: objectAboveOldPosCol, 
                        type: objectAboveType,
                        targetRow: playerPosition.row, // Pelaajan vanha sijainti on nyt kohteena
                        targetCol: playerPosition.col
                    });
                    maze[objectAboveOldPosRow][objectAboveOldPosCol] = CELL_TYPES.EMPTY; // Tyhjennä vanha paikka
                    
                    // Päivitä visuaalisesti tyhjäksi heti
                    const oldObjCellEl = document.querySelector(`.cell[data-row="${objectAboveOldPosRow}"][data-col="${objectAboveOldPosCol}"]`);
                    if (oldObjCellEl) {
                        oldObjCellEl.classList.remove('rock', 'bomb', 'active');
                        oldObjCellEl.innerHTML = '';
                    }
                }
            }
        }

        // Kaivetaan ruutu (multa, timantti, maali, tyhjä)
        if (targetCellType === CELL_TYPES.DIRT || targetCellType === CELL_TYPES.DIAMOND || targetCellType === CELL_TYPES.END || targetCellType === CELL_TYPES.EMPTY) {
            const cellElement = document.querySelector(`.cell[data-row="${newRow}"][data-col="${newCol}"]`);

            if (targetCellType === CELL_TYPES.DIAMOND) {
                diamondsCollected++;
                messageDisplay.textContent = `Kerättyjä timantteja: ${diamondsCollected}/${currentRequiredDiamonds}`;
                if (cellElement) {
                    cellElement.classList.remove('dirt'); // Poista multa
                    cellElement.innerHTML = '💎'; // Näytä timanttisymboli
                    setTimeout(() => { // Poista timanttisymboli lyhyen ajan kuluttua
                        if (cellElement) cellElement.innerHTML = '';
                    }, 200);
                }
                checkEndCellVisibility(); // Tarkista oven näkyvyys timantin keräyksen jälkeen
            }

            // Asetetaan ruutu tyhjäksi, jos ei ollut maali, tai jos maali jo aktivoitu
            if (targetCellType !== CELL_TYPES.END || endCellActivated) { // Älä muuta maalin tyyppiä jos ei aktivoitu
                maze[newRow][newCol] = CELL_TYPES.EMPTY; 
                if (cellElement && cellElement.classList.contains('dirt')) {
                    cellElement.classList.remove('dirt');
                }
            }
        }

        updatePlayerPosition(newRow, newCol);
        isPlayerMoving = false; // Vapauta liikkuminen tässä vaiheessa
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
            let newPlayerElement = document.querySelector('.player');
            if (!newPlayerElement) {
                newPlayerElement = createPlayerElement();
            }
            newCell.appendChild(newPlayerElement);
        } else {
            console.error("Virhe: Kohdesolua pelaajalle ei löytynyt!", {row, col});
        }
    }

    function createPlayerElement() {
        const player = document.createElement('div');
        player.classList.add('player');
        return player;
    }

    // TÄRKEIN MUUTOS: Painovoima päivitetään nyt säännöllisellä intervallilla (pelisykli)
    function applyGravity() {
        if (isDying) return; // Älä suorita painovoimaa, jos pelaaja on kuolemassa

        let somethingMoved = false;
        let newMazeState = JSON.parse(JSON.stringify(maze)); // Työskentele kopion kanssa

        // Vaihe 1: Käsittele putoavat esineet (joita movePlayer merkitsi)
        const currentFallingObjects = [...fallingObjects]; // Luo kopio käsiteltävistä objekteista
        fallingObjects = []; // Tyhjennä lista uutta sykliä varten

        currentFallingObjects.forEach(obj => {
            if (obj.targetRow + 1 < mazeSize && newMazeState[obj.targetRow + 1][obj.targetCol] === CELL_TYPES.EMPTY) {
                // Putoaa edelleen, siirrä seuraavaan ruutuun ja lisää takaisin listaan
                newMazeState[obj.targetRow + 1][obj.targetCol] = obj.type;
                // Älä tyhjennä vanhaa paikkaa tästä, koska se on jo tyhjä
                somethingMoved = true;
                fallingObjects.push({ 
                    row: obj.targetRow, // Päivitä alkuperäinen rivi visuaaliseen päivitykseen
                    col: obj.targetCol,
                    type: obj.type,
                    targetRow: obj.targetRow + 1, // Uusi kohderivi
                    targetCol: obj.targetCol
                });
            } else {
                // Putoaminen pysähtyi tai osui johonkin
                newMazeState[obj.targetRow][obj.targetCol] = obj.type; // Aseta lopulliseen paikkaan
                somethingMoved = true; // Merkitse liikkuneeksi
            }
        });
        
        // Vaihe 2: Suorita "luonnollinen" painovoima koko karttaan alhaalta ylöspäin
        for (let r = mazeSize - 2; r >= 0; r--) {
            for (let c = 0; c < mazeSize; c++) {
                const currentCellType = maze[r][c]; // Käytä alkuperäistä mazea, jotta ei käytetä jo siirrettyjä
                const cellBelowType = maze[r + 1][c];

                // Kivi, timantti tai pommi putoaa, jos alla on tyhjää
                if ((currentCellType === CELL_TYPES.ROCK || currentCellType === CELL_TYPES.DIAMOND || currentCellType === CELL_TYPES.BOMB) &&
                    (cellBelowType === CELL_TYPES.EMPTY)) {
                    
                    if (!fallingObjects.some(f => f.row === r && f.col === c)) { // Vain jos ei jo merkattu putoavaksi
                        newMazeState[r + 1][c] = currentCellType;
                        newMazeState[r][c] = CELL_TYPES.EMPTY;
                        somethingMoved = true;
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

        // Vasta nyt päivitetään todellinen pelikartta ja visuaalinen esitys
        maze = newMazeState;
        createMazeHTML(); // Päivitä visuaalinen esitys muutosten jälkeen
        placePlayer(); // Aseta pelaaja takaisin oikeaan paikkaan

        // Vaihe 3: Tarkista pelaajan osuma vasta kun kaikki putoamiset ovat tapahtuneet ja kartta on vakaa
        if (maze[playerPosition.row][playerPosition.col] === CELL_TYPES.ROCK) {
            messageDisplay.textContent = "Kivi putosi päällesi! 😵";
            playerDies();
            return;
        } else if (maze[playerPosition.row][playerPosition.col] === CELL_TYPES.BOMB) {
            messageDisplay.textContent = "💥 Pommi putosi päällesi! Räjähti!";
            explodeBomb(playerPosition.row, playerPosition.col); // Räjäytä pommi, joka on nyt pelaajan ruudussa
            playerDies();
            return;
        }
    }


    function activateBomb(row, col) {
        if (activeBombs.some(bomb => bomb.row === row && bomb.col === col)) {
            return;
        }

        const bombElement = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
        if (bombElement) {
            bombElement.classList.add('active'); // Lisää aktiivinen-luokka animaatiota varten
        }

        const timerId = setTimeout(() => {
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
        const bombsToDetonateNow = [];
        activeBombs.forEach(bomb => {
            if (cellsToExplode.some(pos => pos.row === bomb.row && pos.col === bomb.col)) {
                bombsToDetonateNow.push(bomb);
            }
        });

        // Poista aktivoidut pommit aktiivisista ja kutsu explodeBomb niille
        bombsToDetonateNow.forEach(bomb => {
            clearTimeout(bomb.timerId);
            activeBombs = activeBombs.filter(ab => !(ab.row === bomb.row && ab.col === bomb.col));
            const bombEl = document.querySelector(`.cell[data-row="${bomb.row}"][data-col="${bomb.col}"]`);
            if(bombEl) bombEl.classList.remove('active');
            // Asetetaan pommiruutu heti tyhjäksi ennen varsinaista räjähdystä
            maze[bomb.row][bomb.col] = CELL_TYPES.EMPTY;
            if(bombEl) {
                bombEl.classList.remove('bomb');
                bombEl.innerHTML = '';
            }
        });

        // Nyt tuhotaan ruudut ja tarkistetaan pelaajaosuma
        cellsToExplode.forEach(pos => {
            const cellType = maze[pos.row][pos.col];
            const cellElement = document.querySelector(`.cell[data-row="${pos.row}"][data-col="${pos.col}"]`);

            if (pos.row === playerPosition.row && pos.col === playerPosition.col) {
                playerHit = true;
            } 
            
            // Tuhottavat tyypit: DIRT, ROCK, BOMB (joka ei ollut jo räjähtänyt)
            // WALL ja END eivät tuhoudu räjähdyksessä
            if (cellType === CELL_TYPES.DIRT || cellType === CELL_TYPES.ROCK) { // BOMB jo tyhjennetty
                maze[pos.row][pos.col] = CELL_TYPES.EMPTY;
                if (cellElement) {
                    cellElement.classList.remove('dirt', 'rock');
                    cellElement.innerHTML = '';
                }
            } else if (cellType === CELL_TYPES.DIAMOND) {
                // Timantti paljastuu mutta ei tuhoudu räjähdyksessä
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
        // Välitön visuaalinen päivitys räjähdyksen jälkeen
        createMazeHTML(); 
        placePlayer();
        // Painovoima hoituu säännöllisellä intervalilla, ei tarvitse kutsua erikseen tässä
    }

    function playerDies() {
        if (isDying) return;
        isDying = true;

        lives--;
        updateLivesDisplay();
        messageDisplay.textContent = `Voi ei! Menetit elämän. Elämiä jäljellä: ${lives}`;

        // Tyhjennä kaikki ajastimet ja aktiiviset pommit ja putoavat objektit
        activeBombs.forEach(bomb => clearTimeout(bomb.timerId));
        activeBombs = [];
        fallingObjects = [];
        if (gravityCheckInterval) { // Pysäytä painovoima, jotta peli ei reagoi kuollessa
            clearInterval(gravityCheckInterval);
            gravityCheckInterval = null;
        }

        if (lives <= 0) {
            gameOver("Kaikki elämät menneet! Yritä uudelleen.");
            currentLevelIndex = 0; // Resetoi taso alusta
            lives = maxLives; // Resetoi elämät
            isDying = false; // Vapauta isDying peliä uudelleen aloittaessa
        } else {
            setTimeout(() => {
                respawnPlayer();
                messageDisplay.textContent = `Taso ${currentLevelIndex + 1}. Kerää ${diamondsCollected}/${currentRequiredDiamonds} timanttia ja etsi kätkö!`;
                isDying = false; // Vapauta isDying respawnin jälkeen
                // Aloita painovoima-interval uudelleen respawnin jälkeen
                if (!gravityCheckInterval) {
                    gravityCheckInterval = setInterval(applyGravity, 200);
                }
            }, 1500);
        }
    }

    function respawnPlayer() {
        // Poista vanha pelaajaelementti, jos sellainen on olemassa
        const oldPlayerEl = document.querySelector('.player');
        if (oldPlayerEl) {
            oldPlayerEl.remove();
        }

        // Palauta kartta alkuperäiseen tilaan (vain currentLevelIndexin osalta, ei nollaa timantteja jne.)
        // HUOM: Tämä nollaa kartan, mutta ei diamondsCollected tai endCellActivated
        maze = JSON.parse(JSON.stringify(LEVELS[currentLevelIndex].map));

        // Etsi alkuperäinen aloituspiste respawnia varten
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
            maze[startRow][startCol] = CELL_TYPES.EMPTY; // Aseta aloitusruutu tyhjäksi
        } else {
            // Jos aloituspistettä ei löydy (virhetilanne)
            console.error("Respawn-aloituspistettä ei löydy kartasta!");
            playerPosition = { row: 1, col: 1 }; // Fallback
            maze[1][1] = CELL_TYPES.EMPTY;
        }

        // Nollaa kaikki putoavat esineet respawnissa
        fallingObjects = [];
        activeBombs.forEach(bomb => clearTimeout(bomb.timerId));
        activeBombs = [];
        
        createMazeHTML(); // Luo kartta uudelleen
        placePlayer(); // Aseta pelaaja
        // checkEndCellVisibility() kutsutaan createMazeHTML:n lopussa, mikä pitäisi hoitaa oven näkyvyyden
    }

    function checkEndCellVisibility() {
        let endRow = -1;
        let endCol = -1;
        // Etsi maalin sijainti alkuperäisestä kartasta
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

        const endCellEl = document.querySelector(`.cell[data-row="${endRow}"][data-col="${endCol}"]`);
        if (!endCellEl) {
            console.error("Maali-solun HTML-elementtiä ei löytynyt!");
            return;
        }

        if (diamondsCollected >= currentRequiredDiamonds) {
            if (!endCellActivated) { // Aktivoi vain kerran
                endCellActivated = true;
                messageDisplay.textContent = `Maali (kätkö) ilmestyi tasolla ${currentLevelIndex + 1}! Kerätty: ${diamondsCollected}/${currentRequiredDiamonds}`;
            }
            endCellEl.classList.remove('end-hidden', 'dirt'); // Poista piilotus- ja multa-luokat
            endCellEl.classList.add('end'); // Lisää maali-luokka
            endCellEl.innerHTML = '🚪'; // Aseta oveksi
            maze[endRow][endCol] = CELL_TYPES.END; // Varmista, että myös maze-datassa on oikea tyyppi
        } else {
            // Jos timantteja ei ole tarpeeksi, varmista että ovi on piilossa
            if (endCellActivated) { // Vain jos se oli aktivoitu aiemmin (ja nyt ei enää)
                endCellActivated = false;
            }
            endCellEl.classList.add('end-hidden', 'dirt'); // Lisää piilotus- ja multa-luokat
            endCellEl.classList.remove('end'); // Poista maali-luokka
            endCellEl.innerHTML = ''; // Poista oven symboli
            maze[endRow][endCol] = CELL_TYPES.DIRT; // Aseta se takaisin mullaksi (tai END, jos haluat sen silti olevan END-tyyppi, mutta piilotettuna)
            // Tässä päätin pitää sen mullana, kunnes aktivoituu.
            // Jos haluat, että se on aina END-tyyppinen, mutta vain CSS piilottaa, jätä tämä rivi pois.
            // LEVELS.map on se, mikä määrää sen tyypiksi END. maze-muuttuja on muuttuva pelitila.
            // Tärkeintä on CSS-luokat.
        }
    }


    function checkWinCondition() {
        let endRow = -1;
        let endCol = -1;
        // Etsi maalin sijainti alkuperäisestä kartasta
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
            if (endCellActivated) { // Varmista, että ovi on avattu
                currentLevelIndex++;
                if (currentLevelIndex < LEVELS.length) {
                    messageDisplay.textContent = `Taso ${currentLevelIndex} läpäisty! Valmistaudutaan seuraavaan...`;
                    setTimeout(() => {
                        initGame(); // Lataa seuraava taso
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

        // Poista ja lisää kuuntelijat varmistaaksesi, ettei niitä ole useita
        document.removeEventListener('keydown', handleKeyPress);
        gameArea.removeEventListener('touchstart', handleTouchStart);
        gameArea.removeEventListener('touchmove', handleTouchMove);
        gameArea.removeEventListener('touchend', handleTouchEnd);

        document.addEventListener('keydown', handleKeyPress);
        gameArea.addEventListener('touchstart', handleTouchStart);
        gameArea.addEventListener('touchmove', handleTouchMove, { passive: false });
        gameArea.addEventListener('touchend', handleTouchEnd);

        resetButton.style.display = 'block';
        // checkEndCellVisibility() kutsutaan jo createMazeHTML:ssä
    }

    const handleKeyPress = (e) => {
        if (messageDisplay.textContent.startsWith("Peli ohi!") || isDying || isPlayerMoving) return; 
        // Estä syöte, jos peli ohi, pelaaja kuolemassa tai toinen liike jo käynnissä
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
