import { useEffect, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Input } from "@/components/ui/input"
import { Pencil } from "lucide-react"

const WMO: Record<number, [string, string]> = {
 0: ["☀️", "Céu limpo"], 1: ["🌤️", "Predominantemente limpo"], 2: ["⛅", "Parcialmente nublado"],
 3: ["☁️", "Nublado"], 45: ["🌫️", "Neblina"], 48: ["🌫️", "Neblina com geada"],
 51: ["🌦️", "Chuvisco leve"], 53: ["🌦️", "Chuvisco moderado"], 55: ["🌧️", "Chuvisco intenso"],
 61: ["🌧️", "Chuva leve"], 63: ["🌧️", "Chuva moderada"], 65: ["🌧️", "Chuva forte"],
 80: ["🌦️", "Pancadas de chuva"], 81: ["🌧️", "Pancadas moderadas"], 82: ["⛈️", "Pancadas fortes"],
 95: ["⛈️", "Trovoada"], 96: ["⛈️", "Trovoada com granizo"], 99: ["⛈️", "Trovoada intensa"],
}
const wmo = (c: number): [string, string] => WMO[c] ?? ["🌡️", "Condição desconhecida"]

type TempoData = {
 current: { temperature_2m: number; weather_code: number; wind_speed_10m: number; relative_humidity_2m: number }
 daily: { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; weather_code: number[]; precipitation_probability_max: number[] }
}

type GeoResult = { name: string; admin1?: string; country?: string; latitude: number; longitude: number }

const STORAGE_KEY = "radiosync.desktop.tempo"

function lerTempoSalvo(): { cidade: string; lat: number; lon: number } | null {
 try {
 const s = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")
 if (s?.cidade && typeof s.lat === "number" && typeof s.lon === "number") return s
 } catch { /* ignore */ }
 return null
}

export default function TempoAgora() {
 const salvo = lerTempoSalvo()
 const [cidade, setCidade] = useState(salvo?.cidade ?? null)
 const [lat, setLat] = useState(salvo?.lat ?? null)
 const [lon, setLon] = useState(salvo?.lon ?? null)
 const [editando, setEditando] = useState(false)
 const [busca, setBusca] = useState("")
 const [resultados, setResultados] = useState<GeoResult[]>([])
 const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

 const tempo = useQuery({
 queryKey: ["tempo", lat, lon],
 enabled: lat !== null && lon !== null,
 staleTime: 30 * 60 * 1000,
 refetchInterval: 30 * 60 * 1000,
 queryFn: async () => {
 const r = await fetch(
 `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&timezone=America%2FSao_Paulo&forecast_days=5`
 )
 return r.json() as Promise<TempoData>
 },
 })

 async function buscarCidade(q: string) {
 if (q.length < 2) { setResultados([]); return }
 try {
 const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=pt&format=json`)
 const data = await r.json()
 setResultados(data.results ?? [])
 } catch { setResultados([]) }
 }

 function selecionar(nome: string, la: number, lo: number) {
 setEditando(false)
 setBusca("")
 setResultados([])
 setCidade(nome)
 setLat(la)
 setLon(lo)
 try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ cidade: nome, lat: la, lon: lo })) } catch { /* ignore */ }
 }

 return (
 <div className="rounded-xl border bg-card p-4">
 <div className="flex items-center gap-2 mb-3 flex-wrap">
 <span>⛅</span>
 <span className="text-sm font-semibold">Tempo Agora</span>
 {cidade && <span className="text-xs text-muted-foreground">— {cidade}</span>}
 <button onClick={() => setEditando((v) => !v)} className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
 <Pencil size={12} /> {cidade ? "mudar cidade" : "configurar cidade"}
 </button>
 </div>

 {editando && (
 <div className="mb-4">
 <Input
 value={busca}
 onChange={(e) => {
 setBusca(e.target.value)
 clearTimeout(debounce.current)
 debounce.current = setTimeout(() => buscarCidade(e.target.value), 300)
 }}
 placeholder="Ex: Belo Horizonte, Arcos..."
 />
 {resultados.length > 0 && (
 <div className="mt-2 space-y-1">
 {resultados.map((r, i) => (
 <button
 key={i}
 onClick={() => selecionar(r.name, r.latitude, r.longitude)}
 className="w-full text-left text-sm px-3 py-1.5 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors"
 >
 📍 {[r.name, r.admin1, r.country].filter(Boolean).join(", ")}
 </button>
 ))}
 </div>
 )}
 </div>
 )}

 {tempo.isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
 {tempo.isError && <p className="text-sm text-destructive">Não foi possível carregar o tempo.</p>}
 {!tempo.isLoading && !tempo.isError && !tempo.data && !cidade && (
 <p className="text-sm text-muted-foreground">Clique em &quot;configurar cidade&quot; para ver o tempo local.</p>
 )}

 {tempo.data && (
 <div className="flex items-start gap-6 flex-wrap">
 <div>
 <div className="flex items-center gap-3">
 <div className="text-5xl">{wmo(tempo.data.current.weather_code)[0]}</div>
 <div>
 <div className="text-3xl font-bold">{Math.round(tempo.data.current.temperature_2m)}°C</div>
 <div className="text-xs text-muted-foreground mt-0.5">{wmo(tempo.data.current.weather_code)[1]}</div>
 </div>
 </div>
 <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
 <span>💧 Umidade: <strong className="text-foreground">{tempo.data.current.relative_humidity_2m}%</strong></span>
 <span>💨 Vento: <strong className="text-foreground">{Math.round(tempo.data.current.wind_speed_10m)} km/h</strong></span>
 </div>
 </div>

 {tempo.data.daily && (
 <div>
 <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Próximos Dias</div>
 <div className="flex gap-2">
 {tempo.data.daily.time.map((t, i) => {
 const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
 const dt = new Date(t + "T12:00:00")
 const label = i === 0 ? "Hoje" : i === 1 ? "Amanhã" : dias[dt.getDay()]
 const prec = tempo.data.daily.precipitation_probability_max[i] ?? 0
 return (
 <div key={i} className="text-center bg-muted/30 rounded-lg px-2 py-1.5 min-w-[56px]">
 <div className="text-[10px] text-muted-foreground">{label}</div>
 <div className="text-lg leading-tight">{wmo(tempo.data.daily.weather_code[i])[0]}</div>
 <div className="text-xs"><strong>{Math.round(tempo.data.daily.temperature_2m_max[i])}°</strong> <span className="text-muted-foreground">{Math.round(tempo.data.daily.temperature_2m_min[i])}°</span></div>
 {prec >= 20 ? <div className="text-[10px] text-blue-500">💧{prec}%</div> : <div className="text-[10px] opacity-0">.</div>}
 </div>
 )
 })}
 </div>
 </div>
 )}
 </div>
 )}
 </div>
 )
}