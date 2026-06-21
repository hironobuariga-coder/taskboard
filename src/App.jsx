import { useState, useEffect, useRef } from "react";

// ── 定数 ────────────────────────────────────────────────────────────────────
const STATUSES = ["Todo", "In Progress", "Done"];
const STATUS_LABELS = { "Todo": "未着手", "In Progress": "進行中", "Done": "完了" };
const PRIORITIES = ["High", "Medium", "Low"];
const PRIORITY_LABELS = { High: "高", Medium: "中", Low: "低" };

const PRIORITY_COLORS = {
  High:   { bg: "bg-rose-500/20",  border: "border-rose-500/60",  text: "text-rose-400",  dot: "bg-rose-500"  },
  Medium: { bg: "bg-amber-500/20", border: "border-amber-500/60", text: "text-amber-400", dot: "bg-amber-500" },
  Low:    { bg: "bg-sky-500/20",   border: "border-sky-500/60",   text: "text-sky-400",   dot: "bg-sky-400"   },
};
const STATUS_COLORS = {
  "Todo":        { header: "text-slate-300",   accent: "border-slate-500",   bg: "bg-slate-800/50"   },
  "In Progress": { header: "text-violet-300",  accent: "border-violet-500",  bg: "bg-violet-900/20"  },
  "Done":        { header: "text-emerald-300", accent: "border-emerald-500", bg: "bg-emerald-900/20" },
};

const genId = () => `t-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;

const today = () => new Date().toISOString().slice(0,10);

const DEFAULT_TASKS = [
  { id: genId(), title: "UIデザインのレビュー",    description: "カラーパレットとフォントの確認",          status: "Todo",        priority: "High",   dueDate: (() => { const d=new Date(); d.setDate(d.getDate()+1); return d.toISOString().slice(0,10); })(), estHours: 2,   actHours: 0,   order: 0, createdAt: Date.now()-86400000*2 },
  { id: genId(), title: "APIエンドポイントの実装", description: "RESTful APIの設計と実装",                status: "In Progress", priority: "High",   dueDate: (() => { const d=new Date(); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10); })(), estHours: 3,   actHours: 2,   order: 0, createdAt: Date.now()-86400000   },
  { id: genId(), title: "ユーザーテストの実施",    description: "5名のユーザーにプロトタイプを試してもらう", status: "In Progress", priority: "Medium", dueDate: (() => { const d=new Date(); d.setDate(d.getDate()+5); return d.toISOString().slice(0,10); })(), estHours: 1.5, actHours: 0.5, order: 1, createdAt: Date.now()-3600000    },
  { id: genId(), title: "ドキュメント更新",        description: "README.mdの更新",                       status: "Todo",        priority: "Low",    dueDate: "",                                                                                                                                                      estHours: 1,   actHours: 0,   order: 1, createdAt: Date.now()            },
  { id: genId(), title: "バグ修正 #42",           description: "ログイン画面のバリデーション修正",          status: "Done",        priority: "High",   dueDate: (() => { const d=new Date(); d.setDate(d.getDate()-3); return d.toISOString().slice(0,10); })(), estHours: 2,   actHours: 2.5, order: 0, createdAt: Date.now()-86400000*3 },
  { id: genId(), title: "インフラ設計レビュー",    description: "",                                       status: "Todo",        priority: "Medium", dueDate: "",                                                                                                                                                      estHours: 0,   actHours: 0,   order: 2, createdAt: Date.now()            },
];

const DEFAULT_MEETINGS = [
  { id: genId(), title: "朝会",     date: today(), startTime: "09:00", durationMin: 30  },
  { id: genId(), title: "週次定例", date: today(), startTime: "14:00", durationMin: 60  },
];

const DEFAULT_CAPACITY = 8;

// ── 日付ユーティリティ ───────────────────────────────────────────────────────
function dueDateStatus(dueDate) {
  if (!dueDate) return "none";
  const now = new Date(); now.setHours(0,0,0,0);
  const due = new Date(dueDate); due.setHours(0,0,0,0);
  const diff = (due - now) / 86400000;
  if (diff < 0)  return "overdue";
  if (diff === 0) return "today";
  if (diff <= 2) return "soon";
  return "ok";
}

function formatDue(dueDate) {
  if (!dueDate) return null;
  const d = new Date(dueDate);
  return `${d.getMonth()+1}/${d.getDate()}`;
}

function formatDate(ts) {
  const d = new Date(ts);
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

function getWeekDates() {
  const now = new Date(); now.setHours(0,0,0,0);
  const dow = now.getDay();
  const mon = new Date(now); mon.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
  return Array.from({length:7}, (_,i) => { const d=new Date(mon); d.setDate(mon.getDate()+i); return d.toISOString().slice(0,10); });
}

const DAYS_JA = ["月","火","水","木","金","土","日"];

// ── DueBadge ─────────────────────────────────────────────────────────────────
function DueBadge({ dueDate, compact = false }) {
  const st = dueDateStatus(dueDate);
  const label = formatDue(dueDate);
  if (!label) return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-600">
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
      {!compact && <span>期日なし</span>}
    </span>
  );
  const styles = {
    overdue: "bg-rose-500/20 text-rose-400 border border-rose-500/50",
    today:   "bg-amber-500/20 text-amber-400 border border-amber-500/50",
    soon:    "bg-amber-500/10 text-amber-500 border border-amber-500/30",
    ok:      "bg-slate-700/60 text-slate-400 border border-slate-600/40",
  };
  const icons = {
    overdue: "⚠",
    today:   "●",
    soon:    "◐",
    ok:      "",
  };
  const suffixes = { overdue: "期限切れ", today: "今日", soon: "もうすぐ", ok: "" };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-md ${styles[st]}`}>
      {icons[st] && <span className="text-[9px]">{icons[st]}</span>}
      {label}
      {!compact && suffixes[st] && <span className="text-[10px] opacity-80">{suffixes[st]}</span>}
    </span>
  );
}

