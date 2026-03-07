/**
 * SIMULADOR DE FACTURACIÓN TELCO - MOTOR LÓGICO
 * Arquitectura basada en reglas de negocio dinámicas.
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

const tablaCiclos = REGLAS_NEGOCIO.HOME.ciclos;
let cicloActual = 0;
let fechaInstalacionGlobal = null;
let esCuentaNueva = false;

/**
 * Asigna el ciclo de facturación basado en el día de instalación
 */
function obtenerCicloAsignado(dia) {
    if (dia <= 6) return 7; 
    if (dia <= 14) return 15; 
    if (dia <= 20) return 21; 
    return 1;
}

/**
 * Orquestador principal de la simulación
 */
function simular() {
    let fStr = document.getElementById("fecha").value;
    if (!fStr) return alert("Ingrese fecha de instalación");
    
    fechaInstalacionGlobal = new Date(fStr + 'T00:00:00');
    let dia = fechaInstalacionGlobal.getDate();
    cicloActual = obtenerCicloAsignado(dia);
    
    // Detección Early Churn (Cuenta nueva < 4 meses)
    let hoy = new Date();
    let mesesDiff = (hoy.getFullYear() - fechaInstalacionGlobal.getFullYear()) * 12 + (hoy.getMonth() - fechaInstalacionGlobal.getMonth());
    esCuentaNueva = mesesDiff <= 4;

    actualizarMeses(false);

    // Cálculos de posicionamiento (Base 60 días para la timeline)
    let posInst = (dia / 60) * 100;
    let posFact = (cicloActual <= dia && cicloActual !== 1) ? ((30 + cicloActual) / 60) * 100 : (cicloActual === 1 ? 52 : (cicloActual / 60) * 100);
    
    // Vencimiento 1
    let diaV1 = tablaCiclos[cicloActual].vence;
    let posV1 = posFact + (diaV1 < cicloActual ? (diaV1 + (30 - cicloActual)) / 60 * 100 : (diaV1 - cicloActual) / 60 * 100);
    
    // Corte Parcial (C)
    let diaC = tablaCiclos[cicloActual].corte[0];
    let posC = posFact + (diaC < cicloActual ? (diaC + (30 - cicloActual)) / 60 * 100 : (diaC - cicloActual) / 60 * 100);

    // Actualización de Exoneración visual
    let exoBar = document.getElementById("exoBar");
    exoBar.style.left = posInst + "%";
    exoBar.style.width = (posFact - posInst) + "%";
    document.getElementById("exoLabel").style.left = (posInst + (posFact - posInst)/2) + "%";

    // Ubicación de hitos en la timeline
    setPos("inst", "instLabel", posInst, "I");
    setPos("fact", "factLabel", posFact, "1");
    setPos("vence", "venceLabel", posV1, "V");
    setPos("corte", "corteLabel", posC, "C");
    
    document.getElementById("corte").style.display = "flex";
    document.getElementById("corteLabel").style.display = "block";

    // Posición inicial sugerida para el punto de pago P
    setPos("pay", "payLabel", Math.min(posV1 - 5, 80), "P");

    actualizarDetalle();
}

/**
 * Motor de Estados y Cálculo Financiero
 */
function actualizarDetalle() {
    if (!fechaInstalacionGlobal) return;

    let p = parseFloat(document.getElementById("plan").value) || 0;
    let a = parseFloat(document.getElementById("anticipo").value) || 0;
    let s = p - a;
    let moneda = REGLAS_NEGOCIO.HOME.config.moneda;
    let cargo = REGLAS_NEGOCIO.HOME.config.cargo_administrativo;

    // Obtención de posiciones actuales para lógica de colisión
    let posP = parseFloat(document.getElementById("pay").style.left);
    let posV1 = parseFloat(document.getElementById("vence").style.left);
    let posC = parseFloat(document.getElementById("corte").style.left);
    let posV2 = parseFloat(document.getElementById("vence2").style.left) || 100;

    let estado = "EN_PLAZO";
    let color = "var(--success)";
    let gestion = "Cliente al día. No requiere gestión.";

    // Evaluación de Mora y Early Churn
    if (posP > posV1) {
        estado = "EN_MORA";
        color = "var(--warning)";
        gestion = "Gestión recomendada: contactar cliente antes del corte.";
        if (esCuentaNueva) document.getElementById("bannerChurn").style.display = "block";
    } else {
        document.getElementById("bannerChurn").style.display = "none";
    }

    // Evaluación de Corte Parcial y Expansión de Factura 2
    if (posP >= posC) {
        estado = "CORTE_PARCIAL";
        color = "var(--danger)";
        gestion = "Servicio suspendido. Cliente debe regularizar deuda.";
        expandirSegundaFactura();
    } else {
        contraerSegundaFactura();
    }

    // Evaluación de Corte Total
    if (posP >= posV2) {
        estado = "CORTE_TOTAL";
        color = "var(--dark-danger)";
        gestion = "Servicio cancelado por mora prolongada. Pago total requerido.";
    }

    // Cálculo de deuda según estado
    let total = (estado === "EN_PLAZO") ? s : (s + p + cargo);
    
    document.getElementById("info").innerHTML = `
        <div class="state-badge" style="background:${color}; color:${estado === 'EN_MORA' ? 'black' : 'white'}">${estado.replace("_", " ")}</div>
        <p style="font-size:12px; margin-bottom:10px; font-style:italic; opacity:0.9">${gestion}</p>
        ${estado === 'EN_PLAZO' ? `Saldo Factura 1: ${moneda} ${s.toLocaleString()}` : `
            <span class="warning-label">Resumen de deuda acumulada:</span>
            Saldo F1: ${moneda} ${s.toLocaleString()}<br>
            Mes siguiente: ${moneda} ${p.toLocaleString()}<br>
            Cargo Administrativo: ${moneda} ${cargo.toLocaleString()}<br>
            <span class="total-factura">Total: ${moneda} ${total.toLocaleString()}</span>
        `}
    `;

    // Renderizado de Fechas (Regla de Oro)
    let fEmision1 = new Date(fechaInstalacionGlobal.getFullYear(), fechaInstalacionGlobal.getMonth(), cicloActual);
    if (cicloActual <= fechaInstalacionGlobal.getDate() && cicloActual !== 1) fEmision1.setMonth(fEmision1.getMonth() + 1);
    if (cicloActual === 1) fEmision1.setMonth(fechaInstalacionGlobal.getMonth() + 1);
    
    let fV1 = new Date(fEmision1.getFullYear(), fEmision1.getMonth(), tablaCiclos[cicloActual].vence);
    if (tablaCiclos[cicloActual].vence < cicloActual) fV1.setMonth(fV1.getMonth() + 1);

    document.getElementById("detalleFacturacion").innerHTML = `
        <strong>Regla de Oro:</strong><br>
        Ciclo asignado: ${cicloActual}<br>
        Emisión F1: ${fEmision1.toLocaleDateString()}<br>
        Vencimiento F1: ${fV1.toLocaleDateString()}
    `;
}

