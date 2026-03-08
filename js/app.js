/**
 * SIMULADOR TELCO PRO - MOTOR SIEBEL 2026
 * Optimización: Snap Magnético y Sincronización Directa
 */

const REGLAS_NEGOCIO = {
    ciclos: {
        1:  { emision: 1,  vence: 15, corte: 3 },
        7:  { emision: 7,  vence: 22, corte: 9 },
        15: { emision: 15, vence: 30, corte: 17 },
        21: { emision: 21, vence: 5,  corte: 22 }
    },
    config: { cargo_adm: 12000 }
};

let posActual = 0, fechaInstalacionGlobal = null, cicloActual = 0, esCuentaNueva = false;

function obtenerCicloAsignado(dia) {
    if (dia <= 6) return 7; 
    if (dia <= 14) return 15; 
    if (dia <= 20) return 21; 
    return 1;
}

function simular() {
    const fStr = document.getElementById("fecha").value;
    if (!fStr) return alert("Seleccione fecha de instalación");

    fechaInstalacionGlobal = new Date(fStr + 'T00:00:00');
    const diaInst = fechaInstalacionGlobal.getDate();
    cicloActual = obtenerCicloAsignado(diaInst);

    // Cuenta nueva < 4 meses
    const hoy = new Date();
    const diffMeses = (hoy.getFullYear() - fechaInstalacionGlobal.getFullYear()) * 12 + (hoy.getMonth() - fechaInstalacionGlobal.getMonth());
    esCuentaNueva = diffMeses <= 4;

    actualizarMesesUI(false);

    // Posiciones Motor (Base 60 días)
    const posInst = (diaInst / 60) * 100;
    let posFact1 = (cicloActual <= diaInst && cicloActual !== 1) ? ((30 + cicloActual) / 60) * 100 : (cicloActual === 1 ? 52 : (cicloActual / 60) * 100);

    const regla = REGLAS_NEGOCIO.ciclos[cicloActual];
    let offsetVence = (regla.vence >= regla.emision) ? (regla.vence - regla.emision) : (30 - regla.emision + regla.vence);
    const posV1 = posFact1 + (offsetVence / 60 * 100);
    const posC1 = posFact1 + (32 / 60 * 100); // Promedio contable corte

    // Inyectar posiciones en el motor invisible para que la UX las lea
    document.getElementById("inst").style.left = posInst + "%";
    document.getElementById("fact").style.left = posFact1 + "%";
    document.getElementById("vence").style.left = posV1 + "%";
    document.getElementById("corte").style.left = posC1 + "%";
    
    // Posiciones del 2do mes
    document.getElementById("fact2").style.left = (posFact1 + 50) + "%";
    document.getElementById("vence2").style.left = (posV1 + 50) + "%";

    posActual = posInst;
    sincronizarUX(posActual);
}

function aplicarSnap(pos) {
    const hitos = [
        parseFloat(document.getElementById("inst").style.left) || 0,
        parseFloat(document.getElementById("fact").style.left) || 0,
        parseFloat(document.getElementById("vence").style.left) || 0,
        parseFloat(document.getElementById("corte").style.left) || 0
    ];
    const umbral = 1.6;
    for (const h of hitos) {
        if (Math.abs(pos - h) < umbral) return h;
    }
    return pos;
}

function sincronizarUX(pos) {
    posActual = aplicarSnap(pos);
    
    // 1. Actualizar Motor Base (Invisible)
    document.getElementById("pay").style.left = posActual + "%";
    
    // 2. Actualizar Capa UX Visual
    const slider = document.getElementById("timeSlider");
    if(slider) slider.value = posActual;

    const uxPago = document.getElementById("ux-pago");
    if(uxPago) uxPago.style.left = posActual + "%";

    const dayLabel = document.getElementById("ux-day");
    if(dayLabel) dayLabel.innerText = Math.round((posActual / 100) * 60);

    actualizarMensajesNegocio(posActual);
}

function actualizarMensajesNegocio(pos) {
    if (!fechaInstalacionGlobal) return;
    const p = parseFloat(document.getElementById("plan").value) || 0;
    const a = parseFloat(document.getElementById("anticipo").value) || 0;
    const saldoF1 = p - a;

    const posInst = parseFloat(document.getElementById("inst").style.left);
    const posFact1 = parseFloat(document.getElementById("fact").style.left);
    const posV1 = parseFloat(document.getElementById("vence").style.left);
    const posC1 = parseFloat(document.getElementById("corte").style.left);

    let estado = "EN PLAZO", color = "var(--success)", msg = "Servicio activo.";

    if (pos > posV1) { estado = "EN MORA"; color = "var(--warning)"; msg = "Pago atrasado."; }
    if (pos >= posC1) { 
        estado = "CORTE PARCIAL"; color = "var(--danger)"; msg = "Servicio suspendido.";
        if(esCuentaNueva) { estado = "EARLY CHURN"; color = "var(--dark-danger)"; }
    }

    const total = (estado === "EN PLAZO") ? saldoF1 : (saldoF1 + p + REGLAS_NEGOCIO.config.cargo_adm);

    // Actualizar Panel UX
    document.getElementById("infoUX").innerHTML = `
        <div class="state-badge" style="background:${color}; color:${estado === 'EN MORA' ? 'black' : 'white'}">${estado}</div>
        <span class="total-factura">Gs. ${total.toLocaleString()}</span>
    `;
    document.getElementById("ux-message").innerText = msg;
    document.getElementById("bannerChurnUX").style.display = (estado === "EARLY CHURN") ? "block" : "none";

    // Fechas en el tablero
    const fEmi = new Date(fechaInstalacionGlobal);
    fEmi.setDate(cicloActual);
    if (cicloActual <= fechaInstalacionGlobal.getDate()) fEmi.setMonth(fEmi.getMonth() + 1);

    document.getElementById("detalleFechasUX").innerHTML = `
        <div>🏠 Inst: <b>${fechaInstalacionGlobal.toLocaleDateString()}</b></div>
        <div>🧾 F1: <b>${fEmi.toLocaleDateString()}</b></div>
        <div>💰 Saldo: <b>Gs. ${saldoF1.toLocaleString()}</b></div>
    `;

    // Animación de iconos
    const hitosUX = ["ux-inst", "ux-fact1", "ux-vence", "ux-corte", "ux-fact2", "ux-vence2"];
    hitosUX.forEach(id => {
        const el = document.getElementById(id);
        if(!el) return;
        const basePos = parseFloat(document.getElementById(id.replace("ux-","").replace("1",""))?.style.left) || 0;
        if (pos >= (basePos - 0.5)) {
            el.style.opacity = "1"; el.style.transform = "translate(-50%, -50%) scale(1)";
        } else {
            el.style.opacity = "0.2"; el.style.transform = "translate(-50%, -50%) scale(0.7)";
        }
    });
}

// Escuchar Slider
document.addEventListener("DOMContentLoaded", () => {
    const slider = document.getElementById("timeSlider");
    if(slider) slider.addEventListener("input", (e) => sincronizarUX(parseFloat(e.target.value)));
});

function limpiar() { location.reload(); }
function abrirAyuda() { document.getElementById("modalAyuda").style.display = "flex"; }
function cerrarAyuda() { document.getElementById("modalAyuda").style.display = "none"; }
