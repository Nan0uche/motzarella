import { getRandomWord, preloadWords, isValidWord } from './words.js';
import { checkAuth } from './auth.js';

console.log('solo.js: Module loading...');

let mysteryWord;
const maxAttempts = 6;
let attempts = 0;
let currentGuess = '';

let board;
let message;
let keyboard;
let attemptsDisplay;

// Sélection d'un mot aléatoire
async function selectRandomWord() {
    console.log('solo.js: Selecting random word...');
    try {
        const word = await getRandomWord();
        console.log('solo.js: Word selected successfully');
        return word;
    } catch (error) {
        console.error('solo.js: Error selecting word:', error);
        throw error;
    }
}

// Initialisation du plateau de jeu
function initializeBoard() {
    console.log('solo.js: Initializing board...');
    if (!board) {
        console.error('solo.js: Board element not found!');
        return;
    }
    
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
    console.log('solo.js: Board initialized successfully');
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
    console.log('solo.js: Key clicked:', key);
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
    console.log('solo.js: Setting up keyboard...');
    if (!keyboard) {
        console.error('solo.js: Keyboard element not found!');
        return;
    }

    // Créer le clavier virtuel
    const rows = [
        ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'],
        ['ENTER', 'W', 'X', 'C', 'V', 'B', 'N', 'BACKSPACE']
    ];

    keyboard.innerHTML = ''; // Nettoyer le clavier existant

    rows.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'keyboard-row';
        
        row.forEach(key => {
            const button = document.createElement('button');
            button.className = 'key';
            if (key === 'ENTER') {
                button.classList.add('enter');
                button.textContent = '↵';
            } else if (key === 'BACKSPACE') {
                button.classList.add('backspace');
                button.textContent = '←';
            } else {
                button.textContent = key;
            }
            
            button.addEventListener('click', () => handleKeyClick(key));
            rowDiv.appendChild(button);
        });
        
        keyboard.appendChild(rowDiv);
    });

    console.log('solo.js: Keyboard setup complete');
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

// Initialisation du jeu
document.addEventListener('DOMContentLoaded', async () => {
    console.log('solo.js: DOM Content Loaded');
    
    try {
        // Initialiser les éléments DOM
        board = document.getElementById("game-board");
        message = document.getElementById("message");
        keyboard = document.getElementById("keyboard");
        attemptsDisplay = document.getElementById("attempts");

        console.log('solo.js: DOM elements initialized:', {
            board: !!board,
            message: !!message,
            keyboard: !!keyboard,
            attemptsDisplay: !!attemptsDisplay
        });

        if (!board || !message || !keyboard || !attemptsDisplay) {
            throw new Error('Required DOM elements not found');
        }

        // Vérifier l'authentification directement
        if (checkAuth()) {
            console.log('solo.js: Authentication successful, initializing game');
            try {
                await preloadWords();
                console.log('solo.js: Words preloaded');
                mysteryWord = await selectRandomWord();
                console.log('solo.js: Mystery word selected:', mysteryWord);
                initializeBoard();
                console.log('solo.js: Board initialized');
                setupKeyboard();
                console.log('solo.js: Keyboard setup complete');
                updateAttempts();
                console.log('solo.js: Game initialization complete');
            } catch (error) {
                console.error('solo.js: Error during initialization:', error);
                message.textContent = "Erreur lors de l'initialisation du jeu. Veuillez recharger la page.";
            }
        } else {
            console.log('solo.js: Authentication failed');
        }
    } catch (error) {
        console.error('solo.js: Critical error during setup:', error);
        if (message) {
            message.textContent = "Erreur critique. Veuillez recharger la page.";
        }
    }
});

// Gestion des touches du clavier physique
document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        handleKeyClick('ENTER');
    } else if (event.key === 'Backspace') {
        handleKeyClick('BACKSPACE');
    } else if (/^[A-Za-z]$/.test(event.key)) {
        handleKeyClick(event.key.toUpperCase());
    }
}); 