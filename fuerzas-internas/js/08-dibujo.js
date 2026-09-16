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
  olvidarAnchos();
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
  // El repintado va en DOS PASADAS: primero la geometría, que deja su caja en
  // el registro de ocupación, y al final `pintarRotulos()`, que busca hueco a
  // cada texto junto a su elemento. Las zonas de la interfaz que se superponen
  // al lienzo entran ya en el registro (§7 «Nada dibujado bajo la columna»).
  reiniciarRotulos();
  _zonasInterfaz();
  // Una sola llamada a cargasPesoPropio(): la usan el lado libre del nombre de
  // cada tramo, el del valor de un par y el dibujo de las cargas.
  _cargasVis = VIS.cargas ? cargas.concat(VIS.peso ? cargasPesoPropio() : []) : [];
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
    _ocSeg(0, oy, W, oy, 1.4, 'eje');
    _ocSeg(ox, 0, ox, H, 1.4, 'eje');
    rotulo('X', W-16, oy-11, '#66727e', 0, -1, '600 10px Inter,sans-serif', {prio:9, padX:3});
    rotulo('Y', ox+12, 14, '#66727e', 1, 0, '600 10px Inter,sans-serif', {prio:9, padX:3});
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
    // El eje entra en el registro con su grosor real (y con el del resalte de
    // selección, que es mayor): ningún rótulo se pinta encima.
    const _sel = (selTramo===t.id || marcado(selTramos,t.id));
    _ocSeg(ax, ay, bx, by, _sel ? 7 : 3.6, 'tramo');
    // Un tramo con peso propio asignado lleva una banda discreta bajo su eje:
    // sin marca no habría forma de saber a cuáles se les puso.
    // Con «Peso propio» apagado en Visualización no se marca ni se dibuja;
    // el cálculo lo sigue teniendo en cuenta.
    const _pp = VIS.peso ? pesoDe(t) : null;
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
      _ocSeg(pax + nX*dd, pay + nY*dd, pbx + nX*dd, pby + nY*dd, 2.6, 'peso');
    }
    // El nombre del tramo se ENCOLA: se coloca cuando ya está dibujado todo.
    // Prueba primero el LADO LIBRE de la pieza —el contrario al que levanta la
    // banda de su carga repartida— y solo si ahí no cabe se aleja. Antes iba
    // siempre 16 px «hacia arriba» del eje y caía dentro de las rayas de la
    // banda («CD») o bajo el arco de un par («BC»). El texto se gira con el
    // tramo: en los inclinados, recto, no se leía junto a la barra.
    const lado = ladoLibreTramo(t.id, g), lx = lado.x, ly = lado.y;
    let a = Math.atan2(by-ay, bx-ax);
    if(a > Math.PI/2 || a < -Math.PI/2) a += Math.PI;   // nunca boca abajo
    rotulo(nomTramo(t), (ax+bx)/2 + lx*15, (ay+by)/2 + ly*15, '#1e3a8a', lx, ly,
           '800 11px Inter,sans-serif', {prio:2, ang:a, alto:14, padX:8, eje:[ax,ay,bx,by]});
  });

  if(VIS.cotas) dibujarCotas();
  if(VIS.cargas){
    // Las repartidas van SIEMPRE debajo: su bloque relleno tapaba las flechas
    // y los arcos de momento que caían dentro de su tramo.
    const _reps = c => (c.tipo === 'U' || c.tipo === 'T');
    _cargasVis.filter(_reps).forEach(dibujarCarga);
    _cargasVis.filter(c=>!_reps(c)).forEach(dibujarCarga);
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
    _ocDisco(px, py, (selNodo===n.id || marcado(selNodos,n.id)) ? 13.5
                     : (n.rotula ? 8.6 : 7.4), 'nudo');
    // El nombre sale del propio nudo hacia arriba y a la derecha, que es donde
    // iba antes; si ahí hay barra, apoyo o carga, el colocador lo gira.
    rotulo(n.nombre, px, py, '#1b1f24', 0.72, -0.69, '700 11px Inter,sans-serif',
           {prio:1, padX:5});
  });

  // reacciones calculadas: flecha en su sentido real llegando al nudo y
  // nombre completo (R_xA, R_yA, M_A), lo mismo que dibuja el informe (R6,
  // R8). Antes iba solo el valor bajo el nudo, sin sentido.
  if(R && !R.error){
    R.inc.forEach((u,j)=>{
      const v = R.val[j];
      if(Math.abs(v) < 1e-9) return;
      const [px,py] = aPantalla(u.n.x, u.n.y);
      const nom = u.n.nombre;
      if(u.tipo === 'M' && u.ang === undefined){
        // par de empotramiento: arco con flecha, antihorario si es positivo
        const hor = v < 0, rr = 21;
        ctx.save(); ctx.strokeStyle = '#15803d'; ctx.fillStyle = '#15803d'; ctx.lineWidth = 2.2;
        const a0 = Math.PI*0.15, a1 = Math.PI*1.55;   // ángulos de pantalla (sentido horario en pantalla = antihorario en el mundo)
        ctx.beginPath(); ctx.arc(px, py, rr, hor ? a0 : a1, hor ? a1 : a0, !hor); ctx.stroke();
        const af = hor ? a1 : a0, tang = hor ? 1 : -1;
        const hx = px + rr*Math.cos(af), hy = py + rr*Math.sin(af);
        ctx.translate(hx, hy); ctx.rotate(af + tang*Math.PI/2);
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-9,-4.5); ctx.lineTo(-9,4.5); ctx.closePath(); ctx.fill();
        ctx.restore();
        _ocDisco(px, py, rr + 4, 'parReaccion');
        rotulo('M' + nom + ' = ' + dec(Math.abs(v),'mom') + ' ' + uMom(), px, py - rr - 12, '#15803d', 0, -1, '700 10.5px Inter,sans-serif', {prio:4});
        return;
      }
      let dx, dy;
      if(u.ang !== undefined){ dx = Math.cos(u.ang); dy = Math.sin(u.ang); }
      else if(u.tipo === 'Rx'){ dx = 1; dy = 0; } else { dx = 0; dy = 1; }
      const sg = v >= 0 ? 1 : -1;
      const ex = dx*sg, ey = dy*sg;                 // sentido real, en el mundo
      // Si la flecha viene por el eje del símbolo del apoyo (a menos de 35° de
      // hacia donde cuelga), nace más allá de él: el símbolo llega a 27 px y antes lo
      // cruzaba (2026-09-14, criterio de armaduras). El empotrado no cuelga.
      let d1 = 8;
      if(u.n.apoyo === 'movil' || u.n.apoyo === 'simple'){
        const hd = (anguloApoyo(u.n) - 180)*Math.PI/180;
        if((-ex*Math.cos(hd) - ey*Math.sin(hd)) > Math.cos(35*Math.PI/180)) d1 = 34;
      }
      const Lf = 44, d0 = d1 + Lf;
      const x0 = px - ex*d0, y0 = py + ey*d0;        // cola de la flecha (y de pantalla invertida)
      ctx.save(); ctx.strokeStyle = '#15803d'; ctx.fillStyle = '#15803d'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(px - ex*(d1+1), py + ey*(d1+1)); ctx.stroke();
      ctx.translate(px - ex*d1, py + ey*d1); ctx.rotate(Math.atan2(-ey, ex));
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-10,-4.5); ctx.lineTo(-10,4.5); ctx.closePath(); ctx.fill();
      ctx.restore();
      _ocFlecha(x0, y0, px - ex*d1, py + ey*d1, 3.2, 'reaccion');
      // El rodillo inclinado lleva en la cola el arco de su ángulo agudo con el
      // eje más cercano, el mismo número que escribe el PDF (bsaArcoReaccion).
      if(u.ang !== undefined) _arcoReaccionFI(x0, y0, ex, ey, '#15803d');
      const base = (u.ang !== undefined) ? 'R' + nom : (u.tipo === 'Rx' ? 'Rx' + nom : 'Ry' + nom);
      rotulo(base + ' = ' + dec(Math.abs(v),'f') + ' ' + unitFor, x0 - ex*10, y0 + ey*10, '#15803d', -ex, ey, '700 10.5px Inter,sans-serif', {prio:4});
    });
    ctx.textAlign = 'start';
  }

  // leyenda mínima, plegable desde Visualización (propuesta 2)
  if(VIS.leyenda) dibujarLeyenda();
  // Segunda pasada: con la geometría completa en el registro, cada texto busca
  // su hueco. Tiene que ser LO ÚLTIMO de dibujar().
  pintarRotulos();
}

