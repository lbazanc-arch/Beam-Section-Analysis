// ═══════════════════════════════════════════════════════════
//  RESOLVER + RENDER
// ═══════════════════════════════════════════════════════════
function resolver(){
  const res = analizar();
  const rp = document.getElementById('resultsPanel');
  const ra = document.getElementById('resultsArea');
  const hint = document.getElementById('noResultsHint');
  if(!rp || !ra) return;
  ra.style.display = 'block';
  if(hint) hint.style.display = 'none';
  rp.style.display = 'block';

  if(res.error){
    resultado = null;
    rp.innerHTML = renderError(res);
    try{ renderKatex(rp); }catch(e){ console.warn('KaTeX:', e); }
    dibujar();
    setTimeout(()=>{ try{ ra.scrollIntoView({behavior:'smooth', block:'start'}); }catch(e){} }, 120);
    return;
  }
  resultado = res;
  rp.innerHTML = renderResultados(res);
  try{ renderKatex(rp); }catch(e){ console.warn('KaTeX:', e); }
  setTimeout(()=>{
    const ord = ordenNudos();
    nodos.forEach(n=>{
      const paso = ord.find(p=>p.nodo.id===n.id);
      try{ dibujarDCL('dcl-'+n.id, n, paso ? paso.nuevas : []); }catch(e){}
    });
  }, 60);
  dibujar();
  setTimeout(()=>{ try{ ra.scrollIntoView({behavior:'smooth', block:'start'}); }catch(e){} }, 120);
}

function renderError(res){
  const d = res.diag;
  let titulo, cuerpo;
  if(res.error === 'inestable'){
    titulo = 'Armadura inestable (mecanismo)';
    cuerpo = 'Faltan barras o apoyos: la estructura puede moverse sin deformarse, así que no existe una solución de equilibrio. Añade barras o un apoyo más.';
  } else if(res.error === 'hiperestatica'){
    titulo = 'Armadura estáticamente indeterminada';
    cuerpo = 'Hay más incógnitas que ecuaciones de equilibrio. Las ecuaciones de la estática no bastan: este caso queda fuera del alcance del Cap. 6 (se resuelve en Análisis Estructural, con métodos de compatibilidad de deformaciones).';
  } else if(res.error === 'singular'){
    titulo = 'Configuración inestable';
    cuerpo = 'El conteo <em>m + r = 2j</em> se cumple, pero la disposición geométrica no es estable (por ejemplo, barras concurrentes o alineadas que no impiden el movimiento). Revisa la posición de nudos y apoyos.';
  } else {
    titulo = 'Faltan datos';
    cuerpo = res.error;
  }
  const grado = d.suma - d.req;
  return '<div class="res-section">'
    + '<div class="res-title"><div class="num">1</div>Estabilidad y determinación estática</div>'
    + '<div class="verdict bad"><div class="verdict-t">Resultado</div>'
    + '<b>'+titulo+'</b><br>'+cuerpo+'</div>'
    + '<div class="proc-block"><div class="proc-sub">Conteo de barras, reacciones y nudos</div>'
    + '<div class="eq-row"><div class="eq-body">'
    + kx('m + r = ' + d.m + ' + ' + d.r + ' = ' + d.suma
        + ' \\qquad 2j = 2(' + d.j + ') = ' + d.req)
    + '</div></div>'
    + '<div class="eq-row"><div class="eq-body" style="color:#c0392b;font-weight:700">'
    + (grado < 0 ? 'm + r &lt; 2j → mecanismo, faltan ' + (-grado) + ' restricción(es)'
                 : (grado > 0 ? 'm + r &gt; 2j → grado de indeterminación ' + grado
                              : 'm + r = 2j pero la geometría no es estable'))
    + '</div></div></div></div>';
}

