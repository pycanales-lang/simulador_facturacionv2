/**
 * SIMULADOR DE FACTURACIÓN TELCO - FIX: SINCRONIZACIÓN TOTAL
 * Asegura que las esferas y los meses coincidan con la fecha de instalación.
 */

const REGLAS_NEGOCIO = {
    HOME: {
        ciclos: {
            1:  { emision: 1,  vence: 15, corte: [3, 4] },
            7:  { emision: 7,  vence: 21, corte: [9, 10] },
            15: { emision: 15, vence: 1,  corte: [17, 18] },
            21: { emision: 21, vence: 5,  corte: [22, 23] }
        },
        config: {
            moneda: "LOCAL",
            cargo_administrativo: 12000
        }
    }
};

let posActual = 0;
let fechaInstalacionGlobal = null;
let cicloActual = 0;
let isDragging = false;
let startX = 0;
let startPos = 0;

const TRACK_SCALE = 3;
const SNAP_THRESHOLD = 1.6;

function obtenerCicloAsignado(dia) {
    if (dia >= 1 && dia <= 6) return 7;
    if (dia >= 7 && dia <= 14) return 15;
    if (dia >= 15 && dia <= 20) return 21;
    return 1;
}

/**
 * MOTOR DE SIMULACIÓN CORREGIDO
 */
function simular() {
    const fStr = document.getElementById("fecha").value;
    if (!fStr) return alert("Ingrese fecha de instalación");

    // Forzamos la lectura de la fecha y reiniciamos el estado
    fechaInstalacionGlobal = new Date(fStr + 'T00:00:00');
    const dia = fechaInstalacionGlobal.getDate();
    cicloActual = obtenerCicloAsignado(dia);

    // 1. Actualizar los nombres de los meses en la cabecera inmediatamente
    actualizarMeses(false);

    // 2. Calcular posiciones relativas (Base 60 días)
    // posInst siempre será relativa al inicio del primer mes mostrado
    const posInst = (dia / 60) * 100;
    
    // Calcular Factura 1 basándose en el ciclo
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

    // 3. RE-RENDERIZAR ESFERAS (Sincronización visual)
    setPos("inst", "instLabel", posInst, "I");
    setPos("fact", "factLabel", posFact, "1");
    setPos("vence", "venceLabel", posV1, "V");
    setPos("corte", "corteLabel", posC1, "C");

    // Ajustar barra de exoneración
    const exoBar = document.getElementById("exoBar");
    exoBar.style.left = posInst + "%";
    exoBar.style.width = (posFact - posInst) + "%";
    document.getElementById("exoLabel").style.left = (posInst + (posFact - posInst) / 2) + "%";

    // 4. POSICIONAR AGUJA Y TRACK
    posActual = posInst; 
    renderTimeline(posActual);
}

function renderTimeline(pos) {
    const track = document.getElementById("timelineTrack");
    const diaBadge = document.getElementById("diaBadge");

    posActual = aplicarSnap(pos);

    const offset = (50 - posActual) * TRACK_SCALE;
    track.style.transform = `translateX(${offset}%)`;

    // El badge ahora muestra el día real del calendario
    const diasSimulados = Math.round((posActual / 100) * 60);
    diaBadge.innerText = `Día ${diasSimulados}`;

    setPos("pay", "payLabel", posActual, "P");
    actualizarDetalle();
}

/**
 * ACTUALIZACIÓN DE MESES DINÁMICA
 */
function actualizarMeses(tresMeses) {
    if (!fechaInstalacionGlobal) return;
    const nombresMeses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    
    const mes1 = fechaInstalacionGlobal.getMonth();
    const f2 = new Date(fechaInstalacionGlobal);
    f2.setMonth(f2.getMonth() + 1);
    const mes2 = f2.getMonth();
    const f3 = new Date(fechaInstalacionGlobal);
    f3.setMonth(f3.getMonth() + 2);
    const mes3 = f3.getMonth();
    
    document.getElementById("meses").innerHTML = `
        <span>${nombresMeses[mes1]}</span>
        <span>${nombresMeses[mes2]}</span>
        ${tresMeses ? `<span>${nombresMeses[mes3]}</span>` : ""}
    `;
}

