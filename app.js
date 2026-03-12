// =========================================================
// 1. BASE DE DATOS DE PRODUCTOS (CONECTADA A SUPABASE)
// =========================================================
let baseDatosProductos = []; 
const imagenesVTO = {}; 

// ¡REEMPLAZA ESTA URL CON TU PROJECT URL DE SUPABASE!
const SUPABASE_URL = 'https://hxxnkqtyhxukobpycqci.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_8bOiKWpTHXaYYKWKfT4M-A_-q0xLmP3';

// Iniciar cliente de Supabase (CORREGIDO)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// FUNCIÓN PARA DESCARGAR LENTES DE LA NUBE
async function cargarLentesDesdeBD() {
    try {
        // Usamos supabaseClient aquí (CORREGIDO)
        const { data: lentesBD, error } = await supabaseClient.from('lentes').select('*');
        if (error) throw error;

        // Transformamos los datos al formato que usa nuestro Frontend
        baseDatosProductos = lentesBD.map(lente => ({
            id: lente.codigo.toString(), 
            marca: lente.marca,
            modelo: lente.nombre, 
            precio: parseFloat(lente.precio),
            img: lente.imagen_url, 
            tag: 'Nuevo', 
            categoria: lente.categoria || 'todos', 
            forma: lente.forma || 'todas',
            
            // LÍNEA NUEVA INYECTADA
            genero: lente.genero || 'unisex'
        }));

        // Precargar imágenes para la IA (MediaPipe)
        baseDatosProductos.forEach(prod => {
            imagenesVTO[prod.id] = new Image();
            imagenesVTO[prod.id].src = prod.img;
        });

        // Dibujamos la página
        renderizarWeb();

    } catch (error) {
        console.error("Error al conectar con Supabase:", error);
        const contenedorCatalogo = document.getElementById('catalogo-dinamico');
        if(contenedorCatalogo) {
            contenedorCatalogo.innerHTML = `<p style="text-align:center; grid-column: 1 / -1; color:#ff4d4d; font-weight:600; margin-top:40px;">No se pudo cargar el catálogo. Verifica tu conexión a internet.</p>`;
        }
    }
}

// =========================================================
// 2. VARIABLES GLOBALES Y ESTADO DE LA APP
// =========================================================
let carrito = JSON.parse(localStorage.getItem('lensGroupCarrito')) || [];
let favoritos = JSON.parse(localStorage.getItem('lensGroupFavoritos')) || [];

let categoriaActual = 'todos';
let formaActual = 'todas';
let busquedaActual = '';

const esPaginaFavoritos = window.location.pathname.includes('favoritos.html');
const esPaginaCarrito = window.location.pathname.includes('carrito.html');
let mostrarSoloFavoritos = esPaginaFavoritos; 

const toast = document.getElementById('toast-notificacion');
const toastText = document.getElementById('toast-text');

// =========================================================
// 3. FUNCIÓN HERO
// =========================================================
function activarFiltroInicio(categoria) {
    categoriaActual = categoria;
    const seccionCatalogo = document.getElementById('seccion-catalogo');
    if(seccionCatalogo) seccionCatalogo.scrollIntoView({ behavior: 'smooth' });
    document.querySelectorAll('.btn-filtro-cat').forEach(b => {
        b.classList.remove('active');
        if(b.getAttribute('data-filtro') === categoria) b.classList.add('active');
    });
    renderizarWeb(categoriaActual, formaActual, busquedaActual);
}

// =========================================================
// 4. FUNCIONES GLOBALES UI
// =========================================================
function mostrarNotificacion(mensaje) {
    if(!toast) return; 
    toastText.textContent = mensaje;
    toast.classList.add('mostrar');
    setTimeout(() => toast.classList.remove('mostrar'), 3000);
}

function actualizarContadorFavoritos() {
    const contadorFavs = document.getElementById('contador-favs');
    if(contadorFavs) contadorFavs.textContent = favoritos.length;
}

function actualizarContadorCarrito() {
    const contadores = document.querySelectorAll('#contador-carrito-nav, .cart-badge-number');
    contadores.forEach(c => {
        c.textContent = carrito.length;
        c.parentElement.style.transform = 'scale(1.2)';
        setTimeout(() => c.parentElement.style.transform = 'scale(1)', 200);
    });
}
actualizarContadorFavoritos();
actualizarContadorCarrito();

