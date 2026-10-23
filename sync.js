/* =========================================================================
   SYNC · enlace en tiempo real entre Caja (POS) y la pantalla de Cocina
   Transporte: ntfy.sh (público, sin cuenta ni backend, vía SSE)
   Gratis y sin servidor propio. Si falla la red, la app sigue 100% local.
   ========================================================================= */
'use strict';

window.Sync = (function () {
  const CLAVE = 'entrePanas.enlace';
  const BASE = 'https://ntfy.sh';
  const CID = Math.random().toString(36).slice(2, 9); // id de este dispositivo

  let topic = null;
  let fuente = null;
  let manejador = null;
  let estado = 'inactivo';           // inactivo | conectando | en-linea | error
  let ultimoEnviado = '';
  let cola = null;
  let temporizador = null;
  let ultimoEnvio = 0;

  /* --------------------------------------------------------- configuración */
  function leerTopic() {
    try {
      const enUrl = new URLSearchParams(location.search).get('link');
      if (enUrl) { guardarTopic(enUrl.trim().toLowerCase()); return topic; }
    } catch (e) { /* sin URL */ }
    try { topic = localStorage.getItem(CLAVE) || null; } catch (e) { topic = null; }
    return topic;
  }

  function guardarTopic(nuevo) {
    topic = String(nuevo || '').trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
    try { topic ? localStorage.setItem(CLAVE, topic) : localStorage.removeItem(CLAVE); } catch (e) {}
    return topic;
  }

  function nuevoTopic() {
    const azar = Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
    return guardarTopic('entrepana-' + azar);
  }

  /* ------------------------------------------------------------ conexión */
  function avisarEstado() {
    document.dispatchEvent(new CustomEvent('sync:estado', { detail: estado }));
  }

  function cambiarEstado(nuevo) {
    if (estado === nuevo) return;
    estado = nuevo;
    avisarEstado();
  }

  function abrir() {
    cerrar();
    if (!topic) { cambiarEstado('inactivo'); return; }
    if (typeof EventSource === 'undefined') { cambiarEstado('error'); return; }

    cambiarEstado('conectando');
    try {
      fuente = new EventSource(`${BASE}/${encodeURIComponent(topic)}/sse`);
    } catch (e) { cambiarEstado('error'); return; }

    fuente.onopen = () => cambiarEstado('en-linea');

    fuente.onmessage = (ev) => {
      let sobre;
      try { sobre = JSON.parse(ev.data); } catch (e) { return; }
      if (!sobre || sobre.event !== 'message' || !sobre.message) return;
      let msg;
      try { msg = JSON.parse(sobre.message); } catch (e) { return; }
      if (!msg || msg.o === CID) return;           // ignorar lo que yo mismo envié
      cambiarEstado('en-linea');
      if (manejador) manejador(msg);
    };

    fuente.onerror = () => {
      // EventSource reintenta solo; se refleja en la UI
      cambiarEstado(navigator.onLine ? 'conectando' : 'error');
    };
  }

  function cerrar() {
    if (fuente) { try { fuente.close(); } catch (e) {} fuente = null; }
  }

  /* -------------------------------------------------------------- enviar */
  function enviarAhora(payload) {
    const cuerpo = JSON.stringify({ ...payload, o: CID, ts: Date.now() });
    ultimoEnviado = cuerpo;
    ultimoEnvio = Date.now();
    fetch(`${BASE}/${encodeURIComponent(topic)}`, {
      method: 'POST',
      body: cuerpo
    }).catch(() => cambiarEstado('error'));
  }

  /**
   * Publica un mensaje. Se agrupan los envíos: mínimo 900 ms entre mensajes
   * (ntfy.sh es gratuito y tiene límite de frecuencia).
   */
  function publicar(payload) {
    if (!topic) return;
    const cuerpo = JSON.stringify({ ...payload, o: CID });
    if (cuerpo === ultimoEnviado) return;          // nada cambió
    cola = payload;
    clearTimeout(temporizador);
    const espera = Math.max(0, 900 - (Date.now() - ultimoEnvio));
    temporizador = setTimeout(() => { if (cola) { enviarAhora(cola); cola = null; } }, espera);
  }

  /* ---------------------------------------------------------------- API */
  return {
    cid: CID,
    init() { leerTopic(); if (topic) abrir(); return topic; },
    get topic() { return topic; },
    get estado() { return estado; },
    urlCocina() {
      const base = location.href.replace(/[^/]*$/, '');
      return `${base}cocina.html${topic ? '?link=' + encodeURIComponent(topic) : ''}`;
    },
    escuchar(cb) { manejador = cb; if (topic && !fuente) abrir(); },
    reconectar() { abrir(); },
    guardarTopic(t) { const ok = guardarTopic(t); abrir(); return ok; },
    nuevoTopic() { const t = nuevoTopic(); abrir(); return t; },
    publicar,
    cerrar
  };
})();
