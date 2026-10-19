# Dashboard de expensas: cochera y unidad

La web utiliza `data/movimientos.csv` con estas columnas:

```csv
Periodo;Item;Proveedor;Concepto;Cochera;Unidad
Oct-2026;1;FULL CONTROL SRL;Abono mensual;0;350000
```

No existe una columna OCR ni un importe general. Cochera y Unidad se mantienen separadas en los KPI, gráficos, rankings, tabla y conclusiones.

## Añadir un mes

1. Añade una fila por movimiento a `data/movimientos.csv`.
2. Usa punto decimal y no uses separador de miles.
3. Ejecuta:

```bash
python scripts/generar_conclusiones.py
```

4. Sube a Git los archivos `data/movimientos.csv` y `data/conclusiones.csv`.

## Desarrollo local

```bash
python -m http.server 8000
```

## Vercel

Importa el repositorio como proyecto estático. No requiere comando de build ni variables de entorno.
