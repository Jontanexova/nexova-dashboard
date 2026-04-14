import { useState, useEffect, useCallback } from "react";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const SUPABASE_URL = "https://xkdtpzxgtjujcopbcrwy.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrZHRwenhndGp1amNvcGJjcnd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MzA1MDksImV4cCI6MjA5MTUwNjUwOX0.ldlwfTheYsdDhasipWZaz7jzd93KOP1pmZ87HCIFcDU";

const CANAL_COLORS = {
  crimen:       { accent: "#e53e3e", glow: "#e53e3e40" },
  finanzas:     { accent: "#38d9a9", glow: "#38d9a940" },
  curiosidades: { accent: "#a78bfa", glow: "#a78bfa40" },
  guerras:      { accent: "#f97316", glow: "#f9731640" },
};

const CANAL_CHART_COLORS = {
  "Archivo Siniestro": "#e53e3e",
  "Dinero Consciente": "#38d9a9",
  "Mente Inquieta":    "#a78bfa",
  "Historias Gráficas": "#f97316",
};

const ESTADO_CONFIG = {
  pendiente:        { label: "Pendiente",        color: "#6b7280", step: 0 },
  generando_script: { label: "Generando script", color: "#f59e0b", step: 1 },
  script_listo:     { label: "Script listo",      color: "#10b981", step: 2 },
  generando_audio:  { label: "Generando audio",  color: "#f59e0b", step: 3 },
  audio_listo:      { label: "Audio listo",       color: "#10b981", step: 4 },
  renderizando:     { label: "Renderizando",      color: "#f59e0b", step: 5 },
  video_listo:      { label: "Video listo",       color: "#10b981", step: 6 },
  publicando:       { label: "Publicando",        color: "#f59e0b", step: 7 },
  publicado:        { label: "Publicado ✓",       color: "#22c55e", step: 8 },
  error:            { label: "Error",             color: "#ef4444", step: -1 },
};

const METRICAS_CONFIG = [
  { key: "vistas",               label: "Vistas",       color: "#38d9a9" },
  { key: "likes",                label: "Likes",        color: "#f59e0b" },
  { key: "suscriptores_ganados", label: "Suscriptores", color: "#a78bfa" },
  { key: "comentarios",          label: "Comentarios",  color: "#e53e3e" },
  { key: "ctr",                  label: "CTR %",        color: "#22c55e" },
  { key: "retencion_promedio_pct", label: "Retención %", color: "#60a5fa" },
];

const FUENTES = [
  { id: "youtube",   label: "YouTube",   activo: true,  icon: "▶" },
  { id: "tiktok",    label: "TikTok",    activo: true,  icon: "♪" },
  { id: "facebook",  label: "Facebook",  activo: false, icon: "f" },
  { id: "instagram", label: "Instagram", activo: false, icon: "◉" },
];

const APIS_CONFIG = [
  { id: "anthropic",   label: "Anthropic",   abbr: "ANT", color: "#e53e3e", tipo: "credito",  consumoPorVideo: 0.01, unidad: "$", renovarUrl: "https://console.anthropic.com" },
  { id: "creatomate",  label: "Creatomate",  abbr: "CRE", color: "#38d9a9", tipo: "renders",  consumoPorVideo: 1,    unidad: "renders", renovarUrl: "https://creatomate.com" },
  { id: "elevenlabs",  label: "ElevenLabs",  abbr: "11L", color: "#f59e0b", tipo: "credito",  consumoPorVideo: 0.04, unidad: "$", renovarUrl: "https://elevenlabs.io", auto: false },
  { id: "falai",       label: "fal.ai",      abbr: "fal", color: "#a78bfa", tipo: "credito",  consumoPorVideo: 0.27, unidad: "$", renovarUrl: "https://fal.ai" },
  { id: "railway",     label: "Railway",     abbr: "RW",  color: "#6b7280", tipo: "credito",  consumoPorVideo: 0,    unidad: "$", renovarUrl: "https://railway.app", fijo: true },
];

async function supabaseQuery(table, params = "") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  return res.json();
}

function PulsingDot({ color }) {
  return (
    <span style={{ position: "relative", display: "inline-block", width: 10, height: 10 }}>
      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color, animation: "ping 1.5s ease-in-out infinite", opacity: 0.6 }} />
      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color }} />
    </span>
  );
}

function PipelineBar({ estado }) {
  const steps = ["pendiente","generando_script","script_listo","generando_audio","audio_listo","renderizando","video_listo","publicando","publicado"];
  const currentStep = ESTADO_CONFIG[estado]?.step ?? 0;
  const isError = estado === "error";
  return (
    <div style={{ display: "flex", gap: 3, marginTop: 8 }}>
      {steps.map((s, i) => (
        <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: isError ? "#ef444430" : i <= currentStep ? ESTADO_CONFIG[s].color : "#1f2937", transition: "background 0.3s" }} />
      ))}
    </div>
  );
}

function VideoCard({ video, canalNicho }) {
  const col = CANAL_COLORS[canalNicho] || CANAL_COLORS.curiosidades;
  const est = ESTADO_CONFIG[video.estado] || ESTADO_CONFIG.pendiente;
  const isActive = ["generando_script","generando_audio","renderizando","publicando"].includes(video.estado);
  return (
    <div style={{ background: "#0a0a0a", border: `1px solid ${col.accent}25`, borderRadius: 10, padding: "14px 16px", marginBottom: 10, boxShadow: isActive ? `0 0 12px ${col.glow}` : "none", transition: "box-shadow 0.3s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#e5e7eb", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{video.titulo || "Sin título"}</div>
          <div style={{ fontSize: 11, color: "#4b5563", marginTop: 3 }}>{video.tema || "—"}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {isActive && <PulsingDot color={est.color} />}
          <span style={{ fontSize: 11, color: est.color, fontWeight: 600, background: `${est.color}15`, padding: "3px 8px", borderRadius: 20, border: `1px solid ${est.color}30` }}>{est.label}</span>
        </div>
      </div>
      <PipelineBar estado={video.estado} />
      {video.youtube_url && (
        <a href={video.youtube_url} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 8, fontSize: 11, color: col.accent, textDecoration: "none" }}>Ver en YouTube →</a>
      )}
    </div>
  );
}

