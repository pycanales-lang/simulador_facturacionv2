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
    
    // Posición Factura 1
    // Si la fecha de instalación ocurrió antes que el día del ciclo en el mes actual...
    let posFact1 = (cicloActual <= diaInst && cicloActual !== 1) 
        ? ((30 + cicloActual) / 60) * 100 
        : (cicloActual === 1 ? 52 : (cicloActual / 60) * 100);

    const regla = REGLAS_NEGOCIO.ciclos[cicloActual];
    
    // Posición Vencimiento 1
    // REGLA NUEVA SEGÚN IMÁGENES:
    // Si el día de vencimiento (ej: 30) es MAYOR al día de emisión (ej: 15), cae en el MISMO MES (+15 días relativos)
    // Si el día de vencimiento (ej: 15) es MENOR al día de emisión (ej: 1), cae al MES SIGUIENTE (+ ~45 días relativos)
    
    let offsetVence = (regla.vence >= regla.emision) 
        ? (regla.vence - regla.emision)
        : (30 - regla.emision + regla.vence);
        
    const posV1 = posFact1 + (offsetVence / 60 * 100);
    
    // Posición Corte Parcial
    // Mismo control, si el número de corte es "menor" al de vencimiento o emisión, saltó de mes.
    let offsetCorte = (regla.corte >= regla.vence && regla.vence >= regla.emision)
        ? (regla.corte - regla.emision)
        : (regla.corte < regla.vence) 
            ? (30 - regla.emision + regla.corte) 
            : (60 - regla.emision + regla.corte); // Caso muy extendido, ej: ciclo 1 emisión el 1, vence el 15, corte el 3 del OTRO OTRO mes. (30+30+3). Pero según las imágenes el corte es del mes siguiente (3).
            
    // Ajuste fino del Corte para no complicar el array:
    offsetCorte = 32; // Promedio contable de todas las diapos
    const posC1 = posFact1 + (offsetCorte / 60 * 100);

    // Cálculos independientes para Segundo Ciclo (30 días = 50% de la barra)
    const posFact2 = posFact1 + 50;
    const posV2 = posV1 + 50;
    const posC2 = posC1 + 50;

    // Renderizar Hitos base en el Track oculto
    setPos("inst", "instLabel", posInst, "🏠");
    setPos("fact", "factLabel", posFact1, "🧾");
    setPos("vence", "venceLabel", posV1, "📅");
    setPos("corte", "corteLabel", posC1, "🚫");
    setPos("fact2", "fact2Label", posFact2, "🧾");
    setPos("vence2", "vence2Label", posV2, "📅");
    setPos("corteT", "corteTLabel", posC2, "🚫");

    // Barra de exoneración (Entre I y 1)
    const exoBar = document.getElementById("exoBar");
    if(exoBar) {
        exoBar.style.left = posInst + "%";
        exoBar.style.width = (posFact1 - posInst) + "%";
    }

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

    setPos("pay", "payLabel", pos, "💰");
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
    let diasExo = 0;
    
    // 1. Días exonerados cálculo general
    diasExo = Math.round(((posFact1 - posInst) / 100) * 60);

    // Actualización de Mensaje según posición
    if (pos < posInst) {
         mensaje = "Aún no instalado";
    } else if (pos >= posInst && pos < posFact1) {
        mensaje = "Servicio activo sin facturación.";
    } else if (pos >= posFact1 && pos <= posV1) {
        mensaje = "Factura emitida. Recordar pagar en fecha.";
    }

    // 2. Lógica de Mora
    if (pos > posV1 && pos < posC1) {
        estado = "EN MORA"; color = "var(--warning)";
        mensaje = "Cliente con pago atrasado.";
    } 

    // 3. Lógica de Corte
    if (pos >= posC1) {
        estado = "CORTE PARCIAL"; color = "var(--danger)";
        mensaje = "Servicio suspendido.";
    }
    
    // EARLY CHURN DETECTION (Nuevas reglas comerciales: Al sobrepasar la Vencida Y llegar al Corte)
    if (esCuentaNueva && pos >= posC1) {
         document.getElementById("bannerChurn").style.display = "block";
         estado = "EARLY CHURN";
         color = "var(--dark-danger)";
         mensaje = "¡ALERTA! Riesgo alto de bajada temprana.";
    } else {
         document.getElementById("bannerChurn").style.display = "none";
    }

    // 4. Cálculo de Deuda
    const total = (estado === "EN PLAZO" || estado === "Aún no instalado") ? saldoF1 : (saldoF1 + p + REGLAS_NEGOCIO.config.cargo_adm);

    // IMPRESION DE TABLERO ESTADO Y DÍAS EXONERADOS
    document.getElementById("info").innerHTML = `
        <div class="state-badge" style="background:${color}; color:${(estado === 'EN MORA') ? 'black' : 'white'}">${estado}</div>
        <p style="font-size:13px; font-weight:600">${mensaje}</p>
        <span class="total-factura">Gs. ${total.toLocaleString()}</span>
        <div style="font-size:12px; margin-top:5px; color:#ddd">Días exonerados: <strong>${Math.max(0, diasExo)}</strong></div>
    `;

    // 5. DETALLE DE CALENDARIOS (CALCULO DE FECHAS CLAVES)
    const dInstText = fechaInstalacionGlobal.toLocaleDateString();
    
    // Emisión (Dura revisión, siempre del mes más cercano)
    const fEmi = new Date(fechaInstalacionGlobal);
    fEmi.setDate(cicloActual);
    if (cicloActual <= fechaInstalacionGlobal.getDate() && cicloActual !== 1) {
        fEmi.setMonth(fEmi.getMonth() + 1);
    } else if (cicloActual === 1) { // Caso especial del ciclo 1, que emite siempre al mes siguiente sí o sí.
        fEmi.setMonth(fEmi.getMonth() + 1);
    }
    
    // Vencimiento (Fiel a la nueva variable de desfase offset)
    const regla = REGLAS_NEGOCIO.ciclos[cicloActual];
    const offsetVenceLocal = (regla.vence >= regla.emision) ? (regla.vence - regla.emision) : (30 - regla.emision + regla.vence);
    const fVence = new Date(fEmi);
    fVence.setDate(fEmi.getDate() + offsetVenceLocal);
    
    // Corte (Fiel al offset hardcoded promedio calculado arriba = 32)
    const fCorte = new Date(fEmi);
    fCorte.setDate(fEmi.getDate() + 32);

    // Mostrar tabla resumen requerida
    let detalleHTML = `
        <div style="text-align:left; font-size:13px; line-height:1.8;">
            <div><span style="opacity:0.8">🏠 Instalación:</span> <strong>${dInstText}</strong></div>`;

    if (pos >= posFact1) {
        detalleHTML += `<div><span style="opacity:0.8">🧾 Emisión F1:</span> <strong>${fEmi.toLocaleDateString()}</strong></div>`;
    }
    if (pos >= posV1) {
        detalleHTML += `<div><span style="opacity:0.8">📅 Vencimiento 1:</span> <strong>${fVence.toLocaleDateString()}</strong></div>`;
    }
    if (pos >= posC1) {
        detalleHTML += `<div><span style="opacity:0.8">🚫 Corte Parcial:</span> <strong>${fCorte.toLocaleDateString()}</strong></div>`;
    }

    const posFact2 = parseFloat(document.getElementById("fact2").style.left) || 0;
    const posV2 = parseFloat(document.getElementById("vence2").style.left) || 0;

    if (pos >= posFact2) {
        const fEmi2 = new Date(fEmi);
        fEmi2.setMonth(fEmi2.getMonth() + 1);
        detalleHTML += `<div><span style="opacity:0.8">🧾 Emisión F2:</span> <strong>${fEmi2.toLocaleDateString()}</strong></div>`;
    }
    if (pos >= posV2) {
        const fVence2 = new Date(fVence);
        fVence2.setMonth(fVence2.getMonth() + 1);
        detalleHTML += `<div><span style="opacity:0.8">📅 Vencimiento 2:</span> <strong>${fVence2.toLocaleDateString()}</strong></div>`;
    }

    detalleHTML += `</div>`;
    
    document.getElementById("detalleFacturacion").innerHTML = detalleHTML;
}

