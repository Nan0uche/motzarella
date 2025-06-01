CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password BLOB NOT NULL,
    is_admin BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Créer le compte admin par défaut
INSERT OR IGNORE INTO users (username, email, password, is_admin) 
VALUES ('admin', 'admin@motzarella.com', '$2a$10$YOUR_HASHED_PASSWORD', 1); 