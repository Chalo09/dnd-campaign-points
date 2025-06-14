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

// Variables globales
let currentUser = null;
let userPoints = 0;

// Items de la tienda (basados en tu tabla)
const shopItems = [
    {
        id: 'inspiration',
        name: 'Punto de Inspiración',
        price: 5,
        description: 'Máximo 1 acumulado',
        icon: '✨'
    },
    {
        id: 'healing_minor',
        name: 'Poción de Curación Menor',
        price: 5,
        description: '2d4+2 HP',
        icon: '🧪'
    },
    {
        id: 'healing_moderate',
        name: 'Poción de Curación Moderada',
        price: 10,
        description: '4d4+4 HP',
        icon: '🍶'
    },
    {
        id: 'magic_common',
        name: 'Item Común Mágico',
        price: 15,
        description: 'A elección (necesita aprobación del DM)',
        icon: '⚡'
    },
    {
        id: 'magic_uncommon',
        name: 'Item Poco Común Mágico',
        price: 20,
        description: 'Aleatorio de tabla',
        icon: '🔮'
    },
    {
        id: 'bonus_roll',
        name: '+1 a una Tirada',
        price: 3,
        description: 'Se declara antes de tirar (una vez)',
        icon: '🎲'
    },
    {
        id: 'revive',
        name: 'Revivir con 1 HP',
        price: 25,
        description: 'Solo una vez por sesión tras caer',
        icon: '💖'
    },
    {
        id: 'extra_spell',
        name: 'Hechizo Extra',
        price: 8,
        description: 'Nivel 1-2, una vez (solo lanzadores)',
        icon: '📜'
    },
    {
        id: 'lore_info',
        name: 'Información Extra del Mundo',
        price: 2,
        description: 'DM da pista o revela información',
        icon: '📚'
    },
    {
        id: 'social_pass',
        name: 'Pasaje Automático Prueba Social',
        price: 12,
        description: 'No funciona con bosses o pruebas críticas',
        icon: '🗣️'
    }
];

// Elementos del DOM
const loginSection = document.getElementById('loginSection');
const mainContent = document.getElementById('mainContent');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const showRegisterLink = document.getElementById('showRegister');
const userPointsDisplay = document.getElementById('userPoints');
const playerNameDisplay = document.getElementById('playerNameDisplay');
const shopItemsContainer = document.getElementById('shopItems');
const purchaseModal = document.getElementById('purchaseModal');

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    renderShopItems();
});

// Inicializar la aplicación
function initializeApp() {
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            showMainContent();
            loadUserData();
        } else {
            currentUser = null;
            showLoginSection();
        }
    });
}

// Configurar event listeners
function setupEventListeners() {
    // Login/Logout
    loginBtn.addEventListener('click', () => showLoginSection());
    logoutBtn.addEventListener('click', logout);

    // Formularios
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);

    // Mostrar/ocultar registro
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        toggleRegisterForm();
    });

    // Modal
    const closeModal = document.querySelector('.close');
    const cancelPurchase = document.getElementById('cancelPurchase');
    const confirmPurchase = document.getElementById('confirmPurchase');

    closeModal.addEventListener('click', () => hideModal());
    cancelPurchase.addEventListener('click', () => hideModal());
    confirmPurchase.addEventListener('click', handlePurchaseConfirm);

    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', (e) => {
        if (e.target === purchaseModal) {
            hideModal();
        }
    });
}

// Funciones de autenticación
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        showLoading(loginForm);
        await auth.signInWithEmailAndPassword(email, password);
        showSuccessMessage('¡Bienvenido de vuelta, aventurero!');
    } catch (error) {
        showErrorMessage(getErrorMessage(error.code));
    } finally {
        hideLoading(loginForm);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const playerName = document.getElementById('playerName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    try {
        showLoading(registerForm);
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);

        // Crear documento del usuario en Firestore
        await db.collection('players').doc(userCredential.user.uid).set({
            name: playerName,
            email: email,
            points: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            purchases: []
        });

        showSuccessMessage('¡Cuenta creada exitosamente! Bienvenido a la aventura.');
    } catch (error) {
        showErrorMessage(getErrorMessage(error.code));
    } finally {
        hideLoading(registerForm);
    }
}

async function logout() {
    try {
        await auth.signOut();
        showSuccessMessage('¡Hasta la próxima aventura!');
    } catch (error) {
        showErrorMessage('Error al cerrar sesión');
    }
}

// Funciones de UI
function showLoginSection() {
    loginSection.style.display = 'block';
    mainContent.style.display = 'none';
    loginBtn.style.display = 'none';
    logoutBtn.style.display = 'none';
}

function showMainContent() {
    loginSection.style.display = 'none';
    mainContent.style.display = 'block';
    loginBtn.style.display = 'none';
    logoutBtn.style.display = 'inline-block';
}

function toggleRegisterForm() {
    const isHidden = registerForm.style.display === 'none';
    registerForm.style.display = isHidden ? 'block' : 'none';
    loginForm.style.display = isHidden ? 'none' : 'block';
    showRegisterLink.textContent = isHidden ? 'Ya tengo cuenta' : 'Regístrate aquí';
}

