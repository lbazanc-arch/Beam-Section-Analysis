// ── Ley de intensidad de las cargas distribuidas variables ──
// Devuelve, para cada carga variable que cubre el subtramo, el polinomio de
// w expresado en la MISMA abscisa que el resto del bloque. Las uniformes se
// omiten: su ley es una constante que ya se lee en el dibujo.
function leyesDeCarga(seg, sub, off){
  const out = [];
  const tid = seg.tramo && seg.tramo.id;
  if(!tid) return out;
  cargasConPeso().forEach(c=>{
    if(c.tipo !== 'T' || c.tramo !== tid) return;
    const z = trozoCargado(c);
    if(!z || z.len <= 1e-12) return;
    // El tramo puede recorrerse al revés que su definición: en ese caso los
    // límites y las intensidades se invierten para quedar en la abscisa
    // que se está mostrando.
    const inv = !!seg.invert;
    const r1 = inv ? (seg.L - z.s2) : z.s1;
    const w1 = inv ? (c.mag2 || 0) : c.mag;
    const w2 = inv ? c.mag : (c.mag2 || 0);
    // ¿cubre este subtramo?
    const r2 = r1 + z.len;
    if(sub.sb <= r1 + 1e-9 || sub.sa >= r2 - 1e-9) return;
    if(Math.abs(w2 - w1) < 1e-12) return;   // constante: no aporta nada
    // w(s) = w1 + (w2-w1)*(s - r1)/len, con s sobre el eje del tramo.
    // La abscisa mostrada es X = off + s, luego s = X - off.
    const B = (w2 - w1)/z.len;
    const A = w1 - B*(off + r1);
    out.push({carga:c, c:[A, B]});
  });
  return out;
}

function renderMetodoEcuaciones(r){
  let h = '<div class="verdict"><div class="verdict-t">Método de las ecuaciones</div>'
    + 'En cada subtramo se corta en una sección genérica y se plantea el equilibrio del trozo '
    + 'anterior. La abscisa se mide desde el último punto de quiebre: se llama <i>x</i> en los '
    + 'tramos rectos y <i>r</i> en los inclinados, donde es la resultante de los catetos. El DCL muestra <b>todas las '
    + 'cargas que interactúan</b> con ese trozo: reacciones, puntuales, momentos y la parte de '
    + 'las distribuidas hasta el corte. El desarrollo paso a paso se incluye en el PDF.</div>';
  const _grupos = gruposDireccion(r);
  r.internas.forEach((t,ti)=>{
    // Grupo (recta continua) al que pertenece este tramo: de él salen el
    // origen de la abscisa y su símbolo.
    const gt = _grupos.find(g=>g.tramos.indexOf(t) >= 0) || _grupos[0];
    const sb = gt.simbolo;
    h += '<div class="sub-tramo-cab">Tramo '+t.nombre+' — L = '+dec(t.L,'len')+' '+unitLen
      + (Math.abs(t.ang)>0.05 ? ' · inclinación '+t.ang.toFixed(1)+'°' : '') + '</div>';
    t.subs.forEach((sub,si)=>{
      // La abscisa se mide desde el arranque del GRUPO (el punto de quiebre),
      // no desde el origen de la viga: recorrer un eje quebrado desde A no
      // tiene sentido físico. En los grupos inclinados se llama r.
      const off = t.s0 - gt.s0;
      const a = dec(off + sub.sa,'len'), b = dec(off + sub.sb,'len');
      h += '<div class="dcl-caja">'
        + '<div class="dcl-rango">'+(t.subs.length>1 ? 'Subtramo '+(si+1)+' · ' : '')
        + kx(a+' \\le '+sb+' \\le '+b)
        + ' <span class="dcl-nota">(' + gt.simbolo + ' medida desde '
        + gt.desde.nombre + ', a lo largo del eje del tramo'
        + (gt.inclinado
            ? '; al ser inclinado, <i>r</i> es la resultante de los catetos en x e y'
            : '')
        + ', en '+unitLen+')</span></div>'
        + svgDCL(r, ti, sub)
        + '<div class="dcl-ecs">';
      const gN = desplazarPoly(sub.cN, off),
            gV = desplazarPoly(sub.cV, off),
            gM = desplazarPoly(sub.cM, off);
      // Si sobre este subtramo actúa una carga VARIABLE, se muestra primero
      // su ley w(x): es el dato del que salen V y M por integración, y sin
      // él el alumno no puede seguir de dónde vienen los coeficientes.
      const leyes = leyesDeCarga(t, sub, off);
      leyes.forEach(L=>{
        h += '<div class="eq-row"><div class="eq-body">'
          + kx('w('+sb+') = '+polyTex(L.c,'f',sb)+'\\ \\ ['+uDist()+']')
          + '</div></div>';
      });
      if(gN.some(v=>Math.abs(v)>5e-9))
        h += '<div class="eq-row"><div class="eq-body">'
          + kx('\\sum F_{\\parallel} = 0:\\quad N('+sb+') = '+polyTex(gN,'f',sb)+'\\ \\ ['+unitFor+']')
          + '</div></div>';
      h += '<div class="eq-row"><div class="eq-body">'
        + kx('+\\!\\uparrow \\sum F_{\\perp} = 0:\\quad V('+sb+') = '+polyTex(gV,'f',sb)+'\\ \\ ['+unitFor+']')
        + '</div></div>'
        + '<div class="eq-row"><div class="eq-body">'
        + kx('\\circlearrowleft\\! + \\;\\sum M_{\\text{corte}} = 0:\\quad M('+sb+') = '+polyTex(gM,'mom',sb)+'\\ \\ ['+uMom()+']')
        + '</div></div></div>'
        + '<div class="dcl-extremos">Extremos del subtramo:'
        + (gN.some(v=>Math.abs(v)>5e-9)
            ? '<br>N('+a+') = <b>'+dec(polyVal(sub.cN,sub.sa),'f')+'</b> · '
              + 'N('+b+') = <b>'+dec(polyVal(sub.cN,sub.sb),'f')+'</b> '+unitFor
            : '')
        + '<br>V('+a+') = <b>'+dec(polyVal(sub.cV,sub.sa),'f')+'</b> · '
        + 'V('+b+') = <b>'+dec(polyVal(sub.cV,sub.sb),'f')+'</b> '+unitFor
        + '<br>M('+a+') = <b>'+dec(polyVal(sub.cM,sub.sa),'mom')+'</b> · '
        + 'M('+b+') = <b>'+dec(polyVal(sub.cM,sub.sb),'mom')+'</b> '+uMom()
        + ceroDeMomento(sub, off, sb)
        + '</div></div>';
    });
  });
  return h;
}

