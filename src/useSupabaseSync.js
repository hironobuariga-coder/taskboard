// src/useSupabaseSync.js
// ─────────────────────────────────────────────────────────────
// localStorage との二重保存＋Supabase同期フック
//
// 使い方：
//   const { tasks, setTasks, notes, setNotes, syncing, syncError } = useSupabaseSync();
//
// - オフライン時・Supabase未設定時は localStorage のみで動作（フォールバック）
// - 初回マウント時にSupabaseからデータを取得し、localStorageと新しい方をマージ
// - 変更時はlocalStorageに即時保存 → バックグラウンドでSupabaseに反映
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient';

const LS_TASKS = 'tasks-v1';
const LS_NOTES = 'notes-v1';

// localStorage から読む
const lsGet = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

// localStorage に書く
const lsSet = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
};

// Supabase が設定されているか確認
const hasSupabase = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return Boolean(url && key && url !== 'undefined' && key !== 'undefined');
};

export function useSupabaseSync() {
  const [tasks,     setTasksState] = useState(() => lsGet(LS_TASKS, []));
  const [notes,     setNotesState] = useState(() => lsGet(LS_NOTES, []));
  const [syncing,   setSyncing]    = useState(false);
  const [syncError, setSyncError]  = useState(null);

  // 初回ロード：Supabaseからデータを取得してlocalStorageとマージ
  useEffect(() => {
    if (!hasSupabase()) return;

    (async () => {
      setSyncing(true);
      setSyncError(null);
      try {
        // タスク取得
        const { data: remoteTasks, error: tErr } = await supabase
          .from('tasks')
          .select('*')
          .order('order_index', { ascending: true });

        if (tErr) throw tErr;

        // ローカルとリモートをマージ（updated_at が新しい方を優先）
        const localTasks = lsGet(LS_TASKS, []);
        const merged = mergeByUpdatedAt(localTasks, remoteTasks ?? []);
        setTasksState(merged);
        lsSet(LS_TASKS, merged);

        // リモートに存在しないローカルタスクをアップサート
        const remoteIds = new Set((remoteTasks ?? []).map(t => t.id));
        const localOnly = localTasks.filter(t => !remoteIds.has(t.id));
        if (localOnly.length > 0) {
          await supabase.from('tasks').upsert(localOnly.map(toDbTask));
        }

        // 付箋取得
        const { data: remoteNotes, error: nErr } = await supabase
          .from('notes')
          .select('*');

        if (nErr) throw nErr;

        const localNotes = lsGet(LS_NOTES, []);
        const mergedNotes = mergeByUpdatedAt(localNotes, remoteNotes ?? []);
        setNotesState(mergedNotes);
        lsSet(LS_NOTES, mergedNotes);

        const remoteNoteIds = new Set((remoteNotes ?? []).map(n => n.id));
        const localOnlyNotes = localNotes.filter(n => !remoteNoteIds.has(n.id));
        if (localOnlyNotes.length > 0) {
          await supabase.from('notes').upsert(localOnlyNotes);
        }
      } catch (err) {
        console.warn('[Supabase] 初回同期失敗（ローカルで継続）:', err.message);
        setSyncError(err.message);
      } finally {
        setSyncing(false);
      }
    })();
  }, []);

  // タスクを更新（localStorage即時 + Supabase非同期）
  const setTasks = useCallback((updater) => {
    setTasksState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      lsSet(LS_TASKS, next);
      if (hasSupabase()) {
        supabase.from('tasks').upsert(next.map(toDbTask))
          .then(({ error }) => { if (error) console.warn('[Supabase] tasks upsert失敗:', error.message); });
      }
      return next;
    });
  }, []);

  // 付箋を更新（localStorage即時 + Supabase非同期）
  const setNotes = useCallback((updater) => {
    setNotesState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      lsSet(LS_NOTES, next);
      if (hasSupabase()) {
        supabase.from('notes').upsert(next)
          .then(({ error }) => { if (error) console.warn('[Supabase] notes upsert失敗:', error.message); });
      }
      return next;
    });
  }, []);

  // タスクを削除
  const deleteTask = useCallback((id) => {
    setTasksState(prev => {
      const next = prev.filter(t => t.id !== id);
      lsSet(LS_TASKS, next);
      if (hasSupabase()) {
        supabase.from('tasks').delete().eq('id', id)
          .then(({ error }) => { if (error) console.warn('[Supabase] task delete失敗:', error.message); });
      }
      return next;
    });
  }, []);

  // 付箋を削除
  const deleteNote = useCallback((id) => {
    setNotesState(prev => {
      const next = prev.filter(n => n.id !== id);
      lsSet(LS_NOTES, next);
      if (hasSupabase()) {
        supabase.from('notes').delete().eq('id', id)
          .then(({ error }) => { if (error) console.warn('[Supabase] note delete失敗:', error.message); });
      }
      return next;
    });
  }, []);

  return { tasks, setTasks, deleteTask, notes, setNotes, deleteNote, syncing, syncError };
}

// ─── ヘルパー ──────────────────────────────────────────────

// Reactアプリの task オブジェクト → DB行 に変換
function toDbTask(t) {
  return {
    id:          t.id,
    title:       t.title       ?? '',
    description: t.description ?? '',
    status:      t.status      ?? 'Todo',
    priority:    t.priority    ?? 'Medium',
    order_index: t.order       ?? 0,
    created_at:  t.createdAt   ?? Date.now(),
    updated_at:  t.updatedAt   ?? Date.now(),
  };
}

// ローカルとリモートを updated_at が新しい方で統合
function mergeByUpdatedAt(local, remote) {
  const map = new Map();

  // ローカルを先に入れる
  for (const item of local) {
    map.set(item.id, item);
  }

  // リモートで updated_at が新しければ上書き
  for (const item of remote) {
    const existing = map.get(item.id);
    const remoteTs = item.updated_at ?? 0;
    const localTs  = existing?.updatedAt ?? existing?.updated_at ?? 0;
    if (!existing || remoteTs > localTs) {
      // DBのスネークケース → アプリのキャメルケースに変換
      map.set(item.id, {
        id:          item.id,
        title:       item.title,
        description: item.description ?? '',
        status:      item.status,
        priority:    item.priority,
        order:       item.order_index ?? 0,
        createdAt:   item.created_at,
        updatedAt:   item.updated_at,
      });
    }
  }

  return Array.from(map.values());
}
