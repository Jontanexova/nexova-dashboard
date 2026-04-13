import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const SUPABASE_URL = "https://xkdtpzxgtjujcopbcrwy.supabase.co";
const SUPABASE_KEY = "sb_secret_5_MM0gfEwj98aECGpEqDwA_Dd4PR8o2";

const CANAL_COLORS = {
  crimen:       "#e53e3e",
  finanzas:     "#38d9a9",
  curiosidades: "#a78bfa",
};

const FUENTES = [
  { id: "youtube",   label: "YouTube",   activo: true,  icon: "▶" },
  { id: "tiktok",    label: "TikTok",    activo: false, icon: "♪" },
  { id: "facebook",  label: "Facebook",  activo: false, icon: "f" },
  { id: "instagram", label: "Instagram", activo: false, icon: "◉" },
];

async function supabaseQuery(table, params = "") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  return res.json();
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

function VideoRow({ video, expanded, onToggle }) {
  const color = CANAL_COLORS[video.nicho] || "#6b7280";
  const fecha = new Date(video.publicado_en).toLocaleDateString("es-PE", {
    day: "2-digit", month: "short", year: "numeric"
  });

  // Datos de evolución simulados hasta que haya métricas reales
  const chartData = video.metricas?.length > 0
    ? video.metricas.map(m => ({
        fecha: new Date(m.fecha_consulta).toLocaleDateString("es-PE", { day: "2-digit", month: "short" }),
        vistas: m.vistas || 0,
        likes: m.likes || 0,
      }))
    : [
        { fecha: fecha, vistas: 0, likes: 0 },
        { fecha: "Hoy", vistas: video.vistas || 0, likes: video.likes || 0 },
      ];

  return (
    <div style={{ marginBottom: 8 }}>
      {/* Fila principal */}
      <div
        onClick={onToggle}
        style={{
          background: expanded ? "#111" : "#0a0a0a",
          border: `1px solid ${expanded ? color + "40" : "#1f2937"}`,
          borderRadius: expanded ? "10px 10px 0 0" : 10,
          padding: "12px 16px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 12,
          transition: "all 0.2s",
        }}
      >
        {/* Indicador canal */}
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />

        {/* Canal */}
        <span style={{ fontSize: 12, color, fontWeight: 600, minWidth: 130, flexShrink: 0, fontFamily: "'Space Mono', monospace" }}>
          {video.canal}
        </span>

        {/* Título */}
        <span style={{ fontSize: 13, color: "#e5e7eb", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {video.titulo}
        </span>

        {/* Métricas */}
        <div style={{ display: "flex", gap: 16, flexShrink: 0, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#38d9a9", fontFamily: "'Space Mono', monospace" }}>
            👁 {(video.vistas || 0).toLocaleString("es-PE")}
          </span>
          <span style={{ fontSize: 12, color: "#f59e0b", fontFamily: "'Space Mono', monospace" }}>
            ♥ {(video.likes || 0).toLocaleString("es-PE")}
          </span>
          <a
            href={video.youtube_url}
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ fontSize: 11, color: "#e53e3e", textDecoration: "none" }}
          >
            YT ↗
          </a>
          <span style={{ fontSize: 12, color: expanded ? "#e5e7eb" : "#4b5563" }}>
            {expanded ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {/* Panel expandido con gráfico */}
      {expanded && (
        <div style={{
          background: "#0a0a0a",
          border: `1px solid ${color}40`,
          borderTop: "none",
          borderRadius: "0 0 10px 10px",
          padding: "16px",
        }}>
          <div style={{ fontSize: 11, color: "#4b5563", marginBottom: 12 }}>
            Publicado: {fecha} · Evolución de métricas
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#111" />
              <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: "#4b5563" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#4b5563" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="vistas" name="Vistas" stroke="#38d9a9" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="likes" name="Likes" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
          {video.vistas === null && (
            <div style={{ fontSize: 11, color: "#374151", marginTop: 8, textAlign: "center" }}>
              Las métricas reales aparecerán cuando se conecte la YouTube Analytics API
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FuenteSection({ fuente, videos, canales }) {
  const [expandedId, setExpandedId] = useState(null);
  const [canalFiltro, setCanalFiltro] = useState("todos");

  const canalesUnicos = [...new Set(videos.map(v => v.canal))];
  const videosFiltrados = canalFiltro === "todos" ? videos : videos.filter(v => v.canal === canalFiltro);

  return (
    <div>
      {/* Filtro por canal */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button
          onClick={() => setCanalFiltro("todos")}
          style={{
            background: canalFiltro === "todos" ? "#1f2937" : "transparent",
            border: `1px solid ${canalFiltro === "todos" ? "#6b7280" : "#1f2937"}`,
            borderRadius: 20, padding: "5px 14px", cursor: "pointer",
            color: canalFiltro === "todos" ? "#e5e7eb" : "#4b5563",
            fontSize: 12, fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Todos ({videos.length})
        </button>
        {canalesUnicos.map(canal => {
          const nicho = videos.find(v => v.canal === canal)?.nicho;
          const color = CANAL_COLORS[nicho] || "#6b7280";
          const count = videos.filter(v => v.canal === canal).length;
          return (
            <button
              key={canal}
              onClick={() => setCanalFiltro(canal)}
              style={{
                background: canalFiltro === canal ? `${color}20` : "transparent",
                border: `1px solid ${canalFiltro === canal ? color : "#1f2937"}`,
                borderRadius: 20, padding: "5px 14px", cursor: "pointer",
                color: canalFiltro === canal ? color : "#4b5563",
                fontSize: 12, fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {canal} ({count})
            </button>
          );
        })}
      </div>

      {/* Lista de videos */}
      {videosFiltrados.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#374151", fontSize: 13 }}>
          Sin publicaciones aún
        </div>
      ) : (
        videosFiltrados.map(video => (
          <VideoRow
            key={video.id}
            video={video}
            expanded={expandedId === video.id}
            onToggle={() => setExpandedId(expandedId === video.id ? null : video.id)}
          />
        ))
      )}
    </div>
  );
}

export default function EvolucionSection({ canales }) {
  const [fuente, setFuente] = useState("youtube");
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabaseQuery("videos", "?estado=eq.publicado&order=publicado_en.desc&limit=50"),
      supabaseQuery("canales", "?order=nicho"),
      supabaseQuery("metricas_youtube", "?order=fecha_consulta.asc"),
    ]).then(([vids, cans, metricas]) => {
      const videosConDatos = (Array.isArray(vids) ? vids : []).map(v => {
        const canal = (Array.isArray(cans) ? cans : []).find(c => c.id === v.canal_id);
        const metricasVideo = (Array.isArray(metricas) ? metricas : []).filter(m => m.video_id === v.id);
        const ultimaMetrica = metricasVideo[metricasVideo.length - 1];
        return {
          ...v,
          canal: canal?.nombre || "—",
          nicho: canal?.nicho || "curiosidades",
          vistas: ultimaMetrica?.vistas || null,
          likes: ultimaMetrica?.likes || null,
          metricas: metricasVideo,
        };
      });
      setVideos(videosConDatos);
      setLoading(false);
    });
  }, []);

  const totalVistas = videos.reduce((s, v) => s + (v.vistas || 0), 0);
  const totalLikes = videos.reduce((s, v) => s + (v.likes || 0), 0);

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>

      {/* Selector de fuente */}
      <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
        {FUENTES.map(f => (
          <button
            key={f.id}
            onClick={() => f.activo && setFuente(f.id)}
            style={{
              background: fuente === f.id ? "#1f2937" : "transparent",
              border: `1px solid ${fuente === f.id ? "#6b7280" : "#1f2937"}`,
              borderRadius: 10, padding: "10px 20px", cursor: f.activo ? "pointer" : "not-allowed",
              color: fuente === f.id ? "#e5e7eb" : f.activo ? "#4b5563" : "#1f2937",
              fontSize: 13, fontFamily: "'DM Sans', sans-serif",
              display: "flex", alignItems: "center", gap: 8, opacity: f.activo ? 1 : 0.4,
              transition: "all 0.2s",
            }}
          >
            <span style={{ fontSize: 14 }}>{f.icon}</span>
            {f.label}
            {!f.activo && <span style={{ fontSize: 10, color: "#374151" }}>Próximamente</span>}
            {f.activo && (
              <span style={{
                fontSize: 10, background: "#22c55e20", color: "#22c55e",
                border: "1px solid #22c55e30", borderRadius: 10, padding: "1px 6px"
              }}>Activo</span>
            )}
          </button>
        ))}
      </div>

      {/* Stats globales de la fuente */}
      {fuente === "youtube" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Videos publicados", value: videos.length, color: "#6b7280" },
            { label: "Vistas totales",     value: totalVistas.toLocaleString("es-PE"), color: "#38d9a9" },
            { label: "Likes totales",      value: totalLikes.toLocaleString("es-PE"),  color: "#f59e0b" },
          ].map(s => (
            <div key={s.label} style={{
              background: "#0f0f0f", border: `1px solid ${s.color}25`,
              borderRadius: 10, padding: "14px 18px",
            }}>
              <div style={{ fontSize: 10, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: s.color, fontFamily: "'Space Mono', monospace" }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contenido de la fuente seleccionada */}
      {fuente === "youtube" && (
        loading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#374151", fontSize: 13 }}>
            Cargando publicaciones...
          </div>
        ) : (
          <FuenteSection fuente={fuente} videos={videos} canales={canales} />
        )
      )}

      {fuente !== "youtube" && (
        <div style={{
          textAlign: "center", padding: "60px 20px",
          background: "#080808", borderRadius: 14, border: "1px solid #111",
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>
            {FUENTES.find(f => f.id === fuente)?.icon}
          </div>
          <div style={{ fontSize: 15, color: "#4b5563", marginBottom: 8 }}>
            {FUENTES.find(f => f.id === fuente)?.label} — Próximamente
          </div>
          <div style={{ fontSize: 12, color: "#374151" }}>
            Integración en desarrollo. El pipeline se expandirá a esta plataforma pronto.
          </div>
        </div>
      )}
    </div>
  );
}
