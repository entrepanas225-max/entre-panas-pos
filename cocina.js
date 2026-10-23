/* =========================================================================
   PANTALLA DE COCINA (KDS) · Entre Panas
   - Funciona sola en el mismo dispositivo (lee el estado guardado) y
     sincroniza en tiempo real con la caja por ntfy.sh (sync.js).
   - Solo muestra lo que ya se envió y todavía no está listo.
   ========================================================================= */
'use strict';

(function () {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const DB_KEY = 'entrePanas.v3';
  const REFRESCO = 15000;         // repintar tiempos
  const MIN_MEDIO = 6, MIN_URGENTE = 12;

  let ordenes = [];               // [{ k, titulo, tipo, items:[{u,n,c,e,nota}] }]
  let conocidos = new Set();      // uids ya vistos (para animar los nuevos)
  let ultimaActualizacion = 0;
  let audioListo = false;

  /* ------------------------------------------------- 1. estado local ---- */
  /** Lee las comandas del mismo dispositivo (caja abierta en otra pestaña). */
  function leerLocal() {
    try {
      const crudo = JSON.parse(localStorage.getItem(DB_KEY) || 'null');
      if (!crudo) return null;
      const lista = [];
      (crudo.mesas || []).forEach(m => {
        const items = (m.items || []).filter(i => i.enviado && !i.listo);
        if (items.length) lista.push({
          k: 'm' + m.id, tipo: 'mesa', titulo: 'Mesa ' + m.id,
          items: items.map(aItem)
        });
      });
      (crudo.domicilios || []).forEach(d => {
        const items = (d.items || []).filter(i => i.enviado && !i.listo);
        if (items.length) lista.push({
          k: 'd' + d.id, tipo: 'domicilio', titulo: d.cliente, nota: d.direccion,
          items: items.map(aItem)
        });
      });
      return lista;
    } catch (e) { return null; }
  }

  const aItem = (i) => ({
    u: i.uid || (i.nombre + '|' + i.enviadoEn),
    n: i.nombre,
    c: i.cant,
    e: i.enviadoEn || null,
    nota: i.nota || ''
  });

  function aplicar(nuevaLista, origen) {
    if (!Array.isArray(nuevaLista)) return;
    ordenes = nuevaLista;
    ultimaActualizacion = Date.now();
    marcarNuevos();
    pintar();
    if (origen === 'remoto') avisarComandaNueva();
  }

  function marcarNuevos() {
    const actuales = new Set();
    let hayNuevo = false;
    ordenes.forEach(o => o.items.forEach(i => {
      actuales.add(i.u);
      if (!conocidos.has(i.u)) hayNuevo = true;
    }));
    conocidos = actuales;
    if (hayNuevo && ultimaActualizacion) window.__nuevo = true;
  }

  /* ------------------------------------------------------- 2. render ---- */
  const minutos = (ts) => ts ? Math.max(0, Math.floor((Date.now() - ts) / 60000)) : 0;

  function claseEspera(min) {
    if (min >= MIN_URGENTE) return { clase: 'urgente', color: 'text-red-400', etiqueta: 'URGENTE' };
    if (min >= MIN_MEDIO) return { clase: 'medio', color: 'text-amber-400', etiqueta: 'DEMORADO' };
    return { clase: '', color: 'text-emerald-400', etiqueta: 'EN TIEMPO' };
  }

  function pintar() {
    const tablero = $('#tablero');
    const pendientes = ordenes.reduce((a, o) => a + o.items.length, 0);
    $('#contador').textContent = pendientes;

    tablero.innerHTML = '';
    $('#vacio').classList.toggle('hidden', ordenes.length > 0);

    ordenes.forEach(o => {
      const min = o.items.reduce((m, i) => Math.max(m, minutos(i.e)), 0);
      const esp = claseEspera(min);
      const nuevo = o.items.some(i => !conocidos.has(i.u)) ? '' : '';

      const tarjeta = document.createElement('article');
      tarjeta.className = `kds-card ${esp.clase} overflow-hidden`;
      tarjeta.innerHTML = `
        <div class="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-white/10">
          <div class="min-w-0">
            <p class="font-extrabold text-lg leading-tight truncate">${esc(o.titulo)}</p>
            <p class="text-[10px] uppercase tracking-wider ${esp.color} font-bold">${esp.etiqueta}</p>
          </div>
          <div class="text-right shrink-0">
            <p class="reloj-espera text-2xl ${esp.color}">${min}<span class="text-xs">min</span></p>
          </div>
        </div>
        ${o.nota ? `<p class="px-3.5 py-1.5 text-[11px] text-slate-400 bg-white/5 truncate"><span class="text-slate-500 font-semibold">Dirección:</span> ${esc(o.nota)}</p>` : ''}
        <ul class="divide-y divide-white/5">
          ${o.items.map(i => `
            <li class="px-2.5 py-2 flex items-start gap-2.5">
              <button class="kds-check" data-listo="${esc(i.u)}" data-k="${esc(o.k)}"
                      aria-label="Marcar ${esc(i.n)} como listo">✓</button>
              <div class="min-w-0 flex-1 pt-0.5">
                <p class="text-[15px] leading-snug font-semibold">
                  <span class="text-amber-400 font-extrabold">${i.c}×</span> ${esc(i.n)}
                </p>
                ${i.nota ? `<p class="text-[12px] text-amber-200/80 mt-0.5">↳ ${esc(i.nota)}</p>` : ''}
              </div>
            </li>`).join('')}
        </ul>
        <button class="w-full py-2.5 text-xs font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-[.99] transition"
          data-todo="${esc(o.k)}">Todo listo</button>`;
      tablero.appendChild(tarjeta);
    });

    actualizarEstado();
  }

  function actualizarEstado() {
    const e = window.Sync ? window.Sync.estado : 'inactivo';
    const dot = $('#dotEstado'), txt = $('#textoEstado'), top = $('#textoTopic');
    const tema = window.Sync && window.Sync.topic;

    top.textContent = tema ? tema : 'sin enlace';
    if (e === 'en-linea') {
      dot.className = 'dot ok';
      txt.textContent = 'En línea con caja · actualización en tiempo real';
    } else if (e === 'conectando') {
      dot.className = 'dot warn';
      txt.textContent = 'Conectando con caja…';
    } else if (e === 'error') {
      dot.className = 'dot err';
      txt.textContent = 'Sin conexión · mostrando lo último recibido';
    } else {
      dot.className = 'dot off';
      txt.textContent = 'Modo local · misma tablet que la caja';
    }
  }

  /* --------------------------------------------------- 3. acciones ------ */
  function marcarListo(uids, k) {
    // 1) optimista en pantalla
    ordenes = ordenes.map(o => {
      const items = o.items.filter(i => !uids.includes(i.u));
      return { ...o, items };
    }).filter(o => o.items.length);
    pintar();

    // 2) avisar a caja
    if (window.Sync && window.Sync.topic) {
      window.Sync.publicar({ t: 'listo', u: uids });
    }

    // 3) si es el mismo dispositivo, escribir en el estado local (sin esperar red)
    aplicarListoLocal(uids);
  }

  function aplicarListoLocal(uids) {
    try {
      const crudo = JSON.parse(localStorage.getItem(DB_KEY) || 'null');
      if (!crudo) return;
      let tocado = false;
      const marcar = (items) => (items || []).forEach(i => {
        if (uids.includes(i.uid)) { i.listo = true; tocado = true; }
      });
      (crudo.mesas || []).forEach(m => marcar(m.items));
      (crudo.domicilios || []).forEach(d => marcar(d.items));
      if (tocado) localStorage.setItem(DB_KEY, JSON.stringify(crudo));
    } catch (e) { /* sin permiso o sin datos */ }
  }

  function avisarComandaNueva() {
    const aviso = $('#aviso');
    aviso.textContent = '🔔 Nueva comanda';
    aviso.classList.remove('hidden');
    setTimeout(() => aviso.classList.add('hidden'), 2200);
    pitido();
  }

  function pitido() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gan = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gan.gain.setValueAtTime(0.0001, ctx.currentTime);
      gan.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
      gan.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
      osc.connect(gan); gan.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.5);
    } catch (e) { /* el navegador exige interacción previa */ }
  }

  /* --------------------------------------------------- 4. eventos ------- */
  document.addEventListener('click', (e) => {
    const btnListo = e.target.closest('[data-listo]');
    if (btnListo) {
      const k = btnListo.dataset.k;
      const u = btnListo.dataset.listo;
      const orden = ordenes.find(o => o.k === k);
      const uids = [u];
      // si el plato está repetido en la misma comanda, se marca una sola línea
      marcarListo(uids, k);
      if (orden && orden.items.length === 1) {
        // última línea: no hace falta más
      }
      return;
    }

    const btnTodo = e.target.closest('[data-todo]');
    if (btnTodo) {
      const k = btnTodo.dataset.todo;
      const orden = ordenes.find(o => o.k === k);
      if (!orden) return;
      marcarListo(orden.items.map(i => i.u), k);
      return;
    }

    if (e.target.closest('[data-cerrar]')) {
      $('#config').classList.add('hidden');
      return;
    }
    if (e.target.closest('#btnConfig')) {
      $('#inputTopic').value = (window.Sync && window.Sync.topic) || '';
      $('#config').classList.remove('hidden');
    }
  });

  document.addEventListener('click', () => { audioListo = true; }, { once: true });

  $('#btnGuardar').addEventListener('click', () => {
    const t = window.Sync.guardarTopic($('#inputTopic').value);
    if (!t) { alert('Escribe un código válido'); return; }
    $('#config').classList.add('hidden');
    conectarEscucha();
    pedirEstado();
    actualizarEstado();
  });

  $('#btnNuevo').addEventListener('click', () => {
    const t = window.Sync.nuevoTopic();
    $('#inputTopic').value = t;
    $('#config').classList.add('hidden');
    conectarEscucha();
    actualizarEstado();
  });

  $('#btnPegar').addEventListener('click', async () => {
    try {
      const texto = await navigator.clipboard.readText();
      const m = texto.match(/[?&]link=([a-z0-9-_]+)/i);
      $('#inputTopic').value = m ? m[1].toLowerCase() : texto.trim().toLowerCase();
    } catch (err) { /* el usuario pega a mano */ }
  });

  /* ------------------------------------------------------ 5. arranque --- */
  function conectarEscucha() {
    window.Sync.escuchar((msg) => {
      if (msg.t === 'estado') {
        aplicar(msg.ordenes, 'remoto');
      }
      if (msg.t === 'hola') {
        // alguien abrió la pantalla: la caja responde sola; aquí no hacemos nada
      }
    });
  }

  function pedirEstado() {
    if (window.Sync && window.Sync.topic) window.Sync.publicar({ t: 'hola' });
  }

  function arrancar() {
    window.Sync.init();
    conectarEscucha();
    document.addEventListener('sync:estado', actualizarEstado);

    const local = leerLocal();
    if (local && local.length) { ordenes = local; marcarNuevos(); }
    pintar();

    pedirEstado();
    setTimeout(pedirEstado, 1500);   // por si la caja aún está cargando

    // Misma tablet: la caja en otra pestaña actualiza el localStorage
    window.addEventListener('storage', (e) => {
      if (e.key !== DB_KEY) return;
      const lista = leerLocal();
      if (lista) { ordenes = lista; marcarNuevos(); pintar(); }
    });

    // Refresco de tiempos + respaldo por sondeo (si el SSE se cae)
    setInterval(() => { pintar(); }, REFRESCO);
    setInterval(() => { pedirEstado(); }, 20000);

    // Reloj
    const reloj = () => {
      $('#reloj').textContent = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    };
    reloj(); setInterval(reloj, 15000);

    // Service worker (offline)
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
      });
    }
  }

  /* Pruebas: permite inyectar estado sin red */
  window.__kds = {
    aplicar: (lista) => aplicar(lista, 'remoto'),
    estado: () => ({ ordenes, pendientes: ordenes.reduce((a, o) => a + o.items.length, 0) })
  };

  arrancar();
})();
