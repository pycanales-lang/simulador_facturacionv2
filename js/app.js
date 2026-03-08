/**
 * SIMULADOR TELCO PRO - MOTOR DINÁMICO SIEBEL 2026
 * Sincronización total de Timeline, Esferas y Mensajes de Negocio
 */

const REGLAS_NEGOCIO = {
    ciclos: {
        1:  { emision: 1,  vence: 15, corte: 3 }, // Mes siguiente
        7:  { emision: 7,  vence: 22, corte: 9 }, // Mes siguiente
        15: { emision: 15, vence: 30, corte: 17 }, // Mismo mes para vence, sig mes para corte
        21: { emision: 21, vence: 5,  corte: 22 }  // Mes siguiente
    },
    config: { cargo_adm: 12000 }
};

let posActual = 0, fechaInstalacionGlobal = null, cicloActual = 0, esCuentaNueva = false;
let isDragging = false, startX = 0, startPos = 0;

const TRACK_SCALE = 3; // Escala visual

function obtenerCicloAsignado(dia) {
    if (dia <= 6) return 7; 
    if (dia <= 14) return 15; 
    if (dia <= 20) return 21; 
    return 1;
}

// Función auxiliar para posicionar elementos (Requerida por el script)
function setPos(idEvent, idLabel, pos, texto) {
    const ev = document.getElementById(idEvent);
    const lb = document.getElementById(idLabel);
    if (ev) {
        ev.style.left = pos + "%";
        ev.style.display = "flex";
        if (texto) ev.innerText = texto;
    }
    if (lb) {
        lb.style.left = pos + "%";
        lb.style.display = "block";
    }
}

function simular() {
    const fStr = document.getElementById("fecha").value;
    if (!fStr) return alert("Seleccione fecha de instalación");

    // Corrección de lectura de fecha para evitar desfases de zona horaria
    const partes = fStr.split('-');
    fechaInstalacionGlobal = new Date(partes[0], partes[1] - 1, partes[2]);
    
    const diaInst = fechaInstalacionGlobal.getDate();
    cicloActual = obtenerCicloAsignado(diaInst);

    // Verificar Early Churn (< 4 meses desde hoy)
    const hoy = new Date();
    const diffMeses = (hoy.getFullYear() - fechaInstalacionGlobal.getFullYear()) * 12 + (hoy.getMonth() - fechaInstalacionGlobal.getMonth());
    esCuentaNueva = diffMeses <= 4;

    if (typeof actualizarMesesUI === "function") actualizarMesesUI(false);

    // --- CÁLCULO DE POSICIONES (Base 60 días para cubrir 2 meses) ---
    // Posición Instalación (Día del mes sobre 60 días)
    const posInst = (diaInst / 60) * 100;
    
    // Posición Factura 1 corregida para sincronía
    let diaFact1 = (cicloActual <= diaInst && cicloActual !== 1) ? (30 + cicloActual) : (cicloActual === 1 ? 31 : cicloActual);
    const posFact1 = (diaFact1 / 60) * 100;

    const regla = REGLAS_NEGOCIO.ciclos[cicloActual];
    
    // Posición Vencimiento 1
    let offsetVence = (regla.vence >= regla.emision) 
        ? (regla.vence - regla.emision)
        : (30 - regla.emision + regla.vence);
    const posV1 = posFact1 + (offsetVence / 60 * 100);
    
    // Posición Corte Parcial
    let offsetCorte = 32; // Mantengo tu promedio contable original
    const posC1 = posFact1 + (offsetCorte / 60 * 100);

    // Cálculos independientes para Segundo Ciclo
    const posFact2 = posFact1 + 50;
    const posV2 = posV1 + 50;
    const posC2 = posC1 + 50;

    // Renderizar Hitos
    setPos("inst", "instLabel", posInst, "🏠");
    setPos("fact", "factLabel", posFact1, "🧾");
    setPos("vence", "venceLabel", posV1, "📅");
    setPos("corte", "corteLabel", posC1, "🚫");
    
    // Elementos opcionales (Factura 2 y Vence 2)
    setPos("fact2", "fact2Label", posFact2, "🧾");
    setPos("vence2", "vence2Label", posV2, "📅");
    setPos("corteT", "corteTLabel", posC2, "🚫");

    // Barra de exoneración (Sincronizada entre I y 1)
    const exoBar = document.getElementById("exoBar");
    const exoLabel = document.getElementById("exoLabel");
    if(exoBar) {
        exoBar.style.left = posInst + "%";
        exoBar.style.width = (posFact1 - posInst) + "%";
        exoBar.style.display = "block";
    }
    if(exoLabel) {
        exoLabel.style.left = (posInst + (posFact1 - posInst) / 2) + "%";
        exoLabel.style.display = "block";
    }

    // INICIO: Posicionar aguja EXACTAMENTE sobre Instalación
    posActual = posInst;
    renderTimeline(posActual);
}

