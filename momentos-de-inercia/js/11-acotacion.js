// ═══════════════════════════════════════════════════════════
//  ACOTACIÓN  (mismo motor que el Cap. 9)
// ═══════════════════════════════════════════════════════════
// Criterio: una sola cadena por eje sobre los BORDES reales de las figuras,
// fusionando los que caen casi en el mismo sitio, podando los que dejarían un
// tramo ilegible y repartiendo las etiquetas en hasta cuatro niveles.
const COTA_FUSION_PX   = 12;   // bordes más juntos que esto se cuentan como uno
const COTA_MIN_SEG_PX  = 26;   // por debajo de esto el borde se descarta entero
const COTA_MAX_NIVELES = 4;    // escalones de etiquetas antes de renunciar
const COTA_HOLGURA_PX  = 14;   // aire entre etiquetas del mismo nivel; subirlo
                               // reparte antes en varios niveles

// Bordes reales de todas las figuras, ya girados. Antes esto llamaba a una
// función de bordes que NO existía: el try/catch se tragaba el ReferenceError
// y la cota terminaba midiendo los CENTROS de las figuras en lugar de sus
// bordes, que es justo lo que se veía mal.
// ── Envolvente real de una figura girada, en coordenadas de mundo ──────────
// La única fuente de verdad de la FORMA es el `draw` de FIG_DEFS, así que la
// envolvente se saca de ahí: se le pasa un REGISTRADOR DE TRAZO que implementa
// la parte de la API del lienzo que usan los draw (moveTo, lineTo, rect, arc,
// ellipse, quadraticCurveTo, bezierCurveTo y las transformaciones) y va
// quedándose con el mínimo y el máximo del trazo YA GIRADO.
//
// Antes se giraban las CUATRO ESQUINAS de la caja local y se tomaba su
// envolvente. Para un rectángulo eso es exacto, pero para cualquier figura
// curva o poligonal girada la caja sale de más: un disco de R = 12 partido en
// dos semicírculos girados 50° y −130° se acotaba 33.81 × 33.81 midiendo
// 24.00 × 24.00 (+40.9 %). La usan la selección por recuadro, la cadena de
// cotas del lienzo, el PDF y el informe, así que el error se veía en las dos
// vistas y además se imprimía.
//
// No se muestrea: de un arco y de una Bézier se toman los extremos y los
// PUNTOS CRÍTICOS EXACTOS en las direcciones giradas, que es donde la curva
// toca su caja. Así el resultado no depende de ninguna densidad de muestreo y
// cada figura cuesta unas pocas evaluaciones.

