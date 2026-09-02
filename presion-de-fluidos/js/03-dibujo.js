// ═══════════════════════════════════════════════════════════
//  DIBUJO
// ═══════════════════════════════════════════════════════════
function ajustarCanvas(){
  const a = document.getElementById('canvasArea');
  if(!a||!cv) return;
  const rect = a.getBoundingClientRect(), dpr = window.devicePixelRatio||1;
  W = rect.width; H = rect.height;
  cv.width = Math.max(1,Math.round(W*dpr)); cv.height = Math.max(1,Math.round(H*dpr));
  cv.style.width = W+'px'; cv.style.height = H+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
  dibujar();
}
function aPantalla(x,y){ return [W/2+(x-vx)*escala, H/2-(y-vy)*escala]; }
function aMundo(px,py){ return [(px-W/2)/escala+vx, (H/2-py)/escala+vy]; }
function pasoRejilla(){
  const obj = 34/escala, e = Math.floor(Math.log10(Math.max(obj,1e-9))), base = Math.pow(10,e);
  const m = obj/base;
  return (m<=1?1:m<=2?2:m<=5?5:10)*base;
}
function snap(v){ const p = pasoRejilla()/2; return Math.round(v/p)*p; }

// ── Recorrido ordenado de la compuerta. La cadena termina en el "último
//    nudo": el extremo libre del último tramo insertado. Si la compuerta se
//    dibujó de abajo hacia arriba, se usa el extremo más bajo para que la
//    frontera (que baja en vertical desde ahí) no se cruce consigo misma.
function cadenaCompuerta(){
  if(!tramos.length) return null;
  const ady = {};
  tramos.forEach(t=>{ (ady[t.a]=ady[t.a]||[]).push(t); (ady[t.b]=ady[t.b]||[]).push(t); });
  const nodoDe = id => nodos.find(n=>n.id===id);
  const extremos = Object.keys(ady).map(Number).filter(id=>ady[id].length===1 && nodoDe(id));
  if(!extremos.length) return null;          // circuito cerrado: no hay frontera abierta
  const tUlt = tramos[tramos.length-1];
  let fin = (extremos.indexOf(tUlt.b)>=0) ? tUlt.b
          : (extremos.indexOf(tUlt.a)>=0) ? tUlt.a : extremos[0];
  const otro = extremos.find(id=>id!==fin);
  if(otro!==undefined && nodoDe(otro).y < nodoDe(fin).y - 1e-9) fin = otro;
  const inicio = extremos.find(id=>id!==fin) ?? fin;

  const pts = [{x:nodoDe(inicio).x, y:nodoDe(inicio).y}];
  const visit = {};
  let actual = inicio, seguir = true;
  while(seguir && actual!==fin){
    seguir = false;
    for(const t of (ady[actual]||[])){
      if(visit[t.id]) continue;
      visit[t.id] = true;
      const haciaB = (t.a===actual);
      let pt = puntosTramo(t, 40);
      if(!haciaB) pt = pt.slice().reverse();
      for(let i=1;i<pt.length;i++) pts.push(pt[i]);
      actual = haciaB ? t.b : t.a;
      seguir = true;
      break;
    }
  }
  if(pts.length < 2) return null;
  return {pts, inicio:nodoDe(inicio), fin:nodoDe(fin)};
}

