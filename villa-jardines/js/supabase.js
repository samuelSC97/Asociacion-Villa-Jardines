// js/supabase.js — Configuración y cliente Supabase
const SUPA_URL = 'https://qigygiskmpbmpqnggurq.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpZ3lnaXNrbXBibXBxbmdndXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4MDM0NTcsImV4cCI6MjA5NDM3OTQ1N30.FxFOstEWMvmEn9IjoYovfMwT5HxWSmtBqRI4P0nr0ew';

const { createClient } = supabase;
const db = createClient(SUPA_URL, SUPA_KEY);

// Constantes globales
const MULTAS   = { A: 25, F: 50, I: 100 };
const MESES    = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MESES_L  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function initials(nombre) {
  const p = nombre.split(',');
  return ((p[0]||'').trim().charAt(0) + (p[1]||p[0]||'').trim().charAt(0)).toUpperCase();
}

function showLoading() { document.getElementById('loading').style.display = 'flex'; }
function hideLoading() { document.getElementById('loading').style.display = 'none'; }

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function formatFecha(f) {
  if (!f) return '';
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
