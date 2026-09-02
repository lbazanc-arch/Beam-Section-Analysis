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
    cargas=(e.cargas||[]).slice();
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
const TZ_ALTO_TXT = 0.20;      // alto aproximado de una línea \scriptsize
const TZ_ANCHO_CAR = 0.105;    // ancho medio por carácter
let _tzCajas = [];

function tzReiniciar(){ _tzCajas = []; }
function tzAncho(txt){ return String(txt).length * TZ_ANCHO_CAR + 0.10; }
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
// Rótulo que busca hueco. dirX/dirY marcan hacia dónde apartarse.
function tzTexto(x, y, txt, opts, dirX, dirY){
  const w = tzAncho(txt), h = TZ_ALTO_TXT;
  const dx0 = (dirX === undefined) ? 0 : dirX;
  const dy0 = (dirY === undefined) ? 1 : dirY;
  const paso = h + 0.06;
  for(let k=0;k<8;k++){
    for(const lado of (k===0 ? [0] : [0,-1,1])){
      const ox = dx0*paso*k + lado*w*0.6, oy = dy0*paso*k;
      const c = {x0:x+ox-w/2, y0:y+oy-h/2, x1:x+ox+w/2, y1:y+oy+h/2};
      if(!tzChoca(c)){
        _tzCajas.push(c);
        return '\\node[' + (opts || 'font=\\scriptsize') + '] at ('
             + (x+ox).toFixed(3) + ',' + (y+oy).toFixed(3) + ') {' + txt + '};\n';
      }
    }
  }
  return '';    // sin hueco: mejor omitir que amontonar
}

// Cadena de cotas VERTICAL: misma lógica, pero los niveles se apilan hacia
// la derecha y las etiquetas van giradas 90°, como en un plano.
function tzCadenaCotasY(valores, Yn, xBase, color, opts){
  const o = Object.assign({salto:0.34, tick:0.09, maxNiveles:3}, opts||{});
  if(!valores || valores.length < 2) return {tikz:'', nMax:-1};
  const ESC = 100;
  const plan = planCotas(valores, v => Yn(v)*ESC, t => tzAncho(t)*ESC,
                         {maxNiveles:o.maxNiveles, minSeg:18, fusion:8, holgura:10});
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
  const o = Object.assign({salto:0.30, tick:0.09, maxNiveles:4}, opts||{});
  if(!valores || valores.length < 2) return {tikz:'', nMax:-1};
  // planCotas trabaja en píxeles; aquí la "posición" es la x del dibujo en
  // cm, y el "ancho" el del texto en cm. Se escala por 100 para reutilizarlo
  // con sus umbrales, pensados para píxeles.
  const ESC = 100;
  const plan = planCotas(valores, v => Xn(v)*ESC, t => tzAncho(t)*ESC,
                         {maxNiveles:o.maxNiveles, minSeg:18, fusion:8, holgura:10});
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
    const yy = yBase - 0.16 - sg.nivel*o.salto;
    if(sg.nivel > 0)
      out += '\\draw[' + (col.indexOf('!')>=0 ? col : col+'!45') + ', line width=.3pt] (' + xm.toFixed(3) + ','
           + (yBase-0.04).toFixed(3) + ') -- (' + xm.toFixed(3) + ',' + (yy+0.09).toFixed(3) + ');\n';
    // La unidad se pone solo en la ÚLTIMA cota de la fila: repetirla en
    // todas ensancharía cada etiqueta y obligaría a escalonar de más.
    const ult = (m === plan.segs.length - 1);
    out += tzTexto(xm, yy, sg.txt + (ult ? '\\,' + escLatex(unitLen) : ''),
                   'font=\\scriptsize, color=' + col, 0, -1);
  });
  return {tikz:out, nMax:plan.nMax};
}

// Términos que componen el lado derecho de una ecuación de equilibrio.
// e = 0 -> suma de Fx ; 1 -> suma de Fy ; 2 -> momentos respecto al origen ;
// 3+ -> momentos a un lado de cada rótula.
function terminosEquilibrio(R, e){
  const trm = [];
  const push = (v, det) => {
    if(Math.abs(v) < 1e-9) return;
    const sg = trm.length ? (v < 0 ? '-' : '+') : (v < 0 ? '-' : '');
    trm.push(sg + (det || dec(Math.abs(v), e>=2 ? 'momento' : 'fuerza')));
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
  if(e === 0){
    lista.forEach(o=>push(o.fx));
    return trm.length ? [trm.join(' ').replace(/^\+/, '')] : [];
  }
  if(e === 1){
    lista.forEach(o=>push(o.fy));
    return trm.length ? [trm.join(' ').replace(/^\+/, '')] : [];
  }
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
    else if(Math.abs(o.m) > 1e-9 && Math.abs(o.fx) < 1e-9 && Math.abs(o.fy) < 1e-9)
      det = dec(Math.abs(o.m),'momento');
    else
      det = dec(Math.abs(mv),'momento');
    push(mv, det);
  });
  return trm.length ? [trm.join(' ').replace(/^\+/, '')] : [];
}