// ── TaskCard ─────────────────────────────────────────────────────────────────
function TaskCard({ task, onEdit, onDelete, isDragging, dragHandleProps }) {
  const p = PRIORITY_COLORS[task.priority];
  const dst = dueDateStatus(task.dueDate);
  const progress = task.estHours > 0 ? Math.min(100, Math.round((task.actHours / task.estHours) * 100)) : null;
  const borderColor = dst === "overdue" ? "border-rose-500/50" : dst === "today" ? "border-amber-500/40" : "border-slate-700";

  return (
    <div
      className={`group relative rounded-xl border p-3 bg-slate-800 transition-all duration-150 select-none
        ${borderColor}
        ${isDragging ? "opacity-40 scale-95 ring-2 ring-violet-500" : "hover:border-slate-500 hover:shadow-lg hover:shadow-black/30"}
      `}
    >
      {/* 優先度ストライプ */}
      <div className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-full ${p.dot}`} />

      {/* ヘッダー行 */}
      <div className="flex items-start gap-2 mb-1.5">
        {/* ドラッグハンドル */}
        <div
          {...dragHandleProps}
          className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 transition-colors"
          title="ドラッグして並び替え"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <circle cx="7" cy="5" r="1.2"/><circle cx="7" cy="10" r="1.2"/><circle cx="7" cy="15" r="1.2"/>
            <circle cx="13" cy="5" r="1.2"/><circle cx="13" cy="10" r="1.2"/><circle cx="13" cy="15" r="1.2"/>
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-slate-100 leading-snug flex-1">{task.title}</h3>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => onEdit(task)} title="編集" className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button onClick={() => onDelete(task.id)} title="削除" className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>

      {task.description && (
        <p className="text-xs text-slate-400 mb-2 line-clamp-2 leading-relaxed pl-5">{task.description}</p>
      )}

      {/* 期日バー（大きく表示） */}
      <div className="pl-5 mb-2">
        <DueBadge dueDate={task.dueDate} />
      </div>

      {/* 工数・進捗 */}
      {(task.estHours > 0 || task.actHours > 0) && (
        <div className="pl-5 mb-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-slate-500">予定 {task.estHours}h</span>
            <span className="text-xs text-slate-600">/</span>
            <span className="text-xs text-slate-400">実績 {task.actHours}h</span>
            {progress !== null && <span className="text-xs text-slate-500 ml-auto">{progress}%</span>}
          </div>
          {progress !== null && (
            <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${progress >= 100 ? "bg-emerald-500" : "bg-violet-500"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* フッター */}
      <div className="flex items-center justify-between pl-5">
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${p.bg} ${p.text} border ${p.border}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`}/>
          {PRIORITY_LABELS[task.priority]}
        </span>
        <span className="text-xs text-slate-600">{formatDate(task.createdAt)}</span>
      </div>
    </div>
  );
}