// El registrador trabaja en el marco YA GIRADO: cr y sr son el coseno y el
// seno del giro de la figura.
function _registradorTrazo(cr, sr){
  let izq = Infinity, der = -Infinity, aba = Infinity, arr = -Infinity, cuenta = 0;
  const pila = [];
  let m = [1,0,0,1,0,0];              // matriz afín del lienzo [a,b,c,d,e,f]
  let ux = 0, uy = 0;                 // último punto, en coordenadas del draw
  // Mapa completo (draw → mundo girado): [e0 e1 e2 ; f0 f1 f2]
  let e0 = cr, e1 = 0, e2 = 0, f0 = sr, f1 = cr, f2 = 0;
  const rehacerMapa = () => {
    e0 = cr*m[0] - sr*m[1];  e1 = cr*m[2] - sr*m[3];  e2 = cr*m[4] - sr*m[5];
    f0 = sr*m[0] + cr*m[1];  f1 = sr*m[2] + cr*m[3];  f2 = sr*m[4] + cr*m[5];
  };
  rehacerMapa();
  const meter = (x,y) => {
    const X = e0*x + e1*y + e2, Y = f0*x + f1*y + f2;
    if(X < izq) izq = X;   if(X > der) der = X;
    if(Y < aba) aba = Y;   if(Y > arr) arr = Y;
    cuenta++;
  };
  const ir = (x,y) => { ux = x; uy = y; meter(x,y); };
  const componer = (a,b,c,d,e,f) => {
    m = [m[0]*a + m[2]*b, m[1]*a + m[3]*b,
         m[0]*c + m[2]*d, m[1]*c + m[3]*d,
         m[0]*e + m[2]*f + m[4], m[1]*e + m[3]*f + m[5]];
    rehacerMapa();
  };
  // Puntos críticos de una Bézier cuadrática: cada coordenada es un polinomio
  // de grado 2, así que su derivada se anula en un único t, exacto.
  const critCuad = (p0,pq,p2) => {
    const den = p0 - 2*pq + p2;
    if(Math.abs(den) < 1e-15) return [];
    const t = (p0 - pq)/den;
    return (t > 0 && t < 1) ? [t] : [];
  };
  // Cúbica: la derivada es de grado 2 (hasta dos raíces en el intervalo).
  const critCub = (p0,c1,c2,p3) => {
    const a = 3*(-p0 + 3*c1 - 3*c2 + p3), b = 6*(p0 - 2*c1 + c2), c = 3*(c1 - p0);
    const ts = [];
    if(Math.abs(a) < 1e-15){ if(Math.abs(b) > 1e-15) ts.push(-c/b); }
    else {
      const disc = b*b - 4*a*c;
      if(disc >= 0){ const q = Math.sqrt(disc); ts.push((-b+q)/(2*a), (-b-q)/(2*a)); }
    }
    return ts.filter(t => t > 0 && t < 1);
  };
  const r = {
    beginPath(){}, closePath(){}, fill(){}, stroke(){}, clip(){},
    moveTo(x,y){ ir(x,y); },
    lineTo(x,y){ ir(x,y); },
    rect(x,y,w,h){ ir(x,y); ir(x+w,y); ir(x+w,y+h); ir(x,y+h); ir(x,y); },
    quadraticCurveTo(qx,qy,x,y){
      const x0 = ux, y0 = uy;
      const ev = t => { const u = 1-t;
        meter(u*u*x0 + 2*u*t*qx + t*t*x, u*u*y0 + 2*u*t*qy + t*t*y); };
      // Los críticos se buscan sobre las coordenadas YA GIRADAS: es ahí donde
      // la curva toca la caja que se está midiendo.
      const gx = p => e0*p[0] + e1*p[1], gy = p => f0*p[0] + f1*p[1];
      const P0 = [x0,y0], Q = [qx,qy], P2 = [x,y];
      critCuad(gx(P0),gx(Q),gx(P2)).concat(critCuad(gy(P0),gy(Q),gy(P2))).forEach(ev);
      ir(x,y);
    },
    bezierCurveTo(ax,ay,bx,by,x,y){
      const x0 = ux, y0 = uy;
      const ev = t => { const u = 1-t, u2 = u*u, t2 = t*t;
        meter(u2*u*x0 + 3*u2*t*ax + 3*u*t2*bx + t2*t*x,
              u2*u*y0 + 3*u2*t*ay + 3*u*t2*by + t2*t*y); };
      const gx = p => e0*p[0] + e1*p[1], gy = p => f0*p[0] + f1*p[1];
      const P0 = [x0,y0], C1 = [ax,ay], C2 = [bx,by], P3 = [x,y];
      critCub(gx(P0),gx(C1),gx(C2),gx(P3)).concat(critCub(gy(P0),gy(C1),gy(C2),gy(P3))).forEach(ev);
      ir(x,y);
    },
    // `inverso` es el `anticlockwise` del lienzo: barrido de ángulo DECRECIENTE
    // en las coordenadas locales (que aquí tienen la Y hacia arriba).
    ellipse(cx,cy,rx,ry,giro,a0,a1,inverso){
      const dosPi = 2*Math.PI, cg = Math.cos(giro||0), sg = Math.sin(giro||0);
      let d = a1 - a0;
      if(inverso){ if(d <= -dosPi) d = -dosPi; else { d = d % dosPi; if(d > 0) d -= dosPi; } }
      else       { if(d >=  dosPi) d =  dosPi; else { d = d % dosPi; if(d < 0) d += dosPi; } }
      const punto = t => {
        const u = rx*Math.cos(t), v = ry*Math.sin(t);
        return [cx + u*cg - v*sg, cy + u*sg + v*cg];
      };
      const dentro = t => {
        let q = (d >= 0 ? (t - a0) : (a0 - t)) % dosPi;
        if(q < 0) q += dosPi;
        return q <= Math.abs(d) + 1e-12;
      };
      // X(t) = K + (ax·rx)·cos t + (ay·ry)·sen t alcanza su extremo en
      // atan2(ay·ry, ax·rx) y media vuelta más allá: exacto, sin muestrear.
      const ejes = [[e0*cg + e1*sg, -e0*sg + e1*cg], [f0*cg + f1*sg, -f0*sg + f1*cg]];
      ejes.forEach(par => {
        const tb = Math.atan2(par[1]*ry, par[0]*rx);
        [tb, tb + Math.PI].forEach(t => { if(dentro(t)){ const p = punto(t); meter(p[0], p[1]); } });
      });
      const ini = punto(a0), fin = punto(a0 + d);
      meter(ini[0], ini[1]);
      ir(fin[0], fin[1]);
    },
    arc(cx,cy,rad,a0,a1,inverso){ r.ellipse(cx,cy,rad,rad,0,a0,a1,inverso); },
    save(){ pila.push(m.slice()); },
    restore(){ if(pila.length){ m = pila.pop(); rehacerMapa(); } },
    transform(a,b,c,d,e,f){ componer(a,b,c,d,e,f); },
    translate(x,y){ componer(1,0,0,1,x,y); },
    rotate(t){ componer(Math.cos(t), Math.sin(t), -Math.sin(t), Math.cos(t), 0, 0); },
    scale(sx,sy){ componer(sx,0,0,sy,0,0); },
    caja(){ return (cuenta >= 2 && isFinite(izq) && isFinite(arr))
              ? {left:izq, right:der, bottom:aba, top:arr} : null; }
  };
  return r;
}

