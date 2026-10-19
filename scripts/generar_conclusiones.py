import csv,collections,os
ROOT=os.path.dirname(os.path.dirname(__file__)); src=os.path.join(ROOT,'data','movimientos.csv'); dst=os.path.join(ROOT,'data','conclusiones.csv')
ORDER=['Ene-2026','Feb-2026','Mar-2026','Abr-2026','May-2026','Jun-2026','Jul-2026','Ago-2026','Sep-2026','Oct-2026','Nov-2026','Dic-2026']
def money(n): return '$ '+f'{n:,.0f}'.replace(',','.')
def pct(now,prev): return ((now/prev)-1)*100 if prev else None
def ranking(d,n=5): return '; '.join(f'{i+1}. {k} ({money(v)})' for i,(k,v) in enumerate(sorted(d.items(),key=lambda x:x[1],reverse=True)[:n])) or 'Sin movimientos positivos.'
rows=[]
with open(src,encoding='utf-8-sig') as f:
 for r in csv.DictReader(f,delimiter=';'):
  r['Cochera']=float(r['Cochera']);r['Unidad']=float(r['Unidad']);rows.append(r)
months=[m for m in ORDER if any(x['Periodo']==m for x in rows)]; ac=collections.defaultdict(float);au=collections.defaultdict(float); out=[]; prev=None
for m in months:
 c=collections.defaultdict(float);u=collections.defaultdict(float)
 for x in rows:
  if x['Periodo']==m:
   c[x['Proveedor']]+=max(0,x['Cochera']);u[x['Proveedor']]+=max(0,x['Unidad'])
 for k,v in c.items():ac[k]+=v
 for k,v in u.items():au[k]+=v
 tc,tu=sum(c.values()),sum(u.values())
 if prev:
  pc,pu=prev; vc,vu=pct(tc,pc),pct(tu,pu)
  trendc=f'Cochera: {money(tc)}, {"subió" if vc and vc>0 else "bajó" if vc and vc<0 else "se mantuvo"} {abs(vc or 0):.1f}% frente al mes anterior.'
  trendu=f'Unidad: {money(tu)}, {"subió" if vu and vu>0 else "bajó" if vu and vu<0 else "se mantuvo"} {abs(vu or 0):.1f}% frente al mes anterior.'
 else: trendc=f'Cochera: primer período disponible, {money(tc)}.';trendu=f'Unidad: primer período disponible, {money(tu)}.'
 prevm=months[months.index(m)-1] if months.index(m)>0 else None; inc=[]
 if prevm:
  oldc=collections.defaultdict(float);oldu=collections.defaultdict(float)
  for x in rows:
   if x['Periodo']==prevm:oldc[x['Proveedor']]+=max(0,x['Cochera']);oldu[x['Proveedor']]+=max(0,x['Unidad'])
  for scope,cur,old in [('Cochera',c,oldc),('Unidad',u,oldu)]:
   for k,v in cur.items():
    if old[k]>0 and v>old[k]*1.2:inc.append((scope,k,(v/old[k]-1)*100))
 increases='; '.join(f'{scope} - {k}: +{v:.1f}%' for scope,k,v in sorted(inc,key=lambda x:x[2],reverse=True)[:6]) or 'Sin aumentos superiores al 20% en proveedores comparables.'
 evol=f'Cochera: {ranking(c,3)} | Unidad: {ranking(u,3)}'
 rc,ru=ranking(ac),ranking(au)
 conclusion=f'{trendc} {trendu} Ranking acumulado de cochera: {rc}. Ranking acumulado de unidad: {ru}. {increases}'
 out.append([m,evol,trendc,trendu,rc,ru,increases,conclusion]);prev=(tc,tu)
with open(dst,'w',newline='',encoding='utf-8-sig') as f:
 w=csv.writer(f,delimiter=';');w.writerow(['Periodo','EvolucionProveedor','TendenciaCochera','TendenciaUnidad','RankingAnualCochera','RankingAnualUnidad','DeteccionAumentos','Conclusion']);w.writerows(out)
print(len(out))
