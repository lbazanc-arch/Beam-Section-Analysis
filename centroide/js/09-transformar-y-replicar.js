// ═══════════════════════════════════════════════════════════
//  TRANSFORMAR: mover o girar la selección respecto a una coordenada
// ═══════════════════════════════════════════════════════════
// Equivale al Transformar de cap6, con dos diferencias propias del Cap. 9:
//   · allí la referencia es un NUDO del modelo; aquí no hay nudos, así que se
//     ofrece el origen, el centro de cualquier figura marcada, o una
//     coordenada (x, y) escrita a mano;
//   · una figura además tiene ORIENTACIÓN, así que girar el conjunto obliga a
//     girar cada figura sobre sí misma, no solo a mover su centro. Sin eso, un
//     grupo girado 45° quedaría con las piezas desalineadas entre sí.
let transModo = 'mover';

function abrirTransformar(){
  if(!selFiguras.length){
    aviso('Marca al menos una figura con la herramienta Mover / editar para transformarla.');
    return;
  }
  const sel = document.getElementById('transRef');
  const opciones = ['<option value="origen">Origen (0 ; 0)</option>'];
  selFiguras.forEach(id=>{
    const f = figures.find(z=>z.id===id);
    if(f) opciones.push('<option value="fig:'+f.id+'">Centro de '+esc(f.name)
      + (f.etiqueta ? ' ' + esc(f.etiqueta) : '')
      + '  ('+decP(f.cx,'len')+' ; '+decP(f.cy,'len')+')</option>');
  });
  opciones.push('<option value="libre">Coordenada a elegir…</option>');
  sel.innerHTML = opciones.join('');
  document.getElementById('transSub').textContent =
    'Se transformarán ' + selFiguras.length + ' figura(s). Al girar, la referencia '
    + 'queda fija y es el centro de rotación; al mover, toda la selección se desplaza por igual.';
  cambiarRefTrans();
  setTransModo('mover');
  document.getElementById('transModal').classList.add('show');
}
function closeTransformar(){ document.getElementById('transModal').classList.remove('show'); }

function cambiarRefTrans(){
  const v = document.getElementById('transRef').value;
  document.getElementById('transCampoRef').style.display = (v==='libre') ? 'block' : 'none';
  actualizarPrevTrans();
}

function setTransModo(m){
  transModo = m;
  document.getElementById('transCampoMover').style.display = (m==='mover') ? 'block' : 'none';
  document.getElementById('transCampoGirar').style.display = (m==='girar') ? 'block' : 'none';
  const a = document.getElementById('transTabMover'), b = document.getElementById('transTabGirar');
  if(a) a.classList.toggle('active', m==='mover');
  if(b) b.classList.toggle('active', m==='girar');
  actualizarPrevTrans();
}

// Punto de referencia elegido, en coordenadas del mundo.
function refTransformar(){
  const v = document.getElementById('transRef').value;
  const num = id => { const e=document.getElementById(id); const n=parseFloat(e && e.value); return isFinite(n)?n:0; };
  if(v === 'origen') return {x:0, y:0, nombre:'el origen'};
  if(v === 'libre')  return {x:num('transRx'), y:num('transRy'), nombre:'la coordenada indicada'};
  const id = parseInt(String(v).split(':')[1]);
  const f = figures.find(z=>z.id===id);
  if(!f) return null;
  return {x:f.cx, y:f.cy, nombre:'el centro de ' + f.name};
}