function renderMetodoAreas(r){
  let h = '<div class="verdict"><div class="verdict-t">Método de las áreas</div>'
    + 'Se apoya en las relaciones diferenciales ' + kx('\\tfrac{dV}{dx} = -w') + ' y '
    + kx('\\tfrac{dM}{dx} = V') + ': el cambio de V entre dos secciones es el área del '
    + 'diagrama de carga con signo cambiado, y el cambio de M es el área bajo el diagrama '
    + 'de cortante. En cada carga puntual V da un salto y en cada momento aplicado salta M. '
    + 'Observa que en cada fila ΔM coincide con M fin − M inicio. '
    + 'El desarrollo paso a paso se incluye en el PDF.</div>';
  r.internas.forEach(t=>{
    h += '<div class="sub-tramo-cab">Tramo '+t.nombre+'</div>'
      + '<table class="tabla"><thead><tr><th>Intervalo ['+unitLen+']</th>'
      + '<th class="r">V inicio</th><th class="r">V fin</th>'
      + '<th class="r">ΔV = −∫w·dx</th>'
      + '<th class="r">M inicio</th><th class="r">M fin</th>'
      + '<th class="r">ΔM = ∫V·dx</th></tr></thead><tbody>';
    t.subs.forEach(sub=>{
      const Vi=polyVal(sub.cV,sub.sa), Vf=polyVal(sub.cV,sub.sb);
      const Mi=polyVal(sub.cM,sub.sa), Mf=polyVal(sub.cM,sub.sb);
      h += '<tr><td>'+dec(sub.sa,'len')+' — '+dec(sub.sb,'len')+'</td>'
        + '<td class="r">'+dec(Vi,'f')+'</td><td class="r">'+dec(Vf,'f')+'</td>'
        + '<td class="r">'+dec(Vf-Vi,'f')+'</td>'
        + '<td class="r">'+dec(Mi,'mom')+'</td><td class="r">'+dec(Mf,'mom')+'</td>'
        + '<td class="r"><b>'+dec(polyIntDef(sub.cV,sub.sa,sub.sb),'mom')+'</b></td></tr>';
    });
    h += '</tbody></table>';
    const saltos = [];
    for(let k2=0;k2<t.subs.length-1;k2++){
      const s1=t.subs[k2], s2=t.subs[k2+1];
      const dV = polyVal(s2.cV,s2.sa) - polyVal(s1.cV,s1.sb);
      const dM = polyVal(s2.cM,s2.sa) - polyVal(s1.cM,s1.sb);
      const partes = [];
      if(Math.abs(dV) > 1e-7) partes.push('ΔV = <b>'+dec(dV,'f')+'</b> '+unitFor+' por la acción puntual');
      if(Math.abs(dM) > 1e-7) partes.push('ΔM = <b>'+dec(dM,'mom')+'</b> '+uMom()+' por el momento aplicado');
      if(partes.length) saltos.push('En x = '+dec(s2.sa,'len')+' '+unitLen+': '+partes.join(' y ')+'.');
    }
    if(saltos.length)
      h += '<div class="dcl-saltos">'+saltos.map(z=>'<div>· '+z+'</div>').join('')+'</div>';
  });
  return h;
}

