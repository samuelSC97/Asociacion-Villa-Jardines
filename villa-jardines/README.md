# Villa Jardines — Sistema de Gestión
**Asociación de Vecinos**

## Estructura del proyecto
```
villa-jardines/
├── index.html              ← Página principal
├── css/
│   ├── main.css            ← Estilos globales y componentes
│   ├── admin.css           ← Estilos específicos admin
│   └── vecino.css          ← Estilos específicos vecino
├── js/
│   ├── supabase.js         ← Config de base de datos y utilidades
│   ├── auth.js             ← Login / logout
│   ├── app.js              ← Inicialización
│   ├── admin/
│   │   ├── index.js        ← Controlador admin
│   │   ├── inicio.js       ← Dashboard inicial
│   │   ├── asistencia.js   ← Tomar asistencia + cobro S/2
│   │   ├── vecinos.js      ← Gestión de vecinos
│   │   ├── pagos.js        ← Cuotas sociales + otros cobros
│   │   └── documentos.js   ← PDFs y agenda
│   └── vecino/
│       ├── index.js        ← Controlador vecino
│       ├── inicio.js       ← Dashboard vecino
│       ├── faltas.js       ← Historial de asistencia
│       ├── pagos.js        ← Mis pagos y cuotas
│       └── documentos.js   ← Ver documentos y agenda
└── assets/                 ← Imágenes y recursos
```

## Base de datos (Supabase)
Proyecto: `villa-jardines`
URL: `https://qigygiskmpbmpqnggurq.supabase.co`

### Tablas
- `vecinos` — 77 vecinos con DNI, celular, cargo
- `eventos` — Asambleas, faenas, eventos importantes
- `asistencias` — Registro por vecino/evento (P/F/J)
- `subsanaciones` — Justificaciones vinculadas a apoyos
- `apoyos` — Guardadito y apoyos aplicados
- `pagos_cuota_mes` — S/2 mensual
- `cuotas_sociales` — S/24 anual (pagos parciales)
- `pagos_luz` — Pagos de luz por periodo
- `pagos_agua` — Pagos de agua por periodo
- `otros_pagos` — Cobros personalizados (caravana, etc.)
- `otros_pagos_vecinos` — Quién pagó cada cobro
- `documentos` — PDFs subidos (actas, citaciones)
- `agenda_proxima` — Próxima convocatoria visible
- `usuarios` — Login de administrador

## Credenciales por defecto
- **Usuario admin:** `admin`
- **Contraseña:** `Admin1234`

## Cómo publicar (Netlify)
1. Entra a netlify.com
2. Arrastra la carpeta `villa-jardines` completa
3. Netlify te da una URL pública gratis

## Multas
| Tipo | Monto |
|------|-------|
| Asamblea (A) | S/25 |
| Faena (F) | S/50 |
| Importante (I) | S/100 |
