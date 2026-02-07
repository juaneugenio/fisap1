// Configuración de Supabase
// REEMPLAZA ESTOS VALORES CON LOS DE TU PROYECTO EN SUPABASE
const SUPABASE_URL = "https://ioxfommgdvbqgyxqqzol.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlveGZvbW1nZHZicWd5eHFxem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzE3MTcsImV4cCI6MjA4NjA0NzcxN30.pzMhGJgVG5cz-jn2l4RFrs7QBFqE8jTvsfBbGd6TsW8";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
