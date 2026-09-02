// ═══════════════════════════════════════════════════════════
//  ACOTACIÓN
// ═══════════════════════════════════════════════════════════
// Criterio: una sola cadena por eje sobre los BORDES reales de las figuras
// (no sus centros), más una cota total por fuera y el ángulo propio de cada
// figura girada dibujado junto a ella. Lo que evita la saturación del dibujo
// de AutoCAD es fusionar los bordes que caen casi en el mismo sitio y repartir
// las etiquetas en dos niveles cuando no caben, en vez de amontonarlas.

// Estos cuatro números gobiernan por completo la densidad del acotado.
// Calibrados con el ejemplo de 18 figuras: con ellos los 36 bordes por eje se
// quedan en unos 14, repartidos en dos niveles.
const COTA_FUSION_PX   = 12;   // bordes más juntos que esto se cuentan como uno
const COTA_MIN_SEG_PX  = 26;   // por debajo de esto el borde se descarta entero
const COTA_MAX_NIVELES = 4;    // escalones de etiquetas antes de renunciar
const COTA_HOLGURA_PX  = 14;   // aire entre etiquetas del mismo nivel; subirlo
                               // reparte antes en varios niveles

// Bordes reales de todas las figuras, ya girados. Antes esto llamaba a una
// función de bordes que NO existía: el try/catch se tragaba el ReferenceError
// y la cota terminaba midiendo los CENTROS de las figuras en lugar de sus
// bordes, que es justo lo que se veía mal.
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
function dibujarCotasSobre(c, cfg){
  const pl = planificarCotas(c, cfg);
  if(!pl) return;
  const {xs, ys, planX, planY} = pl;

  if(planX){
    const borde = cfg.py(Math.min(...ys));
    const base = borde + cfg.sepX;
    pintarCadenaCotas(c, planX, 'x', base,
      {pos:cfg.px, borde, tick:cfg.tick, salto:cfg.salto, fuente:cfg.fuente});
    pintarCotaTotal(c, planX.coords[0], planX.coords[planX.coords.length-1], 'x',
      base + 12 + (planX.nMax+1)*cfg.salto, {pos:cfg.px, fuenteTotal:cfg.fuenteTotal});
  }
  if(planY){
    const borde = cfg.px(Math.max(...xs));
    const base = borde + cfg.sepY;
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

function dibujarCotasGenerales(ctx2, W2, H2){
  dibujarCotasSobre(ctx2, {
    px: x => worldToScreen(x,0).x,
    py: y => worldToScreen(0,y).y,
    fuente: '600 10.5px Inter, sans-serif',
    fuenteTotal: '700 11px Inter, sans-serif',
    tick: 4.5, salto: 15, sepX: 44, sepY: 50, angulos: true
  });
}



// ═══════════════════════════════════════════════════════════
//  GUARDAR / ABRIR — archivo local del usuario
//  El ejercicio ya no vive en el navegador ni en el portal: se descarga un
//  .json que el alumno guarda donde quiera y vuelve a abrir cuando quiera.
//  En escritorio se ofrece el diálogo "Guardar como" del sistema; donde esa
//  API no existe (Firefox, Safari, móvil) se recurre a la descarga normal.
// ═══════════════════════════════════════════════════════════
const BSA_FORMATO = 'bsa9';
const BSA_VERSION = 1;
const BSA_EXT     = '.bsa9.json';

function nombreArchivoSeguro(nombre){
  // Sin caracteres que rompan el nombre de archivo en Windows/macOS/Android.
  const limpio = (nombre||'ejercicio').trim().replace(/[\\/:*?"<>|]+/g,'-').slice(0,60);
  return limpio || 'ejercicio';
}

function abrirGuardar(){
  const m = document.getElementById('guardarModal'); if(!m) return;
  const inp = document.getElementById('nombreProyecto');
  if(inp) inp.value = '';
  m.classList.add('show');
}
function cerrarGuardar(){
  const m = document.getElementById('guardarModal'); if(m) m.classList.remove('show');
}

async function guardarProyecto(){
  const inp = document.getElementById('nombreProyecto');
  const nombre = (inp && inp.value || '').trim();
  if(!nombre){ aviso('Ponle un nombre al ejercicio antes de guardarlo.', 'error');
               if(inp) inp.focus(); return; }

  const estado = histSnapshot();
  if(!estado){ aviso('No hay nada calculado que guardar.', 'error'); return; }

  const paquete = { bsaApp: BSA_FORMATO, version: BSA_VERSION,
                    titulo: nombre, fecha: new Date().toISOString(), estado: estado };
  const texto   = JSON.stringify(paquete, null, 2);
  const archivo = nombreArchivoSeguro(nombre) + BSA_EXT;

  // Camino preferido: el diálogo del sistema, que deja elegir carpeta.
  if(window.showSaveFilePicker){
    try{
      const handle = await window.showSaveFilePicker({
        suggestedName: archivo,
        types: [{ description:'Ejercicio BSA — Centroides',
                  accept: {'application/json': ['.json']} }]
      });
      const w = await handle.createWritable();
      await w.write(texto); await w.close();
      cerrarGuardar();
      aviso('Guardado como "' + handle.name + '".');
      return;
    }catch(err){
      // Cancelar no es un error: se sale en silencio.
      if(err && err.name === 'AbortError') return;
    }
  }
  descargarComoArchivo(texto, archivo);
  cerrarGuardar();
  aviso('Descargando "' + archivo + '". Búscalo en tu carpeta de descargas.');
}

function descargarComoArchivo(texto, nombreArchivo){
  const blob = new Blob([texto], {type:'application/json'});
  const url  = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombreArchivo;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  // Se revoca con retraso: algunos navegadores necesitan la URL viva
  // mientras arranca la descarga.
  setTimeout(()=>URL.revokeObjectURL(url), 4000);
}

function cerrarHistorial(){
  const m = document.getElementById('histModal'); if(m) m.classList.remove('show');
}

function onArchivoElegido(ev){
  const file = ev.target.files && ev.target.files[0];
  ev.target.value = '';                    // permite reelegir el mismo archivo
  if(!file) return;
  const lector = new FileReader();
  lector.onerror = () => aviso('No se pudo leer el archivo.', 'error');
  lector.onload = () => {
    let datos;
    try{ datos = JSON.parse(lector.result); }
    catch(e){ aviso('El archivo no es un ejercicio válido (JSON dañado).', 'error'); return; }
    if(datos.bsaApp && datos.bsaApp !== BSA_FORMATO)
      aviso('Este archivo parece de otro capítulo (' + datos.bsaApp
          + '). Se intentará abrir de todos modos.', 'error');
    const st = (datos.estado && datos.estado.state) || datos.estado
               || datos.state || datos;
    try{ histRestore(st);
         aviso('Ejercicio abierto desde "' + file.name + '".');
         cerrarHistorial(); }
    catch(e){ aviso('No se pudo abrir: el archivo tiene un formato inesperado.', 'error'); }
  };
  lector.readAsText(file);
}
