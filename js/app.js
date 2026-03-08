/**
 * SIMULADOR TELCO PRO - MOTOR SINCRONIZADO SIEBEL 2026
 */
const REGLAS_NEGOCIO = {
    HOME: {
        ciclos: {
            1:  { emision: 1,  vence: 15, corte: [22, 23] },
            7:  { emision: 7,  vence: 21, corte: [9, 10] },
            15: { emision: 15, vence: 1,  corte: [17, 18] },
            21: { emision: 21, vence: 5,  corte: [22, 23] }
        }
    }
};

let posActual = 0, fechaInstalacionGlobal = null, esCuentaNueva = false, cicloActual = 0;
const TRACK_SCALE = 2; // Ajustado a escala de track 200%

function obtenerCicloAsignado(dia) {
    if (dia <= 6) return 7; 
    if (dia <= 14) return 15; 
    if (dia <= 20) return 21; 
    return 1;
}

function simular() {
    let fStr = document.getElementById("fecha").value;
    if (!fStr) return alert("Ingrese fecha de instalación");
    
    fechaInstalacionGlobal = new Date(fStr + 'T00:00:00');
    let dia = fechaInstalacionGlobal.getDate();
    cicloActual = obtenerCicloAsignado(dia);

    let hoy = new Date();
    let diffMeses = (hoy.getFullYear() - fechaInstalacionGlobal.getFullYear()) * 12 + (hoy.getMonth() - fechaInstalacionGlobal.getMonth());
    esCuentaNueva = diffMeses <= 4;

    actualizarMeses(false);

    let posInst = (dia / 60) * 100;
    let diaEmision = cicloActual;
    let posFact = (diaEmision <= dia && cicloActual !== 1) ? ((30 + diaEmision) / 60) * 100 : (cicloActual === 1 ? 52 : (diaEmision / 60) * 100);
    
    let diaV1 = REGLAS_NEGOCIO.HOME.ciclos[cicloActual].vence;
    let posV1 = posFact + (diaV1 < cicloActual ? (diaV1 + (30 - cicloActual)) / 60 * 100 : (diaV1 - cicloActual) / 60 * 100);
    
    let diaC1 = REGLAS_NEGOCIO.HOME.ciclos[cicloActual].corte[0];
    let posC1 = posFact + (diaC1 < cicloActual ? (diaC1 + (30 - cicloActual)) / 60 * 100 : (diaC1 - cicloActual) / 60 * 100);

    setPos("inst", "instLabel", posInst, "I");
    setPos("fact", "factLabel", posFact, "1");
    setPos("vence", "venceLabel", posV1, "V");
    setPos("corte", "corteLabel", posC1, "C");
    
    let exoBar = document.getElementById("exoBar");
    exoBar.style.left = posInst + "%";
    exoBar.style.width = (posFact - posInst) + "%";

    posActual = posInst;
    renderTimeline(posActual);
}

function renderTimeline(pos) {
    const track = document.getElementById("timelineTrack");
    const diaBadge = document.getElementById("diaBadge");
    
    const offset = (50 - pos) * TRACK_SCALE;
    track.style.transform = `translateX(${offset}%)`;
    
    let diasTrans = Math.round((pos / 100) * 60);
    diaBadge.innerText = `Día ${diasTrans}`;
    
    setPos("pay", "payLabel", pos, "P");
    actualizarDetalle();
}

function actualizarDetalle() {
    if (!fechaInstalacionGlobal) return;
    let p = parseFloat(document.getElementById("plan").value) || 0;
    let a = parseFloat(document.getElementById("anticipo").value) || 0;
    let s = p - a;

    let posV1 = parseFloat(document.getElementById("vence").style.left);
    let posC1 = parseFloat(document.getElementById("corte").style.left);

    let estado = "EN PLAZO", color = "var(--success)", msg = "Cliente al día. No requiere gestión.";

    if (posActual > posV1) {
        estado = "EN MORA"; color = "var(--warning)"; msg = "⚠ Cliente no pagó la 1ra factura.";
        if (esCuentaNueva) document.getElementById("bannerChurn").style.display = "block";
    } else {
        document.getElementById("bannerChurn").style.display = "none";
    }

    if (posActual >= posC1) {
        estado = "CORTE PARCIAL"; color = "var(--danger)"; msg = "🚨 Servicio suspendido por mora.";
        expandirSegundaFactura(posV1);
    } else {
        contraerSegundaFactura();
    }

    let total = (estado === "EN PLAZO") ? s : (s + p + 12000);
    
    document.getElementById("info").innerHTML = `
        <div class="state-badge" style="background:${color}; color:${estado === 'EN MORA' ? 'black' : 'white'}">${estado}</div>
        <p style="font-size:12px; margin-bottom:5px; font-weight:600">${msg}</p>
        <span class="total-factura">Gs. ${total.toLocaleString()}</span>
    `;

    let fEmi = new Date(fechaInstalacionGlobal);
    fEmi.setDate(cicloActual);
    if (cicloActual <= fechaInstalacionGlobal.getDate()) fEmi.setMonth(fEmi.getMonth() + 1);
    
    document.getElementById("detalleFacturacion").innerHTML = `
        Ciclo Asignado: <strong>${cicloActual}</strong> | Emisión F1: <strong>${fEmi.toLocaleDateString()}</strong>
    `;
}

