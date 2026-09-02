// ═══════════════════════════════════════════════════════════
//  UNIDADES Y DECIMALES
// ═══════════════════════════════════════════════════════════
function openUnitsModal(){
  document.getElementById('selLen').value=unitLen;
  document.getElementById('selFor').value=unitFor;
  updateUnitsPreview();
  document.getElementById('unitsModal').classList.add('show');
}
function closeUnitsModal(){ document.getElementById('unitsModal').classList.remove('show'); }
function updateUnitsPreview(){
  const L=document.getElementById('selLen').value, F=document.getElementById('selFor').value;
  document.getElementById('upF').textContent=F;
  document.getElementById('upM').textContent=F+'·'+L;
}
function applyUnits(){
  const nL=document.getElementById('selLen').value, nF=document.getElementById('selFor').value;
  const kL=LEN_A_M[unitLen]/LEN_A_M[nL], kF=FOR_A_KN[unitFor]/FOR_A_KN[nF];
  nodos.forEach(n=>{ n.x*=kL; n.y*=kL; });
  cargas.forEach(c=>{
    c.pos*=kL;
    if(c.tipo==='M') c.mag*=kF*kL;                    // momento = fuerza x longitud
    else if(c.tipo==='U'||c.tipo==='T'){ c.mag*=kF/kL; c.mag2*=kF/kL; }  // fuerza por unidad
    else c.mag*=kF;
  });
  unitLen=nL; unitFor=nF;
  document.getElementById('chipUnits').textContent=nL+' · '+nF;
  R=null; closeUnitsModal(); centrar(); refrescar();
}
function fillDec(id,val){
  const s=document.getElementById(id); if(!s) return;
  s.innerHTML='';
  for(let i=0;i<=5;i++){
    const o=document.createElement('option');
    o.value=i; o.textContent=i+(i===1?' decimal':' decimales');
    if(i===val) o.selected=true;
    s.appendChild(o);
  }
}
function openDecModal(){
  fillDec('selDecLen',DEC.len); fillDec('selDecFor',DEC.fuerza); fillDec('selDecMom',DEC.momento);
  updateDecPreview(); document.getElementById('decModal').classList.add('show');
}
function closeDecModal(){ document.getElementById('decModal').classList.remove('show'); }
function updateDecPreview(){
  const g=id=>{const e=document.getElementById(id); return e?(parseInt(e.value,10)||0):2;};
  const el=document.getElementById('dpPrev');
  if(el) el.textContent='Ejemplo: '+(4.2857).toFixed(g('selDecLen'))+' '+unitLen
    +' · '+(12.3456).toFixed(g('selDecFor'))+' '+unitFor
    +' · '+(37.8912).toFixed(g('selDecMom'))+' '+uMom();
}
function textoDecimales(){
  const v=[DEC.len, DEC.fuerza, DEC.momento];
  return v.every(x=>x===v[0]) ? (v[0]+(v[0]===1?' decimal':' decimales'))
                              : v.join(' / ')+' decimales';
}
function applyDecModal(){
  const g=id=>{const e=document.getElementById(id); return e?(parseInt(e.value,10)||0):2;};
  DEC={len:g('selDecLen'), fuerza:g('selDecFor'), momento:g('selDecMom')};
  document.getElementById('chipDec').textContent=textoDecimales();
  closeDecModal();
  if(R && !R.error) calcular(); else refrescar();
}

// ═══════════════════════════════════════════════════════════
//  GUARDAR / ABRIR — archivo local del usuario, no almacenamiento del
//  navegador ni del portal. Se descarga un .json con la estructura de la
//  viga y se recupera con el selector nativo de archivos del sistema.
//  Ventaja sobre localStorage/Supabase: el alumno lleva su ejercicio en su
//  propio dispositivo, sin límite de espacio en la cuenta ni dependencia de
//  haber iniciado sesión.
// ═══════════════════════════════════════════════════════════
const BSA_FORMATO = 'bsa7';
const BSA_EXT     = '.bsa7.json';     // marca de formato: evita abrir un archivo de otro capítulo
const BSA_VERSION = 1;