/**
 * Expande visualmente los eventos del segundo mes
 */
function expandirSegundaFactura() {
    let v1Pos = parseFloat(document.getElementById("vence").style.left);
    let posF2 = v1Pos + 12;
    let posV2 = posF2 + 15;
    let posCT = posV2 + 10;

    setPos("fact2", "fact2Label", posF2, "2");
    setPos("vence2", "vence2Label", posV2, "V");
    setPos("corteT", "corteTLabel", posCT, "T");

    ["fact2", "fact2Label", "vence2", "vence2Label", "corteT", "corteTLabel"].forEach(id => {
        document.getElementById(id).style.display = id.includes("Label") ? "block" : "flex";
    });
    actualizarMeses(true);
}

/**
 * Oculta los eventos del segundo mes
 */
function contraerSegundaFactura() {
    ["fact2", "fact2Label", "vence2", "vence2Label", "corteT", "corteTLabel"].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.style.display = "none";
    });
    actualizarMeses(false);
}

/**
 * Helper para posicionar elementos y sus labels
 */
function setPos(id, label, pos, text) {
    let el = document.getElementById(id);
    let lb = document.getElementById(label);
    if(el && lb) {
        el.style.left = pos + "%";
        lb.style.left = pos + "%";
        el.innerHTML = text;
    }
}

/**
 * Actualiza la visualización de los meses en la cabecera
 */
function actualizarMeses(tresMeses) {
    if(!fechaInstalacionGlobal) return;
    let f = fechaInstalacionGlobal;
    let m1 = f.getFullYear() + "/" + (f.getMonth() + 1).toString().padStart(2, "0");
    let f2 = new Date(f.getFullYear(), f.getMonth() + 1, 1);
    let m2 = f2.getFullYear() + "/" + (f2.getMonth() + 1).toString().padStart(2, "0");
    let f3 = new Date(f.getFullYear(), f.getMonth() + 2, 1);
    let m3 = f3.getFullYear() + "/" + (f3.getMonth() + 1).toString().padStart(2, "0");
    document.getElementById("meses").innerHTML = `<span>${m1}</span><span>${m2}</span>${tresMeses ? `<span>${m3}</span>` : ''}`;
}

/**
 * Motor de Interacción Drag del Pago (P)
 */
const pay = document.getElementById("pay");
const move = (e) => {
    let rect = document.getElementById("timeline").getBoundingClientRect();
    let x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    let pos = Math.max(0, Math.min(98, (x / rect.width) * 100));
    setPos("pay", "payLabel", pos, "P");
    actualizarDetalle();
};

// Listeners para Mouse y Touch
if(pay) {
    pay.addEventListener("mousedown", () => document.addEventListener("mousemove", move));
    document.addEventListener("mouseup", () => document.removeEventListener("mousemove", move));
    pay.addEventListener("touchstart", (e) => {
        e.preventDefault();
        document.addEventListener("touchmove", move);
    });
    document.addEventListener("touchend", () => document.removeEventListener("touchmove", move));
}

// Funciones de Ayuda e Interfaz
function limpiar() { location.reload(); }
function abrirAyuda() { document.getElementById("modalAyuda").style.display = "flex"; }
function cerrarAyuda() { document.getElementById("modalAyuda").style.display = "none"; }
