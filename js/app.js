let cicloActual = 0, fechaInstalacionGlobal = null, esCuentaNueva = false;
const tablaCiclos = { 1: { vence: 15 }, 7: { vence: 21 }, 15: { vence: 1 }, 21: { vence: 5 } };

function obtenerCicloAsignado(dia) {
    if (dia <= 6) return 7; if (dia <= 14) return 15; if (dia <= 20) return 21; return 1;
}

function simular() {
    let fStr = document.getElementById("fecha").value;
    if (!fStr) return alert("Ingrese fecha de instalación");
    
    fechaInstalacionGlobal = new Date(fStr + 'T00:00:00');
    let dia = fechaInstalacionGlobal.getDate();
    cicloActual = obtenerCicloAsignado(dia);
    
    let hoy = new Date();
    let mesesDiff = (hoy.getFullYear() - fechaInstalacionGlobal.getFullYear()) * 12 + (hoy.getMonth() - fechaInstalacionGlobal.getMonth());
    esCuentaNueva = mesesDiff <= 4;

    actualizarMeses(false);

    let posInst = (dia / 60) * 100;
    let posFact = (cicloActual <= dia && cicloActual !== 1) ? ((30 + cicloActual) / 60) * 100 : (cicloActual === 1 ? 52 : (cicloActual / 60) * 100);
    let posVence = posFact + (tablaCiclos[cicloActual].vence < cicloActual ? (tablaCiclos[cicloActual].vence + (30 - cicloActual)) / 60 * 100 : (tablaCiclos[cicloActual].vence - cicloActual) / 60 * 100);

    setPos("inst", "instLabel", posInst, "I");
    setPos("fact", "factLabel", posFact, "1");
    setPos("vence", "venceLabel", Math.min(posVence, 94), "V");
    
    // Iniciar el pago (P) en la instalación para que el usuario empiece a arrastrar
    setPos("pay", "payLabel", posInst, "P");

    actualizarDetalle(false);
}

function actualizarDetalle(esAtrasado) {
    if (!fechaInstalacionGlobal) return;
    let p = parseFloat(document.getElementById("plan").value) || 0;
    let a = parseFloat(document.getElementById("anticipo").value) || 0;
    let s = p - a;

    let fEmision1 = new Date(fechaInstalacionGlobal.getFullYear(), fechaInstalacionGlobal.getMonth(), cicloActual);
    if (cicloActual <= fechaInstalacionGlobal.getDate() && cicloActual !== 1) fEmision1.setMonth(fEmision1.getMonth() + 1);
    if (cicloActual === 1) fEmision1.setMonth(fechaInstalacionGlobal.getMonth() + 1);

    let total = esAtrasado ? (p + s + 12000) : s;
    
    document.getElementById("info").innerHTML = `
        <span style="color:${esAtrasado ? 'var(--danger)' : 'var(--success)'}; font-weight:bold">
            ${esAtrasado ? '⚠ PAGO ATRASADO' : '✓ PAGO A TIEMPO'}
        </span>
        <span class="total-factura">Total: Gs. ${total.toLocaleString()}</span>
    `;

    document.getElementById("detalleFacturacion").innerHTML = `
        Ciclo: <strong>${cicloActual}</strong> | Emisión F1: <strong>${fEmision1.toLocaleDateString()}</strong>
    `;
}

function setPos(id, label, pos, text) {
    document.getElementById(id).style.left = pos + "%";
    document.getElementById(label).style.left = pos + "%";
    document.getElementById(id).innerHTML = text;
}

// --- MOTOR DE ARRASTRE (FIXED) ---
const pago = document.getElementById("pay");
const timeline = document.querySelector(".timeline");

const move = (e) => {
    let rect = timeline.getBoundingClientRect();
    let x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    let pos = Math.max(0, Math.min(100, (x / rect.width) * 100));
    
    pago.style.left = pos + "%";
    document.getElementById("payLabel").style.left = pos + "%";

    let vPos = parseFloat(document.getElementById("vence").style.left);
    
    if (pos > vPos) {
        actualizarDetalle(true);
        if (esCuentaNueva) document.getElementById("bannerChurn").style.display = "block";
    } else {
        actualizarDetalle(false);
        document.getElementById("bannerChurn").style.display = "none";
    }
};

pago.addEventListener("mousedown", () => document.addEventListener("mousemove", move));
document.addEventListener("mouseup", () => document.removeEventListener("mousemove", move));
pago.addEventListener("touchstart", (e) => { e.preventDefault(); document.addEventListener("touchmove", move); });
document.addEventListener("touchend", () => document.removeEventListener("touchmove", move));

function actualizarMeses(tres) { /* Lógica de meses igual al original */ }
function abrirAyuda() { document.getElementById("modalAyuda").style.display = "flex"; }
function cerrarAyuda() { document.getElementById("modalAyuda").style.display = "none"; }
function limpiar() { location.reload(); }