// ── Desarrollo paso a paso de las reacciones ──
// Reconstruye cada ecuación de equilibrio con sus términos: primero en
// símbolos, después con los números sustituidos. Usa la MISMA matriz que
// resolvió el sistema, así que lo escrito y lo calculado no pueden
// discrepar.
function pasoAPasoReacciones(R){
  if(!R || R.error || !R.inc.length) return '';
  const simb = (u) => {
    const b = escLatex(u.n.nombre);
    if(u.ang !== undefined) return 'R_{' + b + '}';
    return (u.tipo==='Rx' ? 'R_{x' : (u.tipo==='Ry' ? 'R_{y' : 'M_{')) + b + '}';
  };
  const nEq = R.A.length;
  const nomEq = [];
  nomEq.push('\\sum F_x = 0');
  nomEq.push('\\sum F_y = 0');
  nomEq.push('\\sum M_O = 0 \\quad\\text{(momentos respecto al origen)}');
  for(let e=3;e<nEq;e++)
    nomEq.push('\\sum M = 0 \\quad\\text{(r\\\'otula ' + (e-2) + ': momento nulo a un lado)}');

  let out = '\\noindent{\\bfseries\\color{bsaAcc2} Desarrollo}\\\\[3pt]\n';
  // Diagrama de cuerpo libre global: la viga con sus cargas Y con las
  // reacciones dibujadas como incógnitas, para que se vea el sentido
  // positivo supuesto de cada una antes de plantear las ecuaciones.
  out += '\\begin{center}\\begin{tikzpicture}\n' + tikzViga(true)
       + '\\end{tikzpicture}\n'
       + '\\\\[2pt]{\\footnotesize\\color{bsaMuted} Cuerpo libre global: cargas '
       + 'aplicadas y reacciones incógnita, en su sentido positivo supuesto.}\n'
       + '\\end{center}\\vspace{4pt}\n';
  out += '\\noindent Cada ecuaci\\\'on se escribe con las inc\\\'ognitas a la '
       + 'izquierda y las cargas conocidas a la derecha.\\\\[4pt]\n';

  for(let e=0;e<nEq;e++){
    // lado izquierdo: coeficientes por incógnita
    const trm = [];
    R.inc.forEach((u,j)=>{
      const a = R.A[e][j];
      if(Math.abs(a) < 1e-9) return;
      const co = Math.abs(Math.abs(a)-1) < 1e-9 ? '' : dec(Math.abs(a),'len');
      trm.push((trm.length ? (a<0 ? ' - ' : ' + ') : (a<0 ? '-' : '')) + co + simb(u));
    });
    const izq = trm.length ? trm.join('') : '0';
    out += '$$' + nomEq[e] + '$$\n';
    // Desglose del lado derecho: de dónde sale ese número. Se recorre la
    // MISMA lista de acciones que usó el sistema, así que la suma escrita
    // coincide por construcción con el valor resuelto.
    const det = terminosEquilibrio(R, e);
    const uEq  = (e>=2) ? unidadMomento() : unitFor;
    const valB = dec(R.b[e], e>=2 ? 'momento' : 'fuerza');
    // Fila 1: el desglose completo. Fila 2: la ecuación ya reducida, que es
    // la que se arrastra al siguiente paso. Antes iban en una sola línea y
    // el resultado quedaba enterrado al final del desarrollo.
    if(det.length) out += '$$' + izq + ' = ' + det.join(' ') + '$$\n';
    out += '$$' + izq + ' = ' + valB + '\\ \\text{' + escLatex(uEq) + '}$$\n';

    // Fila 3: si la ecuación deja una sola incógnita, se despeja aquí mismo.
    const vivos = [];
    R.inc.forEach((u,j)=>{ if(Math.abs(R.A[e][j]) > 1e-9) vivos.push({u, j, a:R.A[e][j]}); });
    if(vivos.length === 1){
      const v = vivos[0];
      const esMom = (v.u.tipo === 'M' && v.u.ang === undefined);
      const uInc = esMom ? unidadMomento() : unitFor;
      out += '$$' + simb(v.u) + ' = ' + dec(R.val[v.j], esMom ? 'momento' : 'fuerza')
           + '\\ \\text{' + escLatex(uInc) + '}$$\n';
    }
  }

  // comprobación: sustituir los valores hallados
  out += '\\noindent Sustituyendo los valores obtenidos, cada ecuaci\\\'on cierra:\\\\[3pt]\n';
  out += '\\begin{center}\\begin{tabular}{lrr}\n\\hline\n'
       + 'Ecuaci\\\'on & Suma con los valores & Residuo \\\\\n\\hline\n';
  for(let e=0;e<nEq;e++){
    let acc = 0;
    R.inc.forEach((u,j)=>{ acc += R.A[e][j]*R.val[j]; });
    const nom = e===0 ? '$\\sum F_x$' : (e===1 ? '$\\sum F_y$'
              : (e===2 ? '$\\sum M_O$' : '$\\sum M$ (r\\\'otula ' + (e-2) + ')'));
    const u2 = e>=2 ? 'momento' : 'fuerza';
    out += nom + ' & ' + dec(acc,u2) + ' & ' + dec(acc - R.b[e], u2) + ' \\\\\n';
  }
  out += '\\hline\n\\end{tabular}\\end{center}\n\\vspace{4pt}\n';
  return out;
}