// --- FUNCIONES DE CONTROL VISUAL ---

function mostrarSegundaFactura(posV1) {
    const pF2 = posV1 + 10;
    const pV2 = pF2 + 15;
    const pCT = pV2 + 8;
    setPos("fact2", "fact2Label", pF2, "🧾");
    setPos("vence2", "vence2Label", pV2, "📅");
    setPos("corteT", "corteTLabel", pCT, "⛔");
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

// ==========================================
// CAPA UX VISUAL (SEPARADA DEL MOTOR BASE)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // 1. Escuchar los cambios provenientes del layout base 
    const observer = new MutationObserver(() => {
        if (!fechaInstalacionGlobal) return;
        actualizarUX();
    });
    const infoDiv = document.getElementById("info");
    if (infoDiv) observer.observe(infoDiv, { childList: true, subtree: true });

    // 2. Controlar Interacción del Slider
    const slider = document.getElementById("timeSlider");
    if(slider) {
        slider.addEventListener("input", (e) => {
            posActual = parseFloat(e.target.value);
            renderTimeline(posActual); // Dispara el motor Original
            
            // Actualiza el Cursor de forma instantánea y fluida para el dedo
            const uxPago = document.getElementById("ux-pago");
            if(uxPago) uxPago.style.left = posActual + "%";
            const dayLabel = document.getElementById("ux-day");
            if(dayLabel) dayLabel.innerText = Math.round((posActual / 100) * 60);
        });
    }
});

