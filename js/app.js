/**
 * SIMULADOR TELCO PRO - MOTOR DINÁMICO SIEBEL 2026
 * Sincronización total de Timeline, Esferas y Mensajes de Negocio
 */

const REGLAS_NEGOCIO = {
    ciclos: {
        1:  { emision: 1,  vence: 15, corte: 22 },
        7:  { emision: 7,  vence: 21, corte: 9 }, // Del mes siguiente
        15: { emision: 15, vence: 1,  corte: 17 }, // Del mes siguiente
        21: { emision: 21, vence: 5,  corte: 22 }  // Del mes siguiente
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

function simular() {
    const fStr = document.getElementById("fecha").value;
    if (!fStr) return alert("Seleccione fecha de instalación");

    fechaInstalacionGlobal = new Date(fStr + 'T00:00:00');
    const diaInst = fechaInstalacionGlobal.getDate();
    cicloActual = obtenerCicloAsignado(diaInst);

    // Verificar Early Churn (< 4 meses desde hoy)
    const hoy = new Date();
    const diffMeses = (hoy.getFullYear() - fechaInstalacionGlobal.getFullYear()) * 12 + (hoy.getMonth() - fechaInstalacionGlobal.getMonth());
    esCuentaNueva = diffMeses <= 4;

    actualizarMesesUI(false);

    // --- CÁLCULO DE POSICIONES (Base 60 días para cubrir 2 meses) ---
    // Posición Instalación (Día 0 de la simulación)
    const posInst = (diaInst / 60) * 100;
    
    // Posición Factura 1 (Ciclo más cercano)
    let posFact1 = (cicloActual <= diaInst && cicloActual !== 1) 
        ? ((30 + cicloActual) / 60) * 100 
        : (cicloActual === 1 ? 52 : (cicloActual / 60) * 100);

    const regla = REGLAS_NEGOCIO.ciclos[cicloActual];
    
    // Posición Vencimiento 1
    const posV1 = posFact1 + (regla.vence < cicloActual 
        ? (regla.vence + (30 - cicloActual)) / 60 * 100 
        : (regla.vence - cicloActual) / 60 * 100);
    
    // Posición Corte Parcial
    const posC1 = posFact1 + (regla.corte < cicloActual 
        ? (regla.corte + (30 - cicloActual)) / 60 * 100 
        : (regla.corte - cicloActual) / 60 * 100);

    // Renderizar Hitos en el Track
    setPos("inst", "instLabel", posInst, "I");
    setPos("fact", "factLabel", posFact1, "1");
    setPos("vence", "venceLabel", posV1, "V");
    setPos("corte", "corteLabel", posC1, "C");

    // Barra de exoneración (Entre I y 1)
    const exoBar = document.getElementById("exoBar");
    exoBar.style.left = posInst + "%";
    exoBar.style.width = (posFact1 - posInst) + "%";

    // INICIO: Posicionar aguja sobre Instalación
    posActual = posInst;
    renderTimeline(posActual);
}

function renderTimeline(pos) {
    const track = document.getElementById("timelineTrack");
    const diaBadge = document.getElementById("diaBadge");

    // Movimiento del track para que la aguja central coincida con 'pos'
    const offset = (50 - pos) * TRACK_SCALE;
    track.style.transform = `translateX(${offset}%)`;

    // Calcular días transcurridos desde el inicio del mes 1
    const diaCalendario = Math.round((pos / 100) * 60);
    diaBadge.innerText = `Día ${diaCalendario}`;

    setPos("pay", "payLabel", pos, "P");
    actualizarLogicaNegocio(pos);
}

function actualizarLogicaNegocio(pos) {
    if (!fechaInstalacionGlobal) return;

    const p = parseFloat(document.getElementById("plan").value) || 0;
    const a = parseFloat(document.getElementById("anticipo").value) || 0;
    const saldoF1 = p - a;

    const posInst = parseFloat(document.getElementById("inst").style.left);
    const posFact1 = parseFloat(document.getElementById("fact").style.left);
    const posV1 = parseFloat(document.getElementById("vence").style.left);
    const posC1 = parseFloat(document.getElementById("corte").style.left);

    let estado = "EN PLAZO", color = "var(--success)", mensaje = "";
    
    // 1. Mensaje de Exoneración (Mientras esté entre Instalación y Factura 1)
    if (pos >= posInst && pos < posFact1) {
        const diasExo = Math.round(((posFact1 - posInst) / 100) * 60);
        mensaje = `Días exonerados: ${diasExo} (desde instalación hasta emisión).`;
    }

    // 2. Lógica de Mora
    if (pos > posV1) {
        estado = "EN MORA"; color = "var(--warning)";
        mensaje = "⚠ Cliente superó fecha de vencimiento. Genera cargo administrativo.";
        if (esCuentaNueva) document.getElementById("bannerChurn").style.display = "block";
    } else {
        document.getElementById("bannerChurn").style.display = "none";
    }

    // 3. Lógica de Corte y 2da Factura
    if (pos >= posC1) {
        estado = "CORTE PARCIAL"; color = "var(--danger)";
        mensaje = "🚨 Servicio Suspendido. Se emite 2da factura con saldo pendiente.";
        mostrarSegundaFactura(posV1);
    } else {
        ocultarSegundaFactura();
    }

    // 4. Cálculo de Deuda
    const total = (estado === "EN PLAZO") ? saldoF1 : (saldoF1 + p + REGLAS_NEGOCIO.config.cargo_adm);

    document.getElementById("info").innerHTML = `
        <div class="state-badge" style="background:${color}; color:${estado === 'EN MORA' ? 'black' : 'white'}">${estado}</div>
        <p style="font-size:13px; font-weight:600">${mensaje}</p>
        <span class="total-factura">Gs. ${total.toLocaleString()}</span>
    `;

    // Detalle de fechas (Regla de Oro)
    const fEmi = new Date(fechaInstalacionGlobal);
    fEmi.setDate(cicloActual);
    if (cicloActual <= fechaInstalacionGlobal.getDate()) fEmi.setMonth(fEmi.getMonth() + 1);

    document.getElementById("detalleFacturacion").innerHTML = `
        Ciclo: <strong>${cicloActual}</strong> | Emisión F1: <strong>${fEmi.toLocaleDateString()}</strong><br>
        Saldo inicial: <strong>Gs. ${saldoF1.toLocaleString()}</strong>
    `;
}

// --- FUNCIONES DE CONTROL VISUAL ---

function mostrarSegundaFactura(posV1) {
    const pF2 = posV1 + 10;
    const pV2 = pF2 + 15;
    const pCT = pV2 + 8;
    setPos("fact2", "fact2Label", pF2, "2");
    setPos("vence2", "vence2Label", pV2, "V");
    setPos("corteT", "corteTLabel", pCT, "T");
    ["fact2", "fact2Label", "vence2", "vence2Label", "corteT", "corteTLabel", "corte", "corteLabel"].forEach(id => {
        const el = document.getElementById(id); if (el) el.style.display = id.includes("Label") ? "block" : "flex";
    });
    actualizarMesesUI(true);
}

function ocultarSegundaFactura() {
    ["fact2", "fact2Label", "vence2", "vence2Label", "corteT", "corteTLabel"].forEach(id => {
        const el = document.getElementById(id); if (el) el.style.display = "none";
    });
    actualizarMesesUI(false);
}

function setPos(id, lb, pos, txt) {
    const e = document.getElementById(id), l = document.getElementById(lb);
    if (e) { e.style.left = pos + "%"; e.innerHTML = txt; }
    if (l) l.style.left = pos + "%";
}

function actualizarMesesUI(tresMeses) {
    if (!fechaInstalacionGlobal) return;
    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const m1 = fechaInstalacionGlobal.getMonth();
    const m2 = (m1 + 1) % 12;
    const m3 = (m1 + 2) % 12;
    document.getElementById("meses").innerHTML = `
        <span>${meses[m1]}</span><span>${meses[m2]}</span>${tresMeses ? `<span>${meses[m3]}</span>` : ""}
    `;
}

// Interacción Drag
const timeline = document.getElementById("timeline");
const dragStart = (e) => { isDragging = true; startX = e.touches ? e.touches[0].clientX : e.clientX; startPos = posActual; timeline.style.cursor = "grabbing"; };
const dragMove = (e) => {
    if (!isDragging) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const rect = timeline.getBoundingClientRect();
    const delta = ((x - startX) / rect.width) * 100 * 0.5;
    posActual = Math.max(0, Math.min(100, startPos - delta));
    renderTimeline(posActual);
};
const dragEnd = () => { isDragging = false; timeline.style.cursor = "grab"; };

timeline.addEventListener("mousedown", dragStart);
window.addEventListener("mousemove", dragMove);
window.addEventListener("mouseup", dragEnd);
timeline.addEventListener("touchstart", dragStart, { passive: false });
window.addEventListener("touchmove", (e) => { if (isDragging) e.preventDefault(); dragMove(e); }, { passive: false });
window.addEventListener("touchend", dragEnd);

function limpiar() { location.reload(); }
function abrirAyuda() { document.getElementById("modalAyuda").style.display = "flex"; }
function cerrarAyuda() { document.getElementById("modalAyuda").style.display = "none"; }
