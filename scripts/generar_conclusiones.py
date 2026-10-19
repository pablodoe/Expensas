import csv, collections, os, re
ROOT=os.path.dirname(os.path.dirname(__file__))
SRC=os.path.join(ROOT,'data','movimientos.csv')
DST=os.path.join(ROOT,'data','conclusiones.csv')
MONTHS={'ene':1,'feb':2,'mar':3,'abr':4,'may':5,'jun':6,'jul':7,'ago':8,'sep':9,'oct':10,'nov':11,'dic':12}
def key(p):
    m=re.fullmatch(r'([a-záéíóú]{3})-(\d{2}|\d{4})',p.strip().lower())
    if not m:return (9999,99,p)
    y=int(m.group(2));y=2000+y if y<100 else y
    return (y,MONTHS.get(m.group(1),99),p)
def money(n):return '$ '+f'{n:,.0f}'.replace(',','.')
def rank(d,n=5):return '; '.join(f'{i+1}. {k} ({money(v)})' for i,(k,v) in enumerate(sorted(d.items(),key=lambda x:x[1],reverse=True)[:n])) or 'Sin movimientos positivos.'
rows=[]
with open(SRC,encoding='utf-8-sig') as f:
    for r in csv.DictReader(f,delimiter=';'):
        r['Cochera']=float(r.get('Cochera') or 0);r['Unidad']=float(r.get('Unidad') or 0);rows.append(r)
periods=sorted({r['Periodo'].strip().lower() for r in rows},key=key)
acc_g=collections.defaultdict(float);acc_u=collections.defaultdict(float);out=[]
for idx,p in enumerate(periods):
    g=collections.defaultdict(float);u=collections.defaultdict(float)
    for r in rows:
        if r['Periodo'].strip().lower()==p:
            g[r['Proveedor']]+=max(0,r['Cochera']);u[r['Proveedor']]+=max(0,r['Unidad'])
    for k,v in g.items():acc_g[k]+=v
    for k,v in u.items():acc_u[k]+=v
    tg,tu=sum(g.values()),sum(u.values())
    if idx:
        prev=periods[idx-1];pg=pu=0
        oldg=collections.defaultdict(float);oldu=collections.defaultdict(float)
        for r in rows:
            if r['Periodo'].strip().lower()==prev:
                oldg[r['Proveedor']]+=max(0,r['Cochera']);oldu[r['Proveedor']]+=max(0,r['Unidad']);pg+=max(0,r['Cochera']);pu+=max(0,r['Unidad'])
        def trend(label,now,old):
            if old==0:return f'{label}: {money(now)}; sin base comparable en el período anterior.'
            v=(now/old-1)*100;return f'{label}: {money(now)}, {"subió" if v>0 else "bajó" if v<0 else "se mantuvo"} {abs(v):.1f}% frente a {prev}.'
        inc=[]
        for scope,cur,old in [('Cochera',g,oldg),('Unidad',u,oldu)]:
            for name,v in cur.items():
                if old[name]>0 and v>old[name]*1.2:inc.append((scope,name,(v/old[name]-1)*100))
        alert='; '.join(f'{s} - {n}: +{v:.1f}%' for s,n,v in sorted(inc,key=lambda x:x[2],reverse=True)[:6]) or 'Sin aumentos superiores al 20% entre proveedores comparables.'
        tgtext, tutext=trend('Cochera',tg,pg),trend('Unidad',tu,pu)
    else:
        tgtext=f'Cochera: primer período disponible, {money(tg)}.';tutext=f'Unidad: primer período disponible, {money(tu)}.';alert='Sin período anterior para detectar aumentos.'
    rg,ru=rank(acc_g),rank(acc_u)
    evo=f'Cochera: {rank(g,3)} | Unidad: {rank(u,3)}'
    conclusion=f'{tgtext} {tutext} Ranking anual de cochera: {rg}. Ranking anual de unidad: {ru}. {alert}'
    out.append([p,evo,tgtext,tutext,rg,ru,alert,conclusion])
with open(DST,'w',newline='',encoding='utf-8-sig') as f:
    w=csv.writer(f,delimiter=';');w.writerow(['Periodo','EvolucionProveedor','TendenciaCochera','TendenciaUnidad','RankingAnualCochera','RankingAnualUnidad','DeteccionAumentos','Conclusion']);w.writerows(out)
print(f'Generadas {len(out)} conclusiones')