// ── DCL del trozo cortado, en TikZ ──
// Sustituye a la tabla de acciones: se ve la porción de viga que queda
// antes del corte, con sus cargas, sus reacciones y las tres solicitaciones
// en la cara cortada, todo acotado. Reutiliza el colocador de rótulos, así
// que las etiquetas se apartan en vez de pisarse.
function tikzDCLSub(R, gg, seg, sub){
  // El DCL muestra SOLO el grupo que se está analizando, desde su nudo de
  // arranque hasta el corte. Todo lo que hay antes se sustituye por las tres
  // solicitaciones que llegan a ese nudo, que son justamente los valores
  // extremos ya calculados. Dibujar los tramos anteriores era engañoso: en
  // un tramo inclinado la abscisa r no corre sobre ellos.
  const sIni = gg.s0;
  const sCut = seg.s0 + sub.sb;
  const O = gg.desde;
  const P = {x: seg.desde.x + seg.ux*sub.sb, y: seg.desde.y + seg.uy*sub.sb};

  // nudos del grupo que quedan dentro del trozo
  const pts = [{x:O.x, y:O.y, nom:O.nombre}];
  let ac = sIni;
  gg.tramos.forEach(t2=>{
    ac += t2.L;
    if(ac < sCut - 1e-9) pts.push({x:t2.hasta.x, y:t2.hasta.y, nom:t2.hasta.nombre});
  });
  const todos = pts.concat([P]);

  let minx=Infinity, maxx=-Infinity, miny=Infinity, maxy=-Infinity;
  todos.forEach(p=>{ minx=Math.min(minx,p.x); maxx=Math.max(maxx,p.x);
                     miny=Math.min(miny,p.y); maxy=Math.max(maxy,p.y); });
  // El tramo se dibuja inclinado, tal cual está en la estructura. Para que
  // no ocupe un cuadrado enorme, la escala se limita por separado en ancho y
  // en alto: usando un solo "span" el diagonal mandaba y sobraba altura.
  const dxB = Math.max(maxx-minx, 1e-6), dyB = Math.max(maxy-miny, 1e-6);
  const k = Math.min(2.4, 9.6/dxB, 4.4/dyB);
  const X = x => (x-minx)*k, Y = y => (y-miny)*k;
  const F = n => n.toFixed(3);
  tzReiniciar();

  let out = '';
  for(let i=0;i<todos.length-1;i++)
    out += '\\draw[line width=1.7pt, color=bsaAcc2] (' + F(X(todos[i].x)) + ',' + F(Y(todos[i].y))
         + ') -- (' + F(X(todos[i+1].x)) + ',' + F(Y(todos[i+1].y)) + ');\n';
  pts.forEach(p=>{
    out += '\\filldraw[color=bsaAcc2] (' + F(X(p.x)) + ',' + F(Y(p.y)) + ') circle (0.055);\n';
    out += '\\node[below left, font=\\scriptsize\\bfseries, color=bsaAcc2] at ('
         + F(X(p.x)) + ',' + F(Y(p.y)) + ') {' + escLatex(p.nom) + '};\n';
    tzOcupar(X(p.x)-0.36, Y(p.y)-0.38, X(p.x)+0.06, Y(p.y)-0.02);
  });

  const ux = seg.ux, uy = seg.uy, nx = -uy, ny = ux;

  // ── Solicitaciones heredadas en el nudo de arranque ──
  const t0 = gg.tramos[0], su0 = t0.subs[0];
  const N0 = polyVal(su0.cN, 0), V0 = polyVal(su0.cV, 0), M0 = polyVal(su0.cM, 0);
  const ox = X(O.x), oy = Y(O.y);
  const u0x = t0.ux, u0y = t0.uy, n0x = -u0y, n0y = u0x;
  if(Math.abs(N0) > 1e-9){
    out += '\\draw[-{Latex[length=2mm]}, color=bsaAcc, line width=1pt] ('
         + F(ox-u0x*1.05) + ',' + F(oy-u0y*1.05) + ') -- (' + F(ox-u0x*0.12) + ',' + F(oy-u0y*0.12) + ');\n';
    out += tzTexto(ox-u0x*1.30, oy-u0y*1.30, '$N_0=' + dec(N0,'fuerza') + '$',
                   'font=\\tiny, color=bsaAcc', -u0x, -u0y);
  }
  if(Math.abs(V0) > 1e-9){
    out += '\\draw[-{Latex[length=2mm]}, color=bsaAcc, line width=1pt] ('
         + F(ox+n0x*0.95) + ',' + F(oy+n0y*0.95) + ') -- (' + F(ox+n0x*0.10) + ',' + F(oy+n0y*0.10) + ');\n';
    out += tzTexto(ox+n0x*1.20, oy+n0y*1.20, '$V_0=' + dec(V0,'fuerza') + '$',
                   'font=\\tiny, color=bsaAcc', n0x, n0y);
  }
  if(Math.abs(M0) > 1e-9){
    out += '\\draw[-{Latex[length=1.8mm]}, color=bsaMomento, line width=1pt] ('
         + F(ox+0.30) + ',' + F(oy) + ') arc (0:300:0.30);\n';
    tzOcupar(ox-0.36, oy-0.36, ox+0.36, oy+0.36);
    out += tzTexto(ox-0.85, oy+0.62, '$M_0=' + dec(M0,'momento') + '$',
                   'font=\\tiny, color=bsaMomento', -1, 1);
  }

  // ── Cargas del grupo que caen antes del corte ──
  (R.internas.puntuales || []).forEach(o=>{
    if(o.s === null || o.s <= sIni + 1e-9 || o.s >= sCut - 1e-9) return;
    const a = o.a, x = X(a.x), y = Y(a.y);
    const Fm = Math.hypot(a.fx, a.fy);
    const col = a.reac ? 'bsaReac' : 'bsaCarga';
    if(Fm > 1e-12){
      const ex = a.fx/Fm, ey = a.fy/Fm;
      out += '\\draw[-{Latex[length=2mm]}, color=' + col + ', line width=1pt] ('
           + F(x-ex*0.8) + ',' + F(y-ey*0.8) + ') -- (' + F(x-ex*0.10) + ',' + F(y-ey*0.10) + ');\n';
      tzOcuparTrazo(x-ex*0.8, y-ey*0.8, x-ex*0.10, y-ey*0.10, 0.07);
      out += tzTexto(x-ex*1.0, y-ey*1.0, dec(Fm,'fuerza'), 'font=\\tiny, color=' + col, -ex, -ey);
    }
    if(Math.abs(a.m) > 1e-12){
      out += '\\draw[-{Latex[length=1.8mm]}, color=bsaMomento, line width=1pt] ('
           + F(x+0.28) + ',' + F(y) + ') arc (0:300:0.28);\n';
      tzOcupar(x-0.34, y-0.34, x+0.34, y+0.34);
      out += tzTexto(x+0.55, y+0.32, dec(Math.abs(a.m),'momento'), 'font=\\tiny, color=bsaMomento', 1, 1);
    }
  });

  cargasConPeso().filter(c=>c.tipo==='U'||c.tipo==='T').forEach(c=>{
    const z = trozoCargado(c);
    if(!z || z.len <= 1e-12) return;
    const el = gg.tramos.find(t2=>t2.tramo && t2.tramo.id === c.tramo);
    if(!el) return;                                   // carga de otro grupo
    const inv = (el.invert);
    let r1 = inv ? (z.g.L - z.s2) : z.s1;
    let r2 = inv ? (z.g.L - z.s1) : z.s2;
    // Recorte en abscisa GLOBAL: el trozo aislado termina en sCut, así que de
    // cada carga solo se dibuja lo que cae antes del corte. Comparar por
    // elemento dejaba pasar enteras las cargas de tramos posteriores.
    const hasta = Math.min(el.L, sCut - el.s0);
    if(hasta <= 1e-9) return;              // el elemento entero va tras el corte
    r2 = Math.min(r2, hasta);
    if(r2 <= r1 + 1e-9) return;
    const w1 = c.mag, w2 = (c.tipo==='U') ? c.mag : (c.mag2||0);
    const wm = Math.max(Math.abs(w1), Math.abs(w2), 1e-9);
    const A = {x:X(el.desde.x+el.ux*r1), y:Y(el.desde.y+el.uy*r1)};
    const B = {x:X(el.desde.x+el.ux*r2), y:Y(el.desde.y+el.uy*r2)};
    const d = dirCarga(c, geoTramo(el.tramo));
    const ex = -d.x, ey = -d.y, alt = 0.55;
    // altura CON SIGNO: la intensidad negativa levanta el bloque al otro
    // lado y las flechas empujan hacia arriba; si la ley cruza el cero, el
    // trapecio cruza la barra en el punto de anulación
    const h1 = alt*w1/wm, h2 = alt*w2/wm;
    out += '\\draw[color=bsaDist, fill=bsaDist!12] (' + F(A.x) + ',' + F(A.y)
         + ') -- (' + F(A.x+ex*h1) + ',' + F(A.y+ey*h1)
         + ') -- (' + F(B.x+ex*h2) + ',' + F(B.y+ey*h2)
         + ') -- (' + F(B.x) + ',' + F(B.y) + ') -- cycle;\n';
    for(let i=0;i<=4;i++){
      const t3=i/4, xi=A.x+(B.x-A.x)*t3, yi=A.y+(B.y-A.y)*t3, hi=h1+(h2-h1)*t3;
      const sg = Math.sign(hi)||1;
      if(Math.abs(hi) < 0.10) continue;      // flecha ilegible junto al cero
      out += '\\draw[-{Latex[length=1.4mm]}, color=bsaDist, line width=.7pt] ('
           + F(xi+ex*hi) + ',' + F(yi+ey*hi) + ') -- (' + F(xi+ex*0.04*sg) + ',' + F(yi+ey*0.04*sg) + ');\n';
    }
    tzOcuparTrazo(A.x+ex*h1, A.y+ey*h1, B.x+ex*h2, B.y+ey*h2, 0.06);
    // el rótulo se aparta por el lado del borde más alto del bloque
    const sgR = (Math.abs(h1) >= Math.abs(h2) ? Math.sign(h1) : Math.sign(h2)) || 1;
    out += tzTexto((A.x+B.x)/2+ex*sgR*(alt+0.24), (A.y+B.y)/2+ey*sgR*(alt+0.24),
                   dec(Math.abs(w1),'fuerza') + (Math.abs(w1-w2)>1e-9 ? '--'+dec(Math.abs(w2),'fuerza') : ''),
                   'font=\\tiny, color=black!75', ex*sgR, ey*sgR);
  });

  // ── Cara del corte ──
  const px = X(P.x), py = Y(P.y);
  out += '\\draw[color=bsaAcc, line width=1pt] (' + F(px+nx*0.24) + ',' + F(py+ny*0.24)
       + ') -- (' + F(px-nx*0.24) + ',' + F(py-ny*0.24) + ');\n';
  out += '\\draw[-{Latex[length=2mm]}, color=bsaAcc, line width=1pt] (' + F(px+ux*0.12) + ',' + F(py+uy*0.12)
       + ') -- (' + F(px+ux*0.88) + ',' + F(py+uy*0.88) + ');\n';
  out += tzTexto(px+ux*1.08, py+uy*1.08, '$N$', 'font=\\scriptsize, color=bsaAcc', ux, uy);
  out += '\\draw[-{Latex[length=2mm]}, color=bsaAcc, line width=1pt] (' + F(px) + ',' + F(py)
       + ') -- (' + F(px-nx*0.72) + ',' + F(py-ny*0.72) + ');\n';
  out += tzTexto(px-nx*0.92, py-ny*0.92, '$V$', 'font=\\scriptsize, color=bsaAcc', -nx, -ny);
  out += '\\draw[-{Latex[length=1.8mm]}, color=bsaAcc, line width=1pt] ('
       + F(px-ux*0.42+0.26) + ',' + F(py-uy*0.42) + ') arc (0:300:0.26);\n';
  out += tzTexto(px-ux*0.42, py-uy*0.42+0.50, '$M$', 'font=\\scriptsize, color=bsaAcc', 0, 1);

  // ── Cotas PARALELAS al eje, en niveles y con r/x en el nivel exterior ──
  let nxq = nx, nyq = ny;
  if(nyq > 0){ nxq = -nxq; nyq = -nyq; }        // hacia el lado libre
  const rCut = sCut - sIni;
  const pxU = Math.hypot(px-X(O.x), py-Y(O.y)) / (rCut || 1);
  const marcas = [0, rCut];
  (R.internas.puntuales || []).forEach(o=>{
    if(o.s === null) return;
    const rr = o.s - sIni;
    if(rr > 1e-6 && rr < rCut - 1e-6) marcas.push(rr);
  });
  const uniq = [...new Set(marcas.map(v=>+v.toFixed(4)))].sort((a,b)=>a-b);
  const BASE = 0.55, SALTO = 0.30;
  let niv = -1;
  if(uniq.length > 2){
    const plan = planCotas(uniq, v => v*pxU*100, t => tzAncho(t)*100,
                           {maxNiveles:2, minSeg:16, fusion:8, holgura:10});
    if(plan){
      niv = plan.nMax;
      const q = (v, sep)=>({x:X(O.x)+ux*(v*pxU)+nxq*sep, y:Y(O.y)+uy*(v*pxU)+nyq*sep});
      const e0=q(plan.coords[0],BASE), e1=q(plan.coords[plan.coords.length-1],BASE);
      out += '\\draw[black!75, line width=.5pt] (' + F(e0.x) + ',' + F(e0.y)
           + ') -- (' + F(e1.x) + ',' + F(e1.y) + ');\n';
      plan.coords.forEach(v=>{ const p2=q(v,BASE);
        out += '\\draw[black!75, line width=.6pt] (' + F(p2.x-(ux-nxq)*0.08) + ',' + F(p2.y-(uy-nyq)*0.08)
             + ') -- (' + F(p2.x+(ux-nxq)*0.08) + ',' + F(p2.y+(uy-nyq)*0.08) + ');\n'; });
      plan.segs.forEach((sg,m)=>{
        if(!sg.visible) return;
        const d0 = plan.coords[m];
        const ult = (m === plan.segs.length-1);
        const txt = ult ? (Math.abs(d0)<1e-6 ? '$'+gg.simbolo+'$'
                          : '$'+gg.simbolo+' - '+dec(d0,'len')+'$') : sg.txt;
        const pm = q((plan.coords[m]+plan.coords[m+1])/2, BASE+0.20+sg.nivel*SALTO);
        out += tzTexto(pm.x, pm.y, txt, 'font=\\tiny, color=black!75', nxq, nyq);
      });
    }
  }
  // abscisa completa, en el nivel exterior
  let SEP = BASE + 0.24 + (niv+1)*SALTO + (niv>=0 ? 0.26 : 0);
  const _lineaLibre = sep => {
    const p1={x:X(O.x)+nxq*sep, y:Y(O.y)+nyq*sep}, p2={x:px+nxq*sep, y:py+nyq*sep};
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
  const a1 = {x:X(O.x)+nxq*SEP, y:Y(O.y)+nyq*SEP};
  const b1 = {x:px+nxq*SEP, y:py+nyq*SEP};
  tzOcuparTrazo(a1.x, a1.y, b1.x, b1.y, 0.05);
  out += '\\draw[bsaMuted, line width=.5pt] (' + F(a1.x) + ',' + F(a1.y)
       + ') -- (' + F(b1.x) + ',' + F(b1.y) + ');\n';
  [a1,b1].forEach(p2=>{
    out += '\\draw[bsaMuted, line width=.7pt] (' + F(p2.x-(ux-nxq)*0.09) + ',' + F(p2.y-(uy-nyq)*0.09)
         + ') -- (' + F(p2.x+(ux-nxq)*0.09) + ',' + F(p2.y+(uy-nyq)*0.09) + ');\n';
  });
  out += tzTexto((a1.x+b1.x)/2, (a1.y+b1.y)/2, '$' + gg.simbolo + '$',
                 'font=\\scriptsize, color=bsaMuted, fill=white, inner sep=1pt',
                 nxq, nyq);
  return out;
}
