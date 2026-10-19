# Dashboard de expensas

## Formato del CSV

`data/movimientos.csv` debe tener exactamente estas columnas, separadas por punto y coma:

```csv
Periodo;Proveedor;Concepto;Cochera;Unidad
ene-26;FULL CONTROL SRL;Abono mensual;0;263473.70
```

No incluye `Item`, `OCR` ni un importe general.

## Períodos

La web detecta automáticamente los períodos presentes en el CSV. Admite `ene-26`, `feb-26`, `mar-27`, etc., y los ordena cronológicamente sin una lista fija por año.

## Añadir un mes

1. Añade las filas al final de `data/movimientos.csv`.
2. Usa punto decimal y no uses separador de miles.
3. Ejecuta `python scripts/generar_conclusiones.py`.
4. Sube `movimientos.csv` y `conclusiones.csv` al repositorio.

## Vista local

```bash
python -m http.server 8000
```

## Vercel

Proyecto estático: no requiere comando de build ni variables de entorno.