// ── KanbanColumn ──────────────────────────────────────────────────────────────
function KanbanColumn({ status, tasks, onEdit, onDelete, onDrop }) {
  const sc = STATUS_COLORS[status];
  const [dragOver, setDragOver] = useState(null); // index or "end"
  const dragInfo = useRef(null); // { taskId, fromStatus, fromIndex }

  const handleDragStart = (e, taskId, fromIndex) => {
    dragInfo.current = { taskId, fromStatus: status, fromIndex };
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("taskId", taskId);
    e.dataTransfer.setData("fromStatus", status);
  };

  const handleDragOver = (e, overIndex) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(overIndex);
  };

  const handleDrop = (e, toIndex) => {
    e.preventDefault();
    e.stopPropagation();
    const taskId    = e.dataTransfer.getData("taskId");
    const fromStatus = e.dataTransfer.getData("fromStatus");
    onDrop({ taskId, fromStatus, fromIndex: dragInfo.current?.fromIndex, toStatus: status, toIndex });
    setDragOver(null);
  };

  const handleColumnDrop = (e) => {
    e.preventDefault();
    const taskId     = e.dataTransfer.getData("taskId");
    const fromStatus = e.dataTransfer.getData("fromStatus");
    if (dragOver === null) {
      onDrop({ taskId, fromStatus, fromIndex: dragInfo.current?.fromIndex, toStatus: status, toIndex: tasks.length });
    }
    setDragOver(null);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); }}
      onDrop={handleColumnDrop}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(null); }}
      className={`flex flex-col rounded-2xl border-t-2 ${sc.accent} bg-slate-900/60 backdrop-blur-sm p-4 min-h-[320px] transition-all duration-200`}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-sm font-bold tracking-wide ${sc.header}`}>{STATUS_LABELS[status]}</h2>
        <span className="text-xs bg-slate-700 text-slate-300 rounded-full px-2 py-0.5 font-mono">{tasks.length}</span>
      </div>

      <div className="flex flex-col gap-2 flex-1">
        {tasks.map((t, i) => (
          <div key={t.id}>
            {/* ドロップインジケーター（上） */}
            <div
              onDragOver={(e) => handleDragOver(e, i)}
              onDrop={(e) => handleDrop(e, i)}
              className={`transition-all duration-150 rounded ${dragOver === i ? "h-10 bg-violet-500/10 border-2 border-dashed border-violet-500/50 mb-1" : "h-1"}`}
            />
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, t.id, i)}
              onDragEnd={() => setDragOver(null)}
            >
              <TaskCard
                task={t}
                onEdit={onEdit}
                onDelete={onDelete}
                isDragging={false}
                dragHandleProps={{}}
              />
            </div>
          </div>
        ))}

        {/* 末尾ドロップゾーン */}
        <div
          onDragOver={(e) => handleDragOver(e, "end")}
          onDrop={(e) => handleDrop(e, tasks.length)}
          className={`transition-all duration-150 rounded flex-1 min-h-[40px] flex items-center justify-center ${dragOver === "end" ? "bg-violet-500/10 border-2 border-dashed border-violet-500/50 rounded-xl" : ""}`}
        >
          {tasks.length === 0 && dragOver !== "end" && (
            <p className="text-xs text-slate-600">タスクなし</p>
          )}
          {dragOver === "end" && <span className="text-xs text-violet-400">ここにドロップ</span>}
        </div>
      </div>
    </div>
  );
}

// ── ListView ──────────────────────────────────────────────────────────────────
function ListView({ tasks, onEdit, onDelete, onStatusChange }) {
  const sorted = [...tasks].sort((a,b) => {
    const order = { overdue: 0, today: 1, soon: 2, ok: 3, none: 4 };
    return (order[dueDateStatus(a.dueDate)] ?? 4) - (order[dueDateStatus(b.dueDate)] ?? 4);
  });
  return (
    <div className="rounded-2xl bg-slate-900/60 backdrop-blur-sm border border-slate-800 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-800">
            <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">タスク</th>
            <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 hidden sm:table-cell">期日</th>
            <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 hidden sm:table-cell">ステータス</th>
            <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 hidden md:table-cell">優先度</th>
            <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 hidden lg:table-cell">予定/実績</th>
            <th className="w-16 px-4 py-3"/>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr><td colSpan={6} className="text-center text-slate-600 text-sm py-12">タスクがありません</td></tr>
          )}
          {sorted.map((task, i) => {
            const p = PRIORITY_COLORS[task.priority];
            const sc = STATUS_COLORS[task.status];
            const dst = dueDateStatus(task.dueDate);
            const rowBg = dst === "overdue" ? "bg-rose-900/10" : dst === "today" ? "bg-amber-900/10" : "";
            return (
              <tr key={task.id} className={`border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors ${rowBg}`}>
                <td className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${p.dot}`}/>
                    <div>
                      <p className="text-sm font-medium text-slate-200">{task.title}</p>
                      {task.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{task.description}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <DueBadge dueDate={task.dueDate} />
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <select
                    value={task.status}
                    onChange={(e) => onStatusChange(task.id, e.target.value)}
                    className={`text-xs rounded-lg px-2 py-1 border ${sc.accent} ${sc.header} bg-slate-800 cursor-pointer focus:outline-none focus:ring-1 focus:ring-violet-500`}
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.bg} ${p.text} border ${p.border}`}>{PRIORITY_LABELS[task.priority]}</span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className="text-xs text-slate-400">{task.estHours}h / {task.actHours}h</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => onEdit(task)} className="p-1.5 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-700 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </button>
                    <button onClick={() => onDelete(task.id)} className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-700 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ tasks, meetings, capacity, onCapacityChange }) {
  const weekDates = getWeekDates();
  const todayStr  = today();

  // 今日の工数集計
  const todayTasks = tasks.filter(t => t.status !== "Done");
  const todayTaskHours = todayTasks.reduce((s,t) => s + (t.estHours||0), 0);
  const todayMeetMin   = meetings.filter(m => m.date === todayStr).reduce((s,m) => s + (m.durationMin||0), 0);
  const todayMeetHours = todayMeetMin / 60;
  const used    = todayTaskHours + todayMeetHours;
  const free    = Math.max(0, capacity - used);
  const taskPct = Math.min(100, (todayTaskHours / capacity) * 100);
  const meetPct = Math.min(100, (todayMeetHours / capacity) * 100);

  // 週次グラフ
  const weekData = weekDates.map(date => {
    const dayTasks = tasks.filter(t => t.dueDate === date);
    const dayMeet  = meetings.filter(m => m.date === date).reduce((s,m) => s+(m.durationMin||0)/60, 0);
    return {
      date,
      est:  dayTasks.reduce((s,t) => s+(t.estHours||0), 0),
      act:  dayTasks.reduce((s,t) => s+(t.actHours||0), 0),
      meet: dayMeet,
    };
  });
  const maxH = Math.max(...weekData.map(d => d.est + d.meet), 1);

  // 期日アラート
  const alerts = tasks
    .filter(t => t.status !== "Done" && dueDateStatus(t.dueDate) !== "ok" && dueDateStatus(t.dueDate) !== "none")
    .sort((a,b) => {
      const o = { overdue:0, today:1, soon:2 };
      return (o[dueDateStatus(a.dueDate)]||9) - (o[dueDateStatus(b.dueDate)]||9);
    });

  // 今日の会議タイムライン
  const todayMeetings = [...meetings.filter(m=>m.date===todayStr)]
    .sort((a,b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="space-y-4">
      {/* 今日のサマリー */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "作業可能時間", val: `${capacity}h`, color: "text-slate-200", sub: "設定値" },
          { label: "タスク工数",   val: `${todayTaskHours}h`, color: "text-violet-400", sub: `${todayTasks.length}件` },
          { label: "会議時間",     val: `${todayMeetHours.toFixed(1)}h`, color: "text-sky-400", sub: `${todayMeetings.length}件` },
          { label: "空き時間",     val: `${free.toFixed(1)}h`, color: free <= 0 ? "text-rose-400" : "text-emerald-400", sub: free <= 0 ? "余裕なし" : "余裕あり" },
        ].map(c => (
          <div key={c.label} className="bg-slate-800/60 rounded-xl p-3 border border-slate-700">
            <p className="text-xs text-slate-500 mb-1">{c.label}</p>
            <p className={`text-xl font-bold ${c.color}`}>{c.val}</p>
            <p className="text-xs text-slate-600 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* キャパシティバー */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400">今日のキャパシティ</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">1日の作業時間：</span>
            <input
              type="number" min={1} max={24} step={0.5}
              value={capacity}
              onChange={e => onCapacityChange(parseFloat(e.target.value)||8)}
              className="w-14 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 text-center focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            <span className="text-xs text-slate-500">h</span>
          </div>
        </div>
        <div className="h-4 bg-slate-800 rounded-full overflow-hidden flex">
          <div className="h-full bg-violet-500/70 transition-all" style={{width:`${Math.min(100,taskPct)}%`}}/>
          <div className="h-full bg-sky-500/70 transition-all" style={{width:`${Math.min(100,meetPct)}%`}}/>
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-violet-500/70 inline-block"/>タスク {todayTaskHours}h</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-sky-500/70 inline-block"/>会議 {todayMeetHours.toFixed(1)}h</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-slate-700 inline-block"/>空き {free.toFixed(1)}h</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 週次グラフ */}
        <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4">
          <p className="text-xs font-semibold text-slate-400 mb-3">今週の工数</p>
          <div className="flex items-end gap-2 h-28">
            {weekData.map((d, i) => {
              const isToday = d.date === todayStr;
              const estH  = Math.round((d.est  / maxH) * 100);
              const meetH = Math.round((d.meet / maxH) * 100);
              const actH  = Math.round((d.act  / maxH) * 100);
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col justify-end" style={{height:"90px"}}>
                    <div className="w-full rounded-t-sm overflow-hidden flex flex-col-reverse" style={{height:`${estH}%`}}>
                      <div className="w-full bg-violet-500/50" style={{height:`${estH}%`}}/>
                    </div>
                    {d.meet > 0 && (
                      <div className="w-full bg-sky-500/60 rounded-t-sm" style={{height:`${meetH}%`, marginTop:"2px"}}/>
                    )}
                    {d.act > 0 && (
                      <div className="w-full bg-emerald-500/70 rounded-t-sm" style={{height:`${actH}%`, marginTop:"2px"}}/>
                    )}
                  </div>
                  <span className={`text-xs ${isToday ? "text-violet-400 font-bold" : "text-slate-600"}`}>{DAYS_JA[i]}</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-3 mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-violet-500/50 inline-block"/>予定</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500/70 inline-block"/>実績</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-sky-500/60 inline-block"/>会議</span>
          </div>
        </div>

        {/* 今日のタイムライン */}
        <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4">
          <p className="text-xs font-semibold text-slate-400 mb-3">今日のタイムライン</p>
          {todayMeetings.length === 0 && (
            <p className="text-xs text-slate-600">今日の会議はありません</p>
          )}
          <div className="space-y-1.5">
            {todayMeetings.map(m => (
              <div key={m.id} className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 w-12 shrink-0">{m.startTime}</span>
                <div className="w-1.5 h-1.5 rounded-sm bg-sky-400 shrink-0"/>
                <span className="text-slate-300 flex-1">{m.title}</span>
                <span className="text-slate-500">{m.durationMin}分</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 期日アラート */}
      {alerts.length > 0 && (
        <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4">
          <p className="text-xs font-semibold text-slate-400 mb-3">期日アラート</p>
          <div className="space-y-2">
            {alerts.map(t => {
              const p = PRIORITY_COLORS[t.priority];
              return (
                <div key={t.id} className="flex items-center gap-3 py-1.5 border-b border-slate-800 last:border-0">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.dot}`}/>
                  <span className="text-sm text-slate-200 flex-1">{t.title}</span>
                  <DueBadge dueDate={t.dueDate} />
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.bg} ${p.text} border ${p.border}`}>{PRIORITY_LABELS[t.priority]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── TaskModal ────────────────────────────────────────────────────────────────
function TaskModal({ task, onSave, onClose }) {
  const [form, setForm] = useState(task || { title:"", description:"", status:"Todo", priority:"Medium", dueDate:"", estHours:0, actHours:0 });
  const isEdit = !!task;
  const set = (k,v) => setForm(f => ({...f,[k]:v}));
  const handleSave = () => {
    if (!form.title.trim()) return;
    onSave({ ...form, id: form.id||genId(), order: form.order??99, createdAt: form.createdAt||Date.now() });
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-100">{isEdit ? "タスクを編集" : "タスクを追加"}</h2>
          <button onClick={onClose} className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">タイトル *</label>
          <input autoFocus value={form.title} onChange={e=>set("title",e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSave()} placeholder="タスクのタイトルを入力" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500"/>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">詳細</label>
          <textarea value={form.description} onChange={e=>set("description",e.target.value)} rows={2} placeholder="タスクの詳細（任意）" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"/>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">ステータス</label>
            <select value={form.status} onChange={e=>set("status",e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500">
              {STATUSES.map(s=><option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">優先度</label>
            <select value={form.priority} onChange={e=>set("priority",e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500">
              {PRIORITIES.map(p=><option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">期日（任意）</label>
          <input type="date" value={form.dueDate} onChange={e=>set("dueDate",e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"/>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">予定工数（h）</label>
            <input type="number" min={0} step={0.5} value={form.estHours} onChange={e=>set("estHours",parseFloat(e.target.value)||0)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">実績工数（h）</label>
            <input type="number" min={0} step={0.5} value={form.actHours} onChange={e=>set("actHours",parseFloat(e.target.value)||0)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"/>
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">キャンセル</button>
          <button onClick={handleSave} disabled={!form.title.trim()} className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 text-sm font-semibold text-white transition-colors">{isEdit?"更新する":"追加する"}</button>
        </div>
      </div>
    </div>
  );
}

// ── MeetingModal ──────────────────────────────────────────────────────────────
function MeetingModal({ meeting, onSave, onClose }) {
  const [form, setForm] = useState(meeting || { title:"", date:today(), startTime:"09:00", durationMin:30 });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const handleSave = () => {
    if (!form.title.trim()) return;
    onSave({ ...form, id: form.id||genId() });
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-100">{meeting?"会議を編集":"会議を追加"}</h2>
          <button onClick={onClose} className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">会議名 *</label>
          <input autoFocus value={form.title} onChange={e=>set("title",e.target.value)} placeholder="例：週次定例" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500"/>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">日付</label>
          <input type="date" value={form.date} onChange={e=>set("date",e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"/>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">開始時刻</label>
            <input type="time" value={form.startTime} onChange={e=>set("startTime",e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">所要時間（分）</label>
            <input type="number" min={5} step={5} value={form.durationMin} onChange={e=>set("durationMin",parseInt(e.target.value)||30)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"/>
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">キャンセル</button>
          <button onClick={handleSave} disabled={!form.title.trim()} className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 text-sm font-semibold text-white transition-colors">{meeting?"更新する":"追加する"}</button>
        </div>
      </div>
    </div>
  );
}

// ── CSV ユーティリティ ────────────────────────────────────────────────────────
const TASK_CSV_HEADERS = ["id","title","description","status","priority","dueDate","estHours","actHours","order","createdAt"];
const MEETING_CSV_HEADERS = ["id","title","date","startTime","durationMin"];

function escapeCsv(val) {
  const s = val == null ? "" : String(val);
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g,'""')}"` : s;
}