// Calcula el resultado sin aplicarlo todavía, para la vista previa.
function calcularTransformacion(){
  const ref = refTransformar();
  if(!ref) return null;
  const num = id => { const e=document.getElementById(id); const n=parseFloat(e && e.value); return isFinite(n)?n:0; };
  const destinos = [];
  if(transModo === 'mover'){
    const dx = num('transDx'), dy = num('transDy');
    selFiguras.forEach(id=>{
      const f = figures.find(z=>z.id===id); if(!f) return;
      // En un desplazamiento se mueve TODA la selección por igual: la
      // referencia solo queda fija cuando se gira.
      destinos.push({id, cx:f.cx+dx, cy:f.cy+dy, rotation:f.rotation});
    });
    return {ref, destinos, dx, dy};
  }
  const grados = num('transAng');
  const ang = grados*Math.PI/180;
  const cs = Math.cos(ang), sn = Math.sin(ang);
  selFiguras.forEach(id=>{
    const f = figures.find(z=>z.id===id); if(!f) return;
    // Rotación 2D estándar del centro alrededor de la referencia, más el mismo
    // giro aplicado a la orientación propia de la figura: el conjunto se mueve
    // como un sólido rígido.
    const ux = f.cx - ref.x, uy = f.cy - ref.y;
    destinos.push({id,
      cx: ref.x + ux*cs - uy*sn,
      cy: ref.y + ux*sn + uy*cs,
      rotation: f.rotation + grados});
  });
  return {ref, destinos, ang:grados};
}

function actualizarPrevTrans(){
  const p = document.getElementById('transPrev');
  if(!p) return;
  const t = calcularTransformacion();
  if(!t){ p.textContent = 'Elige una referencia válida.'; return; }
  if(transModo === 'mover'){
    p.textContent = 'Las ' + t.destinos.length + ' figura(s) se desplazan ('
      + decP(t.dx,'len') + ' ; ' + decP(t.dy,'len') + ') ' + unit
      + ', midiendo desde ' + t.ref.nombre + '.';
  } else {
    p.textContent = 'Las ' + t.destinos.length + ' figura(s) giran ' + t.ang
      + '° alrededor de ' + t.ref.nombre + ' (' + decP(t.ref.x,'len') + ' ; '
      + decP(t.ref.y,'len') + ') ' + unit + ', arrastrando su propia orientación.';
  }
}

function applyTransformar(){
  const t = calcularTransformacion();
  if(!t){ aviso('Elige una referencia válida.', 'error'); return; }
  if(transModo === 'mover' && t.dx === 0 && t.dy === 0){
    aviso('Indica un desplazamiento en x o en y.'); return;
  }
  if(transModo === 'girar' && t.ang === 0){
    aviso('Indica un ángulo de giro distinto de cero.'); return;
  }
  registrarCambio();   // un solo paso de deshacer para todo el lote
  // El giro NUNCA se engancha a la rejilla: redondear cada centro alteraría
  // las distancias entre figuras y deformaría la sección. En cap6 esto llegó a
  // cambiar una barra de 6 a 6.10 en un giro de 37°.
  t.destinos.forEach(d=>{
    const f = figures.find(z=>z.id===d.id);
    if(!f) return;
    f.cx = d.cx; f.cy = d.cy; f.rotation = d.rotation;
  });
  results = null;
  closeTransformar();
  updatePropPanel(); renderFigList(); actualizarInfoSel(); render();
}

// ── Replicar selección (copiar figuras desplazadas N veces) ──
function abrirReplicar(){
  if(!selFiguras.length){
    aviso('Elige la herramienta Mover / editar y marca al menos una figura para replicar.');
    return;
  }
  document.getElementById('repSub').textContent =
    'Se replicarán ' + selFiguras.length + ' figura(s), desplazándolas la distancia indicada tantas veces como pidas.';
  actualizarPrevRep();
  document.getElementById('repModal').classList.add('show');
}
function closeReplicar(){ document.getElementById('repModal').classList.remove('show'); }
function actualizarPrevRep(){
  const g = id => parseFloat(document.getElementById(id).value) || 0;
  const dx = g('repDx'), dy = g('repDy');
  const nrep = Math.max(1, Math.min(50, parseInt(document.getElementById('repN').value) || 1));
  const base = figures.find(f=>f.id===selFiguras[0]);
  const el = document.getElementById('repPrev');
  if(!el || !base) return;
  let t = 'Desde (' + decP(base.cx,'len') + ' ; ' + decP(base.cy,'len') + ') ' + unit + ' → ';
  const p = [];
  for(let i=1;i<=Math.min(nrep,3);i++)
    p.push('(' + decP(base.cx+dx*i,'len') + ' ; ' + decP(base.cy+dy*i,'len') + ')');
  el.innerHTML = t + p.join(', ') + (nrep>3 ? ' …' : '');
}
function applyReplicar(){
  const g = id => parseFloat(document.getElementById(id).value) || 0;
  const dx = g('repDx'), dy = g('repDy');
  const nrep = Math.max(1, Math.min(50, parseInt(document.getElementById('repN').value) || 1));
  if(dx === 0 && dy === 0){ aviso('Indica un desplazamiento en x o en y.'); return; }
  registrarCambio();
  const orig = selFiguras.slice();
  const nuevas = [];
  for(let i=1;i<=nrep;i++){
    orig.forEach(id=>{
      const o = figures.find(z=>z.id===id);
      if(!o) return;
      const nf = Object.assign({}, o, {dims:Object.assign({},o.dims)});
      nf.id = ++figIdCounter;
      nf.cx = o.cx + dx*i;
      nf.cy = o.cy + dy*i;
      figures.push(nf);
      nuevas.push(nf.id);
    });
  }
  results = null;
  selFiguras = nuevas;
  selectFigure(nuevas.length ? nuevas[nuevas.length-1] : null);
  closeReplicar(); renderFigList(); actualizarInfoSel(); render();
}

