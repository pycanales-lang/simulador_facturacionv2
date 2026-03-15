/**
 * SIMULADOR TELCO PRO - MOTOR DINÁMICO SIEBEL 2026
 * Sincronización total de Timeline, Esferas y Mensajes de Negocio
 */
const PLANES = {

tv:[
{nombre:"TV Básico",precio:95000},
{nombre:"TV Full",precio:120000},
{nombre:"TV Premium",precio:150000}
],

internet:[
{nombre:"Internet 150MB",precio:110000},
{nombre:"Internet 300MB",precio:140000},
{nombre:"Internet 600MB",precio:180000}
],

combo:[
{nombre:"Dúo Básico",precio:180000},
{nombre:"Dúo Plus",precio:220000},
{nombre:"Dúo Premium",precio:260000}
]

};

function cargarPlanes(){

const producto = document.getElementById("producto").value;
const select = document.getElementById("planSelect");

select.innerHTML = '<option value="">Seleccionar plan</option>';

if(producto === "tactica"){
return;
}

PLANES[producto].forEach((plan,i)=>{

const option = document.createElement("option");

option.value = i;
option.textContent = plan.nombre + " - " + plan.precio.toLocaleString();

select.appendChild(option);

});

}

function aplicarPlan(){

const producto = document.getElementById("producto").value;
const index = document.getElementById("planSelect").value;

if(index === "") return;

const plan = PLANES[producto][index];

document.getElementById("plan").value = plan.precio;

}

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
let timelineDias = 60;
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
    // AJUSTE DINÁMICO DEL RANGO DE TIMELINE
    if(diaInst >= 15){
        timelineDias = 90;
    }else{
        timelineDias = 60;
    }
    cicloActual = obtenerCicloAsignado(diaInst);

    const hoy = new Date();
    const diffMeses = (hoy.getFullYear() - fechaInstalacionGlobal.getFullYear()) * 12 + (hoy.getMonth() - fechaInstalacionGlobal.getMonth());
    esCuentaNueva = diffMeses <= 4;

    actualizarMesesUI(false);

    const posInst = (diaInst / timelineDias) * 100;
        
    let posFact1 = (cicloActual <= diaInst && cicloActual !== 1) 
        ? ((30 + cicloActual) / timelineDias) * 100
        : (cicloActual === 1 ? 52 : (cicloActual / timelineDias) * 100);
    
    const regla = REGLAS_NEGOCIO.ciclos[cicloActual];
    
    let offsetVence = (regla.vence >= regla.emision) 
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
    if(exoBar) {
        exoBar.style.left = posInst + "%";
        exoBar.style.width = (posFact1 - posInst) + "%";
    }

    posActual = posInst;

    generarReglaTiempo();
    renderTimeline(posActual);
}

function renderTimeline(pos) {

    const track = document.getElementById("timelineTrack");
    const diaBadge = document.getElementById("diaBadge");

    if(!track || !diaBadge) return;

    const offset = (50 - pos) * TRACK_SCALE;
    track.style.transform = `translateX(${offset}%)`;

    const diaCalendario = Math.round((pos / 100) * timelineDias);
    diaBadge.innerText = `Día ${diaCalendario}`;

    setPos("pay", "payLabel", pos, "💰");

    actualizarLogicaNegocio(pos);
    actualizarMesesVisibles(pos);
}

