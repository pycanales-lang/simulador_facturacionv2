/**
 * SIMULADOR TELCO - ENGINE V3 (TIK-TIK PRECISION)
 */
const REGLAS_NEGOCIO = {
    HOME: {
        ciclos: {
            1:  { emision: 1,  vence: 15, corte: [3, 4] },
            7:  { emision: 7,  vence: 21, corte: [9, 10] },
            15: { emision: 15, vence: 1,  corte: [17, 18] },
            21: { emision: 21, vence: 5,  corte: [22, 23] }
        },
        config: { moneda: "LOCAL", cargo_administrativo: 12000 }
    }
};

// --- CONFIGURACIÓN TÁCTIL ---
let posActual = 0;
const TRACK_SCALE = 3; 
const UMBRAL_SNAP = 1.4; // Atrapado magnético
const PASO_TIEMPO = 0.5;  // Sensación de engranaje (tik-tik)

let fechaInstalacionGlobal = null;
let cicloActual = 1;

/**
 * Magnetismo Inteligente
 */
function aplicarSnap(pos) {
    const ids = ["fact", "vence", "corte", "fact2", "vence2", "corteT"];
    for (let id of ids) {
        let el = document.getElementById(id);
        if (el && el.style.display !== "none") {
            let hito = parseFloat(el.style.left);
            if (Math.abs(pos - hito) < UMBRAL_SNAP) return hito;
        }
    }
    return pos;
}

/**
 * Renderizado de Track con Compensación
 */
function renderTimeline(pos) {
    const track = document.getElementById("timelineTrack");
    // Fórmula de centrado playhead
    const offset = (50 - pos) * TRACK_SCALE;
    track.style.transform = `translateX(${offset}%)`;
    
    setPos("pay", "payLabel", pos, "P");
    actualizarDetalle();
}

function simular() {
    let fStr = document.getElementById("fecha").value;
    if (!fStr) return alert("Ingrese fecha");
    fechaInstalacionGlobal = new Date(fStr + 'T00:00:00');
    let dia = fechaInstalacionGlobal.getDate();
    
    // Asignación de ciclo comercial
    if (dia <= 6) cicloActual = 7; 
    else if (dia <= 14) cicloActual = 15; 
    else if (dia <= 20) cicloActual = 21; 
    else cicloActual = 1;

    // Posicionamiento de Hitos
    let posInst = (dia / 60) * 100;
    let posFact = (cicloActual <= dia && cicloActual !== 1) ? ((30 + cicloActual) / 60) * 100 : (cicloActual === 1 ? 52 : (cicloActual / 60) * 100);
    let diaV1 = REGLAS_NEGOCIO.HOME.ciclos[cicloActual].vence;
    let posV1 = posFact + (diaV1 < cicloActual ? (diaV1 + (30 - cicloActual)) / 60 * 100 : (diaV1 - cicloActual) / 60 * 100);
    let posC = posFact + (REGLAS_NEGOCIO.HOME.ciclos[cicloActual].corte[0] < cicloActual ? (REGLAS_NEGOCIO.HOME.ciclos[cicloActual].corte[0] + (30 - cicloActual)) / 60 * 100 : (REGLAS_NEGOCIO.HOME.ciclos[cicloActual].corte[0] - cicloActual) / 60 * 100);

    setPos("inst", "instLabel", posInst, "I");
    setPos("fact", "factLabel", posFact, "1");
    setPos("vence", "venceLabel", posV1, "V");
    setPos("corte", "corteLabel", posC, "C");
    
    document.getElementById("corte").style.display = "flex";
    document.getElementById("corteLabel").style.display = "block";
    document.getElementById("exoBar").style.left = posInst + "%";
    document.getElementById("exoBar").style.width = (posFact - posInst) + "%";
    document.getElementById("exoLabel").style.left = (posInst + (posFact - posInst)/2) + "%";

    posActual = posV1 - 5;
    renderTimeline(posActual);
}

function actualizarDetalle() {
    if (!fechaInstalacionGlobal) return;
    let p = parseFloat(document.getElementById("plan").value) || 0;
    let s = p - (parseFloat(document.getElementById("anticipo").value) || 0);
    let config = REGLAS_NEGOCIO.HOME.config;

    let posV1 = parseFloat(document.getElementById("vence").style.left);
    let posC = parseFloat(document.getElementById("corte").style.left);
    let posV2 = parseFloat(document.getElementById("vence2").style.left) || 100;

    let estado = "EN_PLAZO", color = "var(--success)", gestion = "Cliente al día.";

    if (posActual > posV1) {
        estado = "EN_MORA"; color = "var(--warning)"; gestion = "Gestión comercial: Recordar pago.";
    } 

    if (posActual >= posC) {
        estado = "CORTE_PARCIAL"; color = "var(--danger)"; gestion = "Servicio suspendido parcialmente.";
        expandirF2(posV1);
    } else contraerF2();

    if (posActual >= posV2) { estado = "CORTE_TOTAL"; color = "var(--dark-danger)"; gestion = "Baja total del servicio."; }

    let total = (estado === "EN_PLAZO") ? s : (s + p + config.cargo_administrativo);
    document.getElementById("info").innerHTML = `
        <div class="state-badge" style="background:${color}; color:${estado==='EN_MORA'?'#333':'white'}">${estado.replace("_"," ")}</div>
        <p style="font-size:12px; margin-bottom:5px; opacity:0.8">${gestion}</p>
        <div class="total-factura">${config.moneda} ${total.toLocaleString()}</div>
    `;
}

function expandirF2(v1) {
    let pf2 = v1 + 12, pv2 = pf2 + 15, pct = pv2 + 10;
    setPos("fact2", "fact2Label", pf2, "2");
    setPos("vence2", "vence2Label", pv2, "V");
    setPos("corteT", "corteTLabel", pct, "T");
    ["fact2","fact2Label","vence2","vence2Label","corteT","corteTLabel"].forEach(id => document.getElementById(id).style.display = id.includes("Label")?"block":"flex");
}

function contraerF2() {
    ["fact2","fact2Label","vence2","vence2Label","corteT","corteTLabel"].forEach(id => {
        let el = document.getElementById(id);
        if(el) el.style.display = "none";
    });
}

function setPos(id, label, pos, text) {
    let el = document.getElementById(id), lb = document.getElementById(label);
    if(el) { el.style.left = pos + "%"; lb.style.left = pos + "%"; el.innerHTML = text; }
}

// --- INTERACCIÓN MEJORADA (TIK-TIK) ---
const timeline = document.getElementById("timeline");
let isDragging = false;

const move = (e) => {
    if(!isDragging) return;
    let rect = timeline.getBoundingClientRect();
    let x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    
    // Cálculo con efecto engranaje
    let bruto = (x / rect.width) * 100;
    let step = Math.round(bruto / PASO_TIEMPO) * PASO_TIEMPO;
    
    posActual = aplicarSnap(Math.max(0, Math.min(98, step)));
    renderTimeline(posActual);
};

timeline.addEventListener("mousedown", (e) => { isDragging = true; move(e); });
window.addEventListener("mouseup", () => isDragging = false);
window.addEventListener("mousemove", move);
timeline.addEventListener("touchstart", (e) => { isDragging = true; move(e); });
window.addEventListener("touchend", () => isDragging = false);
window.addEventListener("touchmove", (e) => { if(isDragging) { e.preventDefault(); move(e); } }, {passive: false});

function abrirAyuda() { document.getElementById("modalAyuda").style.display = "flex"; }
function cerrarAyuda() { document.getElementById("modalAyuda").style.display = "none"; }
function limpiar() { location.reload(); }
