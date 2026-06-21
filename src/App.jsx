import { useState, useRef, useEffect, useCallback } from "react";

// ===== DESIGN TOKENS (案C: ダーク + パープルアクセント) =====
// bg:      #13131f / #1c1c2e / #25253a
// accent:  #7c6fcd (primary), #c4bef5 (text), #2d2b55 (bg)
// green:   #1D9E75 / #5DCAA5 / #0d3326
// amber:   #EF9F27 / #FAC775 / #3a2200
// red:     #E24B4A / #F09595 / #3a0e0e
// font:    Noto Sans JP + Inter
// icons:   Tabler outline

const STATUSES = ["Todo", "In Progress", "Done"];
const PRIORITIES = ["High", "Medium", "Low"];
const STATUS_LABEL = {"Todo":"未着手", "In Progress":"進行中", "Done":"完了"};
const PRI_LABEL = {"High":"高", "Medium":"中", "Low":"低"};

const PRI = {
  High:   { ring: "border-l-red-400",    badge: "bg-red-950/60 text-red-300 border border-red-500/30",    dot: "bg-red-400"    },
  Medium: { ring: "border-l-amber-400",  badge: "bg-amber-950/60 text-amber-300 border border-amber-500/30", dot: "bg-amber-400" },
  Low:    { ring: "border-l-violet-400", badge: "bg-violet-950/60 text-violet-300 border border-violet-500/30", dot: "bg-violet-400" },
};

const STA = {
  "Todo":        { header: "text-slate-300",   accent: "border-slate-600",   bg: "bg-slate-800/40",   badge: "bg-slate-800 text-slate-300 border border-slate-600/50" },
  "In Progress": { header: "text-violet-300",  accent: "border-violet-500",  bg: "bg-violet-950/30",  badge: "bg-violet-950/70 text-violet-300 border border-violet-500/40" },
  "Done":        { header: "text-emerald-300", accent: "border-emerald-500", bg: "bg-emerald-950/20", badge: "bg-emerald-950/60 text-emerald-300 border border-emerald-500/40" },
};

