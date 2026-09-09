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

// ── Recorrido ordenado de la compuerta. La cadena va del extremo MÁS ALTO
//    al MÁS BAJO: la frontera entre zonas sube en vertical desde el primero
//    y baja en vertical desde el último, y así nunca se cruza consigo misma.
//    `orden` dice, tramo a tramo, si se recorre de a hacia b: es lo que usa
//    signoZona para saber qué cara mira a cada zona.
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
  const orden = [];
  let actual = inicio, seguir = true;
  while(seguir && actual!==fin){
    seguir = false;
    for(const t of (ady[actual]||[])){
      if(visit[t.id]) continue;
      visit[t.id] = true;
      const haciaB = (t.a===actual);
      orden.push({t, haciaB});
      let pt = puntosTramo(t, 40);
      if(!haciaB) pt = pt.slice().reverse();
      for(let i=1;i<pt.length;i++) pts.push(pt[i]);
      actual = haciaB ? t.b : t.a;
      seguir = true;
      break;
    }
  }
  if(pts.length < 2) return null;
  return {pts, inicio:nodoDe(inicio), fin:nodoDe(fin), orden};
}

// ── Rótulos que no se pisan ──
// Cada texto reserva su caja; el siguiente que chocaría se corre en la
// dirección (ax, ay) hasta encontrar hueco. Con un halo blanco para que las
// líneas no lo atraviesen.
let _rotCajas = [];
function _rotulo(txt, x, y, color, ax, ay, font, alinear){
  ctx.save();
  ctx.font = font || '700 10.5px Inter,sans-serif';
  const w = ctx.measureText(txt).width + 6, h = 14;
  const al = alinear || 'left';
  let ox = 0, oy = 0;
  const nn = Math.hypot(ax||0, ay||0) || 1;
  const ex = (ax||0)/nn, ey = (ay||0)/nn;
  for(let k=0;k<12;k++){
    const cx = x + ox, cy = y + oy;
    const x0 = al==='center' ? cx - w/2 : (al==='right' ? cx - w : cx);
    const caja = {x0, y0:cy - h/2, x1:x0 + w, y1:cy + h/2};
    const choca = _rotCajas.some(q=>caja.x0 < q.x1 && caja.x1 > q.x0 && caja.y0 < q.y1 && caja.y1 > q.y0);
    if(!choca || k===11){
      _rotCajas.push(caja);
      ctx.fillStyle = 'rgba(255,255,255,.82)';
      ctx.fillRect(caja.x0, caja.y0, w, h);
      ctx.fillStyle = color || '#1b1f24';
      ctx.textAlign = al; ctx.textBaseline = 'middle';
      ctx.fillText(txt, cx + (al==='left' ? 3 : (al==='right' ? -3 : 0)), cy);
      break;
    }
    ox += ex*(h+2); oy += ey*(h+2);
    if(ex === 0 && ey === 0) oy -= (h+2);
  }
  ctx.restore();
}
function _reservar(x0,y0,x1,y1){ _rotCajas.push({x0:Math.min(x0,x1), y0:Math.min(y0,y1), x1:Math.max(x0,x1), y1:Math.max(y0,y1)}); }
function _flecha(x0,y0,x1,y1,color,ancho,cabeza){
  const a = Math.atan2(y1-y0, x1-x0), c = cabeza || 9;
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = ancho || 2;
  ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1 - Math.cos(a)*c*0.6, y1 - Math.sin(a)*c*0.6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1,y1);
  ctx.lineTo(x1 - Math.cos(a)*c - Math.sin(a)*c*0.45, y1 - Math.sin(a)*c + Math.cos(a)*c*0.45);
  ctx.lineTo(x1 - Math.cos(a)*c + Math.sin(a)*c*0.45, y1 - Math.sin(a)*c - Math.cos(a)*c*0.45);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}
// Nombre con subíndice (F₁, R_xA…) en el lienzo: la base y el subíndice en dos tamaños.
function _nombreSub(base, sub, x, y, color, font){
  ctx.save();
  ctx.font = font || '700 11px Inter,sans-serif';
  const wb = ctx.measureText(base).width;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.fillStyle = color; ctx.fillText(base, x, y);
  ctx.font = '700 8.5px Inter,sans-serif';
  ctx.fillText(sub, x + wb + 0.5, y + 3.5);
  const w = wb + ctx.measureText(sub).width + 2;
  ctx.restore();
  return w;
}

