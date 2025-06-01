package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"motzarella/database"
)

// Middleware pour vérifier si l'utilisateur est admin
func AdminMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user := r.Context().Value("user").(*database.User)
		if !user.IsAdmin {
			http.Error(w, "Accès non autorisé", http.StatusForbidden)
			return
		}
		next(w, r)
	}
}

// Handler pour lister tous les utilisateurs
func ListUsersHandler(w http.ResponseWriter, r *http.Request) {
	users, err := database.GetAllUsers()
	if err != nil {
		http.Error(w, "Erreur lors de la récupération des utilisateurs", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

// Handler pour supprimer un utilisateur
func DeleteUserHandler(w http.ResponseWriter, r *http.Request) {
	// Extraire l'ID de l'utilisateur de l'URL
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 4 {
		http.Error(w, "ID utilisateur manquant", http.StatusBadRequest)
		return
	}

	userID, err := strconv.Atoi(parts[3])
	if err != nil {
		http.Error(w, "ID utilisateur invalide", http.StatusBadRequest)
		return
	}

	err = database.DeleteUser(userID)
	if err != nil {
		http.Error(w, "Erreur lors de la suppression de l'utilisateur", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}