function renderResultados(r){
  const f=v=>dec(v,'f'), nl=v=>dec(v,'len'), fm=v=>dec(v,'mom');
  let h = '';

  // 1 · Determinación
  h += '<div class="res-section"><div class="res-title"><div class="num">1</div>'
    + 'Determinación estática</div>'
    + '<div class="verdict ok"><div class="verdict-t">Resultado</div>'
    + 'Viga isostática: <b>'+r.diag.inc+' reacciones</b> y <b>'+r.diag.eq+' ecuaciones</b> de equilibrio'
    + (r.diag.rot ? ', incluyendo '+r.diag.rot+' por rótula interna.' : '.') + '</div>'
    + '<div class="proc-block"><div class="eq-row"><div class="eq-body">'
    + kx('\\sum F_x = 0 \\qquad \\sum F_y = 0 \\qquad \\sum M = 0'
         + (r.diag.rot ? '\\qquad \\sum M_{\\text{rótula}} = 0' : ''))
    + '</div></div></div></div>';

  // 2 · Reacciones
  h += '<div class="res-section"><div class="res-title"><div class="num">2</div>'
    + 'Reacciones en los apoyos</div>'
    + '<table class="tabla"><thead><tr><th>Nudo</th><th>Apoyo</th><th>Componente</th>'
    + '<th class="r">Valor</th><th>Unidad</th></tr></thead><tbody>';
  r.inc.forEach((u,j)=>{
    const v = r.val[j];
    const comp = u.tipo==='Rx'?'Horizontal R<sub>x</sub>':(u.tipo==='Ry'?'Vertical R<sub>y</sub>':'Momento M');
    h += '<tr><td><b>'+u.n.nombre+'</b></td><td>'+NOMBRE_APOYO[u.n.apoyo]+'</td><td>'+comp+'</td>'
      + '<td class="r"><b>'+(u.tipo==='M'?fm(v):f(v))+'</b></td>'
      + '<td>'+(u.tipo==='M'?uMom():unitFor)+'</td></tr>';
  });
  h += '</tbody></table></div>';

  // 3 · Procedimiento con el método elegido
  h += '<div class="res-section"><div class="res-title"><div class="num">3</div>'
    + 'Procedimiento — ' + (metodo7==='ecuaciones' ? 'método de las ecuaciones' : 'método de las áreas') + '</div>'
    + '<div class="hint-sm" style="margin:2px 0 12px">El método se elige en '
    + '<b>Método</b>, en la columna de control.</div>'
    + (metodo7==='ecuaciones' ? renderMetodoEcuaciones(r) : renderMetodoAreas(r))
    + '</div>';

  // 4 · Resumen de fuerzas internas por tramo
  h += '<div class="res-section"><div class="res-title"><div class="num">4</div>'
    + 'Resumen de fuerzas internas por tramo</div>'
    + '<div class="verdict"><div class="verdict-t">Ejes locales</div>'
    + 'En un tramo inclinado, <b>N</b> va a lo largo del tramo y <b>V</b> perpendicular a él. '
    + 'Por eso cada tramo se analiza sobre su propio eje y no sobre la horizontal.</div>'
    + '<table class="tabla"><thead><tr><th>Tramo</th><th class="r">Longitud</th>'
    + '<th class="r">Inclinación</th><th class="r">N máx</th><th class="r">V máx</th>'
    + '<th class="r">M máx</th></tr></thead><tbody>';
  r.internas.forEach(t=>{
    const mx = arr => arr.reduce((m,p)=>Math.abs(p)>Math.abs(m)?p:m, 0);
    h += '<tr><td><b>'+t.nombre+'</b></td><td class="r">'+nl(t.L)+' '+unitLen+'</td>'
      + '<td class="r">'+t.ang.toFixed(1)+'°</td>'
      + '<td class="r">'+f(mx(t.puntos.map(p=>p.N)))+'</td>'
      + '<td class="r">'+f(mx(t.puntos.map(p=>p.V)))+'</td>'
      + '<td class="r">'+fm(mx(t.puntos.map(p=>p.M)))+'</td></tr>';
  });
  h += '</tbody></table></div>';

  // 5 · Diagramas, agrupados por cambio de dirección
  const grupos = gruposDireccion(r);
  h += '<div class="res-section"><div class="res-title"><div class="num">5</div>'
    + 'Diagramas DFN · DFC · DMF</div>'
    + '<div class="hint-sm" style="margin-bottom:8px">La viga tiene <b>' + grupos.length
    + '</b> tramo(s) por cambio de dirección. Elige cuáles quieres graficar '
    + 'y pulsa Generar; cada uno lleva sus tres diagramas con su propia abscisa.</div>'
    + '<div class="vis-row" id="grupoSel">'
    + grupos.map(g=>'<label class="vis-item"><input type="checkbox" data-g="'+g.idx+'" checked>'
        + '<span>' + g.recorrido + (g.inclinado ? ' · ' + g.ang.toFixed(1) + '°' : ' · recto')
        + '</span></label>').join('')
    + '</div>'
    + '<div style="display:flex;gap:7px;margin:9px 0 12px">'
    + '<button class="mbtn" onclick="generarDiagramas()">Generar</button>'
    + '<button class="mbtn ghost" onclick="marcarGrupos(true)">Todos</button>'
    + '<button class="mbtn ghost" onclick="marcarGrupos(false)">Ninguno</button>'
    + '<button class="mbtn" style="background:#0e9f6e" onclick="abrirVerDiagramas()">'
    + 'Ver diagramas</button>'
    + '</div>'
    + '<div id="diagWrap">' + htmlDiagramasGrupos(r, grupos.map(g=>g.idx)) + '</div>'
    + '</div>';
  return h;
}

