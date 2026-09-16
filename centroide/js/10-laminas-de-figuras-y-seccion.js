// Recalcular «en caliente» (2026-09-15): añadir un material o borrar uno sin
// uso, cambiar γ ↔ ρ, el tipo de cuerpo, las unidades o los decimales repintan el
// resultado que ya estaba a la vista, y desplazar la página hasta él sacaba de la
// vista el campo que el alumno acababa de usar. Esas rutas recalculan con
// recalcularSinDesplazar; solo Calcular (y cargar un ejemplo o un ejercicio)
// lleva la vista al resultado. Lo consultan renderResults, renderResults3d (21-)
// y renderResultsAlambre (24-) antes de programar el scrollIntoView.
let resultadoSinDesplazar = false;
function recalcularSinDesplazar(fn){
  resultadoSinDesplazar = true;
  try{ return (fn || calculate)(); }
  finally{ resultadoSinDesplazar = false; }
}
// ── Valor con cifras significativas suficientes ──
// Los decimales configurables (DEC.len) sirven para longitudes, no para un peso
// específico o una densidad expresados en la unidad del sistema: 3000 kg/m³ son
// 0.003 kg/cm³, y con dos decimales se imprimía «0.00», de modo que la fórmula
// escrita no reproducía su propio resultado. Aquí se garantizan `sig` cifras
// significativas, nunca menos decimales que DEC.len, y sin ceros de relleno.
// Lo usan la pantalla (este archivo) y el informe LaTeX (16-).
function decSigCen(v, sig){
  const d0 = (typeof DEC === 'object' && DEC && DEC.len !== undefined) ? DEC.len : 2;
  if(typeof v !== 'number' || !isFinite(v)) return '0';
  if(v === 0) return (0).toFixed(d0);
  let d = Math.max(d0, (sig || 4) - 1 - Math.floor(Math.log10(Math.abs(v))));
  if(d > 12) d = 12;
  if(d < 0) d = 0;
  let s = v.toFixed(d);
  const pt = s.indexOf('.');
  if(pt >= 0) while(s.length - pt - 1 > d0 && s.charAt(s.length-1) === '0') s = s.slice(0,-1);
  return s;
}

// Un peso o una masa en la unidad del sistema pueden valer 0.0792 kg: con los
// decimales de área (2) se escribirían «0.08» y el cociente ΣW·x̃ / ΣW impreso no
// daría el x_G impreso (0.65/0.08 = 8.13, no 8.27). Solo para esa magnitud se
// usan cifras significativas; el resto del informe sigue con ftex, y cuando el
// número sale en potencia de diez, la mantisa lleva las mismas cuatro cifras.
// Devuelve null si manda la notación que fijó el alumno: entonces se respeta
// ftex/fmtVal tal cual.
function _pesoCifras(v){
  if(typeof v !== 'number' || !isFinite(v)) return null;
  if(typeof notationExp === 'number' && notationExp !== 0) return null;
  const a = Math.abs(v);
  if(a === 0) return null;
  if(a >= 10000 || a < 0.01){
    const e = Math.floor(Math.log10(a));
    return {mant:(v/Math.pow(10,e)).toFixed(3), exp:e};
  }
  return {txt: decSigCen(v, 4)};
}
function ftexPeso(v){        // LaTeX del informe y de KaTeX
  const p = _pesoCifras(v);
  if(!p) return ftex(v);
  return (p.txt !== undefined) ? p.txt : (p.mant + '\\times 10^{' + p.exp + '}');
}
function ftexPesoTxt(v){     // HTML del panel de resultados
  const p = _pesoCifras(v);
  if(!p) return fmtVal(v);
  return (p.txt !== undefined) ? p.txt : (p.mant + ' ×10<sup>' + p.exp + '</sup>');
}

// El material entra en el cálculo en la unidad del SISTEMA (0.003 kg/cm³), no en
// la que escribió el alumno (3000 kg/m³): si la ficha enseñara la escrita, el
// producto γ·A·t de la ficha no daría el peso de la ficha, porque las longitudes
// van en cm. Se imprime la del sistema y se cita al lado la escrita, como hace
// el informe (16-).
function matValSisCen(m){ return decSigCen(m.val, 4); }
function matValIngCen(m){
  return (m.valIng !== undefined && m.valIng !== null && m.uIng && m.uIng !== uGamma())
    ? ' = ' + decFix(m.valIng,'len') + ' ' + m.uIng : '';
}

