// ===================================================================
// LOTO DIGITAL — Historial de partidas de tómbola
// Cada vez que se reinicia la tómbola, la partida que termina se
// guarda acá (qué números salieron, en qué sala, cuándo), para poder
// revisarla después. Vive en Firebase bajo 'partidasTombola'.
// ===================================================================

let partidasCache = {};
let partidasCargadas = false;

// La llama reiniciarTombola() (en tombola.js) justo antes de vaciar la
// tómbola actual. callback se ejecuta siempre, se haya podido guardar o no,
// para no bloquear el reinicio si algo falla.
function archivarPartidaActual(callback) {
    if (!window.fb || numerosSacados.length === 0) {
        if (callback) callback();
        return;
    }
    const nuevoRef = window.fb.push(window.fb.ref(window.fb.db, 'partidasTombola'));
    window.fb.set(nuevoRef, {
        sala: salaCodigo,
        fecha: new Date().toLocaleString('es-CL'),
        creado: Date.now(),
        numerosSacados: numerosSacados.slice()
    }).catch(err => {
        console.error(err);
    }).finally(() => {
        if (callback) callback();
    });
}

function suscribirPartidas() {
    const partidasRef = window.fb.ref(window.fb.db, 'partidasTombola');
    window.fb.onValue(partidasRef, (snap) => {
        partidasCache = snap.val() || {};
        partidasCargadas = true;
        if (document.getElementById('modalPartidas').classList.contains('activo')) {
            renderizarListaPartidas();
        }
    }, (error) => {
        console.error(error);
        mostrarToast('No se pudo leer las partidas guardadas.', '⚠️', false);
    });
}

function abrirPartidas() {
    renderizarListaPartidas();
    document.getElementById('modalPartidas').classList.add('activo');
}

function cerrarPartidas() {
    document.getElementById('modalPartidas').classList.remove('activo');
}

function renderizarListaPartidas() {
    const lista = document.getElementById('listaPartidas');

    if (!partidasCargadas) {
        lista.innerHTML = '<div class="vacio">Cargando partidas...</div>';
        return;
    }

    const entradas = Object.entries(partidasCache || {}).sort((a, b) => (b[1].creado || 0) - (a[1].creado || 0));

    if (entradas.length === 0) {
        lista.innerHTML = '<div class="vacio">Todavía no hay partidas guardadas.<br>Se guardan solas cada vez que reinicias la tómbola.</div>';
        return;
    }

    lista.innerHTML = '';
    entradas.forEach(([id, partida]) => {
        const div = document.createElement('div');
        div.className = 'item-partida';

        const numeros = partida.numerosSacados || [];
        const chipsHTML = numeros.map(n => `<span class="chip-mini">${n}</span>`).join('');

        div.innerHTML = `
            <div class="item-partida-header">
                <div class="item-partida-info">
                    <div class="item-partida-titulo">Sala ${partida.sala || '-----'} · ${numeros.length} número(s)</div>
                    <div class="item-partida-fecha">${partida.fecha || ''}</div>
                </div>
                <button class="btn-mini btn-mini-eliminar" onclick="eliminarPartida('${id}')">✕</button>
            </div>
            <div class="chips-partida">${chipsHTML}</div>
        `;
        lista.appendChild(div);
    });
}

function eliminarPartida(id) {
    if (!confirm("¿Eliminar esta partida guardada?")) return;
    if (!window.fb) { alert("⚠️ Sin conexión con la nube."); return; }
    window.fb.remove(window.fb.ref(window.fb.db, 'partidasTombola/' + id)).catch(err => {
        console.error(err);
        alert("⚠️ No se pudo eliminar. Revisa tu conexión.");
    });
}
