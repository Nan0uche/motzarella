// Fonction pour charger les informations du profil
async function loadProfileInfo() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/html/login.html';
        return;
    }

    try {
        const response = await fetch('/api/profile', {
            headers: {
                'Authorization': token
            }
        });

        if (response.ok) {
            const data = await response.json();
            document.getElementById('profile-username').textContent = data.username;
            document.getElementById('profile-email').textContent = data.email;
            
            // Formater la date d'inscription
            const createdAt = new Date(data.created_at);
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            document.getElementById('profile-created-at').textContent = createdAt.toLocaleDateString('fr-FR', options);
        } else {
            // Si le token n'est plus valide, rediriger vers la page de connexion
            localStorage.removeItem('token');
            window.location.href = '/html/login.html';
        }
    } catch (error) {
        console.error('Erreur lors du chargement du profil:', error);
    }
}

// Charger les informations du profil au chargement de la page
document.addEventListener('DOMContentLoaded', loadProfileInfo); 