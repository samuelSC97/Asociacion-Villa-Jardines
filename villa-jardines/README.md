# Villa Jardines — Sistema de Gestión
> Asociación de Vecinos · Arequipa, Perú  
> © 2025 **Sasa** · Arnold Samuel Sucasaire Cueva · Cel. 989234106

---

## Estructura del proyecto
```
villa-jardines/
├── index.html
├── css/
│   └── main.css
├── js/
│   ├── config.js          ← Conexión Supabase
│   ├── utils.js           ← Funciones auxiliares
│   ├── modal.js           ← Confirmación con contraseña
│   ├── auth.js            ← Login / logout
│   ├── app.js             ← Inicialización
│   ├── admin/
│   │   ├── index.js
│   │   ├── inicio.js
│   │   ├── asistencia.js  ← Toma asistencia + S/2 almacén + eliminar con contraseña
│   │   ├── vecinos.js     ← Pago libre, apoyos, guardadito
│   │   ├── pagos.js       ← Almacén, cuotas sociales, otros cobros
│   │   └── documentos.js  ← PDFs + agenda próxima
│   └── vecino/
│       ├── index.js
│       ├── inicio.js      ← Bienvenida, alertas, agenda
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

## Publicar en Netlify
1. Entra a **netlify.com** → cuenta gratis con Google
2. Arrastra la **carpeta** `villa-jardines` (no el ZIP)
3. Obtienes una URL pública para compartir con vecinos

## Consideraciones importantes
- Agregar nuevas tablas en Supabase **no afecta** los datos existentes
- Para eliminar datos erróneos el sistema pide contraseña de admin
- Login de vecinos: solo por DNI completo (8 dígitos)
- Los vecinos solo pueden ver su propia información (solo lectura)