function setPos(id, lb, pos, txt) {
    let e = document.getElementById(id), l = document.getElementById(lb);
    if(e) { e.style.left = pos + "%"; e.innerHTML = txt; }
    if(l) l.style.left = pos + "%";
}

function expandirSegundaFactura(v1) {
    let pf2 = v1 + 12, pv2 = pf2 + 15, pct = pv2 + 10;
    setPos("fact2", "fact2Label", pf2, "2");
    setPos("vence2", "vence2Label", pv2, "V");
    setPos("corteT", "corteTLabel", pct, "T");
    ["fact2","fact2Label","vence2","vence2Label","corteT","corteTLabel","corte","corteLabel"].forEach(id => {
        let el = document.getElementById(id); if(el) el.style.display = id.includes("Label")?"block":"flex";
    });
    actualizarMeses(true);
}

function contraerSegundaFactura() {
    ["fact2","fact2Label","vence2","vence2Label","corteT","corteTLabel"].forEach(id => {
        let el = document.getElementById(id); if(el) el.style.display = "none";
    });
    actualizarMeses(false);
}

function actualizarMeses(tres) {
    if(!fechaInstalacionGlobal) return;
    let m = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    let f = fechaInstalacionGlobal;
    let m1 = m[f.getMonth()], f2 = new Date(f); f2.setMonth(f2.getMonth()+1);
    let m2 = m[f2.getMonth()], f3 = new Date(f); f3.setMonth(f3.getMonth()+2);
    let m3 = m[f3.getMonth()];
    document.getElementById("meses").innerHTML = `<span>${m1}</span><span>${m2}</span>${tres?`<span>${m3}</span>`:''}`;
}

// --- MOTOR DE DRAG CORREGIDO ---
const timeline = document.getElementById("timeline");
let dragging = false;
let startX = 0;
let startPos = 0;

const startDrag = (e) => { 
    dragging = true; 
    startX = e.touches ? e.touches[0].clientX : e.clientX; 
    startPos = posActual; 
    timeline.style.cursor = "grabbing";
};

const doDrag = (e) => {
    if(!dragging) return;
    let currentX = e.touches ? e.touches[0].clientX : e.clientX;
    let rect = timeline.getBoundingClientRect();
    let deltaX = currentX - startX;
    
    // CORRECCIÓN 1: Sensibilidad ajustada para movimiento controlado
    const movimiento = (deltaX / rect.width) * 40; 
    let nuevaPos = startPos - movimiento;
    
    posActual = Math.max(0, Math.min(100, nuevaPos));
    renderTimeline(posActual);
};

const stopDrag = () => { 
    dragging = false; 
    timeline.style.cursor = "grab";
};

// CORRECCIÓN 3: Eventos limitados al contenedor timeline para evitar saltos fuera de área
timeline.addEventListener("mousedown", startDrag);
timeline.addEventListener("mousemove", doDrag);
timeline.addEventListener("mouseup", stopDrag);

timeline.addEventListener("touchstart", (e) => { startDrag(e); }, {passive: false});
timeline.addEventListener("touchmove", (e) => { if(dragging) { e.preventDefault(); doDrag(e); } }, {passive: false});
timeline.addEventListener("touchend", stopDrag);

function limpiar() { location.reload(); }
function abrirAyuda() { document.getElementById("modalAyuda").style.display = "flex"; }
function cerrarAyuda() { document.getElementById("modalAyuda").style.display = "none"; }