function renderTimeline(pos) {
    const track = document.getElementById("timelineTrack");
    const diaBadge = document.getElementById("diaBadge");

    // Movimiento del track
    const offset = (50 - pos) * TRACK_SCALE;
    track.style.transform = `translateX(${offset}%)`;

    // Sincronización del día calendario con la escala de 60 días
    const diaCalendario = Math.round((pos / 100) * 60);
    if(diaBadge) diaBadge.innerText = `Día ${diaCalendario}`;

    // La esfera de pago (💰) sigue a la aguja
    setPos("pay", "payLabel", pos, "💰");
    
    actualizarLogicaNegocio(pos);
}

function actualizarLogicaNegocio(pos) {
    if (!fechaInstalacionGlobal) return;

    const p = parseFloat(document.getElementById("plan").value) || 0;
    const a = parseFloat(document.getElementById("anticipo").value) || 0;
    const saldoF1 = p - a;

    // Obtener posiciones reales de los elementos para los mensajes
    const instEl = document.getElementById("inst");
    const factEl = document.getElementById("fact");
    const venceEl = document.getElementById("vence");
    const corteEl = document.getElementById("corte");

    const posInst = instEl ? parseFloat(instEl.style.left) : 0;
    const posFact1 = factEl ? parseFloat(factEl.style.left) : 0;
    const posV1 = venceEl ? parseFloat(venceEl.style.left) : 0;
    const posC1 = corteEl ? parseFloat(corteEl.style.left) : 0;

    let estado = "EN PLAZO", color = "var(--success)", mensaje = "";
    
    // 1. Días exonerados
    let diasExo = Math.round(((posFact1 - posInst) / 100) * 60);

    // Lógica de Mensajes
    if (pos < posInst) {
         mensaje = "Aún no instalado";
    } else if (pos >= posInst && pos < posFact1) {
        mensaje = "Servicio activo sin facturación.";
    } else if (pos >= posFact1 && pos <= posV1) {
        mensaje = "Factura emitida. Recordar pagar en fecha.";
    } else if (pos > posV1 && pos < posC1) {
        estado = "EN MORA"; color = "var(--warning)";
        mensaje = "Cliente con pago atrasado.";
    } else if (pos >= posC1) {
        estado = "CORTE PARCIAL"; color = "var(--danger)";
        mensaje = "Servicio suspendido.";
    }
    
    // Early Churn
    const banner = document.getElementById("bannerChurn");
    if (esCuentaNueva && pos >= posC1) {
         if(banner) banner.style.display = "block";
         estado = "EARLY CHURN";
         color = "#8b0000"; // dark-danger
         mensaje = "¡ALERTA! Riesgo alto de bajada temprana.";
    } else {
         if(banner) banner.style.display = "none";
    }

    // 4. Cálculo de Deuda
    const total = (pos < posFact1) ? saldoF1 : (saldoF1 + p + REGLAS_NEGOCIO.config.cargo_adm);

    // Impresión de resultados
    const infoDiv = document.getElementById("info");
    if(infoDiv) {
        infoDiv.innerHTML = `
            <div class="state-badge" style="background:${color}; color:${(estado === 'EN MORA') ? 'black' : 'white'}">${estado}</div>
            <p style="font-size:13px; font-weight:600">${mensaje}</p>
            <span class="total-factura">Gs. ${total.toLocaleString()}</span>
            <div style="font-size:12px; margin-top:5px; color:#ddd">Días exonerados: <strong>${Math.max(0, diasExo)}</strong></div>
        `;
    }
}

// Funciones de utilidad para el modal
function abrirAyuda() { document.getElementById("modalAyuda").style.display = "flex"; }
function cerrarAyuda() { document.getElementById("modalAyuda").style.display = "none"; }
function limpiar() { location.reload(); }
