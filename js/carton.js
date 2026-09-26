// ===================================================================
// LOTO DIGITAL — Editor de cartones
// Cuadrícula de 27 celdas x 2 cartones, teclado numérico, modo borrar,
// y la detección de LÍNEA / LOTO al marcar celdas.
// No depende de Firebase: el cartón que se está editando vive solo
// en este navegador (localStorage). Solo al "Guardar" pasa a la nube
// (ver historial.js).
// ===================================================================

let cartones = [new Array(27).fill(null), new Array(27).fill(null)];
let modoBorrar = false;
let bloqueado = false;
let editando = { carton: null, celda: null };
let valorActual = '';

function cargarInicial() {
    const guardado = localStorage.getItem('lotoCartonesActual');
    if (guardado) {
        try {
            const datos = JSON.parse(guardado);
            cartones = datos.cartones;
            bloqueado = datos.bloqueado || false;
        } catch(e) { console.error(e); }
    }
    renderizar();
    actualizarUI();
}

function actualizarUI() {
    const infoGuardado = document.getElementById('infoGuardado');
    const btnGuardar = document.getElementById('btnGuardar');
    const btnEditar = document.getElementById('btnEditar');

    if (bloqueado) {
        infoGuardado.style.display = 'block';
        infoGuardado.innerText = '🔒 Cartones guardados y bloqueados. Presiona "Editar" para modificarlos.';
        btnGuardar.style.display = 'none';
        btnEditar.style.display = 'flex';
    } else {
        infoGuardado.style.display = 'none';
        btnGuardar.style.display = 'flex';
        btnEditar.style.display = 'none';
    }
}

function renderizar() {
    const contenedor = document.getElementById('contenedor-cartones');
    contenedor.innerHTML = '';

    cartones.forEach((carton, indexCarton) => {
        const cartonDiv = document.createElement('div');
        cartonDiv.className = 'carton' + (bloqueado ? ' bloqueado' : '');

        const title = document.createElement('div');
        title.className = 'carton-title';
        title.innerHTML = `<span>Cartón ${indexCarton + 1}</span>`;
        if (bloqueado) {
            title.innerHTML += `<span class="badge-bloqueado">GUARDADO</span>`;
        }
        cartonDiv.appendChild(title);

        const grid = document.createElement('div');
        grid.className = 'grid';

        carton.forEach((numero, indexCelda) => {
            const celda = document.createElement('div');
            celda.className = 'celda';

            if (numero === null) {
                celda.classList.add('vacia');
                if (bloqueado) celda.classList.add('bloqueada');
                celda.innerText = '?';
                if (!bloqueado) {
                    celda.addEventListener('click', () => abrirTeclado(indexCarton, indexCelda));
                }
            } else {
                celda.classList.add('con-numero');
                if (bloqueado) celda.classList.add('bloqueada');
                celda.innerText = numero;

                if (modoBorrar && !bloqueado) celda.classList.add('eliminando');

                celda.addEventListener('click', () => {
                    if (modoBorrar && !bloqueado) {
                        cartones[indexCarton][indexCelda] = null;
                        renderizar();
                        if (!cartones[indexCarton].some(n => n !== null)) {
                            modoBorrar = false;
                            document.getElementById('btnBorrar').classList.remove('activo');
                        }
                    } else {
                       celda.classList.toggle('marcada');
                       verificarLineasYloto(indexCarton);
                    }
                });
            }

            grid.appendChild(celda);
        });

        cartonDiv.appendChild(grid);
        contenedor.appendChild(cartonDiv);
    });
}

function toggleModoBorrar() {
    if (bloqueado) { alert("Primero debes presionar '🔓 Editar' para modificar."); return; }
    modoBorrar = !modoBorrar;
    const btn = document.getElementById('btnBorrar');
    if (modoBorrar) {
        btn.classList.add('activo');
        btn.innerHTML = '❌ Cancelar';
    } else {
        btn.classList.remove('activo');
        btn.innerHTML = '🗑️ Borrar';
    }
    renderizar();
}

function abrirTeclado(indexCarton, indexCelda) {
    if (bloqueado) return;
    editando = { carton: indexCarton, celda: indexCelda };
    valorActual = '';
    document.getElementById('teclado-display').innerText = '--';
    document.getElementById('teclado-titulo').innerText = `Cartón ${indexCarton + 1}`;

    const contenedorBotones = document.getElementById('teclado-botones');
    contenedorBotones.innerHTML = '';
    const numeros = [1,2,3,4,5,6,7,8,9,'',0,'⌫'];

    numeros.forEach(n => {
        const btn = document.createElement('button');
        if (n === '') { btn.style.visibility = 'hidden'; }
        else if (n === '⌫') {
            btn.innerText = '⌫';
            btn.style.backgroundColor = '#ffc107';
            btn.addEventListener('click', () => { valorActual = valorActual.slice(0, -1); document.getElementById('teclado-display').innerText = valorActual || '--'; });
        } else {
            btn.innerText = n;
            btn.addEventListener('click', () => { if (valorActual.length < 2) { valorActual += n; document.getElementById('teclado-display').innerText = valorActual; } });
        }
        contenedorBotones.appendChild(btn);
    });
    document.getElementById('overlay').classList.add('activo');
}