function actualizarLogicaNegocio(pos) {
    if (!fechaInstalacionGlobal) return;

    const p = parseFloat(document.getElementById("plan").value) || 0;
    const a = parseFloat(document.getElementById("anticipo").value) || 0;
    const saldoF1 = p - a;

    const posInst = parseFloat(document.getElementById("inst").style.left) || 0;
    const posFact1 = parseFloat(document.getElementById("fact").style.left) || 0;
    const posV1 = parseFloat(document.getElementById("vence").style.left) || 0;
    const posC1 = parseFloat(document.getElementById("corte").style.left) || 0;
    const posFact2 = parseFloat(document.getElementById("fact2").style.left) || 0;
    const posV2 = parseFloat(document.getElementById("vence2").style.left) || 0;

    let estado = "EN PLAZO", color = "var(--success)", mensaje = "";
    let diasExo = Math.round(((posFact1 - posInst) / 100) * 90);

    if (pos < posInst) {
         mensaje = "Aún no instalado";
    } else if (pos >= posInst && pos < posFact1) {
        mensaje = "Servicio activo sin facturación.";
    } else if (pos >= posFact1 && pos <= posV1) {
        mensaje = "Factura emitida. Recordar pagar en fecha.";
    }

    if (pos > posV1 && pos < posC1) {
        estado = "EN MORA"; color = "var(--warning)";
        mensaje = "Cliente con pago atrasado.";
    } 

    if (pos >= posC1) {
        estado = "CORTE PARCIAL"; color = "var(--danger)";
        mensaje = "Servicio suspendido.";
    }
    
    if (esCuentaNueva && pos >= posC1) {
         document.getElementById("bannerChurn").style.display = "block";
         estado = "EARLY CHURN";
         color = "var(--dark-danger)";
         mensaje = "¡ALERTA! Riesgo de bajada temprana por Mora.";
    } else {
         document.getElementById("bannerChurn").style.display = "none";
    }

    // CORRECCIÓN TOTAL: El cargo adm y F2 solo suman cuando llegamos a la emisión de F2
    let total = 0;
    if (pos >= posFact1 && pos < posFact2) {
        total = saldoF1;
    } else if (pos >= posFact2) {
        total = saldoF1 + p + REGLAS_NEGOCIO.config.cargo_adm;
    }

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
    } else if (cicloActual === 1) {
        fEmi.setMonth(fEmi.getMonth() + 1);
    }
    
    const regla = REGLAS_NEGOCIO.ciclos[cicloActual];
    const offsetVenceLocal = (regla.vence >= regla.emision) ? (regla.vence - regla.emision) : (30 - regla.emision + regla.vence);
    const fVence = new Date(fEmi);
    fVence.setDate(fEmi.getDate() + offsetVenceLocal);
    
    const fCorte = new Date(fEmi);
    fCorte.setDate(fEmi.getDate() + 32);

    let detalleHTML = `    <div style="text-align:left; font-size:13px; line-height:1.8;">
    <div style="background:rgba(255,255,255,0.08); padding:8px; border-radius:6px; margin-bottom:8px; font-weight:600; color:#FFD166; text-align:center;">
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

    // DETALLE DE VALORES (CAJA INFERIOR)
    const exoMonto = Math.round((diasExo * (p/30)));
    document.getElementById("det-exo").innerText = "Gs. " + exoMonto.toLocaleString();

    // Saldo F1
    document.getElementById("det-f1").innerText = (pos >= posFact1) ? "Gs. " + saldoF1.toLocaleString() : "-";

    // Factura F2: Solo sale cuando alcanza la emisión de la segunda
    document.getElementById("det-f2").innerText = (pos >= posFact2) ? "Gs. " + p.toLocaleString() : "-";

    // Cargo Administrativo: Sale como aviso al vencer F1, con valor real al emitir F2
    if(pos >= posV1){
        document.getElementById("det-adm").innerText = "Gs. " + REGLAS_NEGOCIO.config.cargo_adm.toLocaleString();
    } else {
        document.getElementById("det-adm").innerText = "-";
    }
}

function setPos(id, lb, pos, txt) {
    const e = document.getElementById(id), l = document.getElementById(lb);
    if (e) { e.style.left = pos + "%"; e.innerHTML = txt; }
    if (l) l.style.left = pos + "%";
}

function actualizarMesesUI() {

    if (!fechaInstalacionGlobal) return;

    const contenedor = document.getElementById("meses");
    contenedor.innerHTML = "";

    const mesesNombre = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

    const fechaInicio = new Date(fechaInstalacionGlobal);
    const fechaFin = new Date(fechaInicio);
    fechaFin.setDate(fechaFin.getDate() + timelineDias);

    const diaInst = fechaInicio.getDate();
    const posInicio = (diaInst / timelineDias) * 100;

    let cursor = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth(), 1);

    while(cursor <= fechaFin){

        const diffDias = Math.floor((cursor - fechaInicio) / (1000*60*60*24));
        const posicion = posInicio + (diffDias / timelineDias) * 100;

        const mesDiv = document.createElement("span");
        mesDiv.className = "mes-label";
        mesDiv.innerText = mesesNombre[cursor.getMonth()];

        mesDiv.style.position = "absolute";
        mesDiv.style.left = posicion + "%";
        mesDiv.style.transform = "translateX(-50%)";
        mesDiv.style.opacity = "0";
        mesDiv.dataset.pos = posicion;

        contenedor.appendChild(mesDiv);

        cursor.setMonth(cursor.getMonth() + 1);
    }

}

function actualizarMesesVisibles(posActual){

    const meses = document.querySelectorAll(".mes-label");

    meses.forEach(m => {

        const pos = parseFloat(m.dataset.pos);

        if(posActual >= pos){
            m.style.opacity = "1";
        }else{
            m.style.opacity = "0";
        }

    });

}

function abrirAyuda() {
    document.getElementById('modalAyuda').style.display = 'flex';
}

function cerrarAyuda() {
    document.getElementById('modalAyuda').style.display = 'none';
}

function limpiar() {
    location.reload();
}

document.addEventListener("DOMContentLoaded", () => {
    let updatePending = false;
    const observer = new MutationObserver(() => {
        if (!fechaInstalacionGlobal || updatePending) return;
        updatePending = true;
        requestAnimationFrame(() => {
            actualizarUX();
            updatePending = false;
        });
    });
    const infoDiv = document.getElementById("info");
    if (infoDiv) observer.observe(infoDiv, { childList: true, subtree: true });

    const slider = document.getElementById("timeSlider");
    if(slider){
        slider.addEventListener("input",(e)=>{
            posActual = parseFloat(e.target.value);
            renderTimeline(posActual);
            const uxPago = document.getElementById("ux-pago");
            if(uxPago) uxPago.style.left = posActual + "%";
            const dayLabel = document.getElementById("ux-day");
            if(dayLabel) dayLabel.innerText = Math.round((posActual / 100) * timelineDias);
        });
    }
});

function actualizarUX() {
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

    hitos.forEach(h => {
        const el = document.getElementById(h.id);
        if(!el) return;
        el.style.left = h.pos + "%";
        if (posActual >= (h.pos - 1)) {
            el.style.opacity = "1";
            el.style.transform = "translate(-50%, -50%) scale(1)";
        } else {
            el.style.opacity = "0";
            el.style.transform = "translate(-50%, -50%) scale(0.5)";
        }
    });

    const baseInfo = document.getElementById("info");
    const uxInfo = document.getElementById("infoUX");
    const descBox = document.getElementById("ux-message");

    if(baseInfo && uxInfo) {
        uxInfo.innerHTML = baseInfo.innerHTML;
        const badge = baseInfo.querySelector('.state-badge');
        if (badge && descBox) {
            descBox.style.display = "block";
            const estadoActual = badge.innerText;
            if (estadoActual === "Aún no instalado") {
                 descBox.innerHTML = "Mueve el cursor para empezar.";
            } else if(estadoActual === "EN PLAZO" && posActual < posFact1) {
                descBox.innerHTML = "Servicio activo.<br>Acumulas días exonerados.";
            } else {
                const mensajeOriginal = baseInfo.querySelector("p");
                if (mensajeOriginal) descBox.innerText = mensajeOriginal.innerText;
            }
        }
    }

    const baseDetalle = document.getElementById("detalleFacturacion");
    const uxDetalle = document.getElementById("detalleFechasUX");
    if(baseDetalle && uxDetalle) uxDetalle.innerHTML = baseDetalle.innerHTML;

    const baseChurn = document.getElementById("bannerChurn");
    const uxChurn = document.getElementById("bannerChurnUX");
    if(baseChurn && uxChurn) uxChurn.style.display = baseChurn.style.display;
}

function actualizarReglaFechas(){

if(!fechaInstalacionGlobal) return;

const inst = new Date(fechaInstalacionGlobal);

const f1 = new Date(inst);
f1.setDate(inst.getDate()+7);

const venc = new Date(inst);
venc.setDate(inst.getDate()+21);

const corte = new Date(inst);
corte.setDate(inst.getDate()+35);

const formato = d => d.toLocaleDateString("es-PY",{day:"2-digit",month:"short"});

document.getElementById("timelineFechas").innerHTML= `
<span>${formato(inst)}</span>
<span>${formato(f1)}</span>
<span>${formato(venc)}</span>
<span>${formato(corte)}</span>`;
}

function generarReglaTiempo(){

if(!fechaInstalacionGlobal) return;

const regla = document.getElementById("timelineRegla");
if(!regla) return;

regla.innerHTML="";

const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const totalDias = timelineDias;

for(let d=0; d<=totalDias; d+=15){

const fecha = new Date(fechaInstalacionGlobal);
fecha.setDate(fechaInstalacionGlobal.getDate()+d);

const pos = (d/totalDias)*100;

const marca = document.createElement("div");
marca.className="regla-marca";
marca.style.left = pos+"%";

marca.innerHTML=`<div>${fecha.getDate()} ${meses[fecha.getMonth()]}</div>
<div class="regla-linea"></div>`;
regla.appendChild(marca);

}

}

function toggleFacturaDetalle(){

const box = document.getElementById("facturaDetalle");

if(box.style.display==="none" || box.style.display===""){
box.style.display="block";
}else{
box.style.display="none";
}

}
