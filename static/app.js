let socket;
let currentGame = null;
let currentWord = '';
let currentGuess = '';
let attempts = 0;

document.addEventListener('DOMContentLoaded', () => {
    connectWebSocket();
    setupKeyboard();
});

function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        console.log('Connecté au serveur');
        document.getElementById('game-status').textContent = 'En attente d\'un adversaire...';
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleServerMessage(data);
    };

    socket.onclose = () => {
        console.log('Déconnecté du serveur');
        document.getElementById('game-status').textContent = 'Connexion perdue. Reconnexion en cours...';
        setTimeout(connectWebSocket, 1000);
    };
}

function setupKeyboard() {
    const keys = document.querySelectorAll('.key');
    keys.forEach(key => {
        key.addEventListener('click', () => {
            if (key.classList.contains('backspace')) {
                handleBackspace();
            } else {
                handleKeyPress(key.textContent);
            }
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace') {
            handleBackspace();
        } else if (e.key === 'Enter') {
            submitGuess();
        } else if (/^[a-zA-Z]$/.test(e.key)) {
            handleKeyPress(e.key.toUpperCase());
        }
    });
}

function handleKeyPress(letter) {
    if (currentGuess.length < currentWord.length && attempts < 6) {
        currentGuess += letter;
        updateCurrentGuess();
    }
}

function handleBackspace() {
    if (currentGuess.length > 0) {
        currentGuess = currentGuess.slice(0, -1);
        updateCurrentGuess();
    }
}

function updateCurrentGuess() {
    const letterBoxes = document.querySelectorAll('.word-row .letter-box');
    letterBoxes.forEach((box, index) => {
        box.textContent = currentGuess[index] || '';
    });
}

function submitGuess() {
    if (currentGuess.length === currentWord.length && currentGame && attempts < 6) {
        // Vérifier si le mot est valide (même longueur que le mot mystère)
        if (currentGuess.length !== currentWord.length) {
            document.getElementById('game-status').textContent = `Le mot doit faire exactement ${currentWord.length} lettres`;
            document.getElementById('game-status').style.color = 'var(--error-color)';
            return;
        }

        socket.send(JSON.stringify({
            type: 'submit_guess',
            game_id: currentGame,
            guess: currentGuess
        }));
    }
}

function handleServerMessage(data) {
    switch (data.type) {
        case 'game_start':
            currentGame = data.game_id;
            currentWord = data.word;
            currentGuess = '';
            attempts = 0;
            document.getElementById('attempts').textContent = `Essai ${attempts}/6`;
            document.getElementById('waiting-screen').classList.add('hidden');
            document.getElementById('game-board').classList.remove('hidden');
            document.getElementById('game-status').textContent = 'Partie commencée !';
            document.getElementById('guesses-container').innerHTML = ''; // Vider les tentatives précédentes
            createEmptyWordBoxes();
            break;
        
        case 'guess_result':
            updateGuessResult(data.guess, data.result);
            updateGameStatus(data);
            currentGuess = '';
            updateCurrentGuess();
            attempts = data.attempts;
            document.getElementById('attempts').textContent = `Essai ${attempts}/6`;
            break;
        
        case 'game_over':
            displayGameOver(data.winner, data.word);
            currentGuess = '';
            updateCurrentGuess();
            break;

        case 'error':
            document.getElementById('game-status').textContent = data.message;
            document.getElementById('game-status').style.color = 'var(--error-color)';
            break;
    }
}

function createEmptyWordBoxes() {
    const wordDisplay = document.getElementById('word-display');
    wordDisplay.innerHTML = ''; // Vider l'affichage actuel
    
    const wordRow = document.createElement('div');
    wordRow.className = 'word-row';
    
    for (let i = 0; i < currentWord.length; i++) {
        const letterBox = document.createElement('div');
        letterBox.className = 'letter-box';
        wordRow.appendChild(letterBox);
    }
    
    wordDisplay.appendChild(wordRow);
}

function updateGuessResult(guess, result) {
    // Créer une nouvelle ligne pour la tentative
    const guessRow = document.createElement('div');
    guessRow.className = 'guess-row';
    
    for (let i = 0; i < guess.length; i++) {
        const letterDiv = document.createElement('div');
        letterDiv.className = 'guess-letter ' + result[i];
        letterDiv.textContent = guess[i];
        guessRow.appendChild(letterDiv);
    }
    
    document.getElementById('guesses-container').appendChild(guessRow);
}

function updateGameStatus(data) {
    const status = document.getElementById('game-status');
    if (data.correct) {
        status.textContent = 'Bravo ! Vous avez trouvé le mot !';
        status.style.color = 'var(--success-color)';
    } else {
        status.textContent = `Essai ${attempts}/6`;
        status.style.color = 'var(--text-color)';
    }
}

function displayGameOver(winner, word) {
    const gameStatus = document.getElementById('game-status');
    if (winner === 'you') {
        gameStatus.textContent = 'Félicitations ! Vous avez gagné !';
        gameStatus.style.color = 'var(--success-color)';
    } else {
        gameStatus.textContent = `Dommage ! Le mot était ${word}`;
        gameStatus.style.color = 'var(--error-color)';
    }
    
    // Désactiver le clavier
    const keys = document.querySelectorAll('.key');
    keys.forEach(key => {
        key.disabled = true;
        key.style.opacity = '0.5';
    });
} 