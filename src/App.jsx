import { useState, useRef, useEffect, useCallback } from "react";
import { supabase, sbEnabled, getSession, signIn, signUp, signOut, onAuthChange } from "./supabaseClient";

// ===== DESIGN TOKENS (テック × シアン × ダーク) =====
// bg:      #0d0f12 / #141720 / #1a1d26
// accent:  #00b4d8 (cyan), #48cae4 (light), #002a36 (bg)
// green:   #10b981 / #34d399 / #022c22
// amber:   #f59e0b / #fbbf24 / #2d1a00
// red:     #ef4444 / #f87171 / #2d0a0a
// font:    Noto Sans JP + Inter
// icons:   Tabler outline

// ===== 共有設定（taskboard & planner 共通） =====
const SHARED_SETTINGS_KEY = "shared-settings";

const THEMES = [
  { id:"purple-dark", name:"パープル",     bg:"#1c1c2e", bg2:"#25253a", ac:"#7c6fcd" },
  { id:"cyan-dark",   name:"シアン",       bg:"#141720", bg2:"#1a1f2e", ac:"#00b4d8" },
  { id:"forest-dark", name:"フォレスト",   bg:"#141f18", bg2:"#1c2e22", ac:"#2DC864" },
  { id:"amber-dark",  name:"アンバー",     bg:"#1e1a10", bg2:"#2a2415", ac:"#E6A028" },
  { id:"light",       name:"ライト",       bg:"#f5f4f2", bg2:"#ffffff", ac:"#5b52c8" },
  { id:"light-blue",  name:"ライトブルー", bg:"#f0f5fa", bg2:"#ffffff", ac:"#1a6ccc" },
];

const FEATURE_DEFS = [
  { key:"showPlanner",   label:"Day Planner ページ",  icon:"calendar-event", default:true },
  { key:"showTimer",     label:"タイマー ページ",      icon:"clock",          default:true },
  { key:"showLog",       label:"実績ログ ページ",      icon:"notebook",       default:true },
  { key:"showDashboard", label:"ダッシュボード",        icon:"chart-bar",      default:true },
  { key:"showSticky",    label:"付箋パネル",            icon:"note",           default:true },
  { key:"showBackupBtn", label:"バックアップボタン",    icon:"database-export",default:true },
];

function loadSharedSettings() {
  try {
    const s = localStorage.getItem(SHARED_SETTINGS_KEY);
    return s ? JSON.parse(s) : {};
  } catch { return {}; }
}

function saveSharedSettings(obj) {
  try { localStorage.setItem(SHARED_SETTINGS_KEY, JSON.stringify(obj)); } catch {}
}

function applyThemeToDocument(themeId) {
  document.documentElement.setAttribute("data-theme", themeId || "cyan-dark");
}

// ===== 共有設定モーダル =====
function SharedSettingsModal({ onClose }) {
  const [settings, setSettings] = useState(() => loadSharedSettings());
  const themeId = settings.theme || "cyan-dark";

  function setTheme(id) {
    const next = { ...settings, theme: id };
    setSettings(next);
    applyThemeToDocument(id);
  }

  function toggleFeature(key) {
    const next = { ...settings, [key]: settings[key] === false ? true : false };
    setSettings(next);
  }

  function handleSave() {
    saveSharedSettings(settings);
    onClose();
  }

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.55)",
      zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem"
    }}>
      <div style={{
        background:"#1a1d26", border:"0.5px solid rgba(0,180,216,0.25)",
        borderRadius:12, width:460, maxWidth:"96vw", maxHeight:"90vh",
        overflow:"auto", padding:"1.5rem"
      }}>
        {/* ヘッダー */}
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1.25rem"}}>
          <span style={{fontSize:15, fontWeight:500, color:"#e2f0ff", display:"flex", alignItems:"center", gap:8}}>
            <Icon name="settings" size={16} style={{color:"#00b4d8"}} />
            アプリ設定
          </span>
          <button onClick={onClose}
            style={{background:"none", border:"none", color:"#94a3b8", cursor:"pointer", fontSize:18, lineHeight:1}}>×</button>
        </div>

        {/* テーマ */}
        <div style={{fontSize:12, fontWeight:500, color:"#8aa4c0", marginBottom:8, display:"flex", alignItems:"center", gap:6}}>
          <Icon name="palette" size={13} /> カラーテーマ
        </div>
        <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6, marginBottom:"1.25rem"}}>
          {THEMES.map(t => (
            <div key={t.id} onClick={() => setTheme(t.id)}
              style={{
                background:t.bg, border:`2px solid ${t.id===themeId ? t.ac : "transparent"}`,
                borderRadius:10, padding:"8px 10px", cursor:"pointer",
                display:"flex", alignItems:"center", gap:8,
                transition:"border-color .15s",
              }}>
              <div style={{display:"flex", gap:3}}>
                <div style={{width:10, height:10, borderRadius:"50%", background:t.bg2}} />
                <div style={{width:10, height:10, borderRadius:"50%", background:t.ac}} />
                <div style={{width:10, height:10, borderRadius:"50%", background:t.bg}} />
              </div>
              <span style={{fontSize:11, color:t.ac, fontWeight:500}}>{t.name}</span>
            </div>
          ))}
        </div>

        {/* 機能表示 */}
        <div style={{fontSize:12, fontWeight:500, color:"#8aa4c0", marginBottom:8, display:"flex", alignItems:"center", gap:6}}>
          <Icon name="layout-list" size={13} /> 機能の表示 / 非表示
          <span style={{fontSize:10, color:"#445566", marginLeft:4}}>taskboard・planner 共通</span>
        </div>
        <div style={{display:"flex", flexDirection:"column", gap:4, marginBottom:"1.25rem"}}>
          {FEATURE_DEFS.map(f => {
            const enabled = settings[f.key] !== false;
            return (
              <div key={f.key} style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"7px 10px", background:"#141720", borderRadius:8, fontSize:12
              }}>
                <span style={{color:"#8aa4c0", display:"flex", alignItems:"center", gap:6}}>
                  <Icon name={f.icon} size={13} />
                  {f.label}
                </span>
                <button onClick={() => toggleFeature(f.key)}
                  style={{
                    width:34, height:18, borderRadius:9, border:"none", cursor:"pointer",
                    background: enabled ? "#00b4d8" : "#445566",
                    position:"relative", transition:"background .2s", flexShrink:0
                  }}>
                  <span style={{
                    position:"absolute", top:2, width:14, height:14, background:"#fff",
                    borderRadius:"50%", transition:"left .2s",
                    left: enabled ? 18 : 2,
                  }} />
                </button>
              </div>
            );
          })}
        </div>

        {/* 注記 */}
        <p style={{fontSize:11, color:"#445566", marginBottom:"1rem", lineHeight:1.6}}>
          設定はブラウザに保存されます。taskboard・Day Planner で共有されます。
        </p>

        {/* アクション */}
        <div style={{display:"flex", justifyContent:"flex-end", gap:8}}>
          <button onClick={onClose}
            style={{padding:"7px 16px", borderRadius:8, background:"none", border:"0.5px solid #2a3040", color:"#8aa4c0", cursor:"pointer", fontSize:13}}>
            キャンセル
          </button>
          <button onClick={handleSave}
            style={{padding:"7px 16px", borderRadius:8, background:"#00b4d8", border:"none", color:"#fff", cursor:"pointer", fontSize:13, fontWeight:500}}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

const STATUSES = ["Todo", "In Progress", "Waiting", "Done"];
const PRIORITIES = ["High", "Medium", "Low"];
const STATUS_LABEL = {"Todo":"未着手", "In Progress":"進行中", "Waiting":"返事待ち", "Done":"完了"};
const PRI_LABEL = {"High":"高", "Medium":"中", "Low":"低"};

const PRI = {
  High:   { ring: "border-l-red-400",    badge: "bg-red-950/60 text-red-300 border border-red-500/30",    dot: "bg-red-400"    },
  Medium: { ring: "border-l-amber-400",  badge: "bg-amber-950/60 text-amber-300 border border-amber-500/30", dot: "bg-amber-400" },
  Low:    { ring: "border-l-cyan-400",   badge: "bg-cyan-950/60 text-cyan-300 border border-cyan-500/30",     dot: "bg-cyan-400"   },
};

const STA = {
  "Todo":        { header: "text-slate-300",   accent: "border-slate-600",   bg: "bg-slate-800/40",   badge: "bg-slate-800 text-slate-300 border border-slate-600/50" },
  "In Progress": { header: "text-cyan-300",    accent: "border-cyan-500",    bg: "bg-cyan-950/30",    badge: "bg-cyan-950/70 text-cyan-300 border border-cyan-500/40" },
  "Waiting":     { header: "text-amber-300",   accent: "border-amber-500",   bg: "bg-amber-950/20",   badge: "bg-amber-950/60 text-amber-300 border border-amber-500/40" },
  "Done":        { header: "text-emerald-300", accent: "border-emerald-500", bg: "bg-emerald-950/20", badge: "bg-emerald-950/60 text-emerald-300 border border-emerald-500/40" },
};

