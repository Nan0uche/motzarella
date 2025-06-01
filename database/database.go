package database

import (
	"database/sql"
	"fmt"
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
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

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
	// Le mot de passe est déjà hashé par le handler, pas besoin de le hasher à nouveau
	hashedPassword := []byte(password)

	// Stocker le hash directement en tant que BLOB
	_, err := db.Exec("INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
		username, email, hashedPassword)

	if err != nil {
		return err
	}

	// Vérifier immédiatement que l'utilisateur peut être récupéré
	_, err = GetUserByUsername(username)
	if err != nil {
		return err
	}

	return nil
}

// Fonction pour tester un mot de passe
func TestPassword(hashedPassword []byte, password string) error {
	return bcrypt.CompareHashAndPassword(hashedPassword, []byte(password))
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
	// D'abord vérifier si l'utilisateur existe
	var isAdmin bool
	err := db.QueryRow("SELECT is_admin FROM users WHERE id = ?", id).Scan(&isAdmin)
	if err == sql.ErrNoRows {
		return sql.ErrNoRows // L'utilisateur n'existe pas
	}
	if err != nil {
		return err
	}

	// Si l'utilisateur est admin, on ne peut pas le supprimer
	if isAdmin {
		return fmt.Errorf("cannot delete admin user")
	}

	// Supprimer l'utilisateur
	_, err = db.Exec("DELETE FROM users WHERE id = ?", id)
	if err != nil {
		return err
	}

	return nil
}
