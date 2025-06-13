// Configuración de Firebase - REEMPLAZA CON TUS CREDENCIALES
const firebaseConfig = {
    apiKey: "AIzaSyCoJ_e2fawTeBlMX3xagzxNfcsvtKpJopI",
    authDomain: "dnd-campaign-coins.firebaseapp.com",
    projectId: "dnd-campaign-coins",
    storageBucket: "dnd-campaign-coins.firebasestorage.app",
    messagingSenderId: "477543749017",
    appId: "1:477543749017:web:c970841cf3aac1c2402f08"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Elementos del DOM
const dmLoginSection = document.getElementById('dmLoginSection');
const dmMainContent = document.getElementById('dmMainContent');
const dmLoginForm = document.getElementById('dmLoginForm');
const dmLogoutBtn = document.getElementById('dmLogoutBtn');
const playersContainer = document.getElementById('playersContainer');
const notificationsContainer = document.getElementById('notificationsContainer');
const totalPlayersDisplay = document.getElementById('totalPlayers');
const totalPointsDistributedDisplay = document.getElementById('totalPointsDistributed');
const totalPurchasesDisplay = document.getElementById('totalPurchases');

// Variables globales
let dmUser = null;
let allPlayers = [];

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    initializeDMApp();
    setupDMEvents();
});

// Inicializar la aplicación del DM
function initializeDMApp() {
    auth.onAuthStateChanged(user => {
       if (user && user.email === 'gonzalobrenes2009@gmail.com') { // Reemplaza con tu dominio
            dmUser = user;
            showDMMainContent();
            loadCampaignData();
        } else {
            dmUser = null;
            showDMLoginSection();
        }
    });
}

// Configurar eventos del DM
function setupDMEvents() {
    dmLoginForm.addEventListener('submit', handleDMLogin);
    dmLogoutBtn.addEventListener('click', handleDMLogout);
}

// Funciones de autenticación del DM
async function handleDMLogin(e) {
    e.preventDefault();
    const email = document.getElementById('dmEmail').value;
    const password = document.getElementById('dmPassword').value;

    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        alert('Error al iniciar sesión: ' + error.message);
    }
}

async function handleDMLogout() {
    try {
        await auth.signOut();
    } catch (error) {
        alert('Error al cerrar sesión: ' + error.message);
    }
}

// Funciones de UI del DM
function showDMLoginSection() {
    dmLoginSection.style.display = 'block';
    dmMainContent.style.display = 'none';
}

function showDMMainContent() {
    dmLoginSection.style.display = 'none';
    dmMainContent.style.display = 'block';
}

// Cargar datos de la campaña
async function loadCampaignData() {
    try {
        // Cargar jugadores
        const playersSnapshot = await db.collection('players').get();
        allPlayers = playersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderPlayers();

        // Cargar notificaciones
        loadNotifications();

        // Actualizar resumen
        updateSummary();

    } catch (error) {
        console.error('Error cargando datos de la campaña:', error);
        alert('Error al cargar datos de la campaña');
    }
}

// Renderizar lista de jugadores
function renderPlayers() {
    playersContainer.innerHTML = '';

    allPlayers.forEach(player => {
        const playerCard = document.createElement('div');
        playerCard.className = 'player-card';
        playerCard.innerHTML = `
            <h3>${player.name}</h3>
            <p>Correo: ${player.email}</p>
            <p>Puntos: ${player.points || 0}</p>
            <div class="points-input">
                <input type="number" id="points-${player.id}" placeholder="Puntos a agregar" min="1">
                <select id="reason-${player.id}">
                    <option value="Completar misión principal">Completar misión principal</option>
                    <option value="Completar misión secundaria">Completar misión secundaria</option>
                    <option value="Roleplay destacado">Roleplay destacado</option>
                    <option value="Resolver conflicto sin combate">Resolver conflicto sin combate</option>
                    <option value="Derrotar jefe principal">Derrotar jefe principal</option>
                    <option value="Otro">Otro motivo</option>
                </select>
                <button class="btn btn-primary" onclick="addPoints('${player.id}')">Agregar Puntos</button>
            </div>
        `;
        playersContainer.appendChild(playerCard);
    });
}

