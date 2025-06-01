import { checkAuth } from './auth.js';

// Fonction pour charger la liste des utilisateurs
async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Erreur lors du chargement des utilisateurs');
        }

        const users = await response.json();
        displayUsers(users);
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors du chargement des utilisateurs');
    }
}

// Fonction pour afficher les utilisateurs
function displayUsers(users) {
    const usersList = document.getElementById('users-list');
    usersList.innerHTML = '';

    users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        userItem.innerHTML = `
            <div class="user-info">
                <span><strong>Pseudo:</strong> ${user.username}</span>
                <span><strong>Email:</strong> ${user.email}</span>
                <span><strong>Date d'inscription:</strong> ${new Date(user.created_at).toLocaleDateString()}</span>
            </div>
            <div class="user-actions">
                ${!user.is_admin ? `<button class="btn-delete" data-userid="${user.id}">Supprimer</button>` : ''}
            </div>
        `;
        usersList.appendChild(userItem);
    });

    // Ajouter les écouteurs d'événements pour les boutons de suppression
    document.querySelectorAll('.btn-delete').forEach(button => {
        button.addEventListener('click', async () => {
            if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
                await deleteUser(button.dataset.userid);
            }
        });
    });
}

// Fonction pour supprimer un utilisateur
async function deleteUser(userId) {
    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Erreur lors de la suppression de l\'utilisateur');
        }

        // Recharger la liste des utilisateurs
        loadUsers();
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la suppression de l\'utilisateur');
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    // Vérifier si l'utilisateur est admin
    if (checkAuth()) {
        const token = localStorage.getItem('token');
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        if (!payload.is_admin) {
            window.location.href = '/html/home.html';
            return;
        }

        // Charger la liste des utilisateurs
        loadUsers();
    }
}); 