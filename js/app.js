const REGLAS = {
    ciclos: { 1: { v: 15, c: 3 }, 7: { v: 21, c: 9 }, 15: { v: 1, c: 17 }, 21: { v: 5, c: 22 } },
    config: { moneda: "LOCAL", cargo: 12000 }
};

let posActual = 0;
let fechaInst = null;
let cicloAct = 1;
const TRACK_SCALE = 3;
const SNAP_THRESHOLD = 1.4;

function aplicarSnap(pos) {
    const hitos = ["fact", "vence", "corte", "fact2", "vence2", "corteT"];
    for (let id of hitos) {
        let el = document.getElementById(id);
        if (el && el.style.display !== "none" && el.style.left) {
            let h = parseFloat(el.style.left);
            if (Math.abs(pos - h) < SNAP_THRESHOLD) return h;
        }
    }
    return pos;
}

function render(pos) {
    const track = document.getElementById("timelineTrack");
    const joy = document.getElementById("sliderJoy");
    const diaBadge = document.getElementById("diaBadge");

    track.style.transform = `translateX(${(50 - pos) * TRACK_SCALE}%)`;
    joy.style.left = `calc(${pos}% - ${pos * 0.4}px)`;

    let diasTranscurridos = Math.round((pos / 100) * 60);
    diaBadge.innerText = `Día ${diasTranscurridos}`;

    setPos("pay", "payLabel", pos, "P");
    actualizarInfo(pos);
}

function simular() {
    let fVal = document.getElementById("fecha").value;
    if (!fVal) return alert("Seleccione fecha");
    fechaInst = new Date(fVal + 'T00:00:00');
    let dia = fechaInst.getDate();

    if (dia <= 6) cicloAct = 7; 
    else if (dia <= 14) cicloAct = 15; 
    else if (dia <= 20) cicloAct = 21; 
    else cicloAct = 1;

    let pI = (dia / 60) * 100;
    let pF = (cicloAct <= dia && cicloAct !== 1) ? ((30 + cicloAct) / 60) * 100 : (cicloAct === 1 ? 52 : (cicloAct / 60) * 100);
    
    let diaV = REGLAS.ciclos[cicloAct].v;
    let pV = pF + (diaV < cicloAct ? (diaV + (30 - cicloAct)) / 60 * 100 : (diaV - cicloAct) / 60 * 100);
    
    let diaC = REGLAS.ciclos[cicloAct].c;
    let pC = pF + (diaC < cicloAct ? (diaC + (30 - cicloAct)) / 60 * 100 : (diaC - cicloAct) / 60 * 100);

    setPos("inst", "instLabel", pI, "I");
    setPos("fact", "factLabel", pF, "1");
    setPos("vence", "venceLabel", pV, "V");
    setPos("corte", "corteLabel", pC, "C");
    
    document.getElementById("corte").style.display = "flex";
    document.getElementById("corteLabel").style.display = "block";
    document.getElementById("exoBar").style.left = pI + "%";
    document.getElementById("exoBar").style.width = (pF - pI) + "%";
    
    posActual = pV - 5;
    render(posActual);
}

function actualizarInfo(pos) {
    if (!fechaInst) return;
    let p = parseFloat(document.getElementById("plan").value) || 0;
    let s = p - (parseFloat(document.getElementById("anticipo").value) || 0);
    
    let vEl = document.getElementById("vence");
    let cEl = document.getElementById("corte");
    if(!vEl || !cEl) return;

    let pV = parseFloat(vEl.style.left);
    let pC = parseFloat(cEl.style.left);
    let pV2 = parseFloat(document.getElementById("vence2").style.left) || 100;

    let est = "EN PLAZO", col = "var(--success)";

    if (pos > pV) { est = "EN MORA"; col = "var(--warning)"; }
    if (pos >= pC) { est = "CORTE PARCIAL"; col = "var(--danger)"; expandirF2(pV); } 
    else { contraerF2(); }
    
    if (pos >= pV2) { est = "CORTE TOTAL"; col = "var(--dark-danger)"; }

    let total = (est === "EN PLAZO") ? s : (s + p + REGLAS.config.cargo);
    document.getElementById("info").innerHTML = `
        <div class="state-badge" style="background:${col}; color:${est==='EN MORA'?'#333':'white'}">${est}</div>
        <div class="total-factura">${REGLAS.config.moneda} ${total.toLocaleString()}</div>
    `;
}

function expandirF2(v1Pos) {
    let pf2 = v1Pos + 12, pv2 = pf2 + 15, pct = pv2 + 10;
    setPos("fact2", "fact2Label", pf2, "2");
    setPos("vence2", "vence2Label", pv2, "V");
    setPos("corteT", "corteTLabel", pct, "T");
    ["fact2","fact2Label","vence2","vence2Label","corteT","corteTLabel"].forEach(id => {
        let el = document.getElementById(id);
        if(el) el.style.display = id.includes("Label") ? "block" : "flex";
    });
}

function contraerF2() {
    ["fact2","fact2Label","vence2","vence2Label","corteT","corteTLabel"].forEach(id => {
        let el = document.getElementById(id);
        if(el) el.style.display = "none";
    });
}

function setPos(id, lb, pos, txt) {
    let e = document.getElementById(id), l = document.getElementById(lb);
    if(e) { e.style.left = pos + "%"; e.innerHTML = txt; }
    if(l) { l.style.left = pos + "%"; }
}

const sliderArea = document.getElementById("sliderArea");
let dragging = false;

const moveJoy = (e) => {
    if(!dragging) return;
    let rect = sliderArea.getBoundingClientRect();
    let x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    let p = Math.max(0, Math.min(100, (x / rect.width) * 100));
    posActual = aplicarSnap(p);
    render(posActual);
};

sliderArea.addEventListener("mousedown", (e) => { dragging = true; moveJoy(e); });
window.addEventListener("mouseup", () => dragging = false);
window.addEventListener("mousemove", moveJoy);
sliderArea.addEventListener("touchstart", (e) => { dragging = true; moveJoy(e); });
window.addEventListener("touchend", () => dragging = false);
window.addEventListener("touchmove", (e) => { if(dragging) { e.preventDefault(); moveJoy(e); } }, {passive: false});

function abrirAyuda() { document.getElementById("modalAyuda").style.display = "flex"; }
function cerrarAyuda() { document.getElementById("modalAyuda").style.display = "none"; }
