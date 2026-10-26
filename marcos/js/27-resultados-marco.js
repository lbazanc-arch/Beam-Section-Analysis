// ═══════════════════════════════════════════════════════════
//  MARCOS — RESULTADOS EN PANTALLA (2026-10-25)
//  1 determinación · 2 DCL del marco entero con sus ecuaciones · 3 desmembrado:
//  el DCL de cada miembro con las suyas · 4 DCL de los miembros elegidos, con
//  todas sus fuerzas en su sentido real, con nombre y valor, y acotados · 5 N,
//  V y M de esos miembros · 6 diagramas. En pantalla va la ecuación y el
//  resultado (CLAUDE.md §7); el desarrollo explicado, en el PDF.
// ═══════════════════════════════════════════════════════════
function cuerpoEnSolucion(r, k){ return r.cuerpos[k].tramos.some(t=>tramoEnSolucion(t.id)); }
// Flecha que dice el sentido real de una fuerza (ocho direcciones).
function flechaSentido(fx, fy){
  const a = Math.atan2(fy, fx)*180/Math.PI, i = ((Math.round(a/45) % 8) + 8) % 8;
  return ['→','↗','↑','↖','←','↙','↓','↘'][i];
}

function renderErrorMarco(r){
  let t;
  if(r.error === 'sin-viga') t = 'Todavía no hay ningún miembro. Usa <b>Miembro</b> en la barra de herramientas.';
  else if(r.error === 'no-conexa') t = 'Hay piezas sueltas: todos los miembros deben quedar unidos (por pasadores, uniones o vínculos) en una sola estructura.';
  else if(r.error === 'anillo') t = 'El miembro <b>' + r.cuerpo.nombre + '</b> forma un anillo cerrado soldado y no se resuelve con la estática. Pon un pasador en uno de sus nudos.';
  else if(r.error === 'par-en-pasador') t = 'Hay un par aplicado en un pasador, que no resiste momento. Ponlo sobre un tramo, junto al nudo.';
  else if(r.error === 'arco-carga') t = 'Sobre un <b>tramo curvo</b> solo se resuelven cargas repartidas <b>uniformes</b> (verticales, horizontales, inclinadas o radiales).';
  else if(r.error === 'determinacion'){
    const d = r.diag, g = d.inc - d.eq;
    t = 'Hay <b>' + d.inc + ' incógnitas</b> (' + d.reac + ' de apoyos' + (d.vin ? ' y vínculos' : '') + ' y ' + (d.inc - d.reac)
      + ' de pasador) y <b>' + d.eq + ' ecuaciones</b> (3 por cada uno de los ' + d.cuerpos + ' miembros'
      + (d.generales ? ' y 2 por cada pasador general' : '') + '). '
      + (g < 0 ? 'Faltan ' + (-g) + ': el marco no está sujeto y se movería.'
               : 'Sobran ' + g + ': el marco es hiperestático y no se resuelve solo con la estática.');
  }
  else t = 'Los apoyos y las uniones no impiden el movimiento: el marco es un mecanismo. Revísalos.';
  const gie = (r.error === 'determinacion' || r.error === 'singular') ? gieHtml(r.diag) : '';
  return '<div class="res-section"><div class="res-title"><div class="num">!</div>No se puede resolver</div>'
       + '<div class="verdict bad"><div class="verdict-t">Equilibrio</div>' + t + '</div>' + gie + '</div>';
}

// GIE = 3b − (vi + ve), con lo que se cuenta en cada sumando (24-, gieMarco).
function gieHtml(d){
  const g = gieMarco();
  if(d && d.eq - d.inc !== g.gie) console.warn('Marcos: el GIE (' + g.gie + ') no casa con ecuaciones − incógnitas (' + (d.eq - d.inc) + ')');
  const lst = a=>a.map(q=>'<b>' + q.nombre + '</b>: ' + q.v + (q.n ? ' (' + q.n + ' barras' + (q.desl ? ', deslizante' : '') + ')' : ' (' + q.tipo.toLowerCase() + ')')).join(' · ');
  return _filaEc('\\text{GIE} = 3b - (v_i + v_e) = 3(' + g.b + ') - (' + g.sVi + ' + ' + g.sVe + ') = ' + g.gie
           + '\\quad\\Rightarrow\\quad \\text{' + g.lectura + '}')
    + '<div class="hint-sm" style="margin-top:4px">b = ' + g.miembros + (g.miembros === 1 ? ' miembro' : ' miembros') + (g.bielas ? ' + ' + g.bielas + ' entre nudos (biela o cuerda)' : '')
    + (g.vi.length ? '<br>v<sub>i</sub>: ' + lst(g.vi) : '<br>v<sub>i</sub> = 0') + '<br>v<sub>e</sub>: ' + lst(g.ve) + '</div>';
}

function _filaEc(tex){ return '<div class="eq-row"><div class="eq-body">' + kx(tex) + '</div></div>'; }
function _valorIncTex(q){
  const esM = q.tipo === 'reac' && q.u.tipo === 'M' && q.u.ang === undefined;
  return simboloIncognita(q) + ' = ' + dec(q.valor, esM ? 'mom' : 'f') + '\\ \\text{' + (esM ? uMom() : unitFor) + '}';
}

