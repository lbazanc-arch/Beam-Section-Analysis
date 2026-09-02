// ═══════════════════════════════════════════════════════════
//  DIBUJO
// ═══════════════════════════════════════════════════════════
function ajustarCanvas(){
  const a = document.getElementById('canvasArea');
  if(!a||!cv) return;
  const r = a.getBoundingClientRect(), dpr = window.devicePixelRatio||1;
  W = r.width; H = r.height;
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

function dibujar(){
  if(!ctx) return;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H);
  reiniciarRotulos();
  // rejilla
  if(VIS.grilla){
    const paso = pasoRejilla();
    const [x0,y0]=aMundo(0,H), [x1,y1]=aMundo(W,0);
    ctx.lineWidth=1;
    for(let i=Math.floor(x0/paso);i<=Math.ceil(x1/paso);i++){
      const [px]=aPantalla(i*paso,0);
      ctx.strokeStyle=(i%5===0)?'rgba(120,132,148,.18)':'rgba(120,132,148,.08)';
      ctx.beginPath(); ctx.moveTo(px,0); ctx.lineTo(px,H); ctx.stroke();
    }
    for(let j=Math.floor(y0/paso);j<=Math.ceil(y1/paso);j++){
      const [,py]=aPantalla(0,j*paso);
      ctx.strokeStyle=(j%5===0)?'rgba(120,132,148,.18)':'rgba(120,132,148,.08)';
      ctx.beginPath(); ctx.moveTo(0,py); ctx.lineTo(W,py); ctx.stroke();
    }
  }
  // ejes
  if(VIS.ejes){
    const [ox,oy]=aPantalla(0,0);
    ctx.strokeStyle='rgba(80,92,108,.5)'; ctx.lineWidth=1.4;
    ctx.beginPath(); ctx.moveTo(0,oy); ctx.lineTo(W,oy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox,0); ctx.lineTo(ox,H); ctx.stroke();
    ctx.font='600 10px Inter,sans-serif'; ctx.fillStyle='#66727e';
    ctx.fillText('X', W-16, oy-7); ctx.fillText('Y', ox+7, 16);
  }

  // tramos
  tramos.forEach(t=>{
    const g = geoTramo(t); if(!g) return;
    const [ax,ay]=aPantalla(g.a.x,g.a.y), [bx,by]=aPantalla(g.b.x,g.b.y);
    if(selTramo===t.id || marcado(selTramos,t.id)){
      ctx.strokeStyle='rgba(37,99,235,.28)'; ctx.lineWidth=13;
      ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke();
    }
    ctx.strokeStyle='#1e3a8a'; ctx.lineWidth=6; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke();
    // El nombre se gira con el tramo y se separa del eje: en los inclinados
    // se solapaba con la barra y no se leía. La longitud va en las cotas.
    const mx=(ax+bx)/2, my=(ay+by)/2;
    let a = Math.atan2(by-ay, bx-ax);
    if(a > Math.PI/2 || a < -Math.PI/2) a += Math.PI;   // nunca boca abajo
    // El rótulo se reserva su sitio para que las cargas no lo pisen. En un
    // tramo inclinado el texto acompaña al eje; en uno horizontal se coloca
    // recto, que se lee mejor.
    // Un tramo con peso propio asignado lleva una banda discreta bajo su eje:
    // sin marca no habría forma de saber a cuáles se les puso.
    const _pp = pesoDe(t);
    if(_pp){
      const [pax,pay] = aPantalla(g.a.x, g.a.y), [pbx,pby] = aPantalla(g.b.x, g.b.y);
      const ln = Math.hypot(pbx-pax, pby-pay) || 1;
      const nX = -(pby-pay)/ln, nY = (pbx-pax)/ln;
      const dd = (nY < 0) ? -5 : 5;
      ctx.save();
      ctx.strokeStyle = (pesoActivo === _pp.id) ? '#b07d1a' : 'rgba(176,125,26,.45)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pax + nX*dd, pay + nY*dd);
      ctx.lineTo(pbx + nX*dd, pby + nY*dd);
      ctx.stroke();
      ctx.restore();
    }
    const nom = nomTramo(t);
    ctx.save();
    ctx.font='800 11px Inter,sans-serif';
    const wN = ctx.measureText(nom).width + 8;
    ctx.restore();
    const hh = huecoRotulo(mx, my-16, wN, 14, 0, -1);
    if(hh){
      ctx.save(); ctx.translate(mx+hh.dx, my-16+hh.dy); ctx.rotate(a);
      ctx.font='800 11px Inter,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle='rgba(255,255,255,.9)';
      ctx.fillRect(-wN/2, -7, wN, 14);
      ctx.fillStyle='#1e3a8a';
      ctx.fillText(nom, 0, 0);
      ctx.restore();
    }
    ctx.textAlign='start'; ctx.textBaseline='alphabetic';
  });

  if(VIS.cotas) dibujarCotas();
  if(VIS.cargas){
    // Las repartidas van SIEMPRE debajo: su bloque relleno tapaba las flechas
    // y los arcos de momento que caían dentro de su tramo.
    const _reps = c => (c.tipo === 'U' || c.tipo === 'T');
    const _todas = cargas.concat(cargasPesoPropio());
    _todas.filter(_reps).forEach(dibujarCarga);
    _todas.filter(c=>!_reps(c)).forEach(dibujarCarga);
  }
  nodos.forEach(n=>{ if(VIS.apoyos || edApoyo === n.id) dibujarApoyo(n); });

  // nudos
  nodos.forEach(n=>{
    const [px,py]=aPantalla(n.x,n.y);
    if(selNodo===n.id || marcado(selNodos,n.id)){
      ctx.beginPath(); ctx.arc(px,py,12,0,Math.PI*2);
      ctx.fillStyle='rgba(37,99,235,.25)'; ctx.fill();
      ctx.strokeStyle='#2563eb'; ctx.lineWidth=2; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(px,py,n.rotula?7:6,0,Math.PI*2);
    ctx.fillStyle = n.rotula ? '#fff' : '#1e3a8a'; ctx.fill();
    ctx.strokeStyle = n.rotula ? '#d94f5c' : '#fff';
    ctx.lineWidth = n.rotula ? 2.6 : 2; ctx.stroke();
    ctx.font='700 11px Inter,sans-serif'; ctx.fillStyle='#1b1f24';
    ctx.fillText(n.nombre, px+10, py-10);
  });

  // reacciones calculadas: solo los valores bajo el nudo, igual que el Cap. 6
  // (sin flechas ni arcos: el sentido lo da el signo del número)
  if(R && !R.error){
    const porNudo = {};
    R.inc.forEach((u,j)=>{
      if(!porNudo[u.n.id]) porNudo[u.n.id] = {n:u.n};
      if(u.tipo==='Rx') porNudo[u.n.id].rx = R.val[j];
      else if(u.tipo==='Ry'){ porNudo[u.n.id].ry = R.val[j];
        if(u.ang !== undefined) porNudo[u.n.id].rot =
          (u.n.apAng === undefined ? AP_ANG_DEF : u.n.apAng); }
      else porNudo[u.n.id].m = R.val[j];
    });
    // Una reacción por línea (Rx, Ry, M), no en fila: en fila el texto se
    // hacía muy ancho y acababa cruzándose con las cotas y con las cargas
    // del nudo vecino. Cada línea pasa por el colocador de rótulos, que la
    // aparta si el sitio ya está ocupado.
    Object.values(porNudo).forEach(o=>{
      const [px,py] = aPantalla(o.n.x, o.n.y);
      const lineas = [];
      if(o.rx !== undefined) lineas.push('Rx = '+dec(o.rx,'f')+' '+unitFor);
      if(o.ry !== undefined)
        lineas.push((o.rot === undefined || Math.abs(o.rot - AP_ANG_DEF) < 1e-9 ? 'Ry = ' : 'R = ')
          + dec(o.ry,'f') + ' ' + unitFor
          + (o.rot !== undefined && Math.abs(o.rot - AP_ANG_DEF) > 1e-9
             ? ' (apoyo a '+(+o.rot).toFixed(0)+'°)' : ''));
      if(o.m  !== undefined) lineas.push('M = '+dec(o.m,'mom')+' '+uMom());
      lineas.forEach((txt, k)=>{
        rotulo(txt, px, py + 34 + k*14, '#15803d', 0, 1, '700 10.5px Inter,sans-serif');
      });
    });
    ctx.textAlign='start';
  }
}

// ═══════════════════════════════════════════════════════════
//  ACOTACIÓN EN NIVELES
//  Antes se dibujaba una sola fila de etiquetas: con muchos nudos se
//  amontonaban y se volvían ilegibles. Ahora se reparte en escalones, con el
//  mismo criterio que los capítulos anteriores, y como mucho 5 niveles.
//  Tres pasos: fusionar bordes casi coincidentes, podar los que dejarían un
//  tramo ilegible (se descarta la coordenada entera, para no dejar líneas de
//  referencia que no acotan nada) y repartir cada etiqueta en el nivel más
//  bajo donde no pise a otra.
// ═══════════════════════════════════════════════════════════
const COTA_FUSION_PX   = 10;   // bordes más juntos que esto cuentan como uno
const COTA_MIN_SEG_PX  = 22;   // por debajo de esto el borde se descarta
const COTA_MAX_NIVELES = 5;    // escalones antes de renunciar a la etiqueta
const COTA_HOLGURA_PX  = 12;   // aire entre etiquetas del mismo nivel
const COTA_SALTO_PX    = 13;   // separación entre niveles

function planCotas(valores, pos, medir, opts){
  const o = Object.assign({fusion:COTA_FUSION_PX, minSeg:COTA_MIN_SEG_PX,
                           maxNiveles:COTA_MAX_NIVELES, holgura:COTA_HOLGURA_PX}, opts||{});
  if(!valores || valores.length < 2) return null;

  // 1 · fusión de bordes casi coincidentes
  const orden = valores.slice().sort((a,b)=>a-b);
  const fus = []; let grupo = [orden[0]];
  for(let i=1;i<orden.length;i++){
    if(Math.abs(pos(orden[i]) - pos(grupo[grupo.length-1])) <= o.fusion) grupo.push(orden[i]);
    else { fus.push(grupo.reduce((a,b)=>a+b,0)/grupo.length); grupo = [orden[i]]; }
  }
  fus.push(grupo.reduce((a,b)=>a+b,0)/grupo.length);
  if(fus.length < 2) return null;

  // 2 · poda; el primero y el último se conservan siempre
  const usados = [fus[0]];
  for(let i=1;i<fus.length-1;i++){
    if(Math.abs(pos(fus[i]) - pos(usados[usados.length-1])) >= o.minSeg) usados.push(fus[i]);
  }
  const ult = fus[fus.length-1];
  if(Math.abs(pos(ult) - pos(usados[usados.length-1])) < o.minSeg && usados.length > 1) usados.pop();
  usados.push(ult);
  if(usados.length < 2) return null;

  // 3 · segmentos y reparto en niveles
  const segs = [];
  for(let i=0;i<usados.length-1;i++){
    const a = pos(usados[i]), b = pos(usados[i+1]);
    const txt = String(dec(Math.abs(usados[i+1]-usados[i]),'len'));
    segs.push({a, b, txt, centro:(a+b)/2, ancho: medir(txt)});
  }
  const ocupado = [];
  segs.forEach(sg=>{
    const semi = sg.ancho/2 + o.holgura;
    const i0 = sg.centro - semi, i1 = sg.centro + semi;
    let n = 0;
    while(n < o.maxNiveles){
      const lista = ocupado[n] || (ocupado[n] = []);
      if(!lista.some(iv => i0 < iv[1] && i1 > iv[0])){ lista.push([i0,i1]); break; }
      n++;
    }
    sg.nivel = n;
    sg.visible = n < o.maxNiveles;   // si no cabe en ninguno, va sin etiqueta
  });
  return {coords:usados, segs,
          nMax: segs.reduce((m,sg)=>Math.max(m, sg.visible ? sg.nivel : 0), 0)};
}

// Pinta una cadena ya planificada: una línea con marcas oblicuas en cada
// borde conservado y las etiquetas escalonadas, siempre alejándose del
// dibujo (hacia dentro se meterían encima de la viga).
function pintarCadenaCotas(plan, eje, base, cfg, color){
  const COL = color || '#1b1f24';
  if(!plan) return 0;
  const TICK = 5, SALTO = COTA_SALTO_PX;
  const q0 = plan.coords.map(v=>cfg.pos(v));
  const ini = Math.min(...q0), fin = Math.max(...q0);

  ctx.save();
  ctx.setLineDash([3,3]); ctx.strokeStyle='rgba(27,31,36,.28)'; ctx.lineWidth=1;
  q0.forEach(q=>{
    ctx.beginPath();
    if(eje==='x'){ ctx.moveTo(q, cfg.borde+3); ctx.lineTo(q, base+5); }
    else         { ctx.moveTo(cfg.borde+3, q); ctx.lineTo(base+5, q); }
    ctx.stroke();
  });
  ctx.restore();

  ctx.save();
  ctx.strokeStyle=COL; ctx.fillStyle=COL; ctx.lineWidth=1.15;
  ctx.font='600 10.5px Inter,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';

  ctx.beginPath();
  if(eje==='x'){ ctx.moveTo(ini, base); ctx.lineTo(fin, base); }
  else         { ctx.moveTo(base, ini); ctx.lineTo(base, fin); }
  ctx.stroke();

  q0.forEach(q=>{
    ctx.beginPath();
    if(eje==='x'){ ctx.moveTo(q-TICK, base+TICK); ctx.lineTo(q+TICK, base-TICK); }
    else         { ctx.moveTo(base-TICK, q+TICK); ctx.lineTo(base+TICK, q-TICK); }
    ctx.stroke();
  });

  plan.segs.forEach(sg=>{
    if(!sg.visible) return;
    const d = 12 + sg.nivel*SALTO;
    // La etiqueta de cota reserva su sitio en el registro común, para que las
    // reacciones y las cargas no se pinten encima.
    if(eje === 'x'){
      _rotulos.push({x0:sg.centro - sg.ancho/2 - 3, x1:sg.centro + sg.ancho/2 + 3,
                     y0:base + d - 8, y1:base + d + 8});
    }
    ctx.save(); ctx.strokeStyle='rgba(27,31,36,.40)'; ctx.lineWidth=.9;
    if(eje==='x'){
      const y = base + d;
      ctx.beginPath(); ctx.moveTo(sg.centro, base+2); ctx.lineTo(sg.centro, y-5); ctx.stroke(); ctx.restore();
      ctx.fillText(sg.txt+' '+unitLen, sg.centro, y);
    } else {
      const x = base + d;
      ctx.beginPath(); ctx.moveTo(base+2, sg.centro); ctx.lineTo(x-5, sg.centro); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.translate(x, sg.centro); ctx.rotate(-Math.PI/2);
      ctx.fillText(sg.txt+' '+unitLen, 0, 0); ctx.restore();
    }
  });
  ctx.restore();
  return plan.nMax;
}

// Cota total, por fuera de la cadena y con flechas.
function pintarCotaTotal(c0, c1, eje, base, pos){
  const a = pos(c0), b = pos(c1);
  if(Math.abs(b-a) < 34) return;
  ctx.save();
  ctx.strokeStyle='#2563eb'; ctx.fillStyle='#2563eb'; ctx.lineWidth=1.3;
  ctx.font='700 10.5px Inter,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  // Marcas oblicuas en vez de flechas: es la convención de plano y no compite
  // visualmente con las flechas de las cargas, que sí son fuerzas.
  const flecha = (q)=>{
    ctx.beginPath();
    if(eje==='x'){ ctx.moveTo(q-5, base+5); ctx.lineTo(q+5, base-5); }
    else         { ctx.moveTo(base-5, q+5); ctx.lineTo(base+5, q-5); }
    ctx.stroke();
  };
  const txt = dec(Math.abs(c1-c0),'len') + ' ' + unitLen;
  ctx.beginPath();
  if(eje==='x'){ ctx.moveTo(a, base); ctx.lineTo(b, base); } else { ctx.moveTo(base, a); ctx.lineTo(base, b); }
  ctx.stroke();
  flecha(a); flecha(b);
  const m = (a+b)/2, w = ctx.measureText(txt).width;
  if(eje==='x'){
    ctx.save(); ctx.fillStyle='#fff'; ctx.fillRect(m-w/2-4, base-8, w+8, 16); ctx.restore();
    ctx.fillText(txt, m, base);
  } else {
    ctx.save(); ctx.translate(base, m); ctx.rotate(-Math.PI/2);
    ctx.fillStyle='#fff'; ctx.fillRect(-w/2-4, -8, w+8, 16);
    ctx.fillStyle='#2563eb'; ctx.fillText(txt, 0, 0); ctx.restore();
  }
  ctx.restore();
}

// Puntos notables de las cargas. Devuelve las dos coordenadas: en una viga
// quebrada la cadena vertical es tan necesaria como la horizontal, porque
// una carga sobre un tramo inclinado no queda situada solo por su x.
function puntosDeCargas(){
  const pts = [];
  cargas.forEach(c=>{
    if(c.destino === 'nudo'){
      const n = nodo(c.nudo);
      if(n) pts.push({x:n.x, y:n.y});
      return;
    }
    const t = tramos.find(z=>z.id===c.tramo), g = t && geoTramo(t);
    if(!g) return;
    if(c.tipo === 'U' || c.tipo === 'T'){
      const z = trozoCargado(c);
      if(!z || z.len <= 1e-12) return;
      pts.push({x:g.a.x + g.ux*z.s1, y:g.a.y + g.uy*z.s1});   // inicio
      pts.push({x:g.a.x + g.ux*z.s2, y:g.a.y + g.uy*z.s2});   // fin
    } else {
      const P = puntoDeCarga(c);
      if(P) pts.push({x:P.x, y:P.y});
    }
  });
  return pts;
}
function xsDeCargas(){ return puntosDeCargas().map(p=>p.x); }
function ysDeCargas(){ return puntosDeCargas().map(p=>p.y); }

function dibujarCotas(){
  if(nodos.length < 2) return;
  const xs = nodos.map(n=>n.x), ys = nodos.map(n=>n.y);
  const minY = Math.min(...ys), maxX = Math.max(...xs);
  const medir = t => { ctx.save(); ctx.font='600 10.5px Inter,sans-serif';
                       const w = ctx.measureText(t+' '+unitLen).width; ctx.restore(); return w; };
  const posX = v => aPantalla(v,0)[0];
  const posY = v => aPantalla(0,v)[1];

  const borde = aPantalla(0, minY)[1];
  let base = borde + 26;

  // Nivel 1: posiciones de las cargas (inicio, fin y puntos de aplicación).
  // Se dibuja pegada a la viga porque es la información más ligada al dibujo.
  if(VIS.cargas){
    const xc = xsDeCargas();
    // Solo tiene sentido dibujar esta cadena si acota puntos que la cadena
    // de nudos NO cubre ya. Si cada carga cae sobre un nudo, repetir las
    // mismas medidas en dos filas solo ensucia el dibujo.
    const aporta = xc.some(v => !xs.some(q => Math.abs(posX(q) - posX(v)) < COTA_FUSION_PX));
    const todos = aporta
      ? [...new Set(xc.concat([Math.min(...xs), Math.max(...xs)]).map(v=>+v.toFixed(6)))]
      : [];
    if(todos.length > 2){
      const planC = planCotas(todos, posX, medir, {maxNiveles:2});
      if(planC){
        pintarCadenaCotas(planC, 'x', base, {pos:posX, borde}, '#b07d1a');
        base += 16 + (planC.nMax+1)*COTA_SALTO_PX;
      }
    }
  }

  // Nivel 2: cadena de nudos.
  const planX = planCotas(xs, posX, medir);
  if(planX){
    base += 20;
    pintarCadenaCotas(planX, 'x', base, {pos:posX, borde});
    // La cota total solo aporta si hay más de un vano; con uno solo repetía
    // exactamente la misma medida que la cadena, que es lo que se veía
    // duplicado en pantalla.
    if(planX.segs.length > 1)
      pintarCotaTotal(planX.coords[0], planX.coords[planX.coords.length-1], 'x',
                      base + 12 + (planX.nMax+1)*COTA_SALTO_PX, posX);
  }
  // La cadena vertical solo tiene sentido si la viga no es recta
  const hayY = [...new Set(ys.map(v=>+v.toFixed(6)))].length > 1;
  if(hayY){
    let baseC = aPantalla(maxX, 0)[0] + 26;
    if(VIS.cargas){
      const yc = ysDeCargas();
      const aportaY = yc.some(v => !ys.some(q => Math.abs(posY(q) - posY(v)) < COTA_FUSION_PX));
      const todosY = aportaY
        ? [...new Set(yc.concat([Math.min(...ys), Math.max(...ys)]).map(v=>+v.toFixed(6)))]
        : [];
      if(todosY.length > 2){
        const planCY = planCotas(todosY, posY, medir, {maxNiveles:2});
        if(planCY){
          pintarCadenaCotas(planCY, 'y', baseC,
            {pos:posY, borde:aPantalla(maxX,0)[0]}, '#b07d1a');
        }
      }
    }
    const planY = planCotas(ys, posY, medir);
    if(planY){
      const bordeY = aPantalla(maxX, 0)[0];
      const baseY = bordeY + 78;
      pintarCadenaCotas(planY, 'y', baseY, {pos:posY, borde:bordeY});
      if(planY.segs.length > 1)
        pintarCotaTotal(planY.coords[0], planY.coords[planY.coords.length-1], 'y',
                        baseY + 12 + (planY.nMax+1)*COTA_SALTO_PX, posY);
    }
  }
  ctx.textAlign='start'; ctx.textBaseline='alphabetic';
}


function dibujarApoyo(n){
  // Mientras el diálogo de apoyo está abierto, el nudo en cuestión se
  // resalta en el lienzo: con varios apoyos parecidos era fácil perder de
  // vista sobre cuál se estaba trabajando.
  if(edApoyo === n.id && document.getElementById('apoyoModal')
     && document.getElementById('apoyoModal').classList.contains('show')){
    const [hx,hy]=aPantalla(n.x,n.y);
    ctx.save();
    ctx.strokeStyle='rgba(37,99,235,.85)'; ctx.lineWidth=2.4;
    ctx.setLineDash([5,4]);
    ctx.beginPath(); ctx.arc(hx,hy,15,0,Math.PI*2); ctx.stroke();
    ctx.restore();
  }
  if(!n.apoyo || n.apoyo==='libre') return;
  const [px,py]=aPantalla(n.x,n.y);
  ctx.strokeStyle='#1e3a8a'; ctx.lineWidth=2.2;
  if(n.apoyo==='movil'){
    // El apoyo móvil puede orientarse: apAng es la dirección de su ÚNICA
    // reacción (90° = vertical, el caso habitual). El símbolo se dibuja
    // girado para que se vea sobre qué dirección desliza.
    const ang = (n.apAng === undefined ? AP_ANG_DEF : n.apAng);
    ctx.save();
    ctx.translate(px, py);
    // El símbolo se dibuja colgando hacia abajo; girarlo -(apAng+90°) lo
    // lleva a la rotación pedida. Con el valor por defecto (-90°) el giro
    // es nulo y queda como siempre.
    ctx.rotate(-(ang + 90) * Math.PI/180);
    ctx.beginPath(); ctx.moveTo(0,2); ctx.lineTo(-12,17); ctx.lineTo(12,17); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.arc(-6,21,3.4,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(6,21,3.4,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-17,25); ctx.lineTo(17,25); ctx.stroke();
    ctx.restore();
  } else if(n.apoyo==='simple'){
    ctx.beginPath(); ctx.moveTo(px,py+2); ctx.lineTo(px-13,py+21); ctx.lineTo(px+13,py+21); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px-19,py+21); ctx.lineTo(px+19,py+21); ctx.stroke();
    for(let i=-3;i<=3;i++){ ctx.beginPath(); ctx.moveTo(px+i*5.5,py+21); ctx.lineTo(px+i*5.5-4,py+27); ctx.stroke(); }
  } else if(n.apoyo==='empotrado'){
    // Las diagonales del muro van SIEMPRE al lado opuesto a la viga: si el
    // empotramiento está en el extremo derecho, el muro queda a la derecha.
    // Antes se rayaba siempre a la izquierda y en ese caso el dibujo
    // quedaba al revés, con el muro montado sobre la propia viga.
    let sx = 0, sy = 0, cuenta = 0;
    tramos.forEach(t=>{
      const o = (t.a === n.id) ? nodo(t.b) : (t.b === n.id ? nodo(t.a) : null);
      if(!o) return;
      const [ox, oy] = aPantalla(o.x, o.y);
      const L = Math.hypot(ox-px, oy-py) || 1;
      sx += (ox-px)/L; sy += (oy-py)/L; cuenta++;
    });
    // dirección hacia el muro: opuesta a la de la viga
    let mx = -sx, my = -sy;
    const Lm = Math.hypot(mx, my);
    if(!cuenta || Lm < 1e-6){ mx = -1; my = 0; }        // sin viga: por defecto a la izquierda
    else { mx /= Lm; my /= Lm; }
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.atan2(my, mx));   // el muro queda mirando a -x local
    ctx.beginPath(); ctx.moveTo(0,-20); ctx.lineTo(0,20); ctx.stroke();
    for(let i=-3;i<=3;i++){
      ctx.beginPath(); ctx.moveTo(0, i*6); ctx.lineTo(8, i*6+5); ctx.stroke();
    }
    ctx.restore();
  }
}