function dibujar(){
  if(!ctx) return;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H);
  // rejilla
  if(VIS.grilla){
    const paso = pasoRejilla();
    const [x0,y0]=aMundo(0,H), [x1,y1]=aMundo(W,0);
    ctx.lineWidth=1;
    for(let i=Math.floor(x0/paso);i<=Math.ceil(x1/paso);i++){
      const [px]=aPantalla(i*paso,0);
      ctx.strokeStyle = (i%5===0)?'rgba(120,132,148,.18)':'rgba(120,132,148,.08)';
      ctx.beginPath(); ctx.moveTo(px,0); ctx.lineTo(px,H); ctx.stroke();
    }
    for(let j=Math.floor(y0/paso);j<=Math.ceil(y1/paso);j++){
      const [,py]=aPantalla(0,j*paso);
      ctx.strokeStyle = (j%5===0)?'rgba(120,132,148,.18)':'rgba(120,132,148,.08)';
      ctx.beginPath(); ctx.moveTo(0,py); ctx.lineTo(W,py); ctx.stroke();
    }
  }
  // ── Zonas y capas de líquido: la COMPUERTA es la que divide los líquidos.
  //    La frontera sube en vertical desde el primer nudo, recorre la compuerta
  //    (incluidas sus curvas) y desde el ÚLTIMO NUDO baja en VERTICAL.
  //    Cada zona se pinta recortada a su lado de esa frontera.
  if(VIS.liquidos){
  const cadC = cadenaCompuerta();
  const frPantalla = cadC
    ? cadC.pts.map(P=>aPantalla(P.x,P.y))
    : [[W/2,-10],[W/2,H+10]];               // sin compuerta: división provisional al centro
  const [ixF,iyF] = frPantalla[0];
  const [uxF,uyF] = frPantalla[frPantalla.length-1];
  const trazarFrontera = ()=>{
    ctx.moveTo(ixF, -10);
    ctx.lineTo(ixF, iyF);
    for(let q=1;q<frPantalla.length;q++) ctx.lineTo(frPantalla[q][0], frPantalla[q][1]);
    ctx.lineTo(uxF, H+10);
  };
  const hayCapas = capasOrdenadas(1).length || capasOrdenadas(2).length;
  [1,2].forEach(z=>{
    const capas = capasOrdenadas(z);
    if(!capas.length) return;
    ctx.save();
    ctx.beginPath();
    trazarFrontera();
    if(z===1){ ctx.lineTo(-10,H+10); ctx.lineTo(-10,-10); }
    else     { ctx.lineTo(W+10,H+10); ctx.lineTo(W+10,-10); }
    ctx.closePath();
    ctx.clip();
    capas.forEach((c,i)=>{
      const abajo = (i+1<capas.length) ? capas[i+1].niv : -1e6;
      const [,ya] = aPantalla(0, c.niv);
      const [,yb] = aPantalla(0, Math.max(abajo, -1e6));
      ctx.fillStyle = colorCapa(c.g).replace('rgb','rgba').replace(')', ',.30)');
      ctx.fillRect(0, ya, W, Math.min(yb,H)-ya);
      ctx.strokeStyle = '#2f7fb5'; ctx.lineWidth = (i===0)?2:1.2;
      ctx.beginPath(); ctx.moveTo(0,ya); ctx.lineTo(W,ya); ctx.stroke();
      ctx.font='700 10px Inter,sans-serif'; ctx.fillStyle='#1f6b96';
      ctx.fillText('γ='+dec(c.g,'f'), (z===1?8:W-64), ya+13);
    });
    ctx.restore();
  });
  // frontera visible: la compuerta ya se dibuja sólida, así que se puntea
  // solo la bajada vertical desde el último nudo (y la subida sobre el primero)
  if(hayCapas){
    ctx.strokeStyle='rgba(27,31,36,.45)'; ctx.lineWidth=1.6; ctx.setLineDash([8,6]);
    ctx.beginPath(); ctx.moveTo(uxF, Math.max(uyF,-10)); ctx.lineTo(uxF, H); ctx.stroke();
    if(cadC){ ctx.beginPath(); ctx.moveTo(ixF, Math.min(iyF,H+10)); ctx.lineTo(ixF, 0); ctx.stroke(); }
    ctx.setLineDash([]);
    ctx.font='700 10px Inter,sans-serif'; ctx.fillStyle='rgba(27,31,36,.6)';
    ctx.fillText('frontera de zonas', uxF+7, Math.min(Math.max(uyF+26, 26), H-12));
    ctx.fillText('ZONA 1', 12, 20);
    ctx.textAlign='right'; ctx.fillText('ZONA 2', W-12, 20); ctx.textAlign='start';
  }
  }

  // tramos y diagramas de presión
  tramos.forEach(t=>{
    const pts = puntosTramo(t, 60);
    if(pts.length<2) return;
    if(VIS.presion && t.activo !== false){
      let pM = 0;
      pts.forEach(P=>{ pM = Math.max(pM, Math.abs(presionNetaTramo(t,P.y))); });
      if(pM > 1e-12){
        const e = 80/pM;
        ctx.beginPath();
        pts.forEach((P,i)=>{ const [sx,sy]=aPantalla(P.x,P.y); i?ctx.lineTo(sx,sy):ctx.moveTo(sx,sy); });
        for(let i=pts.length-1;i>=0;i--){
          const P = pts[i];
          const q = Math.min(i, pts.length-2);
          const A = pts[q], B = pts[q+1];
          const dx=B.x-A.x, dy=B.y-A.y, ds=Math.hypot(dx,dy)||1;
          const nx=dy/ds, ny=-dx/ds;
          const p = presionNetaTramo(t,P.y);
          const [sx,sy]=aPantalla(P.x+nx*p*e/escala, P.y+ny*p*e/escala);
          ctx.lineTo(sx,sy);
        }
        ctx.closePath();
        ctx.fillStyle='rgba(192,57,43,.15)'; ctx.fill();
        ctx.strokeStyle='rgba(192,57,43,.8)'; ctx.lineWidth=1.4; ctx.stroke();
      }
    }
    ctx.beginPath();
    pts.forEach((P,i)=>{ const [sx,sy]=aPantalla(P.x,P.y); i?ctx.lineTo(sx,sy):ctx.moveTo(sx,sy); });
    ctx.strokeStyle = (selT.indexOf(t.id)>=0)?'#0f5c56':'#1b1f24';
    ctx.lineWidth = (selT.indexOf(t.id)>=0)?7:5;
    ctx.stroke();
    const md = pts[Math.floor(pts.length/2)];
    const [mx,my]=aPantalla(md.x,md.y);
    ctx.font='700 10px Inter,sans-serif'; ctx.fillStyle='#0b3f3a';
    ctx.fillText(nomTramo(t), mx+6, my-8);
  });

  // apoyos, rótulas, topes, nudos
  nodos.forEach(n=>{
    const [px,py]=aPantalla(n.x,n.y);
    if(VIS.apoyos){
    if(n.apoyo==='fijo'){
      ctx.strokeStyle='#0b3f3a'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(px,py+2); ctx.lineTo(px-13,py+21); ctx.lineTo(px+13,py+21); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px-19,py+21); ctx.lineTo(px+19,py+21); ctx.stroke();
    } else if(n.apoyo==='movil'){
      const a=(n.apAng===undefined?90:n.apAng)*Math.PI/180;
      ctx.save(); ctx.translate(px,py); ctx.rotate(Math.PI/2-a);
      ctx.strokeStyle='#0b3f3a'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(0,2); ctx.lineTo(-12,17); ctx.lineTo(12,17); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.arc(-6,21,3.5,0,Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.arc(6,21,3.5,0,Math.PI*2); ctx.stroke();
      ctx.restore();
    }
    if(n.tope){
      const a=(n.tope.ang||0)*Math.PI/180;
      const ux=Math.cos(a), uy=Math.sin(a);
      ctx.strokeStyle='#b45309'; ctx.lineWidth=2.6;
      ctx.beginPath(); ctx.moveTo(px-ux*52,py+uy*52); ctx.lineTo(px-ux*10,py+uy*10); ctx.stroke();
      ctx.save(); ctx.translate(px-ux*9,py+uy*9); ctx.rotate(Math.atan2(-uy,ux));
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-11,-5); ctx.lineTo(-11,5); ctx.closePath();
      ctx.fillStyle='#b45309'; ctx.fill(); ctx.restore();
      ctx.font='800 11px Inter,sans-serif'; ctx.fillStyle='#b45309';
      const vt = (R && !R.error) ? valorTope(n) : null;
      ctx.fillText(vt!==null?dec(Math.abs(vt),'f')+' '+unitFor:'T = ?', px-ux*58, py+uy*58);
    }
    }
    if(selN.indexOf(n.id)>=0){
      ctx.beginPath(); ctx.arc(px,py,12,0,Math.PI*2);
      ctx.fillStyle='rgba(15,92,86,.25)'; ctx.fill();
      ctx.strokeStyle='#0f5c56'; ctx.lineWidth=2; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(px,py,n.rotula?7:6,0,Math.PI*2);
    ctx.fillStyle = n.rotula ? '#fff' : '#0b3f3a';
    ctx.fill();
    ctx.strokeStyle = n.rotula ? '#c0392b' : '#fff';
    ctx.lineWidth = n.rotula ? 2.6 : 2; ctx.stroke();
    ctx.font='700 10.5px Inter,sans-serif'; ctx.fillStyle='#1b1f24';
    ctx.fillText(n.nombre, px+10, py-9);
  });

  // reacciones resueltas
  if(R && !R.error){
    R.inc.forEach((u,j)=>{
      if(u.tipo==='T') return;
      const v = R.val[j];
      if(esCero(v)) return;
      const d = (u.tipo==='Rx')?{x:1,y:0}:(u.tipo==='Ry')?{x:0,y:1}:{x:Math.cos(u.ang),y:Math.sin(u.ang)};
      const [px,py]=aPantalla(u.n.x,u.n.y);
      const s = v>=0?1:-1;
      const ex = px+d.x*s*46, ey = py-d.y*s*46;
      ctx.strokeStyle='#15803d'; ctx.lineWidth=2.6;
      ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(ex,ey); ctx.stroke();
      ctx.save(); ctx.translate(ex,ey); ctx.rotate(Math.atan2(-d.y*s,d.x*s));
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-10,-4.5); ctx.lineTo(-10,4.5); ctx.closePath();
      ctx.fillStyle='#15803d'; ctx.fill(); ctx.restore();
      ctx.font='700 10px Inter,sans-serif'; ctx.fillStyle='#15803d';
      ctx.fillText(dec(Math.abs(v),'f'), ex+5, ey-5);
    });
  }
}
function valorTope(n){
  if(!R || R.error) return null;
  let out = null;
  R.inc.forEach((u,j)=>{ if(u.tipo==='T' && u.n.id===n.id) out = R.val[j]; });
  return out;
}