// =========================================================
// 5. RENDERIZADO DEL CATÁLOGO
// =========================================================
const contenedorCatalogo = document.getElementById('catalogo-dinamico');
const contenedorBotonesRapidos = document.getElementById('botones-cambio-rapido');
const svgCorazon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
const svgOjo = `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 5px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
const svgCarritoMini = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>`;

function renderizarWeb(filtroCategoria = 'todos', filtroForma = 'todas', textoBusqueda = '') {
    if(!contenedorCatalogo) return;
    contenedorCatalogo.innerHTML = ''; 
    if(contenedorBotonesRapidos) contenedorBotonesRapidos.innerHTML = ''; 

    const productosFiltrados = baseDatosProductos.filter(producto => {
        const cumpleCategoria = (filtroCategoria === 'todos') || (producto.categoria === filtroCategoria);
        const cumpleForma = (filtroForma === 'todas') || (producto.forma === filtroForma);
        const textoFiltro = `${producto.marca} ${producto.modelo}`.toLowerCase();
        const cumpleBusqueda = textoFiltro.includes(textoBusqueda.toLowerCase());
        const cumpleFavorito = mostrarSoloFavoritos ? favoritos.includes(producto.id) : true;
        return cumpleCategoria && cumpleForma && cumpleBusqueda && cumpleFavorito;
    });

    if (productosFiltrados.length === 0) {
        const mensajeVacio = mostrarSoloFavoritos ? 'No tienes monturas favoritas guardadas.' : 'No se encontraron lentes.';
        contenedorCatalogo.innerHTML = `<p style="text-align:center; grid-column: 1 / -1; color:#888; font-size:1.1rem; margin-top:20px;">${mensajeVacio}</p>`;
        return;
    }

    productosFiltrados.forEach(producto => {
        const esFavorito = favoritos.includes(producto.id) ? 'activo' : '';
        const tarjeta = document.createElement('div');
        tarjeta.className = 'producto-card';
        tarjeta.innerHTML = `
            <div class="imagen-container">
                <span class="tag">${producto.tag}</span>
                <div class="btn-favorito-card ${esFavorito}" data-id="${producto.id}">${svgCorazon}</div>
                <img src="${producto.img}" alt="${producto.modelo}" onerror="this.src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='">
            </div>
            <div class="info-producto">
                <p class="marca">${producto.marca}</p>
                <h3>${producto.modelo}</h3>
                <p class="precio">S/ ${producto.precio.toFixed(2)}</p>
                <div class="card-actions">
                    <button class="btn-probar" data-id="${producto.id}">${svgOjo} Probador AR</button>
                    <div class="card-actions-bottom">
                        <button class="btn-detalles">Detalles</button>
                        <button class="btn-add-cart-direct" data-id="${producto.id}">${svgCarritoMini} Añadir</button>
                    </div>
                </div>
            </div>
        `;
        contenedorCatalogo.appendChild(tarjeta);

        if(contenedorBotonesRapidos) {
            const btnRapido = document.createElement('button');
            btnRapido.className = 'select-model';
            btnRapido.setAttribute('data-id', producto.id);
            btnRapido.textContent = producto.modelo;
            contenedorBotonesRapidos.appendChild(btnRapido);
        }
    });
}

// Inicializamos la app llamando al servidor, no renderizando en duro
if(!esPaginaCarrito) {
    cargarLentesDesdeBD();
}

