function esc(s){const d=document.createElement('div');d.textContent=s||'';return d.innerHTML;}
function initials(n){const p=n.split(',');return((p[0]||'').trim().charAt(0)+(p[1]||p[0]||'').trim().charAt(0)).toUpperCase();}
function showLoading(){document.getElementById('loading').style.display='flex';}
function hideLoading(){document.getElementById('loading').style.display='none';}
function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));document.getElementById(id).classList.add('active');}
function today(){return new Date().toISOString().slice(0,10);}
function formatFecha(f){if(!f)return'';const[y,m,d]=f.split('-');return`${d}/${m}/${y}`;}
function tipoLabel(t){return t==='A'?'Asamblea':t==='F'?'Faena':'Importante';}
function tipoColor(t){return t==='A'?'pill-blue':t==='F'?'pill-orange':'pill-red';}
function showToast(msg,tipo='ok'){const c=document.getElementById('toasts');if(!c)return;const t=document.createElement('div');t.className=`toast toast-${tipo}`;t.textContent=msg;c.appendChild(t);requestAnimationFrame(()=>t.classList.add('show'));setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),300);},3400);}
