# Motus - Jeu en ligne

Un jeu de Motus en ligne développé en Go, permettant aux joueurs de s'affronter en 1 contre 1.

## Fonctionnalités

- Interface utilisateur moderne et intuitive
- Système de matchmaking automatique
- Communication en temps réel via WebSocket
- Validation des mots en temps réel
- Affichage des résultats avec code couleur

## Prérequis

- Go 1.21 ou supérieur
- Un navigateur web moderne

## Installation

1. Clonez le dépôt :
```bash
git clone https://github.com/votre-username/motus.git
cd motus
```

2. Installez les dépendances :
```bash
go mod download
```

3. Créez un fichier `.env` à la racine du projet :
```env
PORT=8080
```

## Lancement

Pour démarrer le serveur :
```bash
go run main.go
```

Le serveur sera accessible à l'adresse : `http://localhost:8080`

## Comment jouer

1. Ouvrez votre navigateur et accédez à `http://localhost:8080`
2. Le système vous mettra automatiquement en attente d'un adversaire
3. Une fois qu'un adversaire est trouvé, le jeu commence
4. Entrez votre mot de 6 lettres et validez
5. Les lettres correctement placées apparaissent en vert
6. Les lettres présentes mais mal placées apparaissent en jaune
7. Les lettres absentes apparaissent en rouge

## Structure du projet

```
motus/
├── main.go           # Serveur principal
├── go.mod           # Dépendances Go
├── static/          # Fichiers statiques
│   ├── index.html   # Page d'accueil
│   ├── styles.css   # Styles CSS
│   └── app.js       # Logique client
└── README.md        # Documentation
``` 