const genId = () => `t-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;

const DEFAULTS = [
  { id: genId(), title: "UIデザインのレビュー",    description: "カラーパレットとフォントの確認", status: "Todo",        priority: "High",   dueDate: "", estHours: 2, actHours: 0, order: 0, archived: false, createdAt: Date.now() - 86400000*2 },
  { id: genId(), title: "APIエンドポイントの実装", description: "RESTful APIの設計と実装",      status: "In Progress", priority: "High",   dueDate: "", estHours: 4, actHours: 2, order: 1, archived: false, createdAt: Date.now() - 86400000 },
  { id: genId(), title: "ユーザーテストの実施",    description: "5名のユーザーにヒアリング",    status: "In Progress", priority: "Medium", dueDate: "", estHours: 3, actHours: 0, order: 2, archived: false, createdAt: Date.now() - 86400000 },
  { id: genId(), title: "ドキュメントの整備",      description: "README と API仕様書の更新",   status: "Done",        priority: "Low",    dueDate: "", estHours: 2, actHours: 2, order: 3, archived: false, createdAt: Date.now() - 86400000*3 },
];

// ===== SUPABASE ヘルパー =====
// DB行 → アプリのtaskオブジェクトに変換
const fromDbTask = r => ({
  id:          r.id,
  title:       r.title       ?? "",
  description: r.description ?? "",
  status:      r.status      ?? "Todo",
  priority:    r.priority    ?? "Medium",
  dueDate:     r.due_date    ?? "",
  estHours:    r.est_hours   ?? 0,
  actHours:    r.act_hours   ?? 0,
  order:       r.order_index ?? 0,
  archived:    r.archived    ?? false,
  createdAt:   r.created_at  ?? Date.now(),
  updatedAt:   r.updated_at  ?? Date.now(),
});

// アプリのtaskオブジェクト → DB行に変換
const toDbTask = t => ({
  id:          t.id,
  title:       t.title       ?? "",
  description: t.description ?? "",
  status:      t.status      ?? "Todo",
  priority:    t.priority    ?? "Medium",
  due_date:    t.dueDate     ?? "",
  est_hours:   parseFloat(t.estHours)  || 0,
  act_hours:   parseFloat(t.actHours)  || 0,
  order_index: t.order       ?? 0,
  archived:    t.archived    ?? false,
  created_at:  t.createdAt   ?? Date.now(),
  updated_at:  Date.now(),
});

// IDベース・updated_at新しい方優先でマージ
const mergeByUpdatedAt = (local, remote) => {
  const map = new Map();
  local.forEach(t => map.set(t.id, t));
  remote.forEach(t => {
    const existing = map.get(t.id);
    const remoteTs = t.updatedAt ?? t.updated_at ?? 0;
    const localTs  = existing?.updatedAt ?? existing?.updated_at ?? 0;
    if (!existing || remoteTs > localTs) map.set(t.id, t);
  });
  return Array.from(map.values());
};

// ===== TABLER ICON COMPONENTS =====
const Icon = ({ name, size = 16, className = "" }) => (
  <i className={`ti ti-${name} ${className}`} style={{ fontSize: size }} aria-hidden="true" />
);

// ===== LOGIN SCREEN =====
function LoginScreen({ onLogin }) {
  const [email, setEmail]     = useState("");
  const [pass,  setPass]      = useState("");
  const [mode,  setMode]      = useState("login"); // "login" | "signup"
  const [err,   setErr]       = useState("");
  const [loading, setLoading] = useState(false);
  const [msg,   setMsg]       = useState("");

  const handle = async () => {
    setErr(""); setMsg("");
    if (!email || !pass) { setErr("メールとパスワードを入力してください"); return; }
    setLoading(true);
    const fn = mode === "login" ? signIn : signUp;
    const { data, error } = await fn(email, pass);
    setLoading(false);
    if (error) { setErr(error.message); return; }
    if (mode === "signup" && !data?.session) {
      setMsg("確認メールを送りました。メール内のリンクをクリックしてからログインしてください。");
      setMode("login"); return;
    }
    if (data?.session?.user) onLogin(data.session.user);
  };

  return (
    <div style={{minHeight:"100vh", background:"#0d0f12", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Noto Sans JP','Inter',sans-serif"}}>
      <div style={{width:"100%", maxWidth:380, background:"#141720", border:"0.5px solid rgba(0,180,216,0.20)", borderRadius:12, padding:"36px 28px"}}>
        <div style={{fontSize:22, fontWeight:600, color:"#e2e8f0", marginBottom:4}}>
          Task<span style={{color:"#00b4d8"}}>Board</span>
        </div>
        <div style={{fontSize:13, color:"#94a3b8", marginBottom:28}}>
          {mode === "login" ? "ログインしてください" : "新規アカウントを作成"}
        </div>
        {err && <div style={{fontSize:13, color:"#f09595", marginBottom:12, padding:"8px 12px", background:"rgba(226,75,74,0.1)", borderRadius:8}}>{err}</div>}
        {msg && <div style={{fontSize:13, color:"#5DCAA5", marginBottom:12, padding:"8px 12px", background:"rgba(29,158,117,0.1)", borderRadius:8}}>{msg}</div>}
        <div style={{fontSize:12, color:"#94a3b8", marginBottom:6}}>メールアドレス</div>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&handle()}
          placeholder="you@example.com" autoComplete="email"
          style={{width:"100%", padding:"10px 12px", borderRadius:8, border:"0.5px solid rgba(0,180,216,0.25)", background:"#0d0f12", color:"#e2e8f0", fontSize:14, marginBottom:12, outline:"none"}} />
        <div style={{fontSize:12, color:"#94a3b8", marginBottom:6}}>パスワード</div>
        <input type="password" value={pass} onChange={e=>setPass(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&handle()}
          placeholder="••••••••" autoComplete={mode==="login"?"current-password":"new-password"}
          style={{width:"100%", padding:"10px 12px", borderRadius:8, border:"0.5px solid rgba(0,180,216,0.25)", background:"#0d0f12", color:"#e2e8f0", fontSize:14, marginBottom:20, outline:"none"}} />
        <button onClick={handle} disabled={loading}
          style={{width:"100%", padding:"11px", borderRadius:6, background:"#00b4d8", color:"#fff", border:"none", fontSize:15, fontWeight:500, cursor:loading?"not-allowed":"pointer", opacity:loading?0.6:1, marginBottom:12}}>
          {loading ? "処理中..." : mode === "login" ? "ログイン" : "新規登録"}
        </button>
        <div style={{textAlign:"center", fontSize:13, color:"#94a3b8"}}>
          {mode === "login" ? "アカウントをお持ちでない方は" : "すでにアカウントをお持ちの方は"}
          <span onClick={()=>{setMode(mode==="login"?"signup":"login");setErr("");setMsg("");}}
            style={{color:"#48cae4", cursor:"pointer", marginLeft:4}}>
            {mode === "login" ? "新規登録" : "ログイン"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ===== STICKY NOTE PANEL =====
function StickyPanel({ user }) {
  const [open,    setOpen]    = useState(false);
  const [notes,   setNotes]   = useState([]);
  const [text,    setText]    = useState("");
  const [color,   setColor]   = useState("yellow");
  const [timerOn, setTimerOn] = useState(false);
  const [alarmDt, setAlarmDt] = useState("");
  const [filter,  setFilter]  = useState("all");
  const [saving,  setSaving]  = useState(false);
  const alarmRefs = useRef([]);

  const COLORS = {
    yellow: { bg:"#FAEEDA", text:"#633806", border:"#EF9F27" },
    green:  { bg:"#EAF3DE", text:"#27500A", border:"#97C459" },
    blue:   { bg:"#E6F1FB", text:"#0C447C", border:"#85B7EB" },
    pink:   { bg:"#FBEAF0", text:"#72243E", border:"#ED93B1" },
  };

  // 初回ロード
  useEffect(() => {
    if (!supabase || !user) return;
    supabase.from("sticky_notes").select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setNotes(data); });

    // リアルタイム同期
    const ch = supabase.channel("sticky-"+user.id)
      .on("postgres_changes", { event:"*", schema:"public", table:"sticky_notes", filter:`user_id=eq.${user.id}` },
        payload => {
          if (payload.eventType === "INSERT") setNotes(p => p.some(n => n.id === payload.new.id) ? p : [payload.new, ...p]);
          else if (payload.eventType === "DELETE") setNotes(p => p.filter(n => n.id !== payload.old.id));
          else if (payload.eventType === "UPDATE") setNotes(p => p.map(n => n.id===payload.new.id ? payload.new : n));
        })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [user]);

  // アラームチェック（15秒ごと）
  useEffect(() => {
    const t = setInterval(() => {
      const now = new Date();
      notes.forEach(n => {
        if (n.alarm_at && !n.alarmed && new Date(n.alarm_at) <= now) {
          triggerAlarm(n);
        }
      });
    }, 15000);
    return () => clearInterval(t);
  }, [notes]);

  const triggerAlarm = async (note) => {
    setOpen(true);
    try { navigator.vibrate && navigator.vibrate([200,100,200]); } catch {}
    if (supabase && user) {
      await supabase.from("sticky_notes").update({ alarmed: true }).eq("id", note.id);
      setNotes(p => p.map(n => n.id===note.id ? {...n, alarmed:true} : n));
    }
  };

  const save = async () => {
    if (!text.trim()) return;
    setSaving(true);
    const row = {
      user_id:  user.id,
      text:     text.trim(),
      color,
      alarm_at: timerOn && alarmDt ? new Date(alarmDt).toISOString() : null,
      alarmed:  false,
    };
    if (supabase) {
      const { data } = await supabase.from("sticky_notes").insert(row).select().single();
      if (data) setNotes(p => p.some(n => n.id === data.id) ? p : [data, ...p]);
    } else {
      setNotes(p => [{...row, id: Date.now().toString(), created_at: new Date().toISOString()}, ...p]);
    }
    setText(""); setTimerOn(false); setSaving(false);
  };

  const del = async (id) => {
    if (supabase) await supabase.from("sticky_notes").delete().eq("id", id);
    setNotes(p => p.filter(n => n.id !== id));
  };

  const filtered = filter === "all" ? notes
    : filter === "timer" ? notes.filter(n => n.alarm_at)
    : notes.filter(n => n.color === filter);

  const alarmCount = notes.filter(n => n.alarm_at && !n.alarmed && new Date(n.alarm_at) <= new Date()).length;

  // デフォルト日時（1時間後）
  useEffect(() => {
    const dt = new Date(Date.now() + 3600000);
    dt.setSeconds(0,0);
    setAlarmDt(new Date(dt.getTime() - dt.getTimezoneOffset()*60000).toISOString().slice(0,16));
  }, []);

  return (
    <>
      {/* 右端タブ */}
      <div onClick={() => setOpen(o => !o)} style={{
        position:"fixed", right: open ? 292 : 0, top:"50%", transform:"translateY(-50%)",
        width:28, background:"#141720", borderLeft:"0.5px solid rgba(0,180,216,0.20)",
        borderTop:"0.5px solid rgba(0,180,216,0.20)", borderBottom:"0.5px solid rgba(0,180,216,0.20)",
        borderRadius:"8px 0 0 8px", padding:"16px 0", cursor:"pointer", zIndex:1000,
        display:"flex", flexDirection:"column", alignItems:"center", gap:8,
        transition:"right 0.25s ease",
      }}>
        <i className="ti ti-note" style={{fontSize:16, color:"#48cae4"}} />
        <span style={{writingMode:"vertical-rl", fontSize:10, color:"#94a3b8", letterSpacing:"0.05em", userSelect:"none"}}>付箋</span>
        {(notes.length > 0 || alarmCount > 0) && (
          <span style={{
            width:16, height:16, borderRadius:"50%", background: alarmCount>0 ? "#ef4444" : "#00b4d8",
            color:"#fff", fontSize:9, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:600,
          }}>{alarmCount > 0 ? "!" : notes.length}</span>
        )}
      </div>

      {/* パネル本体 */}
      <div style={{
        position:"fixed", right: open ? 0 : -292, top:0, width:292, height:"100vh",
        background:"#141720", borderLeft:"0.5px solid rgba(0,180,216,0.15)",
        zIndex:999, transition:"right 0.25s ease",
        display:"flex", flexDirection:"column", overflow:"hidden",
      }}>
        {/* ヘッダー */}
        <div style={{padding:"12px 14px 10px", borderBottom:"0.5px solid rgba(0,180,216,0.12)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0}}>
          <span style={{fontSize:14, fontWeight:500, color:"#e2e8f0", display:"flex", alignItems:"center", gap:6}}>
            <i className="ti ti-note" style={{fontSize:15, color:"#48cae4"}} /> 付箋メモ
          </span>
          <button onClick={() => setOpen(false)} style={{background:"none", border:"none", color:"#94a3b8", cursor:"pointer", fontSize:16}}>
            <i className="ti ti-x" />
          </button>
        </div>

        {/* フィルター */}
        <div style={{display:"flex", gap:4, padding:"8px 10px", borderBottom:"0.5px solid rgba(0,180,216,0.10)", overflowX:"auto", flexShrink:0}}>
          {[["all","すべて"],["yellow","黄"],["green","緑"],["blue","青"],["pink","ピンク"],["timer","⏰"]].map(([f,label]) => (
            <button key={f} onClick={() => setFilter(f)}
              style={{padding:"3px 10px", borderRadius:12, border:"0.5px solid rgba(0,180,216,0.25)", background: filter===f ? "rgba(0,180,216,0.15)" : "none", color: filter===f ? "#48cae4" : "#94a3b8", fontSize:11, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0}}>
              {label}
            </button>
          ))}
        </div>

        {/* 入力エリア */}
        <div style={{padding:"10px 12px", borderBottom:"0.5px solid rgba(0,180,216,0.10)", flexShrink:0}}>
          <div style={{display:"flex", gap:8, marginBottom:8}}>
            {Object.entries(COLORS).map(([k,v]) => (
              <div key={k} onClick={() => setColor(k)} style={{
                width:22, height:22, borderRadius:"50%", background:v.border,
                border: color===k ? "2px solid #e2e8f0" : "2px solid transparent",
                cursor:"pointer", transform: color===k ? "scale(1.2)" : "scale(1)", transition:"all 0.1s",
              }} />
            ))}
          </div>
          <textarea value={text} onChange={e=>setText(e.target.value)}
            placeholder="メモを入力…" rows={3}
            style={{width:"100%", padding:"8px 10px", borderRadius:8, border:"0.5px solid rgba(0,180,216,0.25)", background:"#0d0f12", color:"#e2e8f0", fontSize:13, fontFamily:"inherit", resize:"vertical", outline:"none", marginBottom:8, lineHeight:1.6}} />
          {/* タイマートグル */}
          <div style={{display:"flex", alignItems:"center", gap:8, marginBottom: timerOn ? 8 : 0, cursor:"pointer"}} onClick={() => setTimerOn(o=>!o)}>
            <div style={{width:34, height:18, borderRadius:9, background: timerOn ? "#00b4d8" : "rgba(255,255,255,0.12)", position:"relative", transition:"background 0.2s", flexShrink:0}}>
              <div style={{position:"absolute", top:2, left: timerOn ? 16 : 2, width:14, height:14, borderRadius:"50%", background:"white", transition:"left 0.2s"}} />
            </div>
            <span style={{fontSize:12, color:"#94a3b8"}}>タイマーをセット</span>
          </div>
          {timerOn && (
            <input type="datetime-local" value={alarmDt} onChange={e=>setAlarmDt(e.target.value)}
              style={{width:"100%", padding:"7px 10px", borderRadius:8, border:"0.5px solid rgba(0,180,216,0.25)", background:"#0d0f12", color:"#e2e8f0", fontSize:13, outline:"none", marginBottom:8}} />
          )}
          <button onClick={save} disabled={saving || !text.trim()}
            style={{width:"100%", padding:"8px", borderRadius:8, background:"#00b4d8", color:"#fff", border:"none", fontSize:13, fontWeight:500, cursor:saving||!text.trim()?"not-allowed":"pointer", opacity:saving||!text.trim()?0.5:1}}>
            {saving ? "保存中…" : "保存"}
          </button>
        </div>

        {/* 付箋リスト */}
        <div style={{flex:1, overflowY:"auto", padding:"10px 10px 20px"}}>
          {filtered.length === 0 && (
            <div style={{textAlign:"center", padding:"40px 16px", color:"#475569", fontSize:13, lineHeight:1.8}}>
              付箋がありません<br />上から追加できます
            </div>
          )}
          {filtered.map(n => {
            const c = COLORS[n.color] || COLORS.yellow;
            const alarmAt = n.alarm_at ? new Date(n.alarm_at) : null;
            const isRinging = alarmAt && !n.alarmed && alarmAt <= new Date();
            const dtLabel = alarmAt ? `⏰ ${alarmAt.toLocaleDateString("ja-JP",{month:"numeric",day:"numeric"})} ${alarmAt.toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"})}` : "";
            return (
              <div key={n.id} style={{
                background:c.bg, color:c.text, border:`0.5px solid ${c.border}`,
                borderRadius:8, padding:"10px 11px", marginBottom:8,
                fontSize:13, lineHeight:1.6, position:"relative", wordBreak:"break-word",
                animation: isRinging ? "stickyBlink 0.6s ease-in-out infinite" : "none",
              }}>
                <div style={{whiteSpace:"pre-wrap", marginBottom: dtLabel ? 6 : 0}}>{n.text}</div>
                {dtLabel && (
                  <div style={{fontSize:11, display:"flex", alignItems:"center", gap:4, opacity: isRinging ? 1 : 0.65}}>
                    <span style={{padding:"1px 6px", borderRadius:4, background:"rgba(0,0,0,0.08)"}}>{dtLabel}{alarmAt < new Date() ? " (経過)" : ""}</span>
                  </div>
                )}
                <button onClick={() => del(n.id)} style={{
                  position:"absolute", top:6, right:6, width:20, height:20,
                  background:"rgba(0,0,0,0.1)", border:"none", borderRadius:4,
                  color:"inherit", fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", opacity:0.7,
                }}>✕</button>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`@keyframes stickyBlink { 0%,100%{opacity:1} 50%{opacity:0.2} }`}</style>
    </>
  );
}