// La columna de control (y su desplegable) se superponen al borde izquierdo
// del lienzo: lo que se rotule pegado a ese borde debe empezar más allá.
function _margenIzq(){
  let m = 0;
  try{
    const cr = cv.getBoundingClientRect();
    ['leftPanel','panelFlyout'].forEach(id=>{
      const el = document.getElementById(id);
      if(!el || el.classList.contains('plegado')) return;
      const r = el.getBoundingClientRect();
      if(r.width > 0 && r.right > cr.left) m = Math.max(m, r.right - cr.left);
    });
  }catch(e){}
  return m + 8;
}

// Escala común de los diagramas de presión: la mayor presión de todas las
// zonas y tramos ocupa 80 px, para que las dos zonas sean comparables.
function _presionMaxima(){
  let pM = 0;
  tramos.forEach(t=>{
    if(t.activo === false) return;
    puntosTramo(t, 40).forEach(P=>{ pM = Math.max(pM, presionZona(1,P.y), presionZona(2,P.y)); });
  });
  return pM;
}

// Diagrama de presión de la zona z sobre el tramo t, dibujado del lado del
// líquido y solo donde el tramo está mojado, con flechas hacia la compuerta.
function dibujarDiagramaPresion(t, pts, z, e){
  const niv = nivelZona(z);
  if(!isFinite(niv)) return;
  const nDes = [];
  let alguno = false;
  pts.forEach((P,i)=>{
    const p = presionZona(z, P.y);
    const nv = normalHaciaZona(t, i, pts, z);
    const [sx,sy] = aPantalla(P.x, P.y);
    const d = p*e;
    nDes.push({sx, sy, ox: sx + nv.x*d, oy: sy - nv.y*d, p});
    if(p > 1e-12) alguno = true;
  });
  if(!alguno) return;
  // contorno: base sobre el tramo (parte mojada) y tapa desplazada
  ctx.save();
  ctx.beginPath();
  let abierto = false;
  const tramosMoj = [];
  let actual = null;
  nDes.forEach((q,i)=>{
    const P = pts[i];
    if(P.y <= niv + 1e-12){ if(!actual){ actual = []; } actual.push(q); }
    else if(actual){ tramosMoj.push(actual); actual = null; }
  });
  if(actual) tramosMoj.push(actual);
  tramosMoj.forEach(seg=>{
    if(seg.length < 2) return;
    ctx.beginPath();
    seg.forEach((q,i)=>{ i ? ctx.lineTo(q.sx,q.sy) : ctx.moveTo(q.sx,q.sy); });
    for(let i=seg.length-1;i>=0;i--) ctx.lineTo(seg[i].ox, seg[i].oy);
    ctx.closePath();
    ctx.fillStyle = 'rgba(192,57,43,.13)'; ctx.fill();
    ctx.strokeStyle = 'rgba(192,57,43,.75)'; ctx.lineWidth = 1.3; ctx.stroke();
    // flechas hacia la compuerta, cada cierto trecho
    const paso = Math.max(2, Math.floor(seg.length/7));
    for(let i=paso;i<seg.length-1;i+=paso){
      const q = seg[i];
      if(Math.hypot(q.ox-q.sx, q.oy-q.sy) < 9) continue;
      _flecha(q.ox, q.oy, q.sx, q.sy, 'rgba(192,57,43,.7)', 1.1, 6);
    }
    // valor de la presión en el extremo más profundo
    const fondo = seg.reduce((m,q)=>q.p > m.p ? q : m, seg[0]);
    if(fondo.p > 1e-12 && VIS.cotas)
      _rotulo('p = ' + dec(fondo.p,'f') + ' ' + uPres(), fondo.ox, fondo.oy, '#c0392b',
              fondo.ox - fondo.sx, fondo.oy - fondo.sy, '600 9.5px Inter,sans-serif', 'center');
  });
  ctx.restore();
}

