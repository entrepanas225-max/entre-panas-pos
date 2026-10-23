/* =========================================================================
   ENTRE PANAS · POS (GastroApp Pro)
   Vanilla JS, sin dependencias. Persistencia en localStorage.
   ========================================================================= */
'use strict';

(function () {

  /* ---------------------------------------------------------------- utils */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const MONEDA = new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0
  });
  const fmt = n => MONEDA.format(Number(n) || 0);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const hora = ts => new Date(ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  const fechaHora = ts => new Date(ts).toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
  });
  const minutosDesde = ts => Math.max(0, Math.floor((Date.now() - ts) / 60000));

  /* ------------------------------------------------------------- catálogo
     Menú real de Entre Panas. Precios en pesos colombianos (COP).
     Las pizzas se venden por sabor + tamaño; "La Entre Panas" pide los 5 ingredientes. */
  const CATEGORIAS = [
    { id: 'hamburguesas', nombre: 'Hamburguesas' },
    { id: 'perros', nombre: 'Perros' },
    { id: 'picadas', nombre: 'Picadas' },
    { id: 'asados', nombre: 'Asados' },
    { id: 'pizzas', nombre: 'Pizzas' },
    { id: 'bebidas', nombre: 'Bebidas' },
    { id: 'promos', nombre: 'Promos' }
  ];

  const TALLAS_PIZZA = [
    { id: 'peq', nombre: 'Pequeña 24 cm', precio: 25000 },
    { id: 'med', nombre: 'Mediana 35 cm', precio: 35000 },
    { id: 'gra', nombre: 'Grande 40 cm', precio: 45000 }
  ];

  const SABORES_PIZZA = [
    { id: 'pizza-light', nombre: 'Pizza La Chica Light', desc: 'Queso, salsa, maíz, pimentón, champiñones y cebolla' },
    { id: 'pizza-nalgona', nombre: 'Pizza La Nalgona', desc: 'Queso, salsa, tocineta y pepperoni' },
    { id: 'pizza-secretaria', nombre: 'Pizza La Secretaria', desc: 'Queso, salsa, carne molida, tocineta y pimentón' },
    { id: 'pizza-junior', nombre: 'Pizza La Junior', desc: 'Queso, jamón y tocineta' },
    { id: 'pizza-chama', nombre: 'Pizza La Chama Caprichosa', desc: 'Queso, salsa, jamón, pepperoni y pimentón' },
    { id: 'pizza-entre-panas', nombre: 'Pizza La Entre Panas', desc: 'A tu gusto: escoge 5 ingredientes (incluye queso y salsa)', pideNota: true }
  ];

  const MENU = [
    /* --- Hamburguesas (todas llevan papas a la francesa) --- */
    { id: 'ham-clasica', nombre: 'Hamburguesa La Clásica', precio: 20000, cat: 'hamburguesas',
      desc: 'Carne de res, pollo o cerdo, queso mozzarella, tocineta, papa ripio, tomate, cebolla, lechuga y salsas' },
    { id: 'ham-doble', nombre: 'Hamburguesa Doble Carne', precio: 25000, cat: 'hamburguesas',
      desc: 'Carne de res y pollo, tocineta, queso mozzarella, papa ripio, tomate, cebolla, lechuga y salsas' },
    { id: 'ham-glotona', nombre: 'Hamburguesa La Glotona', precio: 30000, cat: 'hamburguesas',
      desc: 'Carne de res, pollo y cerdo, tocineta, queso mozzarella, papa ripio, tomate, cebolla, lechuga y salsas' },

    /* --- Perros --- */
    { id: 'perro-super', nombre: 'Perro Super', precio: 12000, cat: 'perros',
      desc: 'Salchicha super, papa ripio, queso mozzarella y salsas' },
    { id: 'perro-chori', nombre: 'Perro Chori', precio: 15000, cat: 'perros',
      desc: 'Chorizo, papa ripio, queso mozzarella y salsas' },
    { id: 'perro-suizo', nombre: 'Perro Suizo', precio: 17000, cat: 'perros',
      desc: 'Salchicha suiza, papa ripio, queso mozzarella y salsas' },
    { id: 'perro-salvaje', nombre: 'Perro Salvaje', precio: 20000, cat: 'perros',
      desc: 'Salchicha, pollo y cerdo, papa ripio, queso mozzarella, maíz y salsas' },

    /* --- Picadas --- */
    { id: 'pic-salchipapa', nombre: 'Salchipapa', precio: 15000, cat: 'picadas',
      desc: 'Papá francesa, salchicha, chorizo, butifarra, maíz, papa ripio, queso y salsas' },
    { id: 'pic-patacon', nombre: 'Picada de Patacón', precio: 20000, cat: 'picadas',
      desc: 'Patacón con pollo, cerdo, chorizo, butifarra, maíz, papa ripio, queso y salsas' },
    { id: 'pic-francesa', nombre: 'Picada Francesa', precio: 20000, cat: 'picadas',
      desc: 'Papá francesa, pollo, cerdo, chorizo, butifarra, maíz, papa ripio, queso y salsas' },
    { id: 'pic-2personas', nombre: 'Picada para 2 Personas', precio: 30000, cat: 'picadas',
      desc: 'Picada mixta con patacón o papa, pollo, cerdo, chorizo, butifarra, maíz, papa ripio, queso y salsas' },
    { id: 'pic-entrepana', nombre: 'Picada Entre Panas', precio: 40000, cat: 'picadas',
      desc: 'Papá francesa, patacón, pollo, cerdo, chorizo, butifarra, maíz, papa ripio, queso y salsas' },
    { id: 'pic-familiar', nombre: 'Picada Familiar', precio: 50000, cat: 'picadas',
      desc: 'Picada mixta con patacón o papa, pollo, cerdo, chorizo, butifarra, maíz, papa ripio, queso y salsas' },

    /* --- Asados --- */
    { id: 'asado-cerdo', nombre: 'Asado de Cerdo o Pollo', precio: 18000, cat: 'asados',
      desc: 'Con papas a la francesa o patacón y ensalada' },
    { id: 'asado-carne', nombre: 'Asado de Carne', precio: 25000, cat: 'asados',
      desc: 'Punta gorda, con papas a la francesa o patacón y ensalada' },

    /* --- Pizzas (precio por tamaño) --- */
    ...SABORES_PIZZA.map(s => ({
      id: s.id, nombre: s.nombre, desc: s.desc, cat: 'pizzas',
      precio: TALLAS_PIZZA[0].precio, tallas: TALLAS_PIZZA, pideNota: !!s.pideNota
    })),

    /* --- Bebidas (todas frías) --- */
    { id: 'beb-personal', nombre: 'Gaseosa Personal', precio: 4000, cat: 'bebidas' },
    { id: 'beb-15', nombre: 'Gaseosa 1.5 L', precio: 8000, cat: 'bebidas' },
    { id: 'beb-agua', nombre: 'Agua', precio: 3000, cat: 'bebidas' },

    /* --- Promos --- */
    { id: 'promo-clasicas', nombre: 'Promo: 2 Clásicas', precio: 35000, cat: 'promos',
      desc: 'Lleva 2 hamburguesas clásicas' },
    { id: 'promo-glotonas', nombre: 'Promo: 2 Glotonas', precio: 50000, cat: 'promos',
      desc: 'Lleva 2 hamburguesas La Glotona' }
  ];

  const MEDIOS = {
    efectivo: { nombre: 'Efectivo', icono: 'i-efectivo' },
    tarjeta: { nombre: 'Tarjeta', icono: 'i-tarjeta' },
    transferencia: { nombre: 'Transferencia', icono: 'i-transf' }
  };
  const MESAS_TOTAL = 6;

  /* --------------------------------------------------------------- estado */
  const DB_KEY = 'entrePanas.v3';   // v3: menú real, sin datos de muestra
  const CLAVES_VIEJAS = ['entrePanas.v2', 'entrePanasData'];

  function porDefecto() {
    return {
      version: 3,
      turno: { abierto: false, base: 0, inicio: null },
      mesas: Array.from({ length: MESAS_TOTAL }, (_, i) => ({ id: i + 1, items: [] })),
      domicilios: [],
      ventas: [],
      turnosCerrados: [],
      seq: 1
    };
  }

  function normalizar(crudo, base) {
    const s = base;
    if (crudo && typeof crudo === 'object') {
      if (crudo.turno && typeof crudo.turno === 'object') {
        s.turno = {
          abierto: !!crudo.turno.abierto,
          base: Number(crudo.turno.base) || 0,
          inicio: crudo.turno.inicio || null
        };
      }
      if (Array.isArray(crudo.mesas)) {
        s.mesas = Array.from({ length: MESAS_TOTAL }, (_, i) => {
          const guardada = crudo.mesas.find(m => Number(m && m.id) === i + 1);
          return { id: i + 1, items: Array.isArray(guardada?.items) ? guardada.items.map(limpiarItem) : [] };
        });
      }
      if (Array.isArray(crudo.domicilios)) s.domicilios = crudo.domicilios.filter(Boolean).map(d => ({
        id: String(d.id || ('d' + s.seq++)),
        cliente: String(d.cliente || 'Cliente'),
        telefono: String(d.telefono || ''),
        direccion: String(d.direccion || ''),
        creado: Number(d.creado) || Date.now(),
        items: Array.isArray(d.items) ? d.items.map(limpiarItem) : []
      }));
      if (Array.isArray(crudo.ventas)) s.ventas = crudo.ventas.filter(v => v && Number.isFinite(Number(v.total)));
      if (Array.isArray(crudo.turnosCerrados)) s.turnosCerrados = crudo.turnosCerrados.filter(Boolean);
      if (Number.isFinite(crudo.seq)) s.seq = crudo.seq;
    }
    return s;
  }

  function limpiarItem(i) {
    return {
      prodId: i.prodId ?? null,
      nombre: String(i.nombre || 'Producto'),
      precio: Math.max(0, Number(i.precio) || 0),
      cant: Math.max(1, parseInt(i.cant, 10) || 1),
      enviado: !!i.enviado,
      listo: !!i.listo,
      enviadoEn: Number(i.enviadoEn) || null,
      nota: String(i.nota || '')
    };
  }

  function cargar() {
    const base = porDefecto();
    let crudo = null;
    try {
      crudo = JSON.parse(localStorage.getItem(DB_KEY) || 'null');
    } catch (e) {
      console.warn('Datos corruptos, se reinicia el estado.', e);
      crudo = null;
    }
    if (crudo) return normalizar(crudo, base);

    // Primera carga de esta versión: se eliminan los datos de muestra de versiones anteriores.
    CLAVES_VIEJAS.forEach(k => {
      try { localStorage.removeItem(k); } catch (e) { /* sin acceso */ }
    });

    return base;
  }

  let estado = cargar();

  /* Guardado con debounce + protección de cuota. */
  let guardarTimer = null;
  function guardar() {
    clearTimeout(guardarTimer);
    guardarTimer = setTimeout(() => {
      try {
        localStorage.setItem(DB_KEY, JSON.stringify(estado));
      } catch (e) {
        toast('No se pudo guardar: almacenamiento lleno.', 'error');
      }
    }, 120);
    render();
  }

  /* --------------------------------------------------------------- orden */
  const totalOrden = o => o.items.reduce((a, i) => a + i.precio * i.cant, 0);

  function buscarOrden(tipo, id) {
    if (tipo === 'mesa') return estado.mesas.find(m => m.id === Number(id)) || null;
    return estado.domicilios.find(d => d.id === String(id)) || null;
  }

  function ordenesAbiertas() {
    const lista = [];
    estado.mesas.forEach(m => {
      if (m.items.length) lista.push({ tipo: 'mesa', id: m.id, orden: m, titulo: 'Mesa ' + m.id });
    });
    estado.domicilios.forEach(d => {
      lista.push({ tipo: 'domicilio', id: d.id, orden: d, titulo: d.cliente });
    });
    return lista;
  }

  /* --------------------------------------------------------------- avisos */
  function toast(mensaje, tipo = 'ok') {
    const colores = {
      ok: 'bg-slate-900',
      error: 'bg-red-600',
      info: 'bg-slate-700'
    };
    const icono = tipo === 'error' ? 'i-alerta' : tipo === 'info' ? 'i-lista' : 'i-check';
    const el = document.createElement('div');
    el.className = `${colores[tipo] || colores.ok} text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 max-w-sm animate-toast`;
    el.innerHTML = `<svg class="h-4 w-4 ico shrink-0"><use href="#${icono}"/></svg><span>${esc(mensaje)}</span>`;
    const cont = $('#toasts');
    cont.appendChild(el);
    // Máximo 2 avisos visibles para no tapar la pantalla
    Array.from(cont.children).slice(0, -2).forEach(prev => prev.remove());
    setTimeout(() => {
      el.classList.add('opacity-0', 'transition-opacity', 'duration-300');
      setTimeout(() => el.remove(), 320);
    }, 2200);
  }

  /* ---------------------------------------------------------------- modal */
  let modal = null;               // { tipo, datos }
  const vistas = {};              // se llenan más abajo

  function abrirModal(tipo, datos = {}) {
    modal = { tipo, datos };
    $('#modal').classList.remove('hidden');
    document.body.classList.add('overflow-hidden', 'modal-abierto');
    pintarModal();
  }

  function cerrarModal() {
    modal = null;
    $('#modal').classList.add('hidden');
    document.body.classList.remove('overflow-hidden', 'modal-abierto');
    $('#modalPanel').className = $('#modalPanel').className.replace(/\bmax-w-\w+/g, 'max-w-lg');
  }

  function pintarModal() {
    if (!modal) return;
    const vista = vistas[modal.tipo];
    if (!vista) { cerrarModal(); return; }
    const { titulo, cuerpo, pie, ancho } = vista();
    $('#modalTitulo').textContent = titulo;
    $('#modalCuerpo').innerHTML = cuerpo;
    const pieEl = $('#modalPie');
    if (pie) { pieEl.innerHTML = pie; pieEl.classList.remove('hidden'); }
    else { pieEl.innerHTML = ''; pieEl.classList.add('hidden'); }
    $('#modalPanel').className = $('#modalPanel').className.replace(/\bmax-w-\w+/g, 'max-w-lg');
    if (ancho) $('#modalPanel').classList.add(ancho);
    $('#modalCuerpo').scrollTop = 0;
    if (modal.tipo === 'orden') pintarGridProductos();
  }

  /* ============================================================ RENDER UI */
  let tabActual = 'mesas';

  function render() {
    renderMesas();
    renderDomicilios();
    renderCocina();
    renderCaja();
    renderBadgeCaja();
  }

  function renderMesas() {
    const grid = $('#gridMesas');
    grid.innerHTML = estado.mesas.map(m => {
      const total = totalOrden(m);
      const ocupada = m.items.length > 0;
      const porEnviar = m.items.filter(i => !i.enviado).length;
      const enCocina = m.items.filter(i => i.enviado && !i.listo).length;
      return `
        <button data-accion="abrir-orden" data-tipo="mesa" data-id="${m.id}"
          class="text-left p-3.5 rounded-xl border-2 shadow-sm transition active:scale-[.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400
          ${ocupada ? 'bg-red-50 border-red-400' : 'bg-white border-slate-200 hover:border-red-300'}">
          <div class="flex items-start justify-between gap-1">
            <span class="font-bold text-slate-800">Mesa ${m.id}</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap
              ${ocupada ? 'bg-red-500 text-white' : 'bg-emerald-100 text-emerald-700'}">
              ${ocupada ? 'Ocupada' : 'Libre'}
            </span>
          </div>
          <div class="mt-2 flex flex-wrap gap-1 min-h-[18px]">
            ${porEnviar ? `<span class="text-[10px] font-semibold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">${porEnviar} sin enviar</span>` : ''}
            ${enCocina ? `<span class="text-[10px] font-semibold bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded">${enCocina} en cocina</span>` : ''}
          </div>
          <div class="mt-1.5 text-right">
            <p class="text-[10px] uppercase tracking-wide text-slate-400">Total</p>
            <p class="font-bold text-base text-slate-800 tabular-nums">${fmt(total)}</p>
          </div>
        </button>`;
    }).join('');

    const ocupadas = estado.mesas.filter(m => m.items.length).length;
    $('#resumenMesas').textContent = `${ocupadas}/${MESAS_TOTAL} ocupadas`;
  }

  function estadoDomicilio(d) {
    if (!d.items.length) return { txt: 'Sin productos', cls: 'bg-slate-100 text-slate-600' };
    const enviados = d.items.filter(i => i.enviado);
    if (!enviados.length) return { txt: 'Sin enviar', cls: 'bg-amber-100 text-amber-800' };
    if (!d.items.every(i => i.listo)) return { txt: 'En preparación', cls: 'bg-sky-100 text-sky-800' };
    return { txt: 'Listo para despacho', cls: 'bg-emerald-100 text-emerald-700' };
  }

  function renderDomicilios() {
    const cont = $('#listaDomicilios');
    if (!estado.domicilios.length) {
      cont.innerHTML = `
        <div class="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300">
          <svg class="h-9 w-9 ico text-slate-300 mx-auto mb-2"><use href="#i-moto"/></svg>
          <p class="text-sm text-slate-500">No hay domicilios activos.</p>
          <p class="text-xs text-slate-400">Toca «Nuevo pedido» para registrar uno.</p>
        </div>`;
      return;
    }
    cont.innerHTML = estado.domicilios.map(d => {
      const est = estadoDomicilio(d);
      return `
        <div class="bg-white p-3 rounded-xl ring-1 ring-slate-200 shadow-sm">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="font-bold text-sm text-slate-800 truncate">${esc(d.cliente)}</p>
              <p class="text-xs text-slate-500 flex items-center gap-1 truncate">
                <svg class="h-3.5 w-3.5 ico shrink-0"><use href="#i-pin"/></svg>${esc(d.direccion || 'Sin dirección')}
              </p>
              ${d.telefono ? `<p class="text-[11px] text-slate-400 mt-0.5">Tel. ${esc(d.telefono)}</p>` : ''}
            </div>
            <div class="text-right shrink-0">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded ${est.cls}">${est.txt}</span>
              <p class="text-sm font-bold text-slate-800 tabular-nums mt-1">${fmt(totalOrden(d))}</p>
            </div>
          </div>
          <div class="flex gap-2 mt-2.5">
            <button data-accion="abrir-orden" data-tipo="domicilio" data-id="${esc(d.id)}"
              class="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2 rounded-lg transition active:scale-95">
              Abrir pedido
            </button>
            <button data-accion="cancelar-domicilio" data-id="${esc(d.id)}"
              class="px-3 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500 rounded-lg transition" aria-label="Cancelar domicilio">
              <svg class="h-4 w-4 ico"><use href="#i-trash"/></svg>
            </button>
          </div>
        </div>`;
    }).join('');
  }

  function renderCocina() {
    const cont = $('#gridCocina');
    const bloques = [];
    let totalPendientes = 0;

    ordenesAbiertas().forEach(({ tipo, id, orden, titulo }) => {
      const pendientes = orden.items.filter(i => i.enviado && !i.listo);
      if (!pendientes.length) return;
      totalPendientes += pendientes.length;
      const min = orden.items.reduce((m, i) => Math.max(m, i.enviadoEn ? minutosDesde(i.enviadoEn) : 0), 0);
      const urgente = min >= 15;
      bloques.push(`
        <div class="bg-white rounded-xl ring-1 shadow-sm overflow-hidden ${urgente ? 'ring-red-300' : 'ring-amber-300'}">
          <div class="flex items-center justify-between gap-2 px-3 py-2 border-b ${urgente ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}">
            <span class="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              <svg class="h-4 w-4 ico text-slate-500"><use href="#${tipo === 'mesa' ? 'i-mesa' : 'i-moto'}"/></svg>
              ${esc(titulo)}
            </span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${urgente ? 'bg-red-500 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}">
              <svg class="h-3 w-3 ico"><use href="#i-reloj"/></svg>${min} min
            </span>
          </div>
          <ul class="divide-y divide-slate-100">
            ${pendientes.map(i => {
              const idx = orden.items.indexOf(i);
              return `
                <li class="flex items-center justify-between gap-2 px-3 py-2">
                  <span class="text-sm text-slate-700 min-w-0">
                    <b class="text-red-600">${i.cant}×</b> <span class="truncate">${esc(i.nombre)}</span>
                    ${i.nota ? `<span class="block text-[11px] text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 mt-1">Nota: ${esc(i.nota)}</span>` : ''}
                  </span>
                  <button data-accion="listo" data-tipo="${tipo}" data-id="${esc(id)}" data-idx="${idx}"
                    class="shrink-0 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition active:scale-95">
                    <svg class="h-3.5 w-3.5 ico"><use href="#i-check"/></svg>Listo
                  </button>
                </li>`;
            }).join('')}
          </ul>
        </div>`);
    });

    cont.innerHTML = bloques.length ? bloques.join('') : `
      <div class="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300">
        <svg class="h-9 w-9 ico text-slate-300 mx-auto mb-2"><use href="#i-fuego"/></svg>
        <p class="text-sm text-slate-500">No hay comandas en preparación.</p>
      </div>`;

    $('#resumenCocina').textContent = totalPendientes ? `${totalPendientes} plato(s) pendientes` : '';

    const badge = $('#cocinaBadge');
    badge.textContent = totalPendientes;
    badge.classList.toggle('hidden', totalPendientes === 0);
  }

  function renderCaja() {
    const bloque = $('#cajaBloqueEstado');
    const t = estado.turno;

    if (!t.abierto) {
      bloque.innerHTML = `
        <p class="text-xs text-slate-500 mb-3">Debes abrir el turno para poder registrar cobros.</p>
        <button data-accion="abrir-caja"
          class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg text-sm transition active:scale-[.99] flex items-center justify-center gap-2">
          <svg class="h-4 w-4 ico"><use href="#i-candado"/></svg> Abrir caja / turno
        </button>`;
    } else {
      const ventasEfectivo = estado.ventas.filter(v => v.medio === 'efectivo').reduce((a, v) => a + v.total, 0);
      bloque.innerHTML = `
        <div class="space-y-1.5 text-sm">
          <div class="flex justify-between"><span class="text-slate-500">Base inicial</span><b class="tabular-nums">${fmt(t.base)}</b></div>
          <div class="flex justify-between"><span class="text-slate-500">Abierta desde</span><b>${t.inicio ? fechaHora(t.inicio) : '—'}</b></div>
          <div class="flex justify-between"><span class="text-slate-500">Efectivo en caja (esperado)</span><b class="tabular-nums text-emerald-700">${fmt(t.base + ventasEfectivo)}</b></div>
        </div>
        <button data-accion="cerrar-caja"
          class="w-full mt-3 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-lg text-sm transition active:scale-[.99]">
          Cerrar turno (arqueo)
        </button>`;
    }

    const totalVendido = estado.ventas.reduce((a, v) => a + v.total, 0);
    const desglose = Object.keys(MEDIOS).map(k => {
      const n = estado.ventas.filter(v => v.medio === k);
      if (!n.length) return '';
      const suma = n.reduce((a, v) => a + v.total, 0);
      return `<div class="flex justify-between text-xs"><span class="text-slate-500">${MEDIOS[k].nombre} (${n.length})</span><span class="tabular-nums">${fmt(suma)}</span></div>`;
    }).join('');

    $('#resumenVentas').innerHTML = estado.ventas.length ? `
      <div class="flex justify-between border-b border-slate-100 pb-1.5">
        <span class="text-slate-500">Pedidos cobrados</span><b>${estado.ventas.length}</b>
      </div>
      ${desglose}
      <div class="flex justify-between text-base font-bold text-slate-800 pt-1.5 border-t border-slate-100 mt-1.5">
        <span>Total acumulado</span>
        <span class="text-emerald-600 tabular-nums">${fmt(totalVendido)}</span>
      </div>` : `<p class="text-xs text-slate-400">Todavía no hay ventas en este turno.</p>`;

    const hist = estado.turnosCerrados.slice(0, 5);
    $('#historialTurnos').innerHTML = hist.length ? hist.map(tn => `
      <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 last:border-0">
        <div class="min-w-0">
          <p class="text-xs text-slate-600">${fechaHora(tn.fin)}</p>
          <p class="text-[11px] text-slate-400">${tn.ventas} ventas · base ${fmt(tn.base)}</p>
        </div>
        <div class="text-right shrink-0">
          <p class="text-sm font-bold tabular-nums">${fmt(tn.total)}</p>
          <p class="text-[11px] tabular-nums ${tn.diferencia < 0 ? 'text-red-600' : tn.diferencia > 0 ? 'text-amber-600' : 'text-slate-400'}">
            ${tn.diferencia === 0 ? 'cuadra' : (tn.diferencia > 0 ? '+' : '') + fmt(tn.diferencia)}
          </p>
        </div>
      </div>`).join('') : `<p class="text-xs text-slate-400">Aún no se ha cerrado ningún turno.</p>`;

    $('#historialTurnos').insertAdjacentHTML('beforeend', `
      <button data-accion="reiniciar" class="mt-3 text-[11px] text-slate-400 hover:text-red-600 underline underline-offset-2">
        Borrar todos los datos locales
      </button>`);
  }

  function renderBadgeCaja() {
    const badge = $('#badgeCaja');
    if (estado.turno.abierto) {
      badge.className = 'text-[11px] px-2.5 py-1 rounded-full font-semibold flex items-center bg-emerald-800';
      badge.innerHTML = '<span class="h-2 w-2 rounded-full bg-emerald-300 mr-1.5"></span>Caja abierta';
    } else {
      badge.className = 'text-[11px] px-2.5 py-1 rounded-full font-semibold flex items-center bg-red-800';
      badge.innerHTML = '<span class="h-2 w-2 rounded-full bg-red-300 mr-1.5"></span>Caja cerrada';
    }
  }

  function irATab(tab) {
    tabActual = tab;
    $$('.tab-content').forEach(el => el.classList.add('hidden'));
    $('#sec-' + tab).classList.remove('hidden');
    $$('.tab-btn').forEach(btn => {
      const activo = btn.dataset.tab === tab;
      btn.setAttribute('aria-selected', String(activo));
      btn.classList.toggle('text-red-600', activo);
      btn.classList.toggle('text-slate-400', !activo);
    });
  }

  /* ============================================================== MODALES */

  /* --- 1. Orden (mesa o domicilio) --- */
  const productosDe = (catId) => MENU.filter(p => p.cat === catId);

  function precioTexto(p) {
    if (p.tallas) {
      const menor = Math.min(...p.tallas.map(t => t.precio));
      return 'desde ' + fmt(menor);
    }
    return fmt(p.precio);
  }

  function tarjetaProducto(p) {
    return `
      <button data-accion="${p.tallas ? 'elegir-producto' : 'agregar'}" data-prod="${p.id}"
        class="p-2.5 text-left rounded-lg border border-slate-200 bg-white hover:bg-red-50 hover:border-red-300 active:scale-[.98] transition flex items-start justify-between gap-1">
        <span class="min-w-0">
          <span class="block text-[12px] font-bold text-slate-700 leading-tight">${esc(p.nombre)}</span>
          ${p.desc ? `<span class="block text-[10px] text-slate-400 leading-tight mt-0.5 line-clamp-2">${esc(p.desc)}</span>` : ''}
          <span class="block text-[11px] font-semibold text-red-600 tabular-nums mt-1">${precioTexto(p)}</span>
        </span>
        <svg class="h-4 w-4 ico text-red-500 shrink-0 mt-0.5"><use href="#i-mas"/></svg>
      </button>`;
  }

  function pintarGridProductos() {
    const cont = $('#gridProductos');
    if (!cont || !modal || modal.tipo !== 'orden') return;
    const busqueda = (modal.datos.busqueda || '').trim().toLowerCase();
    const cat = modal.datos.cat || CATEGORIAS[0].id;

    let lista;
    if (busqueda) {
      lista = MENU.filter(p =>
        p.nombre.toLowerCase().includes(busqueda) || (p.desc || '').toLowerCase().includes(busqueda));
    } else {
      lista = productosDe(cat);
    }

    cont.innerHTML = lista.length
      ? lista.map(tarjetaProducto).join('')
      : `<p class="col-span-2 text-xs text-slate-400 text-center py-6">Sin resultados para “${esc(busqueda)}”.</p>`;

    const info = $('#infoCat');
    if (info) {
      info.textContent = busqueda
        ? `${lista.length} resultado(s)`
        : (cat === 'pizzas' ? 'Elige el sabor y luego el tamaño' : '');
    }
  }

  /* --- 1a. Pedido --- */
  vistas.orden = function () {
    const { tipo, id } = modal.datos;
    const orden = buscarOrden(tipo, id);
    if (!orden) { cerrarModal(); return { titulo: '', cuerpo: '', pie: '' }; }

    const titulo = tipo === 'mesa' ? `Mesa ${id}` : orden.cliente;
    if (!modal.datos.cat) modal.datos.cat = CATEGORIAS[0].id;

    const chips = CATEGORIAS.map(c => `
      <button data-accion="categoria" data-cat="${c.id}"
        class="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition
        ${(modal.datos.cat === c.id && !(modal.datos.busqueda || '').trim())
          ? 'bg-red-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
        ${c.nombre}
      </button>`).join('');

    const cuerpo = `
      ${tipo === 'domicilio' ? `
        <div class="mb-3 text-xs text-slate-500 flex items-start gap-1.5 bg-slate-50 rounded-lg p-2">
          <svg class="h-3.5 w-3.5 ico shrink-0 mt-0.5"><use href="#i-pin"/></svg>
          <span>${esc(orden.direccion || 'Sin dirección')}${orden.telefono ? ' · ' + esc(orden.telefono) : ''}</span>
        </div>` : ''}

      <div class="relative mb-2">
        <input id="buscarProducto" type="search" inputmode="search" placeholder="Buscar en el menú…"
          value="${esc(modal.datos.busqueda || '')}" autocomplete="off"
          class="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
        <svg class="h-4 w-4 ico text-slate-400 absolute left-2.5 top-2.5 pointer-events-none"><use href="#i-lista"/></svg>
      </div>

      <div class="flex flex-wrap gap-1.5 pb-2 mb-1">${chips}</div>
      <p id="infoCat" class="text-[10px] uppercase tracking-wide text-slate-400 mb-2"></p>

      <div id="gridProductos" class="grid grid-cols-2 gap-2 mb-4"></div>

      <div class="border-t border-slate-200 pt-3">
        <h4 class="font-bold text-sm text-slate-700 mb-2">Resumen del pedido</h4>
        ${orden.items.length ? `<div class="space-y-1.5">${orden.items.map((item, idx) => {
          const sub = item.precio * item.cant;
          const bloqueado = item.enviado;
          return `
            <div class="bg-slate-50 p-2 rounded-lg border border-slate-200">
              <div class="flex items-center justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-[13px] font-medium text-slate-700 truncate">${esc(item.nombre)}</p>
                  <p class="text-[10px] ${item.listo ? 'text-emerald-600' : item.enviado ? 'text-sky-600' : 'text-amber-600'} font-semibold">
                    ${item.listo ? 'listo · en mesa' : item.enviado ? 'en cocina' : 'sin enviar'}
                  </p>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  ${bloqueado ? `<span class="text-xs text-slate-400 tabular-nums px-1">×${item.cant}</span>` : `
                    <button data-accion="menos" data-idx="${idx}" class="h-6 w-6 grid place-items-center rounded-md bg-white ring-1 ring-slate-300 text-slate-600 active:scale-90" aria-label="Quitar una unidad">
                      <svg class="h-3 w-3 ico"><use href="#i-menos"/></svg>
                    </button>
                    <span class="text-xs font-bold w-4 text-center tabular-nums">${item.cant}</span>
                    <button data-accion="agregar-linea" data-idx="${idx}" class="h-6 w-6 grid place-items-center rounded-md bg-white ring-1 ring-slate-300 text-slate-600 active:scale-90" aria-label="Agregar una unidad">
                      <svg class="h-3 w-3 ico"><use href="#i-mas"/></svg>
                    </button>
                    <button data-accion="quitar" data-idx="${idx}" class="h-6 w-6 grid place-items-center rounded-md text-red-500 active:scale-90" aria-label="Eliminar del pedido">
                      <svg class="h-3.5 w-3.5 ico"><use href="#i-trash"/></svg>
                    </button>`}
                  <span class="text-[13px] font-bold tabular-nums w-20 text-right">${fmt(sub)}</span>
                </div>
              </div>
              ${item.nota ? `<p class="mt-1 text-[11px] text-slate-600 bg-white rounded border border-slate-200 px-1.5 py-1">
                  <b class="text-slate-400">Nota:</b> ${esc(item.nota)}</p>` : ''}
            </div>`;
        }).join('')}</div>` : `<p class="text-xs text-slate-400 py-3 text-center">Aún no hay productos en este pedido.</p>`}
      </div>`;

    const total = totalOrden(orden);
    const porEnviar = orden.items.filter(i => !i.enviado).length;
    const pie = `
      <div class="flex justify-between items-center font-bold text-lg text-slate-800 mb-2">
        <span>Total</span>
        <span class="tabular-nums">${fmt(total)}</span>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <button data-accion="enviar-cocina" ${!porEnviar ? 'disabled' : ''}
          class="font-bold py-2.5 rounded-lg text-sm shadow transition flex items-center justify-center gap-1.5
          ${porEnviar ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[.98]' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}">
          <svg class="h-4 w-4 ico"><use href="#i-enviar"/></svg>
          ${porEnviar ? 'Enviar a cocina' : 'Ya enviado'}
        </button>
        <button data-accion="cobrar" ${!orden.items.length ? 'disabled' : ''}
          class="font-bold py-2.5 rounded-lg text-sm shadow transition flex items-center justify-center gap-1.5
          ${orden.items.length ? 'bg-blue-600 hover:bg-blue-700 text-white active:scale-[.98]' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}">
          <svg class="h-4 w-4 ico"><use href="#i-recibo"/></svg> Cobrar
        </button>
      </div>`;

    return { titulo, cuerpo, pie };
  };

  /* --- 1b. Elegir tamaño (pizzas) y nota (La Entre Panas) --- */
  vistas.producto = function () {
    const { prodId } = modal.datos;
    const p = MENU.find(x => x.id === prodId);
    if (!p) { cerrarModal(); return { titulo: '', cuerpo: '', pie: '' }; }

    const tallas = p.tallas || [{ id: 'unico', nombre: 'Único', precio: p.precio }];

    return {
      titulo: p.nombre,
      cuerpo: `
        ${p.desc ? `<p class="text-xs text-slate-500 mb-3">${esc(p.desc)}</p>` : ''}
        ${p.pideNota ? `
          <label class="block mb-3">
            <span class="text-xs font-semibold text-slate-600">Ingredientes (5)</span>
            <textarea id="notaProducto" rows="2" maxlength="120" placeholder="Ej: queso, jamón, pepperoni, maíz, pimentón"
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"></textarea>
          </label>` : ''}
        <p class="text-xs font-semibold text-slate-600 mb-1.5">${p.tallas ? 'Tamaño' : 'Agregar'}</p>
        <div class="space-y-2">
          ${tallas.map(t => `
            <button data-accion="confirmar-producto" data-talla="${t.id}"
              class="w-full flex items-center justify-between gap-2 border-2 border-slate-200 hover:border-red-400 hover:bg-red-50 rounded-xl px-3 py-3 transition active:scale-[.99]">
              <span class="font-bold text-slate-700 text-sm">${esc(t.nombre)}</span>
              <span class="font-bold text-red-600 tabular-nums">${fmt(t.precio)}</span>
            </button>`).join('')}
        </div>`,
      pie: `
        <button data-accion="volver-orden" class="w-full bg-white ring-1 ring-slate-300 text-slate-600 font-bold py-2.5 rounded-lg text-sm">
          Volver al pedido
        </button>`
    };
  };

  function volverAOrden() {
    const { tipo, id, cat } = modal.datos;
    modal = { tipo: 'orden', datos: { tipo, id, cat, busqueda: '' } };
    pintarModal();
  }

  /* --- 2. Nuevo domicilio --- */
  vistas.domicilio = function () {
    return {
      titulo: 'Nuevo domicilio',
      cuerpo: `
        <form id="formDomicilio" class="space-y-3" novalidate>
          <label class="block">
            <span class="text-xs font-semibold text-slate-600">Cliente *</span>
            <input name="cliente" required maxlength="60" autocomplete="off"
              class="mt-1 w-full rounded-lg border-slate-300 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
          </label>
          <label class="block">
            <span class="text-xs font-semibold text-slate-600">Dirección *</span>
            <input name="direccion" required maxlength="120" autocomplete="off"
              class="mt-1 w-full rounded-lg border-slate-300 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
          </label>
          <label class="block">
            <span class="text-xs font-semibold text-slate-600">Teléfono</span>
            <input name="telefono" inputmode="tel" maxlength="20" autocomplete="off"
              class="mt-1 w-full rounded-lg border-slate-300 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
          </label>
          <p class="text-[11px] text-slate-400">Al crearlo podrás agregar los productos del pedido.</p>
        </form>`,
      pie: `
        <div class="grid grid-cols-2 gap-2">
          <button data-accion="cerrar-modal" class="bg-white ring-1 ring-slate-300 text-slate-600 font-bold py-2.5 rounded-lg text-sm">Cancelar</button>
          <button form="formDomicilio" type="submit" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-lg text-sm active:scale-[.98]">Crear pedido</button>
        </div>`
    };
  };

  /* --- 3. Abrir caja --- */
  vistas.abrirCaja = function () {
    return {
      titulo: 'Abrir turno',
      cuerpo: `
        <form id="formAbrirCaja" class="space-y-3" novalidate>
          <label class="block">
            <span class="text-xs font-semibold text-slate-600">Base inicial en efectivo (COP)</span>
            <input name="base" type="number" min="0" step="100" value="50000" inputmode="numeric"
              class="mt-1 w-full rounded-lg border-slate-300 border px-3 py-2 text-base tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-400">
          </label>
          <p class="text-[11px] text-slate-400">Es el dinero con el que arranca la caja para dar vueltas (sencillo).</p>
        </form>`,
      pie: `
        <div class="grid grid-cols-2 gap-2">
          <button data-accion="cerrar-modal" class="bg-white ring-1 ring-slate-300 text-slate-600 font-bold py-2.5 rounded-lg text-sm">Cancelar</button>
          <button form="formAbrirCaja" type="submit" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg text-sm active:scale-[.98]">Abrir caja</button>
        </div>`
    };
  };

  /* --- 4. Cerrar caja / arqueo --- */
  function calcularArqueo() {
    const base = estado.turno.base;
    const efectivo = estado.ventas.filter(v => v.medio === 'efectivo').reduce((a, v) => a + v.total, 0);
    return { base, efectivo, esperado: base + efectivo };
  }

  vistas.cerrarCaja = function () {
    const a = calcularArqueo();
    const abiertos = ordenesAbiertas().length;
    return {
      titulo: 'Cerrar turno · arqueo',
      cuerpo: `
        <div class="space-y-1.5 text-sm mb-3 bg-slate-50 rounded-lg p-3">
          <div class="flex justify-between"><span class="text-slate-500">Base inicial</span><b class="tabular-nums">${fmt(a.base)}</b></div>
          <div class="flex justify-between"><span class="text-slate-500">Ventas en efectivo (${estado.ventas.filter(v => v.medio === 'efectivo').length})</span><b class="tabular-nums">${fmt(a.efectivo)}</b></div>
          <div class="flex justify-between border-t border-slate-200 pt-1.5"><span class="text-slate-600 font-semibold">Esperado en caja</span><b class="tabular-nums text-emerald-700">${fmt(a.esperado)}</b></div>
          <div class="flex justify-between text-xs text-slate-400"><span>Total facturado (todos los medios)</span><span class="tabular-nums">${fmt(estado.ventas.reduce((x, v) => x + v.total, 0))}</span></div>
        </div>
        <form id="formCerrarCaja" novalidate>
          <label class="block">
            <span class="text-xs font-semibold text-slate-600">Efectivo contado físicamente</span>
            <input name="contado" type="number" min="0" step="100" inputmode="numeric" required
              class="mt-1 w-full rounded-lg border-slate-300 border px-3 py-2 text-base tabular-nums focus:outline-none focus:ring-2 focus:ring-red-400"
              placeholder="0">
          </label>
          <p id="difArqueo" class="mt-2 text-sm font-bold text-slate-500">Diferencia: —</p>
        </form>
        ${abiertos ? `<p class="mt-3 text-[11px] text-amber-700 bg-amber-50 rounded-lg p-2 flex items-start gap-1.5">
            <svg class="h-3.5 w-3.5 ico shrink-0 mt-0.5"><use href="#i-alerta"/></svg>
            Hay ${abiertos} pedido(s) sin cobrar. Se quedarán abiertos para el próximo turno.</p>` : ''}`,
      pie: `
        <div class="grid grid-cols-2 gap-2">
          <button data-accion="cerrar-modal" class="bg-white ring-1 ring-slate-300 text-slate-600 font-bold py-2.5 rounded-lg text-sm">Cancelar</button>
          <button form="formCerrarCaja" type="submit" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-lg text-sm active:scale-[.98]">Cerrar turno</button>
        </div>`
    };
  };

  /* --- 5. Cobro --- */
  vistas.cobro = function () {
    const { tipo, id, medio } = modal.datos;
    const orden = buscarOrden(tipo, id);
    if (!orden) { cerrarModal(); return { titulo: '', cuerpo: '', pie: '' }; }
    const total = totalOrden(orden);
    const ref = tipo === 'mesa' ? `Mesa ${id}` : orden.cliente;
    return {
      titulo: 'Cobrar pedido',
      cuerpo: `
        <p class="text-xs text-slate-500 mb-1">Pedido</p>
        <p class="font-bold text-slate-800 mb-3">${esc(ref)}</p>
        <div class="space-y-1 text-sm mb-3">
          ${orden.items.map(i => `<div class="text-slate-600">
            <div class="flex justify-between"><span>${i.cant}× ${esc(i.nombre)}</span><span class="tabular-nums">${fmt(i.precio * i.cant)}</span></div>
            ${i.nota ? `<div class="text-[11px] text-slate-400 pl-3">↳ ${esc(i.nota)}</div>` : ''}
          </div>`).join('')}
        </div>
        <div class="flex justify-between items-center border-t border-slate-200 pt-2 mb-3">
          <span class="font-bold text-slate-700">Total a pagar</span>
          <span class="font-bold text-xl text-slate-900 tabular-nums">${fmt(total)}</span>
        </div>
        <p class="text-xs font-semibold text-slate-600 mb-1.5">Medio de pago</p>
        <div class="grid grid-cols-3 gap-2">
          ${Object.entries(MEDIOS).map(([k, m]) => `
            <button data-accion="medio" data-medio="${k}"
              class="py-2.5 rounded-lg text-xs font-bold border-2 flex flex-col items-center gap-1 transition
              ${medio === k ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}">
              <svg class="h-4 w-4 ico"><use href="#${m.icono}"/></svg>${m.nombre}
            </button>`).join('')}
        </div>`,
      pie: `
        <div class="grid grid-cols-2 gap-2">
          <button data-accion="cerrar-modal" class="bg-white ring-1 ring-slate-300 text-slate-600 font-bold py-2.5 rounded-lg text-sm">Cancelar</button>
          <button data-accion="confirmar-cobro" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-sm active:scale-[.98]">
            Cobrar ${fmt(total)}
          </button>
        </div>`
    };
  };

  /* --- 6. Ticket --- */
  vistas.ticket = function () {
    const { venta, items } = modal.datos;
    return {
      titulo: 'Venta registrada',
      cuerpo: `
        <div id="ticketImprimible" class="ticket font-mono text-[12px] text-slate-800 bg-white mx-auto max-w-xs border border-dashed border-slate-300 rounded-lg p-4">
          <div class="text-center mb-2">
            <p class="font-bold text-sm tracking-wide">ENTRE PANAS</p>
            <p class="text-[11px]">Pizzería &amp; Comidas Rápidas</p>
            <p class="text-[11px] mt-1">${fechaHora(venta.ts)}</p>
            <p class="text-[11px]">Ticket #${venta.id} · ${esc(venta.ref)}</p>
          </div>
          <div class="border-t border-dashed border-slate-300 py-2 space-y-1">
            ${items.map(i => `
              <div class="flex justify-between gap-2">
                <span class="truncate">${i.cant}× ${esc(i.nombre)}</span>
                <span class="tabular-nums shrink-0">${fmt(i.precio * i.cant)}</span>
              </div>
              ${i.nota ? `<div class="text-[10px] pl-3 text-slate-500">↳ ${esc(i.nota)}</div>` : ''}`).join('')}
          </div>
          <div class="border-t border-dashed border-slate-300 pt-2 flex justify-between font-bold text-sm">
            <span>TOTAL</span><span class="tabular-nums">${fmt(venta.total)}</span>
          </div>
          <p class="text-center text-[11px] mt-1">Pago: ${MEDIOS[venta.medio].nombre}</p>
          <p class="text-center text-[10px] mt-2 text-slate-500">¡Gracias por la visita!</p>
        </div>`,
      pie: `
        <div class="grid grid-cols-2 gap-2">
          <button data-accion="imprimir" class="bg-white ring-1 ring-slate-300 text-slate-700 font-bold py-2.5 rounded-lg text-sm flex items-center justify-center gap-1.5">
            <svg class="h-4 w-4 ico"><use href="#i-impresora"/></svg> Imprimir
          </button>
          <button data-accion="cerrar-modal" class="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-lg text-sm">Listo</button>
        </div>`
    };
  };

  /* --- 7. Confirmación --- */
  vistas.confirmar = function () {
    const { mensaje, detalle, textoOk = 'Confirmar', peligro = true } = modal.datos;
    return {
      titulo: 'Confirmar',
      cuerpo: `
        <div class="flex gap-3">
          <span class="h-10 w-10 shrink-0 grid place-items-center rounded-full ${peligro ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}">
            <svg class="h-5 w-5 ico"><use href="#i-alerta"/></svg>
          </span>
          <div>
            <p class="font-semibold text-slate-800">${esc(mensaje)}</p>
            ${detalle ? `<p class="text-sm text-slate-500 mt-1">${esc(detalle)}</p>` : ''}
          </div>
        </div>`,
      pie: `
        <div class="grid grid-cols-2 gap-2">
          <button data-accion="cerrar-modal" class="bg-white ring-1 ring-slate-300 text-slate-600 font-bold py-2.5 rounded-lg text-sm">Cancelar</button>
          <button data-accion="confirmar-ok" class="${peligro ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-slate-800'} text-white font-bold py-2.5 rounded-lg text-sm">${esc(textoOk)}</button>
        </div>`
    };
  };

  /* ============================================================= ACCIONES */

  /**
   * Agrega un producto al pedido abierto.
   * @param {string} prodId  id del producto del menú
   * @param {object} [opts]  { talla: 'peq|med|gra', nota: 'texto' }
   */
  function agregarProducto(prodId, opts = {}) {
    const { tipo, id } = modal.datos;
    const orden = buscarOrden(tipo, id);
    const prod = MENU.find(p => p.id === prodId);
    if (!orden || !prod) return;

    const talla = prod.tallas ? prod.tallas.find(t => t.id === opts.talla) : null;
    const precio = talla ? talla.precio : prod.precio;
    const nombre = talla ? `${prod.nombre} · ${talla.nombre}` : prod.nombre;
    const nota = String(opts.nota || '').trim().slice(0, 120);

    // Se reutiliza la línea pendiente idéntica; si ya fue enviada a cocina, se crea una nueva.
    const linea = orden.items.find(i =>
      i.prodId === prod.id && !i.enviado && i.nombre === nombre && (i.nota || '') === nota);

    if (linea) linea.cant++;
    else orden.items.push({
      prodId: prod.id, nombre, precio, nota,
      cant: 1, enviado: false, listo: false, enviadoEn: null
    });

    guardar();
    if (modal.tipo === 'producto') volverAOrden();
    else pintarModal();
  }

  function enviarACocina() {
    const { tipo, id } = modal.datos;
    const orden = buscarOrden(tipo, id);
    if (!orden) return;
    const pendientes = orden.items.filter(i => !i.enviado);
    if (!pendientes.length) { toast('No hay productos nuevos por enviar', 'info'); return; }
    const ahora = Date.now();
    pendientes.forEach(i => { i.enviado = true; i.enviadoEn = ahora; });
    guardar();
    pintarModal();
    toast(`${pendientes.length} línea(s) enviadas a cocina`);
  }

  function abrirCobro() {
    const { tipo, id } = modal.datos;
    const orden = buscarOrden(tipo, id);
    if (!orden || !orden.items.length) return;

    if (!estado.turno.abierto) {
      toast('Debes abrir la caja antes de cobrar', 'error');
      cerrarModal();
      irATab('caja');
      return;
    }
    abrirModal('cobro', { tipo, id, medio: 'efectivo' });
  }

  function confirmarCobro() {
    const { tipo, id, medio } = modal.datos;
    const orden = buscarOrden(tipo, id);
    if (!orden || !orden.items.length) return;

    const items = orden.items.map(i => ({ ...i }));
    const total = totalOrden(orden);
    const ref = tipo === 'mesa' ? `Mesa ${id}` : orden.cliente;

    const venta = {
      id: estado.seq++, ts: Date.now(), tipo,
      ref, total, medio: MEDIOS[medio] ? medio : 'efectivo'
    };
    estado.ventas.push(venta);

    if (tipo === 'mesa') orden.items = [];
    else estado.domicilios = estado.domicilios.filter(d => d.id !== id);

    guardar();
    abrirModal('ticket', { venta, items });
    toast(`Cobro registrado: ${fmt(total)}`);
  }

  function enviarListo(tipo, id, idx) {
    const orden = buscarOrden(tipo, id);
    if (!orden) return;
    const item = orden.items[Number(idx)];
    if (!item || item.listo) return;
    item.listo = true;
    guardar();
    toast('Plato marcado como listo', 'ok');
  }

  function abrirModalConfirmacion(opciones, onOk) {
    modal = { tipo: 'confirmar', datos: opciones };
    modal.datos.onOk = onOk;
    $('#modal').classList.remove('hidden');
    document.body.classList.add('overflow-hidden', 'modal-abierto');
    pintarModal();
  }

  /* ============================================================ DELEGACIÓN */

  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-accion]');
    if (!btn) return;
    const accion = btn.dataset.accion;

    switch (accion) {
      case 'tab':
        irATab(btn.dataset.tab);
        break;

      case 'abrir-orden':
        abrirModal('orden', { tipo: btn.dataset.tipo, id: btn.dataset.id });
        break;

      case 'cerrar-modal':
        cerrarModal();
        break;

      case 'agregar':
        agregarProducto(btn.dataset.prod);
        break;

      case 'categoria':
        modal.datos.cat = btn.dataset.cat;
        modal.datos.busqueda = '';
        pintarModal();
        break;

      case 'elegir-producto':
        abrirModal('producto', { prodId: btn.dataset.prod, tipo: modal.datos.tipo, id: modal.datos.id });
        modal.datos.cat = CATEGORIAS.find(c => c.id === 'pizzas')?.id || modal.datos.cat;
        break;

      case 'confirmar-producto': {
        const p = MENU.find(x => x.id === modal.datos.prodId);
        if (!p) break;
        const notaEl = document.getElementById('notaProducto');
        const nota = notaEl ? notaEl.value.trim() : '';
        if (p.pideNota && !nota) { toast('Escribe los 5 ingredientes', 'error'); break; }
        agregarProducto(p.id, { talla: btn.dataset.talla, nota });
        break;
      }

      case 'volver-orden':
        volverAOrden();
        break;

      case 'agregar-linea': {
        const orden = buscarOrden(modal.datos.tipo, modal.datos.id);
        const item = orden.items[Number(btn.dataset.idx)];
        if (item && !item.enviado) { item.cant++; guardar(); pintarModal(); }
        break;
      }

      case 'menos': {
        const orden = buscarOrden(modal.datos.tipo, modal.datos.id);
        const idx = Number(btn.dataset.idx);
        const item = orden.items[idx];
        if (!item || item.enviado) break;
        item.cant--;
        if (item.cant <= 0) orden.items.splice(idx, 1);
        guardar(); pintarModal();
        break;
      }

      case 'quitar': {
        const orden = buscarOrden(modal.datos.tipo, modal.datos.id);
        const idx = Number(btn.dataset.idx);
        if (!orden.items[idx] || orden.items[idx].enviado) break;
        orden.items.splice(idx, 1);
        guardar(); pintarModal();
        break;
      }

      case 'enviar-cocina':
        enviarACocina();
        break;

      case 'cobrar':
        abrirCobro();
        break;

      case 'medio':
        if (modal && modal.tipo === 'cobro') {
          modal.datos.medio = btn.dataset.medio;
          pintarModal();
        }
        break;

      case 'confirmar-cobro':
        confirmarCobro();
        break;

      case 'imprimir':
        document.body.classList.add('imprimiendo-ticket');
        window.print();
        setTimeout(() => document.body.classList.remove('imprimiendo-ticket'), 400);
        break;

      case 'listo':
        enviarListo(btn.dataset.tipo, btn.dataset.id, btn.dataset.idx);
        break;

      case 'nuevo-domicilio':
        abrirModal('domicilio');
        break;

      case 'cancelar-domicilio': {
        const id = btn.dataset.id;
        const d = estado.domicilios.find(x => x.id === id);
        if (!d) break;
        abrirModalConfirmacion(
          { mensaje: `¿Cancelar el domicilio de ${d.cliente}?`, detalle: 'Se eliminarán los productos cargados.', textoOk: 'Cancelar pedido' },
          () => {
            estado.domicilios = estado.domicilios.filter(x => x.id !== id);
            cerrarModal(); guardar(); toast('Domicilio cancelado', 'info');
          }
        );
        break;
      }

      case 'abrir-caja':
        abrirModal('abrirCaja');
        break;

      case 'cerrar-caja':
        abrirModal('cerrarCaja');
        break;

      case 'confirmar-ok': {
        const cb = modal && modal.datos.onOk;
        cerrarModal();
        if (typeof cb === 'function') cb();
        break;
      }

      case 'reiniciar':
        abrirModalConfirmacion(
          { mensaje: '¿Borrar todos los datos locales?', detalle: 'Se perderán mesas, domicilios, ventas e historial de turnos.', textoOk: 'Borrar todo' },
          () => {
            localStorage.removeItem(DB_KEY);
            localStorage.removeItem(LEGACY_KEY);
            estado = porDefecto();
            guardar(); toast('Datos borrados', 'info');
          }
        );
        break;
    }
  });

  /* Formularios del modal */
  document.addEventListener('submit', e => {
    const form = e.target;
    if (form.id === 'formDomicilio') {
      e.preventDefault();
      const fd = new FormData(form);
      const cliente = String(fd.get('cliente') || '').trim();
      const direccion = String(fd.get('direccion') || '').trim();
      const telefono = String(fd.get('telefono') || '').trim();
      if (!cliente || !direccion) { toast('Nombre y dirección son obligatorios', 'error'); return; }
      const nuevo = {
        id: 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        cliente, direccion, telefono, creado: Date.now(), items: []
      };
      estado.domicilios.push(nuevo);
      guardar();
      abrirModal('orden', { tipo: 'domicilio', id: nuevo.id });
      toast('Domicilio creado: agrega los productos');
    }

    if (form.id === 'formAbrirCaja') {
      e.preventDefault();
      const base = Number(new FormData(form).get('base'));
      if (!Number.isFinite(base) || base < 0) { toast('Monto base inválido', 'error'); return; }
      estado.turno = { abierto: true, base: Math.round(base), inicio: Date.now() };
      estado.ventas = [];
      cerrarModal(); guardar();
      toast('Caja abierta con base ' + fmt(base));
    }

    if (form.id === 'formCerrarCaja') {
      e.preventDefault();
      const contado = Number(new FormData(form).get('contado'));
      if (!Number.isFinite(contado) || contado < 0) { toast('Escribe el efectivo contado', 'error'); return; }
      const a = calcularArqueo();
      const total = estado.ventas.reduce((x, v) => x + v.total, 0);
      estado.turnosCerrados.unshift({
        inicio: estado.turno.inicio, fin: Date.now(),
        base: a.base, esperado: a.esperado, contado,
        diferencia: contado - a.esperado,
        total, ventas: estado.ventas.length
      });
      estado.turno = { abierto: false, base: 0, inicio: null };
      estado.ventas = [];
      cerrarModal(); guardar();
      const dif = contado - a.esperado;
      toast(dif === 0 ? 'Turno cerrado: la caja cuadra' : `Turno cerrado · diferencia ${fmt(dif)}`, dif === 0 ? 'ok' : 'info');
    }
  });

  /* Buscador del menú: solo repinta la cuadrícula, no pierde el foco */
  document.addEventListener('input', e => {
    if (e.target.id !== 'buscarProducto' || !modal || modal.tipo !== 'orden') return;
    modal.datos.busqueda = e.target.value;
    pintarGridProductos();
  });

  /* Diferencia del arqueo en vivo */
  document.addEventListener('input', e => {
    if (e.target.name !== 'contado' || !$('#difArqueo')) return;
    const contado = Number(e.target.value);
    const a = calcularArqueo();
    const el = $('#difArqueo');
    if (!e.target.value || !Number.isFinite(contado)) {
      el.textContent = 'Diferencia: —';
      el.className = 'mt-2 text-sm font-bold text-slate-500';
      return;
    }
    const dif = contado - a.esperado;
    el.textContent = 'Diferencia: ' + (dif === 0 ? 'cuadra exacto' : (dif > 0 ? '+' : '') + fmt(dif));
    el.className = 'mt-2 text-sm font-bold ' + (dif === 0 ? 'text-emerald-600' : dif < 0 ? 'text-red-600' : 'text-amber-600');
  });

  /* Teclado */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal) cerrarModal();
  });

  /* Reloj del encabezado */
  function pintarReloj() {
    $('#reloj').textContent = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }
  pintarReloj();
  setInterval(pintarReloj, 20000);

  /* Repintar minutos de cocina + guardado al salir */
  setInterval(() => { if (tabActual === 'cocina') renderCocina(); }, 60000);
  window.addEventListener('beforeunload', () => {
    try { localStorage.setItem(DB_KEY, JSON.stringify(estado)); } catch (e) { /* noop */ }
  });

  /* PWA: registro del service worker (solo en https/localhost) */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { /* sin soporte: seguimos igual */ });
    });
  }

  /* Arranque */
  irATab('mesas');
  render();

})();