// =========================================================
// 6. EVENTOS GLOBALES (Clics en tarjetas, Menú, Búsqueda)
// =========================================================
document.body.addEventListener('click', (e) => {
    const btnCorazon = e.target.closest('.btn-favorito-card');
    if (btnCorazon) {
        const idProducto = btnCorazon.getAttribute('data-id');
        if (favoritos.includes(idProducto)) {
            favoritos = favoritos.filter(id => id !== idProducto); 
        } else {
            favoritos.push(idProducto); 
            mostrarNotificacion("Añadido a favoritos");
        }
        localStorage.setItem('lensGroupFavoritos', JSON.stringify(favoritos));
        actualizarContadorFavoritos();
        if(!esPaginaCarrito) renderizarWeb(categoriaActual, formaActual, busquedaActual); 
    }

    const btnAddDirect = e.target.closest('.btn-add-cart-direct');
    if (btnAddDirect) {
        const idProd = btnAddDirect.getAttribute('data-id');
        const prod = baseDatosProductos.find(p => p.id === idProd);
        if (prod) {
            carrito.push({ ...prod, colorElegido: 'Base' });
            localStorage.setItem('lensGroupCarrito', JSON.stringify(carrito));
            actualizarContadorCarrito();
            mostrarNotificacion(`Añadido al carrito`);
            if (esPaginaCarrito) renderizarPaginaCarrito();
        }
    }
});

const btnBuscarMenu = document.getElementById('btn-buscar');
const megaMenu = document.getElementById('mega-menu');
const inputBuscador = document.getElementById('input-buscador');
const btnIrBuscar = document.getElementById('btn-ir-buscar'); 

if(btnBuscarMenu && megaMenu) {
    btnBuscarMenu.addEventListener('click', (e) => {
        e.preventDefault();
        megaMenu.classList.toggle('mega-menu-oculto');
        megaMenu.classList.toggle('mega-menu-activo');
        if(megaMenu.classList.contains('mega-menu-activo')) inputBuscador.focus();
    });

    document.addEventListener('click', (e) => {
        if(!e.target.closest('#mega-menu') && !e.target.closest('#btn-buscar')) {
            megaMenu.classList.add('mega-menu-oculto');
            megaMenu.classList.remove('mega-menu-activo');
        }
    });
}

if(inputBuscador) {
    inputBuscador.addEventListener('input', (e) => {
        busquedaActual = e.target.value;
        if (esPaginaFavoritos) mostrarSoloFavoritos = false;
        if (!esPaginaCarrito) renderizarWeb(categoriaActual, formaActual, busquedaActual);
    });
}

if(btnIrBuscar && inputBuscador) {
    btnIrBuscar.addEventListener('click', () => {
        busquedaActual = inputBuscador.value;
        if (esPaginaFavoritos) mostrarSoloFavoritos = false;
        if (!esPaginaCarrito) renderizarWeb(categoriaActual, formaActual, busquedaActual);
        megaMenu.classList.add('mega-menu-oculto');
        megaMenu.classList.remove('mega-menu-activo');
    });
}

document.querySelectorAll('.link-mega').forEach(link => {
    link.addEventListener('click', (e) => {
        if (!esPaginaFavoritos && !esPaginaCarrito) {
            e.preventDefault();
            if(e.target.hasAttribute('data-cat')) categoriaActual = e.target.getAttribute('data-cat'); 
            if(e.target.hasAttribute('data-forma')) formaActual = e.target.getAttribute('data-forma'); 
            
            document.querySelectorAll('.btn-filtro-cat').forEach(b => {
                b.classList.remove('active');
                if(b.getAttribute('data-filtro') === categoriaActual) b.classList.add('active');
            });

            renderizarWeb(categoriaActual, formaActual, busquedaActual);
            megaMenu.classList.add('mega-menu-oculto');
            megaMenu.classList.remove('mega-menu-activo');
        }
    });
});

const botonesFiltroCat = document.querySelectorAll('.btn-filtro-cat');
const selectFiltroForma = document.getElementById('filtro-forma');

if (botonesFiltroCat.length > 0) {
    botonesFiltroCat.forEach(boton => {
        boton.addEventListener('click', (e) => {
            botonesFiltroCat.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            categoriaActual = e.target.getAttribute('data-filtro');
            renderizarWeb(categoriaActual, formaActual, busquedaActual);
        });
    });
}

if(selectFiltroForma) {
    selectFiltroForma.addEventListener('change', (e) => {
        formaActual = e.target.value;
        renderizarWeb(categoriaActual, formaActual, busquedaActual);
    });
}

// =========================================================
// 7. LÓGICA VTO AR (Probador Virtual - Ajustado)
// =========================================================
const modalVTO = document.getElementById('vto-modal');
const video = document.getElementById('webcam');
const canvas = document.getElementById('overlay');
const ctx = canvas ? canvas.getContext('2d') : null;
let streamActual = null; let deteccionActiva = false; let currentProducto = null; 

