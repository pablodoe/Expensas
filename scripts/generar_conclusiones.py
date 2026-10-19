import csv,collections,os
ROOT=os.path.dirname(os.path.dirname(__file__)); src=os.path.join(ROOT,'data','movimientos.csv'); dst=os.path.join(ROOT,'data','conclusiones.csv')
order=['Ene-2026','Feb-2026','Mar-2026','Abr-2026','May-2026','Jun-2026','Jul-2026','Ago-2026','Sep-2026','Oct-2026','Nov-2026','Dic-2026']
def money(n): return '$ '+f'{n:,.0f}'.replace(',','.')
rows=[]
with open(src,encoding='utf-8-sig') as f:
 for r in csv.DictReader(f,delimiter=';'):
  r['Importe']=max(0,float(r['Cochera'])+float(r['Unidad']));rows.append(r)
months=[m for m in order if any(r['Periodo']==m for r in rows)]; prev_total=None; annual=collections.defaultdict(float); out=[]
for m in months:
 current=[r for r in rows if r['Periodo']==m and r['Importe']>0]; by=collections.defaultdict(float)
 for r in current: by[r['Proveedor']]+=r['Importe'];annual[r['Proveedor']]+=r['Importe']
 total=sum(by.values()); top=sorted(by.items(),key=lambda x:x[1],reverse=True)[:3]
 evolution='; '.join(f'{p}: {money(v)}' for p,v in top) or 'Sin gastos positivos.'
 if prev_total is None: trend=f'Primer período disponible, con {money(total)} en gastos positivos.'
 else:
  pct=(total/prev_total-1)*100 if prev_total else 0; trend=f'El gasto mensual fue {money(total)}, {"subió" if pct>0 else "bajó" if pct<0 else "se mantuvo"} {abs(pct):.1f}% respecto del mes anterior.'
 ranking='; '.join(f'{i+1}. {p} ({money(v)})' for i,(p,v) in enumerate(sorted(annual.items(),key=lambda x:x[1],reverse=True)[:5]))
 increases=[]
 if prev_total is not None:
  prevm=months[months.index(m)-1]; pb=collections.defaultdict(float)
  for r in rows:
   if r['Periodo']==prevm and r['Importe']>0:pb[r['Proveedor']]+=r['Importe']
  for p,v in by.items():
   if pb[p]>0 and v>pb[p]*1.2: increases.append((p,(v/pb[p]-1)*100))
 inc='; '.join(f'{p}: +{v:.1f}%' for p,v in sorted(increases,key=lambda x:x[1],reverse=True)[:5]) or 'No se detectaron aumentos superiores al 20% entre proveedores comparables.'
 conclusion=f'{trend} Principales proveedores del mes: {evolution}. Acumulado anual: {ranking}. Aumentos: {inc}'
 out.append([m,evolution,trend,ranking,inc,conclusion]);prev_total=total
with open(dst,'w',newline='',encoding='utf-8-sig') as f:
 w=csv.writer(f,delimiter=';');w.writerow(['Periodo','EvolucionProveedor','TendenciaMensual','RankingAnual','DeteccionAumentos','Conclusion']);w.writerows(out)
print(f'Generado: {dst} ({len(out)} meses)')
