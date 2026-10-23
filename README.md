# Entre Panas · POS (GastroApp Pro)

POS para pizzería y comidas rápidas: **mesas, domicilios, cocina y caja**, optimizado para tablet/móvil.
Sin frameworks, sin CDNs, sin backend: funciona offline desde el navegador.

## Ejecutar
```bash
npm start        # http://localhost:3000
npm test         # pruebas funcionales (jsdom)
npm run css      # recompilar Tailwind -> assets/estilos.css
```

## Estructura
```
index.html            interfaz (Tailwind compilado + sprite SVG de iconos)
app.js                toda la lógica del POS (estado, render, eventos)
assets/estilos.css    CSS compilado (no editar a mano)
src/input.css         fuente de Tailwind + estilos de impresión
server.js             servidor estático sin dependencias
prueba.js             flujo completo automatizado
REVISION.md           bugs encontrados/corregidos y pendientes
```

## Flujo
1. **Caja → Abrir turno** (base de efectivo).
2. **Mesas / Domicilios → elegir productos → Enviar a cocina**.
3. **Cocina → Listo** por plato.
4. **Cobrar** (efectivo / tarjeta / transferencia) → ticket imprimible.
5. **Caja → Cerrar turno**: arqueo con efectivo esperado vs. contado e historial.

Los datos se guardan en `localStorage` del dispositivo (clave `entrePanas.v2`, migra la anterior `entrePanasData`).
