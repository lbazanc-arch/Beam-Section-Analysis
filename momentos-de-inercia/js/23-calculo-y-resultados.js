// ═══════════════════════════════════════════════════════════
//  TECLA ESC  (mismo contrato que en los Cap. 6 y 9)
// ═══════════════════════════════════════════════════════════
// Se detiene en lo primero que aplica, para que una sola pulsación no deshaga
// dos cosas a la vez.
const MODALES_ESC = ['edFigModal','guardarModal','unitsModal','decModal','histModal','catModal',
                     'transModal','repModal'];
function manejarEsc(){
  // 0) La ventana del informe PDF, que se superpone a todo
  const pl = document.getElementById('panelLatexPDF');
  if(pl && pl.style.display !== 'none' && pl.style.display !== ''){ cerrarPanelLatex(); return; }
  // 1) Una ventana abierta
  const abierto = MODALES_ESC.find(id=>{
    const m = document.getElementById(id);
    return m && m.classList.contains('show');
  });
  if(abierto){
    // edFigModal no basta con ocultarlo: hay que devolver #propPanel a la
    // columna o el panel de propiedades desaparecería de la interfaz.
    if(abierto === 'edFigModal') cerrarEdicionFigura();
    else document.getElementById(abierto).classList.remove('show');
    return;
  }
  // 2) El menú de figuras
  const menu = document.getElementById('menuFiguras');
  if(menu && menu.classList.contains('abierto')){ cerrarMenuFiguras(); return; }
  // 3) Un aviso en pantalla
  const av = document.getElementById('avisoCaja');
  if(av && av.classList.contains('visible')){ cerrarAviso(); return; }
  // 4) Un arrastre a medias
  if(isDragging || isDraggingFig){
    isDragging = false; isDraggingFig = false; dragFigId = null; dragAnchorId = null;
    render(); return;
  }
  // 5) La colocación de una figura pendiente de clic
  if(selectedFigType){
    selectedFigType = null; ghostPos = null;
    document.querySelectorAll('.fig-btn').forEach(b=>b.classList.remove('selected'));
    canvas.style.cursor = 'default';
    render(); return;
  }
  // 6) La selección actual
  if(selFiguras.length){ selFiguras = []; actualizarInfoSel(); render(); return; }
  if(selectedFigId !== null){ selectFigure(null); render(); return; }
  // 7) La herramienta de selección, para volver al desplazamiento
  if(herramienta !== 'pan') setHerramienta('pan');
}
document.addEventListener('keydown', e=>{
  if(e.key === 'Escape'){ manejarEsc(); return; }
  // Los atajos no deben dispararse mientras se escribe en un campo.
  const t = e.target;
  if(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
  if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey){ e.preventDefault(); deshacer(); }
  else if((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y'
          || (e.key.toLowerCase() === 'z' && e.shiftKey))){ e.preventDefault(); rehacer(); }
});

// La paleta vive en la barra de herramientas: inserta figuras nuevas.
// La sección "Figuras" de la columna solo muestra las ya dibujadas.
// Solo se muestran las 6 primeras figuras; la séptima aparece con "Ver más".
// Así el panel cabe de un vistazo en lugar de obligar a desplazarse.
const PAL_VISIBLES = 6;

function alternarVerMas(){
  const grid = document.getElementById('palGrid');
  const btn  = document.getElementById('palMas');
  const txt  = document.getElementById('palMasTxt');
  if(!grid || !btn) return;
  const abriendo = !btn.classList.contains('abierto');
  grid.querySelectorAll('.fig-btn').forEach((b,i)=>{
    b.classList.toggle('oculta', !abriendo && i >= PAL_VISIBLES);
  });
  btn.classList.toggle('abierto', abriendo);
  if(txt) txt.textContent = abriendo ? 'Ver menos' : 'Ver más';
}

// Si la figura elegida estaba entre las escondidas, se despliega la paleta
// para que el botón marcado quede a la vista.
function asegurarFiguraVisible(tipo){
  const b = document.getElementById('figbtn-' + tipo);
  const btn = document.getElementById('palMas');
  if(b && b.classList.contains('oculta') && btn && !btn.classList.contains('abierto')){
    alternarVerMas();
  }
}

function abrirPaleta(ev){
  const m = document.getElementById('menuFiguras');
  if(!m) return;
  const abre = !m.classList.contains('abierto');
  m.classList.toggle('abierto', abre);
  const btn = document.getElementById('btnFiguras');
  if(btn) btn.classList.toggle('active', abre);
  if(!abre) return;
  // Se sitúa justo bajo la barra y alineado con su botón. Antes iba clavado en
  // top:107px / left:60px, medidas de un maquetado anterior.
  const tb = document.querySelector('.toolbar');
  if(!tb) return;
  const rt = tb.getBoundingClientRect();
  // Sin evento (la abre el catálogo) se alinea igual con el botón Figuras.
  const anc = (ev && ev.currentTarget) || document.getElementById('btnFiguras');
  const rb = anc ? anc.getBoundingClientRect() : rt;
  m.style.top  = (rt.bottom + 6) + 'px';
  m.style.left = Math.max(8, Math.min(rb.left, window.innerWidth - m.offsetWidth - 8)) + 'px';
}
function cerrarMenuFiguras(){
  const b = document.getElementById('btnFiguras');
  if(b) b.classList.remove('active');
  const m = document.getElementById('menuFiguras');
  if(m) m.classList.remove('abierto');
}
// al elegir una figura el menú se cierra solo
document.addEventListener('click', ev=>{
  const m = document.getElementById('menuFiguras');
  if(!m || !m.classList.contains('abierto')) return;
  const dentro = m.contains(ev.target);
  const boton = ev.target.closest && ev.target.closest('[onclick*="abrirPaleta"]');
  if(!dentro && !boton) cerrarMenuFiguras();
  else if(dentro && ev.target.closest('.fig-btn')) cerrarMenuFiguras();
});

