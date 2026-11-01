const BACKEND_URL = 'https://guerradecoliciones.onrender.com';

let supabaseClient = null;

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const formTitle = document.getElementById('formTitle');
    const authMessage = document.getElementById('authMessage');
    const showRegister = document.getElementById('showRegister');
    const showLogin = document.getElementById('showLogin');
    const linkResetPassword = document.getElementById('linkResetPassword');

    function showMessage(text, type = 'error') {
        if (!authMessage) return;
        authMessage.innerText = text;
        authMessage.className = `auth-message ${type}`;
        authMessage.style.display = 'block';
    }

    if (showRegister) {
        showRegister.addEventListener('click', (event) => {
            event.preventDefault();
            if (loginForm) loginForm.style.display = 'none';
            if (registerForm) registerForm.style.display = 'block';
            if (formTitle) formTitle.innerText = 'Crea tu cuenta de jugador';
            if (authMessage) authMessage.style.display = 'none';
        });
    }

    if (showLogin) {
        showLogin.addEventListener('click', (event) => {
            event.preventDefault();
            if (registerForm) registerForm.style.display = 'none';
            if (loginForm) loginForm.style.display = 'block';
            if (formTitle) formTitle.innerText = 'Accede a tu cuenta para jugar';
            if (authMessage) authMessage.style.display = 'none';
        });
    }

    async function initSupabaseClient() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/config`);
            const config = await response.json();
            if (config.supabase_url && config.supabase_anon_key) {
                if (window.supabase) {
                    supabaseClient = window.supabase.createClient(config.supabase_url, config.supabase_anon_key);
                } else {
                    showMessage('Error crítico: La librería de Supabase no cargó en el navegador.');
                }
            } else {
                showMessage('Falta configurar variables de entorno en Render.');
            }
        } catch (error) {
            console.error('Error conectando con Render:', error);
            showMessage('Error de conexión con el servidor de autenticación.');
        }
    }

    initSupabaseClient();

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!supabaseClient) {
                showMessage('Conectando con el servidor, espera un momento...');
                return;
            }

            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value.trim();
            showMessage('Iniciando sesión...', 'success');

            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) {
                showMessage(error.message);
            } else {
                localStorage.setItem('supabase_user_id', data.user.id);
                showMessage('¡Ingreso exitoso! Redirigiendo...', 'success');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!supabaseClient) {
                showMessage('Conectando con el servidor, espera un momento...');
                return;
            }

            const username = document.getElementById('regUsername').value.trim();
            const email = document.getElementById('regEmail').value.trim();
            const idCard = document.getElementById('regIdCard').value.trim();
            const bankCode = document.getElementById('regBankCode').value.trim();
            const phone = document.getElementById('regPhone').value.trim();
            const password = document.getElementById('regPassword').value.trim();
            const confirmPassword = document.getElementById('regConfirmPassword').value.trim();

            if (password !== confirmPassword) {
                showMessage('Las contraseñas no coinciden.');
                return;
            }

            showMessage('Registrando cuenta...', 'success');

            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username,
                        id_card: idCard,
                        bank_code: bankCode,
                        phone_number: phone,
                    }
                }
            });

            if (error) {
                showMessage(error.message);
            } else {
                showMessage('¡Cuenta registrada con éxito! Ya puedes iniciar sesión.', 'success');
                setTimeout(() => {
                    if (showLogin) showLogin.click();
                }, 1500);
            }
        });
    }

    if (linkResetPassword) {
        linkResetPassword.addEventListener('click', async (event) => {
            event.preventDefault();
            if (!supabaseClient) {
                showMessage('Conectando con el servidor...');
                return;
            }

            const emailInput = document.getElementById('loginEmail');
            const email = emailInput ? emailInput.value.trim() : '';
            if (!email) {
                showMessage('Ingresa tu correo en el campo superior para enviarte el enlace.');
                return;
            }

            showMessage('Enviando correo de recuperación...', 'success');
            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/reset-password.html',
            });

            if (error) {
                showMessage(error.message);
            } else {
                showMessage('¡Enlace enviado! Revisa tu bandeja de entrada o Spam.', 'success');
            }
        });
    }
});