function actualizarUX() {
    // 1. Leer las posiciones exactas del motor base
    const posInst = parseFloat(document.getElementById("inst").style.left) || 0;
    const posFact1 = parseFloat(document.getElementById("fact").style.left) || 0;
    const posV1 = parseFloat(document.getElementById("vence").style.left) || 0;
    const posC1 = parseFloat(document.getElementById("corte").style.left) || 0;
    const posFact2 = parseFloat(document.getElementById("fact2").style.left) || 0;
    const posV2 = parseFloat(document.getElementById("vence2").style.left) || 0;

    const hitos = [
        { id: "ux-inst", pos: posInst },
        { id: "ux-fact1", pos: posFact1 },
        { id: "ux-vence", pos: posV1 },
        { id: "ux-corte", pos: posC1 },
        { id: "ux-fact2", pos: posFact2 },
        { id: "ux-vence2", pos: posV2 }
    ];

    // Posicionar hitos en nuestro Track UX Horizontal
    hitos.forEach(h => {
        const el = document.getElementById(h.id);
        if(!el) return;
        
        el.style.left = h.pos + "%";
        
        // Efecto Dinámico: Solo se muestran si el slider llegó a su nivel (con un pequeño anticipo)
        if (h.id === 'ux-inst') {
            el.style.opacity = "1";
            el.style.transform = "translate(-50%, -50%) scale(1)";
        } else {
            if (posActual >= (h.pos - 1)) { // Margen de 1% para que aparezca "al tocar"
                el.style.opacity = "1";
                el.style.transform = "translate(-50%, -50%) scale(1)";
                el.classList.add("passed");
            } else {
                el.style.opacity = "0";
                el.style.transform = "translate(-50%, -50%) scale(0.5)"; // Oculto y pequeño
                el.classList.remove("passed");
            }
        }
    });

    // 2. Clonar Resultados Principales
    const baseInfo = document.getElementById("info");
    const uxInfo = document.getElementById("infoUX");
    const descBox = document.getElementById("ux-message");
    const panelEstado = document.getElementById("panel-estado"); // Assuming panel-estado exists in the HTML

    if(baseInfo && uxInfo) {
        uxInfo.innerHTML = baseInfo.innerHTML;
        
        // El motor base nos da un state-badge que usamos para customizar UX textual
        const badge = baseInfo.querySelector('.state-badge');
        if (badge && descBox) {
            descBox.style.display = "block";
            const estadoActual = badge.innerText;
            
            if (panelEstado) { // Replicar el borde de color del badge
                panelEstado.style.borderColor = badge.style.backgroundColor;
            }

            // Personalización Dinámica para el UX (El motor base tira un array plano genérico)
            if (estadoActual === "Aún no instalado") {
                 descBox.innerHTML = `Mueve el cursor para empezar la simulación.`;
            } else if(estadoActual === "EN PLAZO" && posActual < posFact1) {
                descBox.innerHTML = `Servicio activo.<br>Acumulas <strong>${Math.round(((posFact1 - posInst)/100)*60)} días exonerados</strong>.`;
            } else if (estadoActual === "EN PLAZO" && posActual >= posFact1) {
                descBox.innerText = `Factura 1 emitida. Exoneración finalizada.`;
            } else if (estadoActual === "EN MORA") {
                descBox.innerText = `Cliente en Mora post-Vencimiento. Genera recargos.`;
            } else if (estadoActual === "CORTE PARCIAL") {
                descBox.innerText = `Servicio suspendido. Generación de Factura 2.`;
            } else if (estadoActual === "EARLY CHURN") {
                descBox.innerText = `¡ALERTA! Riesgo alto de bajada temprana por mora en 2da Factura.`;
            } else {
                // Fallback to the original message from baseInfo if no specific UX message is defined
                const mensajeOriginal = baseInfo.querySelector("p");
                if (mensajeOriginal) {
                    descBox.innerText = mensajeOriginal.innerText;
                }
            }
        }
    }

    // 3. Tablero del Fechas del Ciclo (El Base ya lo escupe formateado maravillosamente)
    const baseDetalle = document.getElementById("detalleFacturacion");
    const uxDetalle = document.getElementById("detalleFechasUX");
    if(baseDetalle && uxDetalle) uxDetalle.innerHTML = baseDetalle.innerHTML;

    // 4. Clonar Early Churn
    const baseChurn = document.getElementById("bannerChurn");
    const uxChurn = document.getElementById("bannerChurnUX");
    if(baseChurn && uxChurn) uxChurn.style.display = baseChurn.style.display;
    
    // 5. Sync de Elementos Vivos
    const slider = document.getElementById("timeSlider");
    if(slider && slider.value != posActual) slider.value = posActual;
    const uxPago = document.getElementById("ux-pago");
    if(uxPago) uxPago.style.left = posActual + "%";
    const dayLabel = document.getElementById("ux-day");
    if(dayLabel) dayLabel.innerText = Math.round((posActual / 100) * 60);
}