function renderResultadosMarco(r){
  const f = v=>dec(v,'f'), fm = v=>dec(v,'mom'), nl = v=>dec(v,'len');
  const d = r.diag;
  let h = '';
  // 1 · Determinación
  const lstC = r.cuerpos.map(c=>'<b>' + c.nombre + '</b>').join(' · ');
  const lstP = r.pines.map(p=>'<b>' + p.n.nombre + '</b> (' + p.cuerpos.map(k=>r.cuerpos[k].nombre).join('–')
    + (p.desl ? ', desliza sobre ' + nomTramo(p.desl.tramo) : '') + ')').join(' · ');
  h += '<div class="res-section"><div class="res-title"><div class="num">1</div>Determinación estática</div>'
    + '<div class="verdict ok"><div class="verdict-t">Resultado</div>Marco isostático: <b>' + d.inc + ' incógnitas</b> ('
    + d.reac + ' de apoyos' + (d.vin ? ' y vínculos' : '') + ' y ' + (d.inc - d.reac) + ' de pasador) y <b>' + d.eq
    + ' ecuaciones</b> (3 por cada uno de los ' + d.cuerpos + ' miembros' + (d.generales ? ' y 2 por cada pasador general' : '') + ').</div>'
    + '<div class="hint-sm" style="margin-top:6px">Miembros: ' + lstC + (lstP ? '<br>Pasadores: ' + lstP : '') + '</div>'
    + '<div class="proc-block" style="margin-top:8px">' + gieHtml(d) + '</div></div>';

  // 2 · El marco entero y 3 · el desmembrado: un DCL detrás de otro, cada uno
  // con SUS ecuaciones, numeradas para citarlas al despejar (26-, planMarco).
  const pl = planMarco(r), g0 = pl.pasos[0];
  h += '<div class="res-section"><div class="res-title"><div class="num">2</div>DCL del marco completo</div>'
    + '<div class="hint-sm" style="margin-bottom:6px">A trazos y en gris, lo que se busca, en su sentido supuesto; continuo, lo ya conocido. '
    + 'Brazos desde el punto de momentos, en ' + unitLen + '.</div>'
    + svgDCLCuerpo(r, null, {global:true, conocidas:g0.sabidasAntes, P:g0.punto})
    + _ecuacionesPasoHtml(r, g0) + _despejesHtml(r, g0.despejes) + '</div>';
  h += '<div class="res-section"><div class="res-title"><div class="num">3</div>Desmembrado: DCL de cada miembro</div>';
  pl.pasos.slice(1).forEach(ps=>{
    const g = ps.grupo;
    h += '<div class="sub-tramo-cab">' + (g.tipo === 'cuerpo' ? 'Miembro ' : 'Pasador ') + g.nombre + '</div>';
    if(g.tipo === 'cuerpo') h += svgDCLCuerpo(r, g.k, {conocidas:ps.sabidasAntes, P:ps.punto});
    h += _ecuacionesPasoHtml(r, ps) + _despejesHtml(r, ps.despejes);
  });
  if(pl.resto.length)
    h += '<div class="hint-sm">Las que quedan salen del sistema de las ecuaciones ' + refsEcuaciones(pl.refsResto) + ':</div><div class="proc-block">'
      + _filaEc(pl.resto.map(j=>_valorIncTex(r.unk[j])).join(',\\qquad ')) + '</div>';
  if(pl.pasos.length === 1 && !pl.resto.length) h += '<div class="hint-sm">El marco entero basta: no hay fuerzas entre miembros que hallar.</div>';
  h += '<div class="sub-tramo-cab">Resultados</div>' + tablaReaccionesMarco(r) + avisosVinculosHtml(r) + tablaPasadoresMarco(r) + '</div>';

  // 4 · DCL de los miembros elegidos
  const elegidos = r.cuerpos.filter(c=>cuerpoEnSolucion(r, c.k));
  h += '<div class="res-section"><div class="res-title"><div class="num">4</div>DCL de los miembros</div>'
    + '<div class="hint-sm" style="margin-bottom:6px">Cada fuerza en su sentido real, con su valor (fuerzas en ' + unitFor
    + ', momentos en ' + uMom() + ', cotas en ' + unitLen + ').</div>';
  elegidos.forEach(c=>{ h += '<div class="sub-tramo-cab">Miembro ' + c.nombre + '</div>' + svgDCLCuerpo(r, c.k); });
  h += '</div>';
  // Sin fuerzas internas (20-, «Miembros de la solución»), aquí acaba.
  if(!verInternasMarco) return h;

  // 5 · Fuerzas internas de los miembros elegidos
  h += '<div class="res-section"><div class="res-title"><div class="num">5</div>'
    + 'Fuerzas internas — ' + (metodo7 === 'ecuaciones' ? 'método de las ecuaciones' : 'método de las áreas') + '</div>'
    + '<div class="hint-sm" style="margin:2px 0 12px">El método se elige en <b>Método</b>, en la columna de control.</div>'
    + (metodo7 === 'ecuaciones' ? renderMetodoEcuaciones(r) : renderMetodoAreas(r)) + '</div>';

  // 6 · Diagramas (sin tabla de valores extremos: 2026-10-25, directriz del profesor)
  const grupos = gruposSolucion(r);
  h += '<div class="res-section"><div class="res-title"><div class="num">6</div>Diagramas DFN · DFC · DMF</div>'
    + '<div class="vis-row" id="grupoSel">'
    + grupos.map(g=>'<label class="vis-item"><input type="checkbox" data-g="' + g.idx + '" checked>'
        + '<span>' + g.recorrido + (g.arco ? ' · curvo' : (g.oblicuo ? ' · ' + dec(g.ang,'ang') + '°' : (g.vertical ? ' · vertical' : ' · recto')))
        + '</span></label>').join('')
    + '</div>'
    + '<div style="display:flex;gap:7px;margin:9px 0 12px">'
    + '<button class="mbtn" onclick="generarDiagramas()">Generar</button>'
    + '<button class="mbtn ghost" onclick="marcarGrupos(true)">Todos</button>'
    + '<button class="mbtn ghost" onclick="marcarGrupos(false)">Ninguno</button>'
    + '</div>'
    + '<div id="diagWrap">' + htmlDiagramasGrupos(r, grupos.map(g=>g.idx)) + '</div></div>';
  return h;
}