// El botón de desplazamiento activa el modo 'pan' como una herramienta más
// (antes solo alternaba una clase CSS y no cambiaba el comportamiento).
function togglePanTool(){ setHerramienta('pan'); }

function calculate(){
  if(!figures.length){ aviso('Agrega al menos una figura.'); return; }

  const u2 = unit+'²';
  const u1 = unit;
  const hetero = (modoCuerpo==='heterogeneo');

  // ── Centroide (geométrico) y centro de gravedad (ponderado por peso) ──
  // Homogéneo: ambos coinciden, porque γ se cancela en el cociente.
  // Heterogéneo: el centro de gravedad se desplaza hacia el material más pesado.
  let A=0, Qx=0, Qy=0;            // momentos estáticos de ÁREA
  let W=0, Wx=0, Wy=0;            // momentos estáticos de PESO
  const steps=[];

  for(const fig of figures){
    // figArea: el área tabulada si la figura es un perfil del catálogo.
    const a = figArea(fig)*fig.sign;
    const mat = hetero ? matPorId(fig.matId) : null;
    const g = mat ? Number(mat.val) : 1;            // peso específico o densidad
    const gLabel = mat ? (matSimbolo()+mat.id) : '—';
    const t = hetero ? (fig.thickness || 1) : 1;     // espesor perpendicular al plano XY
    const w = a*g*t;
    A+=a;  Qx+=a*fig.cy;  Qy+=a*fig.cx;
    W+=w;  Wx+=w*fig.cx;  Wy+=w*fig.cy;
    steps.push({fig, a, g, gLabel, mat, t, w, xi:fig.cx, yi:fig.cy, ax:a*fig.cx, ay:a*fig.cy, wx:w*fig.cx, wy:w*fig.cy});
  }
  if(Math.abs(A)<1e-12){ aviso('El área total es cero. Revisa las figuras negativas.', 'error'); return; }

  const xbar = Qy/A,  ybar = Qx/A;          // centroide geométrico
  const xg   = Math.abs(W)>1e-12 ? Wx/W : xbar;
  const yg   = Math.abs(W)>1e-12 ? Wy/W : ybar;

  // Separación entre ambos puntos (cero si el cuerpo es homogéneo)
  const sep = Math.hypot(xg-xbar, yg-ybar);

  results = {xbar, ybar, xg, yg, A, W, Qx, Qy, Wx, Wy, sep, hetero, steps,
             // se conservan por compatibilidad con el resto del aplicativo
             Ix:0, Iy:0, Ixy:0, Imax:0, Imin:0, thetaP:0, Jo:0, kx:0, ky:0};

  renderResults(results, unit+'⁴', u2, u1);
  render();
}