// Caja de la figura girada, RELATIVA a su centroide (fig.cx, fig.cy).
function _cajaGirada(fig){
  const def = FIG_DEFS[fig.type];
  const b = def.bounds(fig.dims);
  const g = fig.rotation || 0;
  if(!g) return {left:b.left, right:b.right, bottom:b.bottom, top:b.top};
  const rot = g*Math.PI/180, cr = Math.cos(rot), sr = Math.sin(rot);
  let caja = null;
  if(typeof def.draw === 'function'){
    const reg = _registradorTrazo(cr, sr);
    // Si el draw usa algo que el registrador no sabe seguir, lanza y se cae de
    // vuelta a la caja local girada, que es lo que se hacía antes: así nunca
    // queda peor que antes.
    try{ def.draw(reg, fig.dims); caja = reg.caja(); }catch(e){ caja = null; }
  }
  if(caja) return caja;
  const esq = [[b.left,b.bottom],[b.right,b.bottom],[b.right,b.top],[b.left,b.top]]
    .map(p => [p[0]*cr - p[1]*sr, p[0]*sr + p[1]*cr]);
  return {left:   Math.min.apply(null, esq.map(p=>p[0])), right: Math.max.apply(null, esq.map(p=>p[0])),
          bottom: Math.min.apply(null, esq.map(p=>p[1])), top:   Math.max.apply(null, esq.map(p=>p[1]))};
}

// figuraBoundsMundo se llama por figura en CADA redibujado, así que la caja se
// guarda por (tipo, medidas, giro) y el trazo se recorre una sola vez.
const _CAJAS_GIRADAS = new Map();
function _claveCaja(fig){
  let s = fig.type + '@' + (fig.rotation || 0);
  const d = fig.dims || {};
  for(const k in d) s += '|' + k + '=' + d[k];
  return s;
}

function figuraBoundsMundo(fig){
  const clave = _claveCaja(fig);
  let b = _CAJAS_GIRADAS.get(clave);
  if(!b){
    b = _cajaGirada(fig);
    if(_CAJAS_GIRADAS.size > 300) _CAJAS_GIRADAS.clear();
    _CAJAS_GIRADAS.set(clave, b);
  }
  return {left:   fig.cx + b.left,   right: fig.cx + b.right,
          bottom: fig.cy + b.bottom, top:   fig.cy + b.top};
}

function bordesFiguras(){
  const xs = [], ys = [];
  figures.forEach(f=>{
    const b = figuraBoundsMundo(f);
    xs.push(b.left, b.right);
    ys.push(b.bottom, b.top);
  });
  return {xs:xs.sort((a,b)=>a-b), ys:ys.sort((a,b)=>a-b)};
}

