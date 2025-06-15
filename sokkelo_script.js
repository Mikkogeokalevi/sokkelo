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
    let isDying = false; // Estää useita playerDies() kutsuja
    let gravityTimeoutId = null; // Hallitsee painovoiman päivitystä
    let isMoving = false; // Estää pelaajan liikkumisen useaan kertaan ennen painovoiman vaikutusta

    const LEVELS = [
        // LEVEL 1 (Uusi ja korjattu)
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
                [1, 2, 2, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1], // Korjattu rivi, oli 2,2,1,1..
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

        // Tyhjennä aktiiviset pommit aina uuden tason alussa
        activeBombs.forEach(bomb => clearTimeout(bomb.timerId));
        activeBombs = [];
        if (gravityTimeoutId) { // Tyhjennä mahdollinen aiempi painovoima-ajastin
            clearTimeout(gravityTimeoutId);
            gravityTimeoutId = null;
        }
        isMoving = false; // Resetoi isMoving uuden tason alussa
        isDying = false; // Resetoi isDying uuden tason alussa

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
        gameArea.innerHTML = ''; // TYHJENNETÄÄN KOKO PELIALUE
        gameArea.style.gridTemplateColumns = `repeat(${mazeSize}, 1fr)`;
        maze.forEach((row, rowIndex) => {
            row.forEach((cellType, colIndex) => {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = rowIndex;
                cell.dataset.col = colIndex;

                // Määritä luokat solutyypin perusteella
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
                        cell.classList.add('dirt'); // Timantti on aluksi piilossa mullan alla
                        // Timantin symboli näytetään vasta kun se kerätään (tai piilossa)
                        // EI SAA näkyä tässä, muuten ne näkyvät aina
                        break;
                    case CELL_TYPES.BOMB:
                        cell.classList.add('bomb');
                        cell.innerHTML = '💣';
                        break;
                    case CELL_TYPES.END:
                        cell.classList.add('dirt'); // Maali on aluksi piilossa mullan alla
                        cell.classList.add('end-hidden'); // Piilotetaan maali kunnes timantit kerätty
                        break;
                    case CELL_TYPES.EMPTY:
                        // Ei lisäluokkaa, jää tyhjäksi
                        break;
                }
                gameArea.appendChild(cell);
            });
        });
        placePlayer();
        // Varmista, että ovi päivittyy heti ensimmäisessä renderöinnissä
        checkEndCellVisibility();
    }

    function placePlayer() {
        // Poista vanha pelaajaelementti, jos sellainen on olemassa missään ruudussa
        const existingPlayer = document.querySelector('.player');
        if (existingPlayer) {
            existingPlayer.remove();
        }

        const player = document.createElement('div');
        player.classList.add('player');
        const currentCell = document.querySelector(`.cell[data-row="${playerPosition.row}"][data-col="${playerPosition.col}"]`);
        if (currentCell) { // Varmista, että solu on olemassa
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
            setTimeout(() => { messageDisplay.textContent = ""; isMoving = false; }, 500);
            return;
        }

        const targetCellType = maze[newRow][newCol];

        if (targetCellType === CELL_TYPES.WALL) {
            messageDisplay.textContent = "Et voi kaivaa tämän seinän läpi!";
            setTimeout(() => { messageDisplay.textContent = ""; isMoving = false; }, 500);
            return;
        }

        if (targetCellType === CELL_TYPES.ROCK) {
            const rockPushDirection = dx !== 0 ? dx : 0; // Jos liikutaan vaakasuoraan, kivi liikkuu samaan suuntaan
            const rockNewCol = newCol + rockPushDirection;

            // Kiven työntäminen: vain jos työnnetään tyhjään tai pommin päälle
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
                applyGravityControlled(); // Soita painovoima kiven työnnön jälkeen
                isMoving = false;
                return;
            } else {
                messageDisplay.textContent = "Et voi työntää kiveä tähän suuntaan!";
                setTimeout(() => { messageDisplay.textContent = ""; isMoving = false; }, 500);
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
                isMoving = false;
            }, 1000); // Lyhennetty viestin kestoa
            return; // Estä pelaajan liike pommin päälle
        }

        // --- UUSI LOGIIKKA kivien/pommien alle menemiseen ---
        // Jos pelaaja liikkuu alas (dy > 0)
        // Ja uuden sijainnin yläpuolella (pelaajan vanhan sijainnin yläpuolella) on pudotettava esine
        if (dy > 0) {
            const potentialFallingObjectRow = playerPosition.row - 1; // Ruutu pelaajan yläpuolella ENNEN LIIKETTÄ
            const potentialFallingObjectCol = playerPosition.col;

            if (potentialFallingObjectRow >= 0) {
                const objectAbove = maze[potentialFallingObjectRow][potentialFallingObjectCol];
                if (objectAbove === CELL_TYPES.ROCK || objectAbove === CELL_TYPES.BOMB) {
                    // Tämä on tilanne, jossa pelaaja kaivaa juuri kiven/pommin alta.
                    // Siirrämme kiven/pommin pelaajan vanhaan sijaintiin väliaikaisesti.
                    maze[playerPosition.row][playerPosition.col] = objectAbove; // Aseta kivi/pommi pelaajan entiseen ruutuun
                    maze[potentialFallingObjectRow][potentialFallingObjectCol] = CELL_TYPES.EMPTY; // Tyhjennä vanha paikka

                    // Päivitä visuaalinen esitys juuri näiden ruutujen osalta, jotta kivi/pommi näkyy siirtyvän "alas".
                    const oldObjCellEl = document.querySelector(`.cell[data-row="${potentialFallingObjectRow}"][data-col="${potentialFallingObjectCol}"]`);
                    const newObjCellEl = document.querySelector(`.cell[data-row="${playerPosition.row}"][data-col="${playerPosition.col}"]`);
                    
                    if (oldObjCellEl) {
                        oldObjCellEl.classList.remove('rock', 'bomb', 'active'); // Poista vanhat luokat
                        oldObjCellEl.innerHTML = '';
                    }
                    if (newObjCellEl) {
                        if (objectAbove === CELL_TYPES.ROCK) {
                            newObjCellEl.classList.add('rock');
                            newObjCellEl.innerHTML = '🪨';
                        } else if (objectAbove === CELL_TYPES.BOMB) {
                            newObjCellEl.classList.add('bomb');
                            newObjCellEl.innerHTML = '💣';
                        }
                    }
                }
            }
        }
        // --- LOPPU UUSI LOGIIKKA kivien/pommien alle menemiseen ---


        // Jos ei ole seinä, kiven työntöä tai pommia (tai pommi on jo käsitelty), kaiva ja liiku
        // Tämä osa käsittelee varsinaisen maalin/timantin/mullan kaivamisen
        if (targetCellType === CELL_TYPES.DIRT || targetCellType === CELL_TYPES.DIAMOND || targetCellType === CELL_TYPES.END || targetCellType === CELL_TYPES.EMPTY) {
            const cellElement = document.querySelector(`.cell[data-row="${newRow}"][data-col="${newCol}"]`);

            if (targetCellType === CELL_TYPES.DIAMOND) {
                diamondsCollected++;
                messageDisplay.textContent = `Kerättyjä timantteja: ${diamondsCollected}/${currentRequiredDiamonds}`;
                
                // Päivitä timanttiruuudun ulkonäkö välittömästi keräyksen jälkeen
                if (cellElement) {
                    cellElement.classList.remove('dirt');
                    cellElement.innerHTML = '💎'; // Näytä timanttihetkellisesti
                    setTimeout(() => {
                        if (cellElement) { // Varmista, että elementti on vielä olemassa
                           cellElement.innerHTML = ''; // Poista timantin symboli
                           // Älä poista 'diamond' luokkaa tästä, maze muutos hoitaa sen
                        }
                    }, 200); // Lyhyt viive visuaaliseen efektiin
                }
                checkEndCellVisibility(); // Tarkista oven näkyvyys heti timantin kerättyä
            }

            // Maali näkyväksi, jos kaikki timantit kerätty - tämän hoitaa checkEndCellVisibility jo
            if (targetCellType === CELL_TYPES.END) {
                // Tässä varmistetaan, että maaliruuudusta poistetaan piilotusluokat, jos pelaaja astuu siihen
                if (cellElement) {
                    cellElement.classList.remove('end-hidden', 'dirt');
                    cellElement.classList.add('end'); // Varmista, että end-luokka on päällä
                    cellElement.innerHTML = '🚪'; // Varmista, että ovi näkyy
                }
            } else if (cellElement && cellElement.classList.contains('dirt')) {
                cellElement.classList.remove('dirt'); // Kaiva multa pois
            }

            maze[newRow][newCol] = CELL_TYPES.EMPTY; // Kaivettu ruutu muuttuu tyhjäksi
        }

        updatePlayerPosition(newRow, newCol);
        applyGravityControlled(); // Käynnistä painovoima pelaajan liikkeen jälkeen
        isMoving = false; // Nollaa isMoving, kun liike on käsitelty
        checkWinCondition(); // Tarkista voittokunto, jos pelaaja astui maaliin
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
            if (!newPlayerElement) { // Jos pelaajaelementti puuttuu jostain syystä, luo se uudelleen
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

    // Hallitsee painovoiman päivitysten ketjuttamista
    function applyGravityControlled() {
        if (gravityTimeoutId) {
            clearTimeout(gravityTimeoutId);
        }
        // Varmista, että painovoimaa sovelletaan vasta hetken päästä pelaajan liikkeen jälkeen.
        // Tämä antaa pienen "viiveen" reagoimiseen.
        gravityTimeoutId = setTimeout(() => {
            applyGravity();
            gravityTimeoutId = null; // Nollaa ajastin, kun se on suoritettu
        }, 150); // 150ms viive
    }

    function applyGravity() {
        if (isDying) return; // Älä soveltaa painovoimaa, jos pelaaja on kuolemassa/kuollut

        let somethingMoved = false;
        let newMazeState = JSON.parse(JSON.stringify(maze)); // Kopioi kartan tila

        // KÄSITELLÄÄN EHDOTETTU PUTOAMINEN ENNEN KUIN ESINEET FAKTASTISESTI PUTOAVAT
        // TÄMÄ ON TÄRKEÄÄ!
        const playerCellBelow = playerPosition.row + 1;
        // Tarkista, onko pelaajan uuden sijainnin YLÄpuolella kivi tai pommi, joka putoaisi juuri siihen.
        if (playerCellBelow < mazeSize) {
            const objectAbovePlayer = maze[playerPosition.row - 1]?.[playerPosition.col]; // Tarkista, ettei indeksi mene alle nollan
            if (objectAbovePlayer === CELL_TYPES.ROCK || objectAbovePlayer === CELL_TYPES.BOMB) {
                // Tarkoittaa, että pelaaja on juuri kaivannut altaan ja kivi/pommi on valmiina putoamaan hänen vanhaan ruutuunsa.
                // Mutta nyt, jos pelaaja on siirtynyt uuteen ruutuun, ja tämä esine putoaisi *uuteen ruutuun*,
                // se tappaa heti.
                // TÄMÄ ON SE HETKI, KUN TARKISTETAAN VÄLITÖNTÄ KUOLEMAA!
                // Jos pelaaja SIIRTYI RUUTUUN, JOHON JOKIN PUTOAA, niin pelaaja kuolee.
                // Tämä tarkistus on nyt täysin riippumaton `movePlayer()` -funktiosta.
                // Se varmistaa, että jos jotain putoaa pelaajan NYKYISEEN sijaintiin heti, hän kuolee.
                
                // Jos kivi tai pommi on pelaajan välittömästi yläpuolella ja putoaa suoraan hänen päälleen
                // (eli pelaaja siirtyi alta pois, ja kivi putosi hänen VANHAAN ruutuunsa, ja seuraavassa
                // painovoima-askeleessa se putoaa hänen NYKYISEEN ruutuunsa)
                
                // Uudelleenarvioidaan: Pelaaja kaivaa mullan alta. Kivi on hänen yläpuolellaan.
                // Pelaaja liikkuu, multa poistuu. Kivi on nyt pelaajan vanhan ruudun yläpuolella.
                // Painovoima laskee kiven alas. Jos se laskeutuu pelaajan nykyiseen ruutuun, hän kuolee.
                // Tämä tapahtuu, koska `movePlayer` kaivoi mullan ja `applyGravity` nyt pudottaa.

                // Oletamme, että `movePlayer` jo siirsi pelaajan ja mahdollisesti kiven/pommin vanhaan ruutuun.
                // Nyt `applyGravity` tarkistaa, jos painovoima pudottaa MITÄÄN pelaajan NYKYISEEN ruutuun.
                
                // Käydään läpi kaikki putoamiset ensin!
                // Sitten vasta tarkistetaan pelaajan osuma.

                // Ensimmäinen vaihe: Siirrä putoavat esineet ilman osumatarkistusta.
                for (let r = mazeSize - 2; r >= 0; r--) {
                    for (let c = 0; c < mazeSize; c++) {
                        const currentCellType = maze[r][c]; // Käytä nykyistä mazea laskennassa
                        const cellBelowType = maze[r + 1][c]; // Käytä nykyistä mazea laskennassa

                        // Kivi tai Timantti putoaa, JOS ALLA ON TYHJÄÄ (tai timantti)
                        // Kivet voivat pudota tyhjään
                        // Timantit voivat pudota tyhjään
                        // Pommit voivat pudota tyhjään
                        if ((currentCellType === CELL_TYPES.ROCK || currentCellType === CELL_TYPES.DIAMOND || currentCellType === CELL_TYPES.BOMB) &&
                            (cellBelowType === CELL_TYPES.EMPTY)) {
                            
                            newMazeState[r + 1][c] = currentCellType;
                            newMazeState[r][c] = CELL_TYPES.EMPTY;
                            somethingMoved = true;
                        }
                        // Jos pommi putoaa toisen pommin päälle, aktivoi se
                        else if (currentCellType === CELL_TYPES.BOMB && cellBelowType === CELL_TYPES.BOMB) {
                             if (!activeBombs.some(bomb => bomb.row === r + 1 && bomb.col === c)) {
                                activateBomb(r + 1, c);
                            }
                        }
                    }
                }

                // Päivitä varsinainen pelikartta uusien sijaintien mukaan
                maze = newMazeState;
                createMazeHTML(); // Päivitä visuaalinen esitys muutosten jälkeen
                placePlayer(); // Aseta pelaaja takaisin oikeaan paikkaan

                // TOINEN VAIHE: Tarkista pelaajan osuma vasta kun kaikki putoamiset ovat tapahtuneet ja kartta on päivitetty.
                if (maze[playerPosition.row][playerPosition.col] === CELL_TYPES.ROCK) {
                    messageDisplay.textContent = "Kivi putosi päällesi! 😵";
                    playerDies();
                    return; // Pysäytä kaikki toiminnot
                } else if (maze[playerPosition.row][playerPosition.col] === CELL_TYPES.BOMB) {
                    // Pommi putosi pelaajan päälle, se räjähtää ja tappaa välittömästi
                    messageDisplay.textContent = "💥 Pommi putosi päällesi! Räjähti!";
                    explodeBomb(playerPosition.row, playerPosition.col); // Räjäytä pommi, joka on nyt pelaajan ruudussa
                    playerDies();
                    return; // Pysäytä kaikki toiminnot
                }
            }
        }
        // Jos mitään ei pudonnut tai pelaaja ei ollut alla, tai putoaminen oli jo käsitelty
        // ja siirryttiin seuraaviin putoamisiin.
        
        // Tämä osa käsittelee kaskadoituvat putoamiset
        if (somethingMoved) {
            applyGravityControlled(); // Kutsu painovoimaa uudelleen, jos jotain liikkui
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
        // Anna viestin näkyä hetken, mutta älä estä peliä
        setTimeout(() => {
            if (!messageDisplay.textContent.includes("Peli ohi!")) {
                 messageDisplay.textContent = "";
            }
        }, 1500);
    }


    function explodeBomb(bombRow, bombCol) {
        if (isDying) return; // Estä räjähdysten käsittely, jos pelaaja on jo kuolemassa

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

        // Käsittele ensin kaikki pommit räjähdysalueella - ne räjäyttävät toisensa
        // Käydään kopio läpi, jotta array muuttuu oikein
        const bombsToClear = [];
        activeBombs.forEach(bomb => {
            if (cellsToExplode.some(pos => pos.row === bomb.row && pos.col === bomb.col)) {
                clearTimeout(bomb.timerId);
                bombsToClear.push(bomb);
                const bombEl = document.querySelector(`.cell[data-row="${bomb.row}"][data-col="${bomb.col}"]`);
                if(bombEl) bombEl.classList.remove('active');
            }
        });
        activeBombs = activeBombs.filter(bomb => !bombsToClear.includes(bomb));


        // Nyt tuhotaan ruudut ja tarkistetaan pelaajaosuma
        cellsToExplode.forEach(pos => {
            const cellType = maze[pos.row][pos.col];
            const cellElement = document.querySelector(`.cell[data-row="${pos.row}"][data-col="${pos.col}"]`);

            // Tarkista, onko pelaaja räjähdysalueella
            if (pos.row === playerPosition.row && pos.col === playerPosition.col) {
                playerHit = true;
            } 
            
            // Tuhottavat tyypit: DIRT, ROCK, BOMB (jotka eivät olleet vielä käsitelty), DIAMOND (paitsi jos timantit eivät tuhoudu)
            // WALL ja END eivät tuhoudu räjähdyksessä
            if (cellType === CELL_TYPES.DIRT || cellType === CELL_TYPES.ROCK || cellType === CELL_TYPES.BOMB) {
                maze[pos.row][pos.col] = CELL_TYPES.EMPTY;
                if (cellElement) {
                    cellElement.classList.remove('dirt', 'rock', 'bomb', 'active');
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

        // Jos pelaaja on räjähdysalueella, hän kuolee
        if (playerHit) {
            messageDisplay.textContent = "💥 Jäit räjähdykseen! 😵";
            playerDies();
        }
        applyGravityControlled(); // Sopeuta painovoimaa räjähdyksen jälkeen
    }

    function playerDies() {
        if (isDying) return; // Estä useita kuolemia samanaikaisesti
        isDying = true;

        lives--;
        updateLivesDisplay();
        messageDisplay.textContent = `Voi ei! Menetit elämän. Elämiä jäljellä: ${lives}`;

        // Tyhjennä kaikki ajastimet ja aktiiviset pommit kuoleman yhteydessä
        activeBombs.forEach(bomb => clearTimeout(bomb.timerId));
        activeBombs = [];
        if (gravityTimeoutId) {
            clearTimeout(gravityTimeoutId);
            gravityTimeoutId = null;
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
            }, 1500);
        }
    }

    function respawnPlayer() {
        const oldPlayerEl = document.querySelector('.player');
        if (oldPlayerEl) {
            oldPlayerEl.remove();
        }

        let respawnCandidate = { ...initialPlayerPosition };
        // Tarkista, onko aloituspaikka tyhjä, muuten etsi lähin tyhjä paikka
        if (maze[initialPlayerPosition.row][initialPlayerPosition.col] !== CELL_TYPES.EMPTY) {
            let found = false;
            // Etsi 3x3 alueelta (mukaan lukien keskeltä)
            const directions = [[0,0], [0,1], [0,-1], [1,0], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]]; 
            // Kokeile laajempia alueita jos ei löydy
            const maxSearchRadius = Math.max(mazeSize, mazeSize);

            for (let radius = 0; radius <= maxSearchRadius && !found; radius++) {
                for (let rOffset = -radius; rOffset <= radius && !found; rOffset++) {
                    for (let cOffset = -radius; cOffset <= radius && !found; cOffset++) {
                        const checkRow = initialPlayerPosition.row + rOffset;
                        const checkCol = initialPlayerPosition.col + cOffset;

                        if (checkRow >= 0 && checkRow < mazeSize && checkCol >= 0 && checkCol < mazeSize &&
                            maze[checkRow][checkCol] === CELL_TYPES.EMPTY) {
                            respawnCandidate = { row: checkRow, col: checkCol };
                            found = true;
                        }
                    }
                }
            }
            if (!found) { // Jos ei vieläkään löydy, jotain on vialla
                console.error("Virhe: Respawn-paikkaa ei löytynyt mistään!");
                // Fallback: Aseta pelaaja ensimmäiseen tyhjään paikkaan, jos mitään ei löydy lähiympäristöstä
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

        // Renderöi koko labyrintti uudelleen ja aseta pelaaja
        createMazeHTML();
        placePlayer();
        applyGravityControlled(); // Anna painovoiman vaikuttaa heti respawnin jälkeen
    }

    function checkEndCellVisibility() {
        // HUOM: LEVELS[currentLevelIndex].map - tämä on alkuperäinen kartta, EI nykyinen maze.
        // Meidän pitää löytää maalin sijainti alkuperäisestä kartasta.
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

        // Tarkista vasta, kun timantit on kerätty ja maaliruuudun sijainti on tiedossa
        if (diamondsCollected >= currentRequiredDiamonds && endRow !== -1 && endCol !== -1) {
            if (!endCellActivated) { // Aktivoi vain kerran
                endCellActivated = true;
                const endCellEl = document.querySelector(`.cell[data-row="${endRow}"][data-col="${endCol}"]`);
                if (endCellEl) {
                    endCellEl.classList.remove('end-hidden', 'dirt'); // Poista "piilotettu" ja "multa"
                    endCellEl.classList.add('end'); // Lisää "maali" luokka
                    endCellEl.innerHTML = '🚪'; // Aseta oveksi
                    messageDisplay.textContent = `Maali (kätkö) ilmestyi tasolla ${currentLevelIndex + 1}! Kerätty: ${diamondsCollected}/${currentRequiredDiamonds}`;
                }
            }
        } else if (endCellActivated && diamondsCollected < currentRequiredDiamonds) {
            // Jos timantteja menetetään (esim. räjähdyksessä), ovi voi mennä takaisin piiloon
            endCellActivated = false;
            if (endRow !== -1 && endCol !== -1) {
                 const endCellEl = document.querySelector(`.cell[data-row="${endRow}"][data-col="${endCol}"]`);
                 if (endCellEl) {
                    endCellEl.classList.add('end-hidden', 'dirt');
                    endCellEl.classList.remove('end');
                    endCellEl.innerHTML = '';
                 }
            }
        }
    }

    function checkWinCondition() {
        let endRow = -1;
        let endCol = -1;
        // Etsi maalin sijainti alkuperäisestä kartasta (ei välttämättä maze-muuttujasta, jos se on tuhoutunut)
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
            if (endCellActivated) { // Varmista, että ovi on avattu (kaikki timantit kerätty)
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
        resetButton.style.display = 'block';
    }

    function initGame() {
        loadLevel(currentLevelIndex);
        createMazeHTML();
        messageDisplay.textContent = `Taso ${currentLevelIndex + 1}. Kerää ${currentRequiredDiamonds}/${currentRequiredDiamonds} timanttia ja etsi kätkö!`;
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
        checkEndCellVisibility(); // Tarkista oven näkyvyys heti pelin alussa
    }

    const handleKeyPress = (e) => {
        if (messageDisplay.textContent.startsWith("Peli ohi!") || isDying) return; // Estä syöte kuollessa
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
        if (messageDisplay.textContent.startsWith("Peli ohi!") || isDying) return; // Estä syöte kuollessa

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