// ═══════════════════════════════════════════════════════════
//  DIAGRAMAS N · V · M
//  Antes se dibujaba muestreando el tramo a intervalos regulares. Eso tiene
//  dos consecuencias malas: en una carga puntual el salto cae ENTRE dos
//  muestras y se pinta como una rampa inclinada, cuando en realidad los dos
//  valores conviven en la misma x; y los vértices exactos se pierden.
//  Ahora se dibuja a partir de los polinomios exactos de cada subtramo:
//  cada uno se evalúa en sus propios extremos, de modo que una
//  discontinuidad produce dos ordenadas en la misma abscisa y el trazo baja
//  o sube EN VERTICAL, como debe ser.
// ═══════════════════════════════════════════════════════════

// Muestreo de una serie a lo largo de toda la viga, respetando los saltos.
// Devuelve una lista de tramos continuos; entre uno y el siguiente hay una
// discontinuidad que se dibuja como segmento vertical.
function muestrearSerie(r, clave, lista, base0){
  const campo = {N:'cN', V:'cV', M:'cM'}[clave];
  const ramas = [];
  let anterior = null;      // {x, v} final de la rama previa
  (lista || r.internas).forEach(t=>{
    t.subs.forEach(sub=>{
      const c = sub[campo];
      // grado real: si es lineal bastan los extremos; si es curvo se afina
      const grado = c.reduce((g,v,i)=>Math.abs(v)>1e-12?i:g, 0);
      const n = grado >= 2 ? 24 : 1;
      const pts = [];
      for(let i=0;i<=n;i++){
        const sl = sub.sa + (sub.sb-sub.sa)*i/n;
        pts.push({x: t.s0 - (base0||0) + sl, v: polyVal(c, sl)});
      }
      const ini = pts[0];
      if(anterior && Math.abs(ini.v - anterior.v) > 1e-7*Math.max(1,Math.abs(anterior.v)))
        ramas.push({salto:true, x:ini.x, de:anterior.v, a:ini.v});
      ramas.push({salto:false, pts});
      anterior = pts[pts.length-1];
    });
  });
  return ramas;
}

