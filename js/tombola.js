// ===================================================================
// LOTO DIGITAL — Tómbola (sorteo de números 1-90 en vivo por sala)
// La sala se identifica con un código corto; todos los celulares con
// el mismo código ven salir los mismos números en tiempo real,
// gracias a Firebase Realtime Database.
// ===================================================================

let numerosSacados = [];
let vozActiva = true;
let sacando = false;
let salaCodigo = '-----';
let offTombolaListener = null;

function cargarTombola() {
    const vozGuardada = localStorage.getItem('lotoVozActiva');
    if (vozGuardada !== null) vozActiva = vozGuardada === 'true';
    renderTombola();
}

// ---- SALA (sincronización en vivo entre celulares vía Firebase) ----

function generarCodigoSala() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I para evitar confusiones
    let codigo = '';
    for (let i = 0; i < 5; i++) codigo += chars[Math.floor(Math.random() * chars.length)];
    return codigo;
}

function inicializarSala(codigo) {
    salaCodigo = (codigo || generarCodigoSala()).toUpperCase().trim();
    localStorage.setItem('lotoSalaCodigo', salaCodigo);
    const spanCodigo = document.getElementById('salaCodigo');
    if (spanCodigo) spanCodigo.innerText = salaCodigo;

    if (offTombolaListener) { offTombolaListener(); offTombolaListener = null; }

    const tombolaRef = window.fb.ref(window.fb.db, `salas/${salaCodigo}/tombola`);
    offTombolaListener = window.fb.onValue(tombolaRef, (snap) => {
        const datos = snap.val() || {};
        numerosSacados = datos.numerosSacados || [];
        if (!sacando) renderTombola();
    }, (error) => {
        console.error(error);
        mostrarToast('Sin conexión con la sala. Revisa tu internet.', '⚠️', false);
    });
}

