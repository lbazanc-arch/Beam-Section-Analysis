// ═══════════════════════════════════════════════════════════
//  ANÁLISIS PARAMÉTRICO
// ═══════════════════════════════════════════════════════════
// ── Sección 6: los cambios de carga NO alteran el estado del ejercicio ──
// Se calculan sobre una copia temporal, de modo que el panel de dibujo, las
// reacciones y todo el desarrollo por nudos siguen mostrando el caso original.
// ── Sección 6: los cambios de carga NO alteran el estado del ejercicio ──
// Se calculan sobre una copia temporal, de modo que el panel de dibujo, las
// reacciones y todo el desarrollo por nudos siguen mostrando el caso original.
//
// Cuando un nudo tiene más de una fuerza aplicada, por defecto se sigue
// mostrando (y editando) solo la resultante, como antes. Un botón por nudo
// permite pasar a "por separado": ahí aparece un par Fx/Fy por cada fuerza
// individual, y el usuario puede cambiar una sola sin tocar las demás.
let variacionModo = {};   // nodeId -> 'separado' | 'conjunto' (por defecto 'conjunto')

function renderCargasEdit(){
  const conCarga = nodos.filter(n=>!esCero(n.fx||0) || !esCero(n.fy||0) || (n.cargas && n.cargas.length));
  if(!conCarga.length){
    return '<div class="hint-sm">No hay cargas aplicadas. Coloca al menos una para usar esta sección.</div>';
  }
  let h = '';
  conCarga.forEach(n=>{
    const lista = (n.cargas && n.cargas.length) ? n.cargas : [{fx:n.fx||0, fy:n.fy||0}];
    const modo = variacionModo[n.id] || 'conjunto';
    h += '<div style="margin-bottom:9px">'
      + '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:5px">'
      + '<span style="font-weight:700;min-width:60px">Nudo ' + n.nombre + '</span>';
    if(lista.length > 1){
      h += '<button class="btn-sm" style="flex:none;padding:4px 9px" onclick="toggleModoVariacion(' + n.id + ')">'
        + (modo === 'separado' ? 'Ver en conjunto' : 'Ver por separado (' + lista.length + ' fuerzas)') + '</button>';
    }
    h += '</div>';
    if(modo === 'separado' && lista.length > 1){
      lista.forEach((c, i)=>{
        h += '<div style="display:flex;gap:8px;align-items:center;margin:4px 0 4px 14px;flex-wrap:wrap">'
          + '<span style="font-size:11px;color:var(--acc2);font-weight:800;min-width:58px">Fuerza ' + (i+1) + '</span>'
          + '<label style="font-size:11px;color:var(--muted)">Fx</label>'
          + '<input type="number" step="any" id="vc-fx-' + n.id + '-' + i + '" value="' + c.fx + '" '
          + 'style="width:82px;padding:5px 7px;border:1px solid var(--border2);border-radius:6px;font-family:var(--mf)">'
          + '<label style="font-size:11px;color:var(--muted)">Fy</label>'
          + '<input type="number" step="any" id="vc-fy-' + n.id + '-' + i + '" value="' + c.fy + '" '
          + 'style="width:82px;padding:5px 7px;border:1px solid var(--border2);border-radius:6px;font-family:var(--mf)">'
          + '<span style="font-size:11px;color:var(--muted)">' + unitFor + '</span></div>';
      });
    } else {
      h += '<div style="display:flex;gap:8px;align-items:center;margin-left:14px;flex-wrap:wrap">'
        + '<label style="font-size:11px;color:var(--muted)">Fx</label>'
        + '<input type="number" step="any" id="vc-fx-' + n.id + '" value="' + n.fx + '" '
        + 'style="width:88px;padding:5px 7px;border:1px solid var(--border2);border-radius:6px;font-family:var(--mf)">'
        + '<label style="font-size:11px;color:var(--muted)">Fy</label>'
        + '<input type="number" step="any" id="vc-fy-' + n.id + '" value="' + n.fy + '" '
        + 'style="width:88px;padding:5px 7px;border:1px solid var(--border2);border-radius:6px;font-family:var(--mf)">'
        + '<span style="font-size:11px;color:var(--muted)">' + unitFor + '</span>'
        + (lista.length > 1 ? '<span style="font-size:10.5px;color:var(--muted)">(resultante de ' + lista.length + ' fuerzas)</span>' : '')
        + '</div>';
    }
    h += '</div>';
  });
  h += '<div style="display:flex;gap:8px;align-items:center;margin-top:9px;flex-wrap:wrap">'
    + '<button class="mbtn" style="padding:7px 14px" onclick="aplicarVariacion()">Recalcular</button>'
    + '<button class="mbtn ghost" style="padding:7px 14px" onclick="escalarCargas(2)">×2</button>'
    + '<button class="mbtn ghost" style="padding:7px 14px" onclick="escalarCargas(0.5)">÷2</button>'
    + '<button class="mbtn ghost" style="padding:7px 14px" onclick="restaurarCargas()">Restaurar</button>'
    + '</div>';
  return h;
}

