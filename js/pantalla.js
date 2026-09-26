// ===================================================================
// LOTO DIGITAL — Lógica de la pantalla grande
// Se conecta a una sala en modo solo-lectura: muestra los números que
// van saliendo en vivo, pero no tiene botón para sortear (eso se hace
// desde el celular, en la pestaña Tómbola de la app principal).
// ===================================================================

let numerosSacadosPantalla = [];
let salaPantalla = null;
let offListenerPantalla = null;
let codigoPendiente = null; // código a usar apenas Firebase termine de conectar

function obtenerCodigoDeURL() {
    const params = new URLSearchParams(window.location.search);
    return (params.get('sala') || '').toUpperCase().trim();
}

function mostrarFormulario() {
    document.getElementById('formSala').style.display = 'block';
    document.getElementById('avisoConectando').style.display = 'none';
    document.getElementById('pantallaTombola').style.display = 'none';
}

function mostrarConectando() {
    document.getElementById('formSala').style.display = 'none';
    document.getElementById('avisoConectando').style.display = 'block';
    document.getElementById('pantallaTombola').style.display = 'none';
}

function entrarASala(codigo) {
    codigo = (codigo || '').toUpperCase().trim().replace(/[.#$\[\]\/\s]/g, '');
    if (!codigo) return;

    // Si Firebase todavía no está listo, guardamos el código y mostramos
    // "conectando" en vez de quedar con la pantalla en blanco.
    if (!window.fb) {
        codigoPendiente = codigo;
        mostrarConectando();
        return;
    }

    salaPantalla = codigo;
    document.getElementById('formSala').style.display = 'none';
    document.getElementById('avisoConectando').style.display = 'none';
    document.getElementById('pantallaTombola').style.display = 'block';
    document.getElementById('salaCodigoPantalla').innerText = salaPantalla;

    if (offListenerPantalla) { offListenerPantalla(); offListenerPantalla = null; }

    const tombolaRef = window.fb.ref(window.fb.db, `salas/${salaPantalla}/tombola`);
    offListenerPantalla = window.fb.onValue(tombolaRef, (snap) => {
        const datos = snap.val() || {};
        const anterior = numerosSacadosPantalla.length;
        numerosSacadosPantalla = datos.numerosSacados || [];
        renderizarPantalla(numerosSacadosPantalla.length > anterior);
    }, (error) => {
        console.error(error);
    });
}

function renderizarPantalla(huboNumeroNuevo) {
    const ultimo = numerosSacadosPantalla[numerosSacadosPantalla.length - 1];
    const bola = document.getElementById('bolaPantalla');

    if (ultimo !== undefined) {
        bola.classList.remove('bola-vacia');
        bola.innerText = ultimo;
        if (huboNumeroNuevo) {
            bola.classList.remove('pop');
            void bola.offsetWidth; // fuerza a reiniciar la animación
            bola.classList.add('pop');
        }
    } else {
        bola.classList.add('bola-vacia');
        bola.innerText = '?';
    }

    document.getElementById('statSalidosPantalla').innerText = numerosSacadosPantalla.length;
    document.getElementById('statRestantesPantalla').innerText = 90 - numerosSacadosPantalla.length;

    const tablero = document.getElementById('tableroPantalla');
    tablero.innerHTML = '';
    for (let n = 1; n <= 90; n++) {
        const celda = document.createElement('div');
        celda.className = 'num-pantalla';
        celda.innerText = n;
        if (numerosSacadosPantalla.includes(n)) celda.classList.add('pintado');
        if (n === ultimo) celda.classList.add('ultimo');
        tablero.appendChild(celda);
    }

    const lista = document.getElementById('recientesPantalla');
    lista.innerHTML = '';
    [...numerosSacadosPantalla].reverse().slice(0, 12).forEach((n, i) => {
        const chip = document.createElement('div');
        chip.className = 'chip-pantalla' + (i === 0 ? ' reciente' : '');
        chip.innerText = n;
        lista.appendChild(chip);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btnEntrarSala');
    const input = document.getElementById('inputSalaPantalla');
    if (btn) btn.addEventListener('click', () => entrarASala(input.value));
    if (input) input.addEventListener('keydown', (e) => { if (e.key === 'Enter') entrarASala(input.value); });

    // Mostramos algo de inmediato (el formulario o "conectando...") sin esperar
    // a Firebase, para que la pantalla nunca se quede en blanco.
    const codigoURL = obtenerCodigoDeURL();
    if (codigoURL) {
        codigoPendiente = codigoURL;
        mostrarConectando();
    } else {
        mostrarFormulario();
    }

    // Si Firebase ya conectó antes de llegar acá (puede pasar), entramos directo.
    if (window.fb && codigoPendiente) {
        entrarASala(codigoPendiente);
        codigoPendiente = null;
    }

    // Si tarda demasiado en conectar, avisamos en vez de dejarlo pegado.
    setTimeout(() => {
        if (!window.fb) {
            document.getElementById('textoConectando').innerText = '⚠️ No se pudo conectar con la nube. Revisa tu conexión a internet y recarga la página.';
        }
    }, 8000);
});

window.addEventListener('firebase-listo', () => {
    if (codigoPendiente) {
        entrarASala(codigoPendiente);
        codigoPendiente = null;
    }
});
