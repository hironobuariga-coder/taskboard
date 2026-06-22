// ════════════════════════════════════════════
//  ⚙️  設定 — ここをあなたのSupabase情報に書き換えてください
// ════════════════════════════════════════════
const SUPABASE_URL  = 'https://ftfngatmiimvucncnxef.supabase.co';
const SUPABASE_ANON = 'sb_publishable_4Y7CpNdNwvVWmLtrINTaZg_JUO9srUU';
// ════════════════════════════════════════════

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── 状態 ──
let notes        = [];
let currentFilter = 'all';
let selectedColor = { side: 'yellow', modal: 'yellow' };
let timerOn       = { side: false,    modal: false };
let alarmTimers   = [];
let currentUser   = null;
let isLogin       = true;   // true=ログイン, false=新規登録
let realtimeSub   = null;

// ── 起動 ──
(async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    currentUser = session.user;
    await enterApp();
  } else {
    showAuth();
  }
  hideLoading();
})();

function hideLoading() {
  const el = document.getElementById('loading');
  el.classList.add('hide');
  setTimeout(() => el.remove(), 400);
}
function showAuth() {
  document.getElementById('auth-screen').classList.add('show');
}
async function enterApp() {
  document.getElementById('auth-screen').classList.remove('show');
  document.getElementById('app').classList.add('show');
  document.getElementById('header-user').textContent = currentUser.email;
  await loadNotes();
  subscribeRealtime();
  startAlarmLoop();
  setDefaultDateTime();
}

// ── 認証 ──
function toggleAuthMode() {
  isLogin = !isLogin;
  document.getElementById('auth-submit-btn').textContent = isLogin ? 'ログイン' : '新規登録';
  document.getElementById('auth-toggle-text').textContent = isLogin
    ? 'アカウントをお持ちでない方は' : 'すでにアカウントをお持ちの方は';
  document.getElementById('auth-err').textContent = '';
}

async function handleAuth() {
  const email = document.getElementById('auth-email').value.trim();
  const pass  = document.getElementById('auth-pass').value;
  const btn   = document.getElementById('auth-submit-btn');
  const errEl = document.getElementById('auth-err');
  errEl.textContent = '';
  if (!email || !pass) { errEl.textContent = 'メールとパスワードを入力してください'; return; }
  btn.disabled = true;
  btn.textContent = '処理中...';

  let result;
  if (isLogin) {
    result = await sb.auth.signInWithPassword({ email, password: pass });
  } else {
    result = await sb.auth.signUp({ email, password: pass });
  }

  btn.disabled = false;
  btn.textContent = isLogin ? 'ログイン' : '新規登録';

  if (result.error) {
    errEl.textContent = result.error.message;
    return;
  }
  currentUser = result.data.user || result.data.session?.user;
  if (!currentUser) {
    errEl.textContent = '確認メールを送りました。メールをご確認ください。';
    return;
  }
  await enterApp();
}

async function handleSignOut() {
  if (realtimeSub) sb.removeChannel(realtimeSub);
  alarmTimers.forEach(clearTimeout);
  alarmTimers = [];
  await sb.auth.signOut();
  document.getElementById('app').classList.remove('show');
  document.getElementById('notes-grid').innerHTML = '';
  notes = [];
  showAuth();
}

// ── データ操作 ──
async function loadNotes() {
  const { data, error } = await sb
    .from('notes')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error) { showToast('読み込みエラー: ' + error.message); return; }
  notes = data || [];
  renderNotes();
  scheduleAlarms();
}

async function saveNote(ctx) {
  const text  = document.getElementById(`${ctx}-text`).value.trim();
  const color = selectedColor[ctx];
  const hasTimer = timerOn[ctx];
  const dtVal = hasTimer ? document.getElementById(`${ctx}-timer-dt`).value : null;

  if (!text) { showToast('メモ内容を入力してください'); return; }
  if (hasTimer && !dtVal) { showToast('日時を選択してください'); return; }

  const btn = document.getElementById(`${ctx}-save-btn`);
  btn.disabled = true;

  const { error } = await sb.from('notes').insert({
    user_id:   currentUser.id,
    text:      text,
    color:     color,
    alarm_at:  dtVal ? new Date(dtVal).toISOString() : null,
    alarmed:   false,
  });

  btn.disabled = false;
  if (error) { showToast('保存エラー: ' + error.message); return; }

  document.getElementById(`${ctx}-text`).value = '';
  timerOn[ctx] = false;
  document.getElementById(`${ctx}-timer-switch`).classList.remove('on');
  document.getElementById(`${ctx}-timer-wrap`).classList.remove('show');
  if (ctx === 'modal') closeModal();
  setDefaultDateTime();
  showToast('保存しました ✓');
}

async function deleteNote(id) {
  const { error } = await sb.from('notes').delete().eq('id', id);
  if (error) { showToast('削除エラー'); return; }
  notes = notes.filter(n => n.id !== id);
  renderNotes();
  scheduleAlarms();
}

