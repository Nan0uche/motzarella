console.log('words.js: Module loading...');

// Fonction pour vérifier si un mot est valide (6 lettres, uniquement des lettres)
function isValidWord(word) {
    console.log('words.js: Checking word validity:', word);
    return word.length === 6 && /^[A-Z]+$/.test(word);
}

// Fonction pour nettoyer un mot (enlever les accents, mettre en majuscules)
function cleanWord(word) {
    console.log('words.js: Cleaning word:', word);
    return word.normalize('NFD')
               .replace(/[\u0300-\u036f]/g, '')
               .toUpperCase();
}

// Cache pour stocker les mots
let wordCache = new Set();

// Liste de mots par défaut
const defaultWords = [
    "ABRIER", "ADORER", "BANQUE", "CACHER", "DANGER", "ECRANS", "FAIBLE", "GARAGE", "HABILE",
    "BALISE", "CABANE", "DAMIER", "ECRIRE", "FAMINE", "GARDER", "HALTER", "IGNARE", "JAMBON",
    "KALIUM", "LABEUR", "MADAME", "NACRER", "OBLIGE", "PAGODE", "QUARTE", "RABAIS", "SABLER",
    "TABACS", "ULTIME", "VALISE", "WAGON", "XENON", "YACHT", "ZEBRE"
];

// Fonction pour obtenir un mot aléatoire
async function getRandomWord() {
    console.log('words.js: Getting random word...');
    const word = defaultWords[Math.floor(Math.random() * defaultWords.length)];
    console.log('words.js: Selected word:', word);
    return word;
}

// Fonction pour précharger des mots
async function preloadWords() {
    console.log('words.js: Preloading words...');
    wordCache = new Set(defaultWords);
    console.log(`words.js: ${wordCache.size} mots chargés avec succès`);
}

console.log('words.js: Module loaded, exporting functions...');

// Exporter les fonctions nécessaires
export { getRandomWord, preloadWords, isValidWord }; 