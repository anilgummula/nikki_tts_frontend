import { useState, useRef, useEffect } from "react";

// const API = "http://localhost:8000";

// ─── Voice groups ─────────────────────────────────────────────────────────────
const GROUP_ORDER = ["Indian", "American", "British", "Other"];

// ─── Waveform bars component ──────────────────────────────────────────────────
function Waveform({ playing }) {
  return (
    <div className="flex items-end gap-[3px] h-8">
      {[...Array(18)].map((_, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-violet-400"
          style={{
            height: playing ? `${Math.random() * 100}%` : "30%",
            animation: playing ? `wave ${0.4 + (i % 5) * 0.12}s ease-in-out infinite alternate` : "none",
            animationDelay: `${i * 0.04}s`,
            minHeight: "4px",
          }}
        />
      ))}
    </div>
  );
}

// ─── Slider control ───────────────────────────────────────────────────────────
function SliderControl({ label, value, onChange, min, max, step, unit, format }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-400 uppercase tracking-wider">{label}</span>
        <span className="text-xs font-mono text-violet-300">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-violet-500 h-1 rounded-full cursor-pointer"
      />
      <div className="flex justify-between text-[10px] text-slate-600">
        <span>{format(min)}</span>
        <span>default</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

// ─── Voice card ───────────────────────────────────────────────────────────────
function VoiceCard({ voice, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-150 ${
        selected
          ? "bg-violet-600 text-white shadow-lg shadow-violet-900/40"
          : "bg-slate-800/60 text-slate-300 hover:bg-slate-700/80"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-base">{voice.flag}</span>
        <div>
          <div className="text-sm font-semibold leading-tight">{voice.name}</div>
          <div className={`text-[11px] ${selected ? "text-violet-200" : "text-slate-500"}`}>{voice.lang}</div>
        </div>
      </div>
    </button>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [voices, setVoices] = useState({});
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [activeGroup, setActiveGroup] = useState("Indian");
  const [text, setText] = useState("");
  const [speed, setSpeed] = useState(0);     // -100 to +100
  const [pitch, setPitch] = useState(0);     // -20 to +20 Hz
  const [volume, setVolume] = useState(0);   // -100 to +100

  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioFilename, setAudioFilename] = useState(null);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const audioRef = useRef(null);
  const MAX_CHARS = 3000;
  const API = import.meta.env.VITE_API_URL;

  // Fetch voices on mount
  useEffect(() => {
    fetch(`${API}/voices`)
      .then((r) => r.json())
      .then((data) => {
        setVoices(data.groups);
        // Default to Neerja
        const neerja = data.voices.find((v) => v.id === "en-IN-NeerjaNeural");
        if (neerja) setSelectedVoice(neerja);
      })
      .catch(() => setError("Could not connect to backend. Is the server running?"));
  }, []);

  const formatPercent = (v) => (v >= 0 ? `+${v}%` : `${v}%`);
  const formatHz      = (v) => (v >= 0 ? `+${v}Hz` : `${v}Hz`);

  const handleGenerate = async () => {
    if (!text.trim()) { setError("Please enter some text first."); return; }
    if (!selectedVoice) { setError("Please select a voice."); return; }
    setError("");
    setLoading(true);
    setAudioUrl(null);

    try {
      const res = await fetch(`${API}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice_id: selectedVoice.id,
          rate:   formatPercent(speed),
          pitch:  formatHz(pitch),
          volume: formatPercent(volume),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Generation failed.");
      }

      const data = await res.json();
      console.log(`${data.audio_url}`);   
      setAudioUrl(`${data.audio_url}`);
      setAudioFilename(data.filename);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSpeed(0); setPitch(0); setVolume(0);
  };

  // Track audio playing state
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onPlay  = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);
    el.addEventListener("play",  onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("play",  onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
    };
  }, [audioUrl]);

  return (
    <div className="min-h-screen bg-[#080C1A] text-white font-sans">
      {/* ── Ambient glow ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-violet-700/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -right-48 w-[500px] h-[500px] bg-indigo-700/15 rounded-full blur-[140px]" />
      </div>

      {/* ── Header ── */}
      <header className="relative z-10 border-b border-slate-800/60 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-900/50">
            <span className="text-sm font-black">N</span>
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight leading-none">N.I.K.K.I</h1>
            <p className="text-[11px] text-slate-500 leading-none mt-0.5">TTS Studio</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
          Edge-TTS Engine
        </div>
      </header>

      {/* ── Main layout ── */}
      <div className="relative z-10 flex flex-col lg:flex-row h-[calc(100vh-65px)]">

        {/* ── Left panel: voice + settings ── */}
        <aside className="w-full lg:w-72 xl:w-80 border-b lg:border-b-0 lg:border-r border-slate-800/60 flex flex-col">

          {/* Voice selector */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <h2 className="text-[11px] uppercase tracking-widest text-slate-500 mb-3">Voice</h2>

              {/* Group tabs */}
              <div className="flex gap-1 flex-wrap mb-3">
                {GROUP_ORDER.map((g) => (
                  <button
                    key={g}
                    onClick={() => setActiveGroup(g)}
                    className={`text-[11px] px-2.5 py-1 rounded-full transition-all ${
                      activeGroup === g
                        ? "bg-violet-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>

              {/* Voice list */}
              <div className="space-y-1.5">
                {(voices[activeGroup] || []).map((v) => (
                  <VoiceCard
                    key={v.id}
                    voice={v}
                    selected={selectedVoice?.id === v.id}
                    onClick={() => setSelectedVoice(v)}
                  />
                ))}
              </div>
            </div>

            {/* Audio settings */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[11px] uppercase tracking-widest text-slate-500">Audio Settings</h2>
                <button
                  onClick={handleReset}
                  className="text-[10px] text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Reset
                </button>
              </div>

              <div className="space-y-4">
                <SliderControl
                  label="Speed"
                  value={speed} onChange={setSpeed}
                  min={-50} max={50} step={5}
                  format={formatPercent}
                />
                <SliderControl
                  label="Pitch"
                  value={pitch} onChange={setPitch}
                  min={-20} max={20} step={1}
                  format={formatHz}
                />
                <SliderControl
                  label="Volume"
                  value={volume} onChange={setVolume}
                  min={-50} max={50} step={5}
                  format={formatPercent}
                />
              </div>
            </div>
          </div>
        </aside>

        {/* ── Right panel: text + output ── */}
        <main className="flex-1 flex flex-col p-4 lg:p-6 gap-4 overflow-y-auto">

          {/* Text input */}
          <div className="flex-1 flex flex-col min-h-[200px]">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[11px] uppercase tracking-widest text-slate-500">Text</h2>
              <span className={`text-[11px] font-mono ${charCount > MAX_CHARS * 0.9 ? "text-red-400" : "text-slate-600"}`}>
                {charCount}/{MAX_CHARS}
              </span>
            </div>
            <textarea
              className="flex-1 w-full bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 text-sm text-slate-200
                         placeholder-slate-600 resize-none focus:outline-none focus:border-violet-500/60
                         focus:ring-1 focus:ring-violet-500/20 transition-all leading-relaxed"
              placeholder="Type or paste your text here…"
              maxLength={MAX_CHARS}
              value={text}
              onChange={(e) => { setText(e.target.value); setCharCount(e.target.value.length); }}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900/30 border border-red-700/40 text-red-300 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={loading || !text.trim()}
            className={`w-full py-3.5 rounded-xl font-semibold text-sm tracking-wide transition-all duration-200
              ${loading || !text.trim()
                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/40 active:scale-[0.99]"
              }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40 20" />
                </svg>
                Generating…
              </span>
            ) : "Generate Speech"}
          </button>

          {/* Audio player */}
          {audioUrl && (
            <div className="bg-slate-900/70 border border-slate-700/40 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
                    <span className="text-violet-400 text-xs">🎙</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{selectedVoice?.name}</div>
                    <div className="text-[11px] text-slate-500">{selectedVoice?.lang}</div>
                  </div>
                </div>
                <Waveform playing={playing} />
              </div>

              <audio
                ref={audioRef}
                src={audioUrl}
                controls
                className="w-full h-10"
                style={{ colorScheme: "dark" }}
              />

              <a
                href={audioUrl}
                download={audioFilename}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg
                           bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M8 12l4 4 4-4M12 4v12" />
                </svg>
                Download MP3
              </a>
            </div>
          )}

          {/* Current settings summary */}
          <div className="flex gap-2 flex-wrap">
            {[
              { label: "Speed",  val: formatPercent(speed)  },
              { label: "Pitch",  val: formatHz(pitch)       },
              { label: "Volume", val: formatPercent(volume) },
            ].map(({ label, val }) => (
              <div key={label} className="flex items-center gap-1.5 bg-slate-800/50 rounded-lg px-3 py-1.5">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
                <span className="text-[11px] font-mono text-violet-300">{val}</span>
              </div>
            ))}
          </div>
        </main>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap');
        body { font-family: 'Inter', sans-serif; }
        h1   { font-family: 'Sora', sans-serif; }
        @keyframes wave {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1); }
        }
        audio::-webkit-media-controls-panel { background: #1e1b3a; }
        ::-webkit-scrollbar       { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 9999px; }
      `}</style>
    </div>
  );
}