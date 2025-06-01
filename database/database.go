package database

import (
	"database/sql"
	"log"
	"os"
	"path/filepath"
	"strings"

	_ "github.com/mattn/go-sqlite3"
	"golang.org/x/crypto/bcrypt"
)

var db *sql.DB

type User struct {
	ID        int    `json:"id"`
	Username  string `json:"username"`
	Email     string `json:"email"`
	Password  []byte `json:"-"` // Changer le type en []byte
	IsAdmin   bool   `json:"is_admin"`
	CreatedAt string `json:"created_at"`
}

func InitDB() {
	// Créer le dossier data s'il n'existe pas
	os.MkdirAll("data", os.ModePerm)

	var err error
	db, err = sql.Open("sqlite3", filepath.Join("data", "motzarella.db"))
	if err != nil {
		log.Fatal(err)
	}

	// Lire et exécuter le fichier init.sql
	sqlInit, err := os.ReadFile("database/init.sql")
	if err != nil {
		log.Fatal(err)
	}

	// Hasher le mot de passe admin par défaut
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("root"), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal(err)
	}

	// Remplacer le placeholder par le vrai mot de passe hashé
	sqlString := string(sqlInit)
	sqlString = strings.Replace(sqlString, "$2a$10$YOUR_HASHED_PASSWORD", string(hashedPassword), 1)

	_, err = db.Exec(sqlString)
	if err != nil {
		log.Fatal(err)
	}
}

func GetUserByUsername(username string) (*User, error) {
	user := &User{}
	err := db.QueryRow("SELECT id, username, email, password, is_admin, created_at FROM users WHERE username = ?", username).
		Scan(&user.ID, &user.Username, &user.Email, &user.Password, &user.IsAdmin, &user.CreatedAt)

	if err == sql.ErrNoRows {
		log.Printf("Utilisateur non trouvé: %s", username)
		return nil, nil
	}
	if err != nil {
		log.Printf("Erreur lors de la récupération de l'utilisateur: %v", err)
		return nil, err
	}

	log.Printf("Utilisateur trouvé: %s (admin: %v)", user.Username, user.IsAdmin)
	log.Printf("Hash stocké récupéré (len=%d): %x", len(user.Password), user.Password)
	return user, nil
}

func GetUserByEmail(email string) (*User, error) {
	user := &User{}
	err := db.QueryRow("SELECT id, username, email, password, is_admin, created_at FROM users WHERE email = ?", email).
		Scan(&user.ID, &user.Username, &user.Email, &user.Password, &user.IsAdmin, &user.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return user, nil
}

func CreateUser(username, email, password string) error {
	log.Printf("Création d'utilisateur - Hash reçu: %s", password)

	// Le mot de passe est déjà hashé par le handler, pas besoin de le hasher à nouveau
	hashedPassword := []byte(password)

	// Stocker le hash directement en tant que BLOB
	result, err := db.Exec("INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
		username, email, hashedPassword)

	if err != nil {
		log.Printf("Erreur lors de la création de l'utilisateur: %v", err)
		return err
	}

	id, _ := result.LastInsertId()
	log.Printf("Nouvel utilisateur créé: %s (ID: %d)", username, id)

	// Vérifier immédiatement que l'utilisateur peut être récupéré
	user, err := GetUserByUsername(username)
	if err != nil {
		log.Printf("Erreur lors de la vérification de l'utilisateur créé: %v", err)
		return err
	}

	log.Printf("Vérification du hash stocké (len=%d): %x", len(user.Password), user.Password)
	return nil
}

// Fonction pour tester un mot de passe
func TestPassword(hashedPassword []byte, password string) error {
	log.Printf("Test de mot de passe - Hash stocké (len=%d): %x", len(hashedPassword), hashedPassword)
	log.Printf("Test de mot de passe - Mot de passe fourni: %s", password)

	err := bcrypt.CompareHashAndPassword(hashedPassword, []byte(password))
	if err != nil {
		log.Printf("Test de mot de passe échoué: %v", err)
	} else {
		log.Printf("Test de mot de passe réussi")
	}
	return err
}

func GetAllUsers() ([]User, error) {
	rows, err := db.Query("SELECT id, username, email, is_admin, created_at FROM users")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var user User
		err := rows.Scan(&user.ID, &user.Username, &user.Email, &user.IsAdmin, &user.CreatedAt)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}
	return users, nil
}

func DeleteUser(id int) error {
	result, err := db.Exec("DELETE FROM users WHERE id = ? AND is_admin = 0", id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return sql.ErrNoRows
	}

	return nil
}
