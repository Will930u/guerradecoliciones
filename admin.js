// Conexión automática con la API oficial del dólar BCV
async function fetchBcvRate() {
    try {
        let response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
        let data = await response.json();
        if (data && data.promedio) {
            document.getElementById('adminBcvRate').innerText = `${data.promedio.toFixed(2)} VES`;
        } else {
            document.getElementById('adminBcvRate').innerText = "No disponible";
        }
    } catch (error) {
        console.error("Error al consultar la tasa BCV:", error);
        document.getElementById('adminBcvRate').innerText = "Error de Red";
    }
}

// Ejecutar al cargar la página del admin
fetchBcvRate();

// Funciones para aprobar o rechazar comprobantes de Pago Móvil
function approvePayment(btn) {
    let row = btn.closest('tr');
    alert("¡Pago aprobado con éxito! Saldo acreditado al usuario.");
    row.remove();
    updateCounts();
}

function rejectPayment(btn) {
    let row = btn.closest('tr');
    alert("Comprobante rechazado.");
    row.remove();
    updateCounts();
}

function updateCounts() {
    let tbody = document.getElementById('paymentsTableBody');
    let count = tbody.rows.length;
    document.getElementById('pendingPaymentsCount').innerText = count;
}