// ── Planificador de la cadena de cotas ──────────────────────────────────
// Devuelve QUÉ dibujar, sin dibujar nada. Lo comparten el lienzo del editor y
// la vista de resultados, para que las dos muestren lo mismo.
//
// Tres pasos, en este orden:
//  1. FUSIONAR bordes que en pantalla caen a menos de COTA_FUSION_PX.
//  2. PODAR los que aún dejarían un tramo ilegible. Se descarta la coordenada
//     entera, no solo su etiqueta: así no quedan líneas de referencia que no
//     acotan nada, que es lo que ensuciaba el dibujo.
//  3. REPARTIR las etiquetas en niveles, cada una en el más bajo donde no pise
//     a otra. Con eso una cadena densa se lee sin amontonarse.
function planCotas(valores, pos, medir, opts){
  const o = Object.assign({fusion:COTA_FUSION_PX, minSeg:COTA_MIN_SEG_PX,
                           maxNiveles:COTA_MAX_NIVELES, holgura:COTA_HOLGURA_PX}, opts||{});
  if(!valores || valores.length < 2) return null;

  // 1 · fusión
  const orden = valores.slice().sort((a,b)=>a-b);
  const fus = []; let grupo = [orden[0]];
  for(let i=1;i<orden.length;i++){
    if(Math.abs(pos(orden[i]) - pos(grupo[grupo.length-1])) <= o.fusion) grupo.push(orden[i]);
    else { fus.push(grupo.reduce((a,b)=>a+b,0)/grupo.length); grupo = [orden[i]]; }
  }
  fus.push(grupo.reduce((a,b)=>a+b,0)/grupo.length);
  if(fus.length < 2) return null;

  // 2 · poda: se conserva siempre el primero y el último
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
    // decFix devuelve un NÚMERO. En canvas measureText lo convierte solo, pero
    // aquí se mide y se compara, así que se fuerza a texto: si no, .length es
    // undefined, el ancho sale NaN y el reparto en niveles deja de funcionar
    // sin dar ningún error (todo cae en el nivel 0 y las etiquetas se pisan).
    const txt = String(decFix(Math.abs(usados[i+1]-usados[i]),'len'));
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
    sg.visible = n < o.maxNiveles;   // si no cabe en ningún nivel, sin etiqueta
  });
  return {
    coords: usados,
    segs,
    nMax: segs.reduce((m,sg)=>Math.max(m, sg.visible ? sg.nivel : 0), 0)
  };
}

// ── Pintado de una cadena ya planificada ──
// Una sola línea continua con marcas oblicuas en cada borde conservado, y las
// etiquetas escalonadas con su guía. Nunca se dibuja una referencia sobre un
// borde que no participa en ninguna cota.
function pintarCadenaCotas(c, plan, eje, base, cfg){
  if(!plan) return 0;
  const TICK = cfg.tick, SALTO = cfg.salto;
  const q0 = plan.coords.map(v=>cfg.pos(v));
  const ini = Math.min(...q0), fin = Math.max(...q0);

  c.save();
  c.setLineDash([3,3]); c.strokeStyle='rgba(27,31,36,.28)'; c.lineWidth=1;
  q0.forEach(q=>{
    c.beginPath();
    if(eje==='x'){ c.moveTo(q, cfg.borde+3); c.lineTo(q, base+5); }
    else         { c.moveTo(cfg.borde+3, q); c.lineTo(base+5, q); }
    c.stroke();
  });
  c.restore();

  c.save();
  c.strokeStyle='#1b1f24'; c.fillStyle='#1b1f24'; c.lineWidth=1.15;
  c.font = cfg.fuente; c.textAlign='center'; c.textBaseline='middle';

  c.beginPath();
  if(eje==='x'){ c.moveTo(ini, base); c.lineTo(fin, base); }
  else         { c.moveTo(base, ini); c.lineTo(base, fin); }
  c.stroke();

  q0.forEach(q=>{
    c.beginPath();
    if(eje==='x'){ c.moveTo(q-TICK, base+TICK); c.lineTo(q+TICK, base-TICK); }
    else         { c.moveTo(base-TICK, q+TICK); c.lineTo(base+TICK, q-TICK); }
    c.stroke();
  });

  // Las etiquetas se escalonan SIEMPRE alejándose del dibujo. Si van hacia
  // dentro, a partir del segundo nivel se meten encima de las figuras.
  plan.segs.forEach(sg=>{
    if(!sg.visible) return;
    const d = 12 + sg.nivel*SALTO;
    c.save(); c.strokeStyle='rgba(27,31,36,.40)'; c.lineWidth=.9;
    if(eje==='x'){
      const y = base + d;
      c.beginPath(); c.moveTo(sg.centro, base+2); c.lineTo(sg.centro, y-5); c.stroke(); c.restore();
      c.fillText(sg.txt, sg.centro, y);
    } else {
      const x = base + d;
      c.beginPath(); c.moveTo(base+2, sg.centro); c.lineTo(x-5, sg.centro); c.stroke(); c.restore();
      c.save(); c.translate(x, sg.centro); c.rotate(-Math.PI/2);
      c.fillText(sg.txt, 0, 0); c.restore();
    }
  });
  c.restore();
  return plan.nMax;
}