function calculate(){
  if(!figures.length){ aviso('Agrega al menos una figura.'); return; }

  const u4 = unit+'⁴';
  const u2 = unit+'²';
  const u1 = unit;

  let A=0, Qx=0, Qy=0;
  for(const fig of figures){
    const def = FIG_DEFS[fig.type];
    const a = figArea(fig)*fig.sign;
    A += a;
    Qx += a*fig.cy;
    Qy += a*fig.cx;
  }
  if(Math.abs(A)<1e-12){ aviso('Área total es cero (verifica figuras negativas).', 'error'); return; }

  const xbar = Qy/A, ybar = Qx/A;

  let Ix=0, Iy=0, Ixy=0;
  const steps = [];

  for(const fig of figures){
    const def = FIG_DEFS[fig.type];
    const a = figArea(fig);
    const rot = fig.rotation*Math.PI/180;
    // Rotate centroidal moments for rotated figures
    const Ixc0 = figIx(fig);
    const Iyc0 = figIy(fig);
    const Ixyc0 = figIxy(fig);
    // Tensor rotation of inertia consistent with how the figure is DRAWN.
    // drawFigure applies ctx.rotate(-rot)+scale(1,-1), i.e. a positive fig.rotation
    // rotates the figure COUNTER-CLOCKWISE by φ in world (Y-up) coords. For a body
    // rotated CCW by φ, the centroidal moments about the WORLD axes are:
    //   Ix' = (Ix+Iy)/2 + (Ix-Iy)/2·cos2φ + Pxy·sin2φ
    //   Iy' = (Ix+Iy)/2 - (Ix-Iy)/2·cos2φ - Pxy·sin2φ
    //   Px'y' = -(Ix-Iy)/2·sin2φ + Pxy·cos2φ
    // (Previously the sin2φ terms carried the axis-rotation sign, which corresponds
    //  to a CW body rotation and swapped Ix'/Iy' relative to the drawn orientation.)
    const cos2=Math.cos(2*rot), sin2=Math.sin(2*rot);
    const Ixc  = (Ixc0+Iyc0)/2 + (Ixc0-Iyc0)/2*cos2 + Ixyc0*sin2;
    const Iyc  = (Ixc0+Iyc0)/2 - (Ixc0-Iyc0)/2*cos2 - Ixyc0*sin2;
    let   Ixyc = -(Ixc0-Iyc0)/2*sin2 + Ixyc0*cos2;
    // FIX TASK 3: Symmetry assertion — zero out floating-point noise
    // when the figure is inherently symmetric (Pxy0=0) and unrotated
    if(Math.abs(Ixyc0) < 1e-14 && Math.abs(Math.sin(rot)) < 1e-10) Ixyc = 0;

    const dx = fig.cx - xbar, dy = fig.cy - ybar;
    // Parallel axis (Steiner) relative to global centroid
    const Ix_f = (Ixc + a*dy*dy)*fig.sign;
    const Iy_f = (Iyc + a*dx*dx)*fig.sign;
    const Ixy_f = (Ixyc + a*dx*dy)*fig.sign;

    Ix += Ix_f; Iy += Iy_f; Ixy += Ixy_f;

    // Ixc0/Iyc0/Ixyc0 son las inercias PROPIAS, sobre los ejes de la figura sin
    // girar. El informe las necesita para mostrar el giro como paso aparte.
    steps.push({fig, a, Ixc0, Iyc0, Ixyc0, rot, Ixc, Iyc, Ixyc, dx, dy, Ix_f, Iy_f, Ixy_f});
  }

  // Principal moments and angle
  const avg = (Ix+Iy)/2;
  const R = Math.sqrt(Math.pow((Ix-Iy)/2,2)+Ixy*Ixy);
  const Imax = avg+R, Imin = avg-R;
  const thetaP = -0.5*Math.atan2(2*Ixy, Ix-Iy)*180/Math.PI;
  // Polar
  const Jo = Ix+Iy;
  // Radii of gyration
  const kx = Math.sqrt(Math.abs(Ix/A)), ky = Math.sqrt(Math.abs(Iy/A));

  results = {xbar,ybar,Ix,Iy,Ixy,Imax,Imin,thetaP,Jo,kx,ky,A,steps};
  try{ histPush(); }catch(e){}

  renderResults(results, u4, u2, u1);
  render();
}

// Al fijar un exponente grande, la mantisa puede quedar en 0.0000 con los
// decimales configurados. Se amplían solo lo necesario para no perder cifras
// significativas, sin pasar de 8 decimales.
function decMantisa(m){
  if(!isFinite(m)) return '0';
  if(m === 0) return (0).toFixed(DEC.iner);
  // Se conservan tantas cifras SIGNIFICATIVAS como decimales tenga configurado
  // el usuario. Con solo evitar el cero se perdía precisión: 1.683e-8 salía
  // como 0.00000002, que al reconstruir daba 20 en vez de 16.83.
  const exp10 = Math.floor(Math.log10(Math.abs(m)));
  const extra = Math.max(0, -exp10 - 1);
  const d = Math.min(12, DEC.iner + extra);
  return m.toFixed(d);
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
      return mant.toFixed(DEC.iner) + ' ×10<sup>' + exp + '</sup>';
    }
    return decFix(v,'iner').toString();
  }
  const factor = Math.pow(10, notationExp);
  return decMantisa(v / factor) + ' ×10<sup>' + notationExp + '</sup>';
}
// ── LaTeX helpers (KaTeX) ──
function _kesc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
// unidad "cm⁴"/"cm²"/"mm" → LaTeX \text{cm}^{4}
// Versión en TEXTO de la unidad, para fuera del modo matemático. Los
// caracteres ² y ⁴ literales dependen del juego de caracteres cargado;
// \textsuperscript funciona siempre.
function utexto(u){
  if(!u) return '';
  const sup={'²':'2','³':'3','⁴':'4','⁶':'6'};
  const m=String(u).match(/^([a-zA-Z]+)([²³⁴⁶]?)$/);
  if(m) return m[1]+(m[2]?('\\textsuperscript{'+sup[m[2]]+'}'):'');
  return String(u);
}
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
      return mant.toFixed(DEC.iner)+'\\times 10^{'+exp+'}';
    }
    return String(decFix(v,'iner'));
  }
  const factor=Math.pow(10,notationExp);
  return decMantisa(v/factor)+'\\times 10^{'+notationExp+'}';
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