function toggleModoVariacion(nodeId){
  variacionModo[nodeId] = (variacionModo[nodeId] === 'separado') ? 'conjunto' : 'separado';
  const box = document.getElementById('cargasEdit');
  if(box) box.innerHTML = renderCargasEdit();
}

function cargasDeLosCampos(){
  const m = {};
  nodos.forEach(n=>{
    const modo = variacionModo[n.id] || 'conjunto';
    const lista = (n.cargas && n.cargas.length) ? n.cargas : null;
    if(modo === 'separado' && lista && lista.length > 1){
      let sfx = 0, sfy = 0, tocado = false;
      lista.forEach((c, i)=>{
        const ex = document.getElementById('vc-fx-'+n.id+'-'+i), ey = document.getElementById('vc-fy-'+n.id+'-'+i);
        if(ex || ey) tocado = true;
        sfx += ex ? (parseFloat(ex.value)||0) : c.fx;
        sfy += ey ? (parseFloat(ey.value)||0) : c.fy;
      });
      if(tocado) m[n.id] = {fx:sfx, fy:sfy};
    } else {
      const ex = document.getElementById('vc-fx-'+n.id), ey = document.getElementById('vc-fy-'+n.id);
      if(ex || ey) m[n.id] = {fx: ex ? (parseFloat(ex.value)||0) : n.fx,
                              fy: ey ? (parseFloat(ey.value)||0) : n.fy};
    }
  });
  return m;
}
function analizarConCargas(mapa){
  const orig = nodos.map(n=>({n, fx:n.fx, fy:n.fy}));
  nodos.forEach(n=>{ if(mapa[n.id]){ n.fx = mapa[n.id].fx; n.fy = mapa[n.id].fy; } });
  const res = analizar();
  orig.forEach(o=>{ o.n.fx = o.fx; o.n.fy = o.fy; });   // se restaura siempre
  return res;
}
function escalarCargas(k){
  nodos.forEach(n=>{
    const modo = variacionModo[n.id] || 'conjunto';
    const lista = (n.cargas && n.cargas.length) ? n.cargas : null;
    if(modo === 'separado' && lista && lista.length > 1){
      lista.forEach((c, i)=>{
        const ex = document.getElementById('vc-fx-'+n.id+'-'+i), ey = document.getElementById('vc-fy-'+n.id+'-'+i);
        if(ex) ex.value = (parseFloat(ex.value)||0)*k;
        if(ey) ey.value = (parseFloat(ey.value)||0)*k;
      });
    } else {
      const ex = document.getElementById('vc-fx-'+n.id), ey = document.getElementById('vc-fy-'+n.id);
      if(ex) ex.value = (parseFloat(ex.value)||0)*k;
      if(ey) ey.value = (parseFloat(ey.value)||0)*k;
    }
  });
  aplicarVariacion();
}
function restaurarCargas(){
  // solo repone los campos y limpia la comparación: nada más se ha tocado
  nodos.forEach(n=>{
    const modo = variacionModo[n.id] || 'conjunto';
    const lista = (n.cargas && n.cargas.length) ? n.cargas : null;
    if(modo === 'separado' && lista && lista.length > 1){
      lista.forEach((c, i)=>{
        const ex = document.getElementById('vc-fx-'+n.id+'-'+i), ey = document.getElementById('vc-fy-'+n.id+'-'+i);
        if(ex) ex.value = c.fx;
        if(ey) ey.value = c.fy;
      });
    } else {
      const ex = document.getElementById('vc-fx-'+n.id), ey = document.getElementById('vc-fy-'+n.id);
      if(ex) ex.value = n.fx;
      if(ey) ey.value = n.fy;
    }
  });
  const dm = document.getElementById('dclMod');
  if(dm) dm.innerHTML = '<div class="hint-sm">Cambia una carga y pulsa Recalcular para comparar aquí.</div>';
  const dmb = document.getElementById('dclModBox');
  if(dmb) dmb.style.borderColor = '';
  const box = document.getElementById('compBox');
  if(box) box.innerHTML = '';
}
function aplicarVariacion(){
  if(!resultado) return;
  const mapa = cargasDeLosCampos();
  const res = analizarConCargas(mapa);
  if(res.error){ aviso('Con esas cargas la estructura no se puede resolver.', 'error'); return; }
  const antes = resultado.fuerzas;      // el original nunca se sobrescribe
  const dm = document.getElementById('dclMod');
  if(dm) dm.innerHTML = svgArmadura({fuerzas:res.fuerzas, etiqueta:'valor',
                                     color:'natural', cargas:mapa});
  const dmb = document.getElementById('dclModBox');
  if(dmb) dmb.style.borderColor = 'var(--acc)';
  const box = document.getElementById('compBox');
  if(box) box.innerHTML = tablaComparativa(antes, res.fuerzas);
}