// ── Colocación de rótulos sin solape (lienzo) ──
// Cada rótulo declara su caja; si choca con otro ya puesto, se aparta en la
// dirección indicada hasta encontrar hueco. Se reinicia en cada repintado.
let _rotulos = [];
function reiniciarRotulos(){ _rotulos = []; }
function chocaRotulo(caja){
  return _rotulos.some(q => caja.x0 < q.x1 && caja.x1 > q.x0 && caja.y0 < q.y1 && caja.y1 > q.y0);
}
// Devuelve el desplazamiento (dx,dy) libre más cercano, o null si no hay.
function huecoRotulo(x, y, w, h, dirX, dirY, paso){
  paso = paso || (h + 3);
  // Primero se prueba a alejarse en la dirección natural; si la columna está
  // llena, se prueba también desplazándose de lado, que suele quedar libre.
  for(let k=0;k<8;k++){
    for(const lado of (k === 0 ? [0] : [0, -1, 1])){
      const dx = dirX*paso*k + lado*(w*0.6);
      const dy = dirY*paso*k;
      const caja = {x0:x+dx-w/2, x1:x+dx+w/2, y0:y+dy-h/2, y1:y+dy+h/2};
      if(!chocaRotulo(caja)){ _rotulos.push(caja); return {dx, dy}; }
    }
  }
  return null;
}
// Rótulo con fondo, ya colocado en un hueco libre.
function rotulo(txt, x, y, color, dirX, dirY, fuente){
  ctx.save();
  ctx.font = fuente || '700 10px Inter,sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  const w = ctx.measureText(txt).width + 6, h = 13;
  const hh = huecoRotulo(x, y, w, h, dirX||0, dirY||-1);
  if(hh){
    ctx.fillStyle='rgba(255,255,255,.88)';
    ctx.fillRect(x+hh.dx-w/2, y+hh.dy-h/2, w, h);
    ctx.fillStyle = color;
    ctx.fillText(txt, x+hh.dx, y+hh.dy);
  }
  ctx.restore();
}