function nombreArchivoSeguro(nombre){
  // Sin caracteres que rompan el nombre de archivo en Windows/macOS/Android.
  const limpio = (nombre||'ejercicio').trim().replace(/[\\/:*?"<>|]+/g,'-').slice(0,60) || 'ejercicio';
  return limpio;
}

function abrirGuardar(){
  const m=document.getElementById('guardarModal'); if(!m) return;
  document.getElementById('nombreProyecto').value='';
  m.classList.add('show');
}
function cerrarGuardar(){ document.getElementById('guardarModal').classList.remove('show'); }

async function guardarProyecto(){
  const inp=document.getElementById('nombreProyecto');
  const nombre=(inp.value||'').trim();
  if(!nombre){ aviso('Ponle un nombre al ejercicio antes de guardarlo.', 'error'); inp.focus(); return; }

  const paquete = {
    bsaApp: BSA_FORMATO, version: BSA_VERSION,
    titulo: nombre, fecha: new Date().toISOString(),
    estado: estadoActual()
  };
  const texto = JSON.stringify(paquete, null, 2);
  const archivo = nombreArchivoSeguro(nombre) + BSA_EXT;

  // ── Camino preferido: el diálogo "Guardar como" del sistema ──
  // Deja elegir carpeta y nombre, como cualquier programa de escritorio.
  // Solo existe en navegadores de escritorio basados en Chromium; en el
  // resto se cae al segundo camino sin que el usuario note nada raro.
  if(window.showSaveFilePicker){
    try{
      const handle = await window.showSaveFilePicker({
        suggestedName: archivo,
        types: [{ description:'Ejercicio BSA — Fuerzas internas',
                  accept: {'application/json': ['.json']} }]
      });
      const w = await handle.createWritable();
      await w.write(texto);
      await w.close();
      cerrarGuardar();
      aviso('Guardado como "'+handle.name+'".');
      return;
    }catch(err){
      // Cancelar el diálogo no es un error: se sale en silencio.
      if(err && err.name === 'AbortError'){ return; }
      // Cualquier otro fallo (permisos, contexto no seguro) cae a la descarga.
    }
  }

  // ── Reserva: descarga normal a la carpeta de descargas ──
  descargarComoArchivo(texto, archivo);
  cerrarGuardar();
  aviso('Descargando "'+archivo+'". Búscalo en tu carpeta de descargas.');
}

// Descarga clásica por enlace. Es lo único disponible en móvil, en Firefox y
// en Safari, donde el navegador decide la carpeta.
function descargarComoArchivo(texto, nombreArchivo){
  const blob = new Blob([texto], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombreArchivo;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  // Se revoca con retraso: algunos navegadores necesitan que la URL siga
  // viva mientras arranca la descarga.
  setTimeout(()=>URL.revokeObjectURL(url), 4000);
}

function abrirHistorial(){
  const el = document.getElementById('histLista');
  if(el) el.innerHTML = '';
  document.getElementById('histModal').classList.add('show');
}
function cerrarHistorial(){ document.getElementById('histModal').classList.remove('show'); }

function onArchivoElegido(ev){
  const file = ev.target.files && ev.target.files[0];
  ev.target.value = '';           // permite volver a elegir el mismo archivo
  if(!file) return;
  const lector = new FileReader();
  lector.onerror = () => aviso('No se pudo leer el archivo.', 'error');
  lector.onload = () => {
    let datos;
    try { datos = JSON.parse(lector.result); }
    catch(e){ aviso('El archivo no es un ejercicio válido (JSON dañado).', 'error'); return; }
    // Aviso, no bloqueo: un archivo de otro capítulo podría en principio
    // compartir la forma {nodos,tramos,cargas} y cargar igual, pero avisamos
    // por si el nombre no coincide con lo esperado.
    if(datos.bsaApp && datos.bsaApp !== BSA_FORMATO)
      aviso('Este archivo parece ser de otro capítulo (' + datos.bsaApp + '). Se intentará abrir de todos modos.', 'error');
    const estado = datos.estado || datos;   // admite también el JSON "pelado" del estado
    cargarEstadoDesdeArchivo(estado, file.name);
  };
  lector.readAsText(file);
}

function cargarEstadoDesdeArchivo(e, nombreArchivo){
  if(!e || !Array.isArray(e.nodos)){
    aviso('El archivo no contiene un ejercicio reconocible.', 'error');
    return;
  }
  try{
    registrarCambio();
    nodos=(e.nodos||[]).map(n=>Object.assign({nombre:''},n));
    tramos=(e.tramos||[]).slice();
    cargas=normalizarCargas((e.cargas||[]).map(c=>Object.assign({}, c)));
    pesos=(e.pesos||[]).map(p=>Object.assign({}, p));
    nodoSeq=nodos.reduce((m,n)=>Math.max(m,n.id),0);
    tramoSeq=tramos.reduce((m,t)=>Math.max(m,t.id),0);
    cargaSeq=cargas.reduce((m,c)=>Math.max(m,c.id),0);
    pesoSeq=pesos.reduce((m,p)=>Math.max(m,p.id),0);
    pesoActivo=null;
    if(e.unidades){ unitLen=e.unidades.len||unitLen; unitFor=e.unidades.fuerza||unitFor; }
    if(e.decimales) DEC=e.decimales;
    R=null; reNombrar(); centrar(); refrescar(); cerrarHistorial();
    aviso('Ejercicio abierto desde "'+nombreArchivo+'".');
  }catch(err){
    aviso('No se pudo abrir el ejercicio: el archivo tiene un formato inesperado.', 'error');
  }
}

function escaparTexto(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
                  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function estadoActual(){
  return {nodos:nodos.map(n=>({id:n.id,x:n.x,y:n.y,apoyo:n.apoyo,rotula:n.rotula})),
          tramos:tramos.map(t=>({id:t.id,a:t.a,b:t.b})),
          cargas:cargas.slice(),
          unidades:{len:unitLen,fuerza:unitFor}, decimales:DEC};
}
// ═══════════════════════════════════════════════════════════
//  GENERADOR DE PDF PROFESIONAL CON LATEX (texlive.net)
//  Mismo mecanismo que Cap. 9: un traductor independiente del HTML que
//  parte de los mismos datos que ya alimenta renderResultados (R).
// ═══════════════════════════════════════════════════════════
function escLatex(s){
  return String(s).replace(/([%&_#{}$])/g, '\\$1');
}
// Unidad compuesta (fuerza·longitud) en texto plano, válida tanto dentro
// de \text{} como fuera: evita usar \cdot, que solo existe en modo matemático.
function unidadMomento(){ return unitFor + '\u00b7' + unitLen; }

// ═══════════════════════════════════════════════════════════
//  ACOTACIÓN Y RÓTULOS EN TikZ
//  El navegador ya reparte cotas en niveles y evita que los rótulos se
//  pisen; el informe no hacía ninguna de las dos cosas. Aquí se lleva ese
//  mismo criterio a TikZ, reutilizando el planificador planCotas para que
//  pantalla y PDF acoten igual.
//  Todo trabaja en las unidades del dibujo TikZ (cm).
// ═══════════════════════════════════════════════════════════
// ── Medidas aproximadas del texto en el dibujo ──
// El colocador de rótulos necesita saber cuánto ocupa cada etiqueta. Las
// medidas anteriores se quedaban cortas (un carácter \tiny mide unos 0.13 cm
// a 11 pt, no 0.105), así que dos rótulos que el planificador daba por
// separados salían pisados en el PDF. Van holgadas a propósito: es preferible
// apartar de más que solapar.
const TZ_CUERPO = {
  tiny:       {w:0.138, h:0.26},
  scriptsize: {w:0.170, h:0.31},
  small:      {w:0.200, h:0.35},
  normal:     {w:0.190, h:0.33}
};
const TZ_ALTO_TXT = TZ_CUERPO.tiny.h;
const TZ_ANCHO_CAR = TZ_CUERPO.tiny.w;
let _tzCajas = [];

function tzReiniciar(){ _tzCajas = []; }
function tzMetrica(opts){
  const o = String(opts || '');
  if(o.indexOf('\\tiny') >= 0) return TZ_CUERPO.tiny;
  if(o.indexOf('\\scriptsize') >= 0) return TZ_CUERPO.scriptsize;
  if(o.indexOf('\\small') >= 0) return TZ_CUERPO.small;
  return TZ_CUERPO.normal;
}
// Los comandos de LaTeX ($, \, \tfrac...) no ocupan sitio, pero una fracción
// sí ensancha: se cuentan sus dos números.
function tzAncho(txt, opts){
  const m = tzMetrica(opts);
  const limpio = String(txt).replace(/\\[a-zA-Z]+/g, '').replace(/[$\\{}^_,]/g, '');
  return Math.max(1, limpio.length) * m.w + 0.14;
}
function tzAlto(txt, opts){
  const m = tzMetrica(opts);
  // Una fracción \tfrac ocupa dos pisos de alto.
  return m.h * (/\\[dt]?frac/.test(String(txt)) ? 1.7 : 1);
}
function tzOcupar(x0, y0, x1, y1){
  _tzCajas.push({x0:Math.min(x0,x1), y0:Math.min(y0,y1),
                 x1:Math.max(x0,x1), y1:Math.max(y0,y1)});
}
function tzChoca(c){
  return _tzCajas.some(q => c.x0 < q.x1 && c.x1 > q.x0 && c.y0 < q.y1 && c.y1 > q.y0);
}
// Reserva un trazo como cadena de cajitas, para que ningún rótulo lo tape.
function tzOcuparTrazo(x1, y1, x2, y2, w){
  const g = w || 0.09, n = 6;
  for(let m=0;m<n;m++){
    const f0=m/n, f1=(m+1)/n;
    tzOcupar(x1+(x2-x1)*f0-g, y1+(y2-y1)*f0-g,
             x1+(x2-x1)*f1+g, y1+(y2-y1)*f1+g);
  }
}
// Reserva el interior del bloque de una carga repartida: (A,B) sobre el eje,
// (ex,ey) la normal en la que se levanta y h1/h2 su altura en cada extremo.
function tzOcuparBloque(A, B, ex, ey, h1, h2){
  const L = Math.hypot(B.x-A.x, B.y-A.y);
  const n = Math.max(3, Math.min(12, Math.round(L/0.35)));
  for(let i=0;i<n;i++){
    const f0=i/n, f1=(i+1)/n;
    const xa=A.x+(B.x-A.x)*f0, ya=A.y+(B.y-A.y)*f0;
    const xb=A.x+(B.x-A.x)*f1, yb=A.y+(B.y-A.y)*f1;
    const ha=h1+(h2-h1)*f0, hb=h1+(h2-h1)*f1;
    const hm=(Math.abs(ha) >= Math.abs(hb)) ? ha : hb;
    const xs=[xa, xb, xa+ex*hm, xb+ex*hm], ys=[ya, yb, ya+ey*hm, yb+ey*hm];
    tzOcupar(Math.min.apply(null,xs), Math.min.apply(null,ys),
             Math.max.apply(null,xs), Math.max.apply(null,ys));
  }
}
// ── Rótulo fijo ──
// Una etiqueta de cota debe quedarse SOBRE su propia línea: si se la deja
// buscar hueco acaba lejos de la línea que mide y ya no se sabe qué acota.
// Se dibuja con fondo blanco, para que la línea no la atraviese, y reserva
// su caja para que los demás rótulos la esquiven.
function tzTextoFijo(x, y, txt, opts){
  const w = tzAncho(txt, opts), h = tzAlto(txt, opts);
  tzOcupar(x-w/2, y-h/2, x+w/2, y+h/2);
  return '\\node[' + (opts || 'font=\\scriptsize') + ', fill=white, inner sep=1pt] at ('
       + x.toFixed(3) + ',' + y.toFixed(3) + ') {' + txt + '};\n';
}
// ── Rótulo que busca hueco ──
// dirX/dirY marcan hacia dónde apartarse. Se prueba primero el sitio pedido y
// después escalones en esa dirección, con desplazamientos laterales. Si aun
// así no cabe, el rótulo NO se omite: se lleva al último escalón y se une con
// una guía fina al punto que rotula, porque un valor que falta es peor que uno
// alejado (y sin la guía no se sabría a qué fuerza pertenece).
function tzTexto(x, y, txt, opts, dirX, dirY){
  const w = tzAncho(txt, opts), h = tzAlto(txt, opts);
  const dx0 = (dirX === undefined) ? 0 : dirX;
  const dy0 = (dirY === undefined) ? 1 : dirY;
  const nn = Math.hypot(dx0, dy0) || 1;
  const ex = dx0/nn, ey = dy0/nn;
  const lx = -ey, ly = ex;                 // lateral, perpendicular a la fuga
  const paso = h + 0.08;
  const nodo = (ox, oy) => '\\node[' + (opts || 'font=\\scriptsize') + '] at ('
      + (x+ox).toFixed(3) + ',' + (y+oy).toFixed(3) + ') {' + txt + '};\n';
  const guia = (ox, oy) => {
    const d = Math.hypot(ox, oy);
    if(d < 0.62) return '';
    // la guía llega al borde del rótulo, no a su centro
    const fx = x + ox - (ox/d)*(w*0.32), fy = y + oy - (oy/d)*(h*0.55);
    return '\\draw[gray!55, line width=.25pt] (' + x.toFixed(3) + ',' + y.toFixed(3)
         + ') -- (' + fx.toFixed(3) + ',' + fy.toFixed(3) + ');\n';
  };
  for(let k=0;k<14;k++){
    for(const lado of (k===0 ? [0] : [0,-1,1,-2,2])){
      const ox = ex*paso*k + lx*lado*w*0.55, oy = ey*paso*k + ly*lado*w*0.55;
      const c = {x0:x+ox-w/2, y0:y+oy-h/2, x1:x+ox+w/2, y1:y+oy+h/2};
      if(!tzChoca(c)){
        _tzCajas.push(c);
        return guia(ox, oy) + nodo(ox, oy);
      }
    }
  }
  const ox = ex*paso*14, oy = ey*paso*14;
  _tzCajas.push({x0:x+ox-w/2, y0:y+oy-h/2, x1:x+ox+w/2, y1:y+oy+h/2});
  return guia(ox, oy) + nodo(ox, oy);
}

// Cadena de cotas VERTICAL: misma lógica, pero los niveles se apilan hacia
// la derecha y las etiquetas van giradas 90°, como en un plano.
function tzCadenaCotasY(valores, Yn, xBase, color, opts){
  const o = Object.assign({salto:0.38, tick:0.09, maxNiveles:4}, opts||{});
  if(!valores || valores.length < 2) return {tikz:'', nMax:-1};
  const ESC = 100;
  const plan = planCotas(valores, v => Yn(v)*ESC, t => tzAncho(t)*ESC,
                         {maxNiveles:o.maxNiveles, minSeg:18, fusion:8, holgura:15});
  if(!plan) return {tikz:'', nMax:-1};
  const col = color || 'bsaMuted';
  let out = '';
  const y0 = Yn(plan.coords[0]), y1 = Yn(plan.coords[plan.coords.length-1]);
  out += '\\draw[' + col + ', line width=.5pt] (' + xBase.toFixed(3) + ',' + y0.toFixed(3)
       + ') -- (' + xBase.toFixed(3) + ',' + y1.toFixed(3) + ');\n';
  tzOcuparTrazo(xBase, y0, xBase, y1, 0.05);
  plan.coords.forEach(v=>{
    const yy = Yn(v);
    out += '\\draw[' + col + ', line width=.6pt] (' + (xBase-o.tick).toFixed(3) + ','
         + (yy-o.tick).toFixed(3) + ') -- (' + (xBase+o.tick).toFixed(3) + ','
         + (yy+o.tick).toFixed(3) + ');\n';
  });
  plan.segs.forEach((sg, m)=>{
    if(!sg.visible) return;
    const ym = (Yn(plan.coords[m]) + Yn(plan.coords[m+1]))/2;
    const xx = xBase + 0.20 + sg.nivel*o.salto;
    if(sg.nivel > 0)
      out += '\\draw[' + (col.indexOf('!')>=0 ? col : col+'!45') + ', line width=.3pt] (' + (xBase+0.04).toFixed(3) + ','
           + ym.toFixed(3) + ') -- (' + (xx-0.09).toFixed(3) + ',' + ym.toFixed(3) + ');\n';
    const w = tzAncho(sg.txt), h = TZ_ALTO_TXT;
    // girada: al rotar, el alto y el ancho se intercambian en la caja
    tzOcupar(xx-h/2, ym-w/2, xx+h/2, ym+w/2);
    out += '\\node[rotate=90, font=\\scriptsize, color=' + col + '] at ('
         + xx.toFixed(3) + ',' + ym.toFixed(3) + ') {' + sg.txt + '};\n';
  });
  return {tikz:out, nMax:plan.nMax};
}

// Cadena de cotas horizontal con niveles, al estilo del panel de dibujo.
// Devuelve {tikz, nMax} para que quien la use sepa cuánto bajó.
function tzCadenaCotas(valores, Xn, yBase, color, opts){
  const o = Object.assign({salto:0.36, tick:0.09, maxNiveles:5}, opts||{});
  if(!valores || valores.length < 2) return {tikz:'', nMax:-1};
  // planCotas trabaja en píxeles; aquí la "posición" es la x del dibujo en
  // cm, y el "ancho" el del texto en cm. Se escala por 100 para reutilizarlo
  // con sus umbrales, pensados para píxeles.
  const ESC = 100;
  const plan = planCotas(valores, v => Xn(v)*ESC, t => tzAncho(t)*ESC,
                         {maxNiveles:o.maxNiveles, minSeg:18, fusion:8, holgura:15});
  if(!plan) return {tikz:'', nMax:-1};
  const col = color || 'bsaMuted';
  let out = '';
  const x0 = Xn(plan.coords[0]), x1 = Xn(plan.coords[plan.coords.length-1]);
  out += '\\draw[' + col + ', line width=.5pt] (' + x0.toFixed(3) + ',' + yBase.toFixed(3)
       + ') -- (' + x1.toFixed(3) + ',' + yBase.toFixed(3) + ');\n';
  tzOcuparTrazo(x0, yBase, x1, yBase, 0.05);
  plan.coords.forEach(v=>{
    const xx = Xn(v);
    // marca oblicua, convención de plano
    out += '\\draw[' + col + ', line width=.6pt] (' + (xx-o.tick).toFixed(3) + ','
         + (yBase-o.tick).toFixed(3) + ') -- (' + (xx+o.tick).toFixed(3) + ','
         + (yBase+o.tick).toFixed(3) + ');\n';
  });
  plan.segs.forEach((sg, m)=>{
    if(!sg.visible) return;
    const xm = (Xn(plan.coords[m]) + Xn(plan.coords[m+1]))/2;
    const yy = yBase - 0.21 - sg.nivel*o.salto;
    if(sg.nivel > 0)
      out += '\\draw[' + (col.indexOf('!')>=0 ? col : col+'!45') + ', line width=.3pt] (' + xm.toFixed(3) + ','
           + (yBase-0.04).toFixed(3) + ') -- (' + xm.toFixed(3) + ',' + (yy+0.09).toFixed(3) + ');\n';
    // La unidad se pone solo en la ÚLTIMA cota de la fila: repetirla en
    // todas ensancharía cada etiqueta y obligaría a escalonar de más.
    const ult = (m === plan.segs.length - 1);
    out += tzTextoFijo(xm, yy, sg.txt + (ult ? '\\,' + escLatex(unitLen) : ''),
                       'font=\\scriptsize, color=' + col);
  });
  return {tikz:out, nMax:plan.nMax};
}

// Términos que componen cada lado de una ecuación de equilibrio.
// e = 0 -> suma de Fx ; 1 -> suma de Fy ; 2 -> momentos respecto al origen ;
// 3+ -> momentos a un lado de cada rótula.
// Devuelve [{v, tex}]: v da el signo con el que entra el término y tex su
// expresión en valor absoluto, para poder componer la suma con sus signos.
function terminosEquilibrio(R, e){
  const trm = [];
  const dt = e >= 2 ? 'momento' : 'fuerza';
  const push = (v, det) => {
    if(Math.abs(v) < 1e-9) return;
    trm.push({v, tex: det || dec(Math.abs(v), dt)});
  };
  // Las acciones se agrupan por carga: una distribuida es un solo término,
  // con su resultante y su brazo, no una lista de rebanadas.
  const porCarga = new Map();
  R.acc.forEach(a=>{
    const k = a.carga ? a.carga.id : ('x'+trm.length);
    if(!porCarga.has(k)) porCarga.set(k, {c:a.carga, fx:0, fy:0, m:0, x:a.x, y:a.y});
    const o = porCarga.get(k);
    o.fx += a.fx; o.fy += a.fy; o.m += a.m || 0;
  });
  const lista = [...porCarga.values()];
  if(e === 0){ lista.forEach(o=>push(o.fx)); return trm; }
  if(e === 1){ lista.forEach(o=>push(o.fy)); return trm; }
  // momentos: se muestra fuerza x brazo, que es lo que se hace a mano
  const rt = (e >= 3 && R.rotulas[e-3]) ? R.rotulas[e-3] : {x:0, y:0};
  const ok = (o) => {
    if(e < 3) return true;
    const lado = ladoDeRotula(R.rotulas[e-3], R.cad);
    return o.c && lado.tramos.indexOf(o.c.tramo) >= 0;
  };
  lista.forEach(o=>{
    if(!ok(o)) return;
    const bx = o.x - rt.x, by = o.y - rt.y;
    const mv = bx*o.fy - by*o.fx + o.m;
    if(Math.abs(mv) < 1e-9) return;
    let det;
    if(Math.abs(o.fy) > 1e-9 && Math.abs(o.fx) < 1e-9 && Math.abs(o.m) < 1e-9)
      det = dec(Math.abs(o.fy),'fuerza') + '\\times' + dec(Math.abs(bx),'len');
    else if(Math.abs(o.fx) > 1e-9 && Math.abs(o.fy) < 1e-9 && Math.abs(o.m) < 1e-9)
      det = dec(Math.abs(o.fx),'fuerza') + '\\times' + dec(Math.abs(by),'len');
    else if(Math.abs(o.m) > 1e-9 && Math.abs(o.fx) < 1e-9 && Math.abs(o.fy) < 1e-9)
      det = dec(Math.abs(o.m),'momento');
    else
      det = dec(Math.abs(mv),'momento');
    push(mv, det);
  });
  return trm;
}

// ── Desarrollo paso a paso de las reacciones ──
// Se plantea cada ecuación completa (incógnitas y cargas, todo a un lado) y
// se resuelve en el orden en que se puede resolver a mano: primero la que
// deja una sola incógnita, después las que se despejan sustituyendo lo ya
// hallado. Cada reacción aparece con su valor en cuanto se obtiene; antes se
// escribían tres líneas casi iguales y el valor solo salía en la tabla final.
function pasoAPasoReacciones(R){
  if(!R || R.error || !R.inc.length) return '';
  const simb = (u) => {
    const b = escLatex(u.n.nombre);
    if(u.ang !== undefined) return 'R_{' + b + '}';
    return (u.tipo==='Rx' ? 'R_{x' : (u.tipo==='Ry' ? 'R_{y' : 'M_{')) + b + '}';
  };
  const uInc = (u) => escLatex((u.tipo === 'M' && u.ang === undefined) ? unidadMomento() : unitFor);
  const nEq = R.A.length, nInc = R.inc.length;
  const nomEq = [];
  nomEq.push('\\sum F_x = 0');
  nomEq.push('\\sum F_y = 0');
  nomEq.push('\\sum M_O = 0');
  for(let e=3;e<nEq;e++) nomEq.push('\\sum M_{' + escLatex(R.rotulas[e-3].nombre) + '} = 0');
  const notaEq = [];
  notaEq.push('');
  notaEq.push('');
  notaEq.push('momentos respecto al origen');
  for(let e=3;e<nEq;e++)
    notaEq.push('momento nulo en la rótula ' + escLatex(R.rotulas[e-3].nombre)
              + ', tomando solo lo que hay a un lado');

  let out = '\\noindent{\\bfseries\\color{bsaAcc2} Desarrollo}\\\\[3pt]\n';
  // Diagrama de cuerpo libre global: la viga con sus cargas Y con las
  // reacciones dibujadas como incógnitas, para que se vea el sentido
  // positivo supuesto de cada una antes de plantear las ecuaciones.
  out += '\\begin{center}\\begin{tikzpicture}\n' + tikzViga(true)
       + '\\end{tikzpicture}\n'
       + '\\\\[2pt]{\\footnotesize\\color{bsaMuted} Cuerpo libre global: cargas '
       + 'aplicadas y reacciones incógnita, en su sentido positivo supuesto.}\n'
       + '\\end{center}\\vspace{4pt}\n';

  const dtEq = e => (e >= 2 ? 'momento' : 'fuerza');
  const unEq = e => escLatex(e >= 2 ? unidadMomento() : unitFor);
  const conocido = new Array(nInc).fill(false);
  const usada = new Array(nEq).fill(false);
  // Términos de las incógnitas; las ya halladas entran como número.
  const izqTerms = (e, sustituir) => {
    const t = [];
    R.inc.forEach((u,j)=>{
      const a = R.A[e][j];
      if(Math.abs(a) < 1e-9) return;
      if(sustituir && conocido[j]){
        const v = a*R.val[j];
        if(Math.abs(v) < 1e-9) return;
        t.push({v, tex: dec(Math.abs(v), dtEq(e))});
      } else {
        const co = Math.abs(Math.abs(a)-1) < 1e-9 ? '' : dec(Math.abs(a),'len') + '\\,';
        t.push({v:a, tex: co + simb(u)});
      }
    });
    return t;
  };
  const pendientes = (e) => {
    const v = [];
    R.inc.forEach((u,j)=>{ if(Math.abs(R.A[e][j]) > 1e-9 && !conocido[j]) v.push({u, j, a:R.A[e][j]}); });
    return v;
  };

  const carg = [];                 // términos de carga de cada ecuación
  for(let e=0;e<nEq;e++) carg.push(terminosEquilibrio(R, e));

  let restantes = nEq;
  while(restantes > 0){
    // Se elige la ecuación que deje UNA sola incógnita: es la que se puede
    // despejar sin tocar las demás.
    let el = -1;
    for(let e=0;e<nEq;e++){
      if(usada[e]) continue;
      if(pendientes(e).length === 1){ el = e; break; }
    }
    if(el < 0){
      // Ninguna se despeja sola: las que quedan forman un sistema simultáneo.
      const libres = [];
      for(let e=0;e<nEq;e++){
        if(usada[e]) continue;
        usada[e] = true; restantes--;
        out += '$$' + nomEq[e] + (notaEq[e] ? '\\quad\\text{(' + notaEq[e] + ')}' : '') + '$$\n';
        out += '$$' + _sumaTex(izqTerms(e, true).concat(carg[e])) + ' = 0$$\n';
        pendientes(e).forEach(p=>{ if(libres.indexOf(p.j) < 0) libres.push(p.j); });
      }
      if(libres.length){
        out += '\\noindent{\\footnotesize Estas ecuaciones no se despejan por separado: '
          + 'forman un sistema simultáneo. Resolviéndolo:}\\\\[2pt]\n';
        out += '$$' + libres.map(j=>simb(R.inc[j]) + ' = '
          + dec(R.val[j], (R.inc[j].tipo === 'M' && R.inc[j].ang === undefined) ? 'momento' : 'fuerza')
          + '\\ \\text{' + uInc(R.inc[j]) + '}').join('\\qquad ') + '$$\n';
        libres.forEach(j=>{ conocido[j] = true; });
      }
      break;
    }

    usada[el] = true; restantes--;
    const p = pendientes(el)[0];
    const hayPrevias = izqTerms(el, false).length > 1;
    out += '$$' + nomEq[el] + (notaEq[el] ? '\\quad\\text{(' + notaEq[el] + ')}' : '') + '$$\n';
    // 1 · La ecuación completa, con las incógnitas en símbolos. Se omite
    //     cuando no aporta nada: una ecuación con una sola incógnita de
    //     coeficiente unidad y sin cargas ya es el propio despeje, y
    //     escribirla repetía la misma línea dos veces.
    const trivial = !hayPrevias && !carg[el].length && Math.abs(Math.abs(p.a)-1) < 1e-9;
    if(!trivial)
      out += '$$' + _sumaTex(izqTerms(el, false).concat(carg[el])) + ' = 0$$\n';
    // 2 · Sustitución de lo ya hallado y suma de lo conocido
    const sust = izqTerms(el, true).concat(carg[el]);
    const cte = sust.filter(t=>t.tex.indexOf('R_') < 0 && t.tex.indexOf('M_') < 0)
                    .reduce((s,t)=>s + t.v, 0);
    const coefTxt = Math.abs(Math.abs(p.a)-1) < 1e-9 ? '' : dec(Math.abs(p.a),'len') + '\\,';
    if(hayPrevias)
      out += '$$' + _sumaTex(sust) + ' = 0$$\n';
    // 3 · Despeje, con la división a la vista si el coeficiente no es 1
    const dtI = (p.u.tipo === 'M' && p.u.ang === undefined) ? 'momento' : 'fuerza';
    const izqDes = (p.a < 0 ? '-' : '') + coefTxt + simb(p.u);
    let linea = izqDes + ' = ' + dec(-cte, dtEq(el)) + '\\ \\text{' + unEq(el) + '}';
    if(Math.abs(Math.abs(p.a)-1) > 1e-9)
      linea += ' \\quad\\Rightarrow\\quad ' + simb(p.u) + ' = \\dfrac{' + dec(-cte, dtEq(el))
             + '}{' + dec(p.a,'len') + '} = ' + dec(R.val[p.j], dtI)
             + '\\ \\text{' + uInc(p.u) + '}';
    else if(p.a < 0)
      linea += ' \\quad\\Rightarrow\\quad ' + simb(p.u) + ' = ' + dec(R.val[p.j], dtI)
             + '\\ \\text{' + uInc(p.u) + '}';
    out += '$$' + linea + '$$\n';
    conocido[p.j] = true;
  }

  // Comprobación compacta: con todas las reacciones halladas, cada ecuación
  // debe cerrar. Antes se listaba una tabla entera de residuos nulos, que
  // repetía lo que el propio desarrollo ya había demostrado.
  let peor = 0;
  for(let e=0;e<nEq;e++){
    let acc = 0;
    R.inc.forEach((u,j)=>{ acc += R.A[e][j]*R.val[j]; });
    peor = Math.max(peor, Math.abs(acc - R.b[e]));
  }
  out += '\\noindent{\\footnotesize Sustituyendo los valores hallados en las '
    + nEq + ' ecuaciones, el mayor residuo es ' + dec(peor,'momento')
    + ': el sistema cierra.}\\\\[4pt]\n';
  return out;
}

// ── Símbolo de apoyo en TikZ ──
// El mismo dibujo sirve para el modelo, los DCL y el esquema de los
// diagramas, así el alumno reconoce el apoyo en las tres figuras.
// lado: hacia dónde miran las rayas del empotramiento (−1 izquierda, +1 derecha).
function tikzApoyo(x, y, tipo, k, lado){
  const K = k || 1, F = n => n.toFixed(3), s = lado || -1;
  let out = '';
  if(tipo === 'simple'){
    out += '\\draw[line width=1pt] (' + F(x) + ',' + F(y) + ') -- (' + F(x-0.28*K) + ',' + F(y-0.45*K)
         + ') -- (' + F(x+0.28*K) + ',' + F(y-0.45*K) + ') -- cycle;\n';
    out += '\\draw[line width=1pt] (' + F(x-0.4*K) + ',' + F(y-0.45*K) + ') -- (' + F(x+0.4*K) + ',' + F(y-0.45*K) + ');\n';
    for(let i=-3;i<=3;i++){
      const xi = x+i*0.11*K;
      out += '\\draw[line width=.6pt] (' + F(xi) + ',' + F(y-0.45*K) + ') -- (' + F(xi-0.08*K) + ',' + F(y-0.58*K) + ');\n';
    }
  } else if(tipo === 'movil'){
    out += '\\draw[line width=1pt] (' + F(x) + ',' + F(y) + ') -- (' + F(x-0.26*K) + ',' + F(y-0.38*K)
         + ') -- (' + F(x+0.26*K) + ',' + F(y-0.38*K) + ') -- cycle;\n';
    out += '\\draw[line width=1pt] (' + F(x-0.13*K) + ',' + F(y-0.46*K) + ') circle (' + F(0.08*K) + ');\n';
    out += '\\draw[line width=1pt] (' + F(x+0.13*K) + ',' + F(y-0.46*K) + ') circle (' + F(0.08*K) + ');\n';
    out += '\\draw[line width=1pt] (' + F(x-0.36*K) + ',' + F(y-0.54*K) + ') -- (' + F(x+0.36*K) + ',' + F(y-0.54*K) + ');\n';
  } else if(tipo === 'empotrado'){
    out += '\\draw[line width=1.4pt] (' + F(x) + ',' + F(y-0.42*K) + ') -- (' + F(x) + ',' + F(y+0.42*K) + ');\n';
    for(let i=-3;i<=3;i++){
      const yi = y + i*0.13*K;
      out += '\\draw[line width=.6pt] (' + F(x) + ',' + F(yi) + ') -- (' + F(x+s*0.16*K) + ',' + F(yi-0.1*K) + ');\n';
    }
  }
  return out;
}

// ── DCL del trozo cortado, en TikZ ──
// Se ve la porción de viga que queda antes del corte con TODO lo que actúa
// sobre ella: el apoyo y sus reacciones (con nombre y valor), las cargas
// puntuales, los pares, las repartidas con su resultante y, en la cara
// cortada, N, V y M en sentido positivo. Reutiliza el colocador de rótulos,
// así que las etiquetas se apartan en vez de pisarse.
//
// Ojo con las repartidas: si la sección cae DENTRO de la carga, la parte que
// actúa depende de la abscisa, así que su resultante no es un número sino
// w(x-d), aplicada a la mitad de ese trozo. Solo las cargas que terminan
// antes del intervalo se sustituyen por su resultante numérica.
function tikzDCLSub(R, gg, seg, sub, info){
  const EPS = 1e-9;
  const primero = (gg.idx === 0);
  const sIni = gg.s0;
  const sCut = seg.s0 + sub.sb;
  const O = gg.desde;
  const P = {x: seg.desde.x + seg.ux*sub.sb, y: seg.desde.y + seg.uy*sub.sb};
  const uF = escLatex(unitFor), uM = escLatex(unidadMomento());
  const Fz = v => dec(Math.abs(v),'fuerza');
  const Lz = v => dec(v,'len');
  const sb = gg.simbolo;
  const brazo = d => (Math.abs(d) < 1e-6 ? sb : '(' + sb + ' - ' + Lz(d) + ')');
  // Abscisa donde empieza el intervalo: una carga que termina antes de él ya
  // es una fuerza conocida; una que lo cruza, no.
  const A0 = info ? info.a : (seg.s0 - gg.s0 + sub.sa);

  // nudos del grupo que quedan dentro del trozo
  const pts = [{x:O.x, y:O.y, nom:O.nombre, n:O}];
  let ac = sIni;
  gg.tramos.forEach(t2=>{
    ac += t2.L;
    if(ac < sCut - 1e-9) pts.push({x:t2.hasta.x, y:t2.hasta.y, nom:t2.hasta.nombre, n:t2.hasta});
  });
  const todos = pts.concat([P]);

  let minx=Infinity, maxx=-Infinity, miny=Infinity, maxy=-Infinity;
  todos.forEach(p=>{ minx=Math.min(minx,p.x); maxx=Math.max(maxx,p.x);
                     miny=Math.min(miny,p.y); maxy=Math.max(maxy,p.y); });
  const dxB = Math.max(maxx-minx, 1e-6), dyB = Math.max(maxy-miny, 1e-6);
  const k = Math.min(2.4, 10.0/dxB, 5.6/dyB);
  const X = x => (x-minx)*k, Y = y => (y-miny)*k;
  const F = n => n.toFixed(3);
  tzReiniciar();

  // Ejes locales y puntos clave, que necesitan tanto las cargas como las cotas.
  const ux = seg.ux, uy = seg.uy, nx = -uy, ny = ux;
  const px = X(P.x), py = Y(P.y);
  let nxq = nx, nyq = ny;
  if(nyq > 0){ nxq = -nxq; nyq = -nyq; }        // hacia el lado libre (abajo)
  const rCut = sCut - sIni;
  const pxU = Math.hypot(px - X(O.x), py - Y(O.y)) / (rCut || 1);
  // Punto del eje a la abscisa r del grupo, separado sep hacia el lado libre.
  const qEje = (r, sep) => ({x: X(O.x) + ux*(r*pxU) + nxq*sep,
                             y: Y(O.y) + uy*(r*pxU) + nyq*sep});

  let out = '';
  for(let i=0;i<todos.length-1;i++){
    out += '\\draw[line width=1.7pt, color=bsaAcc2] (' + F(X(todos[i].x)) + ',' + F(Y(todos[i].y))
         + ') -- (' + F(X(todos[i+1].x)) + ',' + F(Y(todos[i+1].y)) + ');\n';
    tzOcuparTrazo(X(todos[i].x), Y(todos[i].y), X(todos[i+1].x), Y(todos[i+1].y), 0.09);
  }
  pts.forEach((p,i)=>{
    out += '\\filldraw[color=bsaAcc2] (' + F(X(p.x)) + ',' + F(Y(p.y)) + ') circle (0.055);\n';
    out += '\\node[below left, font=\\scriptsize\\bfseries, color=bsaAcc2] at ('
         + F(X(p.x)) + ',' + F(Y(p.y)) + ') {' + escLatex(p.nom) + '};\n';
    tzOcupar(X(p.x)-0.36, Y(p.y)-0.38, X(p.x)+0.06, Y(p.y)-0.02);
    // El apoyo se dibuja tal cual: así el alumno ve de dónde salen las
    // reacciones. En los grupos siguientes al primero, el nudo de arranque
    // ya está representado por N0, V0 y M0 y no lleva apoyo.
    const esArranque = (i === 0);
    if(p.n && p.n.apoyo && p.n.apoyo !== 'libre' && (primero || !esArranque)){
      out += tikzApoyo(X(p.x), Y(p.y), p.n.apoyo, 0.9, -1);
      tzOcupar(X(p.x)-0.42, Y(p.y)-0.62, X(p.x)+0.42, Y(p.y)-0.02);
    }
    if(p.n && p.n.rotula && !esArranque)
      out += '\\filldraw[fill=white, draw=bsaAcc2, line width=.8pt] (' + F(X(p.x)) + ',' + F(Y(p.y)) + ') circle (0.09);\n';
  });

  // ── Cargas repartidas hasta el corte ──
  // Van las PRIMERAS para que su bloque quede por debajo de las flechas y de
  // los arcos de momento, que antes tapaba.
  const marcasCota = [];        // abscisas que merecen cota (centroides, inicios)
  const brazos = [];            // {r, tex} brazo de cada resultante hasta el corte
  cargasConPeso().filter(c=>c.tipo==='U'||c.tipo==='T').forEach(c=>{
    const z = trozoCargado(c);
    if(!z || z.len <= 1e-12) return;
    const el = gg.tramos.find(t2=>t2.tramo && t2.tramo.id === c.tramo);
    if(!el) return;
    const inv = (el.invert);
    const offT = el.s0 - gg.s0;
    const r1 = inv ? (z.g.L - z.s2) : z.s1;
    const r2Tot = inv ? (z.g.L - z.s1) : z.s2;
    const hasta = Math.min(el.L, sCut - el.s0);
    if(hasta <= 1e-9) return;
    const r2 = Math.min(r2Tot, hasta);
    if(r2 <= r1 + 1e-9) return;
    const g1 = offT + r1, g2 = offT + r2Tot;
    // Activa = sigue actuando cuando la sección recorre el intervalo. Su
    // resultante depende de la abscisa y NO puede escribirse como un número.
    const activa = (g2 > A0 + 1e-6);
    const wFin = (c.tipo==='U') ? c.mag : (c.mag2||0);
    const wA = inv ? wFin : c.mag, wBtot = inv ? c.mag : wFin;
    const kw = (wBtot - wA)/(r2Tot - r1);
    const w1 = wA, w2 = wA + kw*(r2 - r1);   // intensidad al inicio y en el corte
    const wm = Math.max(Math.abs(w1), Math.abs(w2), 1e-9);
    const A = {x:X(el.desde.x+el.ux*r1), y:Y(el.desde.y+el.uy*r1)};
    const B = {x:X(el.desde.x+el.ux*r2), y:Y(el.desde.y+el.uy*r2)};
    const d = dirCarga(c, geoTramo(el.tramo));
    const ex = -d.x, ey = -d.y, alt = 0.55;
    const h1 = alt*w1/wm, h2 = alt*w2/wm;
    out += '\\draw[color=bsaDist, fill=bsaDist!12] (' + F(A.x) + ',' + F(A.y)
         + ') -- (' + F(A.x+ex*h1) + ',' + F(A.y+ey*h1)
         + ') -- (' + F(B.x+ex*h2) + ',' + F(B.y+ey*h2)
         + ') -- (' + F(B.x) + ',' + F(B.y) + ') -- cycle;\n';
    for(let i=0;i<=4;i++){
      const t3=i/4, xi=A.x+(B.x-A.x)*t3, yi=A.y+(B.y-A.y)*t3, hi=h1+(h2-h1)*t3;
      const sg = Math.sign(hi)||1;
      if(Math.abs(hi) < 0.10) continue;
      out += '\\draw[-{Latex[length=1.4mm]}, color=bsaDist, line width=.7pt] ('
           + F(xi+ex*hi) + ',' + F(yi+ey*hi) + ') -- (' + F(xi+ex*0.04*sg) + ',' + F(yi+ey*0.04*sg) + ');\n';
    }
    tzOcuparBloque(A, B, ex, ey, h1, h2);
    const sgR = (Math.abs(h1) >= Math.abs(h2) ? Math.sign(h1) : Math.sign(h2)) || 1;
    const etiquetaW = () => tzTexto(
      (A.x+B.x)/2+ex*sgR*(alt+0.24), (A.y+B.y)/2+ey*sgR*(alt+0.24),
      '$w=' + dec(Math.abs(w1),'fuerza') + (Math.abs(w1-w2)>1e-9 ? '\\to' + dec(Math.abs(w2),'fuerza') : '')
      + '$\\,' + escLatex(uDist()),
      'font=\\tiny, color=bsaDist!70!black', ex*sgR, ey*sgR);

    // Resultantes, en trazo discontinuo y con su punto de aplicación.
    // Cada una se dibuja donde de verdad actúa, para que el brazo del
    // desarrollo se pueda medir sobre el propio dibujo.
    const flecha = (rLocal, val, lab, largo)=>{
      if(Math.abs(val) < 1e-9) return;
      const Cq = {x:X(el.desde.x+el.ux*rLocal), y:Y(el.desde.y+el.uy*rLocal)};
      const sA = Math.sign(val) || 1;
      const dx = d.x*sA, dy = d.y*sA;
      out += '\\draw[-{Latex[length=2mm]}, color=bsaDist!60!black, dashed, line width=1pt] ('
           + F(Cq.x-dx*largo) + ',' + F(Cq.y-dy*largo) + ') -- (' + F(Cq.x-dx*0.08) + ',' + F(Cq.y-dy*0.08) + ');\n';
      tzOcuparTrazo(Cq.x-dx*largo, Cq.y-dy*largo, Cq.x-dx*0.08, Cq.y-dy*0.08, 0.06);
      out += tzTexto(Cq.x-dx*(largo+0.22), Cq.y-dy*(largo+0.22), lab,
                     'font=\\tiny, color=bsaDist!60!black', -dx, -dy);
    };
    const tr = r2 - r1;
    if(!activa){
      // Terminó antes del intervalo: es una fuerza conocida en su centroide.
      const Ares = (w1+w2)/2*tr;
      if(Math.abs(Ares) > 1e-9){
        const dc = tr*(w1+2*w2)/(3*(w1+w2));
        flecha(r1+dc, Ares, '$W=' + Fz(Ares) + '$', alt + 0.85);
        marcasCota.push(g1 + dc);
        // Su brazo hasta la sección también se acota: es el que entra en la
        // ecuación de momentos y no se lee de la cadena de posiciones.
        brazos.push({r: g1 + dc, tex: '$' + brazo(g1 + dc) + '$'});
      }
    } else {
      // La sección cae dentro: rectángulo (intensidad inicial) y triángulo (lo
      // que crece), cada uno con su resultante en función de la abscisa.
      marcasCota.push(g1);
      if(Math.abs(w1) > 1e-9){
        flecha(r1 + tr/2, w1*tr, '$W_1=' + Fz(w1) + '\\,' + brazo(g1) + '$', alt + 0.85);
        brazos.push({r: g1 + tr/2, tex: '$\\tfrac{1}{2}' + brazo(g1) + '$'});
      }
      if(Math.abs(kw) > 1e-9){
        flecha(r1 + tr*2/3, kw*tr*tr/2,
               '$W_2=\\tfrac{1}{2}\\,' + Fz(kw) + '\\,' + brazo(g1) + '^{2}$', alt + 1.35);
        brazos.push({r: g1 + tr*2/3, tex: '$\\tfrac{1}{3}' + brazo(g1) + '$'});
      }
    }
    out += etiquetaW();
  });

  // ── Banda de cotas ──
  // Debajo de la viga irán los brazos y la cadena de posiciones. Se reserva
  // esa banda ANTES de rotular las fuerzas, para que ningún valor caiga sobre
  // una línea de cota: los rótulos buscan sitio por encima o a los lados.
  // Una reacción bajo un apoyo baja hasta 1.30 y lleva su valor al costado;
  // la flecha V de la cara cortada, hasta 0.92: la banda empieza debajo.
  const hayBajoApoyo = (R.internas.puntuales || []).some(o=>{
    if(o.s === null) return false;
    if(primero ? (o.s < sIni - EPS) : (o.s <= sIni + EPS)) return false;
    if(o.s >= sCut - EPS) return false;
    const a = o.a, Fm = Math.hypot(a.fx, a.fy);
    return Fm > 1e-12 && a.reac && a.nodo && a.nodo.apoyo && a.nodo.apoyo !== 'libre' && a.fy/Fm > 0.5;
  });
  const BRAZO0 = hayBajoApoyo ? 1.62 : 1.25, BRAZO_SALTO = 0.50;
  const bandaIni = BRAZO0 - 0.14;
  const bandaFin = BRAZO0 + brazos.length*BRAZO_SALTO + 0.30 + 4*0.36 + 0.9;
  const iBanda = _tzCajas.length;
  for(let m=0;m<8;m++){
    const p1 = qEje(rCut*m/8, bandaIni), p2 = qEje(rCut*(m+1)/8, bandaFin);
    tzOcupar(Math.min(p1.x,p2.x), Math.min(p1.y,p2.y), Math.max(p1.x,p2.x), Math.max(p1.y,p2.y));
  }

  // ── Solicitaciones heredadas en el nudo de arranque (grupos 2.º en adelante) ──
  const t0 = gg.tramos[0], su0 = t0.subs[0];
  const ox = X(O.x), oy = Y(O.y);
  if(!primero){
    const N0 = polyVal(su0.cN, 0), V0 = polyVal(su0.cV, 0), M0 = polyVal(su0.cM, 0);
    const u0x = t0.ux, u0y = t0.uy, n0x = -u0y, n0y = u0x;
    // N0 positivo = tracción: sobre esta cara tira hacia afuera (hacia atrás)
    if(Math.abs(N0) > EPS){
      const s = N0 > 0 ? -1 : 1;
      out += '\\draw[-{Latex[length=2mm]}, color=bsaAcc, line width=1pt] ('
           + F(ox+s*u0x*0.12) + ',' + F(oy+s*u0y*0.12) + ') -- (' + F(ox+s*u0x*1.0) + ',' + F(oy+s*u0y*1.0) + ');\n';
      tzOcuparTrazo(ox+s*u0x*0.12, oy+s*u0y*0.12, ox+s*u0x*1.0, oy+s*u0y*1.0, 0.07);
      out += tzTexto(ox+s*u0x*1.25, oy+s*u0y*1.25, '$N_0=' + dec(N0,'fuerza') + '$',
                     'font=\\tiny, color=bsaAcc', s*u0x, s*u0y);
    }
    // V0 positivo: sobre la cara de arranque actúa hacia arriba de la normal
    if(Math.abs(V0) > EPS){
      const s = V0 > 0 ? 1 : -1;
      out += '\\draw[-{Latex[length=2mm]}, color=bsaAcc, line width=1pt] ('
           + F(ox-s*n0x*0.95) + ',' + F(oy-s*n0y*0.95) + ') -- (' + F(ox-s*n0x*0.10) + ',' + F(oy-s*n0y*0.10) + ');\n';
      tzOcuparTrazo(ox-s*n0x*0.95, oy-s*n0y*0.95, ox-s*n0x*0.10, oy-s*n0y*0.10, 0.07);
      out += tzTexto(ox-s*n0x*1.20, oy-s*n0y*1.20, '$V_0=' + dec(V0,'fuerza') + '$',
                     'font=\\tiny, color=bsaAcc', -s*n0x, -s*n0y);
    }
    if(Math.abs(M0) > EPS){
      const arc = M0 > 0 ? '(0:-300:0.30)' : '(0:300:0.30)';   // M0 positivo: horario sobre esta cara
      out += '\\draw[-{Latex[length=1.8mm]}, color=bsaMomento, line width=1pt] ('
           + F(ox+0.30) + ',' + F(oy) + ') arc ' + arc + ';\n';
      tzOcupar(ox-0.36, oy-0.36, ox+0.36, oy+0.36);
      out += tzTexto(ox-0.85, oy+0.62, '$M_0=' + dec(M0,'momento') + '$',
                     'font=\\tiny, color=bsaMomento', -1, 1);
    }
  }

  // ── Acciones puntuales del trozo: reacciones (con nombre), cargas y pares ──
  (R.internas.puntuales || []).forEach(o=>{
    if(o.s === null) return;
    if(primero ? (o.s < sIni - EPS) : (o.s <= sIni + EPS)) return;
    if(o.s >= sCut - EPS) return;
    const a = o.a, x = X(a.x), y = Y(a.y);
    const Fm = Math.hypot(a.fx, a.fy);
    const col = a.reac ? 'bsaReac' : 'bsaCarga';
    const nom = nombreAccion(a);
    if(Fm > 1e-12){
      const ex = a.fx/Fm, ey = a.fy/Fm;
      // La reacción sale del apoyo: si el nudo tiene apoyo dibujado, la flecha
      // arranca por debajo de él para no taparlo.
      const bajoApoyo = (a.reac && a.nodo && a.nodo.apoyo && a.nodo.apoyo !== 'libre' && ey > 0.5);
      const larga = bajoApoyo ? 1.30 : 0.85, corta = bajoApoyo ? 0.62 : 0.10;
      out += '\\draw[-{Latex[length=2mm]}, color=' + col + ', line width=1pt] ('
           + F(x-ex*larga) + ',' + F(y-ey*larga) + ') -- (' + F(x-ex*corta) + ',' + F(y-ey*corta) + ');\n';
      tzOcuparTrazo(x-ex*larga, y-ey*larga, x-ex*corta, y-ey*corta, 0.07);
      const lab = a.reac ? '$' + nom.tex + '=' + Fz(Fm) + '$' : Fz(Fm) + '\\,' + uF;
      if(ey > 0.5){
        // Fuerza hacia arriba: su cola cae bajo la viga, en la banda de cotas,
        // así que el valor va al costado de la flecha, hacia afuera del trozo.
        const s = (x <= (X(minx)+X(maxx))/2) ? -1 : 1;
        const yl = bajoApoyo ? (larga+corta)/2 : 0.30;
        // el rótulo se centra ya fuera de la flecha: con un desplazamiento
        // fijo su caja pisaba el propio trazo y salía disparado con guía
        const wl = tzAncho(lab, 'font=\\tiny');
        out += tzTexto(x + s*(wl/2 + 0.14), y - ey*yl, lab, 'font=\\tiny, color=' + col, s, 0);
      } else {
        out += tzTexto(x-ex*(larga+0.22), y-ey*(larga+0.22), lab, 'font=\\tiny, color=' + col, -ex, -ey);
      }
    }
    if(Math.abs(a.m) > 1e-12){
      const colM = a.reac ? 'bsaReac' : 'bsaMomento';
      const arc = a.m > 0 ? '(0:300:0.28)' : '(0:-300:0.28)';
      out += '\\draw[-{Latex[length=1.8mm]}, color=' + colM + ', line width=1pt] ('
           + F(x+0.28) + ',' + F(y) + ') arc ' + arc + ';\n';
      tzOcupar(x-0.34, y-0.34, x+0.34, y+0.34);
      const lab = a.reac ? '$' + nom.tex + '=' + dec(Math.abs(a.m),'momento') + '$' : dec(Math.abs(a.m),'momento') + '\\,' + uM;
      out += tzTexto(x+0.55, y+0.32, lab, 'font=\\tiny, color=' + colM, 1, 1);
    }
  });

  // ── Cara del corte: N, V y M en sentido positivo ──
  out += '\\draw[color=bsaAcc, line width=1pt] (' + F(px+nx*0.24) + ',' + F(py+ny*0.24)
       + ') -- (' + F(px-nx*0.24) + ',' + F(py-ny*0.24) + ');\n';
  out += tzTexto(px+nx*0.40, py+ny*0.40, '$S$', 'font=\\scriptsize\\itshape, color=bsaAcc', nx, ny);
  out += '\\draw[-{Latex[length=2mm]}, color=bsaAcc, line width=1pt] (' + F(px+ux*0.12) + ',' + F(py+uy*0.12)
       + ') -- (' + F(px+ux*0.88) + ',' + F(py+uy*0.88) + ');\n';
  out += tzTexto(px+ux*1.08, py+uy*1.08, '$N$', 'font=\\scriptsize, color=bsaAcc', ux, uy);
  out += '\\draw[-{Latex[length=2mm]}, color=bsaAcc, line width=1pt] (' + F(px) + ',' + F(py)
       + ') -- (' + F(px-nx*0.72) + ',' + F(py-ny*0.72) + ');\n';
  out += tzTexto(px-nx*0.92, py-ny*0.92, '$V$', 'font=\\scriptsize, color=bsaAcc', -nx, -ny);
  out += '\\draw[-{Latex[length=1.8mm]}, color=bsaAcc, line width=1pt] ('
       + F(px-ux*0.42+0.26) + ',' + F(py-uy*0.42) + ') arc (0:300:0.26);\n';
  // El rótulo del momento huye PERPENDICULAR al eje, no siempre hacia arriba:
  // en un elemento vertical se metía justo debajo de la N.
  out += tzTexto(px-ux*0.42+nx*0.42, py-uy*0.42+ny*0.42, '$M$',
                 'font=\\scriptsize, color=bsaAcc', nx, ny);

  // La banda ya cumplió su papel (los rótulos de fuerzas quedaron fuera de
  // ella); se libera para que las cotas se repartan con su propio criterio.
  _tzCajas.splice(iBanda, 8);

  // ── Brazos de las resultantes repartidas, medidos hasta el corte ──
  // Se acotan aparte porque son los que entran en la ecuación de momentos y
  // no se pueden leer de la cadena de posiciones.
  let SEP0 = BRAZO0;
  brazos.slice(0, 3).forEach((bz, i)=>{
    const sep = BRAZO0 + i*BRAZO_SALTO;
    const p1 = qEje(bz.r, sep), p2 = qEje(rCut, sep);
    out += '\\draw[bsaDist!70!black, line width=.45pt, {Latex[length=1.2mm]}-{Latex[length=1.2mm]}] ('
         + F(p1.x) + ',' + F(p1.y) + ') -- (' + F(p2.x) + ',' + F(p2.y) + ');\n';
    tzOcuparTrazo(p1.x, p1.y, p2.x, p2.y, 0.04);
    out += tzTextoFijo((p1.x+p2.x)/2, (p1.y+p2.y)/2, bz.tex, 'font=\\tiny, color=bsaDist!70!black');
    SEP0 = sep + BRAZO_SALTO;
  });

  // ── Cotas PARALELAS al eje: posiciones de las acciones, inicios y
  //    centroides de las repartidas, y la abscisa completa en el nivel
  //    exterior ──
  const marcas = [0, rCut];
  (R.internas.puntuales || []).forEach(o=>{
    if(o.s === null) return;
    const rr = o.s - sIni;
    if(rr > 1e-6 && rr < rCut - 1e-6) marcas.push(rr);
  });
  marcasCota.forEach(cq=>{ if(cq > 1e-6 && cq < rCut - 1e-6) marcas.push(cq); });
  const uniq = [...new Set(marcas.map(v=>+v.toFixed(4)))].sort((a,b)=>a-b);
  const BASE = Math.max(0.78, SEP0 + 0.24), SALTO = 0.36;
  let niv = -1;
  if(uniq.length > 2){
    const plan = planCotas(uniq, v => v*pxU*100, t => tzAncho(t)*100,
                           {maxNiveles:4, minSeg:16, fusion:8, holgura:15});
    if(plan){
      niv = plan.nMax;
      const e0=qEje(plan.coords[0],BASE), e1=qEje(plan.coords[plan.coords.length-1],BASE);
      out += '\\draw[black!75, line width=.5pt] (' + F(e0.x) + ',' + F(e0.y)
           + ') -- (' + F(e1.x) + ',' + F(e1.y) + ');\n';
      plan.coords.forEach(v=>{ const p2=qEje(v,BASE);
        out += '\\draw[black!75, line width=.6pt] (' + F(p2.x-(ux-nxq)*0.08) + ',' + F(p2.y-(uy-nyq)*0.08)
             + ') -- (' + F(p2.x+(ux-nxq)*0.08) + ',' + F(p2.y+(uy-nyq)*0.08) + ');\n'; });
      plan.segs.forEach((sg,m)=>{
        if(!sg.visible) return;
        const d0 = plan.coords[m];
        const ult = (m === plan.segs.length-1);
        const txt = ult ? (Math.abs(d0)<1e-6 ? '$'+gg.simbolo+'$'
                          : '$'+gg.simbolo+' - '+dec(d0,'len')+'$') : sg.txt;
        const pm = qEje((plan.coords[m]+plan.coords[m+1])/2, BASE+0.22+sg.nivel*SALTO);
        out += tzTextoFijo(pm.x, pm.y, txt, 'font=\\tiny, color=black!75');
      });
    }
  }
  // abscisa completa, en el nivel exterior
  let SEP = BASE + 0.24 + (niv+1)*SALTO + (niv>=0 ? 0.26 : 0);
  const _lineaLibre = sep => {
    const p1 = qEje(0, sep), p2 = qEje(rCut, sep);
    for(let m=0;m<6;m++){
      const f0=m/6, f1=(m+1)/6;
      const c={x0:Math.min(p1.x+(p2.x-p1.x)*f0, p1.x+(p2.x-p1.x)*f1)-0.05,
               x1:Math.max(p1.x+(p2.x-p1.x)*f0, p1.x+(p2.x-p1.x)*f1)+0.05,
               y0:Math.min(p1.y+(p2.y-p1.y)*f0, p1.y+(p2.y-p1.y)*f1)-0.05,
               y1:Math.max(p1.y+(p2.y-p1.y)*f0, p1.y+(p2.y-p1.y)*f1)+0.05};
      if(tzChoca(c)) return false;
    }
    return true;
  };
  for(let k2=0; k2<5 && !_lineaLibre(SEP); k2++) SEP += 0.32;
  const a1 = qEje(0, SEP), b1 = qEje(rCut, SEP);
  tzOcuparTrazo(a1.x, a1.y, b1.x, b1.y, 0.05);
  out += '\\draw[bsaMuted, line width=.5pt] (' + F(a1.x) + ',' + F(a1.y)
       + ') -- (' + F(b1.x) + ',' + F(b1.y) + ');\n';
  [a1,b1].forEach(p2=>{
    out += '\\draw[bsaMuted, line width=.7pt] (' + F(p2.x-(ux-nxq)*0.09) + ',' + F(p2.y-(uy-nyq)*0.09)
         + ') -- (' + F(p2.x+(ux-nxq)*0.09) + ',' + F(p2.y+(uy-nyq)*0.09) + ');\n';
  });
  out += tzTextoFijo((a1.x+b1.x)/2, (a1.y+b1.y)/2, '$' + gg.simbolo + '$',
                     'font=\\scriptsize, color=bsaMuted');
  return out;
}
