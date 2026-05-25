# Villa Jardines — Sistema de Gestión
> Asociación de Vecinos · Arequipa, Perú  
> © 2025 **Sasa** · Arnold Samuel Sucasaire Cueva · Cel. 989234106

---

## Estructura del proyecto
```
villa-jardines/
├── index.html
├── manifest.json          ← PWA (instalar en celular)
├── sw.js                  ← Service Worker (uso offline)
├── icon.svg               ← Ícono de la app
├── css/
│   └── main.css
├── js/
│   ├── config.js          ← Conexión Supabase + constantes globales
│   ├── utils.js           ← Funciones auxiliares (esc, showToast, etc.)
│   ├── modal.js           ← Confirmación con contraseña
│   ├── auth.js            ← Login / logout
│   ├── app.js             ← Inicialización
│   ├── admin/
│   │   ├── index.js       ← Enrutador de tabs + navPago para sub-menú
│   │   ├── inicio.js      ← Dashboard + lista de vecinos con mayor deuda
│   │   ├── asistencia.js  ← Toma asistencia + cobro S/2 almacén con nav por mes
│   │   ├── vecinos.js     ← Pago en efectivo (con amnistía 50%), apoyos, guardadito
│   │   ├── pagos.js       ← Cuotas sociales (registro + auto-aplicación), otros cobros
│   │   └── documentos.js  ← PDFs + agenda próxima
│   └── vecino/
│       ├── index.js
│       ├── inicio.js      ← Bienvenida, alertas de multas y cobros pendientes
│       ├── faltas.js      ← Historial detallado (sección principal)
│       ├── pagos.js       ← Almacén, cuota social, otros cobros
│       └── documentos.js  ← Solo PDFs
└── assets/
```

## Base de datos (Supabase)
**Proyecto:** villa-jardines  
**URL:** https://qigygiskmpbmpqnggurq.supabase.co

### Tablas
| Tabla | Descripción |
|-------|-------------|
| `vecinos` | 77 vecinos con DNI, celular, cargo |
| `eventos` | Asambleas, faenas, eventos importantes |
| `asistencias` | Registro P/F/J por vecino/evento |
| `subsanaciones` | Justificaciones vinculadas a apoyos |
| `apoyos` | Guardadito y apoyos aplicados |
| `pagos_cuota_mes` | S/2 mensual almacén |
| `cuotas_sociales` | S/24 anual (pagos parciales) |
| `otros_pagos` | Cobros personalizados |
| `otros_pagos_vecinos` | Registro de quién pagó |
| `documentos` | PDFs subidos (actas, otros) |
| `agenda_proxima` | Próxima convocatoria |
| `usuarios` | Login administrador |

## Multas por tipo
| Tipo | Monto |
|------|-------|
| Asamblea | S/25 |
| Faena | S/50 |
| Importante | S/100 |

## Instalar en el celular (PWA)
La app puede instalarse como aplicación nativa en Android e iOS sin pasar por ninguna tienda:
- **Android (Chrome):** abre la app → menú ⋮ → "Agregar a pantalla de inicio"
- **iOS (Safari):** abre la app → botón compartir → "Agregar a pantalla de inicio"
- Funciona sin internet para mostrar la interfaz; los datos requieren conexión a Supabase

> Para mejor compatibilidad con iOS, reemplaza `icon.svg` por imágenes PNG (192×192 y 512×512) y actualiza `manifest.json`.

## Exportar PDF
Cualquier pantalla con el botón 🖨️ **PDF** usa la impresión del navegador para generar un PDF limpio. Los controles y formularios se ocultan automáticamente al imprimir.

## Publicar en Netlify
1. Entra a **netlify.com** → cuenta gratis con Google
2. Arrastra la **carpeta** `villa-jardines` (no el ZIP)
3. Obtienes una URL pública para compartir con vecinos

## Cobro almacén S/2 (asistencia.js)
El cobro mensual del almacén se gestiona **en la pantalla de asistencia**, no en Pagos:
- Encima de la lista hay un selector de mes/año (por defecto el mes actual)
- Los vecinos que ya pagaron ese mes se marcan como **✓ Pagó** en verde (para no cobrar doble)
- Al activar el toggle de un vecino aparece un campo de monto (default S/2, paso S/2); si paga S/4 o S/6 el sistema aplica automáticamente a los meses más antiguos sin pagar primero
- Al guardar la asistencia se registran los cobros de almacén en el mismo paso

## Pago en efectivo con Amnistía 50% (vecinos.js)
En el detalle de cada vecino la sección **"Registrar pago en efectivo"** permite:
- Ingresa el monto cobrado y texto descriptivo
- El sistema subsana faltas de más antiguas a más recientes hasta agotar el monto
- El saldo sobrante queda en guardadito
- **Amnistía 50%:** al marcar el checkbox se cobra la mitad por cada falta (S/50 → S/25), condonando el total; el monto real cobrado queda en el historial

## Cuotas sociales (pagos.js)
El registro de cuotas sociales se hace exclusivamente en **Pagos → Cuotas sociales**:
- Selecciona vecino, ingresa monto (se sugiere automáticamente lo que debe) y fecha
- El sistema aplica el pago al año con déficit más antiguo primero (hasta 3 años atrás), luego avanza a años futuros si sobra monto

## Navegación de Pagos
La sección Pagos tiene un **sub-menú** con: Cuotas sociales y Otros cobros. El cobro de almacén S/2 se trasladó a la pantalla de Asistencia.

## Consideraciones importantes
- Agregar nuevas tablas en Supabase **no afecta** los datos existentes
- Para eliminar datos erróneos el sistema pide contraseña de admin
- Login de vecinos: solo por DNI completo (8 dígitos)
- Los vecinos solo pueden ver su propia información (solo lectura)
- Las contraseñas en `usuarios` están en texto plano — se recomienda activar **Row Level Security (RLS)** en Supabase para proteger los datos con la clave anon pública
