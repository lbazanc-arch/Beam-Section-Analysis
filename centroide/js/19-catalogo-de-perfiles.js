// ═══════════════════════════════════════════════════════════
//  CATÁLOGO DE PERFILES LAMINADOS DE ACERO
//  Portado de momentos-de-inercia (js/25-…). La tabla STEEL vive en
//  core/datos/perfiles-acero.js, compartida por los dos temas. Un perfil es
//  UNA sola figura: se dibuja idealizado (sin radios de acuerdo ni conicidad
//  de alas) para colocarlo, pero su área y la posición de su centroide entran
//  en el cálculo con los valores TABULADOS (Beer & Johnston, Apéndice C).
//  Aquí no hay inercias: solo área y centroide.
// ═══════════════════════════════════════════════════════════
const CAT_FAMILIAS = [
  {id:'W_US', tipo:'wshape',  nom:'Perfiles W — aleta ancha',      sist:'EEUU (in)', u:'in'},
  {id:'W_SI', tipo:'wshape',  nom:'Perfiles W — aleta ancha',      sist:'SI (mm)',   u:'mm'},
  {id:'S_US', tipo:'wshape',  nom:'Perfiles S — normales',         sist:'EEUU (in)', u:'in'},
  {id:'S_SI', tipo:'wshape',  nom:'Perfiles S — normales',         sist:'SI (mm)',   u:'mm'},
  {id:'C_US', tipo:'channel', nom:'Canales C',                     sist:'EEUU (in)', u:'in'},
  {id:'C_SI', tipo:'channel', nom:'Canales C',                     sist:'SI (mm)',   u:'mm'},
  {id:'LI_US',tipo:'angleL',  nom:'Ángulos de lados iguales',      sist:'EEUU (in)', u:'in'},
  {id:'LI_SI',tipo:'angleL',  nom:'Ángulos de lados iguales',      sist:'SI (mm)',   u:'mm'},
  {id:'LD_US',tipo:'angleL',  nom:'Ángulos de lados desiguales',   sist:'EEUU (in)', u:'in'},
  {id:'LD_SI',tipo:'angleL',  nom:'Ángulos de lados desiguales',   sist:'SI (mm)',   u:'mm'}
];
let catFam = null;                 // familia abierta
let misPerfiles = [];              // perfiles elegidos, que aparecen en la paleta

function famPorId(id){ return CAT_FAMILIAS.find(f=>f.id===id); }

function abrirCatalogo(){
  catFam=null;
  document.getElementById('cat-listado').style.display='none';
  document.getElementById('cat-familias').style.display='';
  document.getElementById('cat-add').style.display='none';
  document.getElementById('cat-sub').textContent=
    'Elige una familia de perfiles. Fuente: Beer & Johnston, Mecánica de Materiales, Apéndice C.';
  let h='<div style="max-height:380px;overflow:auto;border:1px solid var(--border);border-radius:8px;">'+
        '<table style="width:100%;border-collapse:collapse;font-size:12px;">'+
        '<thead style="position:sticky;top:0;background:var(--card2);"><tr>'+
        '<th style="text-align:left;padding:7px 10px;">Familia</th>'+
        '<th style="text-align:left;padding:7px 10px;">Unidades</th>'+
        '<th style="text-align:right;padding:7px 10px;">Perfiles</th></tr></thead><tbody>';
  CAT_FAMILIAS.forEach(f=>{
    const n=(STEEL[f.id]||[]).length;
    h+=`<tr onclick="abrirFamilia('${f.id}')" style="cursor:pointer;border-top:1px solid var(--border);"
          onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background=''">
        <td style="padding:7px 10px;font-weight:700;color:var(--grn2)">${f.nom}</td>
        <td style="padding:7px 10px;color:var(--muted)">${f.sist}</td>
        <td style="padding:7px 10px;text-align:right;color:var(--muted)">${n}</td></tr>`;
  });
  document.getElementById('cat-familias').innerHTML=h+'</tbody></table></div>';
  try{ cerrarMenusZona1(); }catch(e){}
  document.getElementById('catModal').classList.add('show');
}
function cerrarCatalogo(){ document.getElementById('catModal').classList.remove('show'); }
function volverFamilias(){ abrirCatalogo(); }

function abrirFamilia(id){
  catFam=famPorId(id);
  document.getElementById('cat-familias').style.display='none';
  document.getElementById('cat-listado').style.display='';
  document.getElementById('cat-add').style.display='';
  document.getElementById('cat-sub').textContent=`${catFam.nom} · ${catFam.sist}`;
  document.getElementById('cat-buscar').value='';
  const av=document.getElementById('cat-aviso');
  av.style.color='var(--muted)';
  av.innerHTML='Cada perfil es <b>una sola figura</b>: su área y la posición de su centroide '+
    'se toman de la tabla. El dibujo es idealizado (sin radios de acuerdo'+
    ((id.startsWith('S_')||id.startsWith('C_')) ? ' ni la conicidad de las alas' : '')+
    ') y solo sirve para colocar el perfil en la sección.';
  pintarPerfiles();
}