// Puntos que merecen etiqueta: extremos de cada rama, los dos lados de cada
// salto, y los máximos/mínimos interiores (donde la derivada cambia de signo).
function etiquetasSerie(ramas){
  const et = [];
  const push = (x,v,prio)=>{
    if(!isFinite(v)) return;
    const igual = et.find(e=>Math.abs(e.x-x)<1e-7 && Math.abs(e.v-v)<1e-7);
    if(!igual) et.push({x, v, prio});
  };
  ramas.forEach(rm=>{
    if(rm.salto){
      // Si los dos lados coinciden en la práctica, es un vértice y no un
      // salto: una sola etiqueta. Antes se escribían las dos, una encima de
      // la otra.
      const ref = Math.max(1, Math.abs(rm.de), Math.abs(rm.a));
      if(Math.abs(rm.de - rm.a) < 5e-3*ref) push(rm.x, rm.a, 2);
      else { push(rm.x, rm.de, 2); push(rm.x, rm.a, 2); }
      return;
    }
    const p = rm.pts;
    push(p[0].x, p[0].v, 1);
    push(p[p.length-1].x, p[p.length-1].v, 1);
    for(let i=1;i<p.length-1;i++){
      const d1 = p[i].v - p[i-1].v, d2 = p[i+1].v - p[i].v;
      if(d1*d2 < 0) push(p[i].x, p[i].v, 3);      // vértice de la parábola
    }
  });
  return et;
}

// Dibuja los grupos pedidos, cada uno con su encabezado.
function htmlDiagramasGrupos(r, idxs){
  const grupos = gruposDireccion(r);
  if(!idxs || !idxs.length)
    return '<div class="hint-sm" style="padding:14px;text-align:center">'
         + 'No hay ningún tramo seleccionado.</div>';
  return idxs.map(i=>{
    const g = grupos[i];
    if(!g) return '';
    return '<div style="margin-bottom:16px">'
      + '<div style="font-weight:800;font-size:11.5px;color:var(--acc);margin-bottom:5px">'
      + 'Tramo ' + g.recorrido + ' — '
      + (g.inclinado ? 'inclinado ' + g.ang.toFixed(1) + '°' : 'recto')
      + ' · L = ' + dec(g.L,'len') + ' ' + unitLen
      + ' · abscisa <i>' + g.simbolo + '</i> desde ' + g.desde.nombre + '</div>'
      + '<div class="proc-block">' + svgDiagramas(r, g) + '</div>'
      + htmlExtremosGrupo(r, g) + '</div>';
  }).join('');
}
function marcarGrupos(v){
  document.querySelectorAll('#grupoSel input[type=checkbox]').forEach(c=>{ c.checked = v; });
}
function generarDiagramas(){
  if(!R || R.error) return;
  const idxs = [...document.querySelectorAll('#grupoSel input[type=checkbox]')]
    .filter(c=>c.checked).map(c=>parseInt(c.dataset.g));
  const w = document.getElementById('diagWrap');
  if(w) w.innerHTML = htmlDiagramasGrupos(R, idxs);
}

// ═══════════════════════════════════════════════════════════
//  VENTANA «DIAGRAMAS INTERACTIVOS»
//  DCL global con reacciones + diagramas N/V/M del tramo elegido,
//  con ruedas para variar cada carga y ver el efecto al instante.
//  Los límites de cada rueda parten de ±200 % del valor original y
//  pueden fijarse a mano. Al cerrar sin aplicar, todo vuelve a como
//  estaba: la ventana es un banco de pruebas, no un editor.
// ═══════════════════════════════════════════════════════════
let _vdOrig = null;     // valores originales de las cargas, para restaurar
let _vdLim  = {};       // límites de cada rueda {id:{min,max,min2,max2}}
let _vdGrupo = 0;       // grupo de dirección elegido
let _vdCarga = null;    // carga seleccionada para variar
let _vdRaf = 0;         // recálculo agrupado por frame: giros rápidos no se apilan