function dibujarCarga(c){
  // La carga puede estar anclada a un TRAMO (por distancia) o a un NUDO.
  // Antes solo se contemplaba el primer caso: una carga sobre un nudo salía
  // de la función sin dibujarse, y por eso los momentos de nudo eran
  // invisibles en el panel de dibujo.
  let px, py, t = null, g = null;
  if(c.destino === 'nudo'){
    const n = nodo(c.nudo);
    if(!n) return;
    [px, py] = aPantalla(n.x, n.y);
    g = geoDeCarga(c);          // eje local del tramo que llega al nudo
  } else {
    t = tramos.find(z=>z.id===c.tramo); g = t && geoTramo(t);
    if(!g) return;
    const s = Math.max(0, Math.min(g.L, sDesdePos(c, g, c.pos)));
    [px, py] = aPantalla(g.a.x+g.ux*s, g.a.y+g.uy*s);
  }
  if(marcado(selCargas, c.id)){
    ctx.fillStyle='rgba(37,99,235,.20)';
    if((c.tipo==='U'||c.tipo==='T') && g){
      const zz = trozoCargado(c) || {s1:0, s2:g.L};
      const [ax,ay]=aPantalla(g.a.x+g.ux*zz.s1, g.a.y+g.uy*zz.s1);
      const [bx,by]=aPantalla(g.a.x+g.ux*zz.s2, g.a.y+g.uy*zz.s2);
      ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(ax,ay-40);
      ctx.lineTo(bx,by-40); ctx.lineTo(bx,by); ctx.closePath(); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(px, py-24, 26, 0, Math.PI*2); ctx.fill();
    }
  }
  if(c.tipo==='P' || c.tipo==='PX'){
    // Una sola flecha para cualquier dirección: vertical, horizontal,
    // perpendicular al tramo o axial. El signo decide el sentido (negativo =
    // contrario al positivo de esa dirección).
    const d = dirCarga(c, g);
    const sg = (c.mag < 0) ? -1 : 1;
    // en pantalla el eje y crece hacia abajo, así que se invierte
    const vx = d.x*sg, vy = -d.y*sg;
    // Una fuerza paralela a la barra actúa SOBRE la barra y ahí se dibuja;
    // para que no se pierda contra el eje lleva un halo blanco que la recorta
    // y su valor va al costado de la flecha, no en la cola.
    let paralela = false, nX = 0, nY = 0;
    if(g){
      const ux = g.ux, uy = -g.uy;                 // eje del tramo en pantalla
      if(Math.abs(vx*ux + vy*uy) > 0.9){           // menos de ~25° con la barra
        paralela = true;
        nX = -uy; nY = ux;                         // normal en pantalla
        const s2 = (nY > 0) ? -1 : 1;              // hacia arriba de la pantalla
        nX *= s2; nY *= s2;
      }
    }
    // cola a 50 px del punto, punta a 5 px; la flecha "llega" al punto
    const qx = px - vx*50, qy = py - vy*50;
    const ex = px - vx*5,  ey = py - vy*5;
    if(paralela){
      ctx.strokeStyle='#fff'; ctx.lineWidth=8; ctx.lineCap='butt';
      ctx.beginPath(); ctx.moveTo(qx,qy); ctx.lineTo(px - vx*1, py - vy*1); ctx.stroke();
    }
    ctx.strokeStyle='#d94f5c'; ctx.fillStyle='#d94f5c'; ctx.lineWidth=2.6;
    ctx.beginPath(); ctx.moveTo(qx,qy); ctx.lineTo(ex,ey); ctx.stroke();
    const ang = Math.atan2(vy, vx);
    ctx.save(); ctx.translate(px - vx*3, py - vy*3); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-11,-5); ctx.lineTo(-11,5);
    ctx.closePath(); ctx.fill(); ctx.restore();
    if(paralela)
      rotulo(dec(Math.abs(c.mag),'f')+' '+unitFor, (qx+ex)/2 + nX*11, (qy+ey)/2 + nY*11, '#d94f5c', nX, nY);
    else
      rotulo(dec(Math.abs(c.mag),'f')+' '+unitFor, qx - vx*10, qy - vy*10, '#d94f5c', -vx, -vy);
  } else if(c.tipo==='M'){
    // El sentido del arco sigue al signo del momento.
    // El sentido debe leerse de un vistazo: arco de 300° con una punta
    // grande en el extremo final y un hueco visible en el inicio. Antes la
    // punta salía casi tangente al arco y no se distinguía horario de
    // antihorario.
    const horario = c.mag < 0;
    const R0 = 17;
    // En canvas el eje y va hacia ABAJO, así que el ángulo creciente ya
    // recorre el sentido horario en pantalla. El código anterior invertía
    // dos veces —barrido negativo Y el indicador de antihorario— y el
    // resultado era el giro contrario al pedido.
    const aIni = -0.35;
    const barrido = (300 * Math.PI/180) * (horario ? 1 : -1);
    const aFin = aIni + barrido;
    ctx.strokeStyle='#8b5cf6'; ctx.fillStyle='#8b5cf6'; ctx.lineWidth=2.8;
    ctx.beginPath();
    ctx.arc(px, py, R0, aIni, aFin, !horario);
    ctx.stroke();
    // Punta en el extremo final, orientada según el sentido de recorrido:
    // con ángulo creciente la tangente apunta a aFin+90°.
    const fx = px + R0*Math.cos(aFin), fy = py + R0*Math.sin(aFin);
    const tg = aFin + (horario ? Math.PI/2 : -Math.PI/2);
    const L1 = 11, W1 = 6;
    ctx.beginPath();
    ctx.moveTo(fx + L1*Math.cos(tg), fy + L1*Math.sin(tg));
    ctx.lineTo(fx - W1*Math.cos(tg) + W1*Math.cos(tg+Math.PI/2),
               fy - W1*Math.sin(tg) + W1*Math.sin(tg+Math.PI/2));
    ctx.lineTo(fx - W1*Math.cos(tg) - W1*Math.cos(tg+Math.PI/2),
               fy - W1*Math.sin(tg) - W1*Math.sin(tg+Math.PI/2));
    ctx.closePath(); ctx.fill();
    rotulo(dec(Math.abs(c.mag),'mom')+' '+uMom(), px+26, py-22, '#8b5cf6', 0, -1);
  } else {
    // distribuida: solo en el trozo indicado por inicio y fin
    const z = trozoCargado(c);
    if(!z || z.len<=1e-12) return;
    const w1 = c.mag, w2 = (c.tipo==='U')? c.mag : (c.mag2||0);
    const wm = Math.max(Math.abs(w1), Math.abs(w2), 1e-9);
    const alt = 34;
    const [ax,ay]=aPantalla(g.a.x+g.ux*z.s1, g.a.y+g.uy*z.s1);
    const [bx,by]=aPantalla(g.a.x+g.ux*z.s2, g.a.y+g.uy*z.s2);
    const h1 = alt*w1/wm, h2 = alt*w2/wm;
    // El bloque se levanta en sentido CONTRARIO a la carga: si es local, sale
    // perpendicular al tramo; si es global, siempre vertical.
    const d = dirCarga(c, g);
    const ex = -d.x, ey = d.y;   // y de pantalla invertida
    // Relleno muy tenue: con el 20% anterior el bloque tapaba las flechas y
    // los momentos que caían bajo la misma zona del tramo.
    ctx.fillStyle='rgba(224,168,60,.10)'; ctx.strokeStyle='#e0a83c'; ctx.lineWidth=1.8;
    ctx.beginPath();
    ctx.moveTo(ax,ay); ctx.lineTo(ax+ex*h1, ay+ey*h1);
    ctx.lineTo(bx+ex*h2, by+ey*h2); ctx.lineTo(bx,by);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    for(let i=0;i<=6;i++){
      const tt=i/6, X=ax+(bx-ax)*tt, Y=ay+(by-ay)*tt, hh=h1+(h2-h1)*tt;
      ctx.beginPath(); ctx.moveTo(X+ex*hh, Y+ey*hh); ctx.lineTo(X+ex*4, Y+ey*4); ctx.stroke();
    }
    // En una trapecial los dos extremos valen distinto: se rotulan ambos.
    if(Math.abs(w1-w2) > 1e-9){
      rotulo(dec(Math.abs(w1),'f'), ax+ex*(h1+9), ay+ey*(h1+9), '#b07d1a', 0, -1);
      rotulo(dec(Math.abs(w2),'f')+' '+uDist(), bx+ex*(h2+9), by+ey*(h2+9), '#b07d1a', 0, -1);
    } else {
      rotulo(dec(Math.abs(w1),'f')+' '+uDist(),
             (ax+bx)/2 + ex*(alt+9), (ay+by)/2 + ey*(alt+9), '#b07d1a', 0, -1);
    }
  }
}