function colsFamilia(){
  const u=catFam.u, u2=u+'²';
  if(catFam.tipo==='angleL')
    return ['','Designación','b₁ ('+u+')','b₂ ('+u+')','t ('+u+')','A ('+u2+')',
            (catFam.id.startsWith('LI') ? 'x̄ = ȳ' : 'ȳ')+' ('+u+')'];
  const cols=['','Designación','d ('+u+')','b_f ('+u+')','t_f ('+u+')','t_w ('+u+')','A ('+u2+')'];
  if(catFam.tipo==='channel') cols.push('x̄ ('+u+')');
  return cols;
}
function filaFamilia(f){
  if(catFam.tipo==='angleL') return [f[0],f[1],f[2],f[3],f[4],f[8]];
  const v=[f[0],f[1],f[2],f[3],f[4],f[5]];
  if(catFam.tipo==='channel') v.push(f[12]);
  return v;
}
function pintarPerfiles(){
  const q=(document.getElementById('cat-buscar').value||'').trim().toLowerCase();
  const datos=(STEEL[catFam.id]||[]).filter(f=>!q||f[0].toLowerCase().includes(q));
  const cols=colsFamilia();
  document.getElementById('cat-thead').innerHTML='<tr>'+cols.map((c,i)=>
    `<th style="text-align:${i<2?'left':'right'};padding:6px 8px;font-size:10px;color:var(--grn2);">${c}</th>`).join('')+'</tr>';
  let h='';
  datos.forEach(f=>{
    const v=filaFamilia(f);
    h+=`<tr style="border-top:1px solid var(--border);">
      <td style="padding:5px 8px;"><input type="checkbox" class="cat-chk" value="${f[0]}"></td>`;
    v.forEach((x,i)=>{ h+=`<td style="padding:5px 8px;text-align:${i===0?'left':'right'};
        ${i===0?'font-weight:700;color:var(--grn2);':'color:var(--text);'}">${x}</td>`; });
    h+='</tr>';
  });
  document.getElementById('cat-tbody').innerHTML=h||'<tr><td style="padding:14px;color:var(--muted)">Sin coincidencias.</td></tr>';
  document.getElementById('cat-cuenta').textContent=datos.length+' perfiles';
}

function agregarSeleccionados(){
  const marcados=[...document.querySelectorAll('.cat-chk')].filter(c=>c.checked).map(c=>c.value);
  if(!marcados.length){ aviso('Marca al menos un perfil.'); return; }
  let nuevos = 0;
  marcados.forEach(nom=>{
    if(misPerfiles.some(p=>p.fam===catFam.id && p.nom===nom)) return;   // ya estaba
    misPerfiles.push({fam:catFam.id, tipo:catFam.tipo, nom:nom});
    nuevos++;
  });
  pintarMisPerfiles();
  cerrarCatalogo();
  // Se abre la paleta para que se VEA dónde han quedado.
  abrirPaletaEnPerfiles();
  aviso(nuevos
    ? (nuevos===1 ? 'Perfil añadido a la paleta de Figuras.'
                  : nuevos+' perfiles añadidos a la paleta de Figuras.')
    : 'Esos perfiles ya estaban en la paleta.');
}

// Abre la paleta de figuras (si estaba cerrada) para mostrar los perfiles.
function abrirPaletaEnPerfiles(){
  // En el mismo tick no vale: el clic del botón "Añadir" sigue subiendo hasta
  // el listener de document, que cierra cualquier menú abierto fuera de sí.
  setTimeout(()=>{
    const m = document.getElementById('menuFiguras');
    if(m && !m.classList.contains('abierto')) abrirMenuBarra('menuFiguras', null);
  }, 0);
}
function quitarPerfil(i){ misPerfiles.splice(i,1); pintarMisPerfiles(); }