function renderResults(res, u4, u2, u1){
  currentU4=u4; currentU2=u2; currentU1=u1;
  const rp = document.getElementById('resultsPanel');
  if(rp) rp.style.display='block';
  const hint = document.getElementById('noResultsHint');
  if(hint) hint.style.display='none';
  const ra = document.getElementById('resultsArea');
  if(ra){ ra.style.display='block'; }

  if(!resultadoSinDesplazar) setTimeout(()=>{ ra && ra.scrollIntoView({behavior:'smooth', block:'start'}); }, 150);

  const f  = v => fmtVal(v);
  const nL = v => decFix(v,'len');
  const het = res.hetero;
  const simb = matSimbolo();
  // En magnitud «densidad» lo que se calcula es MASA (ρ·A·t = kg), no peso; en
  // «peso específico», peso (γ·A·t = fuerza). Nombre, símbolo y unidad cambian
  // con la magnitud, igual que en el informe (16-).
  const esMasa = (matMagnitud === 'densidad');
  const Wsim = esMasa ? 'm' : 'W';
  const Wnom = esMasa ? 'Masa' : 'Peso';
  const uW   = esMasa ? 'kg' : unitForce;
  let html = '';

  // ══════════════════════════════════════════════════
  //  1 · Sección compuesta con cotas
  // ══════════════════════════════════════════════════
  html += `<div class="res-section">
    <div class="res-section-title"><div class="num" style="background:var(--grn)">✎</div>Sección compuesta — visualización con cotas</div>
    <canvas id="compositeCanvas" style="width:100%;max-width:860px;height:420px;display:block;margin:0 auto;border-radius:10px;border:1px solid var(--border);background:#fff;"></canvas>
    <div style="font-size:10px;color:var(--muted);margin-top:6px;">
      Área que <b style="color:var(--grn2)">suma</b> = sólido &nbsp;|&nbsp;
      Área que <b style="color:#c0392b">resta</b> = trama (//) &nbsp;|&nbsp; G = centroide
    </div>
  </div>`;

  // Lectura como carga distribuida (propuesta 2.4): el ejemplo guiado del §9.4.
  if(typeof ejemploActualCen !== 'undefined' && ejemploActualCen === 'carga'){
    html += `<div class="res-section"><div class="proc-block"><div class="proc-sub">Lectura como carga distribuida</div>
      <div class="eq-row"><div class="eq-body">${kx(`F_R = \\int w\\,dx = A = ${ftex(res.A)}`)}</div></div>
      <div class="eq-row"><div class="eq-body">${kx(`\\bar{x} = ${ftex(res.xbar)}\\,${utex(u1)}\\quad\\text{(línea de acción)}`)}</div></div>
    </div></div>`;
  }

  // ══════════════════════════════════════════════════
  //  2 · Propiedades de cada figura, con su croquis al lado
  // ══════════════════════════════════════════════════
  html += `<div class="res-section">
    <div class="res-section-title"><div class="num">1</div>Propiedades de cada figura</div>`;
  res.steps.forEach((s,i)=>{
    const nom = s.fig.etiqueta || s.fig.name || FIG_DEFS[s.fig.type].name;
    const signo = s.fig.sign===1
      ? '<span style="color:var(--grn2);font-weight:700">＋ Suma</span>'
      : '<span style="color:#c0392b;font-weight:700">－ Resta</span>';
    html += `<div class="fig-card">
      <div class="fig-card-datos">
        <div class="fig-card-h">
          <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${s.fig.color}"></span>
          <b>${i+1}. ${esc(nom)}</b> ${signo}
        </div>
        <table class="fig-tabla">
          <thead><tr><th>Magnitud</th><th>Símbolo</th><th style="text-align:right">Valor</th><th>Unidad</th></tr></thead>
          <tbody>
            <tr><td>Área</td><td><i>A<sub>i</sub></i></td><td class="v">${f(Math.abs(s.a))}</td><td>${u2}</td></tr>
            <tr><td>Centroide x</td><td><i>x̃<sub>i</sub></i></td><td class="v">${nL(s.xi)}</td><td>${u1}</td></tr>
            <tr><td>Centroide y</td><td><i>ỹ<sub>i</sub></i></td><td class="v">${nL(s.yi)}</td><td>${u1}</td></tr>
            ${het?`<tr><td>${esMasa?'Densidad':'Peso específico'}</td><td><i>${simb}<sub>i</sub></i></td><td class="v">${s.mat?matValSisCen(s.mat):'—'}</td><td>${s.mat?esc(uGamma()):'—'}</td></tr>
            <tr><td>Espesor</td><td><i>t<sub>i</sub></i></td><td class="v">${decSigCen(s.t,3)}</td><td>${u1}</td></tr>
            <tr><td>${Wnom}</td><td><i>${Wsim}<sub>i</sub></i></td><td class="v">${f(Math.abs(s.w))}</td><td>${uW}</td></tr>`:''}
          </tbody>
        </table>
      </div>
      <div class="fig-card-dib">${croquisFigura(s.fig, i)}</div>
    </div>`;
  });
  html += `</div>`;

  // ══════════════════════════════════════════════════
  //  3 · Tabla resumen
  // ══════════════════════════════════════════════════
  html += `<div class="res-section">
    <div class="res-section-title"><div class="num">2</div>Tabla resumen de figuras</div>
    <div style="overflow-x:auto;">
    <table class="tabla-res">
      <thead><tr>
        <th>N°</th><th>Figura</th><th style="text-align:center">Signo</th>
        ${het?`<th style="text-align:center">${simb}<sub>i</sub></th>`:''}
        <th>A<sub>i</sub><br><span>(${u2})</span></th>
        <th>x̃<sub>i</sub><br><span>(${u1})</span></th>
        <th>ỹ<sub>i</sub><br><span>(${u1})</span></th>
        <th>A<sub>i</sub>x̃<sub>i</sub></th>
        <th>A<sub>i</sub>ỹ<sub>i</sub></th>
        ${het?`<th>${Wsim}<sub>i</sub>x̃<sub>i</sub></th><th>${Wsim}<sub>i</sub>ỹ<sub>i</sub></th>`:''}
      </tr></thead><tbody>`;
  res.steps.forEach((s,i)=>{
    const nom = s.fig.etiqueta || s.fig.name || FIG_DEFS[s.fig.type].name;
    html += `<tr>
      <td>${i+1}</td>
      <td><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${s.fig.color};margin-right:5px"></span>${esc(nom)}</td>
      <td style="text-align:center;font-weight:800;color:${s.fig.sign>0?'var(--grn2)':'#c0392b'}">${s.fig.sign>0?'＋':'－'}</td>
      ${het?`<td style="text-align:center;font-weight:700;color:var(--grn2)">${s.gLabel}</td>`:''}
      <td class="v">${f(s.a)}</td>
      <td class="v">${nL(s.xi)}</td>
      <td class="v">${nL(s.yi)}</td>
      <td class="v">${f(s.ax)}</td>
      <td class="v">${f(s.ay)}</td>
      ${het?`<td class="v">${f(s.wx)}</td><td class="v">${f(s.wy)}</td>`:''}
    </tr>`;
  });
  html += `<tr class="fila-total">
      <td colspan="${het?4:3}">Σ (Total)</td>
      <td class="v">${f(res.A)}</td><td>—</td><td>—</td>
      <td class="v">${f(res.Qy)}</td><td class="v">${f(res.Qx)}</td>
      ${het?`<td class="v">${f(res.Wx)}</td><td class="v">${f(res.Wy)}</td>`:''}
    </tr></tbody></table></div>`;
  if(het){
    // El espesor t_i está en la fórmula porque el motor calcula w = γ·A·t
    // (calculate, 09-): sin él la fórmula impresa no reproduce el número impreso.
    html += `<div style="font-size:10.5px;color:var(--muted);margin-top:8px;line-height:1.6">
      ${Wsim}<sub>i</sub> = ${simb}<sub>i</sub> · A<sub>i</sub> · t<sub>i</sub> &nbsp;(${uW})&nbsp;·&nbsp; ` +
      MATS.map(m=>`<b style="color:var(--grn2)">${simb}${m.id}</b> = ${matValSisCen(m)} ${esc(uGamma())}${esc(matValIngCen(m))}`).join(' &nbsp; ') + `</div>`;
  }
  html += `</div>`;

  // ══════════════════════════════════════════════════
  //  4 · Área, centroide y centro de gravedad
  // ══════════════════════════════════════════════════
  html += `<div class="res-section">
    <div class="res-section-title"><div class="num">3</div>${het?'Centroide, centro de gravedad y área de la sección':'Centroide y área de la sección compuesta'}</div>
    <div class="proc-block proc-cols">
      <div class="proc-col">
        <div class="proc-sub">Área total</div>
        <div class="eq-row"><div class="eq-body">${kx(`A_{total} = \\sum A_{i} = ${ftex(res.A)}\\,${utex(u2)}`)}</div></div>
      </div>
      <div class="proc-col">
        <div class="proc-sub">Coordenadas del centroide C</div>
        <div class="eq-row"><div class="eq-body">${kx(`\\bar{x} = \\dfrac{\\sum A_{i}\\tilde{x}_{i}}{\\sum A_{i}} = \\dfrac{${ftex(res.Qy)}}{${ftex(res.A)}} = ${kres(ftex(res.xbar)+'\\,'+utex(u1))}`)}</div></div>
        <div class="eq-row"><div class="eq-body">${kx(`\\bar{y} = \\dfrac{\\sum A_{i}\\tilde{y}_{i}}{\\sum A_{i}} = \\dfrac{${ftex(res.Qx)}}{${ftex(res.A)}} = ${kres(ftex(res.ybar)+'\\,'+utex(u1))}`)}</div></div>
      </div>`;
  if(het){
    html += `
      <div class="proc-col">
        <div class="proc-sub">Coordenadas del centro de gravedad G</div>
        <div class="eq-row"><div class="eq-body">${kx(`\\sum ${Wsim}_{i} = \\sum ${simb}_{i}A_{i}t_{i} = ${kres(ftexPeso(res.W)+'\\,'+utex(uW))}`)}</div></div>
        <div class="eq-row"><div class="eq-body">${kx(`x_{G} = \\dfrac{\\sum ${Wsim}_{i}\\tilde{x}_{i}}{\\sum ${Wsim}_{i}} = \\dfrac{${ftexPeso(res.Wx)}}{${ftexPeso(res.W)}} = ${kres(ftex(res.xg)+'\\,'+utex(u1))}`)}</div></div>
        <div class="eq-row"><div class="eq-body">${kx(`y_{G} = \\dfrac{\\sum ${Wsim}_{i}\\tilde{y}_{i}}{\\sum ${Wsim}_{i}} = \\dfrac{${ftexPeso(res.Wy)}}{${ftexPeso(res.W)}} = ${kres(ftex(res.yg)+'\\,'+utex(u1))}`)}</div></div>
      </div>`;
  }
  html += `</div>
    <div class="summary-grid">
      <div class="summary-box"><div class="s-lbl">Área total A</div><div class="s-val">${f(res.A)}</div><div class="s-unit">${u2}</div></div>
      <div class="summary-box"><div class="s-lbl">${het?(Wnom+' total Σ'+Wsim):'Peso total ΣW'}</div><div class="s-val">${het?ftexPesoTxt(res.W):f(res.W)}</div><div class="s-unit">${het?uW:'—'}</div></div>
      <div class="summary-box highlight"><div class="s-lbl">${het?'x̄ (centroide)':'x̄ = x_G'}</div><div class="s-val">${nL(res.xbar)}</div><div class="s-unit">${u1}</div></div>
      <div class="summary-box highlight"><div class="s-lbl">${het?'ȳ (centroide)':'ȳ = y_G'}</div><div class="s-val">${nL(res.ybar)}</div><div class="s-unit">${u1}</div></div>
    </div>`;
  if(het){
    html += `<div class="summary-grid">
      <div class="summary-box highlight" style="border-color:#c0392b"><div class="s-lbl">x_G</div><div class="s-val">${nL(res.xg)}</div><div class="s-unit">${u1}</div></div>
      <div class="summary-box highlight" style="border-color:#c0392b"><div class="s-lbl">y_G</div><div class="s-val">${nL(res.yg)}</div><div class="s-unit">${u1}</div></div>
      <div class="summary-box" style="border-color:#c0392b"><div class="s-lbl">Separación C–G</div><div class="s-val">${nL(res.sep)}</div><div class="s-unit">${u1}</div></div>
      <div class="summary-box"><div class="s-lbl">Figuras</div><div class="s-val">${res.steps.length}</div><div class="s-unit">—</div></div>
    </div>`;
  }
  html += `<div class="proc-block" style="border-left:3px solid ${het?'#c0392b':'var(--grn)'};padding-left:12px;margin-top:10px;">
      <div style="font-size:11.5px;line-height:1.65;color:var(--muted)">${
        het ? `Cuerpo <b style="color:#c0392b">heterogéneo</b>: G a ${nL(res.sep)} ${u1} de C.`
            : `Cuerpo <b style="color:var(--grn2)">homogéneo</b>: C = G = centro de masa.`
      }</div>
    </div>
  </div>`;

  // ══════════════════════════════════════════════════
  //  5 · Sección resuelta
  // ══════════════════════════════════════════════════
  html += `<div class="res-section">
    <div class="res-section-title"><div class="num">4</div>Sección resuelta — ubicación de ${het?'C y G':'C'}</div>
    <canvas id="finalCanvas" style="width:100%;max-width:860px;height:400px;display:block;margin:0 auto;border-radius:10px;border:1px solid var(--border);background:#fff;"></canvas>
    <div style="font-size:10px;color:var(--muted);margin-top:6px;">
      Sección con los huecos ya descontados. <b style="color:#b8860c">C</b> = centro geométrico (centroide)${het?` &nbsp;·&nbsp; <b style="color:#c0392b">G</b> = centro de gravedad y centro de masa`:``}
    </div>

  </div>`;

  // Se escribe DENTRO de #resultsPanel, no en #resultsArea. Si se escribiera en
  // resultsArea se destruiría el propio #resultsPanel y el segundo cálculo
  // fallaría con "rp is null". Mismo patrón que el Cap. 10.
  const cont = document.getElementById('resultsPanel');
  if(cont) cont.innerHTML = html;
  try{ if(cont) renderKatex(cont); }catch(e){ console.warn('KaTeX:',e); }
  setTimeout(()=>{ try{ drawCompositeFigure('compositeCanvas'); }catch(e){}
                   try{ drawSeccionFinal('finalCanvas'); }catch(e){} }, 90);
}