let faceMesh = null;
if(typeof FaceMesh !== 'undefined') {
    faceMesh = new FaceMesh({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
    faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    faceMesh.onResults((resultados) => {
        if (!canvas || !ctx) return;
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) { canvas.width = video.videoWidth; canvas.height = video.videoHeight; }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (resultados.multiFaceLandmarks && resultados.multiFaceLandmarks.length > 0 && currentProducto) {
            const puntos = resultados.multiFaceLandmarks[0];
            const ojoIzq = puntos[33], ojoDer = puntos[263]; 
            const xIzq = ojoIzq.x * canvas.width, yIzq = ojoIzq.y * canvas.height;
            const xDer = ojoDer.x * canvas.width, yDer = ojoDer.y * canvas.height;
            const distancia = Math.hypot(xDer - xIzq, yDer - yIzq);
            
            const imgObj = imagenesVTO[currentProducto.id];
            if (!imgObj || !imgObj.complete || imgObj.naturalWidth === 0) return;
            
            // AJUSTE DE TAMAÑO: Cambiamos 2.5 a 2.05 para que el lente se vea más realista y pegado al rostro
            const ancho = distancia * 2.05; 
            const alto = ancho * (imgObj.height / imgObj.width);
            const centroX = (xIzq + xDer) / 2; 
            const centroY = ((yIzq + yDer) / 2) + (alto * 0.05); 
            const angulo = Math.atan2(yDer - yIzq, xDer - xIzq);
            
            ctx.save(); ctx.translate(centroX, centroY); ctx.rotate(angulo);
            ctx.drawImage(imgObj, -ancho / 2, -alto / 2, ancho, alto);
            // NOTA: Se eliminó el código de teñido de colores por petición del usuario
            ctx.restore();
        }
    });
}

async function procesarVideo() {
    if (deteccionActiva && video && video.readyState >= 2 && faceMesh) {
        await faceMesh.send({image: video}); requestAnimationFrame(procesarVideo);
    }
}

function abrirModalVTO(idProducto) {
    if(!modalVTO) return;
    currentProducto = baseDatosProductos.find(p => p.id === idProducto);
    document.getElementById('vto-modelo-titulo').textContent = currentProducto.marca + ' ' + currentProducto.modelo;
    document.getElementById('vto-modelo-precio').textContent = 'S/ ' + currentProducto.precio.toFixed(2);
    
    modalVTO.classList.remove('modal-oculto'); modalVTO.classList.add('modal-activo');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } }).then(stream => {
        streamActual = stream; video.srcObject = stream;
        document.querySelector('.vto-loading').style.display = 'none';
        video.onloadedmetadata = () => { video.play(); deteccionActiva = true; procesarVideo(); };
    }).catch(err => alert("Por favor, permite el acceso a la cámara."));
}

document.body.addEventListener('click', (e) => {
    if (e.target.closest('.btn-probar')) abrirModalVTO(e.target.closest('.btn-probar').getAttribute('data-id'));
    if (e.target.closest('.select-model')) {
        const id = e.target.closest('.select-model').getAttribute('data-id');
        currentProducto = baseDatosProductos.find(p => p.id === id);
        document.getElementById('vto-modelo-titulo').textContent = currentProducto.marca + ' ' + currentProducto.modelo;
        document.getElementById('vto-modelo-precio').textContent = 'S/ ' + currentProducto.precio.toFixed(2);
    }
});