// Icono esquemático de cada familia, para reconocer el perfil de un vistazo.
const PERF_ICONO = {
  wshape : '<path d="M4 4h16M12 4v16M4 20h16"/>',
  channel: '<path d="M17 4H7v16h10M7 12h7"/>',
  angleL : '<path d="M7 4v16h13"/>'
};
// Los perfiles elegidos aparecen en la MISMA paleta de «Figuras», en su
// propio bloque (#palPerfiles), debajo de «Ver más».
function pintarMisPerfiles(){
  const box = document.getElementById('palPerfiles');
  if(!box) return;
  if(!misPerfiles.length){ box.style.display='none'; box.innerHTML=''; return; }
  box.style.display='';
  const filas = misPerfiles.map((p,i)=>{
    const fam  = famPorId(p.fam);
    const icon = PERF_ICONO[p.tipo] || PERF_ICONO.wshape;
    return `<div class="perf-fila">
       <button class="perf-btn" onclick="insertarPerfil(${i})" title="Insertar ${p.nom} en el panel">
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
              stroke-linecap="round" stroke-linejoin="round">${icon}</svg>
         <span>${p.nom}</span>
         <span class="perf-fam">${fam ? fam.u : ''}</span>
       </button>
       <button class="perf-x" onclick="quitarPerfil(${i})" title="Quitar de la paleta">✕</button>
     </div>`;
  }).join('');
  box.innerHTML = '<div class="pal-perf-tit">Perfiles de acero</div>' + filas;
}

// Convierte las medidas del perfil a la unidad activa del aplicativo
function _aUnidad(v, uOrigen){
  return v * (LEN_FAC_I[uOrigen] / LEN_FAC_I[unit]);
}
function insertarPerfil(i){
  const p=misPerfiles[i];
  if(!p){ aviso('No se encontró el perfil.', 'error'); return; }
  const fila=(STEEL[p.fam]||[]).find(f=>f[0]===p.nom);
  if(!fila){ aviso('No se encontró el perfil.', 'error'); return; }
  registrarCambio();      // insertar un perfil es un paso deshacible más
  const fam=famPorId(p.fam), u=fam.u;
  let dims;
  if(p.tipo==='angleL') dims={b1:_aUnidad(fila[1],u), b2:_aUnidad(fila[2],u), t:_aUnidad(fila[3],u)};
  else dims={d:_aUnidad(fila[1],u), bf:_aUnidad(fila[2],u), tf:_aUnidad(fila[3],u), tw:_aUnidad(fila[4],u)};
  // Posición tabulada del centroide dentro del perfil.
  if(p.tipo==='channel') dims.xb = _aUnidad(fila[12], u);              // x̄ desde el respaldo del alma
  if(p.tipo==='angleL'){
    const igual = p.fam.startsWith('LI');
    dims.yb = _aUnidad(fila[8], u);                                    // ȳ desde el vértice
    dims.xb = _aUnidad(igual ? fila[8] : fila[12], u);                 // x̄ desde el vértice
  }
  const fig={
    id: ++figIdCounter,
    type:p.tipo, cx:0, cy:0, rotation:0, sign:1,
    color: COLORS[colorIdx % COLORS.length],
    dims: dims, etiqueta: p.nom,
    name: p.nom,                      // así se muestra su designación real
    anchor:'C', activeAnchor:'C', angleMode:'semi',
    matId: (modoCuerpo==='heterogeneo' && MATS.length) ? MATS[0].id : null,
    thickness: 1,
    perfil: {fam:p.fam, nom:p.nom, tab:true}
  };
  colorIdx++;
  figures.push(fig);
  selectedFigId=fig.id; selectedFigType=null;
  results = null;                      // el cálculo anterior ya no vale
  try{ cerrarMenusZona1(); }catch(e){}
  renderFigList(); selectFigure(fig.id); fitView(); render();
  aviso(p.nom + ' insertado con su centroide en el origen (0, 0).');
}

// ── Propiedades TABULADAS del perfil, convertidas a la unidad activa ──
// Se leen de la tabla en cada consulta, así que al cambiar de unidad no
// queda ningún valor obsoleto. Aquí solo interesan A y el centroide (x̄, ȳ).
function perfilTab(fig){
  if(!fig || !fig.perfil) return null;
  const fam = famPorId(fig.perfil.fam); if(!fam) return null;
  const f = (STEEL[fam.id]||[]).find(r=>r[0]===fig.perfil.nom); if(!f) return null;
  const k  = LEN_FAC_I[fam.u]/LEN_FAC_I[unit];      // factor de longitud
  const k2 = k*k;
  if(fam.tipo==='angleL'){
    const esIgual = fam.id.startsWith('LI');
    return esIgual
      ? {nom:f[0], A:f[4]*k2, xb:f[8]*k, yb:f[8]*k}
      : {nom:f[0], A:f[4]*k2, yb:f[8]*k, xb:f[12]*k};
  }
  const o={nom:f[0], A:f[5]*k2};
  if(fam.tipo==='channel') o.xb=f[12]*k;
  return o;
}
function usaTabla(fig){ return !!(fig && fig.perfil); }
// Área de una figura: la tabulada si es un perfil del catálogo.
function figArea(fig){
  const t=usaTabla(fig)&&perfilTab(fig); if(t) return t.A;
  return FIG_DEFS[fig.type].area(fig.dims);
}

// Los scripts van al final del body: el DOM ya existe y la paleta puede
// pintarse (vacía queda oculta).
try{ pintarMisPerfiles(); }catch(e){}