function kx(tex){
  // renderKatex busca elementos .ktx con el LaTeX en data-tex
  const esc = String(tex).replace(/&/g,'&amp;').replace(/"/g,'&quot;')
                         .replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return '<span class="ktx" data-tex="' + esc + '"></span>';
}

function renderResultados(res){
  const d = res.diag;
  const f = v => dec(v,'f');
  const uL = unitLen, uF = unitFor;
  let h = '';

  // ── ¿Es una estructura simétrica? ──
  // Informativo: no altera el cálculo, solo lo explica. Se coloca antes de
  // los pasos numerados para no perturbar su numeración.
  const sim = analizarSimetria(res);
  h += '<div class="res-section">'
    + '<div class="res-title"><div class="num">\u21c4</div>\u00bfEs una estructura sim\u00e9trica?</div>'
    + (sim.simetrica
        ? '<div class="verdict ok"><div class="verdict-t">S\u00ed, es sim\u00e9trica</div>'
          + 'La geometr\u00eda, las cargas y las reacciones son sim\u00e9tricas respecto a un eje vertical en x = '
          + dec(sim.eje,'len') + ' ' + unitLen + '. Esto permite anticipar, sin resolver todo el sistema, que '
          + 'las barras que se reflejan entre s\u00ed soportan la misma fuerza.</div>'
        : '<div class="verdict bad"><div class="verdict-t">No es sim\u00e9trica</div>'
          + sim.motivo + (sim.fase ? ' <span style="color:var(--muted)">(en: '+sim.fase+')</span>' : '') + '</div>')
    + '</div>';

  // ── 1. Determinación ──
  h += '<div class="res-section">'
    + '<div class="res-title"><div class="num">1</div>Estabilidad y determinación estática</div>'
    + '<div class="verdict ok"><div class="verdict-t">Resultado</div>'
    + '<b>Armadura isostática.</b> El número de incógnitas coincide con el de ecuaciones de equilibrio, '
    + 'así que puede resolverse con la estática por el método de nudos o por el de secciones.</div>'
    + '<div class="proc-block proc-cols">'
    + '<div class="proc-col"><div class="proc-sub">Conteo</div>'
    + '<div class="eq-row"><div class="eq-body">'
    + kx('m = ' + d.m + ' \\quad r = ' + d.r + ' \\quad j = ' + d.j) + '</div></div></div>'
    + '<div class="proc-col"><div class="proc-sub">Criterio</div>'
    + '<div class="eq-row"><div class="eq-body">'
    + kx('m + r = ' + d.suma + ' = 2j = ' + d.req) + '</div></div></div>'
    + '</div>'
    + '<div class="summary-grid">'
    + '<div class="summary-box"><div class="s-lbl">Barras m</div><div class="s-val">'+d.m+'</div><div class="s-unit">—</div></div>'
    + '<div class="summary-box"><div class="s-lbl">Reacciones r</div><div class="s-val">'+d.r+'</div><div class="s-unit">—</div></div>'
    + '<div class="summary-box"><div class="s-lbl">Nudos j</div><div class="s-val">'+d.j+'</div><div class="s-unit">—</div></div>'
    + '<div class="summary-box hl"><div class="s-lbl">m + r − 2j</div><div class="s-val">0</div><div class="s-unit">isostática</div></div>'
    + '</div></div>';

  // ── 2. Reacciones ──
  const cargas = nodos.filter(n=>!esCero(n.fx)||!esCero(n.fy));
  let sFx = 0, sFy = 0;
  cargas.forEach(n=>{ sFx += n.fx; sFy += n.fy; });
  h += '<div class="res-section">'
    + '<div class="res-title"><div class="num">2</div>Reacciones en los apoyos</div>'
    + '<div class="proc-block"><div class="proc-sub">Equilibrio global del conjunto</div>'
    + '<div class="eq-row"><div class="eq-body">'
    + kx('\\sum F_x = 0 \\qquad \\sum F_y = 0 \\qquad \\sum M = 0') + '</div></div>'
    + '<div class="eq-row"><div class="eq-body">'
    + kx('\\text{Cargas aplicadas:}\\; \\sum F_{x,\\text{ext}} = ' + f(sFx)
       + '\\;' + uF + ',\\quad \\sum F_{y,\\text{ext}} = ' + f(sFy) + '\\;' + uF)
    + '</div></div></div>';
  h += '<table class="tabla"><thead><tr><th>Apoyo</th><th>Tipo</th>'
    + '<th class="r">R<sub>x</sub> ('+uF+')</th><th class="r">R<sub>y</sub> ('+uF+')</th></tr></thead><tbody>';
  nodos.forEach(n=>{
    const R = res.reacciones[n.id];
    if(!R) return;
    h += '<tr><td><b>'+n.nombre+'</b></td><td>'+(n.apoyo==='fijo'?'Fijo (pasador)':('M\u00f3vil (rodillo, '+(n.apAng===0?'horizontal':'vertical')+')'))+'</td>'
      + '<td class="r">'+(R.rx!==undefined ? f(R.rx) : '—')+'</td>'
      + '<td class="r">'+(R.ry!==undefined ? f(R.ry) : '—')+'</td></tr>';
  });
  h += '</tbody></table></div>';

  // ── 3. Miembros de fuerza cero ──
  const cero = miembrosCero();
  h += '<div class="res-section">'
    + '<div class="res-title"><div class="num">3</div>Miembros de fuerza cero</div>';
  if(cero.length){
    h += '<div class="verdict"><div class="verdict-t">Identificados por inspección</div>'
      + 'Estas barras no trabajan bajo esta carga. Reconocerlas <b>antes</b> de calcular ahorra buena parte del trabajo.</div>'
      + '<table class="tabla"><thead><tr><th>Barra</th><th>Nudo</th><th>Regla aplicada</th>'
      + '<th class="r">Fuerza ('+uF+')</th></tr></thead><tbody>';
    cero.forEach(c=>{
      const b = barras.find(x=>x.id===c.barra);
      h += '<tr><td><b>'+nombreBarra(b)+'</b></td><td>'+c.nudo+'</td><td>'
        + (c.regla===2
            ? 'Nudo con dos barras no colineales y sin carga ni apoyo: ambas son nulas.'
            : 'Nudo con tres barras, dos de ellas colineales y sin carga: la tercera es nula.')
        + '</td><td class="r">0</td></tr>';
    });
    h += '</tbody></table>';
  } else {
    h += '<div class="verdict"><div class="verdict-t">Resultado</div>'
      + 'Ninguna barra cumple las reglas de fuerza cero en esta configuración. '
      + 'Aun así, alguna puede resultar nula al desarrollar el cálculo.</div>';
  }
  h += '</div>';

  // ── 4. Método de nudos ──
  if(metodo === 'secciones'){
    h += '<div class="res-section">'
      + '<div class="res-title"><div class="num">4</div>'
      + (modoCorte === 'auto' ? 'Resolución automática por cortes' : 'Método de secciones — corte manual')
      + '</div><div id="corteBox">'
      + (modoCorte === 'auto' ? renderAutoCortes() : renderSeccionCorte())
      + '</div></div>';
    h += renderTablaFinal(res);
    return h;
  }

  const orden = ordenNudos();
  h += '<div class="res-section">'
    + '<div class="res-title"><div class="num">4</div>Método de nudos, paso a paso</div>'
    + '<div class="verdict"><div class="verdict-t">Orden de resolución</div>'
    + 'Los nudos se recorren de modo que en cada uno queden como máximo <b>dos incógnitas</b>, '
    + 'porque en cada nudo solo hay dos ecuaciones: '
    + kx('\\sum F_x = 0') + ' y ' + kx('\\sum F_y = 0') + '.</div>';

  orden.forEach((paso, i)=>{
    const n = paso.nodo;
    const conec = barras.filter(b=>b.a===n.id||b.b===n.id);
    h += '<div class="joint-card">'
      + '<div class="joint-h"><div class="joint-n">'+(i+1)+'</div>Nudo <b>'+n.nombre+'</b>'
      + '<span style="color:var(--muted);font-weight:500;font-size:11px">'
      + conec.length+' barra(s)'
      + (paso.nuevas.length ? ' · '+paso.nuevas.length+' incógnita(s) en este paso' : ' · comprobación')
      + '</span></div>'
      + '<div class="joint-body"><div>';

    // ecuaciones desarrolladas
    let exFx = [], exFy = [];
    conec.forEach(b=>{
      const o = nodos.find(z=>z.id === (b.a===n.id ? b.b : b.a));
      const dx = o.x-n.x, dy = o.y-n.y, L = Math.hypot(dx,dy);
      const cx = dx/L, cy = dy/L;
      const nb = nombreBarra(b);
      if(Math.abs(cx) > 1e-9) exFx.push(fmtCoef(cx) + 'F_{'+nb+'}');
      if(Math.abs(cy) > 1e-9) exFy.push(fmtCoef(cy) + 'F_{'+nb+'}');
    });
    const R = res.reacciones[n.id];
    if(R && R.rx !== undefined) exFx.push('R_{x'+n.nombre+'}');
    if(R && R.ry !== undefined) exFy.push('R_{y'+n.nombre+'}');
    if(!esCero(n.fx)) exFx.push(fmtNum(n.fx));
    if(!esCero(n.fy)) exFy.push(fmtNum(n.fy));

    h += '<div class="eq-row"><div class="eq-body">'
       + kx('\\sum F_x = 0:\\quad ' + (exFx.join(' + ').replace(/\+ -/g,'- ') || '0') + ' = 0')
       + '</div></div>';
    h += '<div class="eq-row"><div class="eq-body">'
       + kx('\\sum F_y = 0:\\quad ' + (exFy.join(' + ').replace(/\+ -/g,'- ') || '0') + ' = 0')
       + '</div></div>';

    if(paso.nuevas.length){
      h += '<div class="proc-sub" style="margin-top:9px">Se despeja</div>';
      paso.nuevas.forEach(bid=>{
        const b = barras.find(x=>x.id===bid);
        const val = res.fuerzas[bid];
        const tipo = esCero(val) ? '\\text{(fuerza cero)}'
                   : (val > 0 ? '\\text{(tracción)}' : '\\text{(compresión)}');
        h += '<div class="eq-row"><div class="eq-body">'
          + kx('F_{'+nombreBarra(b)+'} = ' + f(Math.abs(val)) + '\\;\\text{'+uF+'}\\;' + tipo)
          + '</div></div>';
      });
    } else {
      h += '<div class="hint-sm" style="margin-top:8px;color:var(--muted)">'
         + 'Todas las barras de este nudo ya se conocen: sirve como comprobación del equilibrio.</div>';
    }

    h += '</div><div><svg class="joint-svg" id="dcl-'+n.id+'" viewBox="0 0 190 168"></svg></div>';
    h += '</div></div>';
  });
  h += '</div>';

  h += renderTablaFinal(res);
  return h;
}

function renderTablaFinal(res){
  const uL = unitLen, uF = unitFor;
  let h = '';
  // ── 5. Tabla resumen ──
  h += '<div class="res-section">'
    + '<div class="res-title"><div class="num">5</div>Fuerzas en todas las barras</div>'
    + '<div class="proc-block"><div class="proc-sub">Identificación de cada barra</div>'
    + svgArmadura({etiqueta:'ambos', color:'natural'})
    + '<div class="hint-sm" style="margin-top:5px">Azul: tracción · Rojo: compresión · Gris punteado: fuerza cero. '
    + 'T = tracción, C = compresión.</div></div>'
    + '<table class="tabla"><thead><tr><th>N°</th><th>Barra</th>'
    + '<th class="r">Longitud ('+uL+')</th><th class="r">Fuerza ('+uF+')</th><th>Naturaleza</th></tr></thead><tbody>';
  let nT = 0, nC = 0, nZ = 0;
  barras.forEach((b,i)=>{
    const na = nodos.find(n=>n.id===b.a), nb = nodos.find(n=>n.id===b.b);
    const L = Math.hypot(nb.x-na.x, nb.y-na.y);
    const val = res.fuerzas[b.id];
    let tag;
    if(esCero(val)){ tag = '<span class="tag z">Fuerza cero</span>'; nZ++; }
    else if(val > 0){ tag = '<span class="tag t">Tracción</span>'; nT++; }
    else { tag = '<span class="tag c">Compresión</span>'; nC++; }
    h += '<tr><td>'+(i+1)+'</td><td><b>'+nombreBarra(b)+'</b></td>'
      + '<td class="r">'+dec(L,'len')+'</td>'
      + '<td class="r"><b>'+dec(Math.abs(val),'f')+'</b></td><td>'+tag+'</td></tr>';
  });
  h += '</tbody></table>'
    + '<div class="summary-grid" style="margin-top:11px">'
    + '<div class="summary-box hl" style="border-color:#1d4ed8"><div class="s-lbl">En tracción</div><div class="s-val" style="color:#1d4ed8">'+nT+'</div><div class="s-unit">barras</div></div>'
    + '<div class="summary-box hl" style="border-color:#c0392b"><div class="s-lbl">En compresión</div><div class="s-val" style="color:#c0392b">'+nC+'</div><div class="s-unit">barras</div></div>'
    + '<div class="summary-box"><div class="s-lbl">Fuerza cero</div><div class="s-val" style="color:#9aa3ad">'+nZ+'</div><div class="s-unit">barras</div></div>'
    + '<div class="summary-box"><div class="s-lbl">Total</div><div class="s-val">'+barras.length+'</div><div class="s-unit">barras</div></div>'
    + '</div>';

  h += '<div class="teoria"><div class="teoria-t">Cómo leer el signo</div>'
    + 'El cálculo se plantea suponiendo <b>todas las barras en tracción</b>: la barra tira del nudo hacia afuera. '
    + 'Si el resultado sale <b>positivo</b>, la suposición era correcta y la barra está en <b style="color:#1d4ed8">tracción</b>. '
    + 'Si sale <b>negativo</b>, la barra en realidad empuja al nudo y trabaja en '
    + '<b style="color:#c0392b">compresión</b>. Por eso en la tabla se muestra el valor absoluto junto con su naturaleza.'
    + '</div></div>';

  // ── 6. Variación de cargas ──
  h += '<div class="res-section">'
    + '<div class="res-title"><div class="num">6</div>¿Qué pasa si cambio las cargas?</div>'
    + '<div class="verdict"><div class="verdict-t">Cómo funciona</div>'
    + 'Una armadura isostática es <b>lineal</b>: no puedes fijar a mano la fuerza de una barra '
    + '(quedaría fuera de equilibrio), pero sí cambiar las cargas y ver exactamente cómo responde cada barra. '
    + 'Modifica los valores y compara con el caso original.</div>'
    + '<div class="proc-block"><div class="proc-sub">Cargas aplicadas</div>'
    + '<div id="cargasEdit">' + renderCargasEdit() + '</div>'
    + '</div>'
    + '<div class="dcl-par">'
    + '<div class="proc-block"><div class="proc-sub">Estado inicial</div>'
    + '<div id="dclIni">' + svgArmadura({etiqueta:'valor', color:'natural'}) + '</div></div>'
    + '<div class="proc-block" id="dclModBox"><div class="proc-sub">Con las cargas modificadas</div>'
    + '<div id="dclMod"><div class="hint-sm">Cambia una carga y pulsa Recalcular para comparar aquí.</div></div></div>'
    + '</div>'
    + '<div id="compBox"></div></div>';

  // ── 7. Capacidad admisible ──
  h += '<div class="res-section">'
    + '<div class="res-title"><div class="num">7</div>¿Qué barra falla primero?</div>'
    + '<div class="verdict"><div class="verdict-t">Verificación por resistencia</div>'
    + 'Indica la fuerza admisible de las barras. La app calcula el aprovechamiento de cada una, '
    + 'señala la que gobierna el diseño y el factor por el que podrían multiplicarse las cargas '
    + 'antes de que la primera barra llegue a su límite.</div>'
    + '<div class="proc-block">'
    + '<div style="display:flex;gap:9px;align-items:center;flex-wrap:wrap">'
    + '<label style="font-size:11.5px;font-weight:700">Admisible en tracción</label>'
    + '<input type="number" step="any" id="capT" value="20" style="width:96px;padding:6px 8px;border:1px solid var(--border2);border-radius:6px;font-family:var(--mf)">'
    + '<label style="font-size:11.5px;font-weight:700">en compresión</label>'
    + '<input type="number" step="any" id="capC" value="15" style="width:96px;padding:6px 8px;border:1px solid var(--border2);border-radius:6px;font-family:var(--mf)">'
    + '<span style="font-size:11px;color:var(--muted)">'+uF+'</span>'
    + '<button class="mbtn" style="padding:7px 14px" onclick="evaluarCapacidad()">Evaluar</button>'
    + '</div>'
    + '<div class="hint-sm" style="margin-top:6px">En compresión suele admitirse menos por el riesgo de pandeo.</div>'
    + '</div>'
    + '<div id="capBox"></div>'
    + '<div class="proc-block" id="simBlock" style="display:none">'
    + '<div class="proc-sub">Módulo dinámico: aumenta UNA carga y observa qué barra falla primero</div>'
    + '<div class="hint-sm" style="margin-bottom:8px">Elige qué carga quieres variar. Se aumenta su '
    + '<b>módulo</b> (la resultante) manteniendo su dirección; las demás cargas siguen igual. '
    + 'Según cuál elijas, la barra que falla primero puede ser distinta.</div>'
    + '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:8px">'
    + '<span style="font-size:11px;color:var(--muted);font-weight:700">Carga en el nudo</span>'
    + '<select id="simNodo" onchange="prepararSim()" style="padding:6px 9px;border:1px solid var(--border2);border-radius:7px;font-family:inherit;font-size:12px"></select>'
    + '<span style="font-size:11px;color:var(--muted);font-weight:700">Módulo</span>'
    + '<input type="range" id="simRange" min="0" max="1" value="0" step="0.01" '
    + 'style="flex:1;min-width:160px;accent-color:#b45309" oninput="simular()">'
    + '<span id="simVal" style="font-family:var(--mf);font-weight:700;color:var(--acc);min-width:86px"></span>'
    + '</div>'
    + '<div id="simCrit"></div>'
    + '<div id="simEstado"></div>'
    + '<div id="simDCL"></div>'
    + '<div id="simLeyenda" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:6px;font-size:10px;color:var(--muted)">'
    + '<span><b style="color:#158040">■</b> holgado</span>'
    + '<span><b style="color:#d9a01e">■</b> medio</span>'
    + '<span><b style="color:#c0392b">■</b> al límite</span>'
    + '<span><b style="color:#7f1d1d">■</b> superado (rotura)</span>'
    + '</div></div>'
    + '</div>';

  return h;
}