// Reacciones con su valor y su sentido real.
function tablaReaccionesMarco(r){
  // El módulo y el sentido real: el signo de la ecuación ya está en el paso.
  let h = '<table class="tabla" style="margin-top:8px"><thead><tr><th>Nudo</th><th>Apoyo</th><th>Componente</th>'
    + '<th class="r">Módulo</th><th>Sentido real</th></tr></thead><tbody>';
  r.inc.forEach((u, j)=>{
    const v = r.val[j];
    if(u.tipo === 'V'){
      const T = VIN_TIPOS[u.vin.tipo], tr = trabajoVinculo(u, v);
      const donde = u.n2 ? u.n.nombre + '–' + u.n2.nombre : u.n.nombre;
      h += '<tr><td><b>' + donde + '</b></td><td>' + T.nom + '</td><td>' + kx(nombreVinculoTex(u.vin)) + '</td>'
        + '<td class="r"><b>' + dec(Math.abs(v),'f') + '</b> ' + unitFor + '</td>'
        + '<td style="color:' + (tr.ok ? '#15803d' : '#c0392b') + ';font-weight:700">' + tr.txt + (tr.ok ? ' ✓' : ' ✗') + '</td></tr>';
      return;
    }
    let comp, sent;
    if(u.tipo === 'M'){ comp = 'Momento M'; sent = v >= 0 ? '↺' : '↻'; }
    else if(u.tipo === 'Rx'){ comp = 'Horizontal R<sub>x</sub>'; sent = flechaSentido(v, 0); }
    else if(u.ang !== undefined && Math.abs(u.ang - Math.PI/2) > 1e-6){
      comp = 'Reacción R (a ' + bsaTextoAnguloAgudo(Math.cos(u.ang), Math.sin(u.ang)) + ')';
      sent = flechaSentido(v*Math.cos(u.ang), v*Math.sin(u.ang));
    } else { comp = 'Vertical R<sub>y</sub>'; sent = flechaSentido(0, v); }
    h += '<tr><td><b>' + u.n.nombre + '</b></td><td>' + NOMBRE_APOYO[u.n.apoyo] + '</td><td>' + comp + '</td>'
      + '<td class="r"><b>' + (u.tipo === 'M' ? dec(Math.abs(v),'mom') : dec(Math.abs(v),'f')) + '</b> ' + (u.tipo === 'M' ? uMom() : unitFor) + '</td>'
      + '<td style="font-size:15px">' + (Math.abs(v) < 5e-10 ? '—' : sent) + '</td></tr>';
  });
  return h + '</tbody></table>';
}
// Fuerzas de cada pasador sobre cada miembro, con su sentido real.
function tablaPasadoresMarco(r){
  const filas = [];
  r.cuerpos.forEach(c=>r.fuerzasEnCuerpo[c.k].forEach(fz=>{
    if(!fz.pin) return;
    filas.push({pin:fz.pin.nodo.nombre, sobre:c.nombre, nom:fz.pin.nombre, v:Math.hypot(fz.fx, fz.fy), fx:fz.fx, fy:fz.fy});
  }));
  if(!filas.length) return '';
  filas.sort((a, b)=>a.pin < b.pin ? -1 : (a.pin > b.pin ? 1 : 0));
  return '<table class="tabla" style="margin-top:8px"><thead><tr><th>Pasador</th><th>Sobre el miembro</th><th>Fuerza</th>'
    + '<th class="r">Valor</th><th>Sentido</th></tr></thead><tbody>'
    + filas.map(q=>'<tr><td><b>' + q.pin + '</b></td><td>' + q.sobre + '</td><td>' + kx(q.nom) + '</td><td class="r"><b>'
      + dec(q.v,'f') + '</b> ' + unitFor + '</td><td style="font-size:15px">' + (q.v < 5e-10 ? '—' : flechaSentido(q.fx, q.fy)) + '</td></tr>').join('')
    + '</tbody></table>';
}

