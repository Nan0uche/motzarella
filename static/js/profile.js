import { checkAuth, logout } from './auth.js';

// Récupérer les informations du profil depuis l'API
async function updateProfileInfo() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/html/login.html';
        return;
    }

    try {
        // Appeler l'API pour récupérer les informations complètes du profil
        const response = await fetch('/api/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Erreur lors de la récupération du profil');
        }

        const profileData = await response.json();
        
        // Mettre à jour les informations du profil
        document.getElementById('profile-username').textContent = profileData.username;
        document.getElementById('profile-email').textContent = profileData.email;
        
        // Formater la date de création
        const createdAt = new Date(profileData.created_at);
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('profile-created-at').textContent = createdAt.toLocaleDateString('fr-FR', options);
        
        // Mettre à jour le lien du profil dans la navigation
        const profileLink = document.querySelector('.nav-link.profile-link');
        if (profileLink) {
            profileLink.innerHTML = `👤 ${profileData.username}`;
        }

        // Gérer l'affichage du bouton admin
        const adminButton = document.getElementById('admin-button');
        if (adminButton && profileData.is_admin) {
            adminButton.style.display = 'block';
            adminButton.addEventListener('click', () => {
                window.location.href = '/html/admin.html';
            });
        }
    } catch (error) {
        console.error('Erreur lors de la récupération du profil:', error);
        localStorage.removeItem('token');
        window.location.href = '/html/login.html';
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    // Vérifier l'authentification
    if (!checkAuth()) {
        return; // checkAuth() redirigera déjà vers login.html si nécessaire
    }
    
    // Mettre à jour les informations du profil
    updateProfileInfo();
    
    // Ajouter l'écouteur d'événement pour le bouton de déconnexion
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }
}); 