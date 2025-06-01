import { checkAuth } from './auth.js';

let socket;
let gameId = null;
let currentGuess = '';
const maxAttempts = 6;
let attempts = 0;

const board = document.getElementById("game-board");
const wordDisplay = document.getElementById("word-display");
const guessesContainer = document.getElementById("guesses-container");
const gameStatus = document.getElementById("game-status");
const attemptsDisplay = document.getElementById("attempts");
const waitingScreen = document.getElementById("waiting-screen");
const timer = document.getElementById("timer");

let startTime = null;
let timerInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    initializeWebSocket();
    setupKeyboard();
});

function initializeWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        console.log('Connecté au serveur');
        waitingScreen.classList.remove('hidden');
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleServerMessage(data);
    };

    socket.onclose = () => {
        console.log('Déconnecté du serveur');
        gameStatus.textContent = 'Connexion perdue. Rafraîchissez la page pour rejouer.';
        gameStatus.classList.add('error');
    };
}

function handleServerMessage(data) {
    switch (data.type) {
        case 'game_start':
            startGame(data);
            break;
        case 'guess_result':
            handleGuessResult(data);
            break;
        case 'game_over':
            handleGameOver(data);
            break;
        case 'error':
            showError(data.message);
            break;
    }
}

function startGame(data) {
    gameId = data.game_id;
    waitingScreen.classList.add('hidden');
    initializeBoard(data.word.length);
    startTimer();
    gameStatus.textContent = 'Partie commencée !';
    gameStatus.classList.add('info');
}

function initializeBoard(wordLength) {
    wordDisplay.innerHTML = '';
    guessesContainer.innerHTML = '';
    
    for (let i = 0; i < maxAttempts; i++) {
        const row = document.createElement("div");
        row.className = "word-row";
        for (let j = 0; j < wordLength; j++) {
            const cell = document.createElement("div");
            cell.className = "letter-cell";
            row.appendChild(cell);
        }
        guessesContainer.appendChild(row);
    }
}

function updateCurrentRow() {
    const currentRow = guessesContainer.children[attempts];
    if (!currentRow) return;

    for (let i = 0; i < currentRow.children.length; i++) {
        currentRow.children[i].textContent = i < currentGuess.length ? currentGuess[i] : '';
    }
}

function handleKeyClick(key) {
    if (!gameId || attempts >= maxAttempts) return;

    if (key === '↵' || key === 'ENTER') {
        if (currentGuess.length === guessesContainer.children[0].children.length) {
            submitGuess();
        }
    } else if (key === '←' || key === 'BACKSPACE') {
        currentGuess = currentGuess.slice(0, -1);
        updateCurrentRow();
    } else if (currentGuess.length < guessesContainer.children[0].children.length) {
        currentGuess += key;
        updateCurrentRow();
    }
}

function setupKeyboard() {
    const keys = document.querySelectorAll('.key');
    keys.forEach(key => {
        key.addEventListener('click', () => {
            const keyText = key.classList.contains('enter') ? 'ENTER' :
                          key.classList.contains('backspace') ? 'BACKSPACE' :
                          key.textContent;
            handleKeyClick(keyText);
        });
    });
}

document.addEventListener('keydown', (e) => {
    if (!gameId || attempts >= maxAttempts) return;

    if (e.key === 'Enter') {
        if (currentGuess.length === guessesContainer.children[0].children.length) {
            submitGuess();
        }
    } else if (e.key === 'Backspace') {
        currentGuess = currentGuess.slice(0, -1);
        updateCurrentRow();
    } else if (e.key.match(/^[a-zA-Z]$/) && currentGuess.length < guessesContainer.children[0].children.length) {
        currentGuess += e.key.toUpperCase();
        updateCurrentRow();
    }
});

function submitGuess() {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        showError('Pas de connexion au serveur');
        return;
    }

    socket.send(JSON.stringify({
        type: 'submit_guess',
        game_id: gameId,
        guess: currentGuess
    }));
}

function handleGuessResult(data) {
    const currentRow = guessesContainer.children[attempts];
    
    for (let i = 0; i < data.guess.length; i++) {
        const cell = currentRow.children[i];
        cell.textContent = data.guess[i];
        
        cell.classList.add('letter-box');
        
        if (data.result[i] === 'correct') {
            cell.classList.add('correct');
        } else if (data.result[i] === 'present') {
            cell.classList.add('present');
        } else {
            cell.classList.add('absent');
        }
        
        const keyButton = Array.from(document.querySelectorAll('.key')).find(key => 
            !key.classList.contains('enter') && 
            !key.classList.contains('backspace') && 
            key.textContent === data.guess[i]
        );
        
        if (keyButton) {
            if (data.result[i] === 'correct') {
                keyButton.classList.add('correct');
                keyButton.style.backgroundColor = 'var(--success-color)';
                keyButton.style.color = 'white';
            } else if (data.result[i] === 'present' && !keyButton.classList.contains('correct')) {
                keyButton.classList.add('present');
                keyButton.style.backgroundColor = 'var(--present-color)';
                keyButton.style.color = 'white';
            } else if (!keyButton.classList.contains('correct') && !keyButton.classList.contains('present')) {
                keyButton.classList.add('absent');
                keyButton.style.backgroundColor = 'var(--keyboard-bg)';
                keyButton.style.color = 'white';
            }
        }
    }

    currentGuess = '';
    attempts = data.attempts;
    updateAttempts();
}

function handleGameOver(data) {
    stopTimer();
    if (data.winner === 'you') {
        gameStatus.textContent = 'Félicitations ! Vous avez gagné !';
        gameStatus.classList.add('success');
    } else {
        gameStatus.textContent = `Partie terminée. Le mot était : ${data.word}`;
        gameStatus.classList.add('failure');
    }
    showReplayButton();
}

function showReplayButton() {
    const existingButton = document.getElementById('replay-button');
    if (!existingButton) {
        const replayButton = document.createElement('button');
        replayButton.id = 'replay-button';
        replayButton.className = 'replay-button';
        replayButton.textContent = '🔄 Nouvelle partie';
        replayButton.onclick = resetGame;
        gameStatus.parentNode.insertBefore(replayButton, gameStatus.nextSibling);
    }
}

function resetGame() {
    // Réinitialiser les variables
    attempts = 0;
    currentGuess = '';
    gameId = null;
    
    // Nettoyer le plateau
    wordDisplay.innerHTML = '';
    guessesContainer.innerHTML = '';
    gameStatus.textContent = '';
    gameStatus.className = '';
    
    // Réinitialiser le timer
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    timer.textContent = '00:00';
    
    // Réinitialiser le clavier
    const keys = document.querySelectorAll('.key');
    keys.forEach(key => {
        key.classList.remove('correct', 'present', 'absent');
        key.style.backgroundColor = '';
        key.style.color = '';
    });
    
    // Supprimer le bouton rejouer
    const replayButton = document.getElementById('replay-button');
    if (replayButton) {
        replayButton.remove();
    }
    
    // Réinitialiser la connexion WebSocket et commencer une nouvelle partie
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
    }
    
    // Afficher l'écran d'attente
    waitingScreen.classList.remove('hidden');
    
    // Réinitialiser la connexion et le jeu
    setTimeout(() => {
        initializeWebSocket();
        updateAttempts();
    }, 1000);
}

function showError(message) {
    gameStatus.textContent = message;
    gameStatus.classList.add('error');
}

function startTimer() {
    startTime = Date.now();
    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateTimer() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function updateAttempts() {
    attemptsDisplay.textContent = `Essai ${attempts}/${maxAttempts}`;
} 
