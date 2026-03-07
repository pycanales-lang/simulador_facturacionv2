/**
 * SIMULADOR DE FACTURACIÓN TELCO - MOTOR LÓGICO CONSOLIDADO
 * Versión: UX Optimized (Inicio en Instalación)
 */

const REGLAS_NEGOCIO = {
    HOME: {
        ciclos: {
            1:  { emision: 1,  vence: 15, pago_inicio: 1,  pago_fin: 14, corte: [3, 4] },
            7:  { emision: 7,  vence: 21, pago_inicio: 7,  pago_fin: 21, corte: [9, 10] },
            15: { emision: 15, vence: 1,  pago_inicio: 15, pago_fin: 1,  corte: [17, 18] },
            21: { emision: 21, vence: 5,  pago_inicio: 21, pago_fin: 4,  corte: [22, 23] }
        },
        config: {
            moneda: "LOCAL",
            cargo_administrativo: 12000
        }
    }
};

// Variables Globales de Estado
let posActual = 0;
let fechaInstalacionGlobal = null;
let cicloActual = 0;
let esCuentaNueva = false;
let isDragging = false;
let startX = 0;
let startPos = 0;

const TRACK_SCALE = 3;
const SNAP_THRESHOLD = 1.6; // Incrementado levemente para mejor agarre

/**
 * MOTOR DE CICLO: Determina el ciclo según el día de instalación
 */
function obtenerCicloAsignado(dia) {
    if (dia >= 1 && dia <= 6) return 7;
    if (dia >= 7 && dia <= 14) return 15;
    if (dia >= 15 && dia <= 20) return 21;
    return 1;
}

/**
 * MOTOR DE SIMULACIÓN: Inicia el proceso y posiciona hitos
 */
function simular() {
    const fStr = document.getElementById("fecha").value;
    if (!fStr) return alert("Ingrese fecha de instalación");

    fechaInstalacionGlobal = new Date(fStr + 'T00:00:00');
    const dia = fechaInstalacionGlobal.getDate();
    cicloActual = obtenerCicloAsignado(dia);

    // Verificar Early Churn (< 4 meses)
    const hoy = new Date();
    const mesesDiff = (hoy.getFullYear() - fechaInstalacionGlobal.getFullYear()) * 12 + (hoy.getMonth() - fechaInstalacionGlobal.getMonth());
    esCuentaNueva = mesesDiff <= 4;

    actualizarMeses(false);

    // Posicionamiento porcentual (Base 60 días)
    const posInst = (dia / 60) * 100;
    
    // Lógica de emisión factura 1
    let posFact = (cicloActual <= dia && cicloActual !== 1) 
        ? ((30 + cicloActual) / 60) * 100 
        : (cicloActual === 1 ? 52 : (cicloActual / 60) * 100);

    const reglas = REGLAS_NEGOCIO.HOME.ciclos[cicloActual];
    
    // Vencimiento 1
    const posV1 = posFact + (reglas.vence < cicloActual 
        ? (reglas.vence + (30 - cicloActual)) / 60 * 100 
        : (reglas.vence - cicloActual) / 60 * 100);
    
    // Corte Parcial
    const posC1 = posFact + (reglas.corte[0] < cicloActual 
        ? (reglas.corte[0] + (30 - cicloActual)) / 60 * 100 
        : (reglas.corte[0] - cicloActual) / 60 * 100);

    // Dibujar en Track
    setPos("inst", "instLabel", posInst, "I");
    setPos("fact", "factLabel", posFact, "1");
    setPos("vence", "venceLabel", posV1, "V");
    setPos("corte", "corteLabel", posC1, "C");

    // Exoneración bar
    const exoBar = document.getElementById("exoBar");
    exoBar.style.left = posInst + "%";
    exoBar.style.width = (posFact - posInst) + "%";
    document.getElementById("exoLabel").style.left = (posInst + (posFact - posInst) / 2) + "%";

    document.getElementById("corte").style.display = "flex";
    document.getElementById("corteLabel").style.display = "block";

    // --- MEJORA SOLICITADA ---
    // Posicionamos la aguja exactamente sobre la Instalación al iniciar
    posActual = posInst; 
    renderTimeline(posActual);
}

/**
 * MOTOR TIMELINE: Maneja el desplazamiento del track y el badge de días
 */
function renderTimeline(pos) {
    const track = document.getElementById("timelineTrack");
    const diaBadge = document.getElementById("diaBadge");

    // Snap a eventos cercanos
    posActual = aplicarSnap(pos);

    // Mover Track (Playhead fijo al 50%)
    const offset = (50 - posActual) * TRACK_SCALE;
    track.style.transform = `translateX(${offset}%)`;

    // Actualizar Badge de Días
    const diasSimulados = Math.round((posActual / 100) * 60);
    diaBadge.innerText = `Día ${diasSimulados}`;

    // Sincronizar Pago (P) con Aguja
    setPos("pay", "payLabel", posActual, "P");

    actualizarDetalle();
}

/**
 * MOTOR DRAG: Implementación de arrastre relativo
 */
const timeline = document.getElementById("timeline");

const startDrag = (e) => {
    isDragging = true;
    startX = e.touches ? e.touches[0].clientX : e.clientX;
    startPos = posActual;
};

const doDrag = (e) => {
    if (!isDragging) return;
    const currentX = e.touches ? e.touches[0].clientX : e.clientX;
    const deltaX = currentX - startX;
    const rect = timeline.getBoundingClientRect();
    
    const movimiento = (deltaX / rect.width) * 100 * 0.5;
    let nuevaPos = startPos - movimiento;
    
    renderTimeline(Math.max(0, Math.min(100, nuevaPos)));
};

