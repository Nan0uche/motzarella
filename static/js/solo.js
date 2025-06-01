import { getRandomWord, preloadWords, isValidWord } from './words.js';

let mysteryWord;
const maxAttempts = 6;
let attempts = 0;
let currentGuess = '';

const board = document.getElementById("game-board");
const message = document.getElementById("message");
const keyboard = document.getElementById("keyboard");
const attemptsDisplay = document.getElementById("attempts");

// Sélection d'un mot aléatoire
async function selectRandomWord() {
    return await getRandomWord();
}

// Initialisation du plateau de jeu
function initializeBoard() {
    board.innerHTML = ''; // S'assurer que le plateau est vide
    for (let i = 0; i < maxAttempts; i++) {
        const row = document.createElement("div");
        row.className = "word-row";
        for (let j = 0; j < 6; j++) { // Tous les mots font 6 lettres
            const cell = document.createElement("div");
            cell.className = "letter-cell";
            row.appendChild(cell);
        }
        board.appendChild(row);
    }
}

// Mise à jour de l'affichage du mot en cours
function updateCurrentRow() {
    const currentRow = board.children[attempts];
    if (!currentRow) return;
    
    for (let i = 0; i < mysteryWord.length; i++) {
        currentRow.children[i].textContent = i < currentGuess.length ? currentGuess[i] : '';
    }
}

// Gestion des touches du clavier virtuel
function handleKeyClick(key) {
    if (attempts >= maxAttempts || message.textContent) return;

    if (key === '↵' || key === 'ENTER') {
        if (currentGuess.length === mysteryWord.length) {
            handleGuess(currentGuess);
            currentGuess = '';
        }
    } else if (key === '←' || key === 'BACKSPACE') {
        currentGuess = currentGuess.slice(0, -1);
        updateCurrentRow();
    } else if (currentGuess.length < mysteryWord.length) {
        currentGuess += key;
        updateCurrentRow();
    }
}

// Configuration des événements du clavier virtuel
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

function handleGuess(guess) {
    if (guess.length !== mysteryWord.length) {
        alert(`Le mot doit faire ${mysteryWord.length} lettres`);
        return;
    }

    const currentRow = board.children[attempts];
    const letterStates = new Array(mysteryWord.length).fill('absent');
    const mysteryLetterCount = {};

    // Compte les occurrences de chaque lettre dans le mot mystère
    for (let i = 0; i < mysteryWord.length; i++) {
        mysteryLetterCount[mysteryWord[i]] = (mysteryLetterCount[mysteryWord[i]] || 0) + 1;
    }

    // Vérifie d'abord les lettres bien placées
    for (let i = 0; i < guess.length; i++) {
        if (guess[i] === mysteryWord[i]) {
            letterStates[i] = 'correct';
            mysteryLetterCount[guess[i]]--;
        }
    }

    // Vérifie ensuite les lettres mal placées
    for (let i = 0; i < guess.length; i++) {
        if (letterStates[i] !== 'correct' && mysteryLetterCount[guess[i]] > 0) {
            letterStates[i] = 'present';
            mysteryLetterCount[guess[i]]--;
        }
    }

    // Mise à jour visuelle des cellules
    for (let i = 0; i < guess.length; i++) {
        const cell = currentRow.children[i];
        cell.textContent = guess[i];
        cell.classList.add('letter-box');
        
        if (letterStates[i] === 'correct') {
            cell.classList.add('correct');
        } else if (letterStates[i] === 'present') {
            cell.classList.add('present');
        } else {
            cell.classList.add('absent');
        }
        
        // Mise à jour du clavier virtuel
        const keyButton = Array.from(document.querySelectorAll('.key')).find(key => 
            !key.classList.contains('enter') && 
            !key.classList.contains('backspace') && 
            key.textContent === guess[i]
        );
        
        if (keyButton) {
            if (letterStates[i] === 'correct') {
                keyButton.classList.add('correct');
                keyButton.style.backgroundColor = 'var(--success-color)';
                keyButton.style.color = 'white';
            } else if (letterStates[i] === 'present' && !keyButton.classList.contains('correct')) {
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

    attempts++;
    updateAttempts();

    if (guess === mysteryWord) {
        message.textContent = "Bravo ! Vous avez trouvé le mot.";
        message.classList.add('success');
        showReplayButton();
    } else if (attempts >= maxAttempts) {
        message.textContent = `Perdu. Le mot était : ${mysteryWord}`;
        message.classList.add('failure');
        showReplayButton();
    }
}

function showReplayButton() {
    const existingButton = document.getElementById('replay-button');
    if (!existingButton) {
        const replayButton = document.createElement('button');
        replayButton.id = 'replay-button';
        replayButton.className = 'replay-button';
        replayButton.textContent = '🔄 Rejouer';
        replayButton.onclick = resetGame;
        message.parentNode.insertBefore(replayButton, message.nextSibling);
    }
}

async function resetGame() {
    // Réinitialiser les variables
    attempts = 0;
    currentGuess = '';
    mysteryWord = await selectRandomWord();
    
    // Nettoyer le plateau
    board.innerHTML = '';
    message.textContent = '';
    message.className = '';
    
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
    
    // Réinitialiser le jeu
    initializeBoard();
    updateAttempts();
}

function updateAttempts() {
    attemptsDisplay.textContent = `Essai ${attempts}/${maxAttempts}`;
}

// Gestion du clavier physique
document.addEventListener('keydown', (e) => {
    if (attempts >= maxAttempts || message.textContent) return;

    if (e.key === 'Enter') {
        if (currentGuess.length === mysteryWord.length) {
            handleGuess(currentGuess);
            currentGuess = '';
        }
    } else if (e.key === 'Backspace') {
        currentGuess = currentGuess.slice(0, -1);
        updateCurrentRow();
    } else if (e.key.match(/^[a-zA-Z]$/) && currentGuess.length < mysteryWord.length) {
        currentGuess += e.key.toUpperCase();
        updateCurrentRow();
    }
});

// Initialisation initiale du jeu
async function initGame() {
    // Précharger des mots pour le jeu
    await preloadWords();
    
    // Initialiser le premier mot
    mysteryWord = await selectRandomWord();
    
    // Initialiser le jeu
    initializeBoard();
    setupKeyboard();
    updateAttempts();
}

// Démarrer le jeu
initGame(); 