// ── Leyenda: qué es cada color del lienzo ──
function dibujarLeyenda(){
  const filas = [
    {tipo:'flecha', col:'#d94f5c', txt:'carga'},
    {tipo:'bloque', col:'#b8860b', txt:'carga repartida / peso propio'},
    {tipo:'flecha', col:'#15803d', txt:'reacción (sentido real)'},
    {tipo:'rotula', col:'#d94f5c', txt:'rótula'}
  ];
  // La columna de control (96 px, 88 en móvil) se superpone al lienzo por la
  // izquierda: la leyenda arrancaba en x = 12 y quedaba tapada entera. Su sitio
  // natural queda más allá de la columna y, si ahí pisa el dibujo, el colocador
  // la lleva al hueco libre más cercano, como a cualquier otro texto.
  const ancho = 196, alto = 14*filas.length + 12;
  const xN = Math.max(12, Math.min(108, W - ancho - 12));
  const yN = H - alto - 44;
  _pendientes.push({bloque:(x0, y0)=>_pintarLeyendaEn(x0, y0, filas, ancho, alto),
                    w:ancho, h:alto, x:xN + ancho/2, y:yN + alto/2,
                    dirX:0, dirY:-1, prio:8, o:{paso:20, kMax:9, margen:3}});
}
function _pintarLeyendaEn(x0, y0, filas, ancho, alto){
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.strokeStyle = 'rgba(27,31,36,.18)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.rect(x0, y0, ancho, alto); ctx.fill(); ctx.stroke();
  ctx.font = '600 10px Inter,sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  filas.forEach((f,i)=>{
    const y = y0 + 6 + 14*i + 7, x = x0 + 8;
    if(f.tipo === 'flecha'){
      ctx.strokeStyle = f.col; ctx.fillStyle = f.col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x+16, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x+20, y); ctx.lineTo(x+13, y-3.5); ctx.lineTo(x+13, y+3.5); ctx.closePath(); ctx.fill();
    } else if(f.tipo === 'bloque'){
      ctx.fillStyle = 'rgba(184,134,11,.25)'; ctx.fillRect(x, y-5, 20, 10);
      ctx.strokeStyle = f.col; ctx.lineWidth = 1.5; ctx.strokeRect(x, y-5, 20, 10);
    } else {
      ctx.beginPath(); ctx.arc(x+10, y, 5, 0, Math.PI*2); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.strokeStyle = f.col; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.fillStyle = '#374151'; ctx.fillText(f.txt, x + 28, y);
  });
  ctx.restore();
  ctx.textAlign='start'; ctx.textBaseline='alphabetic';
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

  // Las líneas de referencia NO se pintan aquí ni ocupan sitio: se difieren y,
  // al final, se trazan CORTADAS por donde haya quedado un texto. Es el criterio
  // del PDF de armaduras (_trazoInterrumpido): una guía a trazos no puede echar
  // de su sitio al rótulo de una reacción, pero tampoco puede cruzarlo.
  q0.forEach(q=>{
    if(eje==='x') _guias.push({x1:q, y1:cfg.borde+3, x2:q, y2:base+5});
    else          _guias.push({x1:cfg.borde+3, y1:q, x2:base+5, y2:q});
  });

  ctx.save();
  ctx.strokeStyle=COL; ctx.fillStyle=COL; ctx.lineWidth=1.15;
  ctx.font='600 10.5px Inter,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';

  ctx.beginPath();
  if(eje==='x'){ ctx.moveTo(ini, base); ctx.lineTo(fin, base); _ocSeg(ini, base, fin, base, 1.4, 'cota'); }
  else         { ctx.moveTo(base, ini); ctx.lineTo(base, fin); _ocSeg(base, ini, base, fin, 1.4, 'cota'); }
  ctx.stroke();

  q0.forEach(q=>{
    ctx.beginPath();
    if(eje==='x'){ ctx.moveTo(q-TICK, base+TICK); ctx.lineTo(q+TICK, base-TICK); _ocSeg(q-TICK, base+TICK, q+TICK, base-TICK, 1.2, 'cota'); }
    else         { ctx.moveTo(base-TICK, q+TICK); ctx.lineTo(base+TICK, q-TICK); _ocSeg(base-TICK, q+TICK, base+TICK, q-TICK, 1.2, 'cota'); }
    ctx.stroke();
  });

  // Las etiquetas se ENCOLAN, con su línea de referencia: la dibuja el
  // colocador hasta el borde de la caja, dondequiera que acabe el texto.
  plan.segs.forEach(sg=>{
    if(!sg.visible) return;
    const d = 12 + sg.nivel*SALTO;
    if(eje==='x')
      rotulo(sg.txt+' '+unitLen, sg.centro, base+d, COL, 0, 1, '600 10.5px Inter,sans-serif',
             {prio:6, paso:13, eje:[ini, base+d, fin, base+d], guia:{x:sg.centro, y:base+2}});
    else
      rotulo(sg.txt+' '+unitLen, base+d, sg.centro, COL, 1, 0, '600 10.5px Inter,sans-serif',
             {prio:6, paso:13, ang:-Math.PI/2, eje:[base+d, ini, base+d, fin],
              guia:{x:base+2, y:sg.centro}});
  });
  ctx.restore();
  return plan.nMax;
}

// Cota total, por fuera de la cadena. Su etiqueta va SOBRE la propia línea, con
// hueco blanco, que es la convención de plano; por eso la línea y sus marcas
// oblicuas se difieren como las demás líneas de referencia y se trazan CORTADAS
// por los textos: la etiqueta se queda en su sitio y no hay trazo bajo ella.
// Las marcas son oblicuas, no flechas: no compiten con las flechas de las
// cargas, que sí son fuerzas.
function pintarCotaTotal(c0, c1, eje, base, pos){
  const a = pos(c0), b = pos(c1);
  if(Math.abs(b-a) < 34) return;
  const COL = '#2563eb';
  const gu = (x1,y1,x2,y2)=>_guias.push({x1, y1, x2, y2, col:COL, solida:true, ancho:1.3});
  const txt = dec(Math.abs(c1-c0),'len') + ' ' + unitLen;
  // Si otro texto la echa de su sitio, la etiqueta se queda atada a SU línea:
  // `guia` la une a ella y `jMax:3` le impide girar más de 90°, es decir, solo
  // puede apartarse a lo largo de su propia línea o hacia afuera. Sin eso se
  // colocaba 84 px más adentro, al otro lado de la cadena de nudos, y se leía
  // como si fuera de esa cadena.
  if(eje==='x'){
    gu(a, base, b, base);
    gu(a-5, base+5, a+5, base-5); gu(b-5, base+5, b+5, base-5);
    rotulo(txt, (a+b)/2, base, COL, 0, 1, '700 10.5px Inter,sans-serif',
           {prio:6, paso:14, padX:8, alto:16, jMax:3, kMax:4,
            eje:[Math.min(a,b), base, Math.max(a,b), base], guia:{x:(a+b)/2, y:base, color:COL}});
  } else {
    gu(base, a, base, b);
    gu(base-5, a+5, base+5, a-5); gu(base-5, b+5, base+5, b-5);
    rotulo(txt, base, (a+b)/2, COL, 1, 0, '700 10.5px Inter,sans-serif',
           {prio:6, paso:14, padX:8, alto:16, ang:-Math.PI/2, jMax:3, kMax:4,
            eje:[base, Math.min(a,b), base, Math.max(a,b)], guia:{x:base, y:(a+b)/2, color:COL}});
  }
}