function dibujar(){
  if(!ctx) return;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H);
  _rotCajas = [];
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
  const cadC = cadenaCompuerta();
  if(VIS.liquidos){
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
      const etq = (i===0 ? 'Zona ' + z + ' · nivel ' + dec(c.niv,'len') + ' ' + unitLen + ' · ' : '') + 'γ = ' + dec(c.g,'f') + ' ' + uGamma();
      const xi = _margenIzq();
      if(z===1){ ctx.textAlign='left'; ctx.fillText(etq, xi, ya+13); }
      else { ctx.textAlign='right'; ctx.fillText(etq, W-8, ya+13); }
      ctx.textAlign='start';
      _reservar(z===1 ? xi : W-8-ctx.measureText(etq).width, ya+4, z===1 ? xi+ctx.measureText(etq).width : W-8, ya+20);
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
    ctx.fillText('ZONA 1', _margenIzq()+4, 20);
    ctx.textAlign='right'; ctx.fillText('ZONA 2', W-12, 20); ctx.textAlign='start';
  }
  }

  // ── Diagramas de presión: del lado del líquido, solo en la parte mojada ──
  const pM = _presionMaxima();
  const e = pM > 1e-12 ? 80/pM : 0;
  if(VIS.presion && e > 0){
    tramos.forEach(t=>{
      if(t.activo === false) return;
      const pts = puntosTramo(t, 60);
      if(pts.length<2) return;
      [1,2].forEach(z=>dibujarDiagramaPresion(t, pts, z, e));
    });
  }

  // ── Tramos ──
  tramos.forEach(t=>{
    const pts = puntosTramo(t, 60);
    if(pts.length<2) return;
    ctx.beginPath();
    pts.forEach((P,i)=>{ const [sx,sy]=aPantalla(P.x,P.y); i?ctx.lineTo(sx,sy):ctx.moveTo(sx,sy); });
    const inactivo = t.activo === false;
    ctx.strokeStyle = (selT.indexOf(t.id)>=0)?'#0f5c56':(inactivo?'#9aa3ad':'#1b1f24');
    ctx.lineWidth = (selT.indexOf(t.id)>=0)?7:5;
    if(inactivo) ctx.setLineDash([9,6]);
    ctx.stroke();
    ctx.setLineDash([]);
    const md = pts[Math.floor(pts.length/2)];
    const [mx,my]=aPantalla(md.x,md.y);
    _rotulo(nomTramo(t), mx+6, my-9, '#0b3f3a', 0, -1, '700 10px Inter,sans-serif');
  });

  // ── Apoyos, rótulas, topes, nudos ──
  nodos.forEach(n=>{
    const [px,py]=aPantalla(n.x,n.y);
    if(VIS.apoyos){
    if(n.apoyo==='fijo'){
      ctx.strokeStyle='#0b3f3a'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(px,py+2); ctx.lineTo(px-13,py+21); ctx.lineTo(px+13,py+21); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px-19,py+21); ctx.lineTo(px+19,py+21); ctx.stroke();
      _reservar(px-19, py, px+19, py+22);
    } else if(n.apoyo==='movil'){
      const u = {n, tipo:'R'};
      const d = direccionIncognita(u);
      const a = Math.atan2(d.y, d.x);
      ctx.save(); ctx.translate(px,py); ctx.rotate(Math.PI/2-a);
      ctx.strokeStyle='#0b3f3a'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(0,2); ctx.lineTo(-12,17); ctx.lineTo(12,17); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.arc(-6,21,3.5,0,Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.arc(6,21,3.5,0,Math.PI*2); ctx.stroke();
      ctx.restore();
      _reservar(px-14, py-14, px+14, py+24);
    }
    if(n.tope){
      // El tope es un bloque liso apoyado en la compuerta, del lado en que
      // está; empuja hacia el otro lado (dirección d de la incógnita).
      const u = {n, tipo:'T'};
      const d = direccionIncognita(u);
      ctx.save(); ctx.translate(px,py); ctx.rotate(Math.atan2(-d.y, d.x));
      // bloque detrás del nudo (en −d), con rayado
      ctx.fillStyle='#e9d2b3'; ctx.strokeStyle='#b45309'; ctx.lineWidth=1.6;
      ctx.beginPath(); ctx.rect(-22,-9,15,18); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      for(let k=-6;k<=6;k+=4){ ctx.moveTo(-22,k); ctx.lineTo(-28,k+5); }
      ctx.strokeStyle='#b45309'; ctx.lineWidth=1.1; ctx.stroke();
      ctx.restore();
      const vt = (R && !R.error) ? valorTope(n) : null;
      if(vt === null){
        _rotulo('tope', px - d.x*36, py + d.y*36, '#b45309', -d.x, d.y, '700 10px Inter,sans-serif', 'center');
      }
      _reservar(px - d.x*28 - 10, py + d.y*28 - 10, px - d.x*28 + 10, py + d.y*28 + 10);
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
    _reservar(px+8, py-20, px+22, py-2);
  });

  // ── Resultantes en su centro de presión y cota de profundidad ──
  if(R && !R.error && VIS.resultantes){
    R.cargas.forEach(c=>{
      const [px,py] = aPantalla(c.P.x, c.P.y);
      const L = 58;
      const x0 = px - c.dir.x*L, y0 = py + c.dir.y*L;
      _flecha(x0, y0, px, py, '#c0392b', 2.8, 11);
      _reservar(Math.min(x0,px)-4, Math.min(y0,py)-4, Math.max(x0,px)+4, Math.max(y0,py)+4);
      ctx.beginPath(); ctx.arc(px,py,3.2,0,Math.PI*2); ctx.fillStyle='#c0392b'; ctx.fill();
      // rótulo en la cola de la flecha
      const txt = 'F' + c.k + ' = ' + dec(c.F,'f') + ' ' + unitFor;
      _rotulo(txt, x0 - c.dir.x*8, y0 + c.dir.y*8, '#c0392b', -c.dir.x, c.dir.y, '700 10.5px Inter,sans-serif', 'center');
      // cota de la profundidad del centro de presión, desde la superficie libre
      if(VIS.cotas && c.zP > 1e-9){
        const [,ys] = aPantalla(0, c.niv);
        const lado = (c.z===1) ? -1 : 1;          // hacia la zona del líquido
        const xc = px + lado*(L + 34);
        ctx.save();
        ctx.strokeStyle='rgba(27,31,36,.55)'; ctx.lineWidth=1;
        ctx.setLineDash([3,3]);
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(xc + lado*4, py); ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle='#1b1f24'; ctx.lineWidth=1.15;
        ctx.beginPath(); ctx.moveTo(xc, ys); ctx.lineTo(xc, py); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(xc-5, ys+5); ctx.lineTo(xc+5, ys-5); ctx.moveTo(xc-5, py+5); ctx.lineTo(xc+5, py-5); ctx.stroke();
        ctx.restore();
        _rotulo('zP' + c.k + ' = ' + dec(c.zP,'len') + ' ' + unitLen, xc + lado*4, (ys+py)/2, '#1b1f24', lado, 0,
                '600 10px Inter,sans-serif', lado>0 ? 'left' : 'right');
      }
    });
  }

  // ── Reacciones resueltas: nombre completo y flecha en su sentido real ──
  if(R && !R.error){
    R.inc.forEach((u,j)=>{
      const v = R.val[j];
      if(esCero(v)) return;
      const d = sentidoRealIncognita(u, v);
      const [px,py]=aPantalla(u.n.x,u.n.y);
      const col = (u.tipo==='T') ? '#b45309' : '#15803d';
      const L = (u.tipo==='T') ? 44 : 46;
      // llega al nudo desde fuera, en su sentido real
      const x0 = px - d.x*L, y0 = py + d.y*L;
      _flecha(x0, y0, px - d.x*8, py + d.y*8, col, 2.6, 10);
      const base = (u.tipo==='T') ? 'N' : 'R';
      const sub = (u.tipo==='Rx') ? 'x'+u.n.nombre : (u.tipo==='Ry') ? 'y'+u.n.nombre : u.n.nombre;
      const txt = base + '_' + sub + ' = ' + dec(Math.abs(v),'f') + ' ' + unitFor;
      _rotulo(txt.replace('_',''), x0 - d.x*6, y0 + d.y*6, col, -d.x, d.y, '700 10.5px Inter,sans-serif', 'center');
    });
  }
}
function valorTope(n){
  if(!R || R.error) return null;
  let out = null;
  R.inc.forEach((u,j)=>{ if(u.tipo==='T' && u.n.id===n.id) out = R.val[j]; });
  return out;
}