// Cargar datos del usuario
async function loadUserData() {
    try {
        const userDoc = await db.collection('players').doc(currentUser.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            userPoints = userData.points || 0;
            userPointsDisplay.textContent = userPoints;
            playerNameDisplay.textContent = userData.name || 'Aventurero';
        }
    } catch (error) {
        console.error('Error cargando datos del usuario:', error);
        showErrorMessage('Error cargando tus datos');
    }
}

// Renderizar items de la tienda
function renderShopItems() {
    shopItemsContainer.innerHTML = '';

    shopItems.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'shop-item';
        itemElement.innerHTML = `
            <h3>${item.icon} ${item.name}</h3>
            <div class="shop-item-price">${item.price} puntos</div>
            <div class="shop-item-description">${item.description}</div>
            <button class="btn btn-primary" onclick="showPurchaseModal('${item.id}')">
                Comprar
            </button>
        `;
        shopItemsContainer.appendChild(itemElement);
    });
}

// Sistema de compras
let selectedItem = null;

function showPurchaseModal(itemId) {
    if (!currentUser) {
        showErrorMessage('Debes iniciar sesión para comprar');
        return;
    }

    selectedItem = shopItems.find(item => item.id === itemId);
    if (!selectedItem) return;

    if (userPoints < selectedItem.price) {
        showErrorMessage('No tienes suficientes puntos para esta compra');
        return;
    }

    document.getElementById('purchaseText').innerHTML = `
        ¿Confirmas la compra de <strong>${selectedItem.name}</strong>?<br>
        Costo: <strong>${selectedItem.price} puntos</strong><br>
        Puntos actuales: <strong>${userPoints}</strong><br>
        Puntos después: <strong>${userPoints - selectedItem.price}</strong>
    `;

    purchaseModal.style.display = 'block';
}

async function handlePurchaseConfirm() {
    if (!selectedItem || !currentUser) return;

    try {
        showLoading(document.querySelector('.modal-content'));

        // Actualizar puntos en Firestore
        const newPoints = userPoints - selectedItem.price;
       const purchaseData = {
    itemId: selectedItem.id,
    itemName: selectedItem.name,
    price: selectedItem.price,
    timestamp: new Date() // ✅ USAR Date() EN LUGAR DE serverTimestamp()
};

        await db.collection('players').doc(currentUser.uid).update({
            points: newPoints,
            purchases: firebase.firestore.FieldValue.arrayUnion(purchaseData)
        });

        // Actualizar UI
        userPoints = newPoints;
        userPointsDisplay.textContent = userPoints;

        hideModal();
        showSuccessMessage(`¡Has comprado ${selectedItem.name}! El DM será notificado.`);

        // Notificar al DM (opcional - puedes implementar esto)
        await notifyDM(purchaseData);

    } catch (error) {
        console.error('Error en la compra:', error);
        showErrorMessage('Error procesando la compra');
    } finally {
        hideLoading(document.querySelector('.modal-content'));
    }
}

// Notificar al DM (función opcional)
async function notifyDM(purchaseData) {
    try {
        await db.collection('dm_notifications').add({
            playerId: currentUser.uid,
            playerName: playerNameDisplay.textContent,
            purchase: purchaseData,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            read: false
        });
    } catch (error) {
        console.error('Error notificando al DM:', error);
    }
}

function hideModal() {
    purchaseModal.style.display = 'none';
    selectedItem = null;
}

// Funciones de utilidad
function showLoading(element) {
    element.classList.add('loading');
}

function hideLoading(element) {
    element.classList.remove('loading');
}

function showSuccessMessage(message) {
    showMessage(message, 'success');
}

function showErrorMessage(message) {
    showMessage(message, 'error');
}

function showMessage(message, type) {
    // Remover mensajes anteriores
    const existingMessages = document.querySelectorAll('.success-message, .error-message');
    existingMessages.forEach(msg => msg.remove());

    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'success' ? 'success-message' : 'error-message';
    messageDiv.textContent = message;

    // Insertar al principio del contenido principal
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(messageDiv, container.firstChild);

        // Remover después de 5 segundos
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
}

function getErrorMessage(errorCode) {
    const errorMessages = {
        'auth/user-not-found': 'Usuario no encontrado',
        'auth/wrong-password': 'Contraseña incorrecta',
        'auth/email-already-in-use': 'Este correo ya está registrado',
        'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
        'auth/invalid-email': 'Correo electrónico inválido'
    };

    return errorMessages[errorCode] || 'Error desconocido';
}

// Función para que el DM agregue puntos (solo para desarrollo/testing)
window.addPointsToPlayer = async function(playerId, points, reason = 'Recompensa del DM') {
    try {
        const playerRef = db.collection('players').doc(playerId);
        const playerDoc = await playerRef.get();

        if (playerDoc.exists) {
            const currentPoints = playerDoc.data().points || 0;
            await playerRef.update({
                points: currentPoints + points,
                lastPointsAdded: {
                    amount: points,
                    reason: reason,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                }
            });
            console.log(`Se agregaron ${points} puntos al jugador ${playerId}`);
        }
    } catch (error) {
        console.error('Error agregando puntos:', error);
    }
};
