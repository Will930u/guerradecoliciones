const BACKEND_URL = "https://guerradecoliciones.onrender.com";

// Declaración única de la variable supabase
let supabase = null;

// Elementos de la interfaz
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const formTitle = document.getElementById('formTitle');
const authMessage = document.getElementById('authMessage');

const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');
const linkResetPassword = document.getElementById('linkResetPassword');

function showMessage(text, type = 'error') {
    authMessage.innerText = text;
    authMessage.className = `auth-message ${type}`;
    authMessage.style.display = 'block';
}

// Alternar entre Vistas (Login <-> Registro)
showRegister.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    formTitle.innerText = "Crea tu cuenta de jugador";
    authMessage.style.display = 'none';
});

showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
    formTitle.innerText = "Accede a tu cuenta para jugar";
    authMessage.style.display = 'none';
});

// Inicializar cliente desde Render
async function initSupabaseClient() {
    try {
        let response = await fetch(`${BACKEND_URL}/api/config`);
        let config = await response.json();

        if (config.supabase_url && config.supabase_anon_key) {
            supabase = window.supabase.createClient(config.supabase_url, config.supabase_anon_key);
        } else {
            showMessage("Falta configurar variables en Render.");
        }
    } catch (error) {
        console.error("Error al conectar con Render:", error);
        showMessage("Error de conexión con el servidor.");
    }
}

initSupabaseClient();

// 1. INICIAR SESIÓN
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!supabase) return showMessage("Conectando con el servidor...");

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    showMessage("Iniciando sesión...", "success");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        showMessage(error.message);
    } else {
        showMessage("¡Ingreso exitoso! Redirigiendo...", "success");
        localStorage.setItem('supabase_user_id', data.user.id);
        setTimeout(() => { window.location.href = "index.html"; }, 1000);
    }
});

// 2. REGISTRARSE CON METADATOS COMPLETOS
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!supabase) return showMessage("Conectando con el servidor...");

    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const idCard = document.getElementById('regIdCard').value.trim();
    const bankCode = document.getElementById('regBankCode').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const confirmPassword = document.getElementById('regConfirmPassword').value.trim();

    if (password !== confirmPassword) {
        showMessage("Las contraseñas no coinciden.");
        return;
    }

    showMessage("Registrando cuenta...", "success");

    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                username: username,
                id_card: idCard,
                bank_code: bankCode,
                phone_number: phone
            }
        }
    });

    if (error) {
        showMessage(error.message);
    } else {
        showMessage("¡Cuenta registrada con éxito! Ya puedes iniciar sesión.", "success");
        setTimeout(() => { showLogin.click(); }, 1500);
    }
});

// 3. RECUPERAR CONTRASEÑA VÍA CORREO
linkResetPassword.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!supabase) return showMessage("Conectando con el servidor...");

    const email = document.getElementById('loginEmail').value.trim();

    if (!email) {
        showMessage("Ingresa tu correo en el campo superior para enviarte el enlace.");
        return;
    }

    showMessage("Enviando correo de recuperación...", "success");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password.html',
    });

    if (error) {
        showMessage(error.message);
    } else {
        showMessage("¡Enlace enviado! Revisa tu bandeja de entrada o Spam.", "success");
    }
});