// Motores de Drag (Sin cambios para mantener estabilidad)
const timeline = document.getElementById("timeline");
const startDrag = (e) => { isDragging = true; startX = e.touches ? e.touches[0].clientX : e.clientX; startPos = posActual; };
const doDrag = (e) => {
    if (!isDragging) return;
    const currentX = e.touches ? e.touches[0].clientX : e.clientX;
    const deltaX = currentX - startX;
    const rect = timeline.getBoundingClientRect();
    const movimiento = (deltaX / rect.width) * 100 * 0.5;
    renderTimeline(Math.max(0, Math.min(100, startPos - movimiento)));
};
const stopDrag = () => { isDragging = false; };

timeline.addEventListener("mousedown", startDrag);
window.addEventListener("mousemove", doDrag);
window.addEventListener("mouseup", stopDrag);
window.addEventListener("touchend", stopDrag);
timeline.addEventListener("touchstart", (e) => { startDrag(e); }, {passive: false});
window.addEventListener("touchmove", (e) => { if(isDragging) e.preventDefault(); doDrag(e); }, {passive: false});

function actualizarDetalle() {
    if (!fechaInstalacionGlobal) return;
    const p = parseFloat(document.getElementById("plan").value) || 0;
    const a = parseFloat(document.getElementById("anticipo").value) || 0;
    const s = p - a;
    const config = REGLAS_NEGOCIO.HOME.config;

    const posV1 = parseFloat(document.getElementById("vence").style.left) || 0;
    const posC1 = parseFloat(document.getElementById("corte").style.left) || 0;

    let estado = "EN_PLAZO";
    let color = "var(--success)";
    
    if (posActual > posV1) { estado = "EN_MORA"; color = "var(--warning)"; }
    if (posActual >= posC1) { estado = "CORTE_PARCIAL"; color = "var(--danger)"; expandirSegundaFactura(posV1); } 
    else { contraerSegundaFactura(); }

    let totalDeuda = (estado === "EN_PLAZO") ? s : (s + p + config.cargo_administrativo);
    
    document.getElementById("info").innerHTML = `
        <div class="state-badge" style="background:${color}; color:${estado === 'EN_MORA' ? '#333' : 'white'}">${estado.replace("_", " ")}</div>
        <span class="total-factura">${config.moneda} ${totalDeuda.toLocaleString()}</span>
    `;
}

function expandirSegundaFactura(posV1) {
    const pF2 = posV1 + 12; const pV2 = pF2 + 15; const pCT = pV2 + 10;
    setPos("fact2", "fact2Label", pF2, "2");
    setPos("vence2", "vence2Label", pV2, "V");
    setPos("corteT", "corteTLabel", pCT, "T");
    ["fact2", "fact2Label", "vence2", "vence2Label", "corteT", "corteTLabel"].forEach(id => {
        const el = document.getElementById(id); if (el) el.style.display = id.includes("Label") ? "block" : "flex";
    });
    actualizarMeses(true);
}

function contraerSegundaFactura() {
    ["fact2", "fact2Label", "vence2", "vence2Label", "corteT", "corteTLabel"].forEach(id => {
        const el = document.getElementById(id); if (el) el.style.display = "none";
    });
    actualizarMeses(false);
}

function setPos(id, lb, pos, txt) {
    const el = document.getElementById(id); const label = document.getElementById(lb);
    if (el) { el.style.left = pos + "%"; el.innerHTML = txt; }
    if (label) label.style.left = pos + "%";
}

function aplicarSnap(pos) {
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

function abrirAyuda() { document.getElementById("modalAyuda").style.display = "flex"; }
function cerrarAyuda() { document.getElementById("modalAyuda").style.display = "none"; }
function limpiar() { location.reload(); }
