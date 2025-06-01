import { checkAuth } from './auth.js';

// Fonction pour charger la liste des utilisateurs
async function loadUsers() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/html/login.html';
        return;
    }

    try {
        const response = await fetch('/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Erreur lors de la récupération des utilisateurs');
        }

        const users = await response.json();
        const usersList = document.querySelector('.users-list');
        
        // Créer le tableau des utilisateurs
        const table = document.createElement('table');
        table.className = 'users-table';
        
        // En-tête du tableau
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Pseudo</th>
                <th>Email</th>
                <th>Date d'inscription</th>
                <th>Admin</th>
                <th>Actions</th>
            </tr>
        `;
        table.appendChild(thead);
        
        // Corps du tableau
        const tbody = document.createElement('tbody');
        users.forEach(user => {
            const tr = document.createElement('tr');
            const createdAt = new Date(user.created_at);
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            
            // Créer le bouton de suppression séparément pour un meilleur contrôle
            let deleteButton = '';
            if (!user.is_admin) {
                const button = document.createElement('button');
                button.className = 'btn-danger delete-user';
                button.dataset.id = user.id;
                button.textContent = 'Supprimer';
                deleteButton = button.outerHTML;
            }
            
            tr.innerHTML = `
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${createdAt.toLocaleDateString('fr-FR', options)}</td>
                <td>${user.is_admin ? '✅' : '❌'}</td>
                <td>${deleteButton}</td>
            `;
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        
        // Remplacer le contenu existant par le nouveau tableau
        usersList.innerHTML = '';
        usersList.appendChild(table);
        
        // Ajouter les écouteurs d'événements pour les boutons de suppression
        document.querySelectorAll('.delete-user').forEach(button => {
            button.addEventListener('click', async (e) => {
                const userId = parseInt(e.currentTarget.dataset.id, 10);
                
                // Vérifier que l'ID est bien un nombre
                if (isNaN(userId) || userId <= 0) {
                    alert('ID utilisateur invalide');
                    return;
                }

                if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
                    try {
                        const response = await fetch(`/api/admin/users/delete/${userId}`, {
                            method: 'DELETE',
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });
                        
                        if (response.ok) {
                            // Recharger la liste des utilisateurs
                            loadUsers();
                        } else {
                            const errorText = await response.text();
                            if (response.status === 403) {
                                alert('Vous n\'avez pas les droits pour supprimer cet utilisateur');
                            } else if (response.status === 404) {
                                alert('Utilisateur non trouvé ou ne peut pas être supprimé');
                                loadUsers(); // Recharger la liste pour mettre à jour l'affichage
                            } else {
                                alert(`Erreur lors de la suppression de l'utilisateur: ${errorText}`);
                            }
                        }
                    } catch (error) {
                        alert(`Erreur lors de la suppression de l'utilisateur: ${error.message}`);
                    }
                }
            });
        });
    } catch (error) {
        console.error('Erreur:', error);
        if (error.message.includes('401')) {
            // Non autorisé, rediriger vers la page de connexion
            localStorage.removeItem('token');
            window.location.href = '/html/login.html';
        }
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    // Vérifier l'authentification
    if (!checkAuth()) {
        return; // checkAuth() redirigera déjà vers login.html si nécessaire
    }
    
    // Charger la liste des utilisateurs
    loadUsers();
}); 