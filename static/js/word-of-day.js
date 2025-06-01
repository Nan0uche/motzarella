document.addEventListener('DOMContentLoaded', () => {
    updateDate();
    loadWordOfDay();
});

function updateDate() {
    const date = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').textContent = date.toLocaleDateString('fr-FR', options);
}

function loadWordOfDay() {
    // Simuler le chargement d'un mot aléatoire (à remplacer par un appel API)
    const words = [
        {
            word: "ABRIER",
            definition: "Mettre à l'abri, protéger des intempéries ou du froid.",
            examples: [
                "Il faut abrier les plantes avant l'hiver.",
                "Elle s'est abriée sous un parapluie."
            ]
        },
        {
            word: "BALISE",
            definition: "Signal fixe ou flottant servant à signaler un danger ou à indiquer une route à suivre.",
            examples: [
                "Les balises lumineuses guident les bateaux.",
                "Le sentier est marqué par des balises jaunes."
            ]
        },
        {
            word: "CALMER",
            definition: "Rendre calme, apaiser, tranquilliser.",
            examples: [
                "La musique aide à calmer les nerfs.",
                "Le médicament a calmé la douleur."
            ]
        }
    ];

    // Utiliser la date pour sélectionner le mot du jour
    const today = new Date();
    const index = (today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()) % words.length;
    const wordOfDay = words[index];

    // Mettre à jour l'interface
    document.getElementById('current-word').textContent = wordOfDay.word;
    document.getElementById('word-definition').textContent = wordOfDay.definition;
    
    const examplesList = document.getElementById('word-examples');
    examplesList.innerHTML = wordOfDay.examples
        .map(example => `<li>${example}</li>`)
        .join('');
} 