const btnCerrarVto = document.getElementById('cerrar-modal');
if(btnCerrarVto) {
    btnCerrarVto.addEventListener('click', () => {
        modalVTO.classList.remove('modal-activo'); modalVTO.classList.add('modal-oculto');
        deteccionActiva = false; if (streamActual) streamActual.getTracks().forEach(p => p.stop());
        document.querySelector('.vto-loading').style.display = 'block';
        if(ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
}

const btnTomarFoto = document.getElementById('btn-tomar-foto');
if(btnTomarFoto) {
    btnTomarFoto.addEventListener('click', () => {
        const snapCanvas = document.createElement('canvas'); snapCanvas.width = canvas.width; snapCanvas.height = canvas.height;
        const snapCtx = snapCanvas.getContext('2d'); snapCtx.translate(snapCanvas.width, 0); snapCtx.scale(-1, 1);
        snapCtx.drawImage(video, 0, 0, snapCanvas.width, snapCanvas.height); snapCtx.drawImage(canvas, 0, 0, snapCanvas.width, snapCanvas.height);
        const link = document.createElement('a'); link.download = `LensGroup_${currentProducto.modelo}.png`;
        link.href = snapCanvas.toDataURL('image/png'); link.click();
    });
}

// CORRECCIÓN: Botón Añadir al Carrito (Dentro del VTO)
const btnAddCartVTO = document.getElementById('btn-add-cart');
if(btnAddCartVTO) {
    // Usamos onclick para evitar que se duplique el evento si abres y cierras la cámara
    btnAddCartVTO.onclick = () => {
        if(!currentProducto) return;
        // Se quitó colorElegido, ahora el color base es por defecto
        carrito.push({ ...currentProducto, colorElegido: 'Base' });
        localStorage.setItem('lensGroupCarrito', JSON.stringify(carrito));
        actualizarContadorCarrito();
        mostrarNotificacion(`Añadido al carrito`);
        if(typeof renderizarPaginaCarrito === 'function') renderizarPaginaCarrito();
    };
}

// =========================================================
// 8. LÓGICA DE LA PÁGINA DE CARRITO (carrito.html)
// =========================================================
function renderizarPaginaCarrito() {
    const contenedorPaginaCarrito = document.getElementById('lista-carrito-pagina');
    const totalPaginaCarrito = document.getElementById('cart-page-total-price');
    
    if (!contenedorPaginaCarrito || !totalPaginaCarrito) return;
    
    contenedorPaginaCarrito.innerHTML = '';
    let total = 0;

    if (carrito.length === 0) {
        contenedorPaginaCarrito.innerHTML = `
            <div style="text-align: center; padding: 50px; background: var(--white); border-radius: 12px; border: 1px solid var(--border-color);">
                <h3 style="margin-bottom: 10px; color: var(--dark-color);">Tu carrito está vacío</h3>
                <p style="color: var(--text-muted); margin-bottom: 20px;">Parece que aún no has añadido nada.</p>
                <a href="index.html" style="background: var(--primary-color); color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">Ver Catálogo</a>
            </div>
        `;
        totalPaginaCarrito.textContent = 'S/ 0.00';
        return;
    }

    carrito.forEach((producto, index) => {
        total += producto.precio;
        contenedorPaginaCarrito.innerHTML += `
            <div class="cart-item-card">
                <button class="btn-remove-page" data-index="${index}">✖</button>
                <img src="${producto.img}" alt="${producto.modelo}" class="cart-item-img" onerror="this.src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='">
                <div class="cart-item-details">
                    <h3>${producto.marca} - ${producto.modelo}</h3>
                    <div class="detail-row">
                        <span class="label">Tipo de lentes</span>
                        <span class="value">${producto.categoria === 'sol' ? 'Con protección UV' : 'Sin medida'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Color elegido</span>
                        <span class="value" style="display: flex; align-items: center; gap: 5px;">
                            <div style="width:15px; height:15px; border-radius:50%; background:${producto.colorElegido || '#000'}"></div>
                            ${producto.colorElegido ? 'Personalizado' : 'Base'}
                        </span>
                    </div>
                    <div class="cart-item-total-row">
                        <span>Total</span>
                        <span style="color: var(--primary-color);">S/ ${producto.precio.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;
    });

    totalPaginaCarrito.textContent = `S/ ${total.toFixed(2)}`;

    document.querySelectorAll('.btn-remove-page').forEach(boton => {
        boton.addEventListener('click', (e) => {
            carrito.splice(e.target.getAttribute('data-index'), 1);
            localStorage.setItem('lensGroupCarrito', JSON.stringify(carrito));
            actualizarContadorCarrito();
            renderizarPaginaCarrito();
        });
    });
}

if(esPaginaCarrito) {
    cargarLentesDesdeBD().then(() => {
        // Necesitamos asegurar que el render de carrito no dependa de la BD, 
        // pero sí la ejecutamos para mantener estado.
        renderizarPaginaCarrito();
    });
}