function rowToCsv(headers, obj) {
  return headers.map(h => escapeCsv(obj[h])).join(",");
}

function exportTasksCsv(tasks) {
  const lines = [TASK_CSV_HEADERS.join(","), ...tasks.map(t => rowToCsv(TASK_CSV_HEADERS, t))];
  downloadCsv(lines.join("\n"), `tasks_${today()}.csv`);
}

function exportMeetingsCsv(meetings) {
  const lines = [MEETING_CSV_HEADERS.join(","), ...meetings.map(m => rowToCsv(MEETING_CSV_HEADERS, m))];
  downloadCsv(lines.join("\n"), `meetings_${today()}.csv`);
}

function downloadCsv(content, filename) {
  const bom = "\uFEFF"; // BOM for Excel UTF-8
  const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function parseCsv(text) {
  const lines = text.replace(/\r\n/g,"\n").replace(/\r/g,"\n").trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g,""));
  return lines.slice(1).map(line => {
    const values = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && !inQ) { inQ = true; }
      else if (ch === '"' && inQ && line[i+1] === '"') { cur += '"'; i++; }
      else if (ch === '"' && inQ) { inQ = false; }
      else if (ch === ',' && !inQ) { values.push(cur); cur = ""; }
      else { cur += ch; }
    }
    values.push(cur);
    const obj = {};
    headers.forEach((h,i) => { obj[h] = values[i] ?? ""; });
    return obj;
  });
}

function importTasksCsv(text, existingTasks) {
  const rows = parseCsv(text);
  if (!rows.length) return null;
  const imported = rows.map(r => ({
    id:          r.id || genId(),
    title:       r.title || "（無題）",
    description: r.description || "",
    status:      STATUSES.includes(r.status) ? r.status : "Todo",
    priority:    PRIORITIES.includes(r.priority) ? r.priority : "Medium",
    dueDate:     r.dueDate || "",
    estHours:    parseFloat(r.estHours) || 0,
    actHours:    parseFloat(r.actHours) || 0,
    order:       parseInt(r.order) || 0,
    createdAt:   parseInt(r.createdAt) || Date.now(),
  }));
  // 既存IDと重複するものは上書き、新規は追加
  const existingMap = Object.fromEntries(existingTasks.map(t => [t.id, t]));
  imported.forEach(t => { existingMap[t.id] = t; });
  return Object.values(existingMap);
}

function importMeetingsCsv(text, existingMeetings) {
  const rows = parseCsv(text);
  if (!rows.length) return null;
  const imported = rows.map(r => ({
    id:          r.id || genId(),
    title:       r.title || "（無題）",
    date:        r.date || today(),
    startTime:   r.startTime || "09:00",
    durationMin: parseInt(r.durationMin) || 30,
  }));
  const existingMap = Object.fromEntries(existingMeetings.map(m => [m.id, m]));
  imported.forEach(m => { existingMap[m.id] = m; });
  return Object.values(existingMap);
}