function _vdLimDefecto(v){
  // ±200 % del valor original. Con valor nulo la rueda quedaría muerta,
  // así que se abre un rango simétrico razonable.
  const a = Math.abs(v);
  const medio = a > 1e-12 ? 2*a : 10;
  return {min:+(v - medio).toFixed(6), max:+(v + medio).toFixed(6)};
}

function _vdModal(){
  let ov = document.getElementById('vdOv');
  if(ov) return ov;
  ov = document.createElement('div');
  ov.id = 'vdOv';
  ov.className = 'modal-ov';
  ov.innerHTML =
      '<div class="modal vd">'
    +   '<div class="vd-cab">'
    +     '<div><h3>Diagramas interactivos</h3>'
    +     '<p class="sub" style="margin-bottom:0">Gira la rueda de una carga y observa al instante '
    +     'cómo cambian las reacciones y los tres diagramas.</p></div>'
    +     '<button class="vd-x" onclick="cerrarVerDiagramas(false)" title="Cerrar" aria-label="Cerrar">&#10005;</button>'
    +   '</div>'
    +   '<div class="vd-cuerpo">'
    +     '<div class="vd-sec-tit">DCL de la estructura</div>'
    +     '<div id="vdDCL" class="vd-dcl"></div>'
    +     '<div class="vd-sec-tit">Tramo a analizar</div>'
    +     '<div id="vdGrupos" class="vd-grupos"></div>'
    +     '<div class="vd-sec-tit">Carga a variar</div>'
    +     '<div class="vd-carga-fila">'
    +       '<select id="vdSelCarga" onchange="vdCambioCarga(this.value)"></select>'
    +     '</div>'
    +     '<div id="vdRuedas"></div>'
    +     '<div class="vd-sec-tit">Diagramas del tramo</div>'
    +     '<div id="vdDiag"></div>'
    +   '</div>'
    +   '<div class="vd-pie">'
    +     '<button class="mbtn ghost" onclick="cerrarVerDiagramas(false)">Cerrar sin aplicar</button>'
    +     '<button class="mbtn" onclick="cerrarVerDiagramas(true)">Aplicar cambios</button>'
    +   '</div>'
    + '</div>';
  document.body.appendChild(ov);
  return ov;
}

function abrirVerDiagramas(){
  if(!R || R.error){ aviso('Primero calcula la estructura.', 'error'); return; }
  if(!cargas.length){ aviso('Coloca al menos una carga para poder variarla.', 'error'); return; }
  _vdOrig = {};
  cargas.forEach(c=>{ _vdOrig[c.id] = {mag:c.mag, mag2:c.mag2}; });
  _vdLim = {};
  cargas.forEach(c=>{
    const L1 = _vdLimDefecto(c.mag);
    _vdLim[c.id] = {min:L1.min, max:L1.max};
    if(c.tipo === 'T'){
      const L2 = _vdLimDefecto(c.mag2 || 0);
      _vdLim[c.id].min2 = L2.min; _vdLim[c.id].max2 = L2.max;
    }
  });
  _vdGrupo = 0;
  _vdCarga = cargas[0].id;
  const ov = _vdModal();
  ov.classList.add('show');
  vdPintarSelectores();
  vdPintarRuedas();
  vdRender();
}

function cerrarVerDiagramas(aplicar){
  const ov = document.getElementById('vdOv');
  if(ov) ov.classList.remove('show');
  if(!_vdOrig) return;
  if(!aplicar){
    // el banco de pruebas no toca la estructura: se restaura todo
    cargas.forEach(c=>{
      const o = _vdOrig[c.id];
      if(o){ c.mag = o.mag; c.mag2 = o.mag2; }
    });
  }
  _vdOrig = null;
  // recalcula con los valores vigentes (originales o aplicados)
  calcular();
  if(aplicar) aviso('Cargas actualizadas con los valores de la ventana.', 'ok');
}

