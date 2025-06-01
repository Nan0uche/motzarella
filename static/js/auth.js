// Fonction pour vérifier si l'utilisateur est connecté
export function checkAuth() {
    const token = localStorage.getItem('token');
    const currentPage = window.location.pathname.split('/').pop();
    const protectedPages = ['solo.html', 'multi.html', 'word-of-day.html', 'profile.html'];
    
    console.log('Checking auth:', { token: !!token, currentPage, isProtected: protectedPages.includes(currentPage) });
    
    if (!token && protectedPages.includes(currentPage)) {
        window.location.href = '/html/login.html';
        return false;
    }
    return true;
}

// Fonction pour gérer l'inscription
async function handleRegister(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (password !== confirmPassword) {
        showError("Les mots de passe ne correspondent pas");
        return;
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username,
                email,
                password
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Stockage du token JWT
            localStorage.setItem('token', data.token);
            window.location.href = '/html/home.html';
        } else {
            showError(data.error || "Erreur lors de l'inscription");
        }
    } catch (error) {
        showError("Erreur de connexion au serveur");
    }
}

// Fonction pour gérer la connexion
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username,
                password
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Stockage du token JWT
            localStorage.setItem('token', data.token);
            // Redirection vers la page d'accueil
            window.location.href = '/html/home.html';
        } else {
            showError(data.error || "Identifiants invalides");
        }
    } catch (error) {
        showError("Erreur de connexion au serveur");
    }
}

// Fonction pour afficher les messages d'erreur
function showError(message) {
    let errorDiv = document.querySelector('.error-message');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        const form = document.querySelector('form');
        form.parentNode.insertBefore(errorDiv, form);
    }
    errorDiv.textContent = message;
    errorDiv.classList.add('visible');
}

// Fonction pour mettre à jour l'affichage du profil
function updateProfileDisplay() {
    const token = localStorage.getItem('token');
    const profileLinks = document.querySelectorAll('.nav-link.profile-link');
    const currentPage = window.location.pathname.split('/').pop();
    
    if (profileLinks.length > 0) {
        profileLinks.forEach(profileLink => {
            if (token) {
                // Décoder le token JWT pour obtenir le nom d'utilisateur
                const payload = JSON.parse(atob(token.split('.')[1]));
                profileLink.innerHTML = `👤 ${payload.username}`;
                profileLink.href = '/html/profile.html';
                
                // Ajouter un gestionnaire de clic pour le lien du profil
                profileLink.onclick = function(e) {
                    e.preventDefault(); // Toujours empêcher le comportement par défaut
                    
                    // Si on est déjà sur la page de profil, ne rien faire
                    if (currentPage === 'profile.html') {
                        return;
                    }
                    
                    // Sinon, rediriger vers la page de profil
                    window.location.href = '/html/profile.html';
                };
            } else {
                profileLink.innerHTML = '👤 Se connecter';
                profileLink.href = '/html/login.html';
                
                // Ajouter un gestionnaire de clic pour le lien de connexion
                profileLink.onclick = function(e) {
                    e.preventDefault(); // Toujours empêcher le comportement par défaut
                    
                    // Si on est déjà sur la page de login ou register, ne rien faire
                    if (currentPage === 'login.html' || currentPage === 'register.html') {
                        return;
                    }
                    
                    // Sinon, rediriger vers la page de connexion
                    window.location.href = '/html/login.html';
                };
            }
        });
    }
}

// Fonction pour se déconnecter
export function logout() {
    localStorage.removeItem('token');
    window.location.href = '/html/home.html';
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    console.log('Auth.js: DOM Content Loaded');
    
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');

    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Mettre à jour l'affichage du profil
    updateProfileDisplay();
    
    // Vérifier l'authentification et permettre l'initialisation du jeu si connecté
    if (checkAuth()) {
        console.log('Auth.js: Authentication successful, dispatching authReady');
        document.dispatchEvent(new Event('authReady'));
    }
}); 