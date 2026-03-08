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

// Función auxiliar para posicionar elementos (Asegúrate de tenerla definida)
function setPos(idEvent, idLabel, pos, texto) {
    const ev = document.getElementById(idEvent);
    const lb = document.getElementById(idLabel);
    if(ev) ev.style.left = pos + "%";
    if(lb) lb.style.left = pos + "%";
    if(ev && texto) ev.innerText = texto;
    if(ev) ev.style.display = "flex";
    if(lb) lb.style.display = "block";
}

function simular() {
    const fStr = document.getElementById("fecha").value;
    if (!fStr) return alert("Seleccione fecha de instalación");

    // Forzar lectura correcta de la fecha local
    const partes = fStr.split('-');
    fechaInstalacionGlobal = new Date(partes[0], partes[1] - 1, partes[2]);
    
    const diaInst = fechaInstalacionGlobal.getDate();
    cicloActual = obtenerCicloAsignado(diaInst);

    const hoy = new Date();
    const diffMeses = (hoy.getFullYear() - fechaInstalacionGlobal.getFullYear()) * 12 + (hoy.getMonth() - fechaInstalacionGlobal.getMonth());
    esCuentaNueva = diffMeses <= 4;

    if (typeof actualizarMesesUI === 'function') actualizarMesesUI(false);

    // --- CÁLCULO DE POSICIONES (Base 60 días) ---
    
    // 1. La Instalación SIEMPRE es el punto de partida visual (Día 1 del timeline)
    // Usamos el día de la instalación como base relativa
    const posInst = (diaInst / 60) * 100;
    
    // 2. Calcular cuándo cae la Factura 1 (Ciclo de facturación)
    let diaFact1;
    if (cicloActual > diaInst) {
        diaFact1 = cicloActual; // Mismo mes
    } else {
        diaFact1 = cicloActual + 30; // Mes siguiente
    }
    const posFact1 = (diaFact1 / 60) * 100;

    const regla = REGLAS_NEGOCIO.ciclos[cicloActual];
    
    // 3. Posiciones de Vencimiento y Corte basadas en la Factura 1
    let diasHastaVence = regla.vence - cicloActual;
    if (diasHastaVence < 0) diasHastaVence += 30;
    const posV1 = ((diaFact1 + diasHastaVence) / 60) * 100;
    
    let diasHastaCorte = regla.corte - cicloActual;
    if (diasHastaCorte < 0) diasHastaCorte += 30;
    const posC1 = ((diaFact1 + diasHastaCorte) / 60) * 100;

    // Renderizar Hitos
    setPos("inst", "instLabel", posInst, "I");
    setPos("fact", "factLabel", posFact1, "1");
    setPos("vence", "venceLabel", posV1, "V");
    setPos("corte", "corteLabel", posC1, "C");

    // Corregir Barra de exoneración y Label
    const exoBar = document.getElementById("exoBar");
    const exoLabel = document.getElementById("exoLabel");
    exoBar.style.left = posInst + "%";
    exoBar.style.width = (posFact1 - posInst) + "%";
    exoBar.style.display = "block";
    
    if(exoLabel) {
        exoLabel.style.left = (posInst + (posFact1 - posInst)/2) + "%";
        exoLabel.style.display = "block";
    }

    // INICIO: Posicionar aguja EXACTAMENTE sobre Instalación
    posActual = posInst;
    renderTimeline(posActual);
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