function fmtVal(v){
  // Format value according to selected notation
  if(notationExp === 0){
    // Auto: use scientific if > 9999 or < 0.001
    const abs = Math.abs(v);
    if(abs === 0) return '0';
    if(abs >= 10000 || (abs < 0.01 && abs > 0)){
      const exp = Math.floor(Math.log10(abs));
      const mant = v / Math.pow(10, exp);
      return mant.toFixed(DEC.area) + ' ×10<sup>' + exp + '</sup>';
    }
    return decFix(v,'area').toString();
  }
  const factor = Math.pow(10, notationExp);
  return (v / factor).toFixed(DEC.area) + ' ×10<sup>' + notationExp + '</sup>';
}
// ── LaTeX helpers (KaTeX) ──
function _kesc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
// unidad "cm⁴"/"cm²"/"mm" → LaTeX \text{cm}^{4}
function utex(u){
  if(!u) return '';
  const sup={'²':'2','³':'3','⁴':'4','⁶':'6'};
  const m=String(u).match(/^([a-zA-Z]+)([²³⁴⁶]?)$/);
  if(m) return '\\text{'+m[1]+'}'+(m[2]?('^{'+sup[m[2]]+'}'):'');
  return '\\text{'+u+'}';
}
// número en LaTeX respetando la notación seleccionada
function ftex(v){
  if(!isFinite(v)) return '0';
  if(notationExp===0){
    const abs=Math.abs(v);
    if(abs===0) return '0';
    if(abs>=10000 || (abs<0.01 && abs>0)){
      const exp=Math.floor(Math.log10(abs)); const mant=v/Math.pow(10,exp);
      return mant.toFixed(DEC.area)+'\\times 10^{'+exp+'}';
    }
    return String(decFix(v,'area'));
  }
  const factor=Math.pow(10,notationExp);
  return (v/factor).toFixed(DEC.area)+'\\times 10^{'+notationExp+'}';
}
const _kgrn='#041d56';
function kres(s){return '\\textcolor{'+_kgrn+'}{'+s+'}';} // resultado resaltado
// genera un span que KaTeX renderizará tras insertar el HTML
function kx(tex, display){return '<span class="ktx"'+(display?' data-display="1"':'')+' data-tex="'+_kesc(tex)+'"></span>';}
// renderiza todos los .ktx dentro de un contenedor
function renderKatex(root){
  if(!window.katex) return;
  root.querySelectorAll('.ktx').forEach(el=>{
    if(el.getAttribute('data-done')) return;
    try{ katex.render(el.getAttribute('data-tex'), el, {throwOnError:false, displayMode: el.getAttribute('data-display')==='1'}); el.setAttribute('data-done','1'); }
    catch(e){ el.textContent = el.getAttribute('data-tex'); }
  });
}


let currentU4='', currentU2='', currentU1='';


// Escape de HTML: los nombres de figura y las unidades los escribe el usuario.
function esc(v){
  if(v===null||v===undefined) return '';
  return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                  .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}




