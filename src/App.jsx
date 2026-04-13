import { useState, useEffect, useCallback } from "react";
import EvolucionSection from './EvolucionSection.jsx';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const SUPABASE_URL = "https://xkdtpzxgtjujcopbcrwy.supabase.co";
const SUPABASE_KEY = "sb_secret_5_MM0gfEwj98aECGpEqDwA_Dd4PR8o2";

const CANAL_COLORS = {
  crimen:       { accent: "#e53e3e", glow: "#e53e3e40" },
  finanzas:     { accent: "#38d9a9", glow: "#38d9a940" },
  curiosidades: { accent: "#a78bfa", glow: "#a78bfa40" },
};

const CANAL_CHART_COLORS = {
  "Archivo Siniestro": "#e53e3e",
  "Dinero Consciente": "#38d9a9",
  "Mente Inquieta":    "#a78bfa",
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

function StatCard({ label, value, accent, sublabel }) {
  return (
    <div style={{ background: "#0f0f0f", border: `1px solid ${accent}30`, borderRadius: 12, padding: "20px 24px", boxShadow: `0 0 20px ${accent}15` }}>
      <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 36, fontWeight: 700, color: accent, lineHeight: 1, fontFamily: "'Space Mono', monospace" }}>{value}</div>
      {sublabel && <div style={{ fontSize: 12, color: "#4b5563", marginTop: 6 }}>{sublabel}</div>}
    </div>
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

function CanalSection({ canal, videos }) {
  const col = CANAL_COLORS[canal.nicho] || CANAL_COLORS.curiosidades;
  const publicados = videos.filter(v => v.estado === "publicado").length;
  const enProceso  = videos.filter(v => !["publicado","error","pendiente"].includes(v.estado)).length;
  const errores    = videos.filter(v => v.estado === "error").length;
  return (
    <div style={{ background: "#080808", border: `1px solid ${col.accent}30`, borderRadius: 16, padding: 20, marginBottom: 24, boxShadow: `0 0 30px ${col.glow}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: col.accent, boxShadow: `0 0 8px ${col.accent}` }} />
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: col.accent, fontFamily: "'Space Mono', monospace" }}>{canal.nombre}</h2>
        <span style={{ fontSize: 11, color: "#4b5563", marginLeft: "auto" }}>{canal.nicho}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
        {[{label:"Publicados",value:publicados,color:"#22c55e"},{label:"En proceso",value:enProceso,color:col.accent},{label:"Errores",value:errores,color:"#ef4444"}].map(s => (
          <div key={s.label} style={{ background: "#0f0f0f", borderRadius: 8, padding: "10px 14px", border: `1px solid ${s.color}20`, textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: "'Space Mono', monospace" }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
          </div>
        ))}
      </div>
      {videos.length === 0
        ? <div style={{ textAlign: "center", padding: "20px 0", color: "#374151", fontSize: 13 }}>Sin videos aún — el pipeline disparará a las 8am y 6pm</div>
        : videos.slice(0, 5).map(v => <VideoCard key={v.id} video={v} canalNicho={canal.nicho} />)
      }
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0f0f0f", border: "1px solid #1f2937", borderRadius: 8, padding: "10px 14px" }}>
      <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 12, color: p.color, fontFamily: "'Space Mono', monospace" }}>
          {p.name}: {Number(p.value).toLocaleString("es-PE")}
        </div>
      ))}
    </div>
  );
}

function MetricasSection({ canales }) {
  const [metricas, setMetricas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metricaActiva, setMetricaActiva] = useState("vistas");

  useEffect(() => {
    supabaseQuery("metricas_youtube", "?order=fecha_consulta.asc&limit=300")
      .then(d => { setMetricas(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  const buildChartData = () => {
    if (metricas.length === 0) {
      const hoy = new Date();
      return Array.from({ length: 14 }, (_, i) => {
        const d = new Date(hoy);
        d.setDate(d.getDate() - (13 - i));
        const fecha = d.toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
        return { fecha, "Archivo Siniestro": 0, "Dinero Consciente": 0, "Mente Inquieta": 0 };
      });
    }
    const porFecha = {};
    metricas.forEach(m => {
      const fecha = new Date(m.fecha_consulta).toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
      const canal = canales.find(c => c.id === m.canal_id);
      const nombre = canal?.nombre || "Otro";
      if (!porFecha[fecha]) porFecha[fecha] = { fecha };
      porFecha[fecha][nombre] = (porFecha[fecha][nombre] || 0) + (Number(m[metricaActiva]) || 0);
    });
    return Object.values(porFecha);
  };

  const totales = canales.map(canal => {
    const col = CANAL_COLORS[canal.nicho] || CANAL_COLORS.curiosidades;
    const cm = metricas.filter(m => m.canal_id === canal.id);
    return {
      nombre: canal.nombre, color: col.accent,
      vistas:       cm.reduce((s, m) => s + (m.vistas || 0), 0),
      likes:        cm.reduce((s, m) => s + (m.likes || 0), 0),
      suscriptores: cm.reduce((s, m) => s + (m.suscriptores_ganados || 0), 0),
      comentarios:  cm.reduce((s, m) => s + (m.comentarios || 0), 0),
      ctr:          cm.length ? (cm.reduce((s, m) => s + (Number(m.ctr) || 0), 0) / cm.length).toFixed(2) : "0.00",
      retencion:    cm.length ? (cm.reduce((s, m) => s + (Number(m.retencion_promedio_pct) || 0), 0) / cm.length).toFixed(1) : "0.0",
    };
  });

  const chartData = buildChartData();
  const mConfig = METRICAS_CONFIG.find(m => m.key === metricaActiva);

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {/* Tarjetas por canal */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
        {totales.map(t => (
          <div key={t.nombre} style={{ background: "#080808", border: `1px solid ${t.color}30`, borderRadius: 14, padding: 20, boxShadow: `0 0 20px ${t.color}15` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: t.color, marginBottom: 16, fontFamily: "'Space Mono', monospace" }}>{t.nombre}</div>
            {[
              { label: "Vistas",       value: Number(t.vistas).toLocaleString("es-PE") },
              { label: "Likes",        value: Number(t.likes).toLocaleString("es-PE") },
              { label: "Suscriptores", value: `+${Number(t.suscriptores).toLocaleString("es-PE")}` },
              { label: "Comentarios",  value: Number(t.comentarios).toLocaleString("es-PE") },
              { label: "CTR prom.",    value: `${t.ctr}%` },
              { label: "Retención",    value: `${t.retencion}%` },
            ].map(item => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #0f0f0f" }}>
                <span style={{ fontSize: 12, color: "#6b7280" }}>{item.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#e5e7eb", fontFamily: "'Space Mono', monospace" }}>{item.value}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Selector de métrica */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {METRICAS_CONFIG.map(m => (
          <button key={m.key} onClick={() => setMetricaActiva(m.key)} style={{
            background: metricaActiva === m.key ? `${m.color}20` : "transparent",
            border: `1px solid ${metricaActiva === m.key ? m.color : "#1f2937"}`,
            borderRadius: 20, padding: "6px 16px", cursor: "pointer",
            color: metricaActiva === m.key ? m.color : "#6b7280",
            fontSize: 12, fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
          }}>{m.label}</button>
        ))}
      </div>

      {/* Gráfico de área */}
      <div style={{ background: "#080808", border: "1px solid #111", borderRadius: 16, padding: "24px 12px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, paddingLeft: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#e5e7eb" }}>{mConfig?.label} por canal — evolución</div>
            <div style={{ fontSize: 11, color: "#4b5563", marginTop: 3 }}>
              {metricas.length === 0 ? "Sin datos aún — aparecerán tras el primer video publicado" : `${metricas.length} registros históricos`}
            </div>
          </div>
          {metricas.length === 0 && (
            <span style={{ fontSize: 11, color: "#374151", background: "#0f0f0f", border: "1px solid #1f2937", padding: "4px 12px", borderRadius: 20 }}>Vista previa</span>
          )}
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <defs>
              {canales.map(c => {
                const color = CANAL_CHART_COLORS[c.nombre] || "#6b7280";
                return (
                  <linearGradient key={c.id} id={`g-${c.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#111" />
            <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: "#4b5563", fontFamily: "Space Mono" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#4b5563", fontFamily: "Space Mono" }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: "#6b7280", paddingTop: 16 }} />
            {canales.map(c => {
              const color = CANAL_CHART_COLORS[c.nombre] || "#6b7280";
              return (
                <Area key={c.id} type="monotone" dataKey={c.nombre}
                  stroke={color} strokeWidth={2}
                  fill={`url(#g-${c.id})`}
                  dot={false} activeDot={{ r: 4, fill: color }}
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginTop: 14, padding: "12px 16px", background: "#080808", borderRadius: 10, border: "1px solid #111", fontSize: 12, color: "#374151" }}>
        💡 Las métricas se actualizan automáticamente desde YouTube Data API. Los datos reales aparecerán tras el primer video publicado.
      </div>
    </div>
  );
}

function TemaSection({ canales }) {
  const [temas, setTemas] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabaseQuery("temas", "?order=prioridad.desc&limit=60")
      .then(d => { setTemas(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);
  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {canales.map(canal => {
          const col = CANAL_COLORS[canal.nicho] || CANAL_COLORS.curiosidades;
          const ct = temas.filter(t => t.canal_id === canal.id);
          return (
            <div key={canal.id} style={{ background: "#080808", border: `1px solid ${col.accent}25`, borderRadius: 14, padding: 18 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: col.accent, marginBottom: 14, fontFamily: "'Space Mono', monospace" }}>{canal.nombre}</h3>
              {loading ? <div style={{ color: "#374151", fontSize: 12 }}>Cargando...</div>
                : ct.length === 0 ? <div style={{ color: "#374151", fontSize: 12 }}>Sin temas cargados</div>
                : ct.map((tema, i) => (
                  <div key={tema.id || i} style={{ padding: "8px 10px", marginBottom: 6, background: "#0f0f0f", borderRadius: 8, border: `1px solid ${tema.usado ? "#1f293740" : col.accent + "20"}`, opacity: tema.usado ? 0.4 : 1 }}>
                    <div style={{ fontSize: 12, color: tema.usado ? "#4b5563" : "#d1d5db" }}>{tema.tema || "—"}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <span style={{ fontSize: 10, color: "#374151" }}>Prioridad: {tema.prioridad || "—"}</span>
                      {tema.usado && <span style={{ fontSize: 10, color: "#22c55e" }}>✓ usado</span>}
                    </div>
                  </div>
                ))
              }
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [canales, setCanales] = useState([]);
  const [videos, setVideos]   = useState([]);
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [activeTab, setActiveTab]   = useState("pipeline");

  const fetchData = useCallback(async () => {
    try {
      const [c, v, l] = await Promise.all([
        supabaseQuery("canales", "?order=nicho"),
        supabaseQuery("videos",  "?order=created_at.desc&limit=50"),
        supabaseQuery("logs",    "?order=created_at.desc&limit=20"),
      ]);
      setCanales(Array.isArray(c) ? c : []);
      setVideos(Array.isArray(v) ? v : []);
      setLogs(Array.isArray(l) ? l : []);
      setLastUpdate(new Date());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); const t = setInterval(fetchData, 30000); return () => clearInterval(t); }, [fetchData]);

  const totalPublicados = videos.filter(v => v.estado === "publicado").length;
  const totalEnProceso  = videos.filter(v => !["publicado","error","pendiente"].includes(v.estado)).length;
  const totalErrores    = videos.filter(v => v.estado === "error").length;

  const TABS = [
    { id: "pipeline", label: "Pipeline" },
    { id: "metricas", label: "Métricas" },
    { id: "logs",     label: `Logs (${logs.length})` },
    { id: "temas",    label: "Temas" },
    { id: "evolucion", label: "Evolución" },
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
        <div style={{ borderBottom: "1px solid #111", padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#080808", position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #38d9a9, #a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#050505", fontFamily: "'Space Mono', monospace" }}>N</div>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 15, fontWeight: 700, color: "#e5e7eb", letterSpacing: "0.1em" }}>NEXOVA</span>
            </div>
            <div style={{ width: 1, height: 20, background: "#1f2937" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e", animation: "ping 2.5s ease-in-out infinite" }} />
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#6b7280", letterSpacing: "0.06em" }}>AUTOPUBLISH</span>
            </div>
            <span style={{ fontSize: 11, color: "#374151" }}>3 canales · 6 videos/día</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {lastUpdate && <span style={{ fontSize: 11, color: "#374151", fontFamily: "'Space Mono', monospace" }}>{lastUpdate.toLocaleTimeString("es-PE")}</span>}
            <button onClick={fetchData} style={{ background: "transparent", border: "1px solid #1f2937", borderRadius: 8, padding: "6px 14px", color: "#6b7280", cursor: "pointer", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>↻ Actualizar</button>
          </div>
        </div>

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 36, animation: "fadeIn 0.4s ease" }}>
            <StatCard label="Total videos" value={videos.length}   accent="#6b7280" sublabel="generados" />
            <StatCard label="Publicados"   value={totalPublicados}  accent="#22c55e" sublabel="en YouTube" />
            <StatCard label="En proceso"   value={totalEnProceso}   accent="#f59e0b" sublabel="ahora mismo" />
            <StatCard label="Errores"      value={totalErrores}     accent="#ef4444" sublabel="requieren atención" />
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 2, marginBottom: 28, borderBottom: "1px solid #111" }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                background: "transparent", border: "none", cursor: "pointer",
                padding: "10px 22px", fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                color: activeTab === tab.id ? "#e5e7eb" : "#4b5563",
                borderBottom: activeTab === tab.id ? "2px solid #38d9a9" : "2px solid transparent",
                marginBottom: -1, transition: "all 0.2s",
              }}>{tab.label}</button>
            ))}
          </div>

          {activeTab === "pipeline" && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              {loading
                ? <div style={{ textAlign: "center", padding: "60px 0", color: "#374151", fontSize: 13, animation: "pulse 1.5s ease infinite" }}>Cargando datos...</div>
                : canales.map(canal => <CanalSection key={canal.id} canal={canal} videos={videos.filter(v => v.canal_id === canal.id)} />)
              }
            </div>
          )}

          {activeTab === "metricas" && <MetricasSection canales={canales} />}

          {activeTab === "logs" && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              {logs.length === 0
                ? <div style={{ textAlign: "center", padding: "60px 0", color: "#374151", fontSize: 13 }}>Sin logs todavía — aparecerán cuando el pipeline ejecute</div>
                : (
                  <div style={{ background: "#080808", borderRadius: 12, border: "1px solid #111", overflow: "hidden" }}>
                    {logs.map((log, i) => (
                      <div key={log.id || i} style={{ padding: "12px 20px", borderBottom: "1px solid #0f0f0f", display: "flex", gap: 16, alignItems: "flex-start" }}>
                        <span style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: log.nivel === "error" ? "#ef4444" : log.nivel === "warning" ? "#f59e0b" : "#22c55e", background: log.nivel === "error" ? "#ef444415" : log.nivel === "warning" ? "#f59e0b15" : "#22c55e15", padding: "2px 8px", borderRadius: 4, flexShrink: 0 }}>
                          {(log.nivel || "info").toUpperCase()}
                        </span>
                        <span style={{ fontSize: 13, color: "#9ca3af", flex: 1 }}>{log.mensaje || "—"}</span>
                        <span style={{ fontSize: 11, color: "#374151", flexShrink: 0, fontFamily: "'Space Mono', monospace" }}>
                          {log.created_at ? new Date(log.created_at).toLocaleTimeString("es-PE") : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
          )}

          {activeTab === "temas" && <TemaSection canales={canales} />}

          {activeTab === "evolucion" && <EvolucionSection canales={canales} />}

        </div>

        {/* Footer */}
        <div style={{ borderTop: "1px solid #0f0f0f", padding: "18px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#080808" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#374151" }}>Powered by</span>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700, background: "linear-gradient(90deg, #38d9a9, #a78bfa, #38d9a9)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "shimmer 3s linear infinite" }}>
              NEXOVA
            </span>
          </div>
          <span style={{ fontSize: 11, color: "#1f2937", fontFamily: "'Space Mono', monospace" }}>youtube-autopublish · Lima, Perú</span>
        </div>

      </div>
    </>
  );
}