function tablaComparativa(antes, ahora){
  const uF = unitFor;
  let h = '<div class="proc-sub" style="margin-top:4px">Comparación con el caso original</div>'
    + '<table class="tabla"><thead><tr><th>Barra</th>'
    + '<th class="r">Antes ('+uF+')</th><th class="r">Ahora ('+uF+')</th>'
    + '<th class="r">Variación</th><th>Naturaleza ahora</th></tr></thead><tbody>';
  barras.forEach(b=>{
    const a = antes[b.id], n2 = ahora[b.id];
    let vr;
    if(Math.abs(a) < 1e-9) vr = esCero(n2) ? '—' : 'nueva';
    else {
      const p = (Math.abs(n2)-Math.abs(a))/Math.abs(a)*100;
      const col = p > 0.05 ? '#c0392b' : (p < -0.05 ? '#15803d' : '#68727f');
      vr = '<span style="color:'+col+';font-weight:700">'
         + (p>0?'+':'') + p.toFixed(1) + '%</span>';
    }
    let tag;
    if(esCero(n2)) tag = '<span class="tag z">Fuerza cero</span>';
    else if(n2 > 0) tag = '<span class="tag t">Tracción</span>';
    else tag = '<span class="tag c">Compresión</span>';
    // cambio de naturaleza: dato importante
    const cambio = (!esCero(a) && !esCero(n2) && (a>0) !== (n2>0))
      ? ' <b style="color:#c0392b;font-size:10px">¡cambió de signo!</b>' : '';
    h += '<tr><td><b>'+nombreBarra(b)+'</b></td>'
      + '<td class="r">'+dec(Math.abs(a),'f')+'</td>'
      + '<td class="r"><b>'+dec(Math.abs(n2),'f')+'</b></td>'
      + '<td class="r">'+vr+'</td><td>'+tag+cambio+'</td></tr>';
  });
  h += '</tbody></table>'
    + '<div class="hint-sm" style="margin-top:6px">El dibujo de arriba ya muestra los valores nuevos. '
    + 'Pulsa <b>Restaurar</b> para volver al caso original.</div>';
  return h;
}

