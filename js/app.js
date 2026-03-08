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

// Función auxiliar para mover elementos (Asegúrate que esté presente)
function setPos(idEvent, idLabel, pos, texto) {
    const ev = document.getElementById(idEvent);
    const lb = document.getElementById(idLabel);
    if (!ev || !lb) return;
    ev.style.left = pos + "%";
    lb.style.left = pos + "%";
    ev.style.display = "flex";
    lb.style.display = "block";
    if (texto) ev.innerText = texto;
}

function simular() {
    const fStr = document.getElementById("fecha").value;
    if (!fStr) return alert("Seleccione fecha de instalación");

    // Fix fecha: evitar desfase por zona horaria
    const [year, month, day] = fStr.split('-').map(Number);
    fechaInstalacionGlobal = new Date(year, month - 1, day);
    
    const diaInst = fechaInstalacionGlobal.getDate();
    cicloActual = obtenerCicloAsignado(diaInst);

    // Lógica Churn
    const hoy = new Date();
    const diffMeses = (hoy.getFullYear() - fechaInstalacionGlobal.getFullYear()) * 12 + (hoy.getMonth() - fechaInstalacionGlobal.getMonth());
    esCuentaNueva = diffMeses <= 4;
    document.getElementById("bannerChurn").style.display = esCuentaNueva ? "block" : "none";

    // --- CÁLCULO DE POSICIONES (Base 60 días) ---
    // 1. Instalación (Día del mes inicial)
    const posInst = (diaInst / 60) * 100;
    
    // 2. Factura 1 (Si el ciclo ya pasó este mes, va al siguiente)
    let diaFact1 = cicloActual;
    if (cicloActual <= diaInst) {
        diaFact1 = cicloActual + 30;
    }
    const posFact1 = (diaFact1 / 60) * 100;

    const regla = REGLAS_NEGOCIO.ciclos[cicloActual];
    
    // 3. Vencimiento y Corte (Relativos a la Factura 1)
    let difVence = regla.vence - cicloActual;
    if (difVence < 0) difVence += 30;
    const posV1 = ((diaFact1 + difVence) / 60) * 100;

    let difCorte = regla.corte - cicloActual;
    if (difCorte < 0) difCorte += 30;
    const posC1 = ((diaFact1 + difCorte) / 60) * 100;

    // Renderizar esferas
    setPos("inst", "instLabel", posInst, "I");
    setPos("fact", "factLabel", posFact1, "1");
    setPos("vence", "venceLabel", posV1, "V");
    setPos("corte", "corteLabel", posC1, "C");

    // Sincronizar Barra de Exoneración
    const exoBar = document.getElementById("exoBar");
    const exoLabel = document.getElementById("exoLabel");
    exoBar.style.left = posInst + "%";
    exoBar.style.width = (posFact1 - posInst) + "%";
    exoBar.style.display = "block";
    exoLabel.style.display = "block";
    exoLabel.style.left = (posInst + (posFact1 - posInst) / 2) + "%";

    // AGUJA: Posicionar exactamente sobre la Instalación al iniciar
    posActual = posInst;
    renderTimeline(posActual);
}

function renderTimeline(pos) {
    const track = document.getElementById("timelineTrack");
    const diaBadge = document.getElementById("diaBadge");
    if (!track || !diaBadge) return;

    // Movimiento del fondo (track)
    const offset = (50 - pos) * TRACK_SCALE;
    track.style.transform = `translateX(${offset}%)`;

    // Actualizar el número del día en el badge
    const diaSimulado = Math.round((pos / 100) * 60);
    diaBadge.innerText = `Día ${diaSimulado}`;

    // La esfera de Pago (P) sigue a la aguja
    setPos("pay", "payLabel", pos, "P");

    // Llamar a la lógica de cálculos (solo si la función existe)
    if (typeof actualizarLogicaNegocio === "function") {
        actualizarLogicaNegocio(pos);
    }
}

function renderTimeline(pos) {
    const track = document.getElementById("timelineTrack");
    const diaBadge = document.getElementById("diaBadge");
    const playhead = document.getElementById("playhead");

    // Movimiento del track
    const offset = (50 - pos) * TRACK_SCALE;
    track.style.transform = `translateX(${offset}%)`;

    // Sincronizar el Badge con el día real
    const diaCalendario = Math.round((pos / 100) * 60);
    diaBadge.innerText = `Día ${diaCalendario}`;

    // La esfera de pago (P) sigue a la aguja
    setPos("pay", "payLabel", pos, "P");
    
    if (typeof actualizarLogicaNegocio === 'function') {
        actualizarLogicaNegocio(pos);
    }
}