// Las ecuaciones de un DCL, numeradas; la que ya no tiene incógnitas, con sus
// términos en números y la marca de que cierra.
function _ecuacionesPasoHtml(r, ps){
  return '<div class="proc-block">' + ps.eqs.map(eq=>{
    const chk = ecuacionSinIncognitas(eq, ps.sabidasAntes);
    return _filaEc(cabeceraEcuacion(eq) + ':\\quad ' + (chk ? _comprobacionTex(r, eq) : ecuacionTex(r, eq, ps.sabidasAntes)) + '\\qquad(' + eq.num + ')');
  }).join('') + '</div>';
}
function _comprobacionTex(r, eq){
  if(eq.e === 'm' && eq.dentro){
    const ts = terminosEcuacion(r, eq, new Set(r.unk.map((q, j)=>j))).ts;
    return (ts.map((t, i)=>(i ? (t.neg ? ' - ' : ' + ') : (t.neg ? '-' : '')) + t.tex).join('') || '0') + ' = 0\\quad\\checkmark';
  }
  const esM = (eq.e === 'm');
  let s = '';
  const pon = t=>{ if(Math.abs(t) > 5e-10) s += (s ? (t < 0 ? ' - ' : ' + ') : (t < 0 ? '-' : '')) + dec(Math.abs(t), esM ? 'mom' : 'f'); };
  eq.coef.forEach((v, j)=>{ if(Math.abs(v) > EPS_PLAN) pon(v*r.unk[j].valor); });
  pon(eq.cte);
  return (s || '0') + ' = 0\\quad\\checkmark';
}
// Lo que se despeja tras este DCL, citando las ecuaciones de las que sale.
function _despejesHtml(r, ds){
  if(!ds.length) return '';
  return '<div class="proc-block">' + ds.map(d=>_filaEc('\\text{De ' + refsEcuaciones(d.refs) + ':}\\quad '
    + d.U.map(j=>_valorIncTex(r.unk[j])).join(',\\quad '))).join('') + '</div>';
}