// Puntos notables de las cargas. Devuelve las dos coordenadas: en una viga
// quebrada la cadena vertical es tan necesaria como la horizontal, porque
// una carga sobre un tramo inclinado no queda situada solo por su x.
function puntosDeCargas(soloTramos){
  const pts = [];
  cargas.forEach(c=>{
    if(c.destino === 'nudo'){
      const n = nodo(c.nudo);
      if(!n) return;
      if(soloTramos && !tramos.some(t=>soloTramos.indexOf(t.id)>=0 && (t.a===n.id || t.b===n.id))) return;
      pts.push({x:n.x, y:n.y});
      return;
    }
    if(soloTramos && soloTramos.indexOf(c.tramo) < 0) return;
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
// La cadena de subtramos (posiciones de las cargas) solo se acota para el
// tramo seleccionado: con todos a la vez, en un pórtico se montaba sobre las
// cargas (propuesta 2, 2026-09-08). Las cadenas por tramo y la total, siempre.
function tramosSeleccionadosParaCotas(){
  const ids = selTramos.slice();
  if(selTramo !== null && ids.indexOf(selTramo) < 0) ids.push(selTramo);
  return ids;
}
function xsDeCargas(){ const ids = tramosSeleccionadosParaCotas(); return ids.length ? puntosDeCargas(ids).map(p=>p.x) : []; }
function ysDeCargas(){ const ids = tramosSeleccionadosParaCotas(); return ids.length ? puntosDeCargas(ids).map(p=>p.y) : []; }

function dibujarCotas(){
  if(nodos.length < 2) return;
  const xs = nodos.map(n=>n.x), ys = nodos.map(n=>n.y);
  const minY = Math.min(...ys), maxX = Math.max(...xs);
  const medir = t => _anchoTexto(t+' '+unitLen, '600 10.5px Inter,sans-serif');
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
    _ocDisco(hx, hy, 16.5, 'apoyo');
  }
  if(!n.apoyo || n.apoyo==='libre') return;
  const [px,py]=aPantalla(n.x,n.y);
  ctx.strokeStyle='#1e3a8a'; ctx.lineWidth=2.2;
  if(n.apoyo==='movil' || n.apoyo==='simple'){
    // Los dos símbolos se dibujan colgando del nudo, que es el caso de 90°
    // (reacción hacia arriba), y se giran (90 − ángulo) para llevarlos a su
    // posición. Ojo a la diferencia de fondo: en el MÓVIL ese ángulo es la
    // dirección real de su única reacción y entra en el cálculo; en el SIMPLE
    // sale de `apAngDib` y es solo presentación, porque un pasador sujeta las
    // dos direcciones se dibuje como se dibuje.
    const ang = anguloApoyo(n);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate((90 - ang) * Math.PI/180);
    if(n.apoyo==='movil'){
      ctx.beginPath(); ctx.moveTo(0,2); ctx.lineTo(-12,17); ctx.lineTo(12,17); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.arc(-6,21,3.4,0,Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.arc(6,21,3.4,0,Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-17,25); ctx.lineTo(17,25); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(0,2); ctx.lineTo(-13,21); ctx.lineTo(13,21); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-19,21); ctx.lineTo(19,21); ctx.stroke();
      for(let i=-3;i<=3;i++){ ctx.beginPath(); ctx.moveTo(i*5.5,21); ctx.lineTo(i*5.5-4,27); ctx.stroke(); }
    }
    ctx.restore();
    // La envolvente del símbolo entra en el registro GIRADA como él: el rodillo
    // llega a 26 px del nudo y el pasador a 28, y ahí no cae ningún rótulo.
    const _th = (90 - ang)*Math.PI/180;
    if(n.apoyo==='movil') _ocCajaLocal(px, py, _th, -17.5, -1, 17.5, 26, 'apoyo');
    else                  _ocCajaLocal(px, py, _th, -19.5, -1, 19.5, 28, 'apoyo');
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
    _ocCajaLocal(px, py, Math.atan2(my, mx), -1.5, -21.5, 9.5, 24.5, 'apoyo');
  }
}

// ═══════════════════════════════════════════════════════════
//  REGISTRO DE OCUPACIÓN DEL LIENZO Y COLOCACIÓN DE RÓTULOS
//  Todo lo que se pinta deja aquí su polígono convexo, en píxeles de pantalla:
//  ejes de tramo, bandas de peso propio, símbolos de apoyo, nudos y rótulas,
//  flechas de carga y de reacción, arcos de par, bandas y rayas de las
//  repartidas, cadenas de cotas, la leyenda y los textos ya colocados; además,
//  las zonas de la interfaz que se superponen al lienzo (§7 «Nada dibujado bajo
//  la columna ni bajo los botones del lienzo»). Las LÍNEAS DE REFERENCIA son la
//  excepción: no ocupan sitio, se difieren y al final se trazan cortadas por
//  los textos, como el `_trazoInterrumpido` del PDF de armaduras.
//  Los rótulos NO se pintan según se dibuja: se ENCOLAN y, con la geometría ya
//  completa, `pintarRotulos()` busca a cada uno un hueco junto a su elemento.
//  Sin esa segunda pasada un texto temprano no puede esquivar lo que todavía no
//  se ha dibujado, que era el fallo: el arco del par tapaba el nombre «BC» y el
//  nombre «CD» caía dentro de las rayas de su banda de carga.
//  Es la misma idea que `crearRegistro` del PDF de armaduras
//  (armaduras-y-marcos/js/12-latex.js), reescrita para este tema con sus
//  nombres: ni el registro ni el colocador se comparten (CLAUDE.md §5.4).
// ═══════════════════════════════════════════════════════════
let _ocupado = [];      // {pol, bb:[x0,y0,x1,y1], tipo, aa, cir}
let _pendientes = [];   // textos y bloques por colocar, en el orden de dibujo
let _rotulos = [];      // cajas de los textos YA colocados (es lo que se comprueba)
let _guias = [];        // líneas de referencia, que se pintan CORTADAS al final
let _cargasVis = [];    // las cargas visibles del repintado en curso (con el peso propio)
let _zonasBB = [];      // SOLO las cajas de la interfaz, que se consultan por cada rótulo
// Lado LIBRE de un tramo, en pantalla: la normal que NO levanta la banda de su
// carga repartida y, si no la tiene, la que apunta hacia arriba. Es por donde
// se prueba primero a poner el nombre del tramo y el valor de un par.
function ladoLibreTramo(tId, g){
  const a = aPantalla(g.a.x, g.a.y), b = aPantalla(g.b.x, g.b.y);
  const L = Math.hypot(b[0]-a[0], b[1]-a[1]) || 1;
  let lx = -(b[1]-a[1])/L, ly = (b[0]-a[0])/L;
  if(ly > 0){ lx = -lx; ly = -ly; }
  const rep = _cargasVis.find(c => c.destino !== 'nudo' && c.tramo === tId
                                && (c.tipo === 'U' || c.tipo === 'T'));
  if(rep){
    const d = dirCarga(rep, g);                  // la banda se levanta hacia (-dx, dy)
    if((-d.x)*lx + d.y*ly > 0){ lx = -lx; ly = -ly; }
  }
  return {x:lx, y:ly};
}
// Las cajas envolventes van ADEMÁS en un array plano de números: el descarte
// por cajas se recorre cien veces por cada posición que se prueba, y sobre
// números sueltos es varias veces más rápido que entrando en cada objeto.
let _ocCajas = [];      // x0,y0,x1,y1 de cada elemento, seguidos
function reiniciarRotulos(){ _ocupado = []; _ocCajas = []; _pendientes = []; _rotulos = []; _guias = []; _zonasBB = []; }

// ── Polígonos convexos en píxeles de pantalla ──
function _ocBB(P){
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for(let i=0;i<P.length;i++){
    const x = P[i][0], y = P[i][1];
    if(x<x0) x0=x; if(x>x1) x1=x; if(y<y0) y0=y; if(y>y1) y1=y;
  }
  return [x0,y0,x1,y1];
}
// Separación entre dos polígonos convexos por ejes separadores: > 0 es la
// holgura; <= 0, se solapan. Con `basta`, deja de buscar en cuanto un eje ya
// separa eso: al que pregunta solo le importa si la holgura llega a su margen.
function _ocSepara(A, B, basta){
  let mejor = -Infinity;
  for(let p=0;p<2;p++){
    const Q = p ? B : A, n = Q.length;
    for(let i=0;i<n;i++){
      const q = Q[(i+1)%n];
      let ax = q[1]-Q[i][1], ay = Q[i][0]-q[0];
      const l = Math.hypot(ax,ay); if(l < 1e-12) continue;
      ax/=l; ay/=l;
      let a0=Infinity,a1=-Infinity,b0=Infinity,b1=-Infinity;
      for(let j=0;j<A.length;j++){ const t=A[j][0]*ax+A[j][1]*ay; if(t<a0)a0=t; if(t>a1)a1=t; }
      for(let j=0;j<B.length;j++){ const t=B[j][0]*ax+B[j][1]*ay; if(t<b0)b0=t; if(t>b1)b1=t; }
      const g = (b0-a1 > a0-b1) ? b0-a1 : a0-b1;
      if(g > mejor){ mejor = g; if(basta !== undefined && mejor >= basta) return mejor; }
    }
  }
  return mejor;
}
// Cada elemento guarda su caja envolvente al ponerlo: la consulta descarta
// primero por solape de cajas y solo compara por ejes separadores lo que pasa
// ese filtro. Sin él, cada candidata de cada rótulo se comparaba con TODO.
// Separación entre una caja RECTA y un polígono convexo. La caja se proyecta
// con dos productos por eje —no hace falta recorrer sus esquinas— y solo se
// prueban las normales del polígono: los ejes x e y los ha descartado ya el
// filtro de cajas, que es exactamente esa proyección.
function _ocSeparaCaja(x0, y0, x1, y1, P, basta){
  let mejor = -Infinity;
  const n = P.length;
  for(let i=0;i<n;i++){
    const p = P[i], q = P[(i+1)%n];
    let ax = q[1]-p[1], ay = p[0]-q[0];
    const l = Math.hypot(ax, ay); if(l < 1e-12) continue;
    ax /= l; ay /= l;
    const u0 = ax*x0, u1 = ax*x1, v0 = ay*y0, v1 = ay*y1;
    const a0 = (u0 < u1 ? u0 : u1) + (v0 < v1 ? v0 : v1);
    const a1 = (u0 > u1 ? u0 : u1) + (v0 > v1 ? v0 : v1);
    let b0 = Infinity, b1 = -Infinity;
    for(let j=0;j<n;j++){ const t = P[j][0]*ax + P[j][1]*ay; if(t < b0) b0 = t; if(t > b1) b1 = t; }
    const g = (b0-a1 > a0-b1) ? b0-a1 : a0-b1;
    if(g > mejor){ mejor = g; if(basta !== undefined && mejor >= basta) return mejor; }
  }
  return mejor;
}
function _ocPoli(pol, tipo, cir){
  if(!pol || pol.length < 3) return;
  const bb = _ocBB(pol);
  // Dos atajos que evitan el cálculo por ejes separadores, que es lo caro:
  // `aa`, rectángulo recto —contra una caja recta el solape de cajas YA es la
  // respuesta exacta—, y `cir`, lo que en realidad es un círculo (nudos, arcos
  // de par, resaltes), donde basta la distancia de la caja al centro.
  const aa = pol.length === 4 && pol[0][1] === pol[1][1] && pol[1][0] === pol[2][0]
                              && pol[2][1] === pol[3][1] && pol[3][0] === pol[0][0];
  _ocupado.push({pol, bb, tipo:tipo||'dibujo', aa, cir});
  _ocCajas.push(bb[0], bb[1], bb[2], bb[3]);
}
function _polGirado(cx, cy, w, h, ang){
  if(!ang) return [[cx-w/2,cy-h/2],[cx+w/2,cy-h/2],[cx+w/2,cy+h/2],[cx-w/2,cy+h/2]];
  const co = Math.cos(ang), si = Math.sin(ang);
  return [[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]]
         .map(p => [cx + p[0]*co - p[1]*si, cy + p[0]*si + p[1]*co]);
}
function _ocCaja(cx, cy, w, h, tipo){ _ocPoli(_polGirado(cx, cy, w, h, 0), tipo); }
function _ocSeg(x1, y1, x2, y2, semi, tipo){
  const L = Math.hypot(x2-x1, y2-y1);
  if(L < 1e-9){ _ocCaja(x1, y1, 2*semi, 2*semi, tipo); return; }
  const nx = -(y2-y1)/L*semi, ny = (x2-x1)/L*semi;
  _ocPoli([[x1+nx,y1+ny],[x2+nx,y2+ny],[x2-nx,y2-ny],[x1-nx,y1-ny]], tipo);
}
// Octógono circunscrito: nudos, arcos de par y resaltes redondos.
function _ocDisco(cx, cy, r, tipo){
  const k = r/Math.cos(Math.PI/8), p = [];
  for(let i=0;i<8;i++){ const a = Math.PI/8 + i*Math.PI/4; p.push([cx+k*Math.cos(a), cy+k*Math.sin(a)]); }
  _ocPoli(p, tipo, [cx, cy, r]);
}
// Flecha: el fuste con su grosor y la punta, algo más ancha.
function _ocFlecha(x1, y1, x2, y2, semi, tipo){
  _ocSeg(x1, y1, x2, y2, semi, tipo);
  _ocDisco(x2, y2, semi + 3, tipo);
}
// Envolvente convexa (cadena monótona): la banda de una repartida trapecial con
// los dos valores de signo contrario no es un cuadrilátero convexo.
function _ocEnvolvente(ps){
  const p = ps.slice().sort((a,b)=>a[0]-b[0] || a[1]-b[1]);
  if(p.length < 3) return p;
  const cruz = (o,a,b)=>(a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0]);
  const inf = [], sup = [];
  p.forEach(q=>{ while(inf.length>=2 && cruz(inf[inf.length-2],inf[inf.length-1],q)<=0) inf.pop(); inf.push(q); });
  for(let i=p.length-1;i>=0;i--){ const q=p[i];
    while(sup.length>=2 && cruz(sup[sup.length-2],sup[sup.length-1],q)<=0) sup.pop(); sup.push(q); }
  inf.pop(); sup.pop();
  return inf.concat(sup);
}
// Caja dada en coordenadas LOCALES de un símbolo girado (los apoyos).
function _ocCajaLocal(px, py, ang, u0, v0, u1, v1, tipo){
  const co = Math.cos(ang), si = Math.sin(ang);
  _ocPoli([[u0,v0],[u1,v0],[u1,v1],[u0,v1]]
          .map(p => [px + p[0]*co - p[1]*si, py + p[0]*si + p[1]*co]), tipo);
}
// El arco del ángulo de una reacción inclinada. `bsaArcoReaccion` (core/comun.js)
// lo pinta entero —trazo, arco y grados— en posición FIJA y sin halo, y ese
// número no pasaba por el colocador: la cadena de cotas de un pórtico girado lo
// tachaba entre los dos ceros (2026-09-15). Aquí se repite su geometría —trazo
// de referencia de 26 px y arco de radio 17— para dibujarla, apuntarla en el
// registro y ENCOLAR los grados como un rótulo más, con el mismo anclaje que usa
// `core` (`alinear`: el ancla es el borde de la caja, no su centro). El dibujo
// sale idéntico y solo el número se aparta si algo lo tapa. Antes esta función
// se limitaba a repetir la geometría para el registro, así que había DOS copias
// de ella; ahora hay una. Armaduras y presión siguen con la de `core`: si cambia
// allí, cambia aquí (CLAUDE.md §5.4).
function _arcoReaccionFI(x0, y0, ex, ey, col){
  const ag = bsaAnguloAgudoEje(ex, ey);
  if(ag.grados < 4) return false;
  const rx = ag.desdeV ? 0 : (ex >= 0 ? 1 : -1), ry = ag.desdeV ? (ey >= 0 ? 1 : -1) : 0;
  const a0 = Math.atan2(-ry, rx), a1 = Math.atan2(-ey, ex);
  let d = a1 - a0; while(d > Math.PI) d -= 2*Math.PI; while(d < -Math.PI) d += 2*Math.PI;
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.setLineDash([3,3]);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + 26*rx, y0 - 26*ry); ctx.stroke();
  ctx.setLineDash([]); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(x0, y0, 17, a0, a1, d < 0); ctx.stroke();
  ctx.restore();
  _ocSeg(x0, y0, x0 + 26*rx, y0 - 26*ry, 1.5, 'arco');
  _ocDisco(x0, y0, 18.5, 'arco');
  const sx = Math.cos(a1), sy = Math.sin(a1), tx = rx, ty = -ry;
  let qx = -ty, qy = tx; if(qx*sx + qy*sy > 0){ qx = -qx; qy = -qy; }
  rotulo(dec(ag.grados,'f') + '°', x0 + 26*tx + 14*qx, y0 + 26*ty + 14*qy, col,
         qx, qy, '700 10px Inter,sans-serif',
         {prio:4, padX:4, alinear:(sx < 0) ? 'izq' : 'der'});
  return true;
}
// Lo que la interfaz superpone al lienzo. Se mide del propio DOM en vez de
// fijar 104 y 118 px a mano: este tema tiene CINCO botones de lienzo (175 px),
// la columna mide 96 px u 88 en móvil y puede estar plegada.
const ZONAS_INTERFAZ = ['.left-panel', '.panel-flyout', '.panel-toggle',
                        '.zoom-box', '.canvas-controls', '.canvas-hint'];