const stopDrag = () => { isDragging = false; };

timeline.addEventListener("mousedown", startDrag);
window.addEventListener("mousemove", doDrag);
window.addEventListener("mouseup", stopDrag);
window.addEventListener("touchend", stopDrag);

timeline.addEventListener("touchstart", (e) => { startDrag(e); }, {passive: false});
window.addEventListener("touchmove", (e) => { if(isDragging) e.preventDefault(); doDrag(e); }, {passive: false});

/**
 * MOTOR ESTADOS Y FINANCIERO
 */
function actualizarDetalle() {
    if (!fechaInstalacionGlobal) return;

    const config = REGLAS_NEGOCIO.HOME.config;
    const p = parseFloat(document.getElementById("plan").value) || 0;
    const a = parseFloat(document.getElementById("anticipo").value) || 0;
    const s = p - a;

    const posV1 = parseFloat(document.getElementById("vence").style.left) || 0;
    const posC1 = parseFloat(document.getElementById("corte").style.left) || 0;
    const posV2 = parseFloat(document.getElementById("vence2").style.left) || 100;

    let estado = "EN_PLAZO";
    let color = "var(--success)";
    
    if (posActual > posV1) {
        estado = "EN_MORA";
        color = "var(--warning)";
        if (esCuentaNueva) document.getElementById("bannerChurn").style.display = "block";
    } else {
        document.getElementById("bannerChurn").style.display = "none";
    }

    if (posActual >= posC1) {
        estado = "CORTE_PARCIAL";
        color = "var(--danger)";
        expandirSegundaFactura(posV1);
    } else {
        contraerSegundaFactura();
    }

    if (posActual >= posV2) {
        estado = "CORTE_TOTAL";
        color = "var(--dark-danger)";
    }

    let totalDeuda = (estado === "EN_PLAZO") ? s : (s + p + config.cargo_administrativo);
    
    const gestion = {
        "EN_PLAZO": "Cliente al día. No requiere gestión.",
        "EN_MORA": "Gestión recomendada: contactar cliente antes del corte.",
        "CORTE_PARCIAL": "Servicio suspendido. Cliente debe regularizar deuda.",
        "CORTE_TOTAL": "Servicio cancelado por mora prolongada."
    };

    document.getElementById("info").innerHTML = `
        <div class="state-badge" style="background:${color}; color:${estado === 'EN_MORA' ? '#333' : 'white'}">
            ${estado.replace("_", " ")}
        </div>
        <p style="font-size:12px; margin-bottom:10px; opacity:0.9">${gestion[estado]}</p>
        <span class="total-factura">${config.moneda} ${totalDeuda.toLocaleString()}</span>
    `;

    const fEmi = new Date(fechaInstalacionGlobal);
    fEmi.setDate(cicloActual);
    if (cicloActual <= fechaInstalacionGlobal.getDate()) fEmi.setMonth(fEmi.getMonth() + 1);
    
    document.getElementById("detalleFacturacion").innerHTML = `
        <small>Emisión F1: ${fEmi.toLocaleDateString()}</small><br>
        <small>Saldo F1: ${config.moneda} ${s.toLocaleString()}</small>
    `;
}

/**
 * MOTOR EXPANSIÓN
 */
function expandirSegundaFactura(posV1) {
    const pF2 = posV1 + 12;
    const pV2 = pF2 + 15;
    const pCT = pV2 + 10;

    setPos("fact2", "fact2Label", pF2, "2");
    setPos("vence2", "vence2Label", pV2, "V");
    setPos("corteT", "corteTLabel", pCT, "T");

    ["fact2", "fact2Label", "vence2", "vence2Label", "corteT", "corteTLabel"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = id.includes("Label") ? "block" : "flex";
    });
    actualizarMeses(true);
}

function contraerSegundaFactura() {
    ["fact2", "fact2Label", "vence2", "vence2Label", "corteT", "corteTLabel"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
    });
    actualizarMeses(false);
}

/**
 * FUNCIONES AUXILIARES
 */
function setPos(id, lb, pos, txt) {
    const el = document.getElementById(id);
    const label = document.getElementById(lb);
    if (el) {
        el.style.left = pos + "%";
        el.innerHTML = txt;
    }
    if (label) label.style.left = pos + "%";
}

function aplicarSnap(pos) {
    // Añadido "inst" a los hitos magnéticos para mejor precisión inicial
    const hitos = ["inst", "fact", "vence", "corte", "fact2", "vence2", "corteT"];
    for (const id of hitos) {
        const el = document.getElementById(id);
        if (el && el.style.display !== "none") {
            const h = parseFloat(el.style.left) || 0;
            if (Math.abs(pos - h) < SNAP_THRESHOLD) return h;
        }
    }
    return pos;
}

function actualizarMeses(tresMeses) {
    if (!fechaInstalacionGlobal) return;
    const m = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const f1 = fechaInstalacionGlobal;
    const f2 = new Date(f1.getFullYear(), f1.getMonth() + 1, 1);
    const f3 = new Date(f1.getFullYear(), f1.getMonth() + 2, 1);
    
    document.getElementById("meses").innerHTML = `
        <span>${m[f1.getMonth()]}</span>
        <span>${m[f2.getMonth()]}</span>
        ${tresMeses ? `<span>${m[f3.getMonth()]}</span>` : ""}
    `;
}

function abrirAyuda() { document.getElementById("modalAyuda").style.display = "flex"; }
function cerrarAyuda() { document.getElementById("modalAyuda").style.display = "none"; }
function limpiar() { location.reload(); }