// ── リアルタイム同期 ──
function subscribeRealtime() {
  realtimeSub = sb
    .channel('notes-changes')
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'notes',
      filter: `user_id=eq.${currentUser.id}`
    }, payload => {
      if (payload.eventType === 'INSERT') {
        notes.unshift(payload.new);
      } else if (payload.eventType === 'DELETE') {
        notes = notes.filter(n => n.id !== payload.old.id);
      } else if (payload.eventType === 'UPDATE') {
        const i = notes.findIndex(n => n.id === payload.new.id);
        if (i !== -1) notes[i] = payload.new;
      }
      renderNotes();
      scheduleAlarms();
    })
    .subscribe();
}

// ── 表示 ──
function setFilter(f, el) {
  currentFilter = f;
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  renderNotes();
}

function renderNotes() {
  const grid  = document.getElementById('notes-grid');
  const empty = document.getElementById('empty-state');
  const now   = new Date();

  let filtered = notes;
  if (currentFilter !== 'all') {
    if (currentFilter === 'timer') {
      filtered = notes.filter(n => n.alarm_at);
    } else {
      filtered = notes.filter(n => n.color === currentFilter);
    }
  }

  if (!filtered.length) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  grid.innerHTML = filtered.map(n => {
    const alarm_at  = n.alarm_at ? new Date(n.alarm_at) : null;
    const isAlarm   = alarm_at && alarm_at <= now && !n.alarmed;
    const dtLabel   = alarm_at
      ? `⏰ ${alarm_at.toLocaleDateString('ja-JP',{month:'numeric',day:'numeric'})} ${alarm_at.toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})}`
      : '';
    const pastLabel = alarm_at && alarm_at < now ? ' (経過)' : '';

    return `
      <div class="note-card ${n.color}${isAlarm ? ' alarm' : ''}" onclick="handleCardClick(event,'${n.id}')">
        <div class="note-text">${escHtml(n.text)}</div>
        ${dtLabel ? `<div class="note-meta"><span class="timer-tag">${dtLabel}${pastLabel}</span></div>` : ''}
        <button class="note-del-btn" onclick="event.stopPropagation();deleteNote('${n.id}')" aria-label="削除">✕</button>
      </div>`;
  }).join('');
}

function handleCardClick(e, id) {
  if (e.target.classList.contains('note-del-btn')) return;
  const note = notes.find(n => String(n.id) === String(id));
  if (note && note.alarm_at) {
    const alarm_at = new Date(note.alarm_at);
    const now = new Date();
    if (alarm_at <= now && !note.alarmed) markAlarmed(id);
  }
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── タイマー・アラーム ──
function scheduleAlarms() {
  alarmTimers.forEach(clearTimeout);
  alarmTimers = [];
  const now = Date.now();
  notes.forEach(n => {
    if (!n.alarm_at || n.alarmed) return;
    const ms = new Date(n.alarm_at).getTime() - now;
    if (ms > 0 && ms < 7 * 24 * 60 * 60 * 1000) {
      const t = setTimeout(() => {
        renderNotes();
        showAlarmBanner(n.text);
      }, ms);
      alarmTimers.push(t);
    }
  });
}

function startAlarmLoop() {
  setInterval(() => {
    const now = new Date();
    const firing = notes.filter(n =>
      n.alarm_at && !n.alarmed && new Date(n.alarm_at) <= now
    );
    if (firing.length) {
      renderNotes();
      showAlarmBanner(firing[0].text);
    }
  }, 15000);
}

function showAlarmBanner(text) {
  const banner = document.getElementById('alarm-banner');
  const short = text.length > 40 ? text.slice(0,40) + '…' : text;
  document.getElementById('alarm-msg').textContent = `⏰ タイマー：${short}`;
  banner.classList.add('show');
  try { navigator.vibrate && navigator.vibrate([200,100,200]); } catch(e) {}
}

function dismissAlarm() {
  document.getElementById('alarm-banner').classList.remove('show');
  const now = new Date();
  notes.filter(n => n.alarm_at && !n.alarmed && new Date(n.alarm_at) <= now)
       .forEach(n => markAlarmed(n.id));
}

async function markAlarmed(id) {
  await sb.from('notes').update({ alarmed: true }).eq('id', id);
  const i = notes.findIndex(n => String(n.id) === String(id));
  if (i !== -1) notes[i].alarmed = true;
  renderNotes();
}

// ── UI ヘルパー ──
function selectColor(color, ctx) {
  selectedColor[ctx] = color;
  const row = document.getElementById(`${ctx}-color-row`);
  row.querySelectorAll('.color-dot').forEach(d => {
    d.classList.toggle('sel', d.dataset.color === color);
  });
}

function toggleTimer(ctx) {
  timerOn[ctx] = !timerOn[ctx];
  document.getElementById(`${ctx}-timer-switch`).classList.toggle('on', timerOn[ctx]);
  document.getElementById(`${ctx}-timer-wrap`).classList.toggle('show', timerOn[ctx]);
}

function setDefaultDateTime() {
  const dt = new Date(Date.now() + 60 * 60 * 1000);
  dt.setSeconds(0, 0);
  const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
    .toISOString().slice(0,16);
  ['side-timer-dt','modal-timer-dt'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = local;
  });
}

function openModal() {
  document.getElementById('modal-overlay').classList.add('show');
  setTimeout(() => document.getElementById('modal-text').focus(), 100);
}
function closeModal() {
  document.getElementById('modal-overlay').classList.remove('show');
}
function closeModalOnBg(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2200);
}

// キーボード Esc でモーダル閉じる
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});
