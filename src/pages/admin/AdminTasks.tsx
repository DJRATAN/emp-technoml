import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Plus, Loader2, Trash2, Download, Upload, Search, Filter,
  ChevronDown, Check, X, Calendar, ArrowUpDown, FileSpreadsheet, AlertCircle, UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

/* ── types ─────────────────────────────────────────────────────────── */
type Priority = 'low' | 'medium' | 'high';
type TaskStatus = 'pending' | 'in_progress' | 'completed';

interface Task {
  id: string; title: string; description: string | null; priority: Priority;
  status: TaskStatus; due_date: string | null; assigned_to: string | null;
  is_target: boolean; target_month: string | null; target_count: number | null;
  progress_count: number; profiles?: { full_name: string };
}
interface Emp { id: string; full_name: string }

/* ── helpers ───────────────────────────────────────────────────────── */
const PRIORITY_COLORS: Record<Priority, string> = {
  high: '#ef4444', medium: '#f59e0b', low: '#22c55e',
};
const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'To Do', in_progress: 'In Progress', completed: 'Done',
};
const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: '#94a3b8', in_progress: '#3b82f6', completed: '#22c55e',
};

/* ── inline dropdown ──────────────────────────────────────────────── */
function CellDropdown<T extends string>({
  value, options, colorMap, labelMap, onChange,
}: {
  value: T; options: T[];
  colorMap?: Record<string, string>; labelMap?: Record<string, string>;
  onChange: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const color = colorMap?.[value] ?? '#64748b';
  const label = labelMap?.[value] ?? value;

  return (
    <div ref={ref} className="relative" style={{ minWidth: 90 }}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium transition-all hover:opacity-80"
        style={{ background: color + '18', color, border: `1px solid ${color}30` }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
        {label}
        <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-xl py-1 min-w-[130px] animate-in fade-in-0 zoom-in-95 duration-150">
          {options.map(opt => {
            const c = colorMap?.[opt] ?? '#64748b';
            const l = labelMap?.[opt] ?? opt;
            return (
              <button key={opt} onClick={() => { onChange(opt); setOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-accent transition-colors"
              >
                <span className="w-2 h-2 rounded-full" style={{ background: c }} />
                <span style={{ color: c }} className="font-medium">{l}</span>
                {opt === value && <Check className="w-3 h-3 ml-auto text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── editable text cell ───────────────────────────────────────────── */
function EditableCell({
  value, onChange, placeholder, type = 'text', className = '',
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  type?: 'text' | 'date'; className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft.trim() !== value) onChange(draft.trim());
  };

  if (!editing) {
    return (
      <div onClick={() => setEditing(true)}
        className={`cursor-text px-2 py-1 rounded min-h-[28px] flex items-center hover:bg-accent/50 transition-colors text-sm ${!value ? 'text-muted-foreground italic' : ''} ${className}`}
      >
        {value || placeholder || '—'}
      </div>
    );
  }

  return (
    <input ref={inputRef} type={type} value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value); setEditing(false); } }}
      className={`w-full px-2 py-1 text-sm bg-background border-2 border-primary/40 rounded outline-none focus:border-primary transition-colors ${className}`}
      placeholder={placeholder}
    />
  );
}

/* ── assignee cell ────────────────────────────────────────────────── */
function AssigneeCell({ value, employees, onChange }: {
  value: string | null; employees: Emp[]; onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const current = employees.find(e => e.id === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = employees.filter(e =>
    e.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={ref} className="relative">
      <button onClick={() => { setOpen(!open); setSearch(''); }}
        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent/50 transition-colors text-sm min-h-[28px] w-full text-left"
      >
        {current ? (
          <>
            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
              {current.full_name.charAt(0).toUpperCase()}
            </span>
            <span className="truncate">{current.full_name}</span>
          </>
        ) : (
          <span className="text-muted-foreground italic">Unassigned</span>
        )}
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-xl py-1 min-w-[200px] max-h-[220px] animate-in fade-in-0 zoom-in-95 duration-150">
          <div className="px-2 pb-1">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              className="w-full text-xs px-2 py-1.5 bg-muted rounded border-0 outline-none"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto max-h-[160px]">
            {filtered.map(e => (
              <button key={e.id} onClick={() => { onChange(e.id); setOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-accent transition-colors"
              >
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                  {e.full_name.charAt(0).toUpperCase()}
                </span>
                {e.full_name}
                {e.id === value && <Check className="w-3 h-3 ml-auto text-primary" />}
              </button>
            ))}
            {filtered.length === 0 && <p className="text-xs text-muted-foreground px-3 py-2">No results</p>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── main component ───────────────────────────────────────────────── */
export default function AdminTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [sortCol, setSortCol] = useState<string>('created');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [hiddenCount, setHiddenCount] = useState(0);
  const newInputRef = useRef<HTMLInputElement>(null);

  // Upload state
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvDragOver, setCsvDragOver] = useState(false);
  const [csvAssignee, setCsvAssignee] = useState<string>('');
  const [csvFileName, setCsvFileName] = useState('');
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  /* ── data loading ─────────────────────────────────────────────── */
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const profilesQuery = supabase.from('profiles').select('id, full_name').eq('status', 'approved').order('full_name');
    if (user?.companyId) profilesQuery.eq('company_id', user.companyId);

    const { data: t, error: tErr } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
    
    console.log('[AdminTasks Debug] User:', { id: user?.id, role: user?.role, companyId: user?.companyId });
    console.log('[AdminTasks Debug] Raw count from DB:', t?.length, tErr);

    const [p, r] = await Promise.all([
      profilesQuery,
      supabase.from('user_roles').select('user_id, role')
    ]);
    const profMap = new Map((p.data ?? []).map((e: any) => [e.id, e]));
    const roleMap = new Map((r.data ?? []).map((ur: any) => [ur.user_id, ur.role]));

    let hCount = 0;
    const validTasks = ((t ?? []) as any[]).filter(task => {
      if (!task.id) return false;
      
      const taskCoId = String(task.company_id || '');
      const userCoId = String(user?.companyId || '');
      
      const isMatch = !task.company_id || taskCoId === userCoId;
      console.log(`[AdminTasks Debug] Task ${task.id}: company_id=${task.company_id}, match=${isMatch}`);
      return isMatch;
    });
    const tasksData = validTasks.map(task => ({
      ...task,
      profiles: task.assigned_to ? profMap.get(task.assigned_to) : undefined,
      assigner: task.assigned_by === user?.id ? { full_name: user?.name } : (task.assigned_by ? profMap.get(task.assigned_by) : undefined),
    }));
    setTasks(tasksData as Task[]);

    let allProfiles = ((p.data as Emp[]) ?? []).filter(prof => prof.id !== user?.id);
    if (user && !user.isOwner && user.role === 'admin') {
      allProfiles = allProfiles.filter(emp => roleMap.get(emp.id) === 'employee');
    }
    
    setEmployees(allProfiles);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  /* ── filtering & sorting ──────────────────────────────────────── */
  const filtered = useMemo(() => {
    let result = [...tasks];
    if (filterStatus !== 'all') result = result.filter(t => t.status === filterStatus);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q) ||
        (t.profiles?.full_name ?? '').toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (sortCol === 'title') cmp = a.title.localeCompare(b.title);
      else if (sortCol === 'priority') cmp = ['low', 'medium', 'high'].indexOf(a.priority) - ['low', 'medium', 'high'].indexOf(b.priority);
      else if (sortCol === 'status') cmp = a.status.localeCompare(b.status);
      else if (sortCol === 'due') cmp = (a.due_date ?? '').localeCompare(b.due_date ?? '');
      else if (sortCol === 'assignee') cmp = (a.profiles?.full_name ?? '').localeCompare(b.profiles?.full_name ?? '');
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [tasks, filterStatus, searchQuery, sortCol, sortDir]);

  const allSelected = filtered.length > 0 && filtered.every(t => selected.has(t.id));

  /* ── CRUD ─────────────────────────────────────────────────────── */
  async function updateField(id: string, field: string, value: any) {
    // Optimistic local update so UI changes instantly
    setTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value,
      ...(field === 'assigned_to' ? { profiles: employees.find(e => e.id === value) } : {}),
    } : t));

    const { error, count } = await supabase
      .from('tasks')
      .update({ [field]: value } as any)
      .eq('id', id);

    if (error) {
      toast.error(error.message);
      load(); // revert
      return;
    }
    toast.success('Updated');
  }

  async function addRow() {
    if (!user?.companyId || !newTitle.trim()) return;
    setAdding(true);
    const { error } = await supabase.from('tasks').insert({
      title: newTitle.trim(), description: null, priority: 'medium', status: 'pending',
      due_date: null, assigned_to: null, assigned_by: user.id,
      company_id: user.companyId, is_target: false,
    } as any);
    setAdding(false);
    if (error) return toast.error(error.message);
    toast.success('Task added');
    setNewTitle('');
    load();
  }

  async function bulkDelete() {
    const ids = [...selected];
    if (!ids.length) return;
    const { error } = await supabase.from('tasks').delete().in('id', ids);
    if (error) return toast.error(error.message);
    toast.success(`Deleted ${ids.length} task(s)`);
    setSelected(new Set());
    load();
  }

  async function removeOne(id: string) {
    setBusyIds(s => new Set(s).add(id));
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    setBusyIds(s => { const n = new Set(s); n.delete(id); return n; });
    if (error) return toast.error(error.message);
    toast.success('Deleted');
    load();
  }

  function exportCsv() {
    const header = 'Title,Status,Priority,Assignee,Due Date,Description';
    const rows = filtered.map(t =>
      `"${t.title}","${STATUS_LABELS[t.status]}","${t.priority}","${t.profiles?.full_name ?? ''}","${t.due_date ?? ''}","${t.description ?? ''}"`
    );
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'tasks.csv'; a.click();
  }

  /* ── File import (CSV + Excel) ────────────────────────────────── */
  function handleFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    setCsvFileName(file.name);
    if (ext === 'csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) return toast.error('File must have a header row and at least one data row');
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const lowerHeaders = headers.map(h => h.toLowerCase());
        const rows = lines.slice(1).map(line => {
          const vals = line.match(/("[^"]*"|[^,]*)/g) ?? [];
          const row: Record<string, string> = {};
          lowerHeaders.forEach((h, i) => { row[h] = (vals[i] ?? '').trim().replace(/^"|"$/g, ''); });
          return row;
        });
        setCsvHeaders(headers);
        setCsvData(rows);
      };
      reader.readAsText(file);
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
        if (!json.length) return toast.error('No data found in the Excel file');
        const headers = Object.keys(json[0]);
        const rows = json.map(r => {
          const row: Record<string, string> = {};
          headers.forEach(h => { row[h.toLowerCase()] = String(r[h] ?? ''); });
          return row;
        });
        setCsvHeaders(headers);
        setCsvData(rows);
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast.error('Please upload a .csv, .xlsx, or .xls file');
    }
  }

  function mapField(row: Record<string, string>, keys: string[]): string | null {
    for (const k of keys) { if (row[k]?.trim()) return row[k].trim(); }
    return null;
  }

  async function importFile() {
    if (!user?.companyId || csvData.length === 0) return;
    if (!csvAssignee) return toast.error('Please select an employee to assign tasks to');
    setCsvUploading(true);
    const inserts = csvData.map((row, idx) => {
      const title = mapField(row, ['title', 'task', 'task name', 'name', 'task_name', 'team']) ?? `Row ${idx + 1}`;
      const desc = mapField(row, ['description', 'desc', 'details', 'notes']);
      const targetVal = mapField(row, ['target', 'target_count']);
      const achieveVal = mapField(row, ['achieve target', 'achieve_target', 'achieved', 'progress', 'progress_count']);
      const isTarget = !!targetVal && Number(targetVal) > 0;
      // Build extra data string from all other columns
      const knownKeys = new Set(['sr no', 'sno', 's.no', 'title', 'task', 'task name', 'name', 'task_name', 'team',
        'description', 'desc', 'details', 'notes', 'target', 'target_count',
        'achieve target', 'achieve_target', 'achieved', 'progress', 'progress_count',
        'priority', 'prio', 'status', 'state', 'due_date', 'due date', 'due', 'deadline',
        'assignee', 'assigned_to', 'assigned to', 'assign', 'employee', 'owner']);
      const extras: Record<string, string> = {};
      Object.entries(row).forEach(([k, v]) => {
        if (!knownKeys.has(k) && v && v !== '0') extras[k] = v;
      });
      const extraStr = Object.keys(extras).length > 0 ? JSON.stringify(extras) : null;
      const fullDesc = [desc, extraStr].filter(Boolean).join('\n');
      return {
        title,
        description: fullDesc || null,
        priority: 'medium' as Priority,
        status: 'pending' as TaskStatus,
        due_date: mapField(row, ['due_date', 'due date', 'due', 'deadline', 'date']) || null,
        assigned_to: csvAssignee,
        assigned_by: user.id,
        company_id: user.companyId,
        is_target: isTarget,
        target_count: isTarget ? Number(targetVal) : null,
        progress_count: achieveVal ? Number(achieveVal) : 0,
      };
    });
    const { error } = await supabase.from('tasks').insert(inserts as any);
    setCsvUploading(false);
    if (error) return toast.error(error.message);
    toast.success(`Imported ${inserts.length} task(s)`);
    setCsvOpen(false); setCsvData([]); setCsvHeaders([]); setCsvAssignee(''); setCsvFileName('');
    load();
  }

  function toggleSort(col: string) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  }

  /* ── column definitions ───────────────────────────────────────── */
  const columns = [
    { key: 'title', label: 'Task Name', width: 'minmax(220px, 2fr)' },
    { key: 'status', label: 'Status', width: '140px' },
    { key: 'priority', label: 'Priority', width: '120px' },
    { key: 'assignee', label: 'Assignee', width: 'minmax(160px, 1fr)' },
    { key: 'assigned_by', label: 'Assigned By', width: '140px' },
    { key: 'due', label: 'Due Date', width: '140px' },
    { key: 'actions', label: '', width: '50px' },
  ];

  const gridTemplate = `40px ${columns.map(c => c.width).join(' ')}`;

  /* ── stats ────────────────────────────────────────────────────── */
  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'pending').length,
    progress: tasks.filter(t => t.status === 'in_progress').length,
    done: tasks.filter(t => t.status === 'completed').length,
  };

  /* ── render ───────────────────────────────────────────────────── */
  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* DEBUG ALERT - REMOVE LATER */}
        <div className="bg-destructive/10 border-2 border-destructive p-4 rounded-xl flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <div>
              <p className="font-bold text-destructive">DEBUG MODE ACTIVE</p>
              <p className="text-xs font-mono">UID: {user?.id?.slice(0,8)}... | Role: {user?.role} | CoID: {user?.companyId || 'NULL'} | Raw Tasks: {tasks.length}</p>
            </div>
          </div>
          <Button size="sm" variant="destructive" onClick={() => load()}>Reload Data</Button>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-heading font-bold">Tasks</h1>
            <p className="text-muted-foreground text-sm">Manage and assign tasks — spreadsheet style</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCsvOpen(true)}>
              <Upload className="h-3.5 w-3.5 mr-1.5" />Upload Excel / CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="h-3.5 w-3.5 mr-1.5" />Export CSV
            </Button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            { label: 'Total Tasks', value: stats.total, color: '#6366f1' },
            { label: 'To Do', value: stats.todo, color: STATUS_COLORS.pending },
            { label: 'In Progress', value: stats.progress, color: STATUS_COLORS.in_progress },
            { label: 'Completed', value: stats.done, color: STATUS_COLORS.completed },
          ]).map(s => (
            <div key={s.label} className="rounded-xl border bg-card p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: s.color }}>
                {s.value}
              </div>
              <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search tasks..." className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border bg-card outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 bg-muted/20 px-3 py-1 rounded-lg border border-border/50">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">System View</span>
            <Checkbox checked={showAll} onCheckedChange={(v) => { setShowAll(!!v); load(); }} id="show-all" />
            <label htmlFor="show-all" className="text-xs cursor-pointer select-none font-medium">Show All Data</label>
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            {(['all', 'pending', 'in_progress', 'completed'] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${filterStatus === s ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent'}`}
              >
                {s === 'all' ? 'All' : STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          {selected.size > 0 && (
            <Button variant="destructive" size="sm" onClick={bulkDelete}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />Delete {selected.size}
            </Button>
          )}
        </div>

        {hiddenCount > 0 && !showAll && (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center justify-between gap-3 text-amber-800 text-xs animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span><strong>{hiddenCount} tasks</strong> are hidden because their Company ID does not match yours.</span>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-[10px] border-amber-300 bg-amber-100/50 hover:bg-amber-100 text-amber-900" onClick={() => { setShowAll(true); load(); }}>
              Show All Anyway
            </Button>
          </div>
        )}

        {/* Spreadsheet grid */}
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            {/* Header row */}
            <div className="grid items-center border-b bg-muted/40 sticky top-0 z-10"
              style={{ gridTemplateColumns: gridTemplate, minWidth: 800 }}
            >
              <div className="flex items-center justify-center h-10 border-r border-border/50">
                <Checkbox checked={allSelected}
                  onCheckedChange={() => {
                    if (allSelected) setSelected(new Set());
                    else setSelected(new Set(filtered.map(t => t.id)));
                  }}
                />
              </div>
              {columns.map(col => (
                <div key={col.key}
                  onClick={() => col.key !== 'actions' && toggleSort(col.key)}
                  className={`flex items-center gap-1 px-3 h-10 text-xs font-semibold text-muted-foreground uppercase tracking-wider select-none border-r border-border/50 last:border-r-0 ${col.key !== 'actions' ? 'cursor-pointer hover:bg-accent/30 transition-colors' : ''}`}
                >
                  {col.label}
                  {sortCol === col.key && <ArrowUpDown className="w-3 h-3 opacity-60" />}
                </div>
              ))}
            </div>

            {/* Body */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <p className="text-sm">No tasks found</p>
                <p className="text-xs mt-1">Click "+ Add Task" below to create one</p>
              </div>
            ) : (
              filtered.map((task, idx) => (
                <div key={task.id}
                  className={`grid items-center border-b border-border/30 transition-colors group ${selected.has(task.id) ? 'bg-primary/5' : idx % 2 === 0 ? 'bg-transparent' : 'bg-muted/15'} hover:bg-accent/30`}
                  style={{ gridTemplateColumns: gridTemplate, minWidth: 800 }}
                >
                  {/* Checkbox */}
                  <div className="flex items-center justify-center h-full border-r border-border/30 py-1.5">
                    <Checkbox checked={selected.has(task.id)}
                      onCheckedChange={() => setSelected(prev => {
                        const n = new Set(prev);
                        n.has(task.id) ? n.delete(task.id) : n.add(task.id);
                        return n;
                      })}
                    />
                  </div>

                  {/* Title */}
                  <div className="border-r border-border/30 py-0.5 px-1">
                    <EditableCell key={`title-${task.id}`} value={task.title} placeholder="Task name..."
                      onChange={v => updateField(task.id, 'title', v)} className="font-medium"
                    />
                  </div>

                  {/* Status */}
                  <div className="border-r border-border/30 py-1 px-2">
                    <CellDropdown key={`status-${task.id}`} value={task.status}
                      options={['pending', 'in_progress', 'completed']}
                      colorMap={STATUS_COLORS} labelMap={STATUS_LABELS}
                      onChange={v => updateField(task.id, 'status', v)}
                    />
                  </div>

                  {/* Priority */}
                  <div className="border-r border-border/30 py-1 px-2">
                    <CellDropdown key={`priority-${task.id}`} value={task.priority}
                      options={['low', 'medium', 'high']}
                      colorMap={PRIORITY_COLORS}
                      labelMap={{ low: 'Low', medium: 'Medium', high: 'High' }}
                      onChange={v => updateField(task.id, 'priority', v)}
                    />
                  </div>

                  {/* Assignee */}
                  <div className="border-r border-border/30 py-0.5">
                    <AssigneeCell key={`assignee-${task.id}`} value={task.assigned_to} employees={employees}
                      onChange={id => updateField(task.id, 'assigned_to', id)}
                    />
                  </div>

                  {/* Assigned By */}
                  <div className="border-r border-border/30 py-1.5 px-3">
                    <span className="text-xs text-muted-foreground whitespace-nowrap truncate block">
                      {(task as any).assigner?.full_name || 'System'}
                    </span>
                  </div>

                  {/* Due date */}
                  <div className="border-r border-border/30 py-0.5 px-1">
                    <EditableCell value={task.due_date ?? ''} type="date"
                      placeholder="No date" onChange={v => updateField(task.id, 'due_date', v || null)}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-center py-1">
                    <button onClick={() => removeOne(task.id)} disabled={busyIds.has(task.id)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                    >
                      {busyIds.has(task.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* Add new row */}
            <div className="grid items-center bg-muted/10 border-t border-dashed border-border/50"
              style={{ gridTemplateColumns: gridTemplate, minWidth: 800 }}
            >
              <div className="flex items-center justify-center h-10 border-r border-border/30">
                <Plus className="w-3.5 h-3.5 text-primary/60" />
              </div>
              <div className="col-span-5 px-2 py-1.5 border-r border-border/30">
                <div className="flex items-center gap-2">
                  <input ref={newInputRef} value={newTitle} onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newTitle.trim()) addRow(); }}
                    placeholder="+ Add a new task... (press Enter)"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50 py-1"
                  />
                  {newTitle.trim() && (
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" disabled={adding} onClick={addRow}>
                        {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3 mr-1" />Add</>}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs text-muted-foreground" onClick={() => setNewTitle('')}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div />
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-xs text-muted-foreground text-center">
          {filtered.length} task{filtered.length !== 1 ? 's' : ''} · Click any cell to edit inline · All changes auto-save
        </p>

        {/* CSV Upload Modal */}
        {csvOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-200">
            <div className="bg-card border rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
              {/* Modal header */}
              <div className="flex items-center justify-between p-5 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-heading font-bold">Import from Excel / CSV</h2>
                    <p className="text-xs text-muted-foreground">Upload a file to bulk-create tasks & targets</p>
                  </div>
                </div>
                <button onClick={() => { setCsvOpen(false); setCsvData([]); setCsvHeaders([]); setCsvAssignee(''); setCsvFileName(''); }}
                  className="p-1.5 rounded-lg hover:bg-accent transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal body */}
              <div className="p-5 overflow-y-auto flex-1">
                {csvData.length === 0 ? (
                  <>
                    {/* Drop zone */}
                    <div
                      onDragOver={e => { e.preventDefault(); setCsvDragOver(true); }}
                      onDragLeave={() => setCsvDragOver(false)}
                      onDrop={e => { e.preventDefault(); setCsvDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                      onClick={() => csvInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                        csvDragOver ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border hover:border-primary/40 hover:bg-accent/30'
                      }`}
                    >
                      <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-sm font-medium">Drop your Excel or CSV file here</p>
                      <p className="text-xs text-muted-foreground mt-1.5">Supports .xlsx, .xls, and .csv files</p>
                      <input ref={csvInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
                      />
                    </div>

                    {/* Expected format */}
                    <div className="mt-5 p-4 rounded-xl bg-muted/40 border">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-3.5 h-3.5 text-primary" />
                        <p className="text-xs font-semibold">Supported Columns (auto-detected from your file)</p>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>Headers are read automatically from your file. Recognized columns:</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {['SR NO', 'TEAM', 'TARGET', 'ACHIEVE TARGET', 'SBI', 'HDFC', 'PENDING POINT', 'Title', 'Priority', 'Status', 'Due Date'].map(col => (
                            <span key={col} className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-mono text-[10px] font-medium">{col}</span>
                          ))}
                        </div>
                        <p className="mt-2 italic">All columns from your Excel are preserved. You'll assign an employee after upload.</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* File info + Assign employee */}
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <div>
                        <p className="text-sm font-medium">
                          <span className="text-primary font-bold">{csvData.length}</span> row{csvData.length !== 1 ? 's' : ''} found
                          {csvFileName && <span className="text-muted-foreground ml-2 text-xs">from {csvFileName}</span>}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setCsvData([]); setCsvHeaders([]); setCsvFileName(''); }}>
                        <X className="w-3 h-3 mr-1" />Clear
                      </Button>
                    </div>

                    {/* Employee assignment */}
                    <div className="mb-4 p-3 rounded-xl border bg-muted/20">
                      <div className="flex items-center gap-2 mb-2">
                        <UserCheck className="w-4 h-4 text-primary" />
                        <p className="text-sm font-semibold">Assign to Employee</p>
                      </div>
                      <select value={csvAssignee} onChange={e => setCsvAssignee(e.target.value)}
                        className="w-full h-9 px-3 text-sm rounded-lg border bg-background outline-none focus:ring-2 focus:ring-primary/30">
                        <option value="">— Select an employee —</option>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                      </select>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto max-h-[300px]">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/50 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold text-muted-foreground">#</th>
                              {csvHeaders.map(h => (
                                <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {csvData.slice(0, 50).map((row, i) => (
                              <tr key={i} className={`border-t border-border/30 ${i % 2 === 0 ? '' : 'bg-muted/15'}`}>
                                <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                                {csvHeaders.map(h => (
                                  <td key={h} className="px-3 py-1.5 max-w-[200px] truncate">{row[h] || '—'}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {csvData.length > 50 && (
                        <p className="text-[10px] text-muted-foreground text-center py-1.5 bg-muted/30 border-t">Showing first 50 of {csvData.length} rows</p>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Modal footer */}
              {csvData.length > 0 && (
                <div className="p-5 border-t bg-muted/20 space-y-3">
                  {!csvAssignee && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-warning/10 border border-warning/30">
                      <AlertCircle className="w-4 h-4 text-warning shrink-0" />
                      <p className="text-xs text-warning font-medium">Please select an employee above to assign these tasks</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    <Button variant="outline" onClick={() => { setCsvOpen(false); setCsvData([]); setCsvHeaders([]); setCsvAssignee(''); setCsvFileName(''); }}>
                      Cancel
                    </Button>
                    <Button
                      disabled={csvUploading || !csvAssignee}
                      onClick={importFile}
                      className="px-6 py-2.5 text-sm font-semibold shadow-lg hover:shadow-xl transition-all"
                      style={{ background: csvAssignee ? undefined : undefined }}
                    >
                      {csvUploading ? (
                        <><Loader2 className="w-4 h-4 animate-spin mr-2" />Submitting...</>
                      ) : (
                        <><UserCheck className="w-4 h-4 mr-2" />Assign & Submit {csvData.length} Row{csvData.length !== 1 ? 's' : ''}</>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
