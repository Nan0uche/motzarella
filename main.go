package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"time"

	"motzarella/database"
	"motzarella/handlers"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/joho/godotenv"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type Game struct {
	Players map[*websocket.Conn]bool
	Word    string
	Guesses map[*websocket.Conn][]string // Stocke les tentatives de chaque joueur
}

var games = make(map[string]*Game)
var waitingPlayers = make(chan *websocket.Conn)

// Liste de mots pour le jeu
var words = []string{
	"ABRIER", "ABUSER", "ACCORD", "ADORER", "AFFUTS", "AGITER", "AIDER", "AIMER", "AJOUTS", "ALARME",
	"BALADE", "BALISE", "BANANE", "BANCAL", "BANDIT", "BANQUE", "BARQUE", "BASSIN", "BATONS", "BEAUTE",
	"CABANE", "CABINE", "CACHER", "CADEAU", "CAISSE", "CALMER", "CAMPER", "CANARD", "CANOTS", "CAPOTE",
	"DANGER", "DANSER", "DATER", "DEBORD", "DECORS", "DEFAIT", "DEGATS", "DELICE", "DEMAIN", "DENIER",
	"ECARTS", "ECHECS", "ECLATS", "ECOLES", "ECRANS", "ECRITS", "EDITER", "EFFETS", "EGARER", "ELEVER",
	"FACILE", "FACTOR", "FADING", "FAIBLE", "FAIRES", "FALOTS", "FAMINE", "FANION", "FARDER", "FARINE",
	"GACHER", "GADGET", "GAGNER", "GALETS", "GALONS", "GAMINS", "GARAGE", "GARDER", "GARCON", "GARER",
	"HABILE", "HABITS", "HACHER", "HALETS", "HALLES", "HALTER", "HANCHE", "HANGAR", "HANTER", "HARDIS",
	"IDEALS", "IDIOTS", "IGNARE", "IGNORE", "ILOTER", "IMAGE", "IMITER", "IMPACT", "IMPORT", "IMPOST",
	"JABOTS", "JACHER", "JACOTS", "JADIS", "JALONS", "JAMBES", "JARDIN", "JARGON", "JASPER", "JETONS",
	"KILOS", "KINNES", "KITCH", "KOTER", "KRAAL", "KRAFT", "KURDE", "KYRIE", "KYSTE", "KZAR",
	"LABELS", "LABOUR", "LACETS", "LACHER", "LACTES", "LADITE", "LAGONS", "LAIDER", "LAITER", "LAMINE",
	"MACHIN", "MACLER", "MADAME", "MAGOTS", "MAIGRE", "MAILLE", "MAINER", "MAISON", "MALADE", "MALICE",
	"NAGER", "NAIFS", "NAINS", "NAITRE", "NANAS", "NANTES", "NARINE", "NATIFS", "NATURE", "NAVETS",
	"OBLATS", "OBLIGE", "OBSCUR", "OBSEDE", "OBTENU", "OBTURE", "OBUSES", "OCELOT", "OCTETS", "OCULER",
	"PACTES", "PADRES", "PAGODE", "PAIENS", "PAILLE", "PAIRES", "PALACE", "PALIER", "PALMER", "PALPER",
	"QUAIRE", "QUAKER", "QUARTZ", "QUASAR", "QUATRE", "QUEBEC", "QUELER", "QUENNE", "QUERIR", "QUETES",
	"RABATS", "RABIOT", "RACINE", "RADARS", "RADIER", "RADINS", "RADIOS", "RADIUM", "RADONS", "RAFALE",
	"SABLER", "SABOTS", "SABRES", "SACHER", "SACRES", "SADITE", "SAFARI", "SAGACE", "SAGOUIN", "SAHARA",
	"TABACS", "TABLES", "TABORS", "TABOUS", "TACHER", "TACLER", "TACTES", "TADJIK", "TAGUER", "TAILLE",
	"UNIFIE", "UNIQUE", "UNIRAS", "UNISEX", "UNISSE", "UNITES", "UNIVER", "URBAIN", "URGENT", "URINER",
	"VACANT", "VACHER", "VAGINS", "VAGUER", "VAINCS", "VAINES", "VAIRON", "VALETS", "VALIDE", "VALISE",
	"WAGONS", "WALIS", "WALLON", "WATTS", "WEBER", "WELTER", "WHARF", "WHISKY", "WIDGET", "WILAYA",
	"XENONS", "XERXES", "XHOSA", "XIPHO", "XYLENE", "XYLOSE", "XYSTES", "XYSTRE", "XYSTUS", "XENONS",
	"YACHTS", "YACKS", "YAKAS", "YAMBA", "YANKS", "YARDS", "YAWLS", "YEBLES", "YEMEN", "YETIS",
	"ZABRES", "ZAINES", "ZAMBIE", "ZANZIS", "ZAPPES", "ZEBRES", "ZELOTE", "ZENITH", "ZESTES", "ZIBELI",
}