function evaluarCapacidad(){
  if(!resultado) return;
  const cT = Math.abs(parseFloat(document.getElementById('capT').value)) || 0;
  const cC = Math.abs(parseFloat(document.getElementById('capC').value)) || 0;
  const box = document.getElementById('capBox');
  if(!box) return;
  if(cT <= 0 || cC <= 0){ box.innerHTML = '<div class="hint-sm">Introduce valores admisibles mayores que cero.</div>'; return; }
  const uF = unitFor;
  const filas = [];
  barras.forEach(b=>{
    const f = resultado.fuerzas[b.id];
    const adm = f >= 0 ? cT : cC;
    const u = Math.abs(f)/adm;
    filas.push({b, f, adm, u});
  });
  const gob = filas.reduce((m,x)=> x.u > m.u ? x : m, filas[0]);
  const lam = gob.u > 1e-12 ? 1/gob.u : Infinity;
  filas.sort((a,b2)=>b2.u - a.u);

  let h = '<div class="verdict '+(gob.u > 1 ? 'bad' : 'ok')+'">'
    + '<div class="verdict-t">Resultado</div>';
  if(gob.u > 1){
    h += '<b>No cumple.</b> La barra <b>'+nombreBarra(gob.b)+'</b> gobierna el diseño: trabaja al '
      + (gob.u*100).toFixed(1) + '% de su capacidad, por encima del límite. '
      + 'Habría que reforzarla o reducir las cargas a un '+(lam*100).toFixed(1)+'% de las actuales.';
  } else {
    h += '<b>Cumple.</b> La barra más exigida es <b>'+nombreBarra(gob.b)+'</b>, al '
      + (gob.u*100).toFixed(1) + '% de su capacidad. '
      + 'Las cargas podrían multiplicarse por <b>'+lam.toFixed(2)+'</b> antes de que esa barra llegue a su límite.';
  }
  h += '</div>';
  h += '<div class="proc-sub" style="margin-top:8px">Tabla con las cargas del estado inicial</div>'
    + '<table class="tabla"><thead><tr><th>Barra</th><th class="r">Fuerza ('+uF+')</th>'
    + '<th>Naturaleza</th><th class="r">Admisible ('+uF+')</th><th class="r">Aprovechamiento</th>'
    + '<th>Estado</th></tr></thead><tbody>';
  filas.forEach(x=>{
    const pct = x.u*100;
    const col = pct > 100 ? '#c0392b' : (pct > 85 ? '#b45309' : '#15803d');
    let tag;
    if(esCero(x.f)) tag = '<span class="tag z">Fuerza cero</span>';
    else if(x.f > 0) tag = '<span class="tag t">Tracción</span>';
    else tag = '<span class="tag c">Compresión</span>';
    h += '<tr'+(x.b.id===gob.b.id?' style="background:#fdf1e3"':'')+'>'
      + '<td><b>'+nombreBarra(x.b)+'</b>'+(x.b.id===gob.b.id?' ◀':'')+'</td>'
      + '<td class="r">'+dec(Math.abs(x.f),'f')+'</td><td>'+tag+'</td>'
      + '<td class="r">'+dec(x.adm,'f')+'</td>'
      + '<td class="r"><b style="color:'+col+'">'+pct.toFixed(1)+'%</b></td>'
      + '<td>'+(pct>100?'<b style="color:#c0392b">Excede</b>':(pct>85?'Ajustado':'Holgado'))+'</td></tr>';
  });
  h += '</tbody></table>'
    + '<div class="hint-sm" style="margin-top:6px">La fila resaltada es la barra que gobierna. '
    + 'El factor de carga se obtiene como el inverso del mayor aprovechamiento.</div>';
  box.innerHTML = h;
  // deja listo el simulador con estas capacidades
  simCap = {T:cT, C:cC};
  const sel = document.getElementById('simNodo');
  const conCarga = nodos.filter(n=>!esCero(n.fx) || !esCero(n.fy));
  if(sel){
    sel.innerHTML = conCarga.map(n=>'<option value="'+n.id+'">Nudo '+n.nombre
      + ' (' + dec(Math.hypot(n.fx,n.fy),'f') + ' ' + unitFor + ')</option>').join('');
  }
  const sb = document.getElementById('simBlock');
  if(sb){
    if(conCarga.length){ sb.style.display = ''; prepararSim(); }
    else { sb.style.display = 'none'; }
  }
}