const genId = () => `t-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;

const DEFAULTS = [
  { id: genId(), title: "UIデザインのレビュー",    description: "カラーパレットとフォントの確認", status: "Todo",        priority: "High",   dueDate: "", estHours: 2, actHours: 0, order: 0, createdAt: Date.now() - 86400000*2 },
  { id: genId(), title: "APIエンドポイントの実装", description: "RESTful APIの設計と実装",      status: "In Progress", priority: "High",   dueDate: "", estHours: 4, actHours: 2, order: 1, createdAt: Date.now() - 86400000 },
  { id: genId(), title: "ユーザーテストの実施",    description: "5名のユーザーにヒアリング",    status: "In Progress", priority: "Medium", dueDate: "", estHours: 3, actHours: 0, order: 2, createdAt: Date.now() - 86400000 },
  { id: genId(), title: "ドキュメントの整備",      description: "README と API仕様書の更新",   status: "Done",        priority: "Low",    dueDate: "", estHours: 2, actHours: 2, order: 3, createdAt: Date.now() - 86400000*3 },
];

// ===== TABLER ICON COMPONENTS =====
const Icon = ({ name, size = 16, className = "" }) => (
  <i className={`ti ti-${name} ${className}`} style={{ fontSize: size }} aria-hidden="true" />
);

// ===== MODAL =====
function Modal({ task, onSave, onClose }) {
  const [form, setForm] = useState(task || { title:"", description:"", status:"Todo", priority:"Medium", dueDate:"", estHours:"", actHours:"" });
  const up = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-violet-500/20 bg-[#1c1c2e] p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-[#e2e0ff]">{task ? "タスクを編集" : "タスクを追加"}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-[#9d9bbf] hover:bg-[#25253a] hover:text-[#e2e0ff]">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[#9d9bbf]">タイトル</label>
            <input value={form.title} onChange={up("title")} placeholder="タスク名を入力"
              className="w-full rounded-lg border border-violet-500/20 bg-[#25253a] px-3 py-2 text-[13px] text-[#e2e0ff] placeholder-[#5e5c80] outline-none focus:border-violet-400/50 focus:ring-1 focus:ring-violet-400/30" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[#9d9bbf]">詳細</label>
            <textarea value={form.description} onChange={up("description")} rows={3} placeholder="詳細・メモ"
              className="w-full rounded-lg border border-violet-500/20 bg-[#25253a] px-3 py-2 text-[13px] text-[#e2e0ff] placeholder-[#5e5c80] outline-none focus:border-violet-400/50 focus:ring-1 focus:ring-violet-400/30 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#9d9bbf]">ステータス</label>
              <select value={form.status} onChange={up("status")}
                className="w-full rounded-lg border border-violet-500/20 bg-[#25253a] px-3 py-2 text-[13px] text-[#e2e0ff] outline-none focus:border-violet-400/50">
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]||s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#9d9bbf]">優先度</label>
              <select value={form.priority} onChange={up("priority")}
                className="w-full rounded-lg border border-violet-500/20 bg-[#25253a] px-3 py-2 text-[13px] text-[#e2e0ff] outline-none focus:border-violet-400/50">
                {PRIORITIES.map(p => <option key={p} value={p}>{PRI_LABEL[p]||p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#9d9bbf]">期日</label>
              <input type="date" value={form.dueDate} onChange={up("dueDate")}
                className="w-full rounded-lg border border-violet-500/20 bg-[#25253a] px-3 py-2 text-[13px] text-[#e2e0ff] outline-none focus:border-violet-400/50" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#9d9bbf]">見積(h)</label>
              <input type="number" min="0" step="0.5" value={form.estHours} onChange={up("estHours")}
                className="w-full rounded-lg border border-violet-500/20 bg-[#25253a] px-3 py-2 text-[13px] text-[#e2e0ff] outline-none focus:border-violet-400/50" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#9d9bbf]">実績(h)</label>
              <input type="number" min="0" step="0.5" value={form.actHours} onChange={up("actHours")}
                className="w-full rounded-lg border border-violet-500/20 bg-[#25253a] px-3 py-2 text-[13px] text-[#e2e0ff] outline-none focus:border-violet-400/50" />
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-violet-500/20 px-4 py-2 text-[13px] text-[#9d9bbf] hover:bg-[#25253a]">キャンセル</button>
          <button onClick={() => { if(form.title.trim()) onSave(form); }}
            className="rounded-lg bg-violet-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-violet-500">保存</button>
        </div>
      </div>
    </div>
  );
}

// ===== TASK CARD (コンパクト版) =====
function TaskCard({ task, onEdit, onDelete, onDragStart, onDragEnd, isDragging }) {
  const overdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "Done";
  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = "move"; onDragStart(task.id); }}
      onDragEnd={onDragEnd}
      onClick={() => onEdit(task)}
      className={`group relative cursor-pointer rounded-md border-l-[3px]
        bg-[#1c1c2e] border border-violet-500/10
        p-2 transition-all hover:border-violet-400/30 hover:bg-[#25253a]
        ${PRI[task.priority]?.ring || "border-l-slate-500"}
        ${isDragging ? "opacity-40 scale-95" : "opacity-100"}`}
    >
      <div className="flex items-start justify-between gap-1 mb-1">
        <p className={`text-[12px] font-medium leading-snug flex-1 min-w-0 ${task.status === "Done" ? "line-through text-[#5e5c80]" : "text-[#e2e0ff]"}`}>
          {task.title}
        </p>
        <button onClick={e => { e.stopPropagation(); onDelete(task.id); }}
          className="hidden shrink-0 rounded p-0.5 text-[#5e5c80] hover:bg-red-950/50 hover:text-red-400 group-hover:flex">
          <Icon name="trash" size={11} />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <span className={`rounded px-1 py-0.5 text-[9px] font-medium ${PRI[task.priority]?.badge || ""}`}>{PRI_LABEL[task.priority]||task.priority}</span>
        {task.dueDate && (
          <span className={`flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] ${overdue ? "bg-red-950/60 text-red-300 border border-red-500/30" : "bg-[#25253a] text-[#9d9bbf] border border-violet-500/10"}`}>
            <Icon name="calendar" size={9} />{task.dueDate}
          </span>
        )}
        {(task.estHours||task.actHours) ? (
          <span className="flex items-center gap-0.5 rounded border border-violet-500/10 bg-[#25253a] px-1 py-0.5 text-[9px] text-[#9d9bbf]">
            <Icon name="clock" size={9} />{task.actHours||0}/{task.estHours||0}h
          </span>
        ) : null}
      </div>
    </div>
  );
}

// ===== KANBAN =====
// overInfo: { id: カードID, pos: "before"|"after" } でドロップ位置を管理
function KanbanView({ tasks, onEdit, onDelete, onMove, onReorder, sortKey, sortDir }) {
  const [draggingId, setDraggingId] = useState(null);
  const [overInfo, setOverInfo] = useState(null); // {col, cardId, pos}

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

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {STATUSES.map(st => {
        const col = STA[st];
        const colTasks = sortTasks(tasks.filter(t => t.status === st));
        return (
          <div key={st}
            className={`min-h-[200px] rounded-xl border ${col.accent} ${col.bg} p-3 transition-colors`}
            onDragOver={e => handleColDragOver(e, st)}
            onDragLeave={e => { if(!e.currentTarget.contains(e.relatedTarget)) setOverInfo(null); }}
            onDrop={e => handleDrop(e, st, null)}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className={`text-[13px] font-semibold ${col.header}`}>{STATUS_LABEL[st]||st}</span>
              <span className="rounded-full bg-[#25253a] border border-violet-500/10 px-2 py-0.5 text-[11px] text-[#9d9bbf]">{colTasks.length}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {colTasks.map(t => {
                const isOver = overInfo && overInfo.cardId === t.id && draggingId !== t.id;
                return (
                  <div key={t.id}
                    style={{
                      borderTop: isOver && overInfo.pos==="before" ? "2px solid #7c6fcd" : "2px solid transparent",
                      borderBottom: isOver && overInfo.pos==="after" ? "2px solid #7c6fcd" : "2px solid transparent",
                    }}
                    onDragOver={e => handleCardDragOver(e, st, t.id)}
                    onDragLeave={e => { if(!e.currentTarget.contains(e.relatedTarget)) setOverInfo(o => o?.cardId===t.id ? null : o); }}
                    onDrop={e => handleDrop(e, st, t.id)}
                  >
                    <TaskCard task={t} onEdit={onEdit} onDelete={onDelete}
                      onDragStart={id => { setDraggingId(id); }}
                      onDragEnd={() => { setDraggingId(null); setOverInfo(null); }}
                      isDragging={draggingId === t.id} />
                  </div>
                );
              })}
              {overInfo && overInfo.col===st && !overInfo.cardId && (
                <div style={{height:"2px", background:"#7c6fcd", borderRadius:"1px", margin:"2px 0"}} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ===== LIST VIEW =====
function ListView({ tasks, onEdit, onDelete, onStatusChange }) {
  return (
    <div className="rounded-xl border border-violet-500/15 bg-[#1c1c2e] overflow-hidden">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-violet-500/15">
            {["タイトル","ステータス","優先度","期日","見積","実績",""].map((h,i) => (
              <th key={i} className="px-4 py-3 text-left text-[11px] font-medium text-[#9d9bbf]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tasks.sort((a,b) => a.order - b.order).map(t => (
            <tr key={t.id} className="border-b border-violet-500/10 hover:bg-[#25253a] cursor-pointer transition-colors" onClick={() => onEdit(t)}>
              <td className="px-4 py-3">
                <span className={`font-medium ${t.status==="Done" ? "line-through text-[#5e5c80]" : "text-[#e2e0ff]"}`}>{t.title}</span>
                {t.description && <p className="text-[11px] text-[#5e5c80] mt-0.5 line-clamp-1">{t.description}</p>}
              </td>
              <td className="px-4 py-3">
                <select value={t.status} onClick={e => e.stopPropagation()}
                  onChange={e => onStatusChange(t.id, e.target.value)}
                  className="rounded-lg border border-violet-500/20 bg-[#25253a] px-2 py-1 text-[11px] text-[#e2e0ff] outline-none focus:border-violet-400/50">
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]||s}</option>)}
                </select>
              </td>
              <td className="px-4 py-3">
                <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${PRI[t.priority]?.badge || ""}`}>{PRI_LABEL[t.priority]||t.priority}</span>
              </td>
              <td className="px-4 py-3">
                {t.dueDate ? (
                  <span className={`text-[12px] ${new Date(t.dueDate)<new Date()&&t.status!=="Done" ? "text-red-400" : "text-[#9d9bbf]"}`}>{t.dueDate}</span>
                ) : <span className="text-[#5e5c80]">—</span>}
              </td>
              <td className="px-4 py-3 text-[#9d9bbf]">{t.estHours ? `${t.estHours}h` : "—"}</td>
              <td className="px-4 py-3 text-[#9d9bbf]">{t.actHours ? `${t.actHours}h` : "—"}</td>
              <td className="px-4 py-3">
                <button onClick={e => { e.stopPropagation(); onDelete(t.id); }}
                  className="rounded p-1 text-[#5e5c80] hover:bg-red-950/50 hover:text-red-400">
                  <Icon name="trash" size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!tasks.length && (
        <div className="py-10 text-center text-[#5e5c80] text-[13px]">
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
  const highCount = tasks.filter(t => t.priority === "High" && t.status !== "Done").length;
  const estTotal = tasks.reduce((s,t) => s + (parseFloat(t.estHours)||0), 0);
  const actTotal = tasks.reduce((s,t) => s + (parseFloat(t.actHours)||0), 0);
  const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "Done");

  const metrics = [
    { label:"合計タスク", value: total, icon:"list", color:"text-violet-300" },
    { label:"完了", value: done, icon:"circle-check", color:"text-emerald-300" },
    { label:"進行中", value: inProg, icon:"player-play", color:"text-amber-300" },
    { label:"高優先度 (未完)", value: highCount, icon:"alert-triangle", color:"text-red-300" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {metrics.map(m => (
          <div key={m.label} className="rounded-xl border border-violet-500/10 bg-[#1c1c2e] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon name={m.icon} size={16} className={m.color} />
              <span className="text-[11px] text-[#9d9bbf]">{m.label}</span>
            </div>
            <div className={`text-2xl font-semibold ${m.color}`}>{m.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-violet-500/10 bg-[#1c1c2e] p-4">
          <div className="mb-3 text-[12px] font-medium text-[#9d9bbf] flex items-center gap-2">
            <Icon name="chart-bar" size={14} className="text-violet-400" /> 工数サマリー
          </div>
          <div className="space-y-2">
            {[["見積合計", estTotal], ["実績合計", actTotal], ["差異", actTotal - estTotal]].map(([l,v]) => (
              <div key={l} className="flex items-center justify-between">
                <span className="text-[12px] text-[#9d9bbf]">{l}</span>
                <span className={`text-[13px] font-medium ${l==="差異" ? (v>0?"text-red-300":"text-emerald-300") : "text-[#e2e0ff]"}`}>
                  {v>0&&l==="差異"?"+":""}{v.toFixed(1)}h
                </span>
              </div>
            ))}
          </div>
          {total > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-[#5e5c80] mb-1">
                <span>完了率</span><span>{Math.round(done/total*100)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-[#25253a]">
                <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{width:`${Math.round(done/total*100)}%`}} />
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-violet-500/10 bg-[#1c1c2e] p-4">
          <div className="mb-3 text-[12px] font-medium text-[#9d9bbf] flex items-center gap-2">
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

// ===== MAIN APP =====
export default function App() {
  const [tasks, setTasks] = useState(() => {
    try { const s = localStorage.getItem("tasks"); return s ? JSON.parse(s) : DEFAULTS; }
    catch { return DEFAULTS; }
  });
  const [view, setView] = useState("kanban");
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPri, setFilterPri] = useState("");
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState("asc");

  useEffect(() => {
    try { localStorage.setItem("tasks", JSON.stringify(tasks)); } catch {}
  }, [tasks]);

  const save = t => {
    setTasks(ts => t.id && ts.find(x => x.id===t.id)
      ? ts.map(x => x.id===t.id ? {...t} : x)
      : [...ts, { ...t, id: genId(), order: ts.length, createdAt: Date.now() }]);
    setModal(null);
  };

  const del = id => setTasks(ts => ts.filter(t => t.id !== id));

  const move = (id, status, targetId, pos) => {
    setTasks(ts => {
      const colTasks = ts.filter(t => t.status === status).sort((a,b) => (a.order??0)-(b.order??0));
      let insertIdx = targetId ? colTasks.findIndex(t => t.id === targetId) : colTasks.length;
      if(pos === "after" && insertIdx >= 0) insertIdx += 1;
      const baseOrder = insertIdx >= 0 ? insertIdx - 0.5 : colTasks.length;
      const updated = ts.map(t => t.id===id ? {...t, status, order: baseOrder} : t);
      const newCol = updated.filter(t => t.status === status).sort((a,b) => (a.order??0)-(b.order??0));
      const orderMap = {};
      newCol.forEach((t, i) => { orderMap[t.id] = i; });
      return updated.map(t => t.status === status && orderMap[t.id] !== undefined ? {...t, order: orderMap[t.id]} : t);
    });
  };

  const reorder = (dragId, targetId, pos, status) => {
    setTasks(ts => {
      const colTasks = ts.filter(t => t.status === status).sort((a,b) => (a.order??0)-(b.order??0));
      const fromIdx = colTasks.findIndex(t => t.id === dragId);
      let toIdx = targetId ? colTasks.findIndex(t => t.id === targetId) : colTasks.length - 1;
      if(fromIdx < 0 || toIdx < 0) return ts;
      // posに応じてafter→次のインデックスに挿入
      if(pos === "after" && targetId) toIdx = toIdx + 1;
      if(fromIdx === toIdx || fromIdx === toIdx - 1 && pos === "after") return ts;
      const reordered = [...colTasks];
      const [moved] = reordered.splice(fromIdx, 1);
      const insertAt = fromIdx < toIdx ? toIdx - 1 : toIdx;
      reordered.splice(insertAt, 0, moved);
      const orderMap = {};
      reordered.forEach((t, i) => { orderMap[t.id] = i; });
      return ts.map(t => t.status === status && orderMap[t.id] !== undefined ? {...t, order: orderMap[t.id]} : t);
    });
  };

  const statusChange = (id, status) => setTasks(ts => ts.map(t => t.id===id ? {...t, status} : t));

  const toggleSort = key => {
    if(sortKey === key) setSortDir(d => d==="asc"?"desc":"asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = tasks.filter(t => {
    const q = search.toLowerCase();
    return (!q || t.title.toLowerCase().includes(q) || (t.description||"").toLowerCase().includes(q))
      && (!filterStatus || t.status === filterStatus)
      && (!filterPri || t.priority === filterPri);
  });

  const navItems = [
    { id:"kanban",    label:"ボード",     icon:"layout-kanban" },
    { id:"list",      label:"リスト",     icon:"list"          },
    { id:"dashboard", label:"ダッシュボード", icon:"chart-bar"  },
  ];

  return (
    <div className="min-h-screen" style={{background:"#13131f", fontFamily:"'Noto Sans JP','Inter',system-ui,sans-serif"}}>
      {/* NAV */}
      <nav style={{background:"#1c1c2e", borderBottom:"0.5px solid rgba(124,111,205,0.18)"}}
        className="sticky top-0 z-40 flex h-12 items-center px-5 gap-0">
        <span className="mr-5 text-[15px] font-semibold shrink-0" style={{fontFamily:"'Inter',sans-serif", letterSpacing:"-0.3px"}}>
          Task<span style={{color:"#c4bef5"}}>Board</span>
        </span>
        {navItems.map(n => (
          <button key={n.id} onClick={() => setView(n.id)}
            className="flex h-12 items-center gap-1.5 px-3 text-[13px] transition-colors border-b-2"
            style={{
              color: view===n.id ? "#c4bef5" : "#9d9bbf",
              borderBottomColor: view===n.id ? "#7c6fcd" : "transparent",
              fontWeight: view===n.id ? 500 : 400,
              borderRadius: 0, background: "none",
              borderLeft:"none", borderRight:"none", borderTop:"none"
            }}>
            <Icon name={n.icon} size={15} />
            <span className="hidden sm:inline">{n.label}</span>
          </button>
        ))}
        <a href="/planner.html"
          className="flex h-12 items-center gap-1.5 px-3 text-[13px] border-b-2 ml-0"
          style={{color:"#9d9bbf", borderBottomColor:"transparent", borderRadius:0}}>
          <Icon name="calendar-event" size={15} />
          <span className="hidden sm:inline">Day Planner</span>
        </a>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setModal({})}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-white"
            style={{background:"#7c6fcd"}}>
            <Icon name="plus" size={14} /> タスクを追加
          </button>
        </div>
      </nav>

      {/* FILTERS */}
      {view !== "dashboard" && (
        <div className="px-5 py-3 flex flex-wrap items-center gap-2" style={{borderBottom:"0.5px solid rgba(124,111,205,0.12)"}}>
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:"#5e5c80"}} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="検索…"
              className="w-full rounded-lg pl-8 pr-3 py-1.5 text-[13px] outline-none"
              style={{background:"#25253a", border:"0.5px solid rgba(124,111,205,0.2)", color:"#e2e0ff"}} />
          </div>
          {[["",  "すべて", "filterStatus"], ...STATUSES.map(s=>[s,STATUS_LABEL[s]||s,"filterStatus"])].filter((_,i)=>i===0||i<4).map(([v,l]) => (
            <button key={v+l} onClick={() => setFilterStatus(v)}
              className="rounded-lg px-3 py-1.5 text-[12px] transition-colors"
              style={{
                background: filterStatus===v ? "#2d2b55" : "#25253a",
                color: filterStatus===v ? "#c4bef5" : "#9d9bbf",
                border: `0.5px solid ${filterStatus===v ? "rgba(124,111,205,0.4)" : "rgba(124,111,205,0.15)"}`,
              }}>{l}</button>
          ))}
          <div className="w-px h-5" style={{background:"rgba(124,111,205,0.15)"}} />
          {[["","すべて"],...PRIORITIES.map(p=>[p,PRI_LABEL[p]||p])].map(([v,l]) => (
            <button key={v+l} onClick={() => setFilterPri(v)}
              className="rounded-lg px-3 py-1.5 text-[12px] transition-colors"
              style={{
                background: filterPri===v ? "#2d2b55" : "#25253a",
                color: filterPri===v ? "#c4bef5" : "#9d9bbf",
                border: `0.5px solid ${filterPri===v ? "rgba(124,111,205,0.4)" : "rgba(124,111,205,0.15)"}`,
              }}>{l}</button>
          ))}
          <div className="w-px h-5" style={{background:"rgba(124,111,205,0.15)"}} />
          <span style={{fontSize:"11px",color:"#5e5c80",flexShrink:0}}>並び替え:</span>
          {[
            {key:"priority", label:"優先度"},
            {key:"title",    label:"名前"},
            {key:"dueDate",  label:"期日"},
            {key:"createdAt",label:"作成日"},
          ].map(({key,label}) => (
            <button key={key} onClick={() => toggleSort(key)}
              className="rounded-lg px-2.5 py-1.5 text-[12px] transition-colors flex items-center gap-1"
              style={{
                background: sortKey===key ? "#2d2b55" : "#25253a",
                color: sortKey===key ? "#c4bef5" : "#9d9bbf",
                border: `0.5px solid ${sortKey===key ? "rgba(124,111,205,0.4)" : "rgba(124,111,205,0.15)"}`,
              }}>
              {label}
              {sortKey===key && <Icon name={sortDir==="asc"?"arrow-up":"arrow-down"} size={11} />}
            </button>
          ))}
          <span className="ml-auto text-[11px]" style={{color:"#5e5c80"}}>{filtered.length}件</span>
        </div>
      )}

      {/* CONTENT */}
      <main className="p-5">
        {view === "kanban"    && <KanbanView    tasks={filtered} onEdit={t => setModal(t)} onDelete={del} onMove={move} onReorder={reorder} sortKey={sortKey} sortDir={sortDir} />}
        {view === "list"      && <ListView      tasks={filtered} onEdit={t => setModal(t)} onDelete={del} onStatusChange={statusChange} />}
        {view === "dashboard" && <Dashboard     tasks={tasks} />}
      </main>

      {modal !== null && <Modal task={Object.keys(modal).length ? modal : null} onSave={save} onClose={() => setModal(null)} />}
    </div>
  );
}
