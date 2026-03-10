/**
 * SIMULADOR TELCO PRO - MOTOR DINÁMICO SIEBEL 2026
 * Sincronización total de Timeline, Esferas y Mensajes de Negocio
 */

const REGLAS_NEGOCIO = {
    ciclos: {
        1:  { emision: 1,  vence: 15, corte: 3 },
        7:  { emision: 7,  vence: 22, corte: 9 },
        15: { emision: 15, vence: 30, corte: 17 },
        21: { emision: 21, vence: 5,  corte: 22 }
    },
    config: { cargo_adm: 12000 }
};

let posActual = 0, fechaInstalacionGlobal = null, cicloActual = 0, esCuentaNueva = false;
let timelineDias = 60;
let isDragging = false, startX = 0, startPos = 0;

const TRACK_SCALE = 3;

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

    if(diaInst >= 15){
        timelineDias = 90;
    }else{
        timelineDias = 60;
    }

    cicloActual = obtenerCicloAsignado(diaInst);

    const hoy = new Date();
    const diffMeses = (hoy.getFullYear() - fechaInstalacionGlobal.getFullYear()) * 12 +
                      (hoy.getMonth() - fechaInstalacionGlobal.getMonth());

    esCuentaNueva = diffMeses <= 4;

    actualizarMesesUI(timelineDias === 90);

    const posInst = (diaInst / timelineDias) * 100;

    let posFact1 =
        (cicloActual <= diaInst && cicloActual !== 1)
        ? ((30 + cicloActual) / timelineDias) * 100
        : (cicloActual === 1 ? 52 : (cicloActual / timelineDias) * 100);

    const regla = REGLAS_NEGOCIO.ciclos[cicloActual];

    let offsetVence =
        (regla.vence >= regla.emision)
        ? (regla.vence - regla.emision)
        : (30 - regla.emision + regla.vence);

    const posV1 = posFact1 + (offsetVence / timelineDias * 100);

    let offsetCorte = 32;
    const posC1 = posFact1 + (offsetCorte / timelineDias * 100);

    const posFact2 = posFact1 + (30 / timelineDias * 100);
    const posV2 = posV1 + (30 / timelineDias * 100);
    const posC2 = posC1 + (30 / timelineDias * 100);

    setPos("inst", "instLabel", posInst, "🏠");
    setPos("fact", "factLabel", posFact1, "🧾");
    setPos("vence", "venceLabel", posV1, "📅");
    setPos("corte", "corteLabel", posC1, "🚫");
    setPos("fact2", "fact2Label", posFact2, "🧾");
    setPos("vence2", "vence2Label", posV2, "📅");
    setPos("corteT", "corteTLabel", posC2, "🚫");

    const exoBar = document.getElementById("exoBar");
    if(exoBar){
        exoBar.style.left = posInst + "%";
        exoBar.style.width = (posFact1 - posInst) + "%";
    }

    posActual = posInst;

    renderTimeline(posActual);
}

function renderTimeline(pos){

    const track = document.getElementById("timelineTrack");
    const diaBadge = document.getElementById("diaBadge");

    if(!track || !diaBadge) return;

    const offset = (50 - pos) * TRACK_SCALE;

    track.style.transform = `translateX(${offset}%)`;

    const diaCalendario = Math.round((pos / 100) * timelineDias);

    diaBadge.innerText = `Día ${diaCalendario}`;

    setPos("pay", "payLabel", pos, "💰");

    actualizarLogicaNegocio(pos);
}

