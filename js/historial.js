// ===================================================================
// LOTO DIGITAL — Historial de cartones guardados (en la nube, Firebase)
// Guardar/cargar/eliminar cartones y exportar/importar respaldos JSON.
// El historial se sincroniza en vivo: cualquier celular que abra la
// app ve los mismos cartones guardados.
// ===================================================================

let historialCache = {};
let historialCargado = false; // distingue "todavía cargando" de "no hay nada guardado"

function guardarEnHistorial() {
    const vacios1 = cartones[0].filter(n => n === null).length;
    const vacios2 = cartones[1].filter(n => n === null).length;

    if (vacios1 === 27 && vacios2 === 27) {
        alert("Los cartones están vacíos. Agrega números antes de guardar.");
        return;
    }

    if (!window.fb) {
        alert("⚠️ Todavía no hay conexión con la nube. Espera un segundo e intenta de nuevo.");
        return;
    }

    const nombre = prompt("Ponle un nombre a este cartón (ej: 'Loto 15/03', 'Cartón de la suerte'):");
    if (!nombre) return;

    const nuevoRef = window.fb.push(window.fb.ref(window.fb.db, 'cartones'));
    const nuevoItem = {
        nombre: nombre,
        fecha: new Date().toLocaleString('es-CL'),
        creado: Date.now(),
        cartones: JSON.parse(JSON.stringify(cartones))
    };

    window.fb.set(nuevoRef, nuevoItem).then(() => {
        localStorage.setItem('lotoCartonesActual', JSON.stringify({ cartones: cartones, bloqueado: true }));
        bloqueado = true;
        actualizarUI();
        renderizar();
        alert(`✅ Cartón "${nombre}" guardado en la nube y bloqueado.`);
    }).catch(err => {
        console.error(err);
        alert("⚠️ No se pudo guardar en la nube. Revisa tu conexión a internet e intenta de nuevo.");
    });
}

function suscribirHistorial() {
    const historialRef = window.fb.ref(window.fb.db, 'cartones');
    window.fb.onValue(historialRef, (snap) => {
        historialCache = snap.val() || {};
        historialCargado = true;
        if (document.getElementById('modalHistorial').classList.contains('activo')) {
            renderizarListaHistorial();
        }
    }, (error) => {
        console.error(error);
        mostrarToast('No se pudo leer el historial de la nube.', '⚠️', false);
    });
}

function abrirHistorial() {
    renderizarListaHistorial();
    document.getElementById('modalHistorial').classList.add('activo');
}

function renderizarListaHistorial() {
    const lista = document.getElementById('listaHistorial');

    if (!historialCargado) {
        lista.innerHTML = '<div class="vacio">Cargando cartones guardados...</div>';
        return;
    }

    const entradas = Object.entries(historialCache || {}).sort((a, b) => (b[1].creado || 0) - (a[1].creado || 0));

    if (entradas.length === 0) {
        lista.innerHTML = '<div class="vacio">No hay cartones guardados todavía.</div>';
        return;
    }

    lista.innerHTML = '';
    entradas.forEach(([id, item]) => {
        const div = document.createElement('div');
        div.className = 'item-historial';

        let miniaturasHTML = '<div class="miniatura">';
        item.cartones.forEach(carton => {
            miniaturasHTML += '<div class="mini-carton">';
            carton.forEach(num => {
                if (num === null || num === undefined) {
                    miniaturasHTML += '<div class="mini-celda vacia"></div>';
                } else {
                    miniaturasHTML += `<div class="mini-celda">${num}</div>`;
                }
            });
            miniaturasHTML += '</div>';
        });
        miniaturasHTML += '</div>';

        div.innerHTML = `
            <div class="item-historial-header">
                <div class="item-historial-info">
                    <div class="item-historial-nombre">${item.nombre}</div>
                    <div class="item-historial-fecha">${item.fecha}</div>
                </div>
                <button class="btn-mini btn-mini-eliminar" onclick="eliminarDelHistorial('${id}')">✕</button>
            </div>
            ${miniaturasHTML}
            <div class="item-historial-acciones">
                <button class="btn-mini btn-mini-cargar" onclick="cargarDesdeHistorial('${id}', false)">📝 Editar</button>
                <button class="btn-mini btn-mini-jugar" onclick="cargarDesdeHistorial('${id}', true)">🎮 Jugar</button>
            </div>
        `;
        lista.appendChild(div);
    });
}