// ── DCL de un miembro (k) o, con `opts.global`, del marco entero: su eje, sus
// cargas y lo que recibe (reacciones, pasadores, vínculos). `opts.conocidas`
// (Set de índices de r.unk): lo que aún no se conoce va A TRAZOS y en gris, en
// su sentido supuesto y solo con su nombre; lo conocido, en su sentido real con
// nombre y valor (sin `conocidas`, todo se conoce: el DCL final). `opts.P`: el
// punto de momentos de su paso; con él se acotan los BRAZOS desde P, en
// horizontal y en vertical, cada uno en su nivel; sin él, la geometría en
// cadenas, como el DCL del corte (19-). ──
const COL_INC = '#3d4550';
function svgDCLCuerpo(r, k, opts){
  opts = opts || {};
  const glob = !!opts.global, F1 = v=>v.toFixed(1);
  const sabe = j=>!opts.conocidas || opts.conocidas.has(j);
  const ks = glob ? r.cuerpos.map(c=>c.k) : [k];
  const trs = [].concat(...ks.map(q=>r.cuerpos[q].tramos)), ids = new Set(trs.map(t=>t.id));
  const ejes = trs.map(t=>{ const g = geoTramo(t); return ejeTramo(g, g.arco ? 32 : 1); });
  const nds = [...new Set([].concat(...ks.map(q=>r.cuerpos[q].nudos)))].map(id=>nodo(id));
  const punt = [];
  r.acc.forEach(a=>{
    const cg = a.carga;
    if(cg && (cg.tipo === 'U' || cg.tipo === 'T')) return;
    const dd = r.destinoAccion(a);
    if(dd && (glob || dd.cuerpo === k)) punt.push({a, nom:nomPlanoTex(nombreCargaFI(cg)), col:(Math.hypot(a.fx, a.fy) > 1e-12 ? '#c62828' : '#8b5cf6'), sabido:true});
  });
  if(glob){
    // El marco entero: solo lo de fuera (las reacciones). Las fuerzas entre
    // miembros, y una biela entre dos nudos, se anulan por dentro.
    r.unk.forEach((q, j)=>{
      if(q.tipo !== 'reac' || (q.u.tipo === 'V' && q.u.n2)) return;
      const s = sabe(j), v = s ? q.valor : 1;
      q.apl.forEach(ap=>punt.push({a:{x:ap.x, y:ap.y, fx:v*ap.fx, fy:v*ap.fy, m:v*(ap.m || 0)}, nom:nomPlanoTex(simbReaccion(q.u)),
        col:s ? '#1a7f37' : COL_INC, sabido:s}));
    });
  } else r.fuerzasEnCuerpo[k].forEach(fz=>{
    const s = sabe(r.unk.indexOf(fz.unk));
    const a = s ? fz : {x:fz.x, y:fz.y, fx:fz.ua.x, fy:fz.ua.y, m:fz.ua.m};
    punt.push({a, nom:nomPlanoTex(fz.pin ? fz.pin.nombre : simbReaccion(fz.inc)), col:s ? (fz.pin ? COL_PIN : '#1a7f37') : COL_INC, sabido:s});
  });
  const reps = [];
  cargasConPeso().filter(cg=>(cg.tipo === 'U' || cg.tipo === 'T') && ids.has(cg.tramo)).forEach(cg=>{
    const z = trozoCargado(cg); if(!z || z.len <= 1e-12) return;
    const pts = [];
    for(let i=0;i<=8;i++){
      const s = z.s1 + z.len*i/8, Q = puntoEnTramo(z.g, s);
      const dd = z.g.arco ? dirRepartidaArco(cg, z.g, s) : dirCarga(cg, z.g);
      pts.push({x:Q.x, y:Q.y, dx:dd.x, dy:dd.y, w:wRepartidaEn(cg, z, s)});
    }
    const ac = accionesDeCarga(cg)[0];
    reps.push({cg, pts, res:ac, nom:nomPlanoTex(nombreCargaFI(cg))});
  });
  // Encuadre y cotas: nudos, puntos de las fuerzas y resultante de cada repartida.
  const ptsCota = nds.map(n=>({x:n.x, y:n.y}));
  punt.forEach(p=>{ if(Math.hypot(p.a.fx, p.a.fy) > 1e-12) ptsCota.push({x:p.a.x, y:p.a.y}); });
  reps.forEach(q=>{ if(q.res) ptsCota.push({x:q.res.x, y:q.res.y}); });
  let minx=Infinity, maxx=-Infinity, miny=Infinity, maxy=-Infinity;
  const mete = (x,y)=>{ minx=Math.min(minx,x); maxx=Math.max(maxx,x); miny=Math.min(miny,y); maxy=Math.max(maxy,y); };
  ptsCota.forEach(q=>mete(q.x, q.y));
  ejes.forEach(e=>e.forEach(q=>mete(q.x, q.y)));
  reps.forEach(q=>q.pts.forEach(p=>mete(p.x, p.y)));
  if(opts.P) mete(opts.P.x, opts.P.y);
  const span0 = Math.max(maxx-minx, maxy-miny, 1e-6);
  const unicos = v=>{ const o = v.slice().sort((p,q)=>p-q), u = []; o.forEach(z=>{ if(!u.length || z - u[u.length-1] > 1e-6*span0) u.push(z); }); return u; };
  const cotX = unicos(ptsCota.map(q=>q.x)), cotY = unicos(ptsCota.map(q=>q.y));
  const span = Math.max(maxx-minx, 1e-6), spanY = Math.max(maxy-miny, 0);
  const wLabY = (cotY.length > 1) ? Math.max(...cotY.map((y,i)=>_anchoCota(dec(i ? y - cotY[i-1] : cotY[cotY.length-1] - cotY[0],'len')))) : 0;
  const W2 = 700, MX = 110, MXD = (cotY.length > 1) ? 110 + 3*wLabY : 110, MTOP = 96, MBOT = (cotX.length > 1) ? 150 : 96;
  let kk = (W2 - MX - MXD)/span;
  const H2 = Math.max(260, Math.min(480, MTOP + MBOT + spanY*kk));
  if(spanY > 1e-9) kk = Math.min(kk, (H2 - MTOP - MBOT)/spanY);
  const cx0 = (W2 - MX - MXD - span*kk)/2;
  const SX = x=>MX + cx0 + (x - minx)*kk, SY = y=>H2 - MBOT - (y - miny)*kk;
  const linea = (x1,y1,x2,y2,col,w,dash)=>'<line x1="'+F1(x1)+'" y1="'+F1(y1)+'" x2="'+F1(x2)+'" y2="'+F1(y2)+'" stroke="'+col+'" stroke-width="'+w+'"'+(dash?' stroke-dasharray="'+dash+'"':'')+' stroke-linecap="round"/>';
  const flecha = (x1,y1,x2,y2,col,w,dash)=>{
    const dx=x2-x1, dy=y2-y1, L3=Math.hypot(dx,dy)||1, ex=dx/L3, ey=dy/L3, hx=x2-ex*9, hy=y2-ey*9, px=-ey, py=ex;
    return linea(x1,y1,hx,hy,col,w,dash) + '<path d="M '+F1(x2)+' '+F1(y2)+' L '+F1(hx+px*4)+' '+F1(hy+py*4)+' L '+F1(hx-px*4)+' '+F1(hy-py*4)+' Z" fill="'+col+'"/>';
  };
  const ext = {der:-Infinity, abajo:-Infinity};
  const texto = (x,y,txt,col,sz,peso,anc,it)=>{
    const w = 0.6*(sz||10)*String(txt).length;
    ext.der = Math.max(ext.der, anc === 'end' ? x : (anc === 'middle' ? x + w/2 : x + w));
    ext.abajo = Math.max(ext.abajo, y + 3);
    return '<text x="'+F1(x)+'" y="'+F1(y)+'" font-family="Inter,sans-serif" font-size="'+(sz||10)+'" font-weight="'+(peso||600)+'" fill="'+col+'"'
      + (anc ? ' text-anchor="'+anc+'"' : '') + (it ? ' font-style="italic"' : '') + '>' + txt + '</text>';
  };
  const arcoM = (cx,cy,rr,col,horario,dash)=>{
    const a0=-35*Math.PI/180, a1=215*Math.PI/180;
    const x1=cx+rr*Math.cos(a0), y1=cy-rr*Math.sin(a0), x2=cx+rr*Math.cos(a1), y2=cy-rr*Math.sin(a1);
    const fin = horario ? {x:x1,y:y1,tx:-Math.sin(a0),ty:-Math.cos(a0)} : {x:x2,y:y2,tx:-Math.sin(a1),ty:-Math.cos(a1)};
    const ini = horario ? {x:x2,y:y2} : {x:x1,y:y1}, s2 = horario ? -1 : 1;
    return '<path d="M '+F1(ini.x)+' '+F1(ini.y)+' A '+rr+' '+rr+' 0 1 '+(horario ? 1 : 0)+' '+F1(fin.x)+' '+F1(fin.y)+'" fill="none" stroke="'+col+'" stroke-width="2"'+(dash ? ' stroke-dasharray="'+dash+'"' : '')+'/>'
      + '<path d="M '+F1(fin.x+s2*fin.tx*8)+' '+F1(fin.y-s2*fin.ty*8)+' L '+F1(fin.x+3.5*fin.ty*s2)+' '+F1(fin.y+3.5*fin.tx*s2)+' L '+F1(fin.x-3.5*fin.ty*s2)+' '+F1(fin.y-3.5*fin.tx*s2)+' Z" fill="'+col+'"/>';
  };
  let sv = '';
  // repartidas: flechas y línea de colas, su intensidad y su resultante a trazos
  const wmax = Math.max(1e-9, ...reps.map(q=>Math.max(...q.pts.map(p=>Math.abs(p.w)))));
  reps.forEach(q=>{
    const base = q.pts.map(p=>({x:SX(p.x), y:SY(p.y)}));
    const colas = q.pts.map((p,i)=>{ const hh = 26*p.w/wmax; return {x:base[i].x - p.dx*hh, y:base[i].y + p.dy*hh}; });
    sv += '<path d="M '+base.map(z=>F1(z.x)+' '+F1(z.y)).join(' L ')+' L '+colas.slice().reverse().map(z=>F1(z.x)+' '+F1(z.y)).join(' L ')+' Z" fill="#b8860b" fill-opacity=".14"/>';
    sv += '<polyline points="'+colas.map(z=>F1(z.x)+','+F1(z.y)).join(' ')+'" fill="none" stroke="#b8860b" stroke-width="1.8"/>';
    q.pts.forEach((p,i)=>{ if(i % 2) return; const cc = colas[i], X = base[i].x, Y = base[i].y, hh = Math.hypot(cc.x - X, cc.y - Y);
      if(hh > 4) sv += flecha(cc.x, cc.y, X + (cc.x - X)/hh*3, Y + (cc.y - Y)/hh*3, '#b8860b', 1.6); });
    const m = colas[colas.length >> 1];
    sv += texto(m.x, m.y - 6, q.nom + ' = ' + dec(Math.abs(q.pts[0].w),'f') + (Math.abs(q.pts[q.pts.length-1].w - q.pts[0].w) > 1e-9 ? '→' + dec(Math.abs(q.pts[q.pts.length-1].w),'f') : ''), '#8a6508', 9.5, 700, 'middle');
    if(q.res){
      const Fm = Math.hypot(q.res.fx, q.res.fy);
      if(Fm > 1e-12){
        const ex = q.res.fx/Fm, ey = -q.res.fy/Fm, X = SX(q.res.x), Y = SY(q.res.y);
        sv += flecha(X - ex*40, Y - ey*40, X - ex*4, Y - ey*4, '#8a6508', 1.3, '5,3');
      }
    }
  });
  // el miembro (o el marco)
  ejes.forEach(e=>{ sv += '<polyline points="'+e.map(q=>F1(SX(q.x))+','+F1(SY(q.y))).join(' ')+'" fill="none" stroke="#26415e" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/>'; });
  const pinIds = new Set(r.pines.filter(p=>ks.some(q=>p.cuerpos.indexOf(q) >= 0)).map(p=>p.n.id));
  // Primero los nudos y TODAS las flechas; después los rótulos, cada uno en el
  // primer sitio que no pisa una flecha, el miembro ni otro rótulo (dos
  // componentes en un mismo nudo, el nombre del nudo junto a sus fuerzas).
  nds.forEach(n=>{
    sv += '<circle cx="'+F1(SX(n.x))+'" cy="'+F1(SY(n.y))+'" r="4.6" fill="'+(pinIds.has(n.id) || n.rotula ? '#fff' : '#26415e')+'" stroke="#26415e" stroke-width="2"/>';
  });
  const segs = [], cajas = [];
  ejes.forEach(e=>e.forEach((q, i)=>{ if(i) segs.push([SX(e[i-1].x), SY(e[i-1].y), SX(q.x), SY(q.y)]); }));
  nds.forEach(n=>cajas.push([SX(n.x) - 6, SY(n.y) - 6, SX(n.x) + 6, SY(n.y) + 6]));
  const pend = [];
  punt.forEach(p=>{
    const a = p.a, X = SX(a.x), Y = SY(a.y), Fm = Math.hypot(a.fx, a.fy), dash = p.sabido ? null : '6,4';
    if(Fm > 1e-9){
      const ex = a.fx/Fm, ey = -a.fy/Fm;
      sv += flecha(X - ex*40, Y - ey*40, X - ex*5, Y - ey*5, p.col, 2.2, dash);
      segs.push([X - ex*40, Y - ey*40, X - ex*5, Y - ey*5]);
      pend.push({txt:p.sabido ? p.nom + ' = ' + dec(Fm,'f') : p.nom, col:p.col, tx:X - ex*40, ty:Y - ey*40, ex, ey});
    }
    if(Math.abs(a.m || 0) > 1e-9){
      sv += arcoM(X, Y, 15, p.col, a.m < 0, dash);
      cajas.push([X - 17, Y - 17, X + 17, Y + 17]);
      pend.push({txt:p.sabido ? p.nom + ' = ' + dec(Math.abs(a.m),'mom') : p.nom, col:p.col, tx:X, ty:Y, par:true});
    }
  });
  const choca = b=>cajas.some(c=>b[0] < c[2] && b[2] > c[0] && b[1] < c[3] && b[3] > c[1])
    || segs.some(s=>{ for(let i=0;i<=12;i++){ const x = s[0] + (s[2]-s[0])*i/12, y = s[1] + (s[3]-s[1])*i/12;
        if(x > b[0] - 2 && x < b[2] + 2 && y > b[1] - 2 && y < b[3] + 2) return true; } return false; });
  const poner = (cand, w, hh, txt, col, sz, peso)=>{
    let el = cand[0];
    for(const c of cand){ const bx = [c[0] - w/2, c[1] - hh + 2, c[0] + w/2, c[1] + 3]; if(!choca(bx)){ el = c; break; } }
    cajas.push([el[0] - w/2, el[1] - hh + 2, el[0] + w/2, el[1] + 3]);
    sv += texto(el[0], el[1], txt, col, sz, peso, 'middle');
  };
  // nombres de nudo: ocho sitios alrededor, el primero lejos de sus tramos
  nds.forEach(n=>{
    let dx = 0, dy = 0;
    trs.forEach(t=>{
      if(t.a !== n.id && t.b !== n.id) return;
      const u = tangenteEnNudo(t, n.id), sg = (t.a === n.id) ? 1 : -1;
      dx += u.x*sg; dy += -u.y*sg;
    });
    const a0 = Math.hypot(dx, dy) > 0.3 ? Math.atan2(-dy, -dx) : Math.PI*0.75;
    const cand = [];
    for(let i=0;i<8;i++){ const a = a0 + (i % 2 ? 1 : -1)*Math.ceil(i/2)*Math.PI/4; cand.push([SX(n.x) + 17*Math.cos(a), SY(n.y) + 17*Math.sin(a) + 4]); }
    poner(cand, 14, 12, n.nombre, '#1b1f24', 11, 800);
  });
  // valores: junto a la cola; sobre o bajo una flecha horizontal (en su línea
  // caería encima de la línea de referencia de las cotas)
  pend.forEach(q=>{
    const w = 6*q.txt.length + 4;
    let cand;
    if(q.par) cand = [[q.tx + 22 + w/2, q.ty - 18], [q.tx - 22 - w/2, q.ty - 18], [q.tx + 22 + w/2, q.ty + 24], [q.tx - 22 - w/2, q.ty + 24]];
    else if(Math.abs(q.ex) >= 0.7) cand = [[q.tx, q.ty - 9], [q.tx, q.ty + 17], [q.tx - q.ex*(w/2 + 6), q.ty + 4],
                                            [q.tx - q.ex*(w/2 + 6), q.ty - 12], [q.tx - q.ex*(w/2 + 6), q.ty + 20]];
    else cand = [[q.tx, q.ty - q.ey*10 + (q.ey > 0 ? -2 : 10)], [q.tx + w/2 + 8, q.ty + 4], [q.tx - w/2 - 8, q.ty + 4],
                 [q.tx + w/2 + 8, q.ty - q.ey*14], [q.tx - w/2 - 8, q.ty - q.ey*14]];
    poner(cand, w, 12, q.txt, q.col, 10, 800);
  });
  let cot;
  if(opts.P){
    // El punto de momentos, marcado; y los brazos de cada fuerza desde él.
    const P = opts.P, xp = SX(P.x), yp = SY(P.y);
    sv += '<circle cx="'+F1(xp)+'" cy="'+F1(yp)+'" r="8.5" fill="none" stroke="#b45309" stroke-width="1.6" stroke-dasharray="3,2"/>';
    const fs = punt.filter(p=>Math.hypot(p.a.fx, p.a.fy) > 1e-12).map(p=>({x:p.a.x, y:p.a.y, fx:p.a.fx, fy:p.a.fy}));
    reps.forEach(q=>accionesDeCarga(q.cg).forEach(a=>{ if(Math.hypot(a.fx, a.fy) > 1e-12) fs.push({x:a.x, y:a.y, fx:a.fx, fy:a.fy}); }));
    cot = cotasBrazosSVG(P, fs, SX, SY, F1, texto, ext);
  } else cot = cotasCorteSVG(ptsCota, cotX, cotY, SX, SY, F1, texto, ext);
  sv += cot.s;
  const Wf = Math.max(W2, Math.ceil(cot.der + 12)), Hf = Math.max(H2, Math.ceil(cot.abajo + 12));
  return '<div class="dcl-caja"><svg viewBox="0 0 '+Wf+' '+Hf+'" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">'
    + '<rect width="'+Wf+'" height="'+Hf+'" fill="#fff"/>' + sv + '</svg></div>';
}