function cancelarEdicion() {
    document.getElementById('overlay').classList.remove('activo');
    editando = { carton: null, celda: null };
    valorActual = '';
}

function confirmarEdicion() {
    if (!valorActual) { alert("Ingresa un número."); return; }
    const num = parseInt(valorActual);
    if (isNaN(num) || num < 1 || num > 90) { alert("Número inválido. Debe ser entre 1 y 90."); return; }
    if (cartones[editando.carton].includes(num)) { alert("Ese número ya está en este cartón."); return; }
    cartones[editando.carton][editando.celda] = num;
    cancelarEdicion();
    renderizar();
}

function desbloquearCartones() {
    if (confirm("¿Quieres editar los cartones actuales? Se desbloquearán.")) {
        bloqueado = false;
        localStorage.setItem('lotoCartonesActual', JSON.stringify({ cartones: cartones, bloqueado: false }));
        actualizarUI();
        renderizar();
    }
}

function nuevoCarton() {
    if (!confirm("¿Crear cartones nuevos? Se perderán los actuales si no están guardados.")) return;
    cartones = [new Array(27).fill(null), new Array(27).fill(null)];
    bloqueado = false;
    modoBorrar = false;
    document.getElementById('btnBorrar').classList.remove('activo');
    document.getElementById('btnBorrar').innerHTML = '🗑️ Borrar';
    localStorage.setItem('lotoCartonesActual', JSON.stringify({ cartones: cartones, bloqueado: false }));
    actualizarUI();
    renderizar();
}

function limpiarTodo() {
    if (bloqueado) { alert("Primero presiona '🔓 Editar' para limpiar."); return; }
    if (confirm("¿Borrar TODOS los números de ambos cartones?")) {
        cartones = [new Array(27).fill(null), new Array(27).fill(null)];
        modoBorrar = false;
        document.getElementById('btnBorrar').classList.remove('activo');
        document.getElementById('btnBorrar').innerHTML = '🗑️ Borrar';
        localStorage.setItem('lotoCartonesActual', JSON.stringify({ cartones: cartones, bloqueado: false }));
        renderizar();
    }
}

// --- TOAST (Notificaciones flotantes) ---
// Se usa también desde tombola.js e historial.js para avisos de conexión.
function mostrarToast(mensaje, icono, esLoto = false) {
    const contenedor = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast' + (esLoto ? ' loto' : '');
    toast.innerHTML = `
        <span class="toast-icono">${icono}</span>
        <span class="toast-texto">${mensaje}</span>
    `;
    contenedor.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 3000);
}

// --- VERIFICAR LÍNEA Y LOTO ---
function verificarLineasYloto(indexCarton) {
    const numerosCarton = cartones[indexCarton];

    // Estructura del cartón de loto: 3 filas x 9 columnas
    // Los números válidos (no nulos) están distribuidos en las filas.
    // Fila 1: celdas 0-8, Fila 2: celdas 9-17, Fila 3: celdas 18-26.

    const filas = [
        { nombre: 'Fila 1', inicio: 0, fin: 8 },
        { nombre: 'Fila 2', inicio: 9, fin: 17 },
        { nombre: 'Fila 3', inicio: 18, fin: 26 }
    ];

    const cartonDOM = document.querySelectorAll('.carton')[indexCarton];
    const celdasDOM = cartonDOM.querySelectorAll('.celda');

    let lineasCompletadas = 0;

    filas.forEach((fila) => {
        let numerosEnFila = 0;
        let marcadosEnFila = 0;

        for (let i = fila.inicio; i <= fila.fin; i++) {
            if (numerosCarton[i] !== null) {
                numerosEnFila++;
                if (celdasDOM[i] && celdasDOM[i].classList.contains('marcada')) {
                    marcadosEnFila++;
                }
            }
        }

        if (numerosEnFila > 0 && marcadosEnFila === numerosEnFila) {
            lineasCompletadas++;
        }
    });

    const totalNumeros = numerosCarton.filter(n => n !== null).length;
    const totalMarcados = cartonDOM.querySelectorAll('.celda.marcada').length;

    if (totalNumeros > 0 && totalMarcados === totalNumeros) {
        mostrarToast(`¡LOTO en el Cartón ${indexCarton + 1}! 🎊`, '🏆', true);
        return;
    }

    if (lineasCompletadas > 0) {
        if (!window.lineasYaAvisadas) window.lineasYaAvisadas = {};
        const clave = `${indexCarton}-${lineasCompletadas}`;

        if (!window.lineasYaAvisadas[clave]) {
            window.lineasYaAvisadas[clave] = true;

            let textoLinea = lineasCompletadas === 1
                ? `¡LÍNEA en el Cartón ${indexCarton + 1}!`
                : `¡${lineasCompletadas} LÍNEAS en el Cartón ${indexCarton + 1}!`;

            mostrarToast(textoLinea, '🎉', false);
        }
    } else {
        if (window.lineasYaAvisadas) {
            Object.keys(window.lineasYaAvisadas).forEach(clave => {
                if (clave.startsWith(`${indexCarton}-`)) {
                    delete window.lineasYaAvisadas[clave];
                }
            });
        }
    }
}