// Los elementos se buscan UNA vez (el HTML del tema no cambia): repetir seis
// querySelectorAll en cada repintado costaba más que medirlos.
let _zonasEl = null;
function _zonasInterfaz(){
  // SOLO el lienzo de pantalla tiene columna y botones encima. El informe
  // rápido (18-) dibuja en un lienzo temporal de 820x580 con estas mismas
  // funciones: allí esas zonas no corresponden a nada y vedaban una franja de
  // hasta 101 px de la figura impresa, donde no hay ninguna columna.
  if(!cv || ctx.canvas !== cv) return;
  const a = document.getElementById('canvasArea');
  if(!a) return;
  if(!_zonasEl){
    _zonasEl = [];
    ZONAS_INTERFAZ.forEach(sel=>{ document.querySelectorAll(sel).forEach(el=>_zonasEl.push(el)); });
  }
  const r = a.getBoundingClientRect();
  for(let i=0;i<_zonasEl.length;i++){
    // El desplegable CERRADO sigue midiendo 260x792 con `opacity:0` y entraba
    // en el registro: 57 px de lienzo vedados por algo que no se ve.
    if(!_visible(_zonasEl[i])) continue;
    const q = _zonasEl[i].getBoundingClientRect();
    if(q.width < 1 || q.height < 1) continue;
    const x0 = q.left-r.left-5, y0 = q.top-r.top-5, x1 = q.right-r.left+5, y1 = q.bottom-r.top+5;
    if(x1 <= 0 || y1 <= 0 || x0 >= W || y0 >= H) continue;
    _ocPoli([[x0,y0],[x1,y0],[x1,y1],[x0,y1]], 'zona');
    _zonasBB.push([x0,y0,x1,y1]);
  }
}
// ¿Se ve de verdad? `checkVisibility` lo resuelve de una llamada; donde no
// exista, el repliegue mira opacidad y visibilidad, que es lo que distingue al
// desplegable cerrado.
function _visible(el){
  if(el.checkVisibility)
    return el.checkVisibility({opacityProperty:true, visibilityProperty:true,
                               contentVisibilityAuto:true});
  const s = getComputedStyle(el);
  return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
}
// ¿La caja pisa alguna zona de la interfaz? Lo pregunta el camino del mal
// menor, que hasta ahora podía elegir una posición 100 % tapada por la columna.
function _tocaZona(bb){
  for(let i=0;i<_zonasBB.length;i++){
    const b = _zonasBB[i];
    if(bb[2] > b[0] && b[2] > bb[0] && bb[3] > b[1] && b[3] > bb[1]) return true;
  }
  return false;
}
// ¿Cabe una caja recta ahí sin salirse del lienzo ni meterse bajo la interfaz?
function _libreDeZonas(cx, cy, w, h){
  const x0 = cx-w/2, y0 = cy-h/2, x1 = cx+w/2, y1 = cy+h/2;
  if(W > 30 && H > 30 && (x0 < 1 || y0 < 1 || x1 > W-1 || y1 > H-1)) return false;
  for(let i=0;i<_zonasBB.length;i++){
    const b = _zonasBB[i];
    if(x1 > b[0] && b[2] > x0 && y1 > b[1] && b[3] > y0) return false;
  }
  return true;
}
// Ancla fuera de las zonas de la interfaz: se empuja por el lado más corto de
// la zona que la atrapa, descartando las salidas que dejarían la caja fuera del
// lienzo. Sin esto, `huecoRotulo` buscaba desde un punto inalcanzable —el ancla
// de un tramo que cae a x = −9 solo llega a x = 98 con kMax anillos— y el
// rótulo acababa en el mal menor, bajo la columna y a veces invisible del todo.
function _anclaUtil(cx, cy, w, h){
  if(!(W > 30 && H > 30)) return [cx, cy];
  const hw = w/2 + 2, hh = h/2 + 2;
  const cabe = (x, y) => x-hw >= 0 && y-hh >= 0 && x+hw <= W && y+hh <= H;
  for(let paso=0; paso<4; paso++){
    let z = null;
    for(let i=0;i<_zonasBB.length;i++){
      const b = _zonasBB[i];
      if(cx+hw > b[0] && b[2] > cx-hw && cy+hh > b[1] && b[3] > cy-hh){ z = b; break; }
    }
    if(!z) break;
    let mejor = null;
    [[z[2]+hw, cy], [z[0]-hw, cy], [cx, z[3]+hh], [cx, z[1]-hh]].forEach(q=>{
      if(!cabe(q[0], q[1])) return;
      const d = Math.abs(q[0]-cx) + Math.abs(q[1]-cy);
      if(!mejor || d < mejor.d) mejor = {d, x:q[0], y:q[1]};
    });
    if(!mejor) break;
    cx = mejor.x; cy = mejor.y;
  }
  return [Math.max(hw, Math.min(W-hw, cx)), Math.max(hh, Math.min(H-hh, cy))];
}
// Ancla deslizada POR EL EJE del propio elemento (`opts.eje`, el segmento en
// píxeles). Si el punto natural cae fuera del lienzo o bajo la columna, el
// nombre de un tramo no debe saltar de lado: debe correrse a lo largo de su
// tramo hasta el trozo que se ve, conservando su desvío lateral. Se muestrea el
// eje y gana el punto libre más cercano al natural.
function _anclaEnEje(eje, cx, cy, w, h){
  const ox = cx - (eje[0]+eje[2])/2, oy = cy - (eje[1]+eje[3])/2;
  const N = 40;
  let mejor = null;
  for(let i=0;i<=N;i++){
    const t = i/N;
    const x = eje[0] + (eje[2]-eje[0])*t + ox, y = eje[1] + (eje[3]-eje[1])*t + oy;
    if(!_libreDeZonas(x, y, w, h)) continue;
    // Gana el punto libre más cercano al ancla original: el nombre de un tramo
    // se queda lo más cerca posible del centro y la etiqueta de una cota, de su
    // sitio en la línea.
    const d = Math.hypot(x-cx, y-cy);
    if(!mejor || d < mejor.d) mejor = {d, x, y};
  }
  return mejor ? [mejor.x, mejor.y] : null;
}