function cambiarSala() {
    if (!window.fb) { mostrarToast('Todavía no hay conexión con la nube.', '⚠️', false); return; }
    const propuesta = prompt(`Código de sala actual: ${salaCodigo}\n\nEscribe el código de otra sala para unirte a ella (ej: FAMILIA1), o deja vacío para crear una sala nueva al azar:`);
    if (propuesta === null) return; // canceló
    let nuevoCodigo = propuesta.trim().toUpperCase().replace(/[.#$\[\]\/\s]/g, '');
    if (!nuevoCodigo) nuevoCodigo = generarCodigoSala();
    inicializarSala(nuevoCodigo);
    mostrarToast(`Sala cambiada a: ${nuevoCodigo}`, '🔁', false);
}

function copiarCodigoSala() {
    if (!navigator.clipboard) {
        mostrarToast('Código de la sala: ' + salaCodigo, '📋', false);
        return;
    }
    navigator.clipboard.writeText(salaCodigo).then(() => {
        mostrarToast('Código copiado: ' + salaCodigo, '📋', false);
    }).catch(() => {
        mostrarToast('Código de la sala: ' + salaCodigo, '📋', false);
    });
}

function suscribirConexion() {
    const conexionRef = window.fb.ref(window.fb.db, '.info/connected');
    window.fb.onValue(conexionRef, (snap) => {
        const badge = document.getElementById('badgeConexion');
        if (!badge) return;
        if (snap.val() === true) {
            badge.innerText = '🟢';
            badge.title = 'Conectado en vivo';
        } else {
            badge.innerText = '🔴';
            badge.title = 'Sin conexión';
        }
    });
}

function numerosDisponibles() {
    const disponibles = [];
    for (let n = 1; n <= 90; n++) {
        if (!numerosSacados.includes(n)) disponibles.push(n);
    }
    return disponibles;
}

function renderTombola() {
    const bola = document.getElementById('bola');
    const ultimo = numerosSacados[numerosSacados.length - 1];

    if (!sacando) {
        if (ultimo !== undefined) {
            bola.classList.remove('bola-vacia');
            bola.innerText = ultimo;
        } else {
            bola.classList.add('bola-vacia');
            bola.innerText = '?';
        }
    }

    document.getElementById('statSalidos').innerText = numerosSacados.length;
    document.getElementById('statRestantes').innerText = 90 - numerosSacados.length;

    // Tablero 1-90
    const tablero = document.getElementById('tableroTombola');
    tablero.innerHTML = '';
    for (let n = 1; n <= 90; n++) {
        const celda = document.createElement('div');
        celda.className = 'num-tombola';
        celda.innerText = n;
        if (numerosSacados.includes(n)) celda.classList.add('pintado');
        if (n === ultimo) celda.classList.add('ultimo');
        tablero.appendChild(celda);
    }

    // Lista de salidos (más reciente primero)
    const lista = document.getElementById('listaSalidos');
    if (numerosSacados.length === 0) {
        lista.innerHTML = '<div class="vacio">Todavía no se ha sacado ningún número.</div>';
    } else {
        lista.innerHTML = '';
        [...numerosSacados].reverse().forEach((n, i) => {
            const chip = document.createElement('div');
            chip.className = 'chip-salido' + (i === 0 ? ' reciente' : '');
            chip.innerText = n;
            lista.appendChild(chip);
        });
    }

    // Botones
    const btnSacar = document.getElementById('btnSacar');
    const btnDeshacer = document.getElementById('btnDeshacer');
    if (!sacando) {
        if (numerosSacados.length >= 90) {
            btnSacar.disabled = true;
            btnSacar.innerHTML = '🎉 ¡Se acabaron los números!';
        } else {
            btnSacar.disabled = false;
            btnSacar.innerHTML = '🎲 Sacar número';
        }
    }
    btnDeshacer.disabled = numerosSacados.length === 0 || sacando;

    const btnVoz = document.getElementById('btnVoz');
    if (btnVoz) btnVoz.innerText = vozActiva ? '🔊' : '🔇';
}

function sacarNumero() {
    if (sacando) return;
    const disponibles = numerosDisponibles();
    if (disponibles.length === 0) return;
    if (!window.fb) { mostrarToast('Sin conexión con la nube.', '⚠️', false); return; }

    sacando = true;
    const btnSacar = document.getElementById('btnSacar');
    const btnDeshacer = document.getElementById('btnDeshacer');
    btnSacar.disabled = true;
    btnDeshacer.disabled = true;

    const bola = document.getElementById('bola');
    bola.classList.remove('bola-vacia', 'pop');
    bola.classList.add('girando');

    let vueltas = 0;
    const totalVueltas = 14;
    const intervalo = setInterval(() => {
        const aleatorioVisual = disponibles[Math.floor(Math.random() * disponibles.length)];
        bola.innerText = aleatorioVisual;
        vueltas++;
        if (vueltas >= totalVueltas) {
            clearInterval(intervalo);
            confirmarSorteoEnFirebase(bola);
        }
    }, 55);
}

// Usa una transacción atómica: si dos celulares tocan "Sacar" casi al mismo tiempo,
// Firebase evita que salga el mismo número dos veces.
// Si la conexión está muy lenta o caída, un aviso de tardanza libera los botones
// para que la app no quede pegada esperando para siempre.
function confirmarSorteoEnFirebase(bola) {
    let resuelto = false;

    const avisoTardanza = setTimeout(() => {
        if (resuelto) return;
        sacando = false;
        bola.classList.remove('girando');
        mostrarToast('Está tardando mucho... revisa tu conexión a internet.', '⏳', false);
        renderTombola();
    }, 8000);

    const tombolaRef = window.fb.ref(window.fb.db, `salas/${salaCodigo}/tombola`);
    window.fb.runTransaction(tombolaRef, (actual) => {
        const lista = (actual && actual.numerosSacados) ? actual.numerosSacados.slice() : [];
        const disponiblesReales = [];
        for (let n = 1; n <= 90; n++) if (!lista.includes(n)) disponiblesReales.push(n);
        if (disponiblesReales.length === 0) return actual;
        const elegido = disponiblesReales[Math.floor(Math.random() * disponiblesReales.length)];
        lista.push(elegido);
        return { numerosSacados: lista };
    }).then((resultado) => {
        if (resuelto) return; // ya se mostró el aviso de tardanza; el listener en vivo actualizará solo
        resuelto = true;
        clearTimeout(avisoTardanza);

        sacando = false;
        bola.classList.remove('girando');
        const datosFinales = resultado.snapshot.val();
        const valorFinal = datosFinales && datosFinales.numerosSacados ? datosFinales.numerosSacados[datosFinales.numerosSacados.length - 1] : null;
        if (valorFinal !== null && valorFinal !== undefined) {
            bola.innerText = valorFinal;
            bola.classList.add('pop');
            setTimeout(() => bola.classList.remove('pop'), 400);
            hablarNumero(valorFinal);
        }
        renderTombola();
    }).catch((err) => {
        if (resuelto) return;
        resuelto = true;
        clearTimeout(avisoTardanza);

        console.error(err);
        sacando = false;
        bola.classList.remove('girando');
        mostrarToast('No se pudo sacar el número (sin conexión).', '⚠️', false);
        renderTombola();
    });
}

function deshacerUltimo() {
    if (sacando || numerosSacados.length === 0) return;
    if (!window.fb) { mostrarToast('Sin conexión con la nube.', '⚠️', false); return; }
    const ultimo = numerosSacados[numerosSacados.length - 1];
    if (!confirm(`¿Deshacer el último número sacado (${ultimo}) para todos en la sala ${salaCodigo}?`)) return;
    const tombolaRef = window.fb.ref(window.fb.db, `salas/${salaCodigo}/tombola`);
    window.fb.runTransaction(tombolaRef, (actual) => {
        const lista = (actual && actual.numerosSacados) ? actual.numerosSacados.slice() : [];
        lista.pop();
        return { numerosSacados: lista };
    }).catch(err => {
        console.error(err);
        mostrarToast('No se pudo deshacer (sin conexión).', '⚠️', false);
    });
}

function reiniciarTombola() {
    if (sacando || numerosSacados.length === 0) return;
    if (!window.fb) { mostrarToast('Sin conexión con la nube.', '⚠️', false); return; }
    if (!confirm(`¿Reiniciar la tómbola de la sala ${salaCodigo} para todos?\n\nLos ${numerosSacados.length} números de esta partida quedarán guardados en "Partidas anteriores".`)) return;

    archivarPartidaActual(() => {
        const tombolaRef = window.fb.ref(window.fb.db, `salas/${salaCodigo}/tombola`);
        window.fb.set(tombolaRef, { numerosSacados: [] }).catch(err => {
            console.error(err);
            mostrarToast('No se pudo reiniciar (sin conexión).', '⚠️', false);
        });
    });
}

function abrirPantallaGrande() {
    const url = `pantalla.html?sala=${encodeURIComponent(salaCodigo)}`;
    window.open(url, '_blank');
}

function toggleVoz() {
    vozActiva = !vozActiva;
    localStorage.setItem('lotoVozActiva', vozActiva);
    renderTombola();
    if (vozActiva) hablarTexto('Voz activada');
}

function hablarTexto(texto) {
    if (!('speechSynthesis' in window)) return;
    try {
        const utter = new SpeechSynthesisUtterance(texto);
        utter.lang = 'es-CL';
        utter.rate = 1;
        speechSynthesis.cancel();
        speechSynthesis.speak(utter);
    } catch(e) { console.error(e); }
}

function hablarNumero(n) {
    if (!vozActiva) return;
    hablarTexto('Número ' + n);
}