// ── ICS パーサー ──────────────────────────────────────────────────────────────
function parseIcs(text) {
  // 折り返し行（RFC5545）を結合
  const unfolded = text.replace(/\r\n[ \t]/g, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const events = [];
  const blocks = unfolded.split("BEGIN:VEVENT");
  blocks.shift(); // 最初のブロックはヘッダー

  for (const block of blocks) {
    const get = (key) => {
      // 修飾子付きキー（例: DTSTART;TZID=...）も取得
      const re = new RegExp(`^${key}[;:][^\n]*`, "m");
      const m = block.match(re);
      if (!m) return "";
      return m[0].replace(/^[^:]+:/, "").trim();
    };

    const title = get("SUMMARY").replace(/\\,/g,",").replace(/\\n/g," ").replace(/\\;/g,";") || "（タイトルなし）";

    // 日時パース：DTSTART の値から日付・時刻を取得
    const dtRaw = get("DTSTART");
    if (!dtRaw) continue;

    let date = "", startTime = "00:00", durationMin = 60;

    // 終日イベント (VALUE=DATE or 8桁数字)
    const allDayMatch = dtRaw.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (allDayMatch) {
      date = `${allDayMatch[1]}-${allDayMatch[2]}-${allDayMatch[3]}`;
      durationMin = 0; // 終日はスキップか0扱い
    } else {
      // 日時形式: 20250621T090000 or 20250621T090000Z
      const dtMatch = dtRaw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
      if (!dtMatch) continue;
      date = `${dtMatch[1]}-${dtMatch[2]}-${dtMatch[3]}`;
      startTime = `${dtMatch[4]}:${dtMatch[5]}`;

      // 終了時刻から所要時間を計算
      const dtEndRaw = get("DTEND");
      const endMatch = dtEndRaw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
      if (endMatch) {
        const start = new Date(`${dtMatch[1]}-${dtMatch[2]}-${dtMatch[3]}T${dtMatch[4]}:${dtMatch[5]}:${dtMatch[6]}`);
        const end   = new Date(`${endMatch[1]}-${endMatch[2]}-${endMatch[3]}T${endMatch[4]}:${endMatch[5]}:${endMatch[6]}`);
        durationMin = Math.round((end - start) / 60000);
      }

      // DURATION フォールバック (PT1H30M など)
      if (durationMin <= 0) {
        const dur = get("DURATION");
        const dh = dur.match(/(\d+)H/); const dm = dur.match(/(\d+)M/);
        durationMin = (dh ? parseInt(dh[1]) * 60 : 0) + (dm ? parseInt(dm[1]) : 0);
      }
    }

    if (!date) continue;
    if (durationMin <= 0) durationMin = 60; // デフォルト60分

    events.push({ id: genId(), title, date, startTime, durationMin: Math.max(5, durationMin) });
  }
  return events;
}

function importIcsMeetings(text, existingMeetings) {
  const imported = parseIcs(text);
  if (!imported.length) return null;
  const existingMap = Object.fromEntries(existingMeetings.map(m => [m.id, m]));
  imported.forEach(m => { existingMap[m.id] = m; });
  return { meetings: Object.values(existingMap), count: imported.length };
}

// ── CsvModal（CSV + ICS統合） ──────────────────────────────────────────────────
function CsvModal({ tasks, meetings, onImportTasks, onImportMeetings, onClose }) {
  const [tab,        setTab]        = useState("export");
  const [importType, setImportType] = useState("tasks");
  const [msg,        setMsg]        = useState("");
  const [preview,    setPreview]    = useState(null); // ICSプレビュー用
  const csvRef = useRef();
  const icsRef = useRef();

  const clearMsg = () => { setMsg(""); setPreview(null); };

  // CSV インポート
  const handleCsvImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      if (importType === "tasks") {
        const result = importTasksCsv(text, tasks);
        if (result) { onImportTasks(result); setMsg(`✓ ${result.length}件のタスクを取り込みました`); }
        else setMsg("⚠ 読み込みに失敗しました。CSVの形式を確認してください。");
      } else {
        const result = importMeetingsCsv(text, meetings);
        if (result) { onImportMeetings(result); setMsg(`✓ ${result.length}件の会議を取り込みました`); }
        else setMsg("⚠ 読み込みに失敗しました。CSVの形式を確認してください。");
      }
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  // ICS 読み込み（プレビュー→確定の2ステップ）
  const handleIcsSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const parsed = parseIcs(text);
      if (!parsed.length) { setMsg("⚠ 予定が見つかりませんでした。ICSファイルを確認してください。"); return; }
      setPreview(parsed);
      setMsg("");
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  const handleIcsConfirm = () => {
    if (!preview) return;
    const existingMap = Object.fromEntries(meetings.map(m=>[m.id,m]));
    preview.forEach(m=>{ existingMap[m.id]=m; });
    onImportMeetings(Object.values(existingMap));
    setMsg(`✓ ${preview.length}件の予定を会議リストに追加しました`);
    setPreview(null);
  };

  // ドラッグ＆ドロップ対応
  const handleDrop = (e, type) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      if (type === "ics") {
        const parsed = parseIcs(text);
        if (!parsed.length) { setMsg("⚠ 予定が見つかりませんでした。"); return; }
        setPreview(parsed); setMsg("");
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-100">データ管理</h2>
          <button onClick={onClose} className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* タブ */}
        <div className="flex bg-slate-800 rounded-xl p-1 gap-1">
          {[["export","CSVエクスポート"],["import","CSVインポート"],["ics","ICS取り込み"]].map(([v,l])=>(
            <button key={v} onClick={()=>{setTab(v);clearMsg();}} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${tab===v?"bg-slate-700 text-slate-100":"text-slate-500 hover:text-slate-300"}`}>{l}</button>
          ))}
        </div>

        {/* ── エクスポート ── */}
        {tab === "export" && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">現在のデータをCSVファイルとしてダウンロードします。Excelで開けます。</p>
            <button onClick={()=>exportTasksCsv(tasks)} className="w-full flex items-center gap-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl px-4 py-3 transition-colors text-left">
              <svg className="w-5 h-5 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              <div>
                <p className="text-sm font-semibold text-slate-200">タスクをエクスポート</p>
                <p className="text-xs text-slate-500">{tasks.length}件 → tasks_{today()}.csv</p>
              </div>
            </button>
            <button onClick={()=>exportMeetingsCsv(meetings)} className="w-full flex items-center gap-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl px-4 py-3 transition-colors text-left">
              <svg className="w-5 h-5 text-sky-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              <div>
                <p className="text-sm font-semibold text-slate-200">会議をエクスポート</p>
                <p className="text-xs text-slate-500">{meetings.length}件 → meetings_{today()}.csv</p>
              </div>
            </button>
          </div>
        )}

        {/* ── CSVインポート ── */}
        {tab === "import" && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">CSVファイルを読み込みます。既存データと同じIDは上書き、新規IDは追加されます。</p>
            <div className="flex bg-slate-800 rounded-xl p-1 gap-1">
              {[["tasks","タスク"],["meetings","会議"]].map(([v,l])=>(
                <button key={v} onClick={()=>setImportType(v)} className={`flex-1 py-1.5 rounded-lg text-xs transition-colors ${importType===v?"bg-slate-700 text-slate-100":"text-slate-500 hover:text-slate-300"}`}>{l}</button>
              ))}
            </div>
            <button onClick={()=>csvRef.current?.click()} className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-700 hover:border-violet-500/50 rounded-xl px-4 py-6 transition-colors text-slate-400 hover:text-slate-200">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
              <span className="text-sm font-medium">CSVファイルを選択</span>
            </button>
            <input ref={csvRef} type="file" accept=".csv" onChange={handleCsvImport} className="hidden"/>
            {msg && <p className={`text-xs px-3 py-2 rounded-lg ${msg.startsWith("✓")?"bg-emerald-900/30 text-emerald-400":"bg-rose-900/30 text-rose-400"}`}>{msg}</p>}
            <div className="bg-slate-800/60 rounded-xl p-3 text-xs text-slate-500">
              <p className="font-semibold text-slate-400 mb-1">タスクCSVの列：</p>
              <p className="font-mono text-slate-600 break-all text-[10px]">{TASK_CSV_HEADERS.join(", ")}</p>
            </div>
          </div>
        )}

        {/* ── ICS取り込み ── */}
        {tab === "ics" && (
          <div className="space-y-3">
            <div className="bg-sky-900/20 border border-sky-700/30 rounded-xl p-3 text-xs text-sky-300 space-y-1">
              <p className="font-semibold text-sky-200">Outlookからのエクスポート手順</p>
              <p>① Outlookの「カレンダー」→「ファイル」→「名前を付けて保存」</p>
              <p>② ファイル形式を <span className="font-mono bg-sky-900/40 px-1 rounded">iCalendar (*.ics)</span> に変更して保存</p>
              <p>③ 保存した .ics ファイルを下のエリアにドロップまたは選択</p>
            </div>

            {!preview ? (
              <div
                onDragOver={e=>e.preventDefault()}
                onDrop={e=>handleDrop(e,"ics")}
                onClick={()=>icsRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-3 border-2 border-dashed border-sky-700/40 hover:border-sky-500/60 bg-sky-900/10 hover:bg-sky-900/20 rounded-xl px-4 py-8 transition-colors cursor-pointer"
              >
                <svg className="w-10 h-10 text-sky-500/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-300">ICSファイルをドロップ</p>
                  <p className="text-xs text-slate-500 mt-0.5">またはクリックしてファイルを選択</p>
                </div>
                <p className="text-xs text-slate-600">.ics ファイル対応（Outlook / Google Calendar）</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-300">{preview.length}件の予定を検出</p>
                  <button onClick={()=>setPreview(null)} className="text-xs text-slate-500 hover:text-slate-300 underline">キャンセル</button>
                </div>
                {/* プレビューリスト */}
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {preview.map((m,i)=>(
                    <div key={i} className="flex items-center gap-2 bg-slate-800/60 rounded-lg px-3 py-2 text-xs">
                      <div className="w-1.5 h-1.5 rounded-sm bg-sky-400 shrink-0"/>
                      <span className="text-slate-400 shrink-0 w-24">{m.date} {m.startTime}</span>
                      <span className="text-slate-200 flex-1 truncate">{m.title}</span>
                      <span className="text-slate-500 shrink-0">{m.durationMin}分</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleIcsConfirm}
                  className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-sm font-semibold text-white transition-colors"
                >
                  {preview.length}件を会議リストに追加する
                </button>
              </div>
            )}

            <input ref={icsRef} type="file" accept=".ics,.ical" onChange={handleIcsSelect} className="hidden"/>
            {msg && <p className={`text-xs px-3 py-2 rounded-lg ${msg.startsWith("✓")?"bg-emerald-900/30 text-emerald-400":"bg-rose-900/30 text-rose-400"}`}>{msg}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 付箋メモ ──────────────────────────────────────────────────────────────────
const NOTE_COLORS = [
  { id:"yellow", bg:"bg-yellow-300",   text:"text-yellow-900",  border:"border-yellow-400",  label:"黄" },
  { id:"green",  bg:"bg-emerald-300",  text:"text-emerald-900", border:"border-emerald-400", label:"緑" },
  { id:"pink",   bg:"bg-pink-300",     text:"text-pink-900",    border:"border-pink-400",    label:"ピンク" },
  { id:"blue",   bg:"bg-sky-300",      text:"text-sky-900",     border:"border-sky-400",     label:"青" },
  { id:"orange", bg:"bg-orange-300",   text:"text-orange-900",  border:"border-orange-400",  label:"橙" },
];

const DEFAULT_NOTES = [
  { id: genId(), text: "田中さんから口頭依頼：\n来週までに見積もりを出す", color: "yellow", createdAt: Date.now()-3600000 },
];

function StickyNote({ note, onEdit, onDelete, onColorChange }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note.text);
  const c = NOTE_COLORS.find(c=>c.id===note.color) || NOTE_COLORS[0];
  const taRef = useRef();

  const handleBlur = () => {
    setEditing(false);
    if (text.trim() !== note.text) onEdit(note.id, text.trim() || note.text);
  };

  useEffect(() => { if (editing && taRef.current) taRef.current.focus(); }, [editing]);

  return (
    <div className={`group relative rounded-lg border ${c.bg} ${c.border} shadow-md p-3 flex flex-col gap-2 min-h-[100px] transition-all hover:shadow-lg hover:-translate-y-0.5`}>
      {/* カラーピッカー＋削除 */}
      <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex gap-1">
          {NOTE_COLORS.map(nc=>(
            <button key={nc.id} onClick={()=>onColorChange(note.id, nc.id)}
              className={`w-4 h-4 rounded-full ${nc.bg} border-2 transition-all ${note.color===nc.id?"border-slate-700 scale-110":"border-transparent"}`}
              title={nc.label}
            />
          ))}
        </div>
        <button onClick={()=>onDelete(note.id)} className={`p-0.5 rounded ${c.text} opacity-50 hover:opacity-100 transition-opacity`}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      {/* テキスト */}
      {editing ? (
        <textarea
          ref={taRef}
          value={text}
          onChange={e=>setText(e.target.value)}
          onBlur={handleBlur}
          rows={4}
          className={`w-full bg-transparent text-xs ${c.text} font-medium leading-relaxed resize-none focus:outline-none`}
        />
      ) : (
        <p
          onClick={()=>setEditing(true)}
          className={`text-xs ${c.text} font-medium leading-relaxed whitespace-pre-wrap cursor-text flex-1`}
        >{note.text || <span className="opacity-40">クリックして編集...</span>}</p>
      )}
      <p className={`text-[10px] ${c.text} opacity-40 mt-auto`}>{formatDate(note.createdAt)}</p>
    </div>
  );
}

function StickyBoard({ notes, onAdd, onEdit, onDelete, onColorChange }) {
  return (
    <div className="bg-slate-900/40 rounded-2xl border border-slate-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-300">📌 メモ</span>
          <span className="text-xs bg-slate-700 text-slate-400 rounded-full px-2 py-0.5">{notes.length}</span>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-1 text-xs bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 border border-yellow-500/30 px-2.5 py-1.5 rounded-lg transition-colors font-medium"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
          付箋を追加
        </button>
      </div>
      {notes.length === 0 ? (
        <p className="text-xs text-slate-600 text-center py-4">付箋がありません。「付箋を追加」で口頭メモを残せます。</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {notes.map(n=>(
            <StickyNote key={n.id} note={n} onEdit={onEdit} onDelete={onDelete} onColorChange={onColorChange}/>
          ))}
        </div>
      )}
    </div>
  );
}

// ── バックアップユーティリティ ──────────────────────────────────────────────────
function createBackup(tasks, meetings, notes, capacity) {
  const data = {
    version: "2.0",
    exportedAt: new Date().toISOString(),
    capacity,
    tasks,
    meetings,
    notes,
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `taskboard_backup_${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function restoreBackup(text) {
  const data = JSON.parse(text);
  if (!data.version || !Array.isArray(data.tasks)) throw new Error("Invalid backup format");
  return data;
}

// ── BackupModal ───────────────────────────────────────────────────────────────
function BackupModal({ tasks, meetings, notes, capacity, onRestore, onClose }) {
  const [msg,     setMsg]     = useState("");
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(null);
  const fileRef = useRef();

  const handleExport = () => {
    createBackup(tasks, meetings, notes, capacity);
    setMsg(`✓ バックアップを保存しました（タスク${tasks.length}件・会議${meetings.length}件・メモ${notes.length}件）`);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = restoreBackup(ev.target.result);
        setPending(data);
        setConfirm(true);
        setMsg("");
      } catch {
        setMsg("⚠ ファイルの形式が正しくありません。タスクボードのバックアップファイルを選択してください。");
      }
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  const handleRestore = () => {
    if (!pending) return;
    onRestore(pending);
    setConfirm(false);
    setPending(null);
    setMsg(`✓ 復元しました（タスク${pending.tasks.length}件・会議${(pending.meetings||[]).length}件・メモ${(pending.notes||[]).length}件）`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-100">バックアップ / 復元</h2>
          <button onClick={onClose} className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <p className="text-xs text-slate-400">全データ（タスク・会議・付箋メモ・設定）をJSONファイルで保存・復元できます。</p>

        {/* 現在のデータ概要 */}
        <div className="grid grid-cols-3 gap-2">
          {[["タスク", tasks.length, "text-violet-400"],["会議", meetings.length, "text-sky-400"],["メモ", notes.length, "text-yellow-400"]].map(([l,v,c])=>(
            <div key={l} className="bg-slate-800 rounded-xl p-3 text-center">
              <p className={`text-lg font-bold ${c}`}>{v}</p>
              <p className="text-xs text-slate-500">{l}</p>
            </div>
          ))}
        </div>

        {/* バックアップ */}
        <button
          onClick={handleExport}
          className="w-full flex items-center gap-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl px-4 py-3 transition-colors text-left"
        >
          <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          <div>
            <p className="text-sm font-semibold text-slate-200">バックアップを保存</p>
            <p className="text-xs text-slate-500">taskboard_backup_{today()}.json</p>
          </div>
        </button>

        {/* 復元 */}
        <button
          onClick={()=>fileRef.current?.click()}
          className="w-full flex items-center gap-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl px-4 py-3 transition-colors text-left"
        >
          <svg className="w-5 h-5 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12"/></svg>
          <div>
            <p className="text-sm font-semibold text-slate-200">バックアップから復元</p>
            <p className="text-xs text-slate-500">.json ファイルを選択</p>
          </div>
        </button>
        <input ref={fileRef} type="file" accept=".json" onChange={handleFileSelect} className="hidden"/>

        {/* 復元確認ダイアログ */}
        {confirm && pending && (
          <div className="bg-amber-900/20 border border-amber-600/40 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-amber-300">⚠ 復元の確認</p>
            <p className="text-xs text-amber-200/80">
              バックアップ日時：{new Date(pending.exportedAt).toLocaleString("ja-JP")}<br/>
              タスク {pending.tasks.length}件・会議 {(pending.meetings||[]).length}件・メモ {(pending.notes||[]).length}件
            </p>
            <p className="text-xs text-amber-300/70">※ 現在のデータはすべて上書きされます。よろしいですか？</p>
            <div className="flex gap-2">
              <button onClick={()=>{setConfirm(false);setPending(null);}} className="flex-1 py-2 rounded-xl border border-slate-700 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">キャンセル</button>
              <button onClick={handleRestore} className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white transition-colors">復元する</button>
            </div>
          </div>
        )}

        {msg && <p className={`text-xs px-3 py-2 rounded-lg ${msg.startsWith("✓")?"bg-emerald-900/30 text-emerald-400":"bg-rose-900/30 text-rose-400"}`}>{msg}</p>}

        <div className="bg-slate-800/60 rounded-xl p-3 text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-400">💡 推奨運用</p>
          <p>週1回バックアップを保存しておくと、PCを変えたときやデータが消えたときに復元できます。</p>
        </div>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [tasks,    setTasks]    = useState(()=>{ try{ const s=localStorage.getItem("tasks-v2"); return s?JSON.parse(s):DEFAULT_TASKS; }catch{ return DEFAULT_TASKS; }});
  const [meetings, setMeetings] = useState(()=>{ try{ const s=localStorage.getItem("meetings-v1"); return s?JSON.parse(s):DEFAULT_MEETINGS; }catch{ return DEFAULT_MEETINGS; }});
  const [notes,    setNotes]    = useState(()=>{ try{ const s=localStorage.getItem("notes-v1"); return s?JSON.parse(s):DEFAULT_NOTES; }catch{ return DEFAULT_NOTES; }});
  const [capacity, setCapacity] = useState(()=>{ try{ return parseFloat(localStorage.getItem("capacity-v1"))||DEFAULT_CAPACITY; }catch{ return DEFAULT_CAPACITY; }});
  const [view,       setView]       = useState("kanban");
  const [showModal,  setShowModal]  = useState(false);
  const [modalTask,  setModalTask]  = useState(null);
  const [showMeet,   setShowMeet]   = useState(false);
  const [modalMeet,  setModalMeet]  = useState(null);
  const [showCsv,    setShowCsv]    = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [search,     setSearch]     = useState("");
  const [filterStatus,   setFilterStatus]   = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");

  useEffect(()=>{ try{ localStorage.setItem("tasks-v2",    JSON.stringify(tasks));    }catch{} }, [tasks]);
  useEffect(()=>{ try{ localStorage.setItem("meetings-v1", JSON.stringify(meetings)); }catch{} }, [meetings]);
  useEffect(()=>{ try{ localStorage.setItem("notes-v1",    JSON.stringify(notes));    }catch{} }, [notes]);
  useEffect(()=>{ try{ localStorage.setItem("capacity-v1", String(capacity));         }catch{} }, [capacity]);

  // 付箋メモ操作
  const handleAddNote    = ()          => setNotes(prev=>[{ id:genId(), text:"", color:"yellow", createdAt:Date.now() }, ...prev]);
  const handleEditNote   = (id, text)  => setNotes(prev=>prev.map(n=>n.id===id?{...n,text}:n));
  const handleDeleteNote = (id)        => setNotes(prev=>prev.filter(n=>n.id!==id));
  const handleColorNote  = (id, color) => setNotes(prev=>prev.map(n=>n.id===id?{...n,color}:n));

  const openAddTask  = () => { setModalTask(null);    setShowModal(true); };
  const openEditTask = t  => { setModalTask(t);       setShowModal(true); };
  const openAddMeet  = () => { setModalMeet(null);    setShowMeet(true);  };
  const openEditMeet = m  => { setModalMeet(m);       setShowMeet(true);  };

  const handleSaveTask = task => {
    setTasks(prev => {
      const idx = prev.findIndex(t=>t.id===task.id);
      if (idx>=0){ const n=[...prev]; n[idx]=task; return n; }
      return [task,...prev];
    });
  };
  const handleDeleteTask = id => setTasks(prev=>prev.filter(t=>t.id!==id));
  const handleStatusChange = (id,status) => setTasks(prev=>prev.map(t=>t.id===id?{...t,status}:t));

  const handleSaveMeet   = m  => setMeetings(prev=>{ const idx=prev.findIndex(x=>x.id===m.id); if(idx>=0){const n=[...prev];n[idx]=m;return n;} return [m,...prev]; });
  const handleDeleteMeet = id => setMeetings(prev=>prev.filter(m=>m.id!==id));

  // カンバン ドロップ処理（列間移動 + 同列並び替え）
  const handleKanbanDrop = ({ taskId, fromStatus, fromIndex, toStatus, toIndex }) => {
    setTasks(prev => {
      const tasksCopy = prev.map(t=>({...t}));
      const task = tasksCopy.find(t=>t.id===taskId);
      if (!task) return prev;
      task.status = toStatus;
      // 同ステータス内の並び順を計算
      const col = tasksCopy.filter(t=>t.status===toStatus && t.id!==taskId).sort((a,b)=>(a.order??0)-(b.order??0));
      col.splice(toIndex, 0, task);
      col.forEach((t,i)=>{ t.order=i; });
      return tasksCopy;
    });
  };

  // フィルター
  const filtered = tasks.filter(t => {
    if (filterStatus   !== "All" && t.status   !== filterStatus)   return false;
    if (filterPriority !== "All" && t.priority !== filterPriority) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const tasksByStatus = status => [...filtered.filter(t=>t.status===status)].sort((a,b)=>(a.order??0)-(b.order??0));

  const stats = {
    total:      tasks.length,
    todo:       tasks.filter(t=>t.status==="Todo").length,
    inProgress: tasks.filter(t=>t.status==="In Progress").length,
    done:       tasks.filter(t=>t.status==="Done").length,
    overdue:    tasks.filter(t=>t.status!=="Done"&&dueDateStatus(t.dueDate)==="overdue").length,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 mr-auto">
            <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            </div>
            <h1 className="text-sm font-bold text-slate-100 hidden sm:block">タスクボード</h1>
          </div>
          <div className="hidden md:flex items-center gap-4 text-xs">
            <span className="text-slate-500">全 <strong className="text-slate-300">{stats.total}</strong></span>
            <span className="text-slate-500">未着手 <strong className="text-slate-300">{stats.todo}</strong></span>
            <span className="text-slate-500">進行中 <strong className="text-violet-400">{stats.inProgress}</strong></span>
            <span className="text-slate-500">完了 <strong className="text-emerald-400">{stats.done}</strong></span>
            {stats.overdue>0 && <span className="text-rose-400 font-semibold">⚠ 期限切れ {stats.overdue}</span>}
          </div>
          {/* ビュー切替 */}
          <div className="flex items-center bg-slate-800 rounded-xl p-1 gap-1">
            {[["kanban","カンバン"],["list","リスト"],["dashboard","ダッシュボード"]].map(([v,l])=>(
              <button key={v} onClick={()=>setView(v)} title={l} className={`px-2 py-1.5 rounded-lg text-xs transition-colors ${view===v?"bg-slate-700 text-slate-200":"text-slate-500 hover:text-slate-300"}`}>{l}</button>
            ))}
          </div>
          {/* バックアップ */}
          <button onClick={()=>setShowBackup(true)} className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors" title="バックアップ">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            <span className="hidden sm:inline">バックアップ</span>
          </button>
          {/* CSV */}
          <button onClick={()=>setShowCsv(true)} className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors" title="CSV エクスポート/インポート">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <span className="hidden sm:inline">CSV</span>
          </button>
          {/* 会議追加 */}
          <button onClick={openAddMeet} className="flex items-center gap-1.5 bg-sky-700 hover:bg-sky-600 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            <span className="hidden sm:inline">会議追加</span>
          </button>
          {/* タスク追加 */}
          <button onClick={openAddTask} className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors shadow-lg shadow-violet-900/40">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
            <span className="hidden sm:inline">タスク追加</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-5 space-y-4">
        {/* フィルター（ダッシュボード以外） */}
        {view !== "dashboard" && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="タスクを検索..." className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"/>
            </div>
            <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="All">すべてのステータス</option>
              {STATUSES.map(s=><option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            <select value={filterPriority} onChange={e=>setFilterPriority(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="All">すべての優先度</option>
              {PRIORITIES.map(p=><option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
            </select>
            {(search||filterStatus!=="All"||filterPriority!=="All") && (
              <button onClick={()=>{setSearch("");setFilterStatus("All");setFilterPriority("All");}} className="text-xs text-slate-400 hover:text-slate-200 underline transition-colors">クリア</button>
            )}
          </div>
        )}

        {/* ビュー */}
        {view === "kanban" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STATUSES.map(status => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={tasksByStatus(status)}
                onEdit={openEditTask}
                onDelete={handleDeleteTask}
                onDrop={handleKanbanDrop}
              />
            ))}
          </div>
        )}
        {view === "list" && (
          <ListView tasks={filtered} onEdit={openEditTask} onDelete={handleDeleteTask} onStatusChange={handleStatusChange}/>
        )}
        {view === "dashboard" && (
          <Dashboard tasks={tasks} meetings={meetings} capacity={capacity} onCapacityChange={setCapacity}/>
        )}

        {/* 付箋メモエリア（ダッシュボード以外） */}
        {view !== "dashboard" && (
          <StickyBoard
            notes={notes}
            onAdd={handleAddNote}
            onEdit={handleEditNote}
            onDelete={handleDeleteNote}
            onColorChange={handleColorNote}
          />
        )}

        {/* 会議一覧（ダッシュボード以外で折り畳み表示） */}
        {view !== "dashboard" && meetings.length > 0 && (
          <details className="group">
            <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300 transition-colors list-none flex items-center gap-1">
              <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
              会議一覧 ({meetings.length}件)
            </summary>
            <div className="mt-2 bg-slate-900/60 rounded-xl border border-slate-800 p-4">
              <div className="space-y-2">
                {[...meetings].sort((a,b)=>a.date.localeCompare(b.date)||a.startTime.localeCompare(b.startTime)).map(m=>(
                  <div key={m.id} className="flex items-center gap-3 text-xs">
                    <div className="w-1.5 h-1.5 rounded-sm bg-sky-400 shrink-0"/>
                    <span className="text-slate-400 w-20 shrink-0">{m.date.slice(5).replace("-","/")} {m.startTime}</span>
                    <span className="text-slate-200 flex-1">{m.title}</span>
                    <span className="text-slate-500">{m.durationMin}分</span>
                    <button onClick={()=>openEditMeet(m)} className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-700"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
                    <button onClick={()=>handleDeleteMeet(m.id)} className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-700"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                  </div>
                ))}
              </div>
            </div>
          </details>
        )}
      </main>

      {showModal && <TaskModal    task={modalTask}  onSave={handleSaveTask}  onClose={()=>setShowModal(false)}/>}
      {showMeet  && <MeetingModal meeting={modalMeet} onSave={handleSaveMeet} onClose={()=>setShowMeet(false)}/>}
      {showCsv   && <CsvModal tasks={tasks} meetings={meetings} onImportTasks={setTasks} onImportMeetings={setMeetings} onClose={()=>setShowCsv(false)}/>}
      {showBackup && <BackupModal tasks={tasks} meetings={meetings} notes={notes} capacity={capacity} onRestore={(d)=>{setTasks(d.tasks);setMeetings(d.meetings||[]);setNotes(d.notes||[]);if(d.capacity)setCapacity(d.capacity);}} onClose={()=>setShowBackup(false)}/>}
    </div>
  );
}
