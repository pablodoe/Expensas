# Dashboard de expensas

Sitio estático y sin dependencias, listo para publicar en Vercel.

## Publicación

1. Descomprime el ZIP.
2. Sube la carpeta a un repositorio de GitHub.
3. En Vercel, selecciona **Add New > Project**, importa el repositorio y pulsa **Deploy**.
4. No requiere comando de build ni variables de entorno.

También puede publicarse con Vercel CLI ejecutando `vercel` dentro de la carpeta.

## Datos

Los registros están en `data.js`, generados desde el OCR de las liquidaciones. Los movimientos marcados como `Revisar OCR` deben contrastarse con el PDF original.

## Funciones

- Filtro por mes, proveedor y texto.
- KPI de gasto, proveedores, mayor proveedor y promedio mensual.
- Evolución mensual, distribución y ranking de proveedores.
- Tabla detallada y exportación CSV del filtro activo.
- Tema claro/oscuro y diseño adaptable a móvil.