// ═══ Croquis individual acotado de una figura (punto 5) ═══
// Cada figura se dibuja aislada, con sus medidas y su centroide propio.
function croquisFigura(fig, idx){
  const def=FIG_DEFS[fig.type]; if(!def) return '';
  let b; try{ b=def.bounds(fig.dims); }catch(e){ return ''; }
  const W=190, H=150, M=30;                       // lienzo y margen para cotas

  // contorno de la figura mediante muestreo del trazado
  let path='';
  const cmds=[];
  const ctxFake={ moveTo:(x,y)=>cmds.push(['M',x,y]), lineTo:(x,y)=>cmds.push(['L',x,y]),
    closePath:()=>cmds.push(['Z']), arc:(cx,cy,r,a0,a1,acw)=>{
      const n=28; for(let i=0;i<=n;i++){ let a=a0+(a1-a0)*(i/n);
        cmds.push([i===0&&!cmds.length?'M':'L', cx+r*Math.cos(a), cy+r*Math.sin(a)]); } },
    bezierCurveTo:(a,bb,c,d,e,f)=>cmds.push(['L',e,f]),
    quadraticCurveTo:(a,bb,c,d)=>cmds.push(['L',c,d]),
    beginPath:()=>{}, ellipse:()=>{} };
  try{ def.draw(ctxFake, fig.dims); }catch(e){}

  // El encuadre se calcula DESPUÉS de muestrear: se une la caja declarada con
  // la caja real del trazado, así ninguna figura puede salirse del recuadro
  // aunque su bounds esté mal. (El sector circular se cortaba por esto.)
  const puntos = cmds.filter(c=>c[0]!=='Z');
  if(puntos.length){
    b = {
      left:   Math.min(b.left,   ...puntos.map(c=>c[1])),
      right:  Math.max(b.right,  ...puntos.map(c=>c[1])),
      bottom: Math.min(b.bottom, ...puntos.map(c=>c[2])),
      top:    Math.max(b.top,    ...puntos.map(c=>c[2]))
    };
  }
  const bw=Math.max(b.right-b.left,1e-9), bh=Math.max(b.top-b.bottom,1e-9);
  const s=Math.min((W-2*M)/bw, (H-2*M)/bh);
  const px = x => M + (x-b.left)*s;
  const py = y => H-M - (y-b.bottom)*s;           // Y hacia arriba

  cmds.forEach(c=>{
    if(c[0]==='Z'){ path+='Z'; return; }
    path += c[0] + px(c[1]).toFixed(1) + ',' + py(c[2]).toFixed(1) + ' ';
  });
  if(!path) path = `M${px(b.left)},${py(b.bottom)} L${px(b.right)},${py(b.bottom)} `
                 + `L${px(b.right)},${py(b.top)} L${px(b.left)},${py(b.top)} Z`;

  // centroide propio de la figura (en coordenadas locales)
  let cxl=0, cyl=0;
  try{
    const off = def.anchorOffset ? def.anchorOffset(fig.dims,'C') : {dx:0,dy:0};
    cxl=-off.dx; cyl=-off.dy;
  }catch(e){}
  const gx=px(cxl), gy=py(cyl);
  const col=fig.color||'#14766d';
  const neg=fig.sign<0;

  return `
  <div class="croq">
    <div class="croq-h">
      <span class="croq-n">${idx+1}</span>
      <span class="croq-t">${esc(fig.etiqueta||fig.name||def.name)}${neg?' <i>(hueco)</i>':''}</span>
    </div>
    <svg viewBox="0 0 ${W} ${H}" class="croq-svg">
      <path d="${path}" fill="${col}" fill-opacity="${neg?0.10:0.22}" stroke="${col}"
            stroke-width="1.6" stroke-dasharray="${neg?'4 3':'0'}"/>
      <line x1="${gx}" y1="${py(b.bottom)}" x2="${gx}" y2="${py(b.top)}"
            stroke="${col}" stroke-width=".8" stroke-dasharray="3 2" opacity=".55"/>
      <line x1="${px(b.left)}" y1="${gy}" x2="${px(b.right)}" y2="${gy}"
            stroke="${col}" stroke-width=".8" stroke-dasharray="3 2" opacity=".55"/>
      <circle cx="${gx}" cy="${gy}" r="3.4" fill="#e2aa1b" stroke="#fff" stroke-width="1"/>
      <text x="${gx+6}" y="${gy-5}" font-size="9" font-weight="700" fill="#b8860c">C${idx+1}</text>
      <line x1="${px(b.left)}" y1="${H-16}" x2="${px(b.right)}" y2="${H-16}" stroke="#64748b" stroke-width=".9"/>
      <line x1="${px(b.left)}" y1="${H-20}" x2="${px(b.left)}" y2="${H-12}" stroke="#64748b" stroke-width=".9"/>
      <line x1="${px(b.right)}" y1="${H-20}" x2="${px(b.right)}" y2="${H-12}" stroke="#64748b" stroke-width=".9"/>
      <text x="${(px(b.left)+px(b.right))/2}" y="${H-6}" font-size="8.5" fill="#475569" text-anchor="middle">${decFix(bw,'len')} ${unit}</text>
      <line x1="${W-16}" y1="${py(b.bottom)}" x2="${W-16}" y2="${py(b.top)}" stroke="#64748b" stroke-width=".9"/>
      <line x1="${W-20}" y1="${py(b.bottom)}" x2="${W-12}" y2="${py(b.bottom)}" stroke="#64748b" stroke-width=".9"/>
      <line x1="${W-20}" y1="${py(b.top)}" x2="${W-12}" y2="${py(b.top)}" stroke="#64748b" stroke-width=".9"/>
      <text x="${W-8}" y="${(py(b.bottom)+py(b.top))/2}" font-size="8.5" fill="#475569"
            text-anchor="middle" transform="rotate(-90 ${W-8} ${(py(b.bottom)+py(b.top))/2})">${decFix(bh,'len')} ${unit}</text>
    </svg>
    <div class="croq-d">
      <span>x̃ = ${decFix(fig.cx,'len')} ${unit}</span>
      <span>ỹ = ${decFix(fig.cy,'len')} ${unit}</span>
    </div>
  </div>`;
}