// Nombre corto y reconocible de una carga, para el selector.
function vdNombreCarga(c){
  const fam = {P:'Puntual vertical', PX:'Puntual horizontal',
               U:'Uniforme', T:'Variable', M:'Momento'}[c.tipo] || 'Carga';
  const donde = (c.destino === 'nudo')
    ? (' en nudo ' + ((nodos.find(n=>n.id===c.nudo)||{}).nombre || '?'))
    : (' en tramo ' + (tramos.some(t=>t.id===c.tramo)
        ? nomTramo(tramos.find(t=>t.id===c.tramo)) : '?'));
  const u = (c.tipo==='M') ? uMom() : (c.tipo==='U'||c.tipo==='T') ? uDist() : unitFor;
  const val = (c.tipo==='T')
    ? dec(c.mag,'f') + ' → ' + dec(c.mag2||0,'f')
    : dec(c.mag, c.tipo==='M' ? 'mom' : 'f');
  return fam + donde + ' · ' + val + ' ' + u;
}

function vdPintarSelectores(){
  const gs = gruposDireccion(R);
  if(_vdGrupo >= gs.length) _vdGrupo = 0;
  const gw = document.getElementById('vdGrupos');
  gw.innerHTML = gs.map((g,i)=>
      '<label class="vd-radio' + (i===_vdGrupo ? ' on' : '') + '">'
    + '<input type="radio" name="vdG" value="' + i + '"' + (i===_vdGrupo ? ' checked' : '')
    + ' onchange="vdCambioGrupo(' + i + ')">'
    + '<span>' + g.recorrido + (g.inclinado ? ' · ' + g.ang.toFixed(1) + '°' : ' · recto')
    + '</span></label>').join('');
  const sel = document.getElementById('vdSelCarga');
  sel.innerHTML = cargas.map(c=>
    '<option value="' + c.id + '"' + (c.id===_vdCarga ? ' selected' : '') + '>'
    + vdNombreCarga(c) + '</option>').join('');
}

function vdCambioGrupo(i){
  _vdGrupo = i;
  vdPintarSelectores();
  vdRender();
}
function vdCambioCarga(id){
  _vdCarga = parseInt(id);
  vdPintarRuedas();
}

// ── Ruedas de la carga elegida ──
// Una rueda por valor; la carga variable lleva dos, una por extremo.
// Debajo de cada rueda, sus límites editables.
function vdPintarRuedas(){
  const c = cargas.find(z=>z.id === _vdCarga);
  const w = document.getElementById('vdRuedas');
  if(!c){ w.innerHTML = ''; return; }
  const lim = _vdLim[c.id];
  const u = (c.tipo==='M') ? uMom() : (c.tipo==='U'||c.tipo==='T') ? uDist() : unitFor;
  const fila = (campo, titulo, v, mn, mx)=>{
    const paso = Math.max(1e-6, (mx-mn)/400);
    return '<div class="vd-rueda">'
      + '<div class="vd-rueda-cab"><span>' + titulo + '</span>'
      + '<span class="vd-val" id="vdVal_' + campo + '">' + dec(v, c.tipo==='M'?'mom':'f') + ' ' + u + '</span></div>'
      + '<input type="range" class="vd-range" id="vdR_' + campo + '" min="' + mn + '" max="' + mx
      + '" step="' + paso + '" value="' + v + '" oninput="vdGiro(\'' + campo + '\', this.value)">'
      + '<div class="vd-lims">'
      + '<label>mín <input type="number" step="any" value="' + mn
      + '" onchange="vdLimite(\'' + campo + '\', \'min\', this.value)"></label>'
      + '<label>valor <input type="number" step="any" id="vdN_' + campo + '" value="' + (+v.toFixed(4))
      + '" onchange="vdValorExacto(\'' + campo + '\', this.value)"></label>'
      + '<label>máx <input type="number" step="any" value="' + mx
      + '" onchange="vdLimite(\'' + campo + '\', \'max\', this.value)"></label>'
      + '</div></div>';
  };
  let h = fila('mag', (c.tipo==='T' ? 'Extremo inicial w₁' : 'Magnitud'), c.mag, lim.min, lim.max);
  if(c.tipo === 'T')
    h += fila('mag2', 'Extremo final w₂', c.mag2 || 0, lim.min2, lim.max2);
  h += '<div class="hint-sm" style="margin:2px 0 8px">Límites por defecto: ±200 % del valor '
     + 'original. Puedes escribir tus propios mín/máx o un valor exacto.</div>';
  w.innerHTML = h;
}