// Brazos desde el punto de momentos P, como en el DCL del PDF: solo en
// horizontal y en vertical, cada brazo en su nivel, del más corto (junto al
// dibujo) al más largo (por fuera); líneas de extensión a trazos desde P y
// desde el punto de cada fuerza. Las horizontales, debajo de todo; las
// verticales, a la derecha, con el valor derecho al lado de su línea.
function cotasBrazosSVG(P, fs, SX, SY, F1, texto, ext){
  const COL = '#4a5460', EXT = '#a3adb8';
  const lin = (x1,y1,x2,y2,c,w,d)=>'<line x1="'+F1(x1)+'" y1="'+F1(y1)+'" x2="'+F1(x2)+'" y2="'+F1(y2)+'" stroke="'+c+'" stroke-width="'+w+'"'+(d?' stroke-dasharray="'+d+'"':'')+'/>';
  const punta = (x,y,ex,ey)=>'<path d="M '+F1(x)+' '+F1(y)+' L '+F1(x-ex*6-ey*2.6)+' '+F1(y-ey*6+ex*2.6)+' L '+F1(x-ex*6+ey*2.6)+' '+F1(y-ey*6-ex*2.6)+' Z" fill="'+COL+'"/>';
  const tramo = (x1,y1,x2,y2)=>{
    const L = Math.hypot(x2-x1, y2-y1) || 1, ex = (x2-x1)/L, ey = (y2-y1)/L;
    return lin(x1,y1,x2,y2,COL,1) + (L > 14 ? punta(x2,y2,ex,ey) + punta(x1,y1,-ex,-ey) : '');
  };
  const uniq = vs=>[...new Set(vs.map(v=>+v.toFixed(6)))];
  const xs = uniq(fs.filter(f=>Math.abs(f.fy) > 1e-9 && Math.abs(f.x - P.x) > 1e-6).map(f=>f.x)).sort((a, b)=>Math.abs(a - P.x) - Math.abs(b - P.x));
  const ys = uniq(fs.filter(f=>Math.abs(f.fx) > 1e-9 && Math.abs(f.y - P.y) > 1e-6).map(f=>f.y)).sort((a, b)=>Math.abs(a - P.y) - Math.abs(b - P.y));
  const derPrev = ext.der, abajoPrev = ext.abajo;
  let yMax = SY(P.y), xMax = SX(P.x);
  fs.forEach(f=>{ yMax = Math.max(yMax, SY(f.y)); xMax = Math.max(xMax, SX(f.x)); });
  let s = '';
  const etq = v=>dec(v,'len') + ' ' + unitLen;
  if(xs.length){
    // Las líneas de referencia arrancan por debajo de todo lo dibujado: desde
    // el punto cruzarían flechas y rótulos.
    const y0 = Math.max(yMax + 50, abajoPrev + 16), paso = 26, xp = SX(P.x), yIni = Math.max(yMax + 8, abajoPrev + 3);
    s += lin(xp, yIni, xp, y0 + (xs.length - 1)*paso + 4, EXT, .8, '3 3');
    xs.forEach((xv, i)=>{
      const yy = y0 + i*paso, x1 = SX(xv);
      s += lin(x1, yIni, x1, yy + 4, EXT, .8, '3 3') + tramo(xp, yy, x1, yy);
      const t = etq(Math.abs(xv - P.x)), w = _anchoCota(t);
      // dentro si cabe; si no, pasado el extremo de fuera
      const xm = (Math.abs(x1 - xp) >= w) ? (xp + x1)/2 : (x1 > xp ? x1 + w/2 + 4 : x1 - w/2 - 4);
      s += texto(xm, yy - 4, t, COL, 9.5, 700, 'middle');
    });
  }
  if(ys.length){
    const wl = Math.max(...ys.map(yv=>_anchoCota(etq(Math.abs(yv - P.y)))));
    const x0 = Math.max(xMax + 50, derPrev + 14), paso = wl + 12, yp = SY(P.y), xIni = Math.max(xMax + 8, derPrev + 3);
    s += lin(SX(P.x) + 9, yp, x0 + (ys.length - 1)*paso + 4, yp, EXT, .8, '3 3');
    ys.forEach((yv, i)=>{
      const xx = x0 + i*paso, y1 = SY(yv);
      s += lin(xIni, y1, xx + 4, y1, EXT, .8, '3 3') + tramo(xx, yp, xx, y1);
      const ym = (Math.abs(y1 - yp) >= 14) ? (yp + y1)/2 + 3.5 : Math.max(yp, y1) + 13;
      s += texto(xx + 5, ym, etq(Math.abs(yv - P.y)), COL, 9.5, 700, 'start');
    });
  }
  return {s, der:ext.der, abajo:ext.abajo};
}