// ===== SYNC STATUS INDICATOR =====
function SyncIndicator({ syncing, syncError }) {
  if (!sbEnabled) return null;
  if (syncing) return (
    <span className="flex items-center gap-1 text-[11px]" style={{color:"#94a3b8"}}>
      <Icon name="refresh" size={11} className="animate-spin" /> 同期中
    </span>
  );
  if (syncError) return (
    <span className="flex items-center gap-1 text-[11px]" style={{color:"#EF9F27"}} title={syncError}>
      <Icon name="wifi-off" size={11} /> オフライン
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-[11px]" style={{color:"#1D9E75"}}>
      <Icon name="cloud-check" size={11} /> 同期済み
    </span>
  );
}

// ===== カレンダー形式の日付ピッカー =====
function DatePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) { const d = new Date(value + "T00:00:00"); if (!isNaN(d)) return d; }
    return new Date();
  });
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = new Date().toISOString().slice(0, 10);
  const fmt = (y, m, d) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between rounded-lg border border-cyan-500/20 bg-[#1a1d26] px-3 py-2.5 text-[14px] text-[#e2e8f0] outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30">
        <span className={value ? "" : "text-[#475569]"}>{value || "日付を選択"}</span>
        <Icon name="calendar" size={17} className="text-[#94a3b8]" />
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div className="w-72 rounded-xl border border-cyan-500/20 bg-[#141720] p-3 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between">
              <button type="button" onClick={() => setViewDate(new Date(year, month - 1, 1))}
                className="rounded-lg p-1.5 text-[#94a3b8] hover:bg-[#1a1d26] hover:text-[#e2e8f0]">
                <Icon name="chevron-left" size={16} />
              </button>
              <span className="text-[13px] font-medium text-[#e2e8f0]">{year}年{month + 1}月</span>
              <button type="button" onClick={() => setViewDate(new Date(year, month + 1, 1))}
                className="rounded-lg p-1.5 text-[#94a3b8] hover:bg-[#1a1d26] hover:text-[#e2e8f0]">
                <Icon name="chevron-right" size={16} />
              </button>
              <button type="button" onClick={() => setOpen(false)}
                className="ml-1 rounded-lg p-1.5 text-[#94a3b8] hover:bg-[#1a1d26] hover:text-[#e2e8f0]">
                <Icon name="x" size={16} />
              </button>
            </div>
            <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] text-[#64748b]">
              {["日", "月", "火", "水", "木", "金", "土"].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((d, i) => {
                if (d === null) return <div key={i} />;
                const dateStr = fmt(year, month, d);
                const isSelected = dateStr === value;
                const isToday = dateStr === todayStr;
                return (
                  <button type="button" key={i}
                    onClick={() => { onChange(dateStr); setOpen(false); }}
                    className={`h-9 w-9 rounded-md text-[13px] transition-colors ${
                      isSelected ? "bg-[#00b4d8] text-white"
                      : isToday ? "border border-cyan-400/50 text-[#e2e8f0]"
                      : "text-[#cbd5e1] hover:bg-[#1a1d26]"}`}>
                    {d}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => { onChange(fmt(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())); setOpen(false); }}
                className="flex-1 rounded-md border border-cyan-500/20 py-1.5 text-[11px] text-[#94a3b8] hover:bg-[#1a1d26]">今日</button>
              {value && (
                <button type="button" onClick={() => { onChange(""); setOpen(false); }}
                  className="flex-1 rounded-md border border-cyan-500/20 py-1.5 text-[11px] text-[#94a3b8] hover:bg-[#1a1d26]">クリア</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== MODAL =====
function Modal({ task, onSave, onClose }) {
  const [form, setForm] = useState(task || { title:"", description:"", status:"Todo", priority:"Medium", dueDate:"", estHours:"", actHours:"" });
  const up = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-cyan-500/20 bg-[#141720] shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-cyan-500/10 px-6 py-4">
          <h2 className="text-[16px] font-semibold text-[#e2e8f0]">{task ? "タスクを編集" : "タスクを追加"}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-[#94a3b8] hover:bg-[#1a1d26] hover:text-[#e2e8f0]">
            <Icon name="x" size={20} />
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto px-6 py-5">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-[#94a3b8]">タイトル</label>
            <input value={form.title} onChange={up("title")} placeholder="タスク名を入力"
              className="w-full rounded-lg border border-cyan-500/20 bg-[#1a1d26] px-3 py-2.5 text-[14px] text-[#e2e8f0] placeholder-[#475569] outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30" />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-[#94a3b8]">詳細</label>
            <textarea value={form.description} onChange={up("description")} rows={7} placeholder="詳細・メモ"
              className="w-full rounded-lg border border-cyan-500/20 bg-[#1a1d26] px-3 py-2.5 text-[14px] text-[#e2e8f0] placeholder-[#475569] outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 resize-y" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#94a3b8]">ステータス</label>
              <select value={form.status} onChange={up("status")}
                className="w-full rounded-lg border border-cyan-500/20 bg-[#1a1d26] px-3 py-2 text-[13px] text-[#e2e8f0] outline-none focus:border-cyan-400/50">
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]||s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#94a3b8]">優先度</label>
              <select value={form.priority} onChange={up("priority")}
                className="w-full rounded-lg border border-cyan-500/20 bg-[#1a1d26] px-3 py-2 text-[13px] text-[#e2e8f0] outline-none focus:border-cyan-400/50">
                {PRIORITIES.map(p => <option key={p} value={p}>{PRI_LABEL[p]||p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#94a3b8]">期日</label>
              <DatePicker value={form.dueDate} onChange={d => setForm(f => ({ ...f, dueDate: d }))} />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#94a3b8]">見積(h)</label>
              <input type="number" min="0" step="0.5" value={form.estHours} onChange={up("estHours")}
                className="w-full rounded-lg border border-cyan-500/20 bg-[#1a1d26] px-3 py-2 text-[13px] text-[#e2e8f0] outline-none focus:border-cyan-400/50" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#94a3b8]">実績(h)</label>
              <input type="number" min="0" step="0.5" value={form.actHours} onChange={up("actHours")}
                className="w-full rounded-lg border border-cyan-500/20 bg-[#1a1d26] px-3 py-2 text-[13px] text-[#e2e8f0] outline-none focus:border-cyan-400/50" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-cyan-500/10 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-cyan-500/20 px-4 py-2 text-[13px] text-[#94a3b8] hover:bg-[#1a1d26]">キャンセル</button>
          <button onClick={() => { if(form.title.trim()) onSave(form); }}
            className="rounded-lg bg-[#00b4d8] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#0096b4]">保存</button>
        </div>
      </div>
    </div>
  );
}

// ===== TASK CARD (コンパクト版) =====
function TaskCard({ task, num, onEdit, onDelete, onDragStart, onDragEnd, isDragging }) {
  const overdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "Done";
  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = "move"; onDragStart(task.id); }}
      onDragEnd={onDragEnd}
      onClick={() => onEdit(task)}
      className={`group relative cursor-pointer rounded-md border-l-[3px]
        bg-[#141720] border border-cyan-500/10
        p-2 transition-all hover:border-violet-400/30 hover:bg-[#1a1d26]
        ${PRI[task.priority]?.ring || "border-l-slate-500"}
        ${isDragging ? "opacity-40 scale-95" : "opacity-100"}`}
    >
      <div className="flex items-start justify-between gap-1 mb-1">
        <div className="flex min-w-0 flex-1 items-start gap-1.5">
          {num != null && (
            <span className="mt-[1px] flex h-4 w-4 shrink-0 items-center justify-center rounded bg-[#1a1d26] border border-cyan-500/20 text-[9px] font-semibold text-[#48cae4]">
              {num}
            </span>
          )}
          <p className={`text-[12px] font-medium leading-snug min-w-0 flex-1 ${task.status === "Done" ? "line-through text-[#475569]" : "text-[#e2e8f0]"}`}>
            {task.title}
          </p>
        </div>
        <button onClick={e => { e.stopPropagation(); onDelete(task.id); }}
          className="hidden shrink-0 rounded p-0.5 text-[#475569] hover:bg-red-950/50 hover:text-red-400 group-hover:flex">
          <Icon name="trash" size={11} />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <span className={`rounded px-1 py-0.5 text-[9px] font-medium ${PRI[task.priority]?.badge || ""}`}>{PRI_LABEL[task.priority]||task.priority}</span>
        {task.dueDate && (
          <span className={`flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] ${overdue ? "bg-red-950/60 text-red-300 border border-red-500/30" : "bg-[#1a1d26] text-[#94a3b8] border border-cyan-500/10"}`}>
            <Icon name="calendar" size={9} />{task.dueDate}
          </span>
        )}
        {(task.estHours||task.actHours) ? (
          <span className="flex items-center gap-0.5 rounded border border-cyan-500/10 bg-[#1a1d26] px-1 py-0.5 text-[9px] text-[#94a3b8]">
            <Icon name="clock" size={9} />{task.actHours||0}/{task.estHours||0}h
          </span>
        ) : null}
      </div>
    </div>
  );
}

// ===== KANBAN =====
function KanbanView({ tasks, onEdit, onDelete, onMove, onReorder, sortKey, sortDir }) {
  const [draggingId, setDraggingId] = useState(null);
  const [overInfo, setOverInfo] = useState(null);

  const sortTasks = ts => {
    const arr = [...ts];
    const priOrder = {"High":0,"Medium":1,"Low":2};
    if(sortKey==="priority") arr.sort((a,b)=>sortDir==="asc"?priOrder[a.priority]-priOrder[b.priority]:priOrder[b.priority]-priOrder[a.priority]);
    else if(sortKey==="title") arr.sort((a,b)=>sortDir==="asc"?a.title.localeCompare(b.title,"ja"):b.title.localeCompare(a.title,"ja"));
    else if(sortKey==="dueDate") arr.sort((a,b)=>{const da=a.dueDate||"9999",db=b.dueDate||"9999";return sortDir==="asc"?da.localeCompare(db):db.localeCompare(da);});
    else if(sortKey==="createdAt") arr.sort((a,b)=>sortDir==="asc"?(a.createdAt||0)-(b.createdAt||0):(b.createdAt||0)-(a.createdAt||0));
    else arr.sort((a,b)=>(a.order??0)-(b.order??0));
    return arr;
  };

  const getPos = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return e.clientY < rect.top + rect.height / 2 ? "before" : "after";
  };

  const handleCardDragOver = (e, st, cardId) => {
    e.preventDefault(); e.stopPropagation();
    setOverInfo({ col: st, cardId, pos: getPos(e) });
  };

  const handleColDragOver = (e, st) => {
    e.preventDefault();
    if(!overInfo || overInfo.col !== st) setOverInfo({ col: st, cardId: null, pos: "after" });
  };

  const handleDrop = (e, st, cardId) => {
    e.preventDefault(); e.stopPropagation();
    if(!draggingId) { setOverInfo(null); return; }
    const dragTask = tasks.find(t => t.id === draggingId);
    if(!dragTask || draggingId === cardId) { setOverInfo(null); setDraggingId(null); return; }
    const pos = cardId ? getPos(e) : "after";
    if(dragTask.status !== st) {
      onMove(draggingId, st, cardId, pos);
    } else {
      onReorder(draggingId, cardId, pos, st);
    }
    setOverInfo(null); setDraggingId(null);
  };

  // カード列（全列ドロップ受付）
  const renderCardCol = (st, taskList, startIndex = 0) => {
    const col = STA[st];
    return (
      <div
        className={`rounded-xl border ${col.accent} ${col.bg} p-2 flex flex-col gap-1.5 min-h-[80px]`}
        onDragOver={e => handleColDragOver(e, st)}
        onDragLeave={e => { if(!e.currentTarget.contains(e.relatedTarget)) setOverInfo(null); }}
        onDrop={e => handleDrop(e, st, null)}
      >
        {taskList.map((t, i) => {
          const isOver = overInfo && overInfo.cardId === t.id && draggingId !== t.id;
          return (
            <div key={t.id}
              style={{
                borderTop:    isOver && overInfo.pos==="before" ? "2px solid #00b4d8" : "2px solid transparent",
                borderBottom: isOver && overInfo.pos==="after"  ? "2px solid #00b4d8" : "2px solid transparent",
              }}
              onDragOver={e => handleCardDragOver(e, st, t.id)}
              onDragLeave={e => { if(!e.currentTarget.contains(e.relatedTarget)) setOverInfo(o => o?.cardId===t.id ? null : o); }}
              onDrop={e => handleDrop(e, st, t.id)}
            >
              <TaskCard task={t} num={startIndex + i + 1} onEdit={onEdit} onDelete={onDelete}
                onDragStart={id => setDraggingId(id)}
                onDragEnd={() => { setDraggingId(null); setOverInfo(null); }}
                isDragging={draggingId === t.id} />
            </div>
          );
        })}
        {overInfo && overInfo.col===st && !overInfo.cardId && (
          <div style={{height:"2px", background:"#00b4d8", borderRadius:"1px", margin:"2px 0"}} />
        )}
      </div>
    );
  }

  // グループヘッダー（span列分の幅）
  const GroupHeader = ({ st, span }) => {
    const col = STA[st];
    const count = tasks.filter(t => t.status === st).length;
    return (
      <div style={{gridColumn:`span ${span}`}}
        className={`flex items-center gap-2 px-1 pb-1 border-b ${col.accent}`}>
        <span className={`text-[12px] font-semibold tracking-wide ${col.header}`}>{STATUS_LABEL[st]}</span>
        <span className="rounded-full bg-[#1a1d26] border border-cyan-500/10 px-1.5 py-0.5 text-[10px] text-[#94a3b8]">{count}</span>
      </div>
    );
  };

  // PC用 6列グリッド
  const renderPCLayout = () => {
    const todoTasks = sortTasks(tasks.filter(t => t.status === "Todo"));
    const ipTasks   = sortTasks(tasks.filter(t => t.status === "In Progress"));
    const waitTasks = sortTasks(tasks.filter(t => t.status === "Waiting"));
    const doneTasks = sortTasks(tasks.filter(t => t.status === "Done"));

    // 1列あたり最大10件、2列目は残り全件（20件超えは2列目が伸びる）
    const PER_COL = 10;
    const splitCols = (arr) => [arr.slice(0, PER_COL), arr.slice(PER_COL)];

    const [todoCol1, todoCol2] = splitCols(todoTasks);
    const [ipCol1,   ipCol2]   = splitCols(ipTasks);

    return (
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 1fr", gap:"8px", alignItems:"start"}}>
        {/* ヘッダー行 */}
        <GroupHeader st="Todo"        span={2} />
        <GroupHeader st="In Progress" span={2} />
        <GroupHeader st="Waiting"     span={1} />
        <GroupHeader st="Done"        span={1} />
        {/* 未着手：1列目（1〜10件）/ 2列目（11件〜、20超えは下に伸びる） */}
        {renderCardCol("Todo", todoCol1, 0)}
        {renderCardCol("Todo", todoCol2, todoCol1.length)}
        {/* 進行中：1列目（1〜10件）/ 2列目（11件〜、20超えは下に伸びる） */}
        {renderCardCol("In Progress", ipCol1, 0)}
        {renderCardCol("In Progress", ipCol2, ipCol1.length)}
        {/* 返事待ち・完了 */}
        {renderCardCol("Waiting", waitTasks, 0)}
        {renderCardCol("Done",    doneTasks, 0)}
      </div>
    );
  };

  // タブレット・スマホ用 シンプル縦積みレーン
  const renderSimpleLane = (st) => {
    const col = STA[st];
    const colTasks = sortTasks(tasks.filter(t => t.status === st));
    return (
      <div key={st}>
        <div className={`flex items-center gap-2 px-1 pb-1 mb-1.5 border-b ${col.accent}`}>
          <span className={`text-[12px] font-semibold ${col.header}`}>{STATUS_LABEL[st]}</span>
          <span className="rounded-full bg-[#1a1d26] border border-cyan-500/10 px-1.5 py-0.5 text-[10px] text-[#94a3b8]">{colTasks.length}</span>
        </div>
        {renderCardCol(st, colTasks)}
      </div>
    );
  };

  // useWindowWidthでブレークポイントをJS側で判定
  const [winW, setWinW] = useState(() => typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const onResize = () => setWinW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <>
      {winW >= 1024
        ? renderPCLayout()
        : winW >= 768
          ? <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px"}}>
              {renderSimpleLane("Todo")}
              {renderSimpleLane("In Progress")}
              {renderSimpleLane("Waiting")}
              {renderSimpleLane("Done")}
            </div>
          : <div style={{display:"grid", gridTemplateColumns:"1fr", gap:"16px"}}>
              {renderSimpleLane("Todo")}
              {renderSimpleLane("In Progress")}
              {renderSimpleLane("Waiting")}
              {renderSimpleLane("Done")}
            </div>
      }
    </>
  );
}

// ===== LIST VIEW =====
function ListView({ tasks, onEdit, onDelete, onStatusChange }) {
  return (
    <div className="rounded-xl border border-cyan-500/15 bg-[#141720] overflow-hidden">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-cyan-500/15">
            {["タイトル","ステータス","優先度","期日","見積","実績",""].map((h,i) => (
              <th key={i} className="px-4 py-3 text-left text-[11px] font-medium text-[#94a3b8]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tasks.sort((a,b) => a.order - b.order).map(t => (
            <tr key={t.id} className="border-b border-cyan-500/10 hover:bg-[#1a1d26] cursor-pointer transition-colors" onClick={() => onEdit(t)}>
              <td className="px-4 py-3">
                <span className={`font-medium ${t.status==="Done" ? "line-through text-[#475569]" : "text-[#e2e8f0]"}`}>{t.title}</span>
                {t.description && <p className="text-[11px] text-[#475569] mt-0.5 line-clamp-1">{t.description}</p>}
              </td>
              <td className="px-4 py-3">
                <select value={t.status} onClick={e => e.stopPropagation()}
                  onChange={e => onStatusChange(t.id, e.target.value)}
                  className="rounded-lg border border-cyan-500/20 bg-[#1a1d26] px-2 py-1 text-[11px] text-[#e2e8f0] outline-none focus:border-cyan-400/50">
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]||s}</option>)}
                </select>
              </td>
              <td className="px-4 py-3">
                <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${PRI[t.priority]?.badge || ""}`}>{PRI_LABEL[t.priority]||t.priority}</span>
              </td>
              <td className="px-4 py-3">
                {t.dueDate ? (
                  <span className={`text-[12px] ${new Date(t.dueDate)<new Date()&&t.status!=="Done" ? "text-red-400" : "text-[#94a3b8]"}`}>{t.dueDate}</span>
                ) : <span className="text-[#475569]">—</span>}
              </td>
              <td className="px-4 py-3 text-[#94a3b8]">{t.estHours ? `${t.estHours}h` : "—"}</td>
              <td className="px-4 py-3 text-[#94a3b8]">{t.actHours ? `${t.actHours}h` : "—"}</td>
              <td className="px-4 py-3">
                <button onClick={e => { e.stopPropagation(); onDelete(t.id); }}
                  className="rounded p-1 text-[#475569] hover:bg-red-950/50 hover:text-red-400">
                  <Icon name="trash" size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!tasks.length && (
        <div className="py-10 text-center text-[#475569] text-[13px]">
          <Icon name="inbox" size={32} className="mx-auto mb-2 opacity-40" />
          <p>タスクがありません</p>
        </div>
      )}
    </div>
  );
}

// ===== DASHBOARD =====
function Dashboard({ tasks }) {
  const total = tasks.length;
  const done = tasks.filter(t => t.status === "Done").length;
  const inProg = tasks.filter(t => t.status === "In Progress").length;
  const waiting = tasks.filter(t => t.status === "Waiting").length;
  const highCount = tasks.filter(t => t.priority === "High" && t.status !== "Done").length;
  const estTotal = tasks.reduce((s,t) => s + (parseFloat(t.estHours)||0), 0);
  const actTotal = tasks.reduce((s,t) => s + (parseFloat(t.actHours)||0), 0);
  const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "Done");

  const metrics = [
    { label:"合計タスク", value: total, icon:"list", color:"text-cyan-300" },
    { label:"完了", value: done, icon:"circle-check", color:"text-emerald-300" },
    { label:"進行中", value: inProg, icon:"player-play", color:"text-cyan-300" },
    { label:"返事待ち", value: waiting, icon:"clock-pause", color:"text-amber-300" },
    { label:"高優先度 (未完)", value: highCount, icon:"alert-triangle", color:"text-red-300" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {metrics.map(m => (
          <div key={m.label} className="rounded-xl border border-cyan-500/10 bg-[#141720] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon name={m.icon} size={16} className={m.color} />
              <span className="text-[11px] text-[#94a3b8]">{m.label}</span>
            </div>
            <div className={`text-2xl font-semibold ${m.color}`}>{m.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-cyan-500/10 bg-[#141720] p-4">
          <div className="mb-3 text-[12px] font-medium text-[#94a3b8] flex items-center gap-2">
            <Icon name="chart-bar" size={14} className="text-violet-400" /> 工数サマリー
          </div>
          <div className="space-y-2">
            {[["見積合計", estTotal], ["実績合計", actTotal], ["差異", actTotal - estTotal]].map(([l,v]) => (
              <div key={l} className="flex items-center justify-between">
                <span className="text-[12px] text-[#94a3b8]">{l}</span>
                <span className={`text-[13px] font-medium ${l==="差異" ? (v>0?"text-red-300":"text-emerald-300") : "text-[#e2e8f0]"}`}>
                  {v>0&&l==="差異"?"+":""}{v.toFixed(1)}h
                </span>
              </div>
            ))}
          </div>
          {total > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-[#475569] mb-1">
                <span>完了率</span><span>{Math.round(done/total*100)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-[#1a1d26]">
                <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{width:`${Math.round(done/total*100)}%`}} />
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-cyan-500/10 bg-[#141720] p-4">
          <div className="mb-3 text-[12px] font-medium text-[#94a3b8] flex items-center gap-2">
            <Icon name="alert-triangle" size={14} className="text-red-400" /> 期限切れ・注意
          </div>
          {overdue.length === 0 ? (
            <div className="flex items-center gap-2 text-[12px] text-emerald-400">
              <Icon name="circle-check" size={14} /> 期限切れタスクなし
            </div>
          ) : (
            <div className="space-y-2">
              {overdue.slice(0,5).map(t => (
                <div key={t.id} className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-950/30 px-3 py-2">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${PRI[t.priority]?.dot || "bg-slate-400"}`} />
                  <span className="text-[12px] text-red-300 truncate">{t.title}</span>
                  <span className="ml-auto text-[10px] text-red-400 shrink-0">{t.dueDate}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== BACKUP MODAL =====
function BackupModal({ tasks, onRestore, onClose }) {
  const [msg,     setMsg]     = useState("");
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(null);
  const fileRef = useRef();

  const today = () => new Date().toISOString().slice(0,10).replace(/-/g,"");

  // バックアップ：Supabaseから最新データを取得してJSONとして保存
  const handleExport = async () => {
    setLoading(true);
    setMsg("");
    try {
      let exportTasks = tasks; // フォールバック：現在のstate
      if (supabase) {
        const { data, error } = await supabase
          .from("tasks").select("*").order("order_index", { ascending: true });
        if (!error && data) exportTasks = data.map(fromDbTask);
      }
      const payload = {
        version:    2,
        exportedAt: new Date().toISOString(),
        source:     supabase ? "supabase" : "localStorage",
        tasks:      exportTasks,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `taskboard_backup_${today()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg(`✓ バックアップ保存（タスク${exportTasks.length}件・${supabase ? "Supabaseから取得" : "ローカルから取得"}）`);
    } catch(e) {
      setMsg(`⚠ バックアップ失敗: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 復元ファイル選択
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.tasks || !Array.isArray(data.tasks)) throw new Error("形式が不正です");
        setPending(data);
        setConfirm(true);
        setMsg("");
      } catch {
        setMsg("⚠ ファイルの形式が正しくありません。taskboardのバックアップファイルを選択してください。");
      }
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  // 復元実行：Supabase + state 両方に書き戻す
  const handleRestore = async () => {
    if (!pending) return;
    setLoading(true);
    setConfirm(false);
    try {
      // Supabaseに書き戻し
      if (supabase) {
        // 既存データを全削除してから upsert
        await supabase.from("tasks").delete().neq("id", "___never___");
        if (pending.tasks.length > 0) {
          await supabase.from("tasks").upsert(pending.tasks.map(toDbTask));
        }
      }
      // localStorageにも書き戻し
      try { localStorage.setItem("tasks", JSON.stringify(pending.tasks)); } catch {}
      // stateを更新（親に委譲）
      onRestore(pending.tasks);
      setMsg(`✓ 復元しました（タスク${pending.tasks.length}件）`);
    } catch(e) {
      setMsg(`⚠ 復元失敗: ${e.message}`);
    } finally {
      setLoading(false);
      setPending(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-cyan-500/20 bg-[#141720] p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-[#e2e8f0]">バックアップ / 復元</h2>
          <button onClick={onClose} className="p-1.5 rounded text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1a1d26]">
            <Icon name="x" size={16} />
          </button>
        </div>

        <p className="text-[12px] text-[#94a3b8]">
          {supabase ? "Supabaseの最新データをJSONで保存・復元します。" : "ローカルデータをJSONで保存・復元します。"}
        </p>

        {/* 現在のデータ件数 */}
        <div className="rounded-xl border border-cyan-500/10 bg-[#1a1d26] px-4 py-3 flex items-center gap-3">
          <Icon name="database" size={16} className="text-violet-400 shrink-0" />
          <div>
            <p className="text-[12px] font-medium text-[#e2e8f0]">現在のタスク数</p>
            <p className="text-[11px] text-[#94a3b8]">{tasks.length}件</p>
          </div>
          {supabase && (
            <span className="ml-auto text-[11px] text-emerald-400 flex items-center gap-1">
              <Icon name="cloud" size={11} /> Supabase連携中
            </span>
          )}
        </div>

        {/* バックアップボタン */}
        <button onClick={handleExport} disabled={loading}
          className="w-full flex items-center gap-3 rounded-xl border border-cyan-500/15 bg-[#1a1d26] hover:bg-[#1e2535] px-4 py-3 transition-colors text-left disabled:opacity-50">
          <Icon name="download" size={18} className="text-emerald-400 shrink-0" />
          <div>
            <p className="text-[13px] font-medium text-[#e2e8f0]">バックアップを保存</p>
            <p className="text-[11px] text-[#94a3b8]">taskboard_backup_{today()}.json</p>
          </div>
        </button>

        {/* 復元ボタン */}
        <button onClick={() => fileRef.current?.click()} disabled={loading}
          className="w-full flex items-center gap-3 rounded-xl border border-cyan-500/15 bg-[#1a1d26] hover:bg-[#1e2535] px-4 py-3 transition-colors text-left disabled:opacity-50">
          <Icon name="upload" size={18} className="text-amber-400 shrink-0" />
          <div>
            <p className="text-[13px] font-medium text-[#e2e8f0]">バックアップから復元</p>
            <p className="text-[11px] text-[#94a3b8]">.json ファイルを選択</p>
          </div>
        </button>
        <input ref={fileRef} type="file" accept=".json" onChange={handleFileSelect} className="hidden" />

        {/* 復元確認ダイアログ */}
        {confirm && pending && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-3">
            <p className="text-[13px] font-semibold text-amber-300">⚠ 復元の確認</p>
            <p className="text-[12px] text-amber-200/80">
              バックアップ日時：{new Date(pending.exportedAt).toLocaleString("ja-JP")}<br />
              タスク {pending.tasks.length}件
              {pending.source === "supabase" ? "（Supabaseバックアップ）" : ""}
            </p>
            <p className="text-[11px] text-amber-300/70">※ 現在のデータはすべて上書きされます。</p>
            <div className="flex gap-2">
              <button onClick={() => { setConfirm(false); setPending(null); }}
                className="flex-1 py-2 rounded-xl border border-cyan-500/20 text-[12px] text-[#94a3b8] hover:bg-[#1a1d26] transition-colors">キャンセル</button>
              <button onClick={handleRestore}
                className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-[12px] font-semibold text-white transition-colors">復元する</button>
            </div>
          </div>
        )}

        {loading && (
          <p className="text-[12px] text-[#94a3b8] flex items-center gap-2">
            <Icon name="refresh" size={12} className="animate-spin" /> 処理中...
          </p>
        )}
        {msg && (
          <p className={`text-[12px] px-3 py-2 rounded-lg ${msg.startsWith("✓") ? "bg-emerald-950/40 text-emerald-400" : "bg-red-950/40 text-red-400"}`}>
            {msg}
          </p>
        )}

        <div className="rounded-xl border border-cyan-500/10 bg-[#1a1d26]/60 p-3 text-[11px] text-[#475569] space-y-1">
          <p className="font-medium text-[#94a3b8]">💡 推奨運用</p>
          <p>月1回バックアップを保存しておくと、誤削除やシステム障害時に復元できます。</p>
        </div>
      </div>
    </div>
  );
}

// ===== CLEANUP MODAL（完了タスクの整理：アーカイブ/削除）=====
function CleanupModal({ tasks, onArchive, onRestore, onDelete, onClose }) {
  const [tab, setTab] = useState("pending"); // "pending" | "archived"
  const [selected, setSelected] = useState(() => new Set());

  const pending  = tasks.filter(t => t.status === "Done" && !t.archived);
  const archived = tasks.filter(t => t.archived);
  const list = tab === "pending" ? pending : archived;

  useEffect(() => { setSelected(new Set()); }, [tab]);

  const toggle = (id) => setSelected(s => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const toggleAll = () => setSelected(s => s.size === list.length ? new Set() : new Set(list.map(t => t.id)));

  const handleDelete = () => {
    if (!selected.size) return;
    const label = tab === "pending" ? "削除" : "完全に削除";
    if (window.confirm(`選択した${selected.size}件を${label}します。よろしいですか？`)) {
      onDelete([...selected]);
      setSelected(new Set());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-cyan-500/20 bg-[#141720] shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-cyan-500/10 px-5 py-4">
          <h2 className="text-[15px] font-semibold text-[#e2e8f0]">完了タスクの整理</h2>
          <button onClick={onClose} className="rounded p-1 text-[#94a3b8] hover:bg-[#1a1d26] hover:text-[#e2e8f0]">
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="flex gap-2 px-5 pt-3">
          <button onClick={() => setTab("pending")}
            className={`rounded-lg px-3 py-1.5 text-[12px] border ${tab==="pending" ? "bg-[#002a36] text-[#48cae4] border-cyan-500/40" : "bg-[#1a1d26] text-[#94a3b8] border-cyan-500/10"}`}>
            未整理の完了タスク（{pending.length}）
          </button>
          <button onClick={() => setTab("archived")}
            className={`rounded-lg px-3 py-1.5 text-[12px] border ${tab==="archived" ? "bg-[#002a36] text-[#48cae4] border-cyan-500/40" : "bg-[#1a1d26] text-[#94a3b8] border-cyan-500/10"}`}>
            アーカイブ済み（{archived.length}）
          </button>
        </div>

        <p className="px-5 pt-3 text-[11px] text-[#475569]">
          {tab === "pending"
            ? "完了にしたタスクのうち、まだアーカイブ・削除の判断をしていないものです。"
            : "アーカイブされたタスクです。ボードには表示されません。"}
        </p>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {list.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-[#475569]">
              <Icon name="inbox" size={28} className="mx-auto mb-2 opacity-40" />
              {tab === "pending" ? "整理が必要な完了タスクはありません" : "アーカイブ済みタスクはありません"}
            </div>
          ) : (
            <>
              <label className="mb-2 flex items-center gap-2 text-[12px] text-[#94a3b8]">
                <input type="checkbox" checked={selected.size === list.length} onChange={toggleAll} />
                すべて選択（{list.length}件）
              </label>
              <div className="space-y-1.5">
                {list.map(t => (
                  <label key={t.id} className="flex items-center gap-2 rounded-lg border border-cyan-500/10 bg-[#1a1d26] px-3 py-2 cursor-pointer">
                    <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)} />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-[#e2e8f0]">{t.title}</span>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium ${PRI[t.priority]?.badge || ""}`}>{PRI_LABEL[t.priority] || t.priority}</span>
                    {t.dueDate && <span className="shrink-0 text-[10px] text-[#475569]">{t.dueDate}</span>}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-cyan-500/10 px-5 py-4">
          <button disabled={!selected.size} onClick={handleDelete}
            className="rounded-lg border border-red-500/30 px-4 py-2 text-[13px] text-red-300 hover:bg-red-950/30 disabled:opacity-40 disabled:cursor-not-allowed">
            {tab === "pending" ? "選択を削除" : "完全に削除"}
          </button>
          {tab === "pending" ? (
            <button disabled={!selected.size} onClick={() => { onArchive([...selected]); setSelected(new Set()); }}
              className="rounded-lg bg-[#00b4d8] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#0096b4] disabled:opacity-40 disabled:cursor-not-allowed">
              選択をアーカイブ
            </button>
          ) : (
            <button disabled={!selected.size} onClick={() => { onRestore([...selected]); setSelected(new Set()); }}
              className="rounded-lg bg-[#00b4d8] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#0096b4] disabled:opacity-40 disabled:cursor-not-allowed">
              復元
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== MAIN APP =====
export default function App() {
  // ── 認証状態 ──────────────────────────────────────────────
  const [user,      setUser]      = useState(undefined); // undefined=確認中, null=未ログイン, object=ログイン済み
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    // 初回：現在のセッションを確認
    getSession().then(session => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });
    // 以降：認証状態の変化を監視
    const unsub = onAuthChange(u => { setUser(u); setAuthReady(true); });
    return unsub;
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
  };

  // ── State ──────────────────────────────────────────────────
  const [tasks, setTasksState] = useState(() => {
    try { const s = localStorage.getItem("tasks"); return s ? JSON.parse(s) : DEFAULTS; }
    catch { return DEFAULTS; }
  });
  const [syncing,   setSyncing]   = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [showBackup, setShowBackup] = useState(false);
  const [showSharedSettings, setShowSharedSettings] = useState(false);
  const [doneChoice,  setDoneChoice]  = useState(null); // 完了に変更された直後のタスク（アーカイブ/削除を選ぶトースト）
  const [showCleanup, setShowCleanup] = useState(false); // 完了タスク整理モーダル

  // ── テーマ・共有設定初期適用 ──
  const [sharedSettings, setSharedSettingsState] = useState(() => loadSharedSettings());
  useEffect(() => {
    applyThemeToDocument(sharedSettings.theme || "cyan-dark");
  }, []);

  // ── Undo（削除取り消し）──
  const [undoTask,    setUndoTask]    = useState(null);  // 直前に削除したタスク
  const [undoVisible, setUndoVisible] = useState(false); // トースト表示中
  const undoTimerRef = useRef(null);

  const [view,         setView]         = useState("kanban");
  const [modal,        setModal]        = useState(null);
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPri,    setFilterPri]    = useState("");
  const [sortKey,      setSortKey]      = useState("");
  const [sortDir,      setSortDir]      = useState("asc");

  // ── localStorage + Supabase 二重保存 ──────────────────────
  const setTasks = useCallback((updater) => {
    setTasksState(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      // localStorage に即時保存
      try { localStorage.setItem("tasks", JSON.stringify(next)); } catch {}
      // Supabase にバックグラウンド同期
      if (supabase) {
        supabase.from("tasks").upsert(next.map(toDbTask))
          .then(({ error }) => {
            if (error) console.warn("[Supabase] upsert失敗:", error.message);
          });
      }
      return next;
    });
  }, []);

  // タスク削除（Supabaseからも削除）
  const delFromSupabase = useCallback((id) => {
    if (!supabase) return;
    supabase.from("tasks").delete().eq("id", id)
      .then(({ error }) => {
        if (error) console.warn("[Supabase] delete失敗:", error.message);
      });
  }, []);

  // ── 初回マウント：Supabase → localStorage マージ ──────────
  useEffect(() => {
    if (!supabase) return;
    setSyncing(true);
    setSyncError(null);

    (async () => {
      try {
        const { data: remote, error } = await supabase
          .from("tasks")
          .select("*")
          .order("order_index", { ascending: true });

        if (error) throw error;

        const localTasks = (() => {
          try { const s = localStorage.getItem("tasks"); return s ? JSON.parse(s) : DEFAULTS; }
          catch { return DEFAULTS; }
        })();

        const remoteMapped = (remote ?? []).map(fromDbTask);
        const merged = mergeByUpdatedAt(localTasks, remoteMapped);
        setTasksState(merged);
        try { localStorage.setItem("tasks", JSON.stringify(merged)); } catch {}

        // ローカルのみ存在するタスクをSupabaseに書き戻す
        const remoteIds = new Set((remote ?? []).map(r => r.id));
        const localOnly = localTasks.filter(t => !remoteIds.has(t.id));
        if (localOnly.length > 0) {
          await supabase.from("tasks").upsert(localOnly.map(toDbTask));
        }
      } catch (err) {
        console.warn("[Supabase] 初回同期失敗（ローカルで継続）:", err.message);
        setSyncError(err.message);
      } finally {
        setSyncing(false);
      }
    })();
  }, []);

  // ── タスク操作 ─────────────────────────────────────────────
  // 完了への変更を検知して、アーカイブ/削除の選択トーストを出す
  const checkDoneTransition = (id, prevStatus, newStatus, title) => {
    if (newStatus === "Done" && prevStatus !== "Done" && id) {
      setDoneChoice({ id, title: title || "" });
    }
  };

  const save = t => {
    const existing = t.id ? tasks.find(x => x.id === t.id) : null;
    setTasks(ts => t.id && ts.find(x => x.id === t.id)
      ? ts.map(x => x.id === t.id ? { ...t, updatedAt: Date.now() } : x)
      : [...ts, { ...t, id: genId(), order: ts.length, archived: false, createdAt: Date.now(), updatedAt: Date.now() }]);
    setModal(null);
    if (existing) checkDoneTransition(existing.id, existing.status, t.status, t.title);
  };

  const del = id => {
    const target = tasks.find(t => t.id === id);
    if (!target) return;
    // 削除実行
    setTasks(ts => ts.filter(t => t.id !== id));
    delFromSupabase(id);
    // Undoスタックに積む
    setUndoTask(target);
    setUndoVisible(true);
    // 既存タイマーをリセット
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => {
      setUndoVisible(false);
      setUndoTask(null);
    }, 6000); // 6秒以内なら元に戻せる
  };

  // ── 完了タスクのアーカイブ / 復元 / 一括削除 ──
  const archiveTasks = (ids) => {
    const idSet = new Set(ids);
    setTasks(ts => ts.map(t => idSet.has(t.id) ? { ...t, archived: true, updatedAt: Date.now() } : t));
  };

  const restoreTasks = (ids) => {
    const idSet = new Set(ids);
    setTasks(ts => ts.map(t => idSet.has(t.id) ? { ...t, archived: false, updatedAt: Date.now() } : t));
  };

  const deleteTasksBulk = (ids) => {
    ids.forEach(id => delFromSupabase(id));
    setTasks(ts => ts.filter(t => !ids.includes(t.id)));
  };

  const handleUndo = () => {
    if (!undoTask) return;
    // タスクを復元
    setTasks(ts => [...ts, { ...undoTask, updatedAt: Date.now() }]);
    if (supabase && sbEnabled) {
      supabase.from("tasks").upsert(toDbTask({ ...undoTask, updatedAt: Date.now() }));
    }
    setUndoVisible(false);
    setUndoTask(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  };

  // ── ステータス変更を伴う移動（列またぎ） ──
  const move = (id, status, targetId, pos) => {
    const prevTask = tasks.find(t => t.id === id);
    setTasks(ts => {
      // 移動先ステータスのタスク一覧（移動元タスクは除外）
      const destTasks = ts
        .filter(t => t.status === status && t.id !== id)
        .sort((a,b) => (a.order??0)-(b.order??0));

      // 挿入位置を決定
      let insertIdx = destTasks.length; // デフォルト：末尾
      if (targetId) {
        const targetIdx = destTasks.findIndex(t => t.id === targetId);
        if (targetIdx >= 0) {
          insertIdx = pos === "after" ? targetIdx + 1 : targetIdx;
        }
      }

      // 挿入後の並び順を作成
      const newOrder = [...destTasks];
      newOrder.splice(insertIdx, 0, { id }); // プレースホルダーとして挿入

      // 全タスクにorderを振り直し
      const orderMap = {};
      newOrder.forEach((t, i) => { orderMap[t.id] = i; });

      return ts.map(t => {
        if (t.id === id) return { ...t, status, order: orderMap[id] ?? insertIdx, updatedAt: Date.now() };
        if (t.status === status && orderMap[t.id] !== undefined) return { ...t, order: orderMap[t.id] };
        return t;
      });
    });
    checkDoneTransition(id, prevTask?.status, status, prevTask?.title);
  };

  // ── 同ステータス内の並び替え（グループ内・列またぎ含む） ──
  const reorder = (dragId, targetId, pos, status) => {
    if (dragId === targetId) return;
    setTasks(ts => {
      // 同ステータスのタスクをorderで並べる
      const colTasks = ts
        .filter(t => t.status === status)
        .sort((a,b) => (a.order??0)-(b.order??0));

      const fromIdx = colTasks.findIndex(t => t.id === dragId);
      if (fromIdx < 0) return ts;

      // ドラッグ元を取り除いた配列
      const without = [...colTasks];
      without.splice(fromIdx, 1);

      // 挿入位置を決定
      let insertIdx = without.length; // デフォルト：末尾
      if (targetId) {
        const targetIdx = without.findIndex(t => t.id === targetId);
        if (targetIdx >= 0) {
          insertIdx = pos === "after" ? targetIdx + 1 : targetIdx;
        }
      }

      // 挿入
      without.splice(insertIdx, 0, colTasks[fromIdx]);

      // orderを0始まりで振り直し
      const orderMap = {};
      without.forEach((t, i) => { orderMap[t.id] = i; });

      return ts.map(t =>
        t.status === status && orderMap[t.id] !== undefined
          ? { ...t, order: orderMap[t.id] }
          : t
      );
    });
  };

  const statusChange = (id, status) => {
    const prevTask = tasks.find(t => t.id === id);
    setTasks(ts => ts.map(t => t.id===id ? {...t, status, updatedAt: Date.now()} : t));
    checkDoneTransition(id, prevTask?.status, status, prevTask?.title);
  };

  const toggleSort = key => {
    if(sortKey === key) setSortDir(d => d==="asc"?"desc":"asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = tasks.filter(t => {
    const q = search.toLowerCase();
    return !t.archived
      && (!q || t.title.toLowerCase().includes(q) || (t.description||"").toLowerCase().includes(q))
      && (!filterStatus || t.status === filterStatus)
      && (!filterPri || t.priority === filterPri);
  });

  const navItems = [
    { id:"kanban",    label:"ボード",        icon:"layout-kanban", featureKey:null },
    { id:"list",      label:"リスト",        icon:"list",          featureKey:null },
    { id:"dashboard", label:"ダッシュボード", icon:"chart-bar",     featureKey:"showDashboard" },
  ].filter(n => n.featureKey === null || sharedSettings[n.featureKey] !== false);

  // ── ログイン確認中 / 未ログイン ───────────────────────────
  if (!authReady || user === undefined) {
    return <div style={{minHeight:"100vh", background:"#0d0f12", display:"flex", alignItems:"center", justifyContent:"center"}}><div style={{width:32,height:32,borderRadius:"50%",border:"2.5px solid rgba(0,180,216,0.2)",borderTopColor:"#00b4d8",animation:"spin 0.8s linear infinite"}} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
  }
  if (!sbEnabled || user === null) {
    return <LoginScreen onLogin={u => setUser(u)} />;
  }

  return (
    <div className="min-h-screen" style={{background:"#0d0f12", fontFamily:"'Noto Sans JP','Inter',system-ui,sans-serif"}}>
      {/* NAV */}
      <nav style={{background:"#141720", borderBottom:"0.5px solid rgba(0,180,216,0.15)"}}
        className="sticky top-0 z-40 flex h-12 items-center px-5 gap-0">
        <span className="mr-5 text-[15px] font-semibold shrink-0" style={{fontFamily:"'Inter',sans-serif", letterSpacing:"-0.3px"}}>
          Task<span style={{color:"#00b4d8"}}>Board</span>
        </span>
        {navItems.map(n => (
          <button key={n.id} onClick={() => setView(n.id)}
            className="flex h-12 items-center gap-1.5 px-3 text-[13px] transition-colors border-b-2"
            style={{
              color: view===n.id ? "#48cae4" : "#94a3b8",
              borderBottomColor: view===n.id ? "#00b4d8" : "transparent",
              fontWeight: view===n.id ? 500 : 400,
              borderRadius: 0, background: "none",
              borderLeft:"none", borderRight:"none", borderTop:"none"
            }}>
            <Icon name={n.icon} size={15} />
            <span className="hidden sm:inline">{n.label}</span>
          </button>
        ))}
        {sharedSettings.showPlanner !== false && (
        <a href="/planner.html"
          className="flex h-12 items-center gap-1.5 px-3 text-[13px] border-b-2 ml-0"
          style={{color:"#94a3b8", borderBottomColor:"transparent", borderRadius:0}}>
          <Icon name="calendar-event" size={15} />
          <span className="hidden sm:inline">Day Planner</span>
        </a>
        )}
        <div className="ml-auto flex items-center gap-3">
          {/* 同期ステータス表示 */}
          <SyncIndicator syncing={syncing} syncError={syncError} />
          {/* ユーザー情報 */}
          <span className="hidden sm:inline text-[11px]" style={{color:"#475569", maxWidth:140, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{user?.email}</span>
          {/* 設定ボタン */}
          <button onClick={() => setShowSharedSettings(true)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] transition-colors"
            style={{background:"#1a1d26", border:"0.5px solid rgba(0,180,216,0.20)", color:"#94a3b8"}}
            title="設定">
            <Icon name="settings" size={14} /><span className="hidden sm:inline">設定</span>
          </button>
          {/* 完了タスクの整理ボタン */}
          <button onClick={() => setShowCleanup(true)}
            className="hidden sm:flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] transition-colors relative"
            style={{background:"#1a1d26", border:"0.5px solid rgba(0,180,216,0.20)", color:"#94a3b8"}}>
            <Icon name="archive" size={14} /> 整理
            {tasks.filter(t => t.status === "Done" && !t.archived).length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-semibold text-white">
                {tasks.filter(t => t.status === "Done" && !t.archived).length}
              </span>
            )}
          </button>
          {/* バックアップボタン */}
          {sharedSettings.showBackupBtn !== false && (
          <button onClick={() => setShowBackup(true)}
            className="hidden sm:flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] transition-colors"
            style={{background:"#1a1d26", border:"0.5px solid rgba(0,180,216,0.20)", color:"#94a3b8"}}>
            <Icon name="database-export" size={14} /> バックアップ
          </button>
          )}
          {/* ログアウト */}
          <button onClick={handleSignOut}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] transition-colors"
            style={{background:"#1a1d26", border:"0.5px solid rgba(0,180,216,0.20)", color:"#94a3b8"}}
            title="ログアウト">
            <Icon name="logout" size={14} /><span className="hidden sm:inline">ログアウト</span>
          </button>
          <button onClick={() => setModal({})}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-white"
            style={{background:"#00b4d8"}}>
            <Icon name="plus" size={14} /> タスクを追加
          </button>
        </div>
      </nav>

      {/* FILTERS */}
      {view !== "dashboard" && (
        <div className="px-5 py-3 flex flex-wrap items-center gap-2" style={{borderBottom:"0.5px solid rgba(0,180,216,0.10)"}}>
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:"#475569"}} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="検索…"
              className="w-full rounded-lg pl-8 pr-3 py-1.5 text-[13px] outline-none"
              style={{background:"#1a1d26", border:"0.5px solid rgba(0,180,216,0.20)", color:"#e2e8f0"}} />
          </div>
          {[["",  "すべて"], ...STATUSES.map(s=>[s,STATUS_LABEL[s]||s])].map(([v,l]) => (
            <button key={v+l} onClick={() => setFilterStatus(v)}
              className="rounded-lg px-3 py-1.5 text-[12px] transition-colors"
              style={{
                background: filterStatus===v ? "#002a36" : "#1a1d26",
                color: filterStatus===v ? "#48cae4" : "#94a3b8",
                border: `0.5px solid ${filterStatus===v ? "rgba(124,111,205,0.4)" : "rgba(124,111,205,0.15)"}`,
              }}>{l}</button>
          ))}
          <div className="w-px h-5" style={{background:"rgba(124,111,205,0.15)"}} />
          {[["","すべて"],...PRIORITIES.map(p=>[p,PRI_LABEL[p]||p])].map(([v,l]) => (
            <button key={v+l} onClick={() => setFilterPri(v)}
              className="rounded-lg px-3 py-1.5 text-[12px] transition-colors"
              style={{
                background: filterPri===v ? "#002a36" : "#1a1d26",
                color: filterPri===v ? "#48cae4" : "#94a3b8",
                border: `0.5px solid ${filterPri===v ? "rgba(124,111,205,0.4)" : "rgba(124,111,205,0.15)"}`,
              }}>{l}</button>
          ))}
          <div className="w-px h-5" style={{background:"rgba(124,111,205,0.15)"}} />
          <span style={{fontSize:"11px",color:"#475569",flexShrink:0}}>並び替え:</span>
          {[
            {key:"priority", label:"優先度"},
            {key:"title",    label:"名前"},
            {key:"dueDate",  label:"期日"},
            {key:"createdAt",label:"作成日"},
          ].map(({key,label}) => (
            <button key={key} onClick={() => toggleSort(key)}
              className="rounded-lg px-2.5 py-1.5 text-[12px] transition-colors flex items-center gap-1"
              style={{
                background: sortKey===key ? "#002a36" : "#1a1d26",
                color: sortKey===key ? "#48cae4" : "#94a3b8",
                border: `0.5px solid ${sortKey===key ? "rgba(124,111,205,0.4)" : "rgba(124,111,205,0.15)"}`,
              }}>
              {label}
              {sortKey===key && <Icon name={sortDir==="asc"?"arrow-up":"arrow-down"} size={11} />}
            </button>
          ))}
          <span className="ml-auto text-[11px]" style={{color:"#475569"}}>{filtered.length}件</span>
        </div>
      )}

      {/* CONTENT */}
      <main className="p-4">
        {view === "kanban"    && <KanbanView    tasks={filtered} onEdit={t => setModal(t)} onDelete={del} onMove={move} onReorder={reorder} sortKey={sortKey} sortDir={sortDir} />}
        {view === "list"      && <ListView      tasks={filtered} onEdit={t => setModal(t)} onDelete={del} onStatusChange={statusChange} />}
        {view === "dashboard" && <Dashboard     tasks={tasks.filter(t => !t.archived)} />}
      </main>

      {modal !== null && <Modal task={Object.keys(modal).length ? modal : null} onSave={save} onClose={() => setModal(null)} />}
      {showBackup && (
        <BackupModal
          tasks={tasks}
          onRestore={restoredTasks => {
            setTasksState(restoredTasks);
            setShowBackup(false);
          }}
          onClose={() => setShowBackup(false)}
        />
      )}
      {showCleanup && (
        <CleanupModal
          tasks={tasks}
          onArchive={archiveTasks}
          onRestore={restoreTasks}
          onDelete={deleteTasksBulk}
          onClose={() => setShowCleanup(false)}
        />
      )}
      {/* 付箋パネル */}
      {sharedSettings.showSticky !== false && <StickyPanel user={user} />}
      {/* 共有設定モーダル */}
      {showSharedSettings && <SharedSettingsModal onClose={() => {
        setShowSharedSettings(false);
        setSharedSettingsState(loadSharedSettings());
      }} />}

      {/* 削除Undoトースト */}
      {undoVisible && undoTask && (
        <div style={{
          position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)",
          background:"#1a1d26", border:"0.5px solid rgba(0,180,216,0.35)",
          borderRadius:10, padding:"10px 16px",
          display:"flex", alignItems:"center", gap:12,
          boxShadow:"0 4px 24px rgba(0,0,0,0.5)",
          zIndex:2000, whiteSpace:"nowrap",
          animation:"slideUp 0.2s ease",
        }}>
          <i className="ti ti-trash" style={{fontSize:15, color:"#f87171"}} />
          <span style={{fontSize:13, color:"#e2e8f0"}}>
            「{undoTask.title.length > 20 ? undoTask.title.slice(0,20)+"…" : undoTask.title}」を削除しました
          </span>
          <button onClick={handleUndo} style={{
            padding:"4px 14px", borderRadius:6,
            background:"rgba(0,180,216,0.15)", border:"0.5px solid rgba(0,180,216,0.4)",
            color:"#48cae4", fontSize:12, fontWeight:500, cursor:"pointer",
            transition:"background 0.12s",
          }}>元に戻す</button>
          <button onClick={() => { setUndoVisible(false); setUndoTask(null); }} style={{
            background:"none", border:"none", color:"#475569", cursor:"pointer", fontSize:16, lineHeight:1,
          }}>×</button>
        </div>
      )}
      <style>{`@keyframes slideUp { from { opacity:0; transform:translateX(-50%) translateY(12px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>

      {/* 完了→アーカイブ/削除選択トースト */}
      {doneChoice && (
        <div style={{
          position:"fixed", bottom: undoVisible && undoTask ? 92 : 28, left:"50%", transform:"translateX(-50%)",
          background:"#1a1d26", border:"0.5px solid rgba(16,185,129,0.35)",
          borderRadius:10, padding:"10px 16px",
          display:"flex", alignItems:"center", gap:10,
          boxShadow:"0 4px 24px rgba(0,0,0,0.5)",
          zIndex:2000, whiteSpace:"nowrap",
          animation:"slideUp 0.2s ease",
        }}>
          <Icon name="circle-check" size={15} className="text-emerald-400" />
          <span style={{fontSize:13, color:"#e2e8f0"}}>
            「{doneChoice.title.length > 16 ? doneChoice.title.slice(0,16)+"…" : doneChoice.title}」を完了にしました
          </span>
          <button onClick={() => { archiveTasks([doneChoice.id]); setDoneChoice(null); }} style={{
            padding:"4px 12px", borderRadius:6,
            background:"rgba(0,180,216,0.15)", border:"0.5px solid rgba(0,180,216,0.4)",
            color:"#48cae4", fontSize:12, fontWeight:500, cursor:"pointer",
          }}>アーカイブ</button>
          <button onClick={() => { del(doneChoice.id); setDoneChoice(null); }} style={{
            padding:"4px 12px", borderRadius:6,
            background:"rgba(239,68,68,0.15)", border:"0.5px solid rgba(239,68,68,0.4)",
            color:"#f87171", fontSize:12, fontWeight:500, cursor:"pointer",
          }}>削除</button>
          <button onClick={() => setDoneChoice(null)} style={{
            background:"none", border:"none", color:"#94a3b8", cursor:"pointer", fontSize:12,
          }}>あとで</button>
        </div>
      )}
    </div>
  );
}