// ── Colocación ──
// Consulta al registro. El descarte por cajas va sobre el array plano y solo
// se afina con lo que lo pasa, así que recorrerlo entero sale más barato que
// preparar un subconjunto por rótulo (se probó: con un centenar de elementos,
// copiar el entorno costaba más de lo que ahorraba).
function _ocChoca(pol, margen, filtro){
  const bb = _ocBB(pol);
  const x0 = bb[0]-margen, y0 = bb[1]-margen, x1 = bb[2]+margen, y1 = bb[3]+margen;
  const B = _ocCajas, n = _ocupado.length;
  for(let i=0, k=0; i<n; i++, k+=4){
    if(x0 > B[k+2] || B[k] > x1 || y0 > B[k+3] || B[k+1] > y1) continue;
    const it = _ocupado[i];
    if(filtro && !filtro(it)) continue;
    if(_ocSepara(pol, it.pol, margen) < margen) return true;
  }
  return false;
}
// Igual, para una caja RECTA (la mayoría de los rótulos): el polígono solo se
// arma si algún elemento pasa el filtro de cajas y además no es recto.
function _ocChocaCaja(cx, cy, w, h, margen, filtro){
  const bx0 = cx-w/2, by0 = cy-h/2, bx1 = cx+w/2, by1 = cy+h/2;
  const x0 = bx0-margen, y0 = by0-margen, x1 = bx1+margen, y1 = by1+margen;
  const B = _ocCajas, n = _ocupado.length;
  for(let i=0, k=0; i<n; i++, k+=4){
    if(x0 > B[k+2] || B[k] > x1 || y0 > B[k+3] || B[k+1] > y1) continue;
    const it = _ocupado[i];
    if(filtro && !filtro(it)) continue;
    if(it.aa) return true;
    if(it.cir){
      const ex = it.cir[0] < bx0 ? bx0 - it.cir[0] : (it.cir[0] > bx1 ? it.cir[0] - bx1 : 0);
      const ey = it.cir[1] < by0 ? by0 - it.cir[1] : (it.cir[1] > by1 ? it.cir[1] - by1 : 0);
      if(ex*ex + ey*ey < (it.cir[2]+margen)*(it.cir[2]+margen)) return true;
      continue;
    }
    if(_ocSeparaCaja(bx0, by0, bx1, by1, it.pol, margen) < margen) return true;
  }
  return false;
}
// Sonda: pregunta al registro si una caja {x0,y0,x1,y1} chocaría con algo. No
// la usa el dibujo —el colocador va por `_ocChocaCaja`—, pero es la forma de
// comprobar el registro desde la consola.
function chocaRotulo(caja, margen, filtro){
  return _ocChoca([[caja.x0,caja.y0],[caja.x1,caja.y0],[caja.x1,caja.y1],[caja.x0,caja.y1]],
                  (margen === undefined) ? 1.6 : margen, filtro);
}
// Cuánto se mete una caja en lo ya dibujado. Solo se calcula cuando NO hay
// ningún hueco: entonces se elige el mal menor en vez de dejar el rótulo en su
// sitio natural. Pisar otro texto pesa más que pisar un trazo, y una zona de la
// interfaz más que nada. Se mide por SOLAPE DE CAJAS, no por ejes separadores:
// aquí se comparan ~100 elementos con ~100 posiciones y el cálculo exacto se
// notaba en el repintado; para ordenar «malos» basta con el área.
const PESO_OCUPADO = {texto:3, textoArco:3, zona:6};
function _ocPenalizacion(bb, margen, filtro){
  const B = _ocCajas, n = _ocupado.length;
  let p = 0;
  for(let i=0, k=0; i<n; i++, k+=4){
    const ax = (bb[2] < B[k+2] ? bb[2] : B[k+2]) - (bb[0] > B[k] ? bb[0] : B[k]) + 2*margen;
    if(ax <= 0) continue;
    const ay = (bb[3] < B[k+3] ? bb[3] : B[k+3]) - (bb[1] > B[k+1] ? bb[1] : B[k+1]) + 2*margen;
    if(ay <= 0) continue;
    const it = _ocupado[i];
    if(filtro && !filtro(it)) continue;
    p += (ax < 60 ? ax : 60)*(ay < 30 ? ay : 30)*(PESO_OCUPADO[it.tipo] || 1);
  }
  return p;
}
function _ocDentro(pol){
  if(W < 30 || H < 30) return true;
  const bb = _ocBB(pol);
  return bb[0] >= 1 && bb[1] >= 1 && bb[2] <= W-1 && bb[3] <= H-1;
}
function _ocDentroCaja(cx, cy, w, h){
  if(W < 30 || H < 30) return true;
  return cx-w/2 >= 1 && cy-h/2 >= 1 && cx+w/2 <= W-1 && cy+h/2 <= H-1;
}
// Desplazamiento (dx,dy) libre más cercano a (x,y), y APUNTA la caja en el
// registro; null si no hay ninguno. Se prueban anillos cada vez más lejos y,
// dentro de cada anillo, las direcciones por cercanía a la pedida: así el
// rótulo sale junto a su elemento y, mientras pueda, por el lado indicado.
// El orden de prueba —anillo k y desvío j de 30° a un lado o al otro— no
// depende del rótulo: el coste es salto*(k + j*ROT_PEN), así que la ordenación
// por k y j vale para todos. Se calcula UNA vez; armarlo y ordenarlo en cada
// rótulo (109 objetos y un sort por texto) era el grueso del repintado.
const ROT_DIRS = 12, ROT_PEN = 0.30, ROT_KMAX = 9;
// A partir de aquí un rótulo lleva línea de referencia hasta su elemento aunque
// no la haya pedido: a esa distancia deja de verse a quién pertenece.
const GUIA_AUTO_PX = 34;
const ROT_ORDEN = (function(){
  const l = [{k:0, j:0, s:1, c:0}];
  for(let k=1;k<=ROT_KMAX;k++)
    for(let j=0;j<=ROT_DIRS/2;j++)
      ((j === 0 || j === ROT_DIRS/2) ? [1] : [-1,1]).forEach(s=>l.push({k, j, s, c:k + j*ROT_PEN}));
  return l.sort((a,b)=>a.c-b.c);
})();
const ROT_COS = [], ROT_SEN = [];
for(let j=0;j<=ROT_DIRS/2;j++){
  ROT_COS.push(Math.cos(j*2*Math.PI/ROT_DIRS));
  ROT_SEN.push(Math.sin(j*2*Math.PI/ROT_DIRS));
}
function huecoRotulo(x, y, w, h, dirX, dirY, paso, opts){
  const o = opts || {};
  const marg = (o.margen === undefined) ? 1.6 : o.margen;
  // Paso corto y muchos anillos: la búsqueda es fina, así que el rótulo se
  // mete en el primer hueco que haya y no salta de golpe media pantalla.
  const salto = paso || o.paso || Math.max(10, h*0.85);
  const kMax = (o.kMax === undefined) ? ROT_KMAX : o.kMax;
  // `jMax` limita cuánto puede girar la dirección pedida (j pasos de 30°): con
  // 3, el rótulo solo sale hacia donde se le dijo o a lo largo de su propia
  // línea, y no puede cruzar al otro lado de una cadena de cotas vecina.
  const jMax = (o.jMax === undefined) ? ROT_DIRS/2 : o.jMax;
  const gir = o.ang || 0;
  let ca = dirX || 0, sa = dirY || 0;
  const L0 = Math.hypot(ca, sa);
  if(L0 < 1e-9){ ca = 0; sa = -1; } else { ca /= L0; sa /= L0; }
  // Desplazamiento de la candidata i, girando la dirección pedida j pasos.
  const dxDe = i => { const c = ROT_ORDEN[i], cj = ROT_COS[c.j], sj = c.s*ROT_SEN[c.j];
                      return (ca*cj - sa*sj)*c.k*salto; };
  const dyDe = i => { const c = ROT_ORDEN[i], cj = ROT_COS[c.j], sj = c.s*ROT_SEN[c.j];
                      return (sa*cj + ca*sj)*c.k*salto; };
  const recto = !gir;
  for(let i=0;i<ROT_ORDEN.length;i++){
    if(ROT_ORDEN[i].k > kMax || ROT_ORDEN[i].j > jMax) continue;
    const dx = dxDe(i), dy = dyDe(i), cx = x+dx, cy = y+dy;
    if(recto){
      if(!_ocDentroCaja(cx, cy, w, h) || _ocChocaCaja(cx, cy, w, h, marg, o.filtro)) continue;
    } else {
      const pg = _polGirado(cx, cy, w, h, gir);
      if(!_ocDentro(pg) || _ocChoca(pg, marg, o.filtro)) continue;
      if(!o.noApuntar) _ocPoli(pg, 'texto');
      return {dx, dy, pol:pg};
    }
    const pol = _polGirado(cx, cy, w, h, 0);
    if(!o.noApuntar) _ocPoli(pol, 'texto');
    return {dx, dy, pol};
  }
  // Sin hueco (lienzo estrecho, modelo diminuto): el mal menor. Se recorre otra
  // vez y se toma la posición que MENOS se mete en lo dibujado; el halo blanco
  // opaco la deja legible igual. Mejor tapado que perdido, pero solo aquí.
  let mejor = null;
  // Dos rondas: en la primera el mal menor NO puede caer bajo la columna ni
  // bajo los botones del lienzo (§7 «Nada dibujado bajo la columna»). Solo si
  // ahí no cabe ninguna posición entera dentro del lienzo se admite una tapada.
  // `jMax` NO rige aquí: es una preferencia —quédate sobre tu línea— y a estas
  // alturas ya se sabe que ahí no cabía. Atarla también al mal menor dejaba a
  // las etiquetas de cota encima de otro rótulo en un lienzo de 375 px, que es
  // peor que apartarse de su línea.
  for(let ronda=0; ronda<2 && !mejor; ronda++){
    for(let i=0;i<ROT_ORDEN.length;i++){
      if(ROT_ORDEN[i].k > kMax) continue;
      const dx = dxDe(i), dy = dyDe(i), cx = x+dx, cy = y+dy;
      const pol = _polGirado(cx, cy, w, h, gir);
      if(!_ocDentro(pol)) continue;
      const bb = _ocBB(pol);
      if(ronda === 0 && _tocaZona(bb)) continue;
      const pen = _ocPenalizacion(bb, marg, o.filtro);
      const p = pen + ROT_ORDEN[i].c*salto*2;
      if(!mejor || p < mejor.p) mejor = {p, pen, dx, dy, pol};
    }
  }
  // `apretado` -> halo OPACO, y es lo que cuenta como rótulo forzado. Solo si
  // de verdad se mete en algo: una posición limpia que no llegaba al margen de
  // holgura se pinta como cualquier otra.
  if(mejor){ if(!o.noApuntar) _ocPoli(mejor.pol, 'texto');
             return {dx:mejor.dx, dy:mejor.dy, pol:mejor.pol, apretado:mejor.pen > 0}; }
  return null;
}
// Un rótulo no se pinta donde se pide: se ENCOLA y se coloca al final del
// repintado, cuando ya está registrada toda la geometría.
function rotulo(txt, x, y, color, dirX, dirY, fuente, opts){
  const o = opts || {};
  _pendientes.push({txt:String(txt), x, y, color, dirX:dirX||0,
                    dirY:(dirY === undefined || dirY === null) ? -1 : dirY,
                    fuente:fuente || '700 10px Inter,sans-serif',
                    prio:(o.prio === undefined) ? 5 : o.prio, o});
}
// Segunda pasada. El orden lo marca `prio`: los nombres de nudo (1) y de tramo
// (2) antes que los valores de las cargas (3) y las reacciones (4), y estos
// antes que las cotas (6), la leyenda (8) y las letras de los ejes (9).
function pintarRotulos(){
  const lista = _pendientes;
  _pendientes = [];
  lista.sort((a,b)=>a.prio-b.prio);
  for(let i=0;i<lista.length;i++){
    if(lista[i].bloque) _colocarBloque(lista[i]); else _colocarRotulo(lista[i]);
  }
  _pintarGuias();
  ctx.textAlign='start'; ctx.textBaseline='alphabetic';
}
// `measureText` es caro y en un arrastre se repite en cada repintado con los
// mismos textos: el ancho se recuerda por (fuente, texto). La caché se vacía
// cuando termina de cargar la tipografía (Inter llega de Google y hasta
// entonces se mide la de respaldo) y al reajustar el lienzo.
const _anchos = new Map();
function _anchoTexto(txt, fuente){
  const k = fuente + '\u0000' + txt;
  let w = _anchos.get(k);
  if(w === undefined){
    const f0 = ctx.font;
    ctx.font = fuente;
    w = ctx.measureText(txt).width;
    ctx.font = f0;
    // Mientras la tipografía no ha terminado de cargar se mide la de respaldo:
    // ese ancho NO se guarda, o la caja quedaría de un tamaño y el texto de
    // otro en cuanto entrase Inter a mitad de repintado.
    if(document.fonts && document.fonts.status !== 'loaded') return w;
    if(_anchos.size > 500) _anchos.clear();
    _anchos.set(k, w);
  }
  return w;
}
function olvidarAnchos(){ _anchos.clear(); }
function _colocarRotulo(p){
  const o = p.o;
  const w = _anchoTexto(p.txt, p.fuente) + ((o.padX === undefined) ? 6 : o.padX);
  const h = o.alto || 13;
  // Con el zoom muy cerca, el elemento de un rótulo se va fuera del lienzo:
  // ni se dibuja ni ocupa sitio, y así no estorba a los que sí se ven.
  if(W > 30 && H > 30 && (p.x < -w || p.y < -h || p.x > W + w || p.y > H + h)) return;
  // `alinear`: el ancla es el BORDE de la caja y no su centro. Lo usa el valor
  // en grados del arco de una reacción, que `core` escribe con textAlign.
  let ax = p.x, ay = p.y;
  if(o.alinear === 'izq') ax += w/2; else if(o.alinear === 'der') ax -= w/2;
  // El ancla se lleva a la parte VISIBLE del elemento ANTES de buscar hueco:
  // por su propio eje si el rótulo lo trae (el nombre de un tramo se corre a lo
  // largo del tramo) y, si no, empujándola fuera de la zona. Desde un ancla
  // inalcanzable —a x = −9, con anillos que llegan a x = 98— la búsqueda no
  // alcanzaba la parte visible y el rótulo acababa tapado por la columna.
  if(!_libreDeZonas(ax, ay, w, h)){
    const q = (o.eje && _anclaEnEje(o.eje, ax, ay, w, h)) || _anclaUtil(ax, ay, w, h);
    ax = q[0]; ay = q[1];
  }
  let hh = huecoRotulo(ax, ay, w, h, p.dirX, p.dirY, o.paso, o), forzado = false;
  if(!hh){
    hh = {dx:0, dy:0, pol:_polGirado(ax, ay, w, h, o.ang||0)};
    _ocPoli(hh.pol, 'texto'); forzado = true;
  } else if(hh.apretado) forzado = true;   // colocado en el mal menor: halo opaco
  const cx = ax + hh.dx, cy = ay + hh.dy, bb = _ocBB(hh.pol);
  // Línea de referencia: la que pida el rótulo (las cotas) o, si ha acabado
  // lejos de su elemento, una AUTOMÁTICA. Sin ella un rótulo alejado deja de
  // ser atribuible: en un lienzo estrecho llegó a leerse «C» a la izquierda de
  // «B» teniendo el nudo C a la derecha del B. La distancia se mide desde el
  // sitio natural (p.x, p.y), que es el que está sobre el elemento.
  const lejos = Math.hypot(cx - p.x, cy - p.y);
  let conGuia = !!o.guia;
  if(o.guia) _guiaRotulo(o.guia.x, o.guia.y, cx, cy, bb, o.guia.color);
  else if(lejos > GUIA_AUTO_PX){
    _guiaRotulo(p.x, p.y, cx, cy, bb, 'rgba(27,31,36,.34)', true); conGuia = true;
  }
  // Sin save/restore ni transformación cuando el texto va recto: con 40 rótulos
  // por repintado, esas dos cosas eran la mitad del coste de pintarlos.
  ctx.font = p.fuente;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const halo = forzado ? 'rgba(255,255,255,.97)' : 'rgba(255,255,255,.88)';
  if(o.ang){
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(o.ang);
    ctx.fillStyle = halo; ctx.fillRect(-w/2, -h/2, w, h);
    ctx.fillStyle = p.color; ctx.fillText(p.txt, 0, 0);
    ctx.restore();
  } else {
    ctx.fillStyle = halo; ctx.fillRect(cx-w/2, cy-h/2, w, h);
    ctx.fillStyle = p.color; ctx.fillText(p.txt, cx, cy);
  }
  _rotulos.push({x0:bb[0], y0:bb[1], x1:bb[2], y1:bb[3], pol:hh.pol, txt:p.txt, prio:p.prio,
                 dist:lejos, forzado, guia:conGuia});
}
function _colocarBloque(p){
  let ax = p.x, ay = p.y;
  if(!_libreDeZonas(ax, ay, p.w, p.h)){ const q = _anclaUtil(ax, ay, p.w, p.h); ax = q[0]; ay = q[1]; }
  // La leyenda no pertenece a ningún elemento: al contrario que un rótulo, si
  // cerca no cabe puede irse al rincón libre que haya, por lejos que quede.
  // Se prueba primero con el paso fino, para no moverla sin necesidad, y solo
  // si no hay hueco se repite con un paso tres veces mayor. Las pruebas van
  // con `noApuntar`, o cada intento dejaría una caja suelta en el registro.
  const o1 = Object.assign({}, p.o, {noApuntar:true});
  let hh = huecoRotulo(ax, ay, p.w, p.h, p.dirX, p.dirY, p.o.paso, o1), forzado = false;
  if(!hh || hh.apretado){
    const h2 = huecoRotulo(ax, ay, p.w, p.h, p.dirX, p.dirY, (p.o.paso||20)*3, o1);
    if(h2 && !h2.apretado) hh = h2;
  }
  if(!hh){ hh = {dx:0, dy:0, pol:_polGirado(ax, ay, p.w, p.h, 0)}; forzado = true; }
  else if(hh.apretado) forzado = true;
  _ocPoli(hh.pol, 'texto');
  const bb = _ocBB(hh.pol);
  p.bloque(bb[0], bb[1]);
  _rotulos.push({x0:bb[0], y0:bb[1], x1:bb[2], y1:bb[3], pol:hh.pol, txt:p.nombre||'(bloque)', prio:p.prio,
                 dist:Math.hypot(ax + hh.dx - p.x, ay + hh.dy - p.y), forzado, guia:false});
}
// Línea de referencia de un rótulo a su elemento (cotas): se para en el borde
// de la caja, para no meter trazo debajo del texto.
// Línea de referencia de un rótulo a su elemento (cotas). Se difiere como las
// demás: se traza al final, cortada por los textos.
function _guiaRotulo(gx, gy, cx, cy, bb, col, punteada){
  const dx = cx-gx, dy = cy-gy;
  if(Math.hypot(dx, dy) < 1e-6) return;
  _guias.push({x1:gx, y1:gy, x2:cx, y2:cy, col:col || 'rgba(27,31,36,.40)', solida:!punteada});
}
// Trozos de un segmento que NO caen dentro de ninguna de las cajas (recorte de
// Liang-Barsky contra cada una, y el complemento de lo bloqueado).
function _trozosLibres(x1, y1, x2, y2, cajas, m){
  const dx = x2-x1, dy = y2-y1, bloq = [];
  for(let k=0;k<cajas.length;k++){
    const bb = cajas[k];
    let t0 = 0, t1 = 1, ok = true;
    const p = [-dx, dx, -dy, dy];
    const q = [x1-(bb[0]-m), (bb[2]+m)-x1, y1-(bb[1]-m), (bb[3]+m)-y1];
    for(let i=0;i<4 && ok;i++){
      if(Math.abs(p[i]) < 1e-12){ if(q[i] < 0) ok = false; }
      else {
        const r = q[i]/p[i];
        if(p[i] < 0){ if(r > t1) ok = false; else if(r > t0) t0 = r; }
        else        { if(r < t0) ok = false; else if(r < t1) t1 = r; }
      }
    }
    if(ok && t1 > t0) bloq.push([t0, t1]);
  }
  bloq.sort((a,b)=>a[0]-b[0]);
  const libres = []; let t = 0;
  bloq.forEach(b=>{ if(b[0] > t) libres.push([t, Math.min(b[0], 1)]); if(b[1] > t) t = b[1]; });
  if(t < 1) libres.push([t, 1]);
  return libres.filter(s=>s[1]-s[0] > 0.02)
               .map(s=>[x1+dx*s[0], y1+dy*s[0], x1+dx*s[1], y1+dy*s[1]]);
}
// Inter llega de Google: hasta que carga se mide la tipografía de respaldo, así
// que la caché de anchos se vacía cuando termina. NO se repinta desde aquí: el
// callback puede caer entre dos <script> y `dibujar()` usa cosas de piezas
// posteriores (CLAUDE.md §5.3); el siguiente repintado ya mide bien.
if(document.fonts && document.fonts.ready) document.fonts.ready.then(olvidarAnchos);
function _pintarGuias(){
  if(!_guias.length) return;
  const cajas = _ocupado.filter(it => it.tipo === 'texto' || it.tipo === 'textoArco').map(it => it.bb);
  ctx.save();
  _guias.forEach(g=>{
    ctx.lineWidth = g.ancho || .9;
    ctx.strokeStyle = g.col || 'rgba(27,31,36,.28)';
    ctx.setLineDash(g.solida ? [] : [3,3]);
    _trozosLibres(g.x1, g.y1, g.x2, g.y2, cajas, 2).forEach(s=>{
      ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.stroke();
    });
  });
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
      _ocPoli(_ocEnvolvente([[ax,ay],[ax,ay-40],[bx,by-40],[bx,by]]), 'seleccion');
    } else {
      ctx.beginPath(); ctx.arc(px, py-24, 26, 0, Math.PI*2); ctx.fill();
      _ocDisco(px, py-24, 26, 'seleccion');
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
    _ocFlecha(qx, qy, px - vx*2, py - vy*2, 3.4, 'carga');
    if(paralela)
      rotulo(dec(Math.abs(c.mag),'f')+' '+unitFor, (qx+ex)/2 + nX*11, (qy+ey)/2 + nY*11, '#d94f5c', nX, nY, null, {prio:3});
    else
      rotulo(dec(Math.abs(c.mag),'f')+' '+unitFor, qx - vx*10, qy - vy*10, '#d94f5c', -vx, -vy, null, {prio:3});
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
    _ocDisco(px, py, R0 + 5, 'carga');
    // El valor se ancla al BORDE de su arco y por el lado libre de la pieza: con
    // «arriba y a la derecha» fijo, en un nudo cargado acababa lejos de su arco.
    const tM = (c.destino === 'nudo') ? tramos.find(z=>z.a === c.nudo || z.b === c.nudo)
                                      : tramos.find(z=>z.id === c.tramo);
    const lm = (tM && g) ? ladoLibreTramo(tM.id, g) : {x:0.6, y:-0.8};
    rotulo(dec(Math.abs(c.mag),'mom')+' '+uMom(), px + lm.x*(R0+13), py + lm.y*(R0+13),
           '#8b5cf6', lm.x, lm.y, null, {prio:3});
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
    // Sin relleno: solo el contorno y las flechas. El bloque relleno, por
    // tenue que fuera, tapaba lo que caía debajo.
    ctx.strokeStyle='#e0a83c'; ctx.lineWidth=1.8;
    ctx.beginPath();
    ctx.moveTo(ax,ay); ctx.lineTo(ax+ex*h1, ay+ey*h1);
    ctx.lineTo(bx+ex*h2, by+ey*h2); ctx.lineTo(bx,by);
    ctx.closePath(); ctx.stroke();
    for(let i=0;i<=6;i++){
      const tt=i/6, X=ax+(bx-ax)*tt, Y=ay+(by-ay)*tt, hh=h1+(h2-h1)*tt;
      ctx.beginPath(); ctx.moveTo(X+ex*hh, Y+ey*hh); ctx.lineTo(X+ex*4, Y+ey*4); ctx.stroke();
    }
    // La banda entera (contorno y rayas) ocupa sitio: era donde caía «CD».
    _ocPoli(_ocEnvolvente([[ax,ay],[ax+ex*h1,ay+ey*h1],[bx+ex*h2,by+ey*h2],[bx,by]]), 'carga');
    // En una trapecial los dos extremos valen distinto: se rotulan ambos.
    if(Math.abs(w1-w2) > 1e-9){
      rotulo(dec(Math.abs(w1),'f'), ax+ex*(h1+9), ay+ey*(h1+9), '#b07d1a', ex, ey, null, {prio:3});
      rotulo(dec(Math.abs(w2),'f')+' '+uDist(), bx+ex*(h2+9), by+ey*(h2+9), '#b07d1a', ex, ey, null, {prio:3});
    } else {
      rotulo(dec(Math.abs(w1),'f')+' '+uDist(),
             (ax+bx)/2 + ex*(alt+9), (ay+by)/2 + ey*(alt+9), '#b07d1a', ex, ey, null, {prio:3});
    }
  }
}