function cerrarHistorial() {
    document.getElementById('modalHistorial').classList.remove('activo');
}

function cargarDesdeHistorial(id, jugar) {
    const item = historialCache[id];
    if (!item) return;

    cartones = JSON.parse(JSON.stringify(item.cartones));
    bloqueado = jugar; // Si "jugar" es true, se bloquea. Si es false, se desbloquea para editar.

    localStorage.setItem('lotoCartonesActual', JSON.stringify({ cartones: cartones, bloqueado: bloqueado }));

    cerrarHistorial();
    actualizarUI();
    renderizar();

    if (jugar) {
        alert(`🎮 Modo Juego activado: "${item.nombre}"\n\nToca los números que vayan saliendo para marcarlos en verde.`);
    } else {
        alert(`📝 Modo Edición: "${item.nombre}"\n\nPuedes modificar los números.`);
    }
}

function eliminarDelHistorial(id) {
    if (!confirm("¿Eliminar este cartón guardado de la nube? Se borrará para todos los que usen esta app.")) return;
    if (!window.fb) { alert("⚠️ Sin conexión con la nube."); return; }
    window.fb.remove(window.fb.ref(window.fb.db, 'cartones/' + id)).catch(err => {
        console.error(err);
        alert("⚠️ No se pudo eliminar. Revisa tu conexión.");
    });
    // La lista se actualiza sola gracias al listener en tiempo real.
}

// --- EXPORTAR / IMPORTAR JSON ---
function exportarJSON() {
    const actual = localStorage.getItem('lotoCartonesActual') || '{}';

    const datosExportar = {
        version: 3,
        fecha: new Date().toISOString(),
        historial: historialCache || {},
        cartonesActuales: JSON.parse(actual),
        tombola: { numerosSacados: numerosSacados, sala: salaCodigo }
    };

    const blob = new Blob([JSON.stringify(datosExportar, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loto_respaldo_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert("✅ Archivo exportado. Revisa tu carpeta de descargas.");
}

function importarJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!window.fb) {
        alert("⚠️ Todavía no hay conexión con la nube. Espera un segundo e intenta de nuevo.");
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const datos = JSON.parse(e.target.result);

            if (!datos.version || !datos.historial) {
                alert("❌ El archivo no es válido o no es un respaldo de esta app.");
                return;
            }

            // Compatibilidad con respaldos viejos (historial era una lista) y nuevos (objeto de Firebase)
            const items = Array.isArray(datos.historial) ? datos.historial : Object.values(datos.historial);

            if (items.length === 0) {
                alert("El respaldo no tiene cartones guardados.");
                return;
            }

            const confirmar = confirm(`¿Importar respaldo del ${datos.fecha.slice(0,10)}?\n\nContiene ${items.length} cartón(es) guardado(s).\n\nSe subirán a la nube (se suman a los que ya tienes, no se borra nada).`);
            if (!confirmar) return;

            const escrituras = items.map(item => {
                const nuevoRef = window.fb.push(window.fb.ref(window.fb.db, 'cartones'));
                return window.fb.set(nuevoRef, {
                    nombre: item.nombre,
                    fecha: item.fecha,
                    creado: item.creado || Date.now(),
                    cartones: item.cartones
                });
            });

            Promise.all(escrituras).then(() => {
                if (datos.cartonesActuales) {
                    localStorage.setItem('lotoCartonesActual', JSON.stringify(datos.cartonesActuales));
                }
                alert("✅ Respaldo importado a la nube correctamente. Recargando...");
                location.reload();
            }).catch(err => {
                console.error(err);
                alert("⚠️ Hubo un problema subiendo algunos cartones. Revisa tu conexión e intenta de nuevo.");
            });

        } catch(err) {
            console.error(err);
            alert("❌ Error al leer el archivo. Asegúrate de que sea un JSON válido.");
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Permite volver a seleccionar el mismo archivo
}