// Cota total: una sola, por fuera de la cadena, con flechas.
function pintarCotaTotal(c, c0, c1, eje, base, cfg){
  const a = cfg.pos(c0), b = cfg.pos(c1);
  if(Math.abs(b-a) < 34) return;
  c.save();
  c.strokeStyle='#0f5c56'; c.fillStyle='#0f5c56'; c.lineWidth=1.3;
  c.font = cfg.fuenteTotal; c.textAlign='center'; c.textBaseline='middle';
  const flecha = (q, dir)=>{
    c.beginPath();
    if(eje==='x'){ c.moveTo(q, base); c.lineTo(q+dir*7, base-3.2); c.lineTo(q+dir*7, base+3.2); }
    else         { c.moveTo(base, q); c.lineTo(base-3.2, q+dir*7); c.lineTo(base+3.2, q+dir*7); }
    c.closePath(); c.fill();
  };
  const txt = decFix(Math.abs(c1-c0),'len') + ' ' + unit;
  c.beginPath();
  if(eje==='x'){ c.moveTo(a, base); c.lineTo(b, base); } else { c.moveTo(base, a); c.lineTo(base, b); }
  c.stroke();
  flecha(a, +1); flecha(b, -1);
  const m = (a+b)/2, w = c.measureText(txt).width;
  if(eje==='x'){
    c.save(); c.fillStyle = CANVAS_BG; c.fillRect(m-w/2-4, base-8, w+8, 16); c.restore();
    c.fillText(txt, m, base);
  } else {
    c.save(); c.translate(base, m); c.rotate(-Math.PI/2);
    c.fillStyle = CANVAS_BG; c.fillRect(-w/2-4, -8, w+8, 16);
    c.fillStyle = '#0f5c56'; c.fillText(txt, 0, 0); c.restore();
  }
  c.restore();
}

// Ángulo propio de cada figura girada, junto a la figura y no en el margen.
function dibujarAngulosFiguras(c, proy){
  c.save();
  c.font='700 10px Inter, sans-serif'; c.textBaseline='middle';
  figures.forEach(f=>{
    const g = f.rotation || 0;
    if(Math.abs(g) < 0.5) return;
    const p = proy(f.cx, f.cy);
    const R = 26, a0 = 0, a1 = -g*Math.PI/180;   // el canvas tiene la Y hacia abajo
    c.strokeStyle='rgba(180,83,9,.85)'; c.fillStyle='rgba(180,83,9,.95)'; c.lineWidth=1.1;
    c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x+R+8, p.y); c.stroke();
    c.beginPath(); c.arc(p.x, p.y, R, Math.min(a0,a1), Math.max(a0,a1)); c.stroke();
    const am = (a0+a1)/2;
    const tx = p.x + (R+13)*Math.cos(am), ty = p.y + (R+13)*Math.sin(am);
    const txt = decFix(g,'len').replace(/\.?0+$/,'') + '°';
    const w = c.measureText(txt).width;
    c.save(); c.fillStyle = CANVAS_BG; c.fillRect(tx-w/2-3, ty-7, w+6, 14); c.restore();
    c.textAlign='center'; c.fillText(txt, tx, ty);
  });
  c.restore();
}

// Planificación de las dos cadenas. Se separa del pintado porque el layout
// necesita saber CUÁNTO espacio harán falta antes de decidir la escala.
function planificarCotas(c, cfg){
  if(!figures.length) return null;
  const {xs, ys} = bordesFiguras();
  const medir = t => { c.save(); c.font = cfg.fuente; const w = c.measureText(t).width; c.restore(); return w; };
  return {
    xs, ys,
    planX: planCotas(xs, cfg.px, medir),
    planY: planCotas(ys, cfg.py, medir)
  };
}