function rotateInertia(Ix, Iy, Ixy, thetaDeg){
  const th = thetaDeg*Math.PI/180;
  const c2 = Math.cos(2*th), s2 = Math.sin(2*th);
  const avg = (Ix+Iy)/2, dif = (Ix-Iy)/2;
  let Iu  = avg + dif*c2 - Ixy*s2;
  let Iv  = avg - dif*c2 + Ixy*s2;
  let Iuv = dif*s2 + Ixy*c2;
  // limpieza de residuos numéricos en múltiplos exactos de 90°
  const m = ((thetaDeg % 180)+180)%180;
  const near = (a,b)=>Math.abs(a-b)<1e-9;
  if(near(m,0)){   Iu=Ix; Iv=Iy; Iuv=Ixy; }
  if(near(m,90)){  Iu=Iy; Iv=Ix; Iuv=-Ixy; }   // ejes intercambiados: Iu ≡ Iy
  return {Iu, Iv, Iuv, swapped: near(m,90)};
}

function computeExtraPoint(res){
  if(!extraPoint || !res) return null;
  const dx = res.xbar - extraPoint.x;   // centroide relativo a P
  const dy = res.ybar - extraPoint.y;
  const IxP  = res.Ix  + res.A*dy*dy;
  const IyP  = res.Iy  + res.A*dx*dx;
  const IxyP = res.Ixy + res.A*dx*dy;
  const avg=(IxP+IyP)/2;
  const R=Math.sqrt(Math.pow((IxP-IyP)/2,2)+IxyP*IxyP);
  const thetaP = -0.5*Math.atan2(2*IxyP, IxP-IyP)*180/Math.PI;
  const out = {x:extraPoint.x, y:extraPoint.y, dx, dy, IxP, IyP, IxyP, avg, R, Imax:avg+R, Imin:avg-R, thetaP};
  if(axisAngle!==null && isFinite(axisAngle)){
    const rot = rotateInertia(IxP, IyP, IxyP, axisAngle);
    const norm = ((axisAngle % 360)+360)%360;   // 0..360
    out.rot = {
      ang: axisAngle,
      norm,
      Iu: rot.Iu, Iv: rot.Iv, Iuv: rot.Iuv,
      swapped: rot.swapped,
      c2: Math.cos(2*axisAngle*Math.PI/180),
      s2: Math.sin(2*axisAngle*Math.PI/180)
    };
  }
  return out;
}
