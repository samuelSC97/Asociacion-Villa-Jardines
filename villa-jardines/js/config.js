const SUPA_URL   = 'https://qigygiskmpbmpqnggurq.supabase.co';
const SUPA_KEY   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpZ3lnaXNrbXBibXBxbmdndXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4MDM0NTcsImV4cCI6MjA5NDM3OTQ1N30.FxFOstEWMvmEn9IjoYovfMwT5HxWSmtBqRI4P0nr0ew';
const ADMIN_EMAIL = 'sasa.temporal.01@gmail.com';
const { createClient } = supabase;
const db = createClient(SUPA_URL, SUPA_KEY);
const MULTAS  = { A: 25, F: 50, I: 100 };
const MESES   = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MESES_L = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