// Espacio en píxeles que la acotación necesita más allá del dibujo. Sin esto
// la cota total del eje X caía fuera del lienzo y se veía cortada.
function espacioCotas(c, cfg){
  const pl = planificarCotas(c, cfg);
  const abajo   = pl && pl.planX ? cfg.sepX + 12 + (pl.planX.nMax+1)*cfg.salto + 22 : 12;
  const derecha = pl && pl.planY ? cfg.sepY + 12 + (pl.planY.nMax+1)*cfg.salto + 24 : 12;
  return {abajo, derecha};
}

// Punto de entrada común. cfg define la proyección y el tamaño; el resto del
// criterio es idéntico en el editor y en la vista de resultados.
// La cadena arranca a sepX (o sepY) del canto del dibujo y su cota total queda
// aún más lejos, así que ocupa más de 90 px más allá de la figura. Con el
// dibujo encuadrado (fitView deja un 10 % de aire por lado) eso se salía del
// lienzo y las etiquetas no se leían. Si se sabe cuánto mide el lienzo, la
// cadena se arrima hacia el dibujo lo JUSTO para caber entera; nunca se aleja
// más de lo que pedía cfg ni se pega al canto del dibujo a menos de 10 px.
function _baseCotaDentro(base, borde, largo, limite){
  if(!(limite > 0)) return base;
  const sobra = (base + largo) - (limite - 6);
  return sobra > 0 ? Math.max(borde + 10, base - sobra) : base;
}

function dibujarCotasSobre(c, cfg){
  const pl = planificarCotas(c, cfg);
  if(!pl) return;
  const {xs, ys, planX, planY} = pl;
  // El lienzo del editor y el de la lámina escalan el contexto por dpr, así que
  // clientWidth/clientHeight ya están en las coordenadas en las que se dibuja.
  const cv = c.canvas;
  const anchoLienzo = cfg.ancho || (cv && cv.clientWidth)  || 0;
  const altoLienzo  = cfg.alto  || (cv && cv.clientHeight) || 0;

  if(planX){
    const borde = cfg.py(Math.min(...ys));
    const base = _baseCotaDentro(borde + cfg.sepX, borde,
                                 12 + (planX.nMax+1)*cfg.salto + 22, altoLienzo);
    pintarCadenaCotas(c, planX, 'x', base,
      {pos:cfg.px, borde, tick:cfg.tick, salto:cfg.salto, fuente:cfg.fuente});
    pintarCotaTotal(c, planX.coords[0], planX.coords[planX.coords.length-1], 'x',
      base + 12 + (planX.nMax+1)*cfg.salto, {pos:cfg.px, fuenteTotal:cfg.fuenteTotal});
  }
  if(planY){
    const borde = cfg.px(Math.max(...xs));
    const base = _baseCotaDentro(borde + cfg.sepY, borde,
                                 12 + (planY.nMax+1)*cfg.salto + 24, anchoLienzo);
    pintarCadenaCotas(c, planY, 'y', base,
      {pos:cfg.py, borde, tick:cfg.tick, salto:cfg.salto, fuente:cfg.fuente});
    pintarCotaTotal(c, planY.coords[0], planY.coords[planY.coords.length-1], 'y',
      base + 12 + (planY.nMax+1)*cfg.salto, {pos:cfg.py, fuenteTotal:cfg.fuenteTotal});
  }
  if(cfg.angulos !== false) dibujarAngulosFiguras(c, (x,y)=>({x:cfg.px(x), y:cfg.py(y)}));
}