// Agregar puntos a un jugador
async function addPoints(playerId) {
    const pointsInput = document.getElementById(`points-${playerId}`);
    const reasonSelect = document.getElementById(`reason-${playerId}`);
    const points = parseInt(pointsInput.value);
    const reason = reasonSelect.value;

    if (isNaN(points) || points <= 0) {
        alert('Por favor, ingresa una cantidad válida de puntos');
        return;
    }

    try {
        const playerRef = db.collection('players').doc(playerId);
        await playerRef.update({
            points: firebase.firestore.FieldValue.increment(points)
        });

        // Recargar datos
        loadCampaignData();
        alert(`Se agregaron ${points} puntos al jugador`);

    } catch (error) {
        console.error('Error agregando puntos:', error);
        alert('Error al agregar puntos');
    }
}

// Otorgar puntos a todos los jugadores
async function givePointsToAll() {
    const bulkPointsInput = document.getElementById('bulkPoints');
    const bulkReasonSelect = document.getElementById('bulkReason');
    const points = parseInt(bulkPointsInput.value);
    const reason = bulkReasonSelect.value;

    if (isNaN(points) || points <= 0) {
        alert('Por favor, ingresa una cantidad válida de puntos');
        return;
    }

    try {
        // Actualizar cada jugador
        const batch = db.batch();
        allPlayers.forEach(player => {
            const playerRef = db.collection('players').doc(player.id);
            batch.update(playerRef, {
                points: firebase.firestore.FieldValue.increment(points)
            });
        });
        await batch.commit();

        // Recargar datos
        loadCampaignData();
        alert(`Se agregaron ${points} puntos a todos los jugadores`);

    } catch (error) {
        console.error('Error agregando puntos a todos:', error);
        alert('Error al agregar puntos a todos');
    }
}

// Cargar notificaciones de compras
async function loadNotifications() {
    try {
        const notificationsSnapshot = await db.collection('dm_notifications')
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();

        const notifications = notificationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderNotifications(notifications);

    } catch (error) {
        console.error('Error cargando notificaciones:', error);
        alert('Error al cargar notificaciones');
    }
}

// Renderizar notificaciones
function renderNotifications(notifications) {
    notificationsContainer.innerHTML = '';

    notifications.forEach(notification => {
        const notificationItem = document.createElement('div');
        notificationItem.className = `notification-item ${notification.read ? 'read' : ''}`;
        notificationItem.innerHTML = `
            <p><strong>${notification.playerName}</strong> compró <strong>${notification.purchase.itemName}</strong> por ${notification.purchase.price} puntos</p>
            <button class="btn btn-secondary" onclick="markAsRead('${notification.id}')">Marcar como Leída</button>
        `;
        notificationsContainer.appendChild(notificationItem);
    });
}

// Marcar notificación como leída
async function markAsRead(notificationId) {
    try {
        const notificationRef = db.collection('dm_notifications').doc(notificationId);
        await notificationRef.update({ read: true });

        // Recargar notificaciones
        loadNotifications();

    } catch (error) {
        console.error('Error marcando como leída:', error);
        alert('Error al marcar como leída');
    }
}

// Actualizar resumen de la campaña
async function updateSummary() {
    totalPlayersDisplay.textContent = allPlayers.length;

    // Calcular puntos distribuidos
    let totalPoints = 0;
    allPlayers.forEach(player => {
        totalPoints += player.points || 0;
    });
    totalPointsDistributedDisplay.textContent = totalPoints;

    // Calcular compras realizadas
    const purchasesSnapshot = await db.collectionGroup('purchases').get();
    totalPurchasesDisplay.textContent = purchasesSnapshot.size;
}