// ===== PIPELINE =====
function PipelineSection({ canales, videos, loading }) {
  const [canalFiltro, setCanalFiltro] = useState("todos");
  const videosF = canalFiltro === "todos" ? videos : videos.filter(v => v.canal_id === canalFiltro);
  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "TOTAL VIDEOS", value: videos.length, color: "#6b7280", sub: "generados" },
          { label: "PUBLICADOS", value: videos.filter(v => v.estado === "publicado").length, color: "#22c55e", sub: `${videos.filter(v => v.estado === "publicado" && v.plataforma !== "tiktok").length} YouTube · ${videos.filter(v => v.estado === "publicado" && v.plataforma === "tiktok").length} TikTok` },
          { label: "EN PROCESO", value: videos.filter(v => !["publicado","error","pendiente"].includes(v.estado)).length, color: "#f59e0b", sub: "ahora mismo" },
        ].map(s => (
          <div key={s.label} style={{ background: "#080808", border: `1px solid ${s.color}20`, borderRadius: 12, padding: "20px 24px" }}>
            <div style={{ fontSize: 10, color: "#4b5563", letterSpacing: "0.12em", marginBottom: 10 }}>{s.label}</div>
            <div style={{ fontSize: 40, fontWeight: 700, color: s.color, fontFamily: "'Space Mono', monospace", lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#374151", marginTop: 6 }}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 10, color: "#4b5563", letterSpacing: "0.1em" }}>FILTRAR POR CANAL:</span>
        <select value={canalFiltro} onChange={e => setCanalFiltro(e.target.value)} style={{ background: "#0f0f0f", border: "1px solid #1f2937", borderRadius: 8, padding: "6px 12px", color: "#e5e7eb", fontSize: 13, fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}>
          <option value="todos">Todos los canales</option>
          {canales.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>
      <div style={{ fontSize: 10, color: "#374151", letterSpacing: "0.1em", marginBottom: 12 }}>VIDEOS RECIENTES</div>
      <div style={{ background: "#080808", borderRadius: 12, border: "1px solid #111", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1.5fr", padding: "10px 20px", borderBottom: "1px solid #111" }}>
          {["TÍTULO","CANAL","ESTADO","FECHA","URL","TEMA"].map(h => (
            <span key={h} style={{ fontSize: 10, color: "#374151", letterSpacing: "0.08em" }}>{h}</span>
          ))}
        </div>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#374151", fontSize: 13 }}>Cargando...</div>
        ) : videosF.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#374151", fontSize: 13 }}>Sin videos aún</div>
        ) : videosF.map((v, i) => {
          const canal = canales.find(c => c.id === v.canal_id);
          const col = CANAL_COLORS[canal?.nicho] || CANAL_COLORS.curiosidades;
          const est = ESTADO_CONFIG[v.estado] || ESTADO_CONFIG.pendiente;
          const fecha = v.publicado_en ? new Date(v.publicado_en).toLocaleDateString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
          return (
            <div key={v.id || i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1.5fr", padding: "12px 20px", borderBottom: "1px solid #0a0a0a", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#e5e7eb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 12 }}>
                {v.titulo || "Sin título"}
              </span>
              <span style={{ fontSize: 12, color: col.accent }}>{canal?.nombre || "—"}</span>
              <span>
                <span style={{ fontSize: 11, color: est.color, background: `${est.color}15`, padding: "3px 8px", borderRadius: 20, border: `1px solid ${est.color}30` }}>{est.label}</span>
              </span>
              <span style={{ fontSize: 11, color: "#6b7280" }}>{fecha}</span>
              <span>
                {v.youtube_video_id ? (
                  <a href={v.youtube_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#e53e3e", textDecoration: "none" }}>▶ {v.youtube_video_id.slice(0,8)}…</a>
                ) : v.tiktok_publish_id ? (
                  <span style={{ fontSize: 11, color: "#f97316" }}>♪ TikTok</span>
                ) : "—"}
              </span>
              <span style={{ fontSize: 11, color: "#4b5563", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.titulo_tema || v.tema || "—"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== APIs & CRÉDITOS =====
function ApiCreditosSection({ videos }) {
  const videosPublicados = videos.filter(v => v.estado === "publicado").length;
  const [saldos, setSaldos] = useState({
    anthropic: 0, creatomate: 0, elevenlabs: 0, falai: 0, railway: 5.00
  });
  const [editando, setEditando] = useState(null);
  const [inputVal, setInputVal] = useState("");

  useEffect(() => {
    supabaseQuery("api_credits", "?select=api_name,balance").then(data => {
      if (Array.isArray(data)) {
        const map = {};
        data.forEach(r => {
          const key = r.api_name === "fal_ai" ? "falai" : r.api_name;
          map[key] = parseFloat(r.balance) || 0;
        });
        setSaldos(s => ({ ...s, ...map }));
      }
    });
  }, []);

  const iniciarEdicion = (id, valor) => { setEditando(id); setInputVal(String(valor)); };
  const guardarEdicion = (id) => {
    const newVal = parseFloat(inputVal) || 0;
    setSaldos(s => ({ ...s, [id]: newVal }));
    const apiName = id === "falai" ? "fal_ai" : id;
    fetch(`${SUPABASE_URL}/rest/v1/api_credits?api_name=eq.${apiName}`, {
      method: "PATCH",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ balance: newVal, updated_at: new Date().toISOString() })
    });
    setEditando(null);
  };

  const videosRestantes = (api) => {
    if (api.consumoPorVideo === 0) return "∞";
    return Math.floor(saldos[api.id] / api.consumoPorVideo).toLocaleString("es-PE");
  };
  const diasAprox = (api) => {
    const vrest = api.consumoPorVideo === 0 ? Infinity : saldos[api.id] / api.consumoPorVideo;
    if (!isFinite(vrest)) return "∞";
    return Math.floor(vrest / 1).toLocaleString("es-PE");
  };
  const porcentaje = (api) => {
    const maxSaldos = { anthropic: 50, creatomate: 10000, elevenlabs: 30, falai: 50, railway: 10 };
    return Math.min(100, (saldos[api.id] / (maxSaldos[api.id] || 1)) * 100);
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ background: "#0a0a0a", border: "1px solid #1f2937", borderRadius: 10, padding: "12px 16px", marginBottom: 24, display: "flex", gap: 8, alignItems: "flex-start" }}>
        <span style={{ fontSize: 16 }}>🔔</span>
        <div>
          <div style={{ fontSize: 13, color: "#f59e0b", fontWeight: 600, marginBottom: 4 }}>Los saldos se cargan desde Supabase y se descuentan automáticamente.</div>
          <div style={{ fontSize: 12, color: "#4b5563" }}>
            Cada video descuenta: fal.ai $0.27 · ElevenLabs ~$0.04 · Anthropic $0.01 · Creatomate 1 render. <strong style={{ color: "#e5e7eb" }}>Click en el saldo para corregir manualmente (se guarda en Supabase).</strong>
          </div>
        </div>
      </div>

      <div style={{ fontSize: 10, color: "#374151", letterSpacing: "0.1em", marginBottom: 16 }}>ESTADO DE CRÉDITOS</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 16 }}>
        {APIS_CONFIG.filter(a => a.id !== "railway").map(api => {
          const pct = porcentaje(api);
          const vrest = videosRestantes(api);
          const dias = diasAprox(api);
          return (
            <div key={api.id} style={{ background: "#080808", border: `1px solid ${api.color}25`, borderRadius: 14, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: `${api.color}20`, border: `1px solid ${api.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: api.color, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>{api.abbr}</div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#e5e7eb" }}>{api.label}</span>
                  {api.auto && <span style={{ fontSize: 9, background: "#22c55e20", color: "#22c55e", border: "1px solid #22c55e30", borderRadius: 4, padding: "1px 5px" }}>AUTO</span>}
                </div>
                <a href={api.renovarUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#4b5563", textDecoration: "none", border: "1px solid #1f2937", borderRadius: 6, padding: "3px 8px" }}>↗ {api.tipo === "credito" ? "Recargar" : "Renovar"}</a>
              </div>
              <div style={{ fontSize: 10, color: "#374151", marginBottom: 4 }}>SALDO ACTUAL · ACT. 16H</div>
              <div
                onClick={() => iniciarEdicion(api.id, saldos[api.id])}
                style={{ fontSize: editando === api.id ? 16 : 28, fontWeight: 700, color: api.color, fontFamily: "'Space Mono', monospace", cursor: "pointer", marginBottom: 8 }}
              >
                {editando === api.id ? (
                  <input
                    autoFocus
                    value={inputVal}
                    onChange={e => setInputVal(e.target.value)}
                    onBlur={() => guardarEdicion(api.id)}
                    onKeyDown={e => e.key === "Enter" && guardarEdicion(api.id)}
                    style={{ background: "#0f0f0f", border: `1px solid ${api.color}`, borderRadius: 6, padding: "4px 8px", color: api.color, fontSize: 16, fontFamily: "'Space Mono', monospace", width: "100%" }}
                  />
                ) : (
                  `${api.unidad === "$" ? "$" : ""}${Number(saldos[api.id]).toLocaleString("es-PE")}${api.unidad !== "$" ? " " + api.unidad : ""}`
                )}
              </div>
              <div style={{ fontSize: 11, color: "#374151", marginBottom: 8 }}>{api.tipo === "credito" ? "Video AI · actualizar manualmente" : api.tipo === "renders" ? `Video render · 3 templates · actualizar manualmente` : `TTS · auto-actualizado`}</div>
              <div style={{ height: 4, background: "#111", borderRadius: 2, marginBottom: 12, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: pct > 50 ? api.color : pct > 20 ? "#f59e0b" : "#ef4444", borderRadius: 2, transition: "width 0.3s" }} />
              </div>
              {[
                { label: "Videos restantes", value: vrest },
                { label: "Días aprox.", value: dias + " días" },
                { label: "Consumo/video", value: api.consumoPorVideo === 0 ? "fijo" : `${api.unidad === "$" ? "$" : ""}${api.consumoPorVideo}${api.unidad !== "$" ? " " + api.unidad : ""}` },
              ].map(row => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: "#374151" }}>{row.label}</span>
                  <span style={{ fontSize: 11, color: "#6b7280", fontFamily: "'Space Mono', monospace" }}>{row.value}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Railway aparte */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        {APIS_CONFIG.filter(a => a.id === "railway").map(api => (
          <div key={api.id} style={{ background: "#080808", border: `1px solid ${api.color}25`, borderRadius: 14, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: `${api.color}20`, border: `1px solid ${api.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: api.color, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>{api.abbr}</div>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#e5e7eb" }}>{api.label}</span>
              </div>
              <a href={api.renovarUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#4b5563", textDecoration: "none", border: "1px solid #1f2937", borderRadius: 6, padding: "3px 8px" }}>↗ Renovar</a>
            </div>
            <div style={{ fontSize: 10, color: "#374151", marginBottom: 4 }}>SALDO ACTUAL · ACT. 16H</div>
            <div onClick={() => iniciarEdicion(api.id, saldos[api.id])} style={{ fontSize: 28, fontWeight: 700, color: api.color, fontFamily: "'Space Mono', monospace", cursor: "pointer", marginBottom: 4 }}>
              {editando === api.id ? (
                <input autoFocus value={inputVal} onChange={e => setInputVal(e.target.value)} onBlur={() => guardarEdicion(api.id)} onKeyDown={e => e.key === "Enter" && guardarEdicion(api.id)} style={{ background: "#0f0f0f", border: `1px solid ${api.color}`, borderRadius: 6, padding: "4px 8px", color: api.color, fontSize: 16, fontFamily: "'Space Mono', monospace", width: "100%" }} />
              ) : `$${Number(saldos[api.id]).toFixed(2)}`}
            </div>
            <div style={{ fontSize: 11, color: "#374151" }}>n8n self-hosted · Plan Hobby $5/mes · 5GB disco</div>
            <div style={{ height: 4, background: "#111", borderRadius: 2, marginTop: 12, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(saldos[api.id] / 10) * 100}%`, background: api.color, borderRadius: 2 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Estimador */}
      <div style={{ fontSize: 10, color: "#374151", letterSpacing: "0.1em", marginBottom: 16 }}>ESTIMADOR MENSUAL (4 CANALES × 1 VID/DÍA = 120 VIDEOS/MES)</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, background: "#080808", borderRadius: 12, border: "1px solid #111", overflow: "hidden" }}>
        <div style={{ padding: "10px 20px", borderBottom: "1px solid #111", borderRight: "1px solid #111" }}>
          <span style={{ fontSize: 10, color: "#374151", letterSpacing: "0.08em" }}>COSTO POR VIDEO</span>
        </div>
        <div style={{ padding: "10px 20px", borderBottom: "1px solid #111", borderRight: "1px solid #111" }}>
          <span style={{ fontSize: 10, color: "#374151", letterSpacing: "0.08em" }}>MENSUAL (120 VIDEOS)</span>
        </div>
        <div style={{ padding: "10px 20px", borderBottom: "1px solid #111" }}>
          <span style={{ fontSize: 10, color: "#374151", letterSpacing: "0.08em" }}>RENOVACIONES</span>
        </div>
        {[
          { nombre: "fal.ai (9 imágenes)", costo: "$0.27", mensual: "~$32.40", renovacion: "fal.ai $50 (~185 videos)", url: "https://fal.ai" },
          { nombre: "ElevenLabs API", costo: "~$0.04", mensual: "~$4.80", renovacion: "ElevenLabs", url: "https://elevenlabs.io" },
          { nombre: "Anthropic Claude", costo: "$0.01", mensual: "~$1.20", renovacion: "Anthropic", url: "https://console.anthropic.com" },
          { nombre: "Creatomate", costo: "1 render", mensual: "120 renders", renovacion: "Creatomate", url: "https://creatomate.com" },
          { nombre: "Railway (fijo)", costo: "—", mensual: "$5", renovacion: "Railway", url: "https://railway.app" },
        ].map((row, i) => (
          <div key={i} style={{ display: "contents" }}>
            <div style={{ padding: "10px 20px", borderBottom: "1px solid #0a0a0a", borderRight: "1px solid #111" }}>
              <span style={{ fontSize: 12, color: "#9ca3af" }}>{row.nombre}</span>
            </div>
            <div style={{ padding: "10px 20px", borderBottom: "1px solid #0a0a0a", borderRight: "1px solid #111" }}>
              <span style={{ fontSize: 12, color: "#38d9a9", fontFamily: "'Space Mono', monospace" }}>{row.costo}</span>
              <span style={{ fontSize: 12, color: "#4b5563", marginLeft: 16 }}>{row.nombre.includes("fijo") ? row.mensual : row.mensual}</span>
            </div>
            <div style={{ padding: "10px 20px", borderBottom: "1px solid #0a0a0a" }}>
              <a href={row.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#4b5563", textDecoration: "none" }}>{row.renovacion} ↗</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== HISTORIAL =====
function HistorialSection({ videos }) {
  const consumoPorVideo = { falai: 0.27, anthropic: 0.01, creatomate: 1 };
  const publicados = videos.filter(v => v.estado === "publicado");
  const totalFalai = publicados.length * consumoPorVideo.falai;
  const totalAnthropic = publicados.length * consumoPorVideo.anthropic;
  const totalCreatomate = publicados.length * consumoPorVideo.creatomate;

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ background: "#0a0a0a", border: "1px solid #1f2937", borderRadius: 10, padding: "12px 16px", marginBottom: 24, display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 16 }}>📊</span>
        <span style={{ fontSize: 12, color: "#6b7280" }}>Registro automático de cada consumo y recarga. Se actualiza cada vez que se publica un video o se ajusta un saldo desde el dashboard.</span>
      </div>

      <div style={{ fontSize: 10, color: "#374151", letterSpacing: "0.1em", marginBottom: 16 }}>RESUMEN DE CONSUMO TOTAL</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { abbr: "fal", label: "fal.ai", color: "#a78bfa", total: `-$${totalFalai.toFixed(2)}` },
          { abbr: "ANT", label: "Anthropic", color: "#e53e3e", total: `-$${totalAnthropic.toFixed(2)}` },
          { abbr: "CRE", label: "Creatomate", color: "#38d9a9", total: `-${totalCreatomate} renders` },
        ].map(s => (
          <div key={s.label} style={{ background: "#080808", border: `1px solid ${s.color}20`, borderRadius: 12, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: `${s.color}20`, border: `1px solid ${s.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: s.color, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>{s.abbr}</div>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#e5e7eb" }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 10, color: "#374151", marginBottom: 4 }}>CONSUMO TOTAL</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#ef4444", fontFamily: "'Space Mono', monospace" }}>{s.total}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 10, color: "#374151", letterSpacing: "0.1em", marginBottom: 12 }}>TRANSACCIONES RECIENTES</div>
      <div style={{ background: "#080808", borderRadius: 12, border: "1px solid #111", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 2fr 1fr", padding: "10px 20px", borderBottom: "1px solid #111" }}>
          {["API","TIPO","MONTO","SALDO TRAS","DESCRIPCIÓN","FECHA"].map(h => (
            <span key={h} style={{ fontSize: 10, color: "#374151", letterSpacing: "0.08em" }}>{h}</span>
          ))}
        </div>
        {publicados.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#374151", fontSize: 13 }}>Sin transacciones aún</div>
        ) : publicados.slice(0, 20).flatMap((v, i) => [
          { api: "fal", label: "fal.ai", color: "#a78bfa", tipo: "consumo", monto: "-$0.27", desc: `Video publicado: ${v.titulo?.slice(0,50)}`, fecha: v.publicado_en },
          { api: "ANT", label: "Anthropic", color: "#e53e3e", tipo: "consumo", monto: "-$0.01", desc: `Video publicado: ${v.titulo?.slice(0,50)}`, fecha: v.publicado_en },
          { api: "CRE", label: "Creatomate", color: "#38d9a9", tipo: "consumo", monto: "-1 renders", desc: `Video publicado: ${v.titulo?.slice(0,50)}`, fecha: v.publicado_en },
        ]).slice(0, 20).map((t, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 2fr 1fr", padding: "10px 20px", borderBottom: "1px solid #0a0a0a", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 20, height: 20, borderRadius: 4, background: `${t.color}20`, border: `1px solid ${t.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: t.color, fontWeight: 700 }}>{t.api}</div>
              <span style={{ fontSize: 12, color: "#9ca3af" }}>{t.label}</span>
            </div>
            <span style={{ fontSize: 11, color: "#f59e0b", background: "#f59e0b15", padding: "2px 8px", borderRadius: 20, width: "fit-content" }}>{t.tipo}</span>
            <span style={{ fontSize: 12, color: "#ef4444", fontFamily: "'Space Mono', monospace" }}>{t.monto}</span>
            <span style={{ fontSize: 12, color: "#6b7280", fontFamily: "'Space Mono', monospace" }}>—</span>
            <span style={{ fontSize: 12, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.desc}</span>
            <span style={{ fontSize: 11, color: "#374151" }}>{t.fecha ? new Date(t.fecha).toLocaleString("es-PE", { hour: "2-digit", minute: "2-digit" }) : "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== BASE DE DATOS =====
function BaseDatosSection({ canales, videos, temas }) {
  const videosPublicados = videos.filter(v => v.estado === "publicado").length;
  const temasTotal = temas.length;
  const temasDisponibles = temas.filter(t => !t.usado).length;
  const [dbSize, setDbSize] = useState(13);
  const [storageUsed, setStorageUsed] = useState(28);

  useEffect(() => {
    // Intentar obtener tamaño real de la BD
    supabaseQuery("rpc/get_db_size_mb").then(data => {
      if (typeof data === "number") setDbSize(data);
    }).catch(() => {});
  }, []);

  // Recursos del Free Tier de Supabase
  const recursos = [
    { label: "Base de Datos", usado: dbSize, limite: 500, unidad: "MB", color: "#38d9a9" },
    { label: "Storage (Audios)", usado: storageUsed, limite: 1000, unidad: "MB", color: "#a78bfa" },
    { label: "Edge Functions", usado: videos.length * 6, limite: 2000000, unidad: "invoc.", color: "#f59e0b", displayUsado: `~${(videos.length * 6).toLocaleString("es-PE")}`, displayLimite: "2M" },
    { label: "Ancho de Banda", usado: 0.5, limite: 5, unidad: "GB", color: "#60a5fa" },
  ];

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {/* MONITOR DE RECURSOS */}
      <div style={{ fontSize: 10, color: "#374151", letterSpacing: "0.1em", marginBottom: 16 }}>MONITOR DE RECURSOS — SUPABASE FREE TIER</div>
      <div style={{ background: "#080808", border: "1px solid #1f2937", borderRadius: 14, padding: 24, marginBottom: 28 }}>
        <div style={{ display: "grid", gap: 20 }}>
          {recursos.map(r => {
            const pct = Math.min(100, (r.usado / r.limite) * 100);
            const barColor = pct > 80 ? "#ef4444" : pct > 60 ? "#f59e0b" : r.color;
            const statusLabel = pct > 80 ? "🚨 CRÍTICO" : pct > 60 ? "⚠️ ALERTA" : "✓ OK";
            const statusColor = pct > 80 ? "#ef4444" : pct > 60 ? "#f59e0b" : "#22c55e";
            return (
              <div key={r.label}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: r.color }} />
                    <span style={{ fontSize: 13, color: "#e5e7eb", fontWeight: 600 }}>{r.label}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 12, color: "#6b7280", fontFamily: "'Space Mono', monospace" }}>
                      {r.displayUsado || r.usado} / {r.displayLimite || r.limite} {r.unidad}
                    </span>
                    <span style={{ fontSize: 10, color: statusColor, background: `${statusColor}15`, border: `1px solid ${statusColor}30`, borderRadius: 4, padding: "2px 6px" }}>{statusLabel}</span>
                  </div>
                </div>
                <div style={{ height: 10, background: "#111", borderRadius: 5, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.max(1, pct)}%`, background: `linear-gradient(90deg, ${barColor}, ${barColor}90)`, borderRadius: 5, transition: "width 0.5s ease" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: "#374151" }}>{pct.toFixed(1)}% usado</span>
                  <span style={{ fontSize: 10, color: "#374151" }}>{(100 - pct).toFixed(1)}% libre</span>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 20, padding: "10px 14px", background: "#0f0f0f", borderRadius: 8, border: "1px solid #111", display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 14 }}>💡</span>
          <span style={{ fontSize: 12, color: "#4b5563" }}>
            Supabase Free Tier incluye: 500 MB BD · 1 GB Storage · 2M Edge Function invocaciones · 5 GB ancho de banda.
            {dbSize > 400 ? " ⚠️ Considerar upgrade a Plan Pro." : " El sistema está holgado."}
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 28 }}>
        {/* Supabase */}
        <div style={{ background: "#080808", border: "1px solid #1f2937", borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 10, color: "#374151", letterSpacing: "0.1em", marginBottom: 16 }}>SUPABASE (FREE TIER)</div>
          {[
            { label: "Proyecto", value: "xkdtpzxgtjujcopbcrwy" },
            { label: "Tamaño BD", value: `${dbSize} MB` },
            { label: "Videos publicados", value: videosPublicados },
            { label: "Temas totales", value: temasTotal },
            { label: "Temas disponibles", value: temasDisponibles },
            { label: "Canales", value: canales.length },
            { label: "Secretos en Vault", value: "23 🔒" },
          ].map(row => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #0f0f0f" }}>
              <span style={{ fontSize: 12, color: "#6b7280" }}>{row.label}</span>
              <span style={{ fontSize: 12, color: "#e5e7eb", fontFamily: "'Space Mono', monospace" }}>{row.value}</span>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 16, flexDirection: "column" }}>
            <a href="https://supabase.com/dashboard/project/xkdtpzxgtjujcopbcrwy" target="_blank" rel="noreferrer" style={{ display: "block", textAlign: "center", background: "#0f0f0f", border: "1px solid #1f2937", borderRadius: 8, padding: "8px 0", fontSize: 12, color: "#6b7280", textDecoration: "none" }}>↗ Abrir Supabase</a>
            <button style={{ background: "#0f0f0f", border: "1px solid #1f2937", borderRadius: 8, padding: "8px 0", fontSize: 12, color: "#6b7280", cursor: "pointer" }}>🔒 Ver Vault</button>
          </div>
        </div>

        {/* Storage */}
        <div style={{ background: "#080808", border: "1px solid #1f2937", borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 10, color: "#374151", letterSpacing: "0.1em", marginBottom: 16 }}>STORAGE (SUPABASE FREE TIER)</div>
          {[
            { label: "Archivos audio", value: <span style={{ fontSize: 18, fontWeight: 700, color: "#e5e7eb", fontFamily: "'Space Mono', monospace" }}>{Math.round(videos.length * 9)} <span style={{ fontSize: 13 }}>archivos</span></span> },
            { label: "Límite Free", value: "1 GB" },
          ].map(row => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #0f0f0f", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#6b7280" }}>{row.label}</span>
              <span style={{ fontSize: 12, color: "#e5e7eb", fontFamily: "'Space Mono', monospace" }}>{row.value}</span>
            </div>
          ))}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 10, color: "#374151", letterSpacing: "0.08em", marginBottom: 8 }}>USO ESTIMADO</div>
            <div style={{ height: 8, background: "#111", borderRadius: 4, overflow: "hidden", marginBottom: 6 }}>
              <div style={{ height: "100%", width: `${(storageUsed / 1000) * 100}%`, background: "#22c55e", borderRadius: 4 }} />
            </div>
            <div style={{ fontSize: 11, color: "#4b5563" }}>~{storageUsed} MB / 1 GB ({((storageUsed / 1000) * 100).toFixed(1)}%)</div>
          </div>
        </div>

        {/* Edge Functions */}
        <div style={{ background: "#080808", border: "1px solid #1f2937", borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 10, color: "#374151", letterSpacing: "0.1em", marginBottom: 16 }}>EDGE FUNCTIONS</div>
          {["upload-to-youtube","upload-to-tiktok","upload-audio","generate-wan-video","dashboard-stats"].map(fn => (
            <div key={fn} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #0f0f0f", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#9ca3af" }}>{fn}</span>
              <span style={{ fontSize: 10, background: "#22c55e20", color: "#22c55e", border: "1px solid #22c55e30", borderRadius: 4, padding: "2px 6px" }}>ACTIVE</span>
            </div>
          ))}
          <div style={{ marginTop: 12, fontSize: 11, color: "#374151" }}>Free: 2M invocaciones/mes</div>
        </div>
      </div>

      {/* Videos por estado */}
      <div style={{ fontSize: 10, color: "#374151", letterSpacing: "0.1em", marginBottom: 16 }}>VIDEOS POR ESTADO</div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {Object.entries(ESTADO_CONFIG).filter(([k]) => k !== "error").map(([key, cfg]) => {
          const count = videos.filter(v => v.estado === key).length;
          if (count === 0) return null;
          return (
            <div key={key} style={{ background: "#080808", border: `1px solid ${cfg.color}25`, borderRadius: 10, padding: "14px 20px", minWidth: 120, textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: cfg.color, fontFamily: "'Space Mono', monospace" }}>{count}</div>
              <div style={{ fontSize: 11, color: "#4b5563", marginTop: 4 }}>{cfg.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== CANALES =====
function CanalesSection({ canales, videos, temas }) {
  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {canales.map(canal => {
          const col = CANAL_COLORS[canal.nicho] || CANAL_COLORS.curiosidades;
          const videosCanal = videos.filter(v => v.canal_id === canal.id);
          const publicados = videosCanal.filter(v => v.estado === "publicado").length;
          const temasDisp = temas.filter(t => t.canal_id === canal.id && !t.usado).length;
          return (
            <div key={canal.id} style={{ background: "#080808", border: `1px solid ${col.accent}25`, borderRadius: 14, padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#e5e7eb", marginBottom: 6 }}>{canal.nombre}</div>
                <span style={{ fontSize: 11, background: `${col.accent}20`, color: col.accent, border: `1px solid ${col.accent}30`, borderRadius: 20, padding: "3px 10px" }}>{canal.nicho}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
                {[
                  { label: "Videos", value: videosCanal.length, color: "#6b7280" },
                  { label: "Publicados", value: publicados, color: "#22c55e" },
                  { label: "Temas libres", value: temasDisp, color: "#f59e0b" },
                ].map(s => (
                  <div key={s.label} style={{ background: "#0f0f0f", borderRadius: 8, padding: "12px 8px", textAlign: "center", border: `1px solid ${s.color}15` }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: s.color, fontFamily: "'Space Mono', monospace" }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: "#4b5563", marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: "#374151" }}>Cron: 13:00 · 1 video/día</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== TEMAS =====
function TemaSection({ canales, temas, loading }) {
  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {canales.map(canal => {
        const col = CANAL_COLORS[canal.nicho] || CANAL_COLORS.curiosidades;
        const ct = temas.filter(t => t.canal_id === canal.id && !t.usado);
        const total = temas.filter(t => t.canal_id === canal.id).length;
        return (
          <div key={canal.id} style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <span style={{ fontSize: 11, color: col.accent, fontWeight: 700, letterSpacing: "0.1em" }}>{canal.nombre.toUpperCase()}</span>
              <span style={{ fontSize: 11, color: "#22c55e" }}>{ct.length} DISPONIBLES</span>
              <span style={{ fontSize: 11, color: "#374151" }}>/ {total}</span>
            </div>
            {loading ? <div style={{ color: "#374151", fontSize: 12 }}>Cargando...</div>
              : ct.length === 0 ? <div style={{ color: "#374151", fontSize: 12, padding: "10px 0" }}>Sin temas disponibles</div>
              : ct.slice(0, 20).map((tema, i) => (
                <div key={tema.id || i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #0a0a0a" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#374151", display: "inline-block", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: "#d1d5db" }}>{tema.titulo_sugerido || tema.tema || "—"}</span>
                  </div>
                  <span style={{ fontSize: 10, color: "#374151", flexShrink: 0 }}>P{tema.prioridad || 0}</span>
                </div>
              ))
            }
            {ct.length > 20 && <div style={{ fontSize: 12, color: "#374151", marginTop: 8 }}>… y {ct.length - 20} más</div>}
          </div>
        );
      })}
    </div>
  );
}

// ===== EVOLUCIÓN =====
function VideoRow({ video, expanded, onToggle }) {
  const colores = { crimen: "#e53e3e", finanzas: "#38d9a9", curiosidades: "#a78bfa", guerras: "#f97316" };
  const color = colores[video.nicho] || "#6b7280";
  const fecha = new Date(video.publicado_en).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
  const chartData = [
    { fecha: fecha, vistas: 0, likes: 0 },
    { fecha: "Hoy", vistas: video.vistas || 0, likes: video.likes || 0 },
  ];
  return (
    <div style={{ marginBottom: 8 }}>
      <div onClick={onToggle} style={{ background: expanded ? "#111" : "#0a0a0a", border: `1px solid ${expanded ? color + "40" : "#1f2937"}`, borderRadius: expanded ? "10px 10px 0 0" : 10, padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, transition: "all 0.2s" }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
        <span style={{ fontSize: 12, color, fontWeight: 600, minWidth: 130, flexShrink: 0, fontFamily: "'Space Mono', monospace" }}>{video.canal}</span>
        <span style={{ fontSize: 13, color: "#e5e7eb", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{video.titulo}</span>
        <div style={{ display: "flex", gap: 16, flexShrink: 0, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#38d9a9", fontFamily: "'Space Mono', monospace" }}>👁 {(video.vistas || 0).toLocaleString("es-PE")}</span>
          <span style={{ fontSize: 12, color: "#f59e0b", fontFamily: "'Space Mono', monospace" }}>♥ {(video.likes || 0).toLocaleString("es-PE")}</span>
          {video.youtube_url && <a href={video.youtube_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 11, color: "#e53e3e", textDecoration: "none" }}>YT ↗</a>}
          <span style={{ fontSize: 12, color: expanded ? "#e5e7eb" : "#4b5563" }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>
      {expanded && (
        <div style={{ background: "#0a0a0a", border: `1px solid ${color}40`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: 16 }}>
          <div style={{ fontSize: 11, color: "#4b5563", marginBottom: 12 }}>Publicado: {fecha} · Evolución de métricas</div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#111" />
              <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: "#4b5563" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#4b5563" }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="vistas" name="Vistas" stroke="#38d9a9" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="likes" name="Likes" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ fontSize: 11, color: "#374151", marginTop: 8, textAlign: "center" }}>Las métricas reales aparecerán cuando se conecte YouTube Analytics API</div>
        </div>
      )}
    </div>
  );
}

function EvolucionSection({ canales, videos }) {
  const [fuente, setFuente] = useState("youtube");
  const [expandedId, setExpandedId] = useState(null);
  const [canalFiltro, setCanalFiltro] = useState("todos");
  const [videosConDatos, setVideosConDatos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabaseQuery("metricas_youtube", "?order=fecha_consulta.asc").then(metricas => {
      const vids = videos.filter(v => v.estado === "publicado").map(v => {
        const canal = canales.find(c => c.id === v.canal_id);
        const metricasVideo = (Array.isArray(metricas) ? metricas : []).filter(m => m.video_id === v.id);
        const ultima = metricasVideo[metricasVideo.length - 1];
        return { ...v, canal: canal?.nombre || "—", nicho: canal?.nicho || "curiosidades", plataforma: v.plataforma || "youtube", vistas: ultima?.vistas || 0, likes: ultima?.likes || 0 };
      });
      setVideosConDatos(vids);
      setLoading(false);
    });
  }, [videos, canales]);

  const coloresCanal = { crimen: "#e53e3e", finanzas: "#38d9a9", curiosidades: "#a78bfa", guerras: "#f97316" };
  const canalesUnicos = [...new Set(videosConDatos.map(v => v.canal))];
  const ytVideos = videosConDatos.filter(v => v.plataforma !== "tiktok");
  const videosFiltrados = canalFiltro === "todos" ? ytVideos : ytVideos.filter(v => v.canal === canalFiltro);

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
        {FUENTES.map(f => (
          <button key={f.id} onClick={() => f.activo && setFuente(f.id)} style={{ background: fuente === f.id ? "#1f2937" : "transparent", border: `1px solid ${fuente === f.id ? "#6b7280" : "#1f2937"}`, borderRadius: 10, padding: "10px 20px", cursor: f.activo ? "pointer" : "not-allowed", color: fuente === f.id ? "#e5e7eb" : f.activo ? "#4b5563" : "#1f2937", fontSize: 13, fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 8, opacity: f.activo ? 1 : 0.4 }}>
            <span>{f.icon}</span>{f.label}
            {!f.activo && <span style={{ fontSize: 10, color: "#374151" }}>Próximamente</span>}
            {f.activo && <span style={{ fontSize: 10, background: "#22c55e20", color: "#22c55e", border: "1px solid #22c55e30", borderRadius: 10, padding: "1px 6px" }}>Activo</span>}
          </button>
        ))}
      </div>

      {fuente === "youtube" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Videos publicados", value: ytVideos.length, color: "#6b7280" },
              { label: "Vistas totales", value: ytVideos.reduce((s, v) => s + (v.vistas || 0), 0).toLocaleString("es-PE"), color: "#38d9a9" },
              { label: "Likes totales", value: ytVideos.reduce((s, v) => s + (v.likes || 0), 0).toLocaleString("es-PE"), color: "#f59e0b" },
            ].map(s => (
              <div key={s.label} style={{ background: "#0f0f0f", border: `1px solid ${s.color}25`, borderRadius: 10, padding: "14px 18px" }}>
                <div style={{ fontSize: 10, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: s.color, fontFamily: "'Space Mono', monospace" }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <button onClick={() => setCanalFiltro("todos")} style={{ background: canalFiltro === "todos" ? "#1f2937" : "transparent", border: `1px solid ${canalFiltro === "todos" ? "#6b7280" : "#1f2937"}`, borderRadius: 20, padding: "5px 14px", cursor: "pointer", color: canalFiltro === "todos" ? "#e5e7eb" : "#4b5563", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>Todos ({videosConDatos.length})</button>
            {canalesUnicos.map(canal => {
              const nicho = videosConDatos.find(v => v.canal === canal)?.nicho;
              const color = coloresCanal[nicho] || "#6b7280";
              return <button key={canal} onClick={() => setCanalFiltro(canal)} style={{ background: canalFiltro === canal ? `${color}20` : "transparent", border: `1px solid ${canalFiltro === canal ? color : "#1f2937"}`, borderRadius: 20, padding: "5px 14px", cursor: "pointer", color: canalFiltro === canal ? color : "#4b5563", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>{canal} ({videosConDatos.filter(v => v.canal === canal).length})</button>;
            })}
          </div>
          {loading ? <div style={{ textAlign: "center", padding: "40px 0", color: "#374151", fontSize: 13 }}>Cargando...</div>
            : videosFiltrados.length === 0 ? <div style={{ textAlign: "center", padding: "40px 0", color: "#374151", fontSize: 13 }}>Sin publicaciones aún</div>
            : videosFiltrados.map(video => <VideoRow key={video.id} video={video} expanded={expandedId === video.id} onToggle={() => setExpandedId(expandedId === video.id ? null : video.id)} />)
          }
        </>
      )}
      {fuente === "tiktok" && (
        <>
          {(() => {
            const tiktokVids = videosConDatos.filter(v => v.plataforma === "tiktok");
            const tiktokFiltrados = canalFiltro === "todos" ? tiktokVids : tiktokVids.filter(v => v.canal === canalFiltro);
            return (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
                  {[
                    { label: "Videos publicados", value: tiktokVids.length, color: "#6b7280" },
                    { label: "Vistas totales", value: tiktokVids.reduce((s, v) => s + (v.vistas || 0), 0).toLocaleString("es-PE"), color: "#38d9a9" },
                    { label: "Likes totales", value: tiktokVids.reduce((s, v) => s + (v.likes || 0), 0).toLocaleString("es-PE"), color: "#f59e0b" },
                  ].map(s => (
                    <div key={s.label} style={{ background: "#0f0f0f", border: `1px solid ${s.color}25`, borderRadius: 10, padding: "14px 18px" }}>
                      <div style={{ fontSize: 10, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{s.label}</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: s.color, fontFamily: "'Space Mono', monospace" }}>{s.value}</div>
                    </div>
                  ))}
                </div>
                {tiktokFiltrados.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "#374151", fontSize: 13 }}>Sin publicaciones TikTok aún</div>
                ) : tiktokFiltrados.map(video => <VideoRow key={video.id} video={video} expanded={expandedId === video.id} onToggle={() => setExpandedId(expandedId === video.id ? null : video.id)} />)}
              </>
            );
          })()}
        </>
      )}
      {fuente !== "youtube" && fuente !== "tiktok" && (
        <div style={{ textAlign: "center", padding: "60px 20px", background: "#080808", borderRadius: 14, border: "1px solid #111" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>{FUENTES.find(f => f.id === fuente)?.icon}</div>
          <div style={{ fontSize: 15, color: "#4b5563", marginBottom: 8 }}>{FUENTES.find(f => f.id === fuente)?.label} — Próximamente</div>
          <div style={{ fontSize: 12, color: "#374151" }}>Integración en desarrollo.</div>
        </div>
      )}
    </div>
  );
}


// ===== PESTAÑA CRECIMIENTO =====
const PLATAFORMAS_CRECIMIENTO = [
  { id: "youtube",   label: "YouTube",   activo: true,  color: "#e53e3e", icon: "▶" },
  { id: "tiktok",    label: "TikTok",    activo: true,  color: "#a78bfa", icon: "♪" },
  { id: "instagram", label: "Instagram", activo: false, color: "#f59e0b", icon: "◉" },
  { id: "facebook",  label: "Facebook",  activo: false, color: "#38d9a9", icon: "f" },
];

function CrecimientoSection({ canales }) {
  const [plataforma, setPlataforma] = useState("youtube");
  const [metrica, setMetrica] = useState("likes");
  const [canalFiltro, setCanalFiltro] = useState("todos");
  const [metricas, setMetricas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabaseQuery("metricas_youtube", "?order=fecha_consulta.asc&limit=500")
      .then(d => { setMetricas(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  const METRICAS_OPCIONES = [
    { key: "likes",               label: "Likes",        color: "#f59e0b" },
    { key: "suscriptores_ganados", label: "Suscriptores", color: "#38d9a9" },
    { key: "vistas",              label: "Vistas",       color: "#a78bfa" },
    { key: "comentarios",         label: "Comentarios",  color: "#e53e3e" },
  ];

  const canalesPorPlataforma = canales.filter(c => c.plataforma === plataforma || (!c.plataforma && plataforma === "youtube"));
  const canalesFiltrados = canalFiltro === "todos" ? canalesPorPlataforma : canalesPorPlataforma.filter(c => c.id === canalFiltro);

  // Construir datos del gráfico — 1 punto por día usando el registro más reciente de cada día
  const buildChartData = (canal) => {
    const cm = metricas.filter(m => m.canal_id === canal.id)
      .sort((a, b) => new Date(a.fecha_consulta).getTime() - new Date(b.fecha_consulta).getTime());
    if (cm.length === 0) {
      const hoy = new Date();
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(hoy); d.setDate(d.getDate() - (6 - i));
        return { fecha: d.toLocaleDateString("es-PE", { day: "2-digit", month: "short" }), valor: 0 };
      });
    }
    // Agrupar por día y tomar el último valor del día
    const porDia = {};
    cm.forEach(m => {
      const fecha = new Date(m.fecha_consulta).toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
      porDia[fecha] = Number(m[metrica]) || 0;
    });
    return Object.entries(porDia).map(([fecha, valor]) => ({ fecha, valor }));
  };

  // Totales — usar SOLO el último registro por canal (el más reciente)
  const getTotales = (canal) => {
    const cm = metricas.filter(m => m.canal_id === canal.id)
      .sort((a, b) => new Date(b.fecha_consulta).getTime() - new Date(a.fecha_consulta).getTime());
    const ultimo = cm[0]; // Solo el más reciente
    if (!ultimo) return { likes: 0, suscriptores: 0, vistas: 0, comentarios: 0, ultFecha: "—" };
    return {
      likes: ultimo.likes || 0,
      suscriptores: ultimo.suscriptores_ganados || 0,
      vistas: ultimo.vistas || 0,
      comentarios: ultimo.comentarios || 0,
      ultFecha: new Date(ultimo.fecha_consulta).toLocaleDateString("es-PE"),
    };
  };

  const mConfig = METRICAS_OPCIONES.find(m => m.key === metrica);

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {/* Selector plataforma */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {PLATAFORMAS_CRECIMIENTO.map(p => (
          <button key={p.id} onClick={() => { if (p.activo) { setPlataforma(p.id); setCanalFiltro("todos"); } }} style={{
            background: plataforma === p.id ? `${p.color}20` : "transparent",
            border: `1px solid ${plataforma === p.id ? p.color : "#1f2937"}`,
            borderRadius: 10, padding: "10px 20px", cursor: p.activo ? "pointer" : "not-allowed",
            color: plataforma === p.id ? p.color : p.activo ? "#4b5563" : "#1f2937",
            fontSize: 13, fontFamily: "'DM Sans', sans-serif",
            display: "flex", alignItems: "center", gap: 8, opacity: p.activo ? 1 : 0.35,
            transition: "all 0.2s",
          }}>
            <span style={{ fontSize: 16 }}>{p.icon}</span>
            <span style={{ fontWeight: plataforma === p.id ? 600 : 400 }}>{p.label}</span>
            {!p.activo && <span style={{ fontSize: 10, color: "#374151", background: "#111", borderRadius: 4, padding: "1px 5px" }}>Próximamente</span>}
            {p.activo && <span style={{ fontSize: 9, background: "#22c55e20", color: "#22c55e", border: "1px solid #22c55e30", borderRadius: 8, padding: "1px 6px" }}>Activo</span>}
          </button>
        ))}
      </div>

      {(plataforma === "youtube" || plataforma === "tiktok") && (
        <>
          {/* Controles */}
          <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
            {/* Selector canal */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => setCanalFiltro("todos")} style={{
                background: canalFiltro === "todos" ? "#1f2937" : "transparent",
                border: `1px solid ${canalFiltro === "todos" ? "#6b7280" : "#1f2937"}`,
                borderRadius: 20, padding: "6px 16px", cursor: "pointer",
                color: canalFiltro === "todos" ? "#e5e7eb" : "#4b5563", fontSize: 12, fontFamily: "'DM Sans', sans-serif",
              }}>Todos los canales</button>
              {canalesPorPlataforma.map(c => {
                const col = CANAL_COLORS[c.nicho]?.accent || "#6b7280";
                return (
                  <button key={c.id} onClick={() => setCanalFiltro(c.id)} style={{
                    background: canalFiltro === c.id ? `${col}20` : "transparent",
                    border: `1px solid ${canalFiltro === c.id ? col : "#1f2937"}`,
                    borderRadius: 20, padding: "6px 16px", cursor: "pointer",
                    color: canalFiltro === c.id ? col : "#4b5563", fontSize: 12, fontFamily: "'DM Sans', sans-serif",
                  }}>{c.nombre}</button>
                );
              })}
            </div>

            {/* Selector métrica */}
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              {METRICAS_OPCIONES.map(m => (
                <button key={m.key} onClick={() => setMetrica(m.key)} style={{
                  background: metrica === m.key ? `${m.color}20` : "transparent",
                  border: `1px solid ${metrica === m.key ? m.color : "#1f2937"}`,
                  borderRadius: 20, padding: "6px 14px", cursor: "pointer",
                  color: metrica === m.key ? m.color : "#4b5563", fontSize: 12, fontFamily: "'DM Sans', sans-serif",
                  transition: "all 0.2s",
                }}>{m.label}</button>
              ))}
            </div>
          </div>

          {/* Gráficos por canal */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#374151", fontSize: 13 }}>Cargando métricas...</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: canalesFiltrados.length === 1 ? "1fr" : "repeat(auto-fit, minmax(400px, 1fr))", gap: 20 }}>
              {canalesFiltrados.map(canal => {
                const col = CANAL_COLORS[canal.nicho]?.accent || "#6b7280";
                const chartData = buildChartData(canal);
                const totales = getTotales(canal);
                const valorActual = totales[metrica === "suscriptores_ganados" ? "suscriptores" : metrica] || 0;

                return (
                  <div key={canal.id} style={{ background: "#080808", border: `1px solid ${col}25`, borderRadius: 16, padding: 20 }}>
                    {/* Header canal */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: col, boxShadow: `0 0 6px ${col}` }} />
                          <span style={{ fontSize: 15, fontWeight: 700, color: col, fontFamily: "'Space Mono', monospace" }}>{canal.nombre}</span>
                        </div>
                        <span style={{ fontSize: 11, color: "#374151" }}>Última actualización: {totales.ultFecha}</span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 28, fontWeight: 700, color: mConfig?.color, fontFamily: "'Space Mono', monospace" }}>
                          {valorActual.toLocaleString("es-PE")}
                        </div>
                        <div style={{ fontSize: 11, color: "#4b5563" }}>{mConfig?.label} acumulados</div>
                      </div>
                    </div>

                    {/* Gráfico de línea */}
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <defs>
                          <linearGradient id={`grad-${canal.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={mConfig?.color} stopOpacity={0.2} />
                            <stop offset="95%" stopColor={mConfig?.color} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#111" />
                        <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: "#4b5563" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "#4b5563" }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ background: "#0f0f0f", border: "1px solid #1f2937", borderRadius: 8, fontSize: 12 }}
                          labelStyle={{ color: "#6b7280", marginBottom: 4 }}
                          itemStyle={{ color: mConfig?.color, fontFamily: "'Space Mono', monospace" }}
                          formatter={(v) => [v.toLocaleString("es-PE"), mConfig?.label]}
                        />
                        <Line
                          type="monotone" dataKey="valor" name={mConfig?.label}
                          stroke={mConfig?.color} strokeWidth={2.5}
                          dot={{ fill: mConfig?.color, r: 3, strokeWidth: 0 }}
                          activeDot={{ r: 5, fill: mConfig?.color, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>

                    {/* Mini stats del canal */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 16 }}>
                      {[
                        { label: "Likes", value: totales.likes, color: "#f59e0b" },
                        { label: "Suscript.", value: totales.suscriptores, color: "#38d9a9" },
                        { label: "Vistas", value: totales.vistas, color: "#a78bfa" },
                        { label: "Coment.", value: totales.comentarios, color: "#e53e3e" },
                      ].map(s => (
                        <div key={s.label} style={{ background: "#0f0f0f", borderRadius: 8, padding: "8px 10px", textAlign: "center", border: `1px solid ${s.color}15` }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: s.color, fontFamily: "'Space Mono', monospace" }}>
                            {s.value >= 1000 ? (s.value/1000).toFixed(1)+"K" : s.value}
                          </div>
                          <div style={{ fontSize: 10, color: "#374151", marginTop: 2 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {metricas.length === 0 && !loading && (
            <div style={{ marginTop: 16, padding: "12px 16px", background: "#080808", borderRadius: 10, border: "1px solid #111", fontSize: 12, color: "#374151" }}>
              💡 Las métricas de crecimiento se registrarán automáticamente cada vez que el pipeline publique un video. Los gráficos mostrarán la evolución en el tiempo.
            </div>
          )}
        </>
      )}

      {plataforma !== "youtube" && plataforma !== "tiktok" && (
        <div style={{ textAlign: "center", padding: "80px 20px", background: "#080808", borderRadius: 14, border: "1px solid #111" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{PLATAFORMAS_CRECIMIENTO.find(p => p.id === plataforma)?.icon}</div>
          <div style={{ fontSize: 16, color: "#4b5563", marginBottom: 8, fontWeight: 600 }}>
            {PLATAFORMAS_CRECIMIENTO.find(p => p.id === plataforma)?.label} — Próximamente
          </div>
          <div style={{ fontSize: 13, color: "#374151", maxWidth: 400, margin: "0 auto" }}>
            La integración con esta plataforma está en desarrollo.
          </div>
        </div>
      )}
    </div>
  );
}
// ===== FIN CRECIMIENTO =====

// ===== MAIN APP =====
export default function Dashboard() {
  const [canales, setCanales] = useState([]);
  const [videos, setVideos]   = useState([]);
  const [temas, setTemas]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [activeTab, setActiveTab]   = useState("pipeline");

  const [syncing, setSyncing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [c, v, t] = await Promise.all([
        supabaseQuery("canales", "?order=nicho"),
        supabaseQuery("videos",  "?order=created_at.desc&limit=1000"),
        supabaseQuery("temas",   "?order=prioridad.desc&limit=10000"),
      ]);
      setCanales(Array.isArray(c) ? c : []);
      setVideos(Array.isArray(v) ? v : []);
      setTemas(Array.isArray(t) ? t : []);
      setLastUpdate(new Date());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const syncYoutube = useCallback(async () => {
    setSyncing(true);
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/sync-youtube-metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      await fetchData();
    } catch (e) { console.error(e); }
    finally { setSyncing(false); }
  }, [fetchData]);

  useEffect(() => {
    fetchData();
    syncYoutube();
    const t1 = setInterval(fetchData, 30000);
    const t2 = setInterval(syncYoutube, 15 * 60 * 1000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [fetchData, syncYoutube]);

  const videosPublicados = videos.filter(v => v.estado === "publicado").length;
  const temasLibres = temas.filter(t => !t.usado).length;

  const TABS = [
    { id: "pipeline",   label: "Pipeline",       badge: videos.length, badgeColor: "#38d9a9" },
    { id: "apis",       label: "APIs & Créditos", badge: "OK", badgeColor: "#22c55e" },
    { id: "historial",  label: "Historial",       badge: videosPublicados, badgeColor: null },
    { id: "basedatos",  label: "Base de Datos",   badge: null },
    { id: "canales",    label: "Canales",          badge: canales.length, badgeColor: null },
    { id: "temas",      label: "Temas",            badge: `${temasLibres} libres`, badgeColor: "#a78bfa" },
    { id: "evolucion",  label: "Evolución",        badge: null },
    { id: "crecimiento", label: "Crecimiento",      badge: null },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#050505;color:#e5e7eb;font-family:'DM Sans',sans-serif}
        @keyframes ping    {0%,100%{transform:scale(1);opacity:.8}50%{transform:scale(2.2);opacity:0}}
        @keyframes fadeIn  {from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse   {0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes shimmer {0%{background-position:-200% center}100%{background-position:200% center}}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:#0a0a0a}
        ::-webkit-scrollbar-thumb{background:#1f2937;border-radius:2px}
      `}</style>

      <div style={{ minHeight: "100vh", background: "#050505" }}>
        {/* Header */}
        <div style={{ borderBottom: "1px solid #111", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#080808", position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 0", marginRight: 24 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: "linear-gradient(135deg, #38d9a9, #a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#050505", fontFamily: "'Space Mono', monospace" }}>N</div>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700, color: "#e5e7eb", letterSpacing: "0.08em" }}>NEXOVA</span>
              <span style={{ color: "#374151", fontSize: 14 }}>/</span>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#4b5563", letterSpacing: "0.06em" }}>AUTOPUBLISH</span>
            </div>

            {/* Tabs en el header */}
            <div style={{ display: "flex", gap: 0, height: "100%" }}>
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  padding: "18px 16px", fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                  color: activeTab === tab.id ? "#e5e7eb" : "#4b5563",
                  borderBottom: activeTab === tab.id ? "2px solid #38d9a9" : "2px solid transparent",
                  transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
                }}>
                  {tab.label}
                  {tab.badge !== null && tab.badge !== undefined && (
                    <span style={{ fontSize: 10, background: tab.badgeColor ? `${tab.badgeColor}20` : "#1f2937", color: tab.badgeColor || "#6b7280", border: `1px solid ${tab.badgeColor ? tab.badgeColor + "30" : "#374151"}`, borderRadius: 20, padding: "1px 6px", fontFamily: "'Space Mono', monospace" }}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e", animation: "ping 2.5s ease-in-out infinite" }} />
              <span style={{ fontSize: 12, color: "#6b7280" }}>4 canales</span>
            </div>
            <span style={{ fontSize: 12, color: "#4b5563" }}>4 videos/día</span>
            {lastUpdate && <span style={{ fontSize: 11, color: "#374151", fontFamily: "'Space Mono', monospace" }}>{lastUpdate.toLocaleTimeString("es-PE")}</span>}
            <button onClick={syncYoutube} disabled={syncing} style={{ background: syncing ? "#1f2937" : "transparent", border: "1px solid #1f2937", borderRadius: 8, padding: "6px 14px", color: syncing ? "#38d9a9" : "#6b7280", cursor: syncing ? "default" : "pointer", fontSize: 12, fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s" }}>{syncing ? "⟳ Sincronizando..." : "↻ Actualizar"}</button>
          </div>
        </div>

        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "28px 24px" }}>
          {activeTab === "pipeline"  && <PipelineSection canales={canales} videos={videos} loading={loading} />}
          {activeTab === "apis"      && <ApiCreditosSection videos={videos} />}
          {activeTab === "historial" && <HistorialSection videos={videos} />}
          {activeTab === "basedatos" && <BaseDatosSection canales={canales} videos={videos} temas={temas} />}
          {activeTab === "canales"   && <CanalesSection canales={canales} videos={videos} temas={temas} />}
          {activeTab === "temas"     && <TemaSection canales={canales} temas={temas} loading={loading} />}
          {activeTab === "evolucion" && <EvolucionSection canales={canales} videos={videos} />}
          {activeTab === "crecimiento" && <CrecimientoSection canales={canales} />}
        </div>

        <div style={{ borderTop: "1px solid #0f0f0f", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#080808" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#374151" }}>Powered by</span>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700, background: "linear-gradient(90deg, #38d9a9, #a78bfa, #38d9a9)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "shimmer 3s linear infinite" }}>NEXOVA</span>
          </div>
          <span style={{ fontSize: 11, color: "#1f2937", fontFamily: "'Space Mono', monospace" }}>autopublish · YouTube · TikTok · Lima, Perú</span>
        </div>
      </div>
    </>
  );
}




// build: 1776146000 — v2 con TikTok, guerras, saldos Supabase
