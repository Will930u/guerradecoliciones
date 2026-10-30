// Conexión automática con la API oficial del dólar BCV y guardado en localStorage
async function fetchBcvRate() {
    try {
        let response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
        let data = await response.json();
        if (data && data.promedio) {
            let rate = data.promedio.toFixed(2);
            document.getElementById('adminBcvRate').innerText = `${rate} VES`;
            // Guardar la tasa actualizada para que el juego la lea
            localStorage.setItem('bcv_rate', rate);
        } else {
            document.getElementById('adminBcvRate').innerText = "No disponible";
        }
    } catch (error) {
        console.error("Error al consultar la tasa BCV:", error);
        document.getElementById('adminBcvRate').innerText = "Error de Red";
    }
}

// Ejecutar consulta de tasa al cargar la página
fetchBcvRate();

// Cargar en la tabla los pagos pendientes guardados desde el juego
function loadPendingPayments() {
    let payments = JSON.parse(localStorage.getItem('pending_payments') || '[]');
    let tbody = document.getElementById('paymentsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (payments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8;">No hay pagos pendientes por verificar.</td></tr>`;
        document.getElementById('pendingPaymentsCount').innerText = 0;
        return;
    }

    payments.forEach((p, index) => {
        let row = document.createElement('tr');
        row.innerHTML = `
            <td>${p.user || 'Jugador'}</td>
            <td>#${p.ref}</td>
            <td>${p.bank || 'Pago Móvil'}</td>
            <td>Bs. ${p.amount}</td>
            <td>
                <button class="btn-approve" onclick="approvePayment(${index})">Aprobar</button>
                <button class="btn-reject" onclick="rejectPayment(${index})">Rechazar</button>
            </td>
        `;
        tbody.appendChild(row);
    });

    document.getElementById('pendingPaymentsCount').innerText = payments.length;
}

// Cargar la lista al iniciar
loadPendingPayments();

// Escuchar si el juego agrega un nuevo pago en tiempo real
window.addEventListener('storage', (event) => {
    if (event.key === 'pending_payments') {
        loadPendingPayments();
    }
});

// Aprobar comprobante de Pago Móvil y acreditar saldo al juego en tiempo real
window.approvePayment = function(index) {
    let payments = JSON.parse(localStorage.getItem('pending_payments') || '[]');
    let approvedPayment = payments.splice(index, 1)[0];
    
    // Actualizar la lista en localStorage
    localStorage.setItem('pending_payments', JSON.stringify(payments));

    // Acreditar el saldo ($2.00 USD por recarga) al jugador
    let currentBalance = parseFloat(localStorage.getItem('player_balance') || '0');
    let newBalance = currentBalance + 2.00;
    localStorage.setItem('player_balance', newBalance.toString());

    // Enviar notificación de estado al juego
    localStorage.setItem('payment_status_msg', `¡Pago #${approvedPayment.ref} APROBADO! Se acreditaron $2.00 USD.`);

    alert(`¡Pago #${approvedPayment.ref} aprobado con éxito! Saldo acreditado al usuario.`);
    loadPendingPayments();
};

// Rechazar comprobante de Pago Móvil
window.rejectPayment = function(index) {
    let payments = JSON.parse(localStorage.getItem('pending_payments') || '[]');
    let rejected = payments.splice(index, 1)[0];
    
    // Actualizar la lista en localStorage
    localStorage.setItem('pending_payments', JSON.stringify(payments));

    // Enviar notificación de rechazo al juego
    localStorage.setItem('payment_status_msg', `El pago #${rejected.ref} fue RECHAZADO por el administrador.`);

    alert(`Comprobante #${rejected.ref} rechazado.`);
    loadPendingPayments();
};

// Función auxiliar para actualizar contadores
function updateCounts() {
    let payments = JSON.parse(localStorage.getItem('pending_payments') || '[]');
    let countElem = document.getElementById('pendingPaymentsCount');
    if (countElem) {
        countElem.innerText = payments.length;
    }
}