// ── Rótulos con recuadro y guía ("callouts") ──────────────────────────────
// Cada valor va en su propia caja, colocada en un hueco LIBRE cerca de su
// figura, con una línea corta que apunta a la figura a la que pertenece.
//
// planCallouts sólo decide POSICIONES; no dibuja. Trabaja en coordenadas
// abstractas, así que lo usan igual el lienzo (píxeles, Y hacia abajo) y el
// generador de LaTeX (centímetros, Y hacia arriba).
//
//   items       : [{txt, ancla:{x,y}, w, h, ...}]
//   obstaculos  : rectángulos que hay que esquivar (figuras, banda de cotas)
//   marco       : {x0,y0,x1,y1} límites en los que puede caer una caja
//   d           : distancias de tanteo, de la más corta a la más larga
function planCallouts(items, obstaculos, marco, d){
  const dist = d || [30, 46, 66, 90, 118, 150];
  const angs = [0, -30, 30, -60, 60, -90, 90, -120, 120, -150, 150, 180];
  const puestas = [];
  const choca = (r, lista) => lista.some(o =>
    r.x < o.x+o.w && r.x+r.w > o.x && r.y < o.y+o.h && r.y+r.h > o.y);

  items.forEach(it=>{
    let mejor = null;
    for(const D of dist){
      for(const A of angs){
        const a = A*Math.PI/180;
        const cx = it.ancla.x + D*Math.cos(a);
        const cy = it.ancla.y + D*Math.sin(a);
        const r = {x:cx-it.w/2, y:cy-it.h/2, w:it.w, h:it.h};
        if(marco && (r.x < marco.x0 || r.y < marco.y0 ||
                     r.x+r.w > marco.x1 || r.y+r.h > marco.y1)) continue;
        if(choca(r, obstaculos)) continue;
        if(choca(r, puestas.map(p=>p.caja))) continue;
        mejor = {cx, cy, caja:r};
        break;
      }
      if(mejor) break;
    }
    // Si no hay ningún hueco limpio se coloca igual, lo más lejos posible: es
    // preferible un rótulo algo apretado a perder el dato.
    if(!mejor){
      const D = dist[dist.length-1];
      const cx = it.ancla.x + D, cy = it.ancla.y;
      mejor = {cx, cy, caja:{x:cx-it.w/2, y:cy-it.h/2, w:it.w, h:it.h}};
    }
    puestas.push(Object.assign({}, it, mejor));
  });
  return puestas;
}

// Punto de la caja desde el que sale la guía: el más cercano al ancla, para
// que la línea nunca atraviese el propio rótulo.
function bordeCaja(caja, hacia){
  return {
    x: Math.max(caja.x, Math.min(hacia.x, caja.x + caja.w)),
    y: Math.max(caja.y, Math.min(hacia.y, caja.y + caja.h))
  };
}

function crearColocador(c, marco){
  const pend = [];
  return {
    add(txt, x, y, color, fuente){
      c.save(); c.font = fuente;
      const w = c.measureText(txt).width + 12, h = 16;
      c.restore();
      pend.push({txt, ancla:{x, y}, color, fuente, w, h});
      return true;
    },
    ancho(){
      if(!pend.length) return 0;
      let w = 0;
      c.save(); pend.forEach(p=>{ c.font = p.fuente; w = Math.max(w, c.measureText(p.txt).width); }); c.restore();
      return w + 16;
    },
    // obstaculos: cajas de las figuras y de la banda de cotas
    pintar(obstaculos){
      if(!pend.length) return;
      const puestas = planCallouts(pend, obstaculos || [],
        marco || {x0:4, y0:4, x1:1e5, y1:1e5});
      c.save();
      c.textAlign='center'; c.textBaseline='middle';
      puestas.forEach(p=>{
        const salida = bordeCaja(p.caja, p.ancla);
        // guía y punto sobre la figura
        c.strokeStyle = p.color; c.lineWidth = 1; c.globalAlpha = .75;
        c.beginPath(); c.moveTo(salida.x, salida.y); c.lineTo(p.ancla.x, p.ancla.y); c.stroke();
        c.globalAlpha = 1;
        c.fillStyle = p.color;
        c.beginPath(); c.arc(p.ancla.x, p.ancla.y, 2.2, 0, Math.PI*2); c.fill();
        // recuadro
        c.fillStyle = '#ffffff';
        c.strokeStyle = p.color; c.lineWidth = 1;
        const r = 3, b = p.caja;
        c.beginPath();
        c.moveTo(b.x+r, b.y);
        c.arcTo(b.x+b.w, b.y,      b.x+b.w, b.y+b.h, r);
        c.arcTo(b.x+b.w, b.y+b.h,  b.x,     b.y+b.h, r);
        c.arcTo(b.x,     b.y+b.h,  b.x,     b.y,     r);
        c.arcTo(b.x,     b.y,      b.x+b.w, b.y,     r);
        c.closePath();
        c.fill(); c.stroke();
        c.fillStyle = p.color; c.font = p.fuente;
        c.fillText(p.txt, p.cx, p.cy);
      });
      c.restore();
      pend.length = 0;
    }
  };
}

// Escapa el texto que se inserta en HTML. cap9 la tenía; cap10 no, y sin ella
// croquisFigura lanzaba ReferenceError al pintar la primera tarjeta.
function esc(t){
  return String(t == null ? '' : t)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
