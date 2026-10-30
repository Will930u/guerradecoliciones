// URL de tu servicio web en Render
const BACKEND_URL = "https://guerradecoliciones.onrender.com";

let supabase = null;

const authForm = document.getElementById('authForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const btnLogin = document.getElementById('btnLogin');
const btnSignup = document.getElementById('btnSignup');
const authMessage = document.getElementById('authMessage');

function showMessage(text, type = 'error') {
    authMessage.innerText = text;
    authMessage.className = `auth-message ${type}`;
}

// Consumir el endpoint /api/config de Render para obtener la configuración de Supabase
async function initSupabaseClient() {
    try {
        let response = await fetch(`${BACKEND_URL}/api/config`);
        let config = await response.json();

        if (config.supabase_url && config.supabase_anon_key) {
            supabase = window.supabase.createClient(config.supabase_url, config.supabase_anon_key);
        } else {
            showMessage("Falta configurar las variables de entorno en Render.");
        }
    } catch (error) {
        console.error("Error al conectar con Render:", error);
        showMessage("Error de conexión con el servidor de autenticación.");
    }
}

initSupabaseClient();

// Iniciar Sesión
btnLogin.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!supabase) {
        showMessage("Conectando con el servidor...");
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
        showMessage("Por favor ingresa correo y contraseña.");
        return;
    }

    showMessage("Iniciando sesión...", "success");

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        showMessage(error.message);
    } else {
        showMessage("¡Ingreso exitoso! Redirigiendo...", "success");
        localStorage.setItem('supabase_user_id', data.user.id);
        setTimeout(() => {
            window.location.href = "index.html";
        }, 1000);
    }
});

// Registrarse
btnSignup.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!supabase) {
        showMessage("Conectando con el servidor...");
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
        showMessage("Por favor ingresa correo y contraseña.");
        return;
    }

    showMessage("Creando cuenta...", "success");

    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
    });

    if (error) {
        showMessage(error.message);
    } else {
        showMessage("¡Cuenta registrada! Ya puedes iniciar sesión.", "success");
    }
});
