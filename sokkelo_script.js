document.addEventListener('DOMContentLoaded', () => {
    const gameArea = document.getElementById('game-area');
    const messageDisplay = document.getElementById('game-message');
    const resetButton = document.getElementById('reset-button');
    const livesDisplay = document.createElement('div'); // UUSI: Elämäpalkki
    livesDisplay.classList.add('lives-display');
    resetButton.parentNode.insertBefore(livesDisplay, resetButton); // Lisää lives-display ennen reset-nappia

    const mazeSize = 15;
    let playerPosition = { row: 0, col: 0 };
    let maze = [];
    let initialPlayerPosition = { row: 0, col: 0 }; // Tallenna tason aloituspaikka uudelleensyntymistä varten

    const CELL_TYPES = {
        EMPTY: 0,
        WALL: 1,
        DIRT: 2,
        ROCK: 3,
        DIAMOND: 4,
        START: 5,
        END: 6,
        BOMB: 7 // UUSI SOLUTYYPPI
    };

    let diamondsCollected = 0;
    let endCellActivated = false;

    let lives = 3; // Pelaajan elämät
    const maxLives = 3; // Maksimi elämät

    // TÄMÄ ON NYT TASOJEN LISTA!
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

    let currentLevelIndex = 0; // Aloitetaan ensimmäisestä tasosta (indeksi 0)
    let currentRequiredDiamonds = 0; // Päivitetään tason latauksen yhteydessä

    function loadLevel(levelIndex) {
        if (levelIndex >= LEVELS.length) {
            gameOver("Onneksi olkoon! Olet ratkaissut kaikki tasot ja löytänyt Lahen kadonneet vihjeet!");
            return;
        }

        const level = LEVELS[levelIndex];
        maze = JSON.parse(JSON.stringify(level.map)); // Kloonataan kenttä
        currentRequiredDiamonds = level.requiredDiamonds; // Asetetaan tason vaatimukset

        // Etsi aloituspaikka ja tallenna se initialPlayerPositioniin
        let startFound = false;
        for (let r = 0; r < mazeSize; r++) {
            for (let c = 0; c < mazeSize; c++) {
                if (maze[r][c] === CELL_TYPES.START) {
                    initialPlayerPosition = { row: r, col: c }; // Tallenna aloituspaikka
                    playerPosition = { row: r, col: c }; // Aseta pelaaja aloituspaikkaan
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
            initialPlayerPosition = { row: 1, col: 1 };
            playerPosition = { row: 1, col: 1 };
        }

        diamondsCollected = 0; // Nollataan kerätyt timantit uuden tason alussa
        endCellActivated = false; // Nollataan maalin tila uuden tason alussa
        // Livesiä ei nollata tason vaihtuessa, vaan ne säilyvät.
        // lives = maxLives; // Jos haluat elämät täyteen joka tasolla
        updateLivesDisplay(); // Päivitä elämäpalkki
    }

    function createMazeHTML() {
        gameArea.innerHTML = '';
        gameArea.style.gridTemplateColumns = `repeat(${mazeSize}, 1fr)`;
        maze.forEach((row, rowIndex) => {
            row.forEach((cellType, colIndex) => {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                
                if (cellType === CELL_TYPES.DIAMOND) {
                    cell.classList.add('dirt'); // Timantti piilotetaan mullan alle
                } else if (cellType === CELL_TYPES.END) {
                    cell.classList.add('end-hidden');
                    cell.classList.add('dirt'); // Piilotettu maali näyttää mullalta
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
                        case CELL_TYPES.BOMB: // UUSI
                            cell.classList.add('bomb');
                            cell.innerHTML = '💣';
                            break;
                        case CELL_TYPES.START: // Tässä ei pitäisi enää olla START-solua, koska se muutetaan EMPTYksi
                            // cell.classList.add('start'); // Tätä ei käytetä enää aktiivisesti pelissä HTML:ssä
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

    // UUSI: Päivitä elämäpalkki
    function updateLivesDisplay() {
        livesDisplay.innerHTML = ''; // Tyhjennä vanha palkki
        for (let i = 0; i < lives; i++) {
            livesDisplay.innerHTML += '<span class="heart">❤️</span>';
        }
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

            if (dy === 0 && // Vain horisontaalinen työntö
                rockNewCol >= 0 && rockNewCol < mazeSize &&
                (maze[newRow][rockNewCol] === CELL_TYPES.EMPTY || maze[newRow][rockNewCol] === CELL_TYPES.BOMB)) { // Kivi voi työntyä tyhjään tai pommin päälle

                if (maze[newRow][rockNewCol] === CELL_TYPES.BOMB) {
                    // Jos työnnetään pommin päälle, pommi räjähtää ja pelaaja kuolee
                    messageDisplay.textContent = "💥 Pommi räjähti!";
                    setTimeout(() => messageDisplay.textContent = "", 2000); // Tyhjennä viesti
                    explodeBomb(newRow, rockNewCol); // Räjäytä pommi
                    playerDies(); // Pelaaja kuolee
                    return; // Pysäytä pelaajan liike
                }

                // Työnnä kivi
                maze[newRow][rockNewCol] = CELL_TYPES.ROCK;
                maze[newRow][newCol] = CELL_TYPES.EMPTY;

                const oldRockCellEl = document.querySelector(`.cell[data-row="${newRow}"][data-col="${newCol}"]`);
                const newRockCellEl = document.querySelector(`.cell[data-row="${newRow}"][data-col="${rockNewCol}"]`);

                oldRockCellEl.classList.remove('rock', 'dirt'); // Varmista, että vanha ruutu puhdistuu
                oldRockCellEl.innerHTML = '';
                
                newRockCellEl.classList.add('rock');
                newRockCellEl.innerHTML = '🪨';

                updatePlayerPosition(newRow, newCol); // Päivitä pelaajan sijainti vasta kun kivi siirtynyt
                applyGravityWithDelay(); // Laukaisetaan painovoima
                return;
            } else {
                messageDisplay.textContent = "Et voi työntää kiveä tähän suuntaan!";
                setTimeout(() => messageDisplay.textContent = "", 1500);
                return;
            }
        }

        if (targetCellType === CELL_TYPES.BOMB) { // Jos pelaaja liikkuu pommin päälle
            messageDisplay.textContent = "💥 Astuit pommin päälle! Räjähti!";
            setTimeout(() => messageDisplay.textContent = "", 2000);
            explodeBomb(newRow, newCol); // Räjäytä pommi
            playerDies(); // Pelaaja kuolee
            return; // Pysäytä pelaajan liike
        }


        // Jos ei ole seinä, kivi tai pommi, liiku normaalisti
        if (targetCellType === CELL_TYPES.DIRT || targetCellType === CELL_TYPES.DIAMOND || targetCellType === CELL_TYPES.END || targetCellType === CELL_TYPES.EMPTY) {
            const cellElement = document.querySelector(`.cell[data-row="${newRow}"][data-col="${newCol}"]`);

            if (targetCellType === CELL_TYPES.DIAMOND) {
                diamondsCollected++;
                messageDisplay.textContent = `Kerättyjä timantteja: ${diamondsCollected}/${currentRequiredDiamonds}`;
                cellElement.innerHTML = '💎';
                cellElement.classList.add('diamond');
                
                setTimeout(() => {
                    cellElement.classList.remove('diamond');
                    cellElement.innerHTML = '';
                    cellElement.classList.remove('dirt'); // Varmista, että multa poistuu timantin alta
                }, 200);
                checkEndCellVisibility();
            }
            
            if (targetCellType === CELL_TYPES.END) {
                cellElement.classList.remove('end-hidden', 'dirt');
            } else {
                cellElement.classList.remove('dirt'); // Poista multa jos ei ole timantti tai maali
            }

            maze[newRow][newCol] = CELL_TYPES.EMPTY; // Ruudusta tulee tyhjä
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

                    // Kivi putoaa tai Timantti putoaa
                    if ((currentCellType === CELL_TYPES.ROCK || currentCellType === CELL_TYPES.DIAMOND || currentCellType === CELL_TYPES.BOMB) && // UUSI: Pommit putoavat
                        (cellBelowType === CELL_TYPES.EMPTY)) {

                        // Jos pelaaja on putoavan objektin alapuolella, pelaaja kuolee
                        if (playerPosition.row === r + 1 && playerPosition.col === c && currentCellType === CELL_TYPES.ROCK) {
                            messageDisplay.textContent = "Kivi putosi päällesi! 😵";
                            setTimeout(() => messageDisplay.textContent = "", 2000);
                            playerDies();
                            return; // Pysäytä painovoima, peli jatkuu vasta respawnin jälkeen
                        }

                        // Jos putoaa pommin päälle, pommi räjähtää ja pelaaja kuolee
                        if (playerPosition.row === r + 1 && playerPosition.col === c && currentCellType === CELL_TYPES.BOMB) {
                            messageDisplay.textContent = "💥 Pommi putosi päällesi! Räjähti!";
                            setTimeout(() => messageDisplay.textContent = "", 2000);
                            explodeBomb(r + 1, c); // Räjäytä pommi
                            playerDies(); // Pelaaja kuolee
                            return;
                        }
                        
                        // Jos kivi/timantti/pommi putoaa pommin päälle, pommi räjähtää
                        if (cellBelowType === CELL_TYPES.BOMB && (currentCellType === CELL_TYPES.ROCK || currentCellType === CELL_TYPES.DIAMOND || currentCellType === CELL_TYPES.BOMB)) {
                             // Jos putoava esine on myös pommi, ensin se putoaa ja sitten triggeröi alla olevan pommin
                             // Mutta yksinkertaisuuden vuoksi, käsitellään se suoraan räjähdyksenä
                             messageDisplay.textContent = "💥 Pommi räjähti toisen objektin tippuessa päälle!";
                             setTimeout(() => messageDisplay.textContent = "", 2000);
                             explodeBomb(r + 1, c); // Räjäytä alempi pommi
                             maze[r][c] = CELL_TYPES.EMPTY; // Putoava esine katoaa räjähdyksessä
                             somethingMoved = true; // Merkitse liike, vaikka solu tuhoutuikin
                             continue; // Siirry seuraavaan soluun for-loopissa
                        }

                        maze[r + 1][c] = currentCellType;
                        maze[r][c] = CELL_TYPES.EMPTY;
                        somethingMoved = true;

                        const oldCellEl = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
                        const newCellEl = document.querySelector(`.cell[data-row="${r + 1}"][data-col="${c}"]`);

                        oldCellEl.classList.remove('rock', 'diamond', 'bomb', 'dirt'); // Poista kaikki tyypit
                        oldCellEl.innerHTML = '';

                        if (currentCellType === CELL_TYPES.ROCK) {
                            newCellEl.classList.add('rock');
                            newCellEl.innerHTML = '🪨';
                        } else if (currentCellType === CELL_TYPES.DIAMOND) {
                            newCellEl.classList.add('dirt'); // Timantit piilotetaan mullan alle edelleen
                            newCellEl.innerHTML = ''; // Ei näkyvää timanttia ennenkuin kerätään tai paljastuu
                        } else if (currentCellType === CELL_TYPES.BOMB) { // UUSI
                            newCellEl.classList.add('bomb');
                            newCellEl.innerHTML = '💣';
                        }
                    }
                }
            }
        } while (somethingMoved);
    }

    // UUSI: Pommin räjäytysfunktio
    function explodeBomb(bombRow, bombCol) {
        const explosionRadius = 1; // Räjähdyksen säde (1 tarkoittaa 3x3 alueen)
        const cellsToExplode = [];

        // Kerää räjähdysalueen solut
        for (let r = bombRow - explosionRadius; r <= bombRow + explosionRadius; r++) {
            for (let c = bombCol - explosionRadius; c <= bombCol + explosionRadius; c++) {
                // Tarkista, että solu on kentän sisällä
                if (r >= 0 && r < mazeSize && c >= 0 && c < mazeSize) {
                    cellsToExplode.push({ row: r, col: c });
                }
            }
        }

        // Käy läpi kaikki räjähdysalueen solut
        cellsToExplode.forEach(pos => {
            const cellType = maze[pos.row][pos.col];
            const cellElement = document.querySelector(`.cell[data-row="${pos.row}"][data-col="${pos.col}"]`);

            // Jos solu on timantti ja se on mullan alla (eli sen tyyppi on DIAMOND)
            if (cellType === CELL_TYPES.DIAMOND) {
                // Timantti tulee näkyviin ja jää paikalleen (ei tuhoudu)
                cellElement.classList.remove('dirt'); // Poista multa-luokka
                cellElement.innerHTML = '💎'; // Tee timantista näkyvä
                // Jätä maze[pos.row][pos.col] = CELL_TYPES.DIAMOND, mutta se nyt näkyy.
            } else if (cellType !== CELL_TYPES.EMPTY && !(pos.row === playerPosition.row && pos.col === playerPosition.col)) {
                // Kaikki muu paitsi tyhjä solu tuhoutuu (seinät, mullat, kivet, pommit),
                // mutta ei pelaajan nykyinen sijainti
                maze[pos.row][pos.col] = CELL_TYPES.EMPTY;
                cellElement.classList.remove('wall', 'dirt', 'rock', 'bomb');
                cellElement.innerHTML = '';
            } else if (pos.row === playerPosition.row && pos.col === playerPosition.col) {
                // Jos pelaaja on räjähdyksen alueella, hän kuolee
                // Tämä ehto on täällä varmistamassa, että vaikka pelaaja olisi pommin kohdalla,
                // hänen soluunsa ei kosketa ennen kuoleman käsittelyä.
                // Itse kuolema hoidetaan jo movePlayer() tai applyGravity() funktiossa.
            }
        });
        applyGravityWithDelay(); // Laukaisetaan painovoima räjähdyksen jälkeen
    }

    // UUSI: Pelaaja kuolee
    function playerDies() {
        lives--;
        updateLivesDisplay();
        messageDisplay.textContent = `Voi ei! Menetit elämän. Elämiä jäljellä: ${lives}`;

        if (lives <= 0) {
            gameOver("Kaikki elämät menneet! Yritä uudelleen.");
            currentLevelIndex = 0; // Palauta taso alkuperäiseksi, jos haluat että peli alkaa kokonaan alusta
            lives = maxLives; // Nollaa elämät uutta peliä varten
        } else {
            // Pelaaja uudelleensyntyy tason aloituspisteeseen tai lähimpään vapaaseen paikkaan
            setTimeout(() => {
                respawnPlayer();
                messageDisplay.textContent = `Taso ${currentLevelIndex + 1}. Kerää ${diamondsCollected}/${currentRequiredDiamonds} timanttia ja etsi kätkö!`;
            }, 1500); // Lyhyt viive viestin lukemiseen
        }
    }

    // UUSI: Pelaajan uudelleensyntyminen
    function respawnPlayer() {
        // Ennen respawnia, poista pelaaja vanhasta paikasta
        const oldPlayerEl = document.querySelector(`.cell[data-row="${playerPosition.row}"][data-col="${playerPosition.col}"] .player`);
        if (oldPlayerEl) {
            oldPlayerEl.remove();
        }

        // Jos aloituspaikka on vapaa, synny sinne
        if (maze[initialPlayerPosition.row][initialPlayerPosition.col] === CELL_TYPES.EMPTY) {
            playerPosition = { ...initialPlayerPosition };
        } else {
            // Etsi lähin vapaa paikka (tai aloituspaikan viereinen vapaa paikka)
            let foundRespawn = false;
            const checkRadius = 2; // Tarkista läheltä
            for (let rOffset = -checkRadius; rOffset <= checkRadius; rOffset++) {
                for (let cOffset = -checkRadius; cOffset <= checkRadius; cOffset++) {
                    const checkRow = initialPlayerPosition.row + rOffset;
                    const checkCol = initialPlayerPosition.col + cOffset;
                    if (checkRow >= 0 && checkRow < mazeSize && checkCol >= 0 && checkCol < mazeSize &&
                        maze[checkRow][checkCol] === CELL_TYPES.EMPTY) {
                        playerPosition = { row: checkRow, col: checkCol };
                        foundRespawn = true;
                        break;
                    }
                }
                if (foundRespawn) break;
            }
            if (!foundRespawn) {
                console.warn("Ei vapaata respawn-paikkaa löytynyt aloituspisteen läheltä!");
                // Viimeinen keino: Yritä löytää jokin vapaa paikka koko kentästä
                for (let r = 0; r < mazeSize; r++) {
                    for (let c = 0; c < mazeSize; c++) {
                        if (maze[r][c] === CELL_TYPES.EMPTY) {
                            playerPosition = { row: r, col: c };
                            foundRespawn = true;
                            break;
                        }
                    }
                    if (foundRespawn) break;
                }
            }
        }
        
        // Luo kartta ja aseta pelaaja uudelleensyntyneeseen paikkaan
        createMazeHTML(); // Luo kartta uudelleen, jotta muutokset näkyvät
        placePlayer(); // Aseta pelaaja uuteen paikkaan
        applyGravityWithDelay(); // Varmista, että painovoima lasketaan uudelleen
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
        // Voit halutessasi näyttää reset-napin vasta tässä
        resetButton.style.display = 'block'; // Varmista, että reset-nappi näkyy
    }

    function initGame() {
        loadLevel(currentLevelIndex);
        createMazeHTML();
        messageDisplay.textContent = `Taso ${currentLevelIndex + 1}. Kerää ${currentRequiredDiamonds} timanttia ja etsi kätkö!`;
        updateLivesDisplay(); // Päivitä elämät aina pelin alussa

        document.removeEventListener('keydown', handleKeyPress);
        gameArea.removeEventListener('touchstart', handleTouchStart);
        gameArea.removeEventListener('touchmove', handleTouchMove);
        gameArea.removeEventListener('touchend', handleTouchEnd);

        document.addEventListener('keydown', handleKeyPress);
        gameArea.addEventListener('touchstart', handleTouchStart);
        gameArea.addEventListener('touchmove', handleTouchMove, { passive: false });
        gameArea.addEventListener('touchend', handleTouchEnd);

        resetButton.style.display = 'block'; // Varmista, että reset-nappi on alusta asti näkyvissä
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
        currentLevelIndex = 0; // Aloita ensimmäisestä tasosta
        lives = maxLives; // Nollaa elämät
        initGame();
    });

    initGame(); // Käynnistä peli
});
