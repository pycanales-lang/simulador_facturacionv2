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

let posActual = 0;
const TRACK_SCALE = 3; 
const UMBRAL_SNAP = 1.2;
let fechaInstalacionGlobal = null;
let esCuentaNueva = false;
let cicloActual = 1;

/**
 * Motor de Magnetismo (Snap)
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
 * Renderizado de la Timeline Desplazable con Aguja Fija
 */
function renderTimeline(pos) {
    const track = document.getElementById("timelineTrack");
    // Movemos el track: el 50% es el playhead central
    const offset = (50 - pos) * TRACK_SCALE;
    track.style.transform = `translateX(${offset}%)`;
    
    // El punto P se mueve síncronamente con el input invisible
    setPos("pay", "payLabel", pos, "P");
    actualizarDetalle();
}

function simular() {
    let fStr = document.getElementById("fecha").value;
    if (!fStr) return alert("Ingrese fecha");
    fechaInstalacionGlobal = new Date(fStr + 'T00:00:00');
    let dia = fechaInstalacionGlobal.getDate();
    
    // Lógica de asignación de ciclo
    if (dia <= 6) cicloActual = 7; 
    else if (dia <= 14) cicloActual = 15; 
    else if (dia <= 20) cicloActual = 21; 
    else cicloActual = 1;

    let hoy = new Date();
    esCuentaNueva = ((hoy.getFullYear() - fechaInstalacionGlobal.getFullYear()) * 12 + (hoy.getMonth() - fechaInstalacionGlobal.getMonth())) <= 4;

    // Posiciones base (%)
    let posInst = (dia / 60) * 100;
    let posFact = (cicloActual <= dia && cicloActual !== 1) ? ((30 + cicloActual) / 60) * 100 : (cicloActual === 1 ? 52 : (cicloActual / 60) * 100);
    let diaV1 = REGLAS_NEGOCIO.HOME.ciclos[cicloActual].vence;
    let posV1 = posFact + (diaV1 < cicloActual ? (diaV1 + (30 - cicloActual)) / 60 * 100 : (diaV1 - cicloActual) / 60 * 100);
    let posC = posFact + (REGLAS_NEGOCIO.HOME.ciclos[cicloActual].corte[0] < cicloActual ? (REGLAS_NEGOCIO.HOME.ciclos[cicloActual].corte[0] + (30 - cicloActual)) / 60 * 100 : (REGLAS_NEGOCIO.HOME.ciclos[cicloActual].corte[0] - cicloActual) / 60 * 100);

    // Dibujar en Track
    setPos("inst", "instLabel", posInst, "I");
    setPos("fact", "factLabel", posFact, "1");
    setPos("vence", "venceLabel", posV1, "V");
    setPos("corte", "corteLabel", posC, "C");
    document.getElementById("corte").style.display = "flex";
    document.getElementById("corteLabel").style.display = "block";

    let exoBar = document.getElementById("exoBar");
    exoBar.style.left = posInst + "%";
    exoBar.style.width = (posFact - posInst) + "%";
    document.getElementById("exoLabel").style.left = (posInst + (posFact - posInst)/2) + "%";

    posActual = posV1 - 5;
    renderTimeline(posActual);
    actualizarMeses(false);
}

function actualizarDetalle() {
    if (!fechaInstalacionGlobal) return;
    let p = parseFloat(document.getElementById("plan").value) || 0;
    let a = parseFloat(document.getElementById("anticipo").value) || 0;
    let s = p - a;
    let config = REGLAS_NEGOCIO.HOME.config;

    let posV1 = parseFloat(document.getElementById("vence").style.left);
    let posC = parseFloat(document.getElementById("corte").style.left);
    let posV2 = parseFloat(document.getElementById("vence2").style.left) || 100;

    let estado = "EN_PLAZO", color = "var(--success)", gestion = "Cliente al día.";

    if (posActual > posV1) {
        estado = "EN_MORA"; color = "var(--warning)"; gestion = "Gestión recomendada: Contactar cliente.";
        if (esCuentaNueva) document.getElementById("bannerChurn").style.display = "block";
    } else document.getElementById("bannerChurn").style.display = "none";

    if (posActual >= posC) {
        estado = "CORTE_PARCIAL"; color = "var(--danger)"; gestion = "Servicio suspendido.";
        expandirF2(posV1);
    } else contraerF2();

    if (posActual >= posV2) { estado = "CORTE_TOTAL"; color = "var(--dark-danger)"; gestion = "Servicio cancelado."; }

    let total = (estado === "EN_PLAZO") ? s : (s + p + config.cargo_administrativo);
    document.getElementById("info").innerHTML = `
        <div class="state-badge" style="background:${color}; color:${estado==='EN_MORA'?'#333':'white'}">${estado.replace("_"," ")}</div>
        <p style="font-size:12px; margin-bottom:5px">${gestion}</p>
        <div class="total-factura">${config.moneda} ${total.toLocaleString()}</div>
    `;
}

function expandirF2(v1Pos) {
    let pf2 = v1Pos + 12, pv2 = pf2 + 15, pct = pv2 + 10;
    setPos("fact2", "fact2Label", pf2, "2");
    setPos("vence2", "vence2Label", pv2, "V");
    setPos("corteT", "corteTLabel", pct, "T");
    ["fact2","fact2Label","vence2","vence2Label","corteT","corteTLabel"].forEach(id => document.getElementById(id).style.display = id.includes("Label")?"block":"flex");
    actualizarMeses(true);
}

function contraerF2() {
    ["fact2","fact2Label","vence2","vence2Label","corteT","corteTLabel"].forEach(id => document.getElementById(id).style.display = "none");
    actualizarMeses(false);
}

function setPos(id, label, pos, text) {
    let el = document.getElementById(id), lb = document.getElementById(label);
    if(el) { el.style.left = pos + "%"; lb.style.left = pos + "%"; el.innerHTML = text; }
}

function actualizarMeses(tres) {
    let m = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];
    let f = fechaInstalacionGlobal;
    let m1 = m[f.getMonth()], m2 = m[(f.getMonth()+1)%12], m3 = m[(f.getMonth()+2)%12];
    document.getElementById("meses").innerHTML = `<span>${m1}</span><span>${m2}</span>${tres?`<span>${m3}</span>`:''}`;
}

// Interacción de Arrastre
const timeline = document.getElementById("timeline");
let isDragging = false;

const move = (e) => {
    if(!isDragging) return;
    let rect = timeline.getBoundingClientRect();
    let x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    let posBruta = Math.max(0, Math.min(98, (x / rect.width) * 100));
    posActual = aplicarSnap(posBruta);
    renderTimeline(posActual);
};

timeline.addEventListener("mousedown", () => isDragging = true);
window.addEventListener("mouseup", () => isDragging = false);
window.addEventListener("mousemove", move);
timeline.addEventListener("touchstart", () => isDragging = true);
window.addEventListener("touchend", () => isDragging = false);
window.addEventListener("touchmove", (e) => { if(isDragging) e.preventDefault(); move(e); }, {passive: false});

function abrirAyuda() { document.getElementById("modalAyuda").style.display = "flex"; }
function cerrarAyuda() { document.getElementById("modalAyuda").style.display = "none"; }
function limpiar() { location.reload(); }