// Middleware pour gérer les en-têtes MIME des fichiers JavaScript
func addJSMimeTypeMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, ".js") {
			w.Header().Set("Content-Type", "application/javascript")
		}
		next.ServeHTTP(w, r)
	})
}

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Error loading .env file")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Initialisation de la base de données
	database.InitDB()

	// Routes statiques avec middleware pour les fichiers JS
	fileServer := http.FileServer(http.Dir("static"))
	http.Handle("/", addJSMimeTypeMiddleware(fileServer))

	// Routes d'authentification
	http.HandleFunc("/api/register", handlers.RegisterHandler)
	http.HandleFunc("/api/login", handlers.LoginHandler)

	// Routes protégées
	http.HandleFunc("/api/profile", handlers.AuthMiddleware(handlers.ProfileHandler))

	// Routes d'administration
	http.HandleFunc("/api/admin/users", handlers.AuthMiddleware(handlers.AdminMiddleware(handlers.ListUsersHandler)))
	http.HandleFunc("/api/admin/users/", handlers.AuthMiddleware(handlers.AdminMiddleware(handlers.DeleteUserHandler)))

	// Route WebSocket
	http.HandleFunc("/ws", handleWebSocket)

	// Démarrer le matchmaking
	go matchmaking()

	log.Printf("Serveur démarré sur le port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	defer conn.Close()

	// Ajouter le joueur à la file d'attente
	waitingPlayers <- conn

	// Gérer la connexion
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Println(err)
			return
		}

		var data map[string]interface{}
		if err := json.Unmarshal(message, &data); err != nil {
			log.Println("Erreur de décodage JSON:", err)
			continue
		}

		switch data["type"] {
		case "submit_guess":
			gameID := data["game_id"].(string)
			guess := data["guess"].(string)
			game := games[gameID]

			if game != nil {
				// Vérifier si le joueur a déjà gagné ou perdu
				if len(game.Guesses[conn]) > 0 && (game.Guesses[conn][len(game.Guesses[conn])-1] == game.Word || len(game.Guesses[conn]) >= 6) {
					continue
				}

				if !isValidWord(guess) {
					conn.WriteJSON(map[string]interface{}{
						"type":    "error",
						"message": "Mot non reconnu dans le dictionnaire.",
					})
					continue
				}

				// Vérifier si le mot est valide (même longueur que le mot mystère)
				if len(guess) != len(game.Word) {
					conn.WriteJSON(map[string]interface{}{
						"type":    "error",
						"message": fmt.Sprintf("Le mot doit faire exactement %d lettres", len(game.Word)),
					})
					continue
				}

				result := checkGuess(guess, game.Word)
				game.Guesses[conn] = append(game.Guesses[conn], guess)

				// Envoyer le résultat uniquement au joueur qui a fait la tentative
				conn.WriteJSON(map[string]interface{}{
					"type":     "guess_result",
					"guess":    guess,
					"result":   result,
					"correct":  guess == game.Word,
					"attempts": len(game.Guesses[conn]),
				})

				if guess == game.Word {
					// Le joueur a gagné, envoyer game_over à tous les joueurs
					for player := range game.Players {
						winner := "none"
						if player == conn {
							winner = "you"
						}
						player.WriteJSON(map[string]interface{}{
							"type":   "game_over",
							"winner": winner,
							"word":   game.Word,
						})
					}
					delete(games, gameID)
				} else if len(game.Guesses[conn]) >= 6 {
					// Le joueur a perdu, l'autre joueur gagne
					for player := range game.Players {
						winner := "none"
						if player != conn {
							winner = "you"
						}
						player.WriteJSON(map[string]interface{}{
							"type":   "game_over",
							"winner": winner,
							"word":   game.Word,
						})
					}
					delete(games, gameID)
				}
			}
		}
	}
}

func checkGuess(guess, word string) []string {
	result := make([]string, len(word))
	wordLetters := make(map[rune]int)

	// Compter les occurrences de chaque lettre dans le mot
	for _, letter := range word {
		wordLetters[letter]++
	}

	// D'abord, marquer les lettres correctement placées
	for i := 0; i < len(word); i++ {
		if guess[i] == word[i] {
			result[i] = "correct"
			wordLetters[rune(guess[i])]--
		}
	}

	// Ensuite, marquer les lettres présentes mais mal placées
	for i := 0; i < len(word); i++ {
		if result[i] != "correct" {
			letter := rune(guess[i])
			if count, exists := wordLetters[letter]; exists && count > 0 {
				result[i] = "present"
				wordLetters[letter]--
			} else {
				result[i] = "absent"
			}
		}
	}

	return result
}

func matchmaking() {
	for {
		player1 := <-waitingPlayers
		player2 := <-waitingPlayers

		// Sélectionner un mot aléatoire
		rand.Seed(time.Now().UnixNano())
		word := words[rand.Intn(len(words))]

		// Créer une nouvelle partie
		gameID := uuid.New().String()
		game := &Game{
			Players: make(map[*websocket.Conn]bool),
			Word:    word,
			Guesses: make(map[*websocket.Conn][]string),
		}
		game.Players[player1] = true
		game.Players[player2] = true
		game.Guesses[player1] = []string{}
		game.Guesses[player2] = []string{}

		games[gameID] = game

		log.Printf("Nouvelle partie créée: %s, Mot: %s", gameID, word)

		// Envoyer le début de partie à chaque joueur
		for player := range game.Players {
			player.WriteJSON(map[string]interface{}{
				"type":    "game_start",
				"game_id": gameID,
				"word":    word,
			})
		}
	}
}

func generateGameID() string {
	rand.Seed(time.Now().UnixNano())
	return "game-" + string(rand.Intn(1000))
}

func isValidWord(guess string) bool {
	for _, w := range words {
		if guess == w {
			return true
		}
	}
	return false
}
