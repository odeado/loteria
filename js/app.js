// ===================================================================
// LOTO DIGITAL — Arranque de la app y pestañas (Cartón / Tómbola)
// ===================================================================

function cambiarVista(vista) {
    const vistaCarton = document.getElementById('vista-carton');
    const vistaTombola = document.getElementById('vista-tombola');
    const tabCarton = document.getElementById('tabCarton');
    const tabTombola = document.getElementById('tabTombola');
    const subtitulo = document.getElementById('subtituloApp');

    if (vista === 'tombola') {
        vistaCarton.classList.add('oculto');
        vistaTombola.classList.remove('oculto');
        tabCarton.classList.remove('activo');
        tabTombola.classList.add('activo');
        subtitulo.innerText = 'Saca números y sigue el marcador. Comparte el código de sala para jugar en vivo con otros celulares.';
        renderTombola();
    } else {
        vistaTombola.classList.add('oculto');
        vistaCarton.classList.remove('oculto');
        tabTombola.classList.remove('activo');
        tabCarton.classList.add('activo');
        subtitulo.innerText = 'Toca una celda gris (?) para escribir un número.';
    }
    localStorage.setItem('lotoVistaActual', vista);
}

cargarInicial();
cargarTombola();
cambiarVista(localStorage.getItem('lotoVistaActual') || 'carton');

// Todo lo que depende de Firebase (historial en la nube, sala en vivo) espera
// a que firebase-config.js termine de inicializar la conexión.
window.addEventListener('firebase-listo', () => {
    suscribirHistorial();
    suscribirConexion();
    suscribirPartidas();
    inicializarSala(localStorage.getItem('lotoSalaCodigo') || generarCodigoSala());
});

// Permite "instalar" la app en el celular (PWA): ícono en el inicio,
// se abre sin la barra del navegador, y el editor de cartones sigue
// funcionando aunque no haya internet (las partes con Firebase avisan
// "sin conexión" en vez de fallar, como ya está resuelto en cada función).
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => console.error('Service worker:', err));
    });
}
