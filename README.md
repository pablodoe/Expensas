# Dashboard de expensas en Vercel

## Añadir un mes

1. Abre `data/movimientos.csv`.
2. Añade una fila por gasto, respetando el separador `;` y las columnas existentes.
3. Ejecuta `python scripts/generar_conclusiones.py` para regenerar `data/conclusiones.csv`.
4. Confirma ambos archivos en GitHub. Vercel publicará el cambio.

Ejemplo:

```csv
Periodo;Item;Proveedor;Concepto;Cochera;Unidad;EstadoOCR
Oct-2026;1;FULL CONTROL SRL;Abono mensual;0;350000;OK
```

Los importes usan punto decimal y no llevan separador de miles. Los ajustes negativos se conservan en el detalle, pero los gráficos de gasto utilizan importes positivos.

## Desarrollo local

```bash
python -m http.server 8000
```

Abre `http://localhost:8000`.

## Publicación

Importa el repositorio en Vercel como sitio estático. No requiere comando de compilación ni variables de entorno.