// drawCompositeFigure(canvasId) se define más abajo (incluye la acotación general);
// esta era una copia idéntica más antigua que quedó muerta tras el hoisting de JS.

// ═══════════════════════════════════════════════════════════
//  Sección compuesta RESUELTA: un solo color, huecos ya restados,
//  con el centroide C y el centro de gravedad G. Las etiquetas se
//  separan para que nunca queden una encima de otra.
// ═══════════════════════════════════════════════════════════
function drawSeccionFinal(canvasId){
  const cv=document.getElementById(canvasId);
  if(!cv||!figures.length||!results) return;
  const dpr=window.devicePixelRatio||1, W=cv.clientWidth||600, H=cv.clientHeight||340;
  cv.width=W*dpr; cv.height=H*dpr;
  const c=cv.getContext('2d'); c.scale(dpr,dpr);
  c.fillStyle='#ffffff'; c.fillRect(0,0,W,H);

  // caja envolvente
  let xMin=Infinity,xMax=-Infinity,yMin=Infinity,yMax=-Infinity;
  for(const fig of figures){
    const def=FIG_DEFS[fig.type]; if(!def||!def.bounds) continue;
    const b=def.bounds(fig.dims), rot=(fig.rotation||0)*Math.PI/180;
    [[b.left,b.bottom],[b.right,b.bottom],[b.right,b.top],[b.left,b.top]].forEach(([lx,ly])=>{
      const rx=fig.cx+lx*Math.cos(rot)-ly*Math.sin(rot);
      const ry=fig.cy+lx*Math.sin(rot)+ly*Math.cos(rot);
      xMin=Math.min(xMin,rx);xMax=Math.max(xMax,rx);yMin=Math.min(yMin,ry);yMax=Math.max(yMax,ry);
    });
  }
  [[results.xbar,results.ybar],[results.xg,results.yg]].forEach(([a,b])=>{
    if(isFinite(a)&&isFinite(b)){xMin=Math.min(xMin,a);xMax=Math.max(xMax,a);yMin=Math.min(yMin,b);yMax=Math.max(yMax,b);}
  });
  const PAD=58, fw=Math.max(xMax-xMin,.001), fh=Math.max(yMax-yMin,.001);
  const s=Math.min((W-PAD*2)/fw,(H-PAD*2)/fh);
  const ox=W/2-(xMin+xMax)/2*s, oy=H/2+(yMin+yMax)/2*s;
  const sx=w=>ox+w*s, sy=w=>oy-w*s;

  const trazar=(fig)=>{
    const def=FIG_DEFS[fig.type]; if(!def) return;
    const rot=(fig.rotation||0)*Math.PI/180;
    c.save();
    c.translate(sx(fig.cx), sy(fig.cy));
    c.rotate(-rot);
    c.scale(s,-s);
    c.beginPath();
    try{ def.draw(c, fig.dims); }catch(e){}
    c.restore();
  };

  // 1) Material sólido: cada figura se rellena por separado.
  //    (Un único trazado con 'evenodd' anulaba las zonas superpuestas
  //     y hacía desaparecer figuras enteras, como el rectángulo.)
  const COL='#0f5c56';
  figures.filter(f=>f.sign>0).forEach(f=>{
    c.save(); c.beginPath(); trazar(f);
    c.fillStyle='rgba(15,92,86,.20)'; c.fill();
    c.restore();
  });

  // 2) Los huecos se recortan en blanco sobre el material
  figures.filter(f=>f.sign<0).forEach(f=>{
    c.save(); c.beginPath(); trazar(f);
    c.fillStyle='#ffffff'; c.fill();
    c.restore();
  });

  // 3) Contornos por encima del relleno, para que se distinga cada pieza
  figures.filter(f=>f.sign>0).forEach(f=>{
    c.save(); c.beginPath(); trazar(f);
    c.strokeStyle=COL; c.lineWidth=2; c.stroke();
    c.restore();
  });
  figures.filter(f=>f.sign<0).forEach(f=>{
    c.save(); c.beginPath(); trazar(f);
    c.strokeStyle=COL; c.lineWidth=1.4; c.setLineDash([5,4]); c.stroke();
    c.restore();
  });

  // 3) puntos, con etiquetas que no se solapan
  const separados = results.hetero && results.sep>1e-9;
  const pts=[{x:results.xbar,y:results.ybar,col:'#e2aa1b',ring:'#b8860c',lab:'C',
              desc: separados ? 'Centroide' : 'Centroide = C.G. = C.M.',
              v:'('+decFix(results.xbar,'len')+' , '+decFix(results.ybar,'len')+')'}];
  if(separados){
    pts.push({x:results.xg,y:results.yg,col:'#c0392b',ring:'#96281b',lab:'G',
              desc:'Centro de gravedad', v:'('+decFix(results.xg,'len')+' , '+decFix(results.yg,'len')+')'});
    c.save();
    c.strokeStyle='#c0392b'; c.lineWidth=1.6; c.setLineDash([5,3]);
    c.beginPath(); c.moveTo(sx(results.xbar),sy(results.ybar));
    c.lineTo(sx(results.xg),sy(results.yg)); c.stroke();
    c.restore();
  }

  const cajas=[];
  const libre=a=>!cajas.some(b=>!(a.x1<b.x0||a.x0>b.x1||a.y1<b.y0||a.y0>b.y1));
  pts.forEach(p=>{
    const cx=sx(p.x), cy=sy(p.y);
    c.font='bold 10.5px Inter';
    const w=Math.max(c.measureText(p.desc).width, c.measureText(p.v+' '+unit).width)+14, hh=30;
    const cand=[[cx+14,cy-hh-8],[cx+14,cy+10],[cx-w-14,cy-hh-8],[cx-w-14,cy+10],[cx-w/2,cy-hh-18]];
    let bx=cand[0][0], by=cand[0][1];
    for(const [a,b] of cand){
      const caja={x0:a,x1:a+w,y0:b,y1:b+hh};
      if(a>3&&a+w<W-3&&b>3&&b+hh<H-3&&libre(caja)){ bx=a; by=b; break; }
    }
    cajas.push({x0:bx,x1:bx+w,y0:by,y1:by+hh});
    c.strokeStyle=p.ring; c.lineWidth=.9; c.globalAlpha=.5;
    c.beginPath(); c.moveTo(cx,cy); c.lineTo(bx<cx?bx+w:bx, by+hh/2); c.stroke();
    c.globalAlpha=1;
    c.fillStyle='#fff'; c.strokeStyle=p.ring; c.lineWidth=1;
    c.beginPath(); c.roundRect ? c.roundRect(bx,by,w,hh,6) : c.rect(bx,by,w,hh);
    c.fill(); c.stroke();
    c.textAlign='left';
    c.fillStyle=p.ring; c.font='bold 10.5px Inter';
    c.fillText(p.lab+' · '+p.desc, bx+7, by+13);
    c.fillStyle='#475569'; c.font='10px Inter';
    c.fillText(p.v+' '+unit, bx+7, by+25);
    c.beginPath(); c.arc(cx,cy,6.5,0,Math.PI*2);
    c.fillStyle=p.col; c.fill();
    c.strokeStyle='#fff'; c.lineWidth=2; c.stroke();
    c.strokeStyle=p.ring; c.lineWidth=1; c.stroke();
  });
  c.textAlign='start';
}