// ── Módulo dinámico: se varía UNA carga concreta ──
// Con una sola carga variable la respuesta es AFÍN, no proporcional:
//   F_barra(P) = a + b·P
// donde a es la fuerza con esa carga anulada y b su sensibilidad. Eso permite
// despejar exactamente con qué valor de P falla la primera barra.
let simCap = null, simNodoId = null, simDir = null, simP0 = 0;
let simA = {}, simB = {};

function fuerzasConCarga(idNodo, P){
  // Recalcula el sistema poniendo en ese nudo una carga de módulo P
  // en su dirección original. No se escala nada "a ojo": se resuelve otra vez.
  const n = nodos.find(z=>z.id===idNodo);
  if(!n) return null;
  const fx0 = n.fx, fy0 = n.fy;
  n.fx = simDir.ux * P; n.fy = simDir.uy * P;
  const res = analizar();
  n.fx = fx0; n.fy = fy0;
  return res.error ? null : res.fuerzas;
}

function prepararSim(){
  const sel = document.getElementById('simNodo');
  if(!sel) return;
  simNodoId = parseInt(sel.value, 10);
  const n = nodos.find(z=>z.id===simNodoId);
  if(!n) return;
  const mag = Math.hypot(n.fx, n.fy);
  simP0 = mag > 1e-9 ? mag : 1;
  simDir = mag > 1e-9 ? {ux:n.fx/mag, uy:n.fy/mag} : {ux:0, uy:-1};
  // coeficientes a y b de cada barra
  const f0 = fuerzasConCarga(simNodoId, 0);
  const f1 = fuerzasConCarga(simNodoId, simP0);
  simA = {}; simB = {};
  if(f0 && f1) barras.forEach(b=>{
    simA[b.id] = f0[b.id];
    simB[b.id] = (f1[b.id] - f0[b.id]) / simP0;
  });
  const r = document.getElementById('simRange');
  // ── Recorrido dinámico del deslizador ──
  // Con el modelo afín F(P) = a + b·P se despeja, barra por barra, el valor de
  // P que alcanza su capacidad; el menor de todos es P_falla.
  //  · Mínimo 0: se puede reducir la carga hasta anularla para ver cómo
  //    reacciona la estructura sin ella.
  //  · El mango arranca en la carga real que tiene ahora ese nudo.
  //  · Máximo = P_falla + 20, para que la rotura quede dentro del recorrido y
  //    aún queden 20 unidades de margen para seguir subiendo y ver qué otra
  //    barra falla después. Si la carga actual ya superó su límite, el margen
  //    se mide desde ella, no desde P_falla.
  const Pf = cargaDeFalla();
  if(r){
    const MARGEN = 20;                      // en la unidad de fuerza en uso
    const refe = (Pf !== null && isFinite(Pf) && Pf > 0)
               ? Math.max(Pf, simP0)        // si la carga ya pasó la falla, manda ella
               : Math.max(simP0, 1);
    r.min = 0;
    r.max = refe + MARGEN;
    r.step = Math.max(r.max / 500, 1e-6);
    r.value = Math.min(simP0, r.max);       // el mango empieza en la carga actual
  }
  simular();
}

// Menor P que lleva alguna barra a su capacidad, según F(P) = a + b·P.
// La capacidad depende del signo: tracción usa simCap.T y compresión simCap.C.
// Devuelve null si ninguna barra llega a fallar.
