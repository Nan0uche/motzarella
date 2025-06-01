package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"motzarella/database"

	"github.com/dgrijalva/jwt-go"
	"golang.org/x/crypto/bcrypt"
)

var jwtKey = []byte("votre_clé_secrète_jwt") // À changer en production

type Credentials struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Email    string `json:"email,omitempty"`
}

type Claims struct {
	Username string `json:"username"`
	IsAdmin  bool   `json:"is_admin"`
	jwt.StandardClaims
}

// RegisterHandler gère l'inscription des utilisateurs
func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	var creds Credentials
	err := json.NewDecoder(r.Body).Decode(&creds)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	// Vérification si l'utilisateur existe déjà
	existingUser, err := database.GetUserByUsername(creds.Username)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	if existingUser != nil {
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Ce nom d'utilisateur est déjà pris",
		})
		return
	}

	// Vérification si l'email existe déjà
	existingEmail, err := database.GetUserByEmail(creds.Email)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	if existingEmail != nil {
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Cet email est déjà utilisé",
		})
		return
	}

	// Hashage du mot de passe
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(creds.Password), bcrypt.DefaultCost)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// Création de l'utilisateur
	err = database.CreateUser(creds.Username, creds.Email, string(hashedPassword))
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// Création du token JWT
	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		Username: creds.Username,
		IsAdmin:  false,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: expirationTime.Unix(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtKey)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"token": tokenString,
	})
}

// LoginHandler gère la connexion des utilisateurs
func LoginHandler(w http.ResponseWriter, r *http.Request) {
	var creds Credentials
	err := json.NewDecoder(r.Body).Decode(&creds)
	if err != nil {
		log.Printf("Erreur de décodage JSON: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	// Récupération de l'utilisateur
	user, err := database.GetUserByUsername(creds.Username)
	if err != nil {
		log.Printf("Erreur lors de la récupération de l'utilisateur: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	if user == nil {
		log.Printf("Utilisateur non trouvé: %s", creds.Username)
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Identifiants invalides",
		})
		return
	}

	// Vérification du mot de passe
	err = database.TestPassword(user.Password, creds.Password)
	if err != nil {
		log.Printf("Mot de passe incorrect pour l'utilisateur %s: %v", creds.Username, err)
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Identifiants invalides",
		})
		return
	}

	// Création du token JWT
	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		Username: creds.Username,
		IsAdmin:  user.IsAdmin,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: expirationTime.Unix(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtKey)
	if err != nil {
		log.Printf("Erreur lors de la création du token: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	log.Printf("Connexion réussie pour l'utilisateur %s (admin: %v)", creds.Username, user.IsAdmin)
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"token": tokenString,
	})
}

// AuthMiddleware vérifie si l'utilisateur est authentifié
func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "Token d'authentification manquant",
			})
			return
		}

		// Extraire le token après "Bearer "
		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "Format du token invalide",
			})
			return
		}

		tokenString := tokenParts[1]
		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return jwtKey, nil
		})

		if err != nil || !token.Valid {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "Token invalide",
			})
			return
		}

		// Ajouter l'utilisateur au contexte de la requête
		user, err := database.GetUserByUsername(claims.Username)
		if err != nil || user == nil {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "Utilisateur non trouvé",
			})
			return
		}

		// Stocker l'utilisateur dans le contexte
		ctx := context.WithValue(r.Context(), "user", user)
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}

// ProfileHandler gère la récupération des informations du profil
func ProfileHandler(w http.ResponseWriter, r *http.Request) {
	// Récupérer l'utilisateur depuis le contexte (ajouté par le middleware)
	user := r.Context().Value("user").(*database.User)
	if user == nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Utilisateur non trouvé",
		})
		return
	}

	// Renvoyer les informations du profil
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"username":   user.Username,
		"email":      user.Email,
		"created_at": user.CreatedAt,
		"is_admin":   user.IsAdmin,
	})
}