function actualizarLogicaNegocio(pos){

    if (!fechaInstalacionGlobal) return;

    const p = parseFloat(document.getElementById("plan").value) || 0;
    const a = parseFloat(document.getElementById("anticipo").value) || 0;

    const saldoF1 = p - a;

    const posInst = parseFloat(document.getElementById("inst").style.left) || 0;
    const posFact1 = parseFloat(document.getElementById("fact").style.left) || 0;
    const posV1 = parseFloat(document.getElementById("vence").style.left) || 0;
    const posC1 = parseFloat(document.getElementById("corte").style.left) || 0;

    let diasExo = Math.round(((posFact1 - posInst) / 100) * timelineDias);

    let estado = "EN PLAZO", color = "var(--success)", mensaje = "";

    if (pos < posInst) {
        mensaje = "Aún no instalado";
    }
    else if (pos >= posInst && pos < posFact1) {
        mensaje = "Servicio activo sin facturación.";
    }
    else if (pos >= posFact1 && pos <= posV1) {
        mensaje = "Factura emitida. Recordar pagar en fecha.";
    }

    if (pos > posV1 && pos < posC1) {
        estado = "EN MORA";
        color = "var(--warning)";
        mensaje = "Cliente con pago atrasado.";
    }

    if (pos >= posC1) {
        estado = "CORTE PARCIAL";
        color = "var(--danger)";
        mensaje = "Servicio suspendido.";
    }

    if (esCuentaNueva && pos >= posC1) {
        document.getElementById("bannerChurn").style.display = "block";
        estado = "EARLY CHURN";
        color = "var(--dark-danger)";
        mensaje = "¡ALERTA! Riesgo de bajada temprana por Mora.";
    }
    else{
        document.getElementById("bannerChurn").style.display = "none";
    }

    const total =
        (estado === "EN PLAZO" || estado === "Aún no instalado")
        ? saldoF1
        : (saldoF1 + p + REGLAS_NEGOCIO.config.cargo_adm);

    document.getElementById("info").innerHTML = `
        <div class="state-badge" style="background:${color}; color:${(estado === 'EN MORA') ? 'black' : 'white'}">${estado}</div>
        <p style="font-size:13px; font-weight:600">${mensaje}</p>
        <span class="total-factura">Gs. ${total.toLocaleString()}</span>
        <div style="font-size:12px; margin-top:5px; color:#ddd">Días exonerados: <strong>${Math.max(0, diasExo)}</strong></div>
    `;

    const dInstText = fechaInstalacionGlobal.toLocaleDateString();

    const fEmi = new Date(fechaInstalacionGlobal);

    fEmi.setDate(cicloActual);

    if (cicloActual <= fechaInstalacionGlobal.getDate() && cicloActual !== 1) {
        fEmi.setMonth(fEmi.getMonth() + 1);
    }
    else if (cicloActual === 1) {
        fEmi.setMonth(fEmi.getMonth() + 1);
    }

    const regla = REGLAS_NEGOCIO.ciclos[cicloActual];

    const offsetVenceLocal =
        (regla.vence >= regla.emision)
        ? (regla.vence - regla.emision)
        : (30 - regla.emision + regla.vence);

    const fVence = new Date(fEmi);

    fVence.setDate(fEmi.getDate() + offsetVenceLocal);

    const fCorte = new Date(fEmi);

    fCorte.setDate(fEmi.getDate() + 32);

    let detalleHTML = `
    <div style="text-align:left; font-size:13px; line-height:1.8;">
    
    <div style="
    background:rgba(255,255,255,0.08);
    padding:8px;
    border-radius:6px;
    margin-bottom:8px;
    font-weight:600;
    color:#FFD166;
    text-align:center;
    ">
    🔄 Ciclo de Facturación: ${cicloActual}
    </div>
    
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

    detalleHTML += `</div>`;

    document.getElementById("detalleFacturacion").innerHTML = detalleHTML;
}

function setPos(id, lb, pos, txt){

    const e = document.getElementById(id),
          l = document.getElementById(lb);

    if(e){
        e.style.left = pos + "%";
        e.innerHTML = txt;
    }

    if(l) l.style.left = pos + "%";
}

function actualizarMesesUI(tresMeses){

    if (!fechaInstalacionGlobal) return;

    const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

    const m1 = fechaInstalacionGlobal.getMonth();
    const m2 = (m1 + 1) % 12;
    const m3 = (m1 + 2) % 12;

    document.getElementById("meses").innerHTML = `
        <span>${meses[m1]}</span>
        <span>${meses[m2]}</span>
        ${tresMeses ? `<span>${meses[m3]}</span>` : ""}
    `;
}

function abrirAyuda(){
    document.getElementById('modalAyuda').style.display = 'flex';
}

function cerrarAyuda(){
    document.getElementById('modalAyuda').style.display = 'none';
}

function limpiar(){
    location.reload();
}
