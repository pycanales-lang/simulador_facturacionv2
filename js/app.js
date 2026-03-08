// --- DENTRO DE js/app.js ---

// 1. TAREA: Desactivar eventos manuales antiguos para priorizar el Slider
// Eliminamos o comentamos los listener de: window.addEventListener("mousemove", dragMove), etc.

document.addEventListener("DOMContentLoaded", () => {
    const slider = document.getElementById("timeSlider");
    
    if(slider) {
        slider.addEventListener("input", (e) => {
            let val = parseFloat(e.target.value);
            
            // 2. TAREA: Implementar sistema de 'Snap' (Imán)
            // Si el valor está a menos de 1.5% de un hito, lo "pegamos"
            val = aplicarSnapMagnetico(val);
            
            // Actualizamos el motor lógico
            posActual = val;
            renderTimeline(posActual); 
            
            // Sincronización fluida de la capa visual
            sincronizarUXInstantanea(val);
        });
    }
});

/**
 * Función de Snap Magnético: Mejora la precisión en pantallas táctiles
 */
function aplicarSnapMagnetico(pos) {
    // Obtenemos posiciones de los hitos reales calculados por el motor
    const hitos = [
        parseFloat(document.getElementById("inst").style.left) || 0,
        parseFloat(document.getElementById("fact").style.left) || 0,
        parseFloat(document.getElementById("vence").style.left) || 0,
        parseFloat(document.getElementById("corte").style.left) || 0
    ];
    
    const umbralSnap = 1.8; // Sensibilidad del imán
    for (const h of hitos) {
        if (Math.abs(pos - h) < umbralSnap) return h;
    }
    return pos;
}

/**
 * 4. TAREA: Refactorizar MutationObserver
 * En lugar de observar cambios en el DOM (lento), usamos una función directa 
 * de actualización llamada desde el evento input (mucho más performante).
 */
function sincronizarUXInstantanea(val) {
    const uxPago = document.getElementById("ux-pago");
    const dayLabel = document.getElementById("ux-day");
    
    // Movimiento ultra-fluido del icono 💰
    if(uxPago) uxPago.style.left = val + "%";
    if(dayLabel) dayLabel.innerText = Math.round((val / 100) * 60);

    // Animación de aparición/desaparición de esferas UX
    const eventosUX = ["ux-inst", "ux-fact1", "ux-vence", "ux-corte", "ux-fact2", "ux-vence2"];
    eventosUX.forEach(id => {
        const el = document.getElementById(id);
        if(!el) return;
        
        // Obtenemos la posición del motor base correspondiente
        const baseId = id.replace("ux-", "").replace("1", "");
        const basePos = parseFloat(document.getElementById(baseId)?.style.left) || 0;

        if (val >= (basePos - 0.5)) {
            el.style.opacity = "1";
            el.style.transform = "translate(-50%, -50%) scale(1)";
        } else {
            el.style.opacity = "0";
            el.style.transform = "translate(-50%, -50%) scale(0.6)";
        }
    });
}