function setNotation(exp){
  notationExp = exp;
  document.querySelectorAll('.notbtn').forEach(b=>b.classList.remove('active'));
  const btn = document.getElementById('not-'+exp);
  if(btn) btn.classList.add('active');
  if(results) renderResults(results, currentU4, currentU2, currentU1);
}
let currentU4='', currentU2='', currentU1='';

function renderResults(res, u4, u2, u1){
  currentU4=u4; currentU2=u2; currentU1=u1;
  const rp = document.getElementById('resultsPanel');
  rp.style.display='block';
  const hint = document.getElementById('noResultsHint');
  if(hint) hint.style.display='none';
  // Se muestra el area de resultados; el scroll de pagina lo da el propio
  // documento (min-height:100%), sin tocar el estilo del body.
  const ra = document.getElementById('resultsArea');
  if(ra){ ra.style.display='block'; }
  // Scroll to results after short delay
  setTimeout(()=>{ ra && ra.scrollIntoView({behavior:'smooth', block:'start'}); }, 150);

  const f = v => fmtVal(v);
  const n4 = v => decFix(v,'ang');
  const n2 = v => decFix(v,'len');
  const pct = v => v===0 ? '0' : (v>0?'+':'')+f(v);

  // ── NOTATION BAR ──
  let html = `<div class="results-wrap">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:10px;">
    <h2 style="font-size:18px;font-weight:900;color:var(--grn2);margin:0;">Solución completa</h2>
    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
      <span style="font-size:9px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.5px;">Notación:</span>
      <button class="notbtn${notationExp===0?' active':''}" id="not-0" onclick="setNotation(0)">Auto</button>
      <button class="notbtn${notationExp===2?' active':''}" id="not-2" onclick="setNotation(2)">×10²</button>
      <button class="notbtn${notationExp===4?' active':''}" id="not-4" onclick="setNotation(4)">×10⁴</button>
      <button class="notbtn${notationExp===6?' active':''}" id="not-6" onclick="setNotation(6)">×10⁶</button>
      <button class="notbtn${notationExp===9?' active':''}" id="not-9" onclick="setNotation(9)">×10⁹</button>
    </div>
  </div>`;


  html += `<div class="res-section">
    <div class="res-section-title"><div class="num" style="background:#041d56"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;"><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z"/></svg></div>Sección compuesta — visualización con cotas</div>
    <canvas id="compositeCanvas" style="width:100%;max-width:860px;height:420px;display:block;margin:0 auto;border-radius:10px;border:1px solid var(--border);background:#ffffff;"></canvas>
    <div style="font-size:9px;color:var(--muted);margin-top:5px;">Área positiva = sólido &nbsp;|&nbsp; Área negativa = trama (//) &nbsp;|&nbsp; G = centroide global</div>
  </div>`;

  // ══════════════════════════════════════════════════
  // SECTION 1: Per-figure data

  // ══════════════════════════════════════════════════
  //  Perfiles de acero: contraste con los valores de tabla
  // ══════════════════════════════════════════════════
  const conPerfil = figures.filter(f=>f.perfil);
  if(conPerfil.length){
    html += `<div class="res-section">
      <div class="res-section-title"><div class="num"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;"><path d="M5 4h14M12 4v16M5 20h14"/></svg></div>Perfiles laminados de acero</div>
      <div style="font-size:11px;color:var(--muted);line-height:1.6;margin-bottom:10px;">
        Comparación entre lo que calcula el aplicativo a partir de la sección dibujada y los
        valores del Apéndice C de Beer &amp; Johnston.
      </div>`;
    conPerfil.forEach(fig=>{
      const tb = perfilTab(fig); if(!tb) return;
      const D  = FIG_DEFS[fig.type];
      const geo = {A:D.area(fig.dims), Ix:D.Ix_c(fig.dims), Iy:D.Iy_c(fig.dims)};
      const usa = usaTabla(fig);
      const dif = (g,t2)=> (t2? (100*(g-t2)/t2) : 0);
      const cel = (g,t2)=>{
        const d = dif(g,t2);
        const col = Math.abs(d)<3 ? 'var(--grn2)' : (Math.abs(d)<8 ? '#b45309' : '#c0392b');
        return `<td style="text-align:right;padding:4px 8px">${f(g)}</td>
                <td style="text-align:right;padding:4px 8px;font-weight:700">${f(t2)}</td>
                <td style="text-align:right;padding:4px 8px;color:${col}">${d>=0?'+':''}${decFix(d,'ang')}%</td>`;
      };
      html += `<div class="proc-block" style="margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${fig.color}"></span>
          <span style="font-size:12px;font-weight:800;color:var(--grn2)">${tb.nom}</span>
          <span style="font-size:10px;color:${usa?'#b45309':'var(--muted)'};margin-left:auto;font-weight:700">
            ${usa?'Se usan los valores de la tabla':'Se usa la sección dibujada'}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <thead><tr style="color:var(--muted);font-size:10px;">
            <th style="text-align:left;padding:4px 8px">Propiedad</th>
            <th style="text-align:right;padding:4px 8px">Sección dibujada</th>
            <th style="text-align:right;padding:4px 8px">Tabla (Apéndice C)</th>
            <th style="text-align:right;padding:4px 8px">Diferencia</th></tr></thead>
          <tbody>
            <tr style="border-top:1px solid var(--border)"><td style="padding:4px 8px">Área (${u2})</td>${cel(geo.A,tb.A)}</tr>
            <tr style="border-top:1px solid var(--border)"><td style="padding:4px 8px">I<sub>x</sub> (${u4})</td>${cel(geo.Ix,tb.Ix)}</tr>
            <tr style="border-top:1px solid var(--border)"><td style="padding:4px 8px">I<sub>y</sub> (${u4})</td>${cel(geo.Iy,tb.Iy)}</tr>
          </tbody>
        </table>
        <div style="font-size:10px;color:var(--muted);margin-top:6px;line-height:1.5;">
          ${usa
            ? 'En perfiles S y canales C las alas son cónicas; el dibujo las representa rectangulares, por lo que I<sub>y</sub> saldría sobreestimado. El cálculo de la sección compuesta usa por eso los valores de la tabla.'
            : 'La diferencia proviene de los radios de acuerdo, que la sección idealizada no reproduce.'}
        </div>
      </div>`;
    });
    html += `</div>`;
  }

  // ══════════════════════════════════════════════════
  html += `<div class="res-section">
    <div class="res-section-title"><div class="num">1</div>Propiedades de cada figura</div>`;

  for(const [i, s] of res.steps.entries()){
    const fig = s.fig;
    const def = FIG_DEFS[fig.type];
    const signLabel = fig.sign===1 ? '<span class="sign-pos">＋ Suma</span>' : '<span class="sign-neg">－ Resta</span>';
    html += `
    <div class="proc-block" style="margin-bottom:10px;">
      <div class="fig-card"><div class="fig-card-datos">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <span style="display:inline-block;width:8px;height:8px;min-width:8px;max-width:8px;border-radius:50%;background:${fig.color};margin-right:5px;vertical-align:middle;"></span>
        <span style="font-size:12px;font-weight:700;color:var(--text)">${i+1}. ${fig.name}</span>
        <span style="margin-left:4px;">${signLabel}</span>
      </div>
      <table class="fig-table">
        <thead><tr>
          <th>Magnitud</th><th>Símbolo</th><th>Valor</th><th>Unidad</th>
        </tr></thead>
        <tbody>
          <tr><td>Área</td><td>Aᵢ</td><td class="num-cell">${n4(s.a)}</td><td>${u2}</td></tr>
          <tr><td>Centroide x</td><td>xᵢ</td><td class="num-cell">${n4(fig.cx)}</td><td>${u1}</td></tr>
          <tr><td>Centroide y</td><td>yᵢ</td><td class="num-cell">${n4(fig.cy)}</td><td>${u1}</td></tr>
          <tr><td>Inercia centroidal Ix</td><td>Ī<sub>xGi</sub></td><td class="num-cell">${f(s.Ixc)}</td><td>${u4}</td></tr>
          <tr><td>Inercia centroidal Iy</td><td>Ī<sub>yGi</sub></td><td class="num-cell">${f(s.Iyc)}</td><td>${u4}</td></tr>
          <tr><td>Producto de inercia</td><td>P<sub>xyGi</sub></td><td class="num-cell">${f(s.Ixyc)}</td><td>${u4}</td></tr>
        </tbody>
      </table>
      </div><div class="fig-card-dib">${croquisFigura(fig, i)}</div></div>
    </div>`;
  }
  html += `</div>`;

  // ══════════════════════════════════════════════════
  // SECTION 2: Summary table
  // ══════════════════════════════════════════════════
  html += `<div class="res-section">
    <div class="res-section-title"><div class="num">2</div>Tabla resumen de figuras</div>
    <div style="overflow-x:auto;">
    <table class="fig-table">
      <thead><tr>
        <th>N°</th><th>Figura</th><th>Signo</th>
        <th>Aᵢ (${u2})</th>
        <th>xᵢ (${u1})</th><th>yᵢ (${u1})</th>
        <th>Aᵢxᵢ (${u2}·${u1})</th><th>Aᵢyᵢ (${u2}·${u1})</th>
        <th>Ī<sub>xGi</sub> (${u4})</th><th>Ī<sub>yGi</sub> (${u4})</th>
        <th>P<sub>xyGi</sub> (${u4})</th>
      </tr></thead>
      <tbody>`;

  let sumA=0, sumAx=0, sumAy=0;
  for(const [i,s] of res.steps.entries()){
    const Ai = s.a * s.fig.sign;
    const Aixi = s.a * s.fig.sign * s.fig.cx;
    const Aiyi = s.a * s.fig.sign * s.fig.cy;
    sumA+=Ai; sumAx+=Aixi; sumAy+=Aiyi;
    const sgnCls = s.fig.sign===1?'sign-pos':'sign-neg';
    html += `<tr>
      <td>${i+1}</td>
      <td class="name-cell"><span style="display:inline-block;width:8px;height:8px;min-width:8px;max-width:8px;border-radius:50%;background:${s.fig.color};margin-right:5px;vertical-align:middle;"></span>${s.fig.name}</td>
      <td class="${sgnCls}">${s.fig.sign===1?'＋':'－'}</td>
      <td class="num-cell">${n4(Ai)}</td>
      <td class="num-cell">${n4(s.fig.cx)}</td><td class="num-cell">${n4(s.fig.cy)}</td>
      <td class="num-cell">${n4(Aixi)}</td><td class="num-cell">${n4(Aiyi)}</td>
      <td class="num-cell">${f(s.Ixc)}</td><td class="num-cell">${f(s.Iyc)}</td>
      <td class="num-cell">${f(s.Ixyc)}</td>
    </tr>`;
  }
  html += `</tbody><tfoot><tr>
    <td colspan="3">Σ (Total)</td>
    <td class="num-cell">${n4(sumA)}</td>
    <td colspan="2">—</td>
    <td class="num-cell">${n4(sumAx)}</td>
    <td class="num-cell">${n4(sumAy)}</td>
    <td colspan="3">—</td>
  </tr></tfoot>
    </table></div>
  </div>`;

  // ══════════════════════════════════════════════════
  // SECTION 3: Centroid + Area of composite section
  // ══════════════════════════════════════════════════
  html += `<div class="res-section">
    <div class="res-section-title"><div class="num">3</div>Centroide y área de la sección compuesta</div>
    <div class="proc-block">
      <div class="proc-subtitle">Área total</div>
      <div class="eq-row"><div class="eq-lbl"></div>
        <div class="eq-body">${kx(`A_{total} = \\sum A_i = ${kres(ftex(res.A)+'\\,'+utex(u2))}`)}</div>
      </div>
      <div class="eq-sep"></div>
      <div class="proc-subtitle">Coordenadas del centroide global G</div>
      <div class="eq-row"><div class="eq-lbl"></div>
        <div class="eq-body">${kx(`\\bar{x} = \\dfrac{\\sum A_i x_i}{\\sum A_i} = \\dfrac{${ftex(sumAx)}}{${ftex(sumA)}} = ${kres(ftex(res.xbar)+'\\,'+utex(u1))}`)}</div>
      </div>
      <div class="eq-row"><div class="eq-lbl"></div>
        <div class="eq-body">${kx(`\\bar{y} = \\dfrac{\\sum A_i y_i}{\\sum A_i} = \\dfrac{${ftex(sumAy)}}{${ftex(sumA)}} = ${kres(ftex(res.ybar)+'\\,'+utex(u1))}`)}</div>
      </div>
    </div>
    <div class="summary-grid">
      <div class="summary-box highlight"><div class="s-lbl">Área total A</div><div class="s-val">${n4(res.A)}</div><div class="s-unit">${u2}</div></div>
      <div class="summary-box highlight"><div class="s-lbl">x̄ (centroide)</div><div class="s-val">${n4(res.xbar)}</div><div class="s-unit">${u1}</div></div>
      <div class="summary-box highlight"><div class="s-lbl">ȳ (centroide)</div><div class="s-val">${n4(res.ybar)}</div><div class="s-unit">${u1}</div></div>
      <div class="summary-box"><div class="s-lbl">Jₒ (polar)</div><div class="s-val">${f(res.Jo)}</div><div class="s-unit">${u4}</div></div>
    </div>
  </div>`;

  // ══════════════════════════════════════════════════
  // SECTION 4: Steiner — centroidal inertias
  // ══════════════════════════════════════════════════
  html += `<div class="res-section">
    <div class="res-section-title"><div class="num">4</div>Momentos e inercia centroidal — Teorema de Steiner</div>
    <div class="proc-block" style="margin-bottom:10px;">
      <div class="proc-subtitle">Fórmulas de Steiner (traslación de ejes al centroide G)</div>
      <div class="eq-row"><div class="eq-body" style="font-size:12px;">
        ${kx(`\\bar{I}_{xG} = \\sum\\left(\\bar{I}_{xGi} + A_i\\, d_{yi}^{2}\\right) \\qquad \\bar{I}_{yG} = \\sum\\left(\\bar{I}_{yGi} + A_i\\, d_{xi}^{2}\\right) \\qquad P_{xyG} = \\sum\\left(P_{xyGi} + A_i\\, d_{xi}\\, d_{yi}\\right)`)}
      </div></div>
      <div class="eq-body" style="font-size:11px;color:var(--muted);margin-top:4px;">
        ${kx(`\\text{donde:}\\quad d_{xi} = x_i - \\bar{x} = x_i - ${ftex(res.xbar)} \\qquad d_{yi} = y_i - \\bar{y} = y_i - ${ftex(res.ybar)}`)}
      </div>
    </div>
    <div style="overflow-x:auto;">
    <table class="steiner-table">
      <thead><tr>
        <th style="text-align:left;">Figura</th>
        <th>Aᵢ</th>
        <th>dₓᵢ</th><th>dᵧᵢ</th>
        <th>Ī<sub>xGi</sub></th><th>Aᵢ dᵧᵢ²</th><th style="font-weight:800;">Ī<sub>xGi</sub> + Aᵢ dᵧᵢ²</th>
        <th>Ī<sub>yGi</sub></th><th>Aᵢ dₓᵢ²</th><th style="font-weight:800;">Ī<sub>yGi</sub> + Aᵢ dₓᵢ²</th>
        <th>P<sub>xyGi</sub> + Aᵢ dₓᵢ dᵧᵢ</th>
      </tr></thead>
      <tbody>`;

  let sumIx=0, sumIy=0, sumIxy=0;
  for(const s of res.steps){
    const Adx2 = s.a * s.dx * s.dx;
    const Ady2 = s.a * s.dy * s.dy;
    const Adxdy = s.a * s.dx * s.dy;
    const IxContrib = s.fig.sign * (s.Ixc + s.a*s.dy*s.dy);
    const IyContrib = s.fig.sign * (s.Iyc + s.a*s.dx*s.dx);
    const IxyContrib = s.fig.sign * (s.Ixyc + s.a*s.dx*s.dy);
    sumIx+=IxContrib; sumIy+=IyContrib; sumIxy+=IxyContrib;
    const sgnStr = s.fig.sign===1?'＋':'－';
    html += `<tr>
      <td style="white-space:nowrap;"><span style="display:inline-block;width:8px;height:8px;min-width:8px;max-width:8px;border-radius:50%;background:${s.fig.color};margin-right:5px;vertical-align:middle;"></span>${s.fig.name}&nbsp;(${sgnStr})</td>
      <td class="num" style="text-align:center;min-width:60px;">${n4(s.a)}</td>
      <td class="num">${n4(s.dx)}</td><td class="num">${n4(s.dy)}</td>
      <td class="num">${f(s.Ixc)}</td><td class="num">${f(Ady2)}</td>
      <td class="num" style="font-weight:700">${f(IxContrib)}</td>
      <td class="num">${f(s.Iyc)}</td><td class="num">${f(Adx2)}</td>
      <td class="num" style="font-weight:700">${f(IyContrib)}</td>
      <td class="num" style="font-weight:700">${f(IxyContrib)}</td>
    </tr>`;
  }
  html += `</tbody><tfoot><tr>
    <td colspan="6"><b>Ī<sub>xG</sub> = Σ</b></td>
    <td class="num"><b>${f(res.Ix)}</b></td>
    <td colspan="2"><b>Ī<sub>yG</sub> = Σ</b></td>
    <td class="num"><b>${f(res.Iy)}</b></td>
    <td class="num"><b>${f(res.Ixy)}</b></td>
  </tr></tfoot>
    </table></div>
    <div class="summary-grid" style="margin-top:10px;">
      <div class="summary-box highlight"><div class="s-lbl">Ī<sub>xG</sub></div><div class="s-val">${f(res.Ix)}</div><div class="s-unit">${u4}</div></div>
      <div class="summary-box highlight"><div class="s-lbl">Ī<sub>yG</sub></div><div class="s-val">${f(res.Iy)}</div><div class="s-unit">${u4}</div></div>
      <div class="summary-box highlight"><div class="s-lbl">P<sub>xyG</sub></div><div class="s-val">${f(res.Ixy)}</div><div class="s-unit">${u4}</div></div>
      <div class="summary-box"><div class="s-lbl">kₓ (radio giro)</div><div class="s-val">${n4(res.kx)}</div><div class="s-unit">${u1}</div></div>
    </div>
  </div>`;

  // ══════════════════════════════════════════════════
  // SECTION 5: Principal moments + Mohr circle
  // ══════════════════════════════════════════════════
  const R_mohr = Math.sqrt(Math.pow((res.Ix-res.Iy)/2,2)+res.Ixy*res.Ixy);
  html += `<div class="res-section">
    <div class="res-section-title"><div class="num">5</div>Momentos de inercia principales centroidales y Círculo de Mohr</div>
    <div class="proc-block" style="margin-bottom:12px;">
      <div class="proc-subtitle">Procedimiento</div>
      <div class="eq-row"><div class="eq-body">
        ${kx(`\\bar{I}_{avg} = \\dfrac{\\bar{I}_{xG} + \\bar{I}_{yG}}{2} = \\dfrac{${ftex(res.Ix)} + ${ftex(res.Iy)}}{2} = ${kres(ftex((res.Ix+res.Iy)/2)+'\\,'+utex(u4))}`)}
      </div></div>
      <div class="eq-row"><div class="eq-body">
        ${kx(`R = \\sqrt{\\left(\\dfrac{\\bar{I}_{xG}-\\bar{I}_{yG}}{2}\\right)^{2} + P_{xyG}^{2}} = \\sqrt{\\left(${ftex((res.Ix-res.Iy)/2)}\\right)^{2} + \\left(${ftex(res.Ixy)}\\right)^{2}} = ${kres(ftex(R_mohr)+'\\,'+utex(u4))}`)}
      </div></div>
      <div class="eq-row"><div class="eq-body">
        ${kx(`I_{max} = \\bar{I}_{avg} + R = ${ftex((res.Ix+res.Iy)/2)} + ${ftex(R_mohr)} = ${kres(ftex(res.Imax)+'\\,'+utex(u4))}`)}
      </div></div>
      <div class="eq-row"><div class="eq-body">
        ${kx(`I_{min} = \\bar{I}_{avg} - R = ${ftex((res.Ix+res.Iy)/2)} - ${ftex(R_mohr)} = ${kres(ftex(res.Imin)+'\\,'+utex(u4))}`)}
      </div></div>
      <div class="eq-row"><div class="eq-body">
        ${kx(`\\theta_{p} = \\tfrac{1}{2}\\arctan\\!\\left(\\dfrac{-2P_{xyG}}{\\bar{I}_{xG}-\\bar{I}_{yG}}\\right) = ${kres(n4(res.thetaP)+'^{\\circ}')}`)}
      </div></div>
    </div>
    <div class="principal-grid">
      <div class="principal-box main"><div class="p-lbl">I<sub>máx</sub></div><div class="p-val">${f(res.Imax)}</div><div class="p-unit">${u4}</div></div>
      <div class="principal-box main"><div class="p-lbl">I<sub>mín</sub></div><div class="p-val">${f(res.Imin)}</div><div class="p-unit">${u4}</div></div>
      <div class="principal-box"><div class="p-lbl">θ<sub>p</sub> (ángulo)</div><div class="p-val">${n4(res.thetaP)}°</div><div class="p-unit">grados</div></div>
    </div>
    <div style="padding:8px 0 4px;font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.5px;">Círculo de Mohr de Inercia</div>
    <canvas id="mohrCanvas" class="mohr-full"></canvas>
  </div>`;

  // ── ANÁLISIS EN OTRO PUNTO (Sección 6) ──
  const ep = computeExtraPoint(res);
  const epx = extraPoint ? r2(extraPoint.x) : '';
  const epy = extraPoint ? r2(extraPoint.y) : '';
  html += `
    <div class="res-section point-tool${extraPoint?' has-point':''}">
      <div class="res-section-title"><div class="num">P</div>${extraPoint?`Momentos de inercia en el punto P(${r2(extraPoint.x)}, ${r2(extraPoint.y)})`:'Analizar la inercia en otro punto'}</div>
      <div class="proc-block point-input" style="display:flex;flex-wrap:wrap;align-items:flex-end;gap:12px;">
        <div style="font-size:11px;color:var(--muted);flex:1 1 100%;margin-bottom:2px;">
          Halla I<sub>x</sub>, I<sub>y</sub> y P<sub>xy</sub> respecto a ejes paralelos a X-Y que pasan por el punto indicado, y sus momentos principales en ese punto.
        </div>
        <div class="field" style="margin:0;"><label>Punto X (${u1})</label>
          <input type="number" id="epX" step="any" value="${epx}" style="width:110px;"></div>
        <div class="field" style="margin:0;"><label>Punto Y (${u1})</label>
          <input type="number" id="epY" step="any" value="${epy}" style="width:110px;"></div>
        <button class="btn-calc" style="margin:0;width:auto;padding:9px 18px;font-size:12px;" onclick="analyzePoint()">▶ Analizar punto</button>
        ${extraPoint?`<button class="btn-sm" style="margin:0;" onclick="clearExtraPoint()">Quitar</button>`:''}
      </div>`;
  if(ep){
    const dxt = `(\\bar{x}-x_P)=(${ftex(res.xbar)}-${ftex(ep.x)})=${ftex(ep.dx)}`;
    const dyt = `(\\bar{y}-y_P)=(${ftex(res.ybar)}-${ftex(ep.y)})=${ftex(ep.dy)}`;
    html += `
      <div class="proc-block">
        <div class="proc-subtitle">Traslación de ejes al punto P(${r2(ep.x)}, ${r2(ep.y)}) — Teorema de Steiner</div>
        <div class="eq-row"><div class="eq-body">${kx(`d_x = ${dxt} \\qquad d_y = ${dyt}`)}</div></div>
        <div class="eq-row"><div class="eq-body">${kx(`I_{xP} = \\bar{I}_{xG} + A\\,d_y^{2} = ${ftex(res.Ix)} + (${ftex(res.A)})(${ftex(ep.dy)})^2 = ${kres(ftex(ep.IxP)+'\\,'+utex(u4))}`)}</div></div>
        <div class="eq-row"><div class="eq-body">${kx(`I_{yP} = \\bar{I}_{yG} + A\\,d_x^{2} = ${ftex(res.Iy)} + (${ftex(res.A)})(${ftex(ep.dx)})^2 = ${kres(ftex(ep.IyP)+'\\,'+utex(u4))}`)}</div></div>
        <div class="eq-row"><div class="eq-body">${kx(`P_{xyP} = \\bar{P}_{xyG} + A\\,d_x d_y = ${ftex(res.Ixy)} + (${ftex(res.A)})(${ftex(ep.dx)})(${ftex(ep.dy)}) = ${kres(ftex(ep.IxyP)+'\\,'+utex(u4))}`)}</div></div>
      </div>
      <div class="summary-grid">
        <div class="summary-box highlight"><div class="s-lbl">I<sub>x</sub> en P</div><div class="s-val">${f(ep.IxP)}</div><div class="s-unit">${u4}</div></div>
        <div class="summary-box highlight"><div class="s-lbl">I<sub>y</sub> en P</div><div class="s-val">${f(ep.IyP)}</div><div class="s-unit">${u4}</div></div>
        <div class="summary-box"><div class="s-lbl">P<sub>xy</sub> en P</div><div class="s-val">${f(ep.IxyP)}</div><div class="s-unit">${u4}</div></div>
      </div>
      <div class="proc-block">
        <div class="proc-subtitle">Momentos de inercia principales en el punto P</div>
        <div class="eq-row"><div class="eq-body">${kx(`I_{avg} = \\dfrac{I_{xP}+I_{yP}}{2} = ${kres(ftex(ep.avg)+'\\,'+utex(u4))}`)}</div></div>
        <div class="eq-row"><div class="eq-body">${kx(`R = \\sqrt{\\left(\\dfrac{I_{xP}-I_{yP}}{2}\\right)^2 + P_{xyP}^2} = \\sqrt{\\left(${ftex((ep.IxP-ep.IyP)/2)}\\right)^2+\\left(${ftex(ep.IxyP)}\\right)^2} = ${kres(ftex(ep.R)+'\\,'+utex(u4))}`)}</div></div>
        <div class="eq-row"><div class="eq-body">${kx(`I_{max} = I_{avg}+R = ${kres(ftex(ep.Imax)+'\\,'+utex(u4))} \\qquad I_{min} = I_{avg}-R = ${kres(ftex(ep.Imin)+'\\,'+utex(u4))}`)}</div></div>
        <div class="eq-row"><div class="eq-body">${kx(`\\theta_{p} = \\tfrac{1}{2}\\arctan\\!\\left(\\dfrac{-2P_{xyP}}{I_{xP}-I_{yP}}\\right) = ${kres(n4(ep.thetaP)+'^{\\circ}')}`)}</div></div>
      </div>
      <div class="principal-grid">
        <div class="principal-box main"><div class="p-lbl">I<sub>máx</sub> en P</div><div class="p-val">${f(ep.Imax)}</div><div class="p-unit">${u4}</div></div>
        <div class="principal-box main"><div class="p-lbl">I<sub>mín</sub> en P</div><div class="p-val">${f(ep.Imin)}</div><div class="p-unit">${u4}</div></div>
        <div class="principal-box"><div class="p-lbl">θ<sub>p</sub> en P</div><div class="p-val">${n4(ep.thetaP)}°</div><div class="p-unit">grados</div></div>
      </div>
      <div style="padding:8px 0 4px;font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.5px;">Círculo de Mohr en el punto P</div>
      <canvas id="mohrCanvasP" class="mohr-full"></canvas>`;

    // ── ROTACIÓN DE EJES EN EL PUNTO P ──
    const angv = (axisAngle!==null && isFinite(axisAngle)) ? axisAngle : '';
    html += `
      <div class="proc-block" style="margin-top:10px;">
        <div class="proc-subtitle">Rotar los ejes en el punto P</div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:8px;">
          Gira los ejes un ángulo θ medido <b>respecto al eje X</b> (positivo antihorario) y obtén
          I<sub>u</sub>, I<sub>v</sub> y P<sub>uv</sub> en los ejes girados.
        </div>
        <div style="display:flex;flex-wrap:wrap;align-items:flex-end;gap:12px;">
          <div class="field" style="margin:0;"><label>Ángulo θ (grados)</label>
            <input type="number" id="epAng" step="any" value="${angv}" placeholder="0" style="width:120px;"></div>
          <button class="btn-calc" style="margin:0;width:auto;padding:9px 18px;font-size:12px;" onclick="analyzeAxisAngle()">▶ Rotar ejes</button>
          ${(axisAngle!==null)?`<button class="btn-sm" style="margin:0;" onclick="clearAxisAngle()">Quitar giro</button>`:''}
        </div>
      </div>`;

    if(ep.rot){
      const rt = ep.rot;
      html += `
      <div class="proc-block">
        <div class="proc-subtitle">Ejes girados θ = ${n4(rt.ang)}° respecto al eje X</div>
        <div class="eq-row"><div class="eq-body">${kx(`I_{u} = \\dfrac{I_{xP}+I_{yP}}{2} + \\dfrac{I_{xP}-I_{yP}}{2}\\cos 2\\theta - P_{xyP}\\sin 2\\theta = ${kres(ftex(rt.Iu)+'\\,'+utex(u4))}`)}</div></div>
        <div class="eq-row"><div class="eq-body">${kx(`I_{v} = \\dfrac{I_{xP}+I_{yP}}{2} - \\dfrac{I_{xP}-I_{yP}}{2}\\cos 2\\theta + P_{xyP}\\sin 2\\theta = ${kres(ftex(rt.Iv)+'\\,'+utex(u4))}`)}</div></div>
        <div class="eq-row"><div class="eq-body">${kx(`P_{uv} = \\dfrac{I_{xP}-I_{yP}}{2}\\sin 2\\theta + P_{xyP}\\cos 2\\theta = ${kres(ftex(rt.Iuv)+'\\,'+utex(u4))}`)}</div></div>
      </div>`;
      if(rt.swapped){
        html += `
        <div class="proc-block" style="border-left:3px solid #c0392b;padding-left:10px;">
          <div style="font-size:11.5px;color:#c0392b;font-weight:700;">Giro de ${n4(rt.norm)}°: los ejes se intercambian</div>
          <div style="font-size:11px;color:var(--muted);line-height:1.6;margin-top:4px;">
            Con θ = ±90° (o ±270°) el eje <b>u</b> queda sobre el eje <b>Y</b> original y el eje <b>v</b> sobre el <b>X</b>.
            Por eso el valor que aparece como I<sub>u</sub> ya <b>no es la inercia respecto a X</b>, sino la de <b>Y</b>:
            I<sub>u</sub> = I<sub>yP</sub> y I<sub>v</sub> = I<sub>xP</sub>, con P<sub>uv</sub> = −P<sub>xyP</sub>.
          </div>
        </div>`;
      }
      html += `
      <div class="summary-grid">
        <div class="summary-box highlight"><div class="s-lbl">I<sub>u</sub>${rt.swapped?' (= I<sub>y</sub>)':''}</div><div class="s-val">${f(rt.Iu)}</div><div class="s-unit">${u4}</div></div>
        <div class="summary-box highlight"><div class="s-lbl">I<sub>v</sub>${rt.swapped?' (= I<sub>x</sub>)':''}</div><div class="s-val">${f(rt.Iv)}</div><div class="s-unit">${u4}</div></div>
        <div class="summary-box"><div class="s-lbl">P<sub>uv</sub></div><div class="s-val">${f(rt.Iuv)}</div><div class="s-unit">${u4}</div></div>
      </div>`;
    }
  }
  html += `</div>`; // end point-tool section

  html += `</div>`; // end results-wrap

  rp.innerHTML = html;
  renderKatex(rp);
  drawMohr({Ix:res.Ix,Iy:res.Iy,Ixy:res.Ixy}, "mohrCanvas");
  if(ep) drawMohr({Ix:ep.IxP,Iy:ep.IyP,Ixy:ep.IxyP}, "mohrCanvasP", ep.rot?{rot:ep.rot}:undefined);
  setTimeout(()=>drawCompositeFigure('compositeCanvas'),80);
}
