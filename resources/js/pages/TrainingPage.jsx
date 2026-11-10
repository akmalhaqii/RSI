import PerformanceOverview from './PerformanceOverview';
import EvaluationForm from './EvaluationForm';
import TrainingPlanForm, { planStatuses } from './TrainingPlanForm';
import { useEffect, useMemo, useState } from 'react';
import {
    Activity, ArrowDownRight, ArrowRight, Bell, BookOpen, BriefcaseBusiness, CalendarDays, Check, CheckCircle2,
    ChevronDown, ChevronRight, ClipboardCheck, ClipboardList, Clock3, FileText, GraduationCap, Home, LayoutDashboard,
    LogOut, Menu, Search, Settings2, ShieldCheck, Target, UsersRound, X, ChartNoAxesColumnIncreasing, Eye, EyeOff, UserRound, LockKeyhole, Network, Gauge,
} from 'lucide-react';

const screens = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['employee', 'manager', 'hr'] },
    { id: 'notifications', label: 'Notifikasi', icon: Bell, roles: ['employee', 'manager', 'hr'] },
    { id: 'targets', label: 'Target Pelatihan', icon: Target, roles: ['employee'] },
    { id: 'tasks', label: 'Daftar Tugas', icon: ClipboardList, roles: ['employee'] },
    { id: 'assessment', label: 'Skill Assessment', icon: Activity, roles: ['employee'] },
    { id: 'tests', label: 'Tes Pelatihan', icon: ClipboardCheck, roles: ['employee'] },
    { id: 'active', label: 'Daftar Pelatihan', icon: BookOpen, roles: ['employee'] },
    { id: 'catalog', label: 'Rekomendasi Pelatihan', icon: GraduationCap, roles: ['employee'] },
    { id: 'attendance', label: 'Presensi', icon: CheckCircle2, roles: ['employee'] },
    { id: 'materials', label: 'Materi Pelatihan', icon: FileText, roles: ['employee'] },
    { id: 'history', label: 'Riwayat Pelatihan', icon: Clock3, roles: ['employee'] },
    { id: 'schedule', label: 'Jadwal Pelatihan', icon: CalendarDays, roles: ['employee'] },
    { id: 'kpi-input', label: 'Penilaian KPI Staf', icon: Target, roles: ['manager'] },
    { id: 'targets-overview', label: 'Pemantauan Target', icon: ArrowDownRight, roles: ['manager'] },
    { id: 'employees', label: 'Data Karyawan', icon: UsersRound, roles: ['hr'] },
    { id: 'sessions', label: 'Kelola Pelatihan', icon: BookOpen, roles: ['hr'] },
    { id: 'participants', label: 'Peserta Pelatihan', icon: UsersRound, roles: ['hr'] },
    { id: 'assessments-review', label: 'Tinjauan Assessment', icon: ClipboardCheck, roles: ['hr'] },
    { id: 'performance', label: 'Pemantauan Kinerja', icon: Activity, roles: ['hr'] },
    { id: 'kpi-review', label: 'Tinjauan Nilai KPI', icon: Target, roles: ['hr'] },
    { id: 'plans', label: 'Rencana Pelatihan', icon: BriefcaseBusiness, roles: ['hr'] },
];

function Brand() { return <><span className="brand-mark"><ChartNoAxesColumnIncreasing size={23} strokeWidth={2.2} /></span><span className="brand-wordmark">Skill<span>Grow</span></span></>; }

const roleLabels = { employee: 'Karyawan', manager: 'Manajer', hr: 'HR / PSDM' };

const dateId = (value) => value ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${String(value).slice(0, 10)}T00:00:00`)) : '—';

async function api(url, options = {}) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]');
    const response = await fetch(url, {
        ...options,
        credentials: 'same-origin',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken?.content ?? '', ...options.headers },
    });
    const payload = await response.json().catch(() => ({}));
    if (csrfToken && payload.csrf_token) csrfToken.content = payload.csrf_token;
    if (!response.ok) {
        const errors = Object.values(payload.errors ?? {}).flat();
        const failure = new Error(errors[0] ?? payload.message ?? 'Permintaan tidak dapat diproses.');
        failure.status = response.status;
        throw failure;
    }
    return payload;
}

function StatCard({ label, value, note, icon: Icon, tone = 'orange' }) {
    return <article className="stat-card"><span className={`stat-icon ${tone}`}><Icon size={18} /></span><div><p>{label}</p><strong>{value}</strong><small>{note}</small></div></article>;
}

function Table({ columns, rows, empty = 'Belum ada data untuk ditampilkan.', rowKey = 'id' }) {
    if (!rows.length) return <div className="table-empty"><span className="empty-symbol"><FileText size={22} /></span><strong>{empty}</strong><small>Data akan muncul di sini setelah tersedia.</small></div>;
    return <div className="table-scroll"><table><thead><tr>{columns.map((col) => <th key={col.key}>{col.label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row[rowKey] ?? index}>{columns.map((col) => <td key={col.key}>{col.render ? col.render(row) : row[col.key] ?? '—'}</td>)}</tr>)}</tbody></table></div>;
}

function Badge({ children }) {
    const value = String(children ?? '—').toLowerCase();
    const tone = /tercapai|selesai|hadir|lulus|aktif|terdaftar/.test(value) ? 'green' : /belum|izin|berlangsung|jadwal|proses/.test(value) ? 'amber' : 'gray';
    return <span className={`badge ${tone}`}>{children}</span>;
}

function TrainingPage() {
    const [user, setUser] = useState(null);
    const [data, setData] = useState(null);
    const [screen, setScreen] = useState('dashboard');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('Semua');
    const [selectedParticipantIds, setSelectedParticipantIds] = useState([]);
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
    const [typeFilter, setTypeFilter] = useState('Semua');
    const [actionError, setActionError] = useState('');
    const [actionBusy, setActionBusy] = useState(false);
    const [toast, setToast] = useState('');
    const [modal, setModal] = useState('');
    const [selected, setSelected] = useState(null);
    const [sessionId, setSessionId] = useState('');
    const [mobileNav, setMobileNav] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [authMode, setAuthMode] = useState(() => window.location.pathname === '/forgot-password' ? 'forgot' : window.location.pathname.startsWith('/reset-password/') ? 'reset' : 'login');
    const [authNotice, setAuthNotice] = useState('');
    const [accessBlocked, setAccessBlocked] = useState(false);

    const loadWorkspace = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await api('/api/v1/workspace');
            setData(result);
            setUser(result.user);
        } catch (loadError) {
            setError(loadError.message);
            if ([401, 403].includes(loadError.status)) { setData(null); setUser(null); }
        } finally { setLoading(false); }
    };

    useEffect(() => {
        api('/api/v1/me').then((result) => setUser(result.user)).catch(() => setUser(null));
    }, []);
    useEffect(() => { if (user) loadWorkspace(); }, [user?.id]);
    useEffect(() => { if (!screens.find((item) => item.id === screen)?.roles.includes(user?.role)) setScreen('dashboard'); }, [user?.role]);
    useEffect(() => { if (!toast) return undefined; const timer = setTimeout(() => setToast(''), 3500); return () => clearTimeout(timer); }, [toast]);

    const visibleScreens = useMemo(() => screens.filter((item) => item.roles.includes(user?.role)), [user?.role]);
    const filtered = (rows, keys) => (rows ?? []).filter((row) => keys.some((key) => String(row[key] ?? '').toLowerCase().includes(search.toLowerCase())));

    const requestAction = (payload) => api('/api/v1/actions', { method: 'POST', body: JSON.stringify(payload) });

    const runAction = async (payload, keepDetail = false) => {
        if (actionBusy) return;
        setActionError('');
        setActionBusy(true);
        try {
            const result = await requestAction(payload);
            setToast(result.message ?? 'Perubahan berhasil disimpan.');
            if (['assign', 'unassign'].includes(payload.action)) {
                setSelectedParticipantIds([]);
                setSelectedEmployeeIds([]);
            }
            if (!keepDetail) {
                setModal('');
                setSelected(null);
            }
            await loadWorkspace();
        } catch (failure) {
            if (modal || keepDetail) setActionError(failure.message);
            else setError(failure.message);
        } finally {
            setActionBusy(false);
        }
    };

    const openDetail = (kind, item) => {
        setSelected(item);
        setModal(kind);
    };

    useEffect(() => { setActionError(''); }, [modal]);

    const current = screens.find((item) => item.id === screen) ?? screens[0];
    const sessions = data?.sessions ?? [];
    const plans = data?.plans ?? [];
    const employees = data?.employees ?? [];
    const enrollments = data?.enrollments ?? [];
    const enrolledIds = new Set(enrollments.map((item) => Number(item.training_session_id)));
    const activeEnrollments = enrollments.filter((item) => !['Selesai', 'Lulus', 'Belum lulus'].includes(item.status));
    const sessionTime = (session, field = 'starts_at') => new Date(session.date + 'T' + session[field].slice(0, 5) + ':00+07:00');
    const nextTraining = sessions.find((session) => session.status === 'Terjadwal' && sessionTime(session) >= new Date()
        && activeEnrollments.some((item) => item.training_session_id === session.id));

    const screenContent = () => {
        if (!data) return <div className="panel loading-panel">{loading ? 'Memuat ruang kerja…' : error || 'Menghubungkan ke SkillGrow…'}{error && <p><button className="outline-button" onClick={loadWorkspace}>Coba Lagi</button></p>}</div>;
        if (screen === 'dashboard') return <>
            <div className="welcome-banner"><div><span className="eyebrow">{roleLabels[user.role]} · {dateId(new Date().toISOString())}</span><h2>Halo, {user.name.split(' ')[0]} 👋</h2><p>Berikut ringkasan aktivitas pengembangan kompetensimu.</p></div><span className="welcome-art"><GraduationCap size={66} strokeWidth={1.2} /></span></div>
            <div className="stats-grid">
                <StatCard label="Pelatihan aktif" value={activeEnrollments.length} note="Sesi yang sedang kamu ikuti" icon={BookOpen} />
                <StatCard label="Target pelatihan" value={data.targets.length} note={`${data.targets.filter((item) => item.status === 'Selesai').length} target selesai`} icon={Target} tone="purple" />
                <StatCard label="Tugas terbuka" value={data.tasks.filter((item) => item.status !== 'Selesai').length} note="Tugas menunggu penyelesaian" icon={ClipboardList} tone="blue" />
                <StatCard label="Rata-rata KPI" value={`${Math.round(data.kpis.reduce((sum, item) => sum + Number(item.achievement ?? 0), 0) / Math.max(data.kpis.length, 1))}%`} note="Periode Q4 2026" icon={Activity} tone="green" />
            </div>
            <section className="panel"><div className="panel-heading"><div><h2>Jadwal Terdekat</h2><p>Pelatihan yang akan datang dan sedang berlangsung</p></div><button className="text-button" onClick={() => setScreen('schedule')}>Lihat semua <ArrowRight size={15} /></button></div>
                <Table columns={[{ key: 'training_name', label: 'Nama pelatihan', render: (r) => <strong>{r.training_name}</strong> }, { key: 'date', label: 'Tanggal', render: (r) => dateId(r.date) }, { key: 'location', label: 'Lokasi', render: (r) => sessions.find((s) => s.id === r.training_session_id)?.location }, { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> }]} rows={nextTraining ? [nextTraining] : []} empty="Tidak ada jadwal mendatang." />
            </section>
        </>;

        if (screen === 'active') return <section className="panel"><div className="panel-heading"><div><h2>Pelatihan aktifmu</h2><p>Sesi yang sedang atau akan kamu ikuti.</p></div><button className="outline-button" onClick={() => setScreen('catalog')}>Jelajahi pelatihan</button></div><Table columns={[{ key: 'session_code', label: 'Kode sesi' }, { key: 'training_name', label: 'Nama pelatihan', render: (r) => <strong>{r.training_name}</strong> }, { key: 'date', label: 'Tanggal', render: (r) => dateId(r.date) }, { key: 'time', label: 'Waktu', render: (r) => { const s = sessions.find((item) => item.id === r.training_session_id); return s ? `${s.starts_at.slice(0, 5)}–${s.ends_at.slice(0, 5)}` : '—'; } }, { key: 'progress', label: 'Progres', render: (r) => `${r.progress}%` }, { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> }, { key: 'action', label: 'Aksi', render: (r) => <button className="small-button" onClick={() => openDetail('training-detail', sessions.find((session) => session.id === r.training_session_id))}>Lihat pelatihan</button> }]} rows={activeEnrollments} empty="Sesi pelatihan belum tersedia" />{enrollments.length > 0 && activeEnrollments.length === 0 && <div className="completion-note"><CheckCircle2 size={16} /> Seluruh pelatihan telah diselesaikan, lihat riwayat Anda.</div>}</section>;

        if (screen === 'catalog') {
            const rows = filtered(sessions.filter((session) => !enrolledIds.has(Number(session.id)) && session.status === 'Terjadwal' && sessionTime(session) >= new Date()), ['training_name', 'category', 'location']);
            return <>
                {screen === 'catalog' && <div className="toolbar"><span className="eyebrow">PROGRAM PENGEMBANGAN</span><label className="search-box"><Search size={16} /><input placeholder="Cari nama atau kategori pelatihan…" value={search} onChange={(e) => setSearch(e.target.value)} /></label></div>}
                {rows.length ? <div className="course-grid">{rows.map((session) => {
                    const plan = plans.find((item) => item.id === session.training_plan_id);
                    return <article className="course-card" key={session.id}><div className="course-cover"><span className="cover-mark"><GraduationCap size={27} /></span><span className="cover-category">{session.category}</span><span className="cover-lines" /></div><div className="course-body"><div className="course-meta"><Badge>{session.status}</Badge><span>{plan?.code ?? session.code}</span></div><h2>{session.training_name}</h2><p>{plan?.description ?? 'Program pengembangan kompetensi yang dirancang untuk mendukung pertumbuhan karier.'}</p><div className="course-details"><span><CalendarDays size={14} />{dateId(session.date)}</span><span><Clock3 size={14} />{session.starts_at.slice(0, 5)}–{session.ends_at.slice(0, 5)}</span></div><div className="course-footer"><span>{session.location}</span><button className="primary-button" onClick={() => openDetail('training-detail', session)}>Lihat Detail</button></div></div></article>;
                })}</div> : <div className="panel empty-panel"><BookOpen size={27} /><h2>{screen === 'active' ? 'Sesi pelatihan belum tersedia' : 'Pelatihan tidak ditemukan'}</h2><p>{screen === 'active' ? 'Sesi yang kamu ikuti akan muncul di sini.' : 'Coba ubah kata kunci pencarian.'}</p>{screen === 'active' && <button className="primary-button" onClick={() => setScreen('catalog')}>Jelajahi pelatihan</button>}</div>}
            </>;
        }

        if (screen === 'schedule') return <section className="panel"><div className="panel-heading"><div><h2>Jadwal pelatihan</h2><p>Kalender sesi yang terdaftar untukmu.</p></div></div><Table columns={[{ key: 'training_name', label: 'Pelatihan', render: (r) => <strong>{r.training_name}</strong> }, { key: 'date', label: 'Tanggal', render: (r) => dateId(r.date) }, { key: 'time', label: 'Waktu', render: (r) => `${r.starts_at.slice(0, 5)} – ${r.ends_at.slice(0, 5)}` }, { key: 'location', label: 'Metode / lokasi' }, { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> }]} rows={enrollments.map((e) => ({ ...e, ...sessions.find((s) => s.id === e.training_session_id) }))} empty="Belum ada jadwal pelatihan untuk akun ini." /></section>;

        if (screen === 'targets') return <><section className="panel">
            <h2>Ringkasan Target Pelatihan</h2>
            <p>{user.name} · {user.position} · {user.unit}</p>
            {Object.entries(Object.groupBy(data.targets, (target) => target.status)).map(([status, rows]) => <p key={status}>{status}: {rows.length}</p>)}
        </section><div className="stats-grid two"><StatCard label="Target ditetapkan" value={data.targets.length} note="Rencana pengembangan kompetensi" icon={Target} /><StatCard label="Progres keseluruhan" value={`${Math.round(data.targets.reduce((s, t) => s + Number(t.progress), 0) / Math.max(data.targets.length, 1))}%`} note="Rata-rata penyelesaian target" icon={Activity} tone="green" /></div><div className="target-grid">{data.targets.map((target) => <article className="panel target-card" key={target.id}><div className="target-head"><span className="target-symbol"><Target size={19} /></span><Badge>{target.status}</Badge></div><h2>{target.name}</h2><p>Target pengembangan personal</p><div className="progress-label"><span>Progres</span><strong>{target.progress}%</strong></div><div className="progress-track"><i style={{ width: `${target.progress}%` }} /></div></article>)}</div>{!data.targets.length && <div className="panel empty-panel">Target pelatihan belum ditetapkan untukmu.</div>}</>;

        if (screen === 'tasks') return <section className="panel"><div className="panel-heading"><div><h2>Tugas dan asesmen</h2><p>Pantau batas waktu dan status pengerjaan.</p></div><label className="search-box"><Search size={16} /><input placeholder="Cari tugas…" value={search} onChange={(e) => setSearch(e.target.value)} /></label></div><Table columns={[{ key: 'code', label: 'Kode' }, { key: 'name', label: 'Nama tugas', render: (r) => <strong>{r.name}</strong> }, { key: 'type', label: 'Jenis' }, { key: 'due_date', label: 'Batas waktu', render: (r) => dateId(r.due_date) }, { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> }, { key: 'action', label: 'Aksi', render: (r) => <button className="small-button" onClick={() => openDetail('task-detail', r)}>Detail</button> }]} rows={filtered(data.tasks, ['name', 'code', 'status'])} /></section>;

        if (screen === 'assessment') return <section className="panel">
            <div className="panel-heading">
                <div><h2>Assessment Kompetensi Berkala</h2><p>12 soal pilihan ganda · 30 menit</p></div>
                <button className="primary-button" onClick={() => openDetail('evaluation', { title: 'Assessment Kompetensi Berkala' })}>Mulai Kerjakan Assessment</button>
            </div>
            <div className="learning-tabs">
                <button onClick={() => setScreen('tasks')}>Daftar Tugas</button>
                <button onClick={() => setScreen('tests')}>Pre-Test &amp; Post-Test</button>
            </div>
            <h3>Riwayat dan Hasil Assessment</h3>
            <Table rows={data.assessments} columns={[
                { key: 'title', label: 'Assessment' },
                { key: 'submitted_at', label: 'Tanggal', render: (row) => dateId(row.submitted_at) },
                { key: 'result', label: 'Hasil' },
                { key: 'detail', label: 'Aksi', render: (row) => <button className="small-button" onClick={() => openDetail('assessment-detail', row)}>Lihat Detail</button> },
            ]} empty="Belum ada hasil assessment." />
        </section>;

        if (screen === 'tests') return <section className="panel">
            <div className="panel-heading"><div><h2>Pre-Test &amp; Post-Test</h2><p>Setiap tes terdiri dari 8 soal. Post-test tersedia setelah pre-test dan progres materi mencapai 75%.</p></div></div>
            <Table rows={enrollments} columns={[
                { key: 'training_name', label: 'Pelatihan' },
                ...['pre', 'post'].map((type) => ({
                    key: type, label: type === 'pre' ? 'Pre-Test' : 'Post-Test',
                    render: (row) => {
                        const score = row[type + '_score'];
                        if (score != null) return <strong>{score}%</strong>;
                        if (type === 'post' && (row.pre_score == null || row.progress < 75)) return <span>Belum tersedia</span>;
                        return <button className="small-button" onClick={() => openDetail('evaluation', {
                            ...row, test_type: type, title: (type === 'pre' ? 'Pre-test · ' : 'Post-test · ') + row.training_name,
                        })}>Mulai Kerjakan</button>;
                    },
                })),
            ]} empty="Daftarkan diri pada sesi pelatihan untuk mengakses tes." />
        </section>;

        if (screen === 'attendance') return <section className="panel"><div className="panel-heading"><div><h2>Presensi pelatihan</h2><p>Presensi hanya tersedia untuk sesi yang kamu ikuti.</p></div></div><Table columns={[{ key: 'training_name', label: 'Pelatihan', render: (r) => <strong>{r.training_name}</strong> }, { key: 'date', label: 'Tanggal', render: (r) => dateId(r.date) }, { key: 'status', label: 'Status presensi', render: (r) => <Badge>{r.attendanceStatus ?? 'Belum presensi'}</Badge> }, { key: 'action', label: 'Aksi', render: (r) => r.attendanceStatus ? 'Tercatat' : <button className="small-button" disabled={!r.attendanceAvailable} onClick={() => openDetail('attendance', r)}>{r.attendanceAvailable ? 'Isi presensi' : 'Presensi ditutup'}</button> }]} rows={enrollments.map((e) => { const session = sessions.find((s) => s.id === e.training_session_id); const record = data.attendance.find((a) => a.training_session_id === e.training_session_id); return {
                    ...e, date: session?.date, attendanceStatus: record?.status,
                    attendanceAvailable: Boolean(session?.attendance_open && !['Draft', 'Tidak Aktif', 'Dibatalkan', 'Selesai'].includes(session.status)
                        && sessionTime(session) <= new Date() && sessionTime(session, 'ends_at') >= new Date()),
                }; })} empty="Kamu belum terdaftar pada sesi pelatihan." /></section>;

        if (screen === 'materials') {
            const chosen = Number(sessionId) || enrollments[0]?.training_session_id;
            const enrollment = enrollments.find((item) => item.training_session_id === chosen);
            const planId = sessions.find((item) => item.id === chosen)?.training_plan_id;
            const materials = data.materials.filter((item) => item.training_plan_id === planId);
            return <section className="panel"><div className="panel-heading"><div><h2>Materi pelatihan</h2><p>Materi yang tersedia untuk sesi terdaftar.</p></div><select className="select-compact" value={chosen ?? ''} onChange={(e) => setSessionId(e.target.value)}>{enrollments.map((item) => <option key={item.id} value={item.training_session_id}>{item.training_name}</option>)}</select></div>{enrollment ? <><div className="material-progress"><span>Progres belajar <strong>{enrollment.progress}%</strong></span><div className="progress-track"><i style={{ width: `${enrollment.progress}%` }} /></div><button className="small-button" disabled={enrollment.progress >= 100} onClick={() => runAction({ action: 'material_complete', session_id: chosen })}>{enrollment.progress >= 100 ? 'Semua materi selesai' : 'Tandai materi selesai'}</button></div><div className="material-list">{materials.map((item, index) => <article className="material-row" key={item.id}><span className="material-icon"><FileText size={18} /></span><span className="material-index">0{index + 1}</span><div className="material-copy"><strong>{item.title}</strong><small>{item.type} · Materi terbit</small></div><button className="small-button" onClick={() => { setSelected(item); setModal('material'); }}>Buka materi <ArrowRight size={14} /></button></article>)}</div></> : <div className="table-empty">Materi hanya tersedia bagi peserta terdaftar. Ikuti pelatihan untuk melihat materi.</div>}</section>;
        }

        if (screen === 'history') { const rows = filtered(enrollments, ['training_name', 'source', 'status']).filter((item) => typeFilter === 'Semua' || (typeFilter === 'Wajib' ? item.source === 'Wajib' : item.source !== 'Wajib')).filter((item) => statusFilter === 'Semua' || item.status.toLowerCase().includes(statusFilter.toLowerCase())); return <section className="panel"><div className="panel-heading"><div><h2>Riwayat pelatihan</h2><p>Daftar pelatihan, status, dan hasil belajarmu.</p></div><label className="search-box"><Search size={16} /><input placeholder="Cari pelatihan…" value={search} onChange={(e) => setSearch(e.target.value)} /></label></div><div className="table-filters"><label>Jenis<select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option>Semua</option><option>Wajib</option><option>Mandiri</option></select></label><label>Status<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option>Semua</option><option>Terdaftar</option><option>Selesai</option><option>Belum lulus</option></select></label><button className="outline-button" onClick={() => { setSearch(''); setTypeFilter('Semua'); setStatusFilter('Semua'); }}>Lihat Semua Riwayat</button></div><Table columns={[{ key: 'training_name', label: 'Nama pelatihan', render: (r) => <strong>{r.training_name}</strong> }, { key: 'source', label: 'Jenis' }, { key: 'date', label: 'Periode', render: (r) => dateId(r.date) }, { key: 'progress', label: 'Progres', render: (r) => `${r.progress}%` }, { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> }, { key: 'score', label: 'Nilai', render: (r) => r.post_score ?? '—' }, { key: 'detail', label: 'Detail', render: (r) => <button className="small-button" onClick={() => { setSelected(r); setModal('history'); }}>Lihat detail</button> }]} rows={rows.toSorted((first, second) => first.source.localeCompare(second.source) || first.status.localeCompare(second.status))} empty="Belum ada riwayat pelatihan yang cocok." /></section>; }

        if (screen === 'notifications') return <section className="panel">
            <div className="panel-heading"><div><h2>Notifikasi Pelatihan</h2><p>{data.notifications.filter((item) => !item.read).length} pemberitahuan belum dibaca</p></div></div>
            <Table rows={data.notifications} columns={[
                { key: 'title', label: 'Judul' },
                { key: 'body', label: 'Ringkasan', render: (row) => row.body.length > 80 ? row.body.slice(0, 80) + '…' : row.body },
                { key: 'created_at', label: 'Tanggal', render: (row) => dateId(row.created_at) },
                { key: 'read', label: 'Status', render: (row) => <Badge>{row.read ? 'Dibaca' : 'Baru'}</Badge> },
                { key: 'detail', label: 'Aksi', render: (row) => <button className="small-button" onClick={() => {
                    openDetail('notification-detail', row);
                    if (!row.read) runAction({ action: 'notification_read', id: row.id }, true);
                }}>Lihat</button> },
            ]} empty="Belum ada notifikasi pelatihan." />
        </section>;

        if (screen === 'employees') return <section className="panel"><div className="panel-heading"><div><h2>Data karyawan</h2><p>Kelola direktori karyawan dan status keaktifan.</p></div><button className="primary-button" onClick={() => { setSelected(null); setModal('employee'); }}>+ Tambah karyawan</button></div><div className="toolbar"><label className="search-box"><Search size={16} /><input placeholder="Cari nama, ID, unit kerja…" value={search} onChange={(e) => setSearch(e.target.value)} /></label></div><Table columns={[{ key: 'employee_code', label: 'ID karyawan' }, { key: 'name', label: 'Nama', render: (r) => <strong>{r.name}</strong> }, { key: 'position', label: 'Jabatan' }, { key: 'unit', label: 'Unit kerja' }, { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> }, { key: 'actions', label: 'Aksi', render: (r) => <div className="row-actions"><button className="small-button" onClick={() => { setSelected(r); setModal('employee'); }}>Ubah</button><button className="small-button" onClick={() => openDetail('employee-detail', r)}>Detail</button>{r.status !== 'Nonaktif' && <button className="small-button danger-text" onClick={() => { setSelected(r); setModal('employee-deactivate'); }}>Nonaktifkan</button>}</div> }]} rows={filtered(employees, ['name', 'employee_code', 'unit'])} empty="Data karyawan tidak ditemukan." /></section>;

        if (screen === 'plans') {
            const rows = filtered(plans, ['code', 'name', 'provider', 'department'])
                .filter((plan) => typeFilter === 'Semua' || plan.category === typeFilter)
                .filter((plan) => statusFilter === 'Semua' || (plan.status === 'Draft' ? 'Draf' : plan.status) === statusFilter);
            return <section className="panel">
                <div className="panel-heading">
                    <div><h2>Rencana Pelatihan</h2><p>Rencanakan pengembangan kompetensi per departemen.</p></div>
                    <button className="primary-button" onClick={() => openDetail('plan', null)}>+ Buat Rencana</button>
                </div>
                <div className="table-filters">
                    <label>Cari Rencana<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nama, penyelenggara, departemen" /></label>
                    <label>Kategori<select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                        <option>Semua</option>{[...new Set(plans.map((plan) => plan.category))].map((category) => <option key={category}>{category}</option>)}
                    </select></label>
                    <label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                        <option>Semua</option>{planStatuses.map((status) => <option key={status}>{status}</option>)}
                    </select></label>
                </div>
                <Table rows={rows} columns={[
                    { key: 'name', label: 'Rencana Pelatihan', render: (plan) => <strong>{plan.name}</strong> },
                    { key: 'category', label: 'Kategori' },
                    { key: 'provider', label: 'Penyelenggara' },
                    { key: 'schedule', label: 'Target Pelaksanaan', render: (plan) => plan.target_start ? dateId(plan.target_start) + ' – ' + dateId(plan.target_end) : plan.schedule },
                    { key: 'status', label: 'Status', render: (plan) => <Badge>{plan.status === 'Draft' ? 'Draf' : plan.status}</Badge> },
                    { key: 'actions', label: 'Aksi', render: (plan) => <div className="row-actions">
                        <button className="small-button" onClick={() => openDetail('plan-detail', plan)}>Detail</button>
                        <button className="small-button" onClick={() => openDetail('plan', plan)}>Ubah</button>
                        <button className="small-button danger-text" disabled={['Dijadwalkan', 'Selesai'].includes(plan.status) || sessions.some((session) => session.training_plan_id === plan.id)} onClick={() => openDetail('plan-delete', plan)}>Hapus</button>
                    </div> },
                ]} empty="Rencana pelatihan tidak ditemukan." />
            </section>;
        }

        if (screen === 'sessions') return <section className="panel"><div className="panel-heading"><div><h2>Kelola sesi pelatihan</h2><p>Buat jadwal, atur kuota, dan pantau status sesi.</p></div><button className="primary-button" onClick={() => { setSelected(null); setModal('session'); }}>+ Tambah sesi</button></div><Table columns={[{ key: 'code', label: 'Kode sesi' }, { key: 'training_name', label: 'Pelatihan', render: (r) => <strong>{r.training_name}</strong> }, { key: 'date', label: 'Tanggal', render: (r) => dateId(r.date) }, { key: 'time', label: 'Waktu', render: (r) => `${r.starts_at.slice(0, 5)}–${r.ends_at.slice(0, 5)}` }, { key: 'location', label: 'Lokasi' }, { key: 'capacity', label: 'Peserta / kuota', render: (r) => `${enrollments.filter((e) => e.training_session_id === r.id).length} / ${r.quota}` }, { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> }, { key: 'actions', label: 'Aksi', render: (r) => <div className="row-actions"><button className="small-button" onClick={() => { setSelected(r); setModal('session'); }}>Ubah</button><button className="small-button danger-text" onClick={() => { setSelected(r); setModal('delete-session'); }}>Hapus</button></div> }]} rows={sessions} /></section>;

        if (screen === 'participants') {
            const chosen = sessions.find((item) => item.id === (Number(sessionId) || sessions[0]?.id));
            if (!chosen) return <div className="panel table-empty">Belum ada sesi pelatihan.</div>;
            const roster = enrollments.filter((item) => item.training_session_id === chosen.id);
            const available = employees.filter((employee) => employee.status === 'Aktif' && !roster.some((item) => item.employee_id === employee.id));
            const editable = chosen.status === 'Terjadwal' && sessionTime(chosen) > new Date();
            const toggle = (ids, id, setIds) => setIds(ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
            return <section className="panel">
                <div className="panel-heading">
                    <div><h2>Peserta Pelatihan</h2><p>Pilih karyawan untuk ditetapkan atau dikeluarkan dari sesi.</p></div>
                    <label className="field"><span>Pilih Sesi Pelatihan</span><select value={chosen.id} onChange={(event) => {
                        setSessionId(event.target.value);
                        setSelectedParticipantIds([]);
                        setSelectedEmployeeIds([]);
                    }}>{sessions.map((item) => <option value={item.id} key={item.id}>{item.code} · {item.training_name}</option>)}</select></label>
                </div>
                <p>{chosen.training_name} · {dateId(chosen.date)} · {roster.length}/{chosen.quota} peserta · {chosen.status}</p>
                {!editable && <p>Peserta hanya bisa diubah sebelum sesi dimulai.</p>}
                <div className="split-panels">
                    <section>
                        <h3>Daftar Karyawan</h3>
                        <Table rows={available} columns={[
                            { key: 'pick', label: 'Pilih', render: (row) => <input type="checkbox" aria-label={'Pilih ' + row.name} disabled={!editable} checked={selectedEmployeeIds.includes(row.id)} onChange={() => toggle(selectedEmployeeIds, row.id, setSelectedEmployeeIds)} /> },
                            { key: 'name', label: 'Nama Karyawan' }, { key: 'employee_code', label: 'ID' },
                        ]} />
                        <button className="primary-button" disabled={!editable || !selectedEmployeeIds.length || roster.length + selectedEmployeeIds.length > chosen.quota} onClick={() => openDetail('assign-confirm', { session: chosen, ids: selectedEmployeeIds })}>Tetapkan Peserta</button>
                    </section>
                    <section>
                        <h3>Peserta Sesi</h3>
                        <Table rows={roster} columns={[
                            { key: 'pick', label: 'Pilih', render: (row) => <input type="checkbox" aria-label={'Pilih peserta ' + row.employee_name} disabled={!editable} checked={selectedParticipantIds.includes(row.id)} onChange={() => toggle(selectedParticipantIds, row.id, setSelectedParticipantIds)} /> },
                            { key: 'employee_name', label: 'Nama Peserta' }, { key: 'employee_code', label: 'ID' },
                        ]} />
                        <button className="outline-button" disabled={!editable || !selectedParticipantIds.length} onClick={() => openDetail('unassign-confirm', { session: chosen, ids: selectedParticipantIds })}>Keluarkan Peserta</button>
                    </section>
                </div>
            </section>;
        }

        if (screen === 'targets-overview') {
            const staff = filtered(employees, ['name', 'employee_code']).map((employee) => {
                const targets = data.targets.filter((target) => target.employee_id === employee.id);
                const progress = targets.length ? Math.round(targets.reduce((sum, target) => sum + Number(target.progress), 0) / targets.length) : null;
                return { ...employee, targets, progress, status: progress === null ? 'Belum ada target' : targets.every((target) => target.status === 'Selesai') ? 'Sudah selesai' : 'Belum selesai' };
            }).filter((employee) => statusFilter === 'Semua' || employee.status === statusFilter);
            return <section className="panel">
                <div className="panel-heading">
                    <div><h2>Pemantauan Target Capaian</h2><p>Rekap progres pengembangan per karyawan.</p></div>
                    <button className="primary-button" onClick={() => openDetail('target', null)}>+ Tetapkan target</button>
                </div>
                <div className="table-filters">
                    <label>Cari staf<input placeholder="Nama atau ID karyawan" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
                    <label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                        {['Semua', 'Belum selesai', 'Sudah selesai', 'Belum ada target'].map((status) => <option key={status}>{status}</option>)}
                    </select></label>
                </div>
                <Table rows={staff} columns={[
                    { key: 'name', label: 'Nama' }, { key: 'position', label: 'Jabatan' },
                    { key: 'progress', label: 'Capaian', render: (row) => row.progress == null ? '—' : row.progress + '%' },
                    { key: 'status', label: 'Status', render: (row) => <Badge>{row.status}</Badge> },
                    { key: 'detail', label: 'Aksi', render: (row) => <button className="small-button" onClick={() => openDetail('target-detail', row)}>Lihat Detail</button> },
                ]} empty="Belum ada target capaian yang tersedia." />
            </section>;
        }

        if (screen === 'kpi-input' || screen === 'kpi-review') {
            const groups = filtered(employees, ['name', 'employee_code']).map((employee) => {
                const items = data.kpis.filter((item) => item.employee_id === employee.id);
                const rated = items.filter((item) => item.achievement != null);
                const scores = rated.filter((item) => Number(item.target) > 0)
                    .map((item) => Number(item.achievement) / Number(item.target) * 100);
                return {
                    ...employee, items,
                    status: items.length && rated.length === items.length ? 'Sudah dinilai' : 'Belum dinilai',
                    finalScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null,
                };
            }).filter((employee) => statusFilter === 'Semua' || employee.status === statusFilter);
            const editing = screen === 'kpi-input';
            return <section className="panel">
                <div className="panel-heading"><div><h2>{editing ? 'Penilaian KPI Staf' : 'Data KPI Staf'}</h2><p>Indikator, target, dan capaian aktual karyawan.</p></div></div>
                <div className="table-filters">
                    <label>Cari staf<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nama atau ID karyawan" /></label>
                    <label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                        <option>Semua</option><option>Belum dinilai</option><option>Sudah dinilai</option>
                    </select></label>
                </div>
                <Table rows={groups} columns={[
                    { key: 'name', label: 'Nama Staf' },
                    { key: 'position', label: 'Jabatan' },
                    { key: 'items', label: 'Indikator', render: (row) => row.items.length },
                    { key: 'status', label: 'Status Penilaian', render: (row) => <Badge>{row.status}</Badge> },
                    { key: 'finalScore', label: 'Hasil', render: (row) => row.finalScore == null ? '—' : row.finalScore + '%' },
                    { key: 'detail', label: 'Aksi', render: (row) => <button className="small-button" onClick={() => openDetail(editing ? 'kpi-edit' : 'kpi-detail', row)}>{editing ? 'Nilai KPI' : 'Lihat Detail'}</button> },
                ]} empty="Belum ada data KPI karyawan." />
            </section>;
        }

        if (screen === 'assessments-review') return <section className="panel"><div className="panel-heading"><div><h2>Tinjauan skill assessment</h2><p>Hasil assessment dan kompetensi karyawan.</p></div></div><Table columns={[{ key: 'employee_name', label: 'Karyawan', render: (r) => <strong>{r.employee_name}</strong> }, { key: 'employee_code', label: 'ID' }, { key: 'title', label: 'Assessment' }, { key: 'submitted_at', label: 'Tanggal', render: (r) => dateId(r.submitted_at) }, { key: 'result', label: 'Ringkasan' }, { key: 'detail', label: 'Detail', render: (r) => <button className="small-button" onClick={() => { setSelected(r); setModal('assessment-detail'); }}>Tinjau hasil</button> }]} rows={data.assessments} empty="Belum ada hasil assessment." /></section>;

        if (screen === 'performance') return <><section className="panel"><div className="panel-heading"><div><h2>Pemantauan kinerja</h2><p>Ringkasan kinerja dan pencapaian karyawan.</p></div><label className="search-box"><Search size={16} /><input placeholder="Cari nama atau ID…" value={search} onChange={(e) => setSearch(e.target.value)} /></label></div><Table columns={[{ key: 'employee_name', label: 'Karyawan', render: (r) => <strong>{r.employee_name}</strong> }, { key: 'employee_code', label: 'ID karyawan' }, { key: 'period', label: 'Periode' }, { key: 'score', label: 'Nilai', render: (r) => `${r.score}%` }, { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> }, { key: 'detail', label: 'Rincian', render: (row) => <button className="small-button" onClick={() => openDetail('performance-detail', row)}>Lihat Detail</button> }]} rows={filtered(data.performance, ['employee_name', 'employee_code', 'status'])} empty="Data kinerja belum tersedia." /></section><PerformanceOverview data={data} Table={Table} Badge={Badge} dateId={dateId} today={new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date())} /></>;
        return <section className="panel empty-panel"><h2>Halaman belum tersedia</h2><p>Pilih halaman dari menu navigasi.</p></section>;
    };

    const submitLogin = async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setError(''); setLoading(true);
        try { const result = await api('/api/v1/login', { method: 'POST', body: JSON.stringify({ identifier: form.get('identifier'), password: form.get('password'), remember: form.get('remember') === 'on' }) }); setUser(result.user); setScreen('dashboard'); }
        catch (loginError) { setError(loginError.message); setAccessBlocked(loginError.status === 403); }
        finally { setLoading(false); }
    };

    const submitForgotPassword = async (event) => {
        event.preventDefault();
        const email = new FormData(event.currentTarget).get('email');
        setError(''); setAuthNotice(''); setLoading(true);
        try { const result = await api('/api/v1/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }); setAuthNotice(result.message); }
        catch (requestError) { setError(requestError.message); }
        finally { setLoading(false); }
    };

    const submitResetPassword = async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setError(''); setAuthNotice(''); setLoading(true);
        try {
            const result = await api('/api/v1/reset-password', { method: 'POST', body: JSON.stringify({ token: window.location.pathname.split('/').pop(), email: form.get('email'), password: form.get('password'), password_confirmation: form.get('password_confirmation') }) });
            window.history.replaceState({}, '', '/');
            setAuthMode('login'); setAuthNotice(result.message);
        } catch (resetError) { setError(resetError.message); }
        finally { setLoading(false); }
    };

    if (!user && authMode === 'forgot') return <div className="recovery-page"><form className="recovery-card" onSubmit={submitForgotPassword}><a className="brand" href="/" onClick={(e) => { e.preventDefault(); setAuthMode('login'); setError(''); }}><span className="brand-mark"><GraduationCap size={20} /></span><span className="brand-copy"><span className="brand-name">SkillGrow</span><span className="brand-caption">PEMULIHAN AKUN</span></span></a><span className="eyebrow">BANTUAN AKUN</span><h1>Lupa kata sandi?</h1><p>Masukkan email akun SkillGrow. Kami akan mengirimkan tautan untuk membuat kata sandi baru.</p>{error && <div className="error-alert">{error}</div>}{authNotice && <div className="success-alert">{authNotice}</div>}<label className="field"><span>Email akun</span><input type="email" name="email" required placeholder="nama@perusahaan.id" /></label><button className="primary-button full-button" disabled={loading}>{loading ? 'Mengirim tautan…' : 'Kirim tautan pemulihan'} <ArrowRight size={16} /></button><button className="back-login" type="button" onClick={() => { setAuthMode('login'); setError(''); setAuthNotice(''); }}>Kembali ke halaman login</button></form></div>;

    if (!user && authMode === 'reset') return <div className="recovery-page"><form className="recovery-card" onSubmit={submitResetPassword}><a className="brand" href="/"><span className="brand-mark"><GraduationCap size={20} /></span><span className="brand-copy"><span className="brand-name">SkillGrow</span><span className="brand-caption">PEMULIHAN AKUN</span></span></a><span className="eyebrow">KATA SANDI BARU</span><h1>Atur ulang kata sandi</h1><p>Buat kata sandi baru untuk akun SkillGrow Anda.</p>{error && <div className="error-alert">{error}</div>}<label className="field"><span>Email akun</span><input type="email" name="email" required defaultValue={new URLSearchParams(window.location.search).get('email') ?? ''} /></label><label className="field"><span>Kata sandi baru</span><input type="password" name="password" minLength="8" required autoComplete="new-password" /></label><label className="field"><span>Ulangi kata sandi</span><input type="password" name="password_confirmation" minLength="8" required autoComplete="new-password" /></label><button className="primary-button full-button" disabled={loading}>{loading ? 'Menyimpan…' : 'Simpan kata sandi baru'}</button></form></div>;

    if (!user) return (
        <div className="login-page figma-login">
            <aside className="login-side">
                <a className="brand" href="/" aria-label="SkillGrow"><Brand /></a>
                <div className="login-pitch">
                    <h1>Kembangkan kompetensi<br />karyawan, dari pelatihan<br />hingga kinerja nyata.</h1>
                    <div className="login-features">
                        <div><span className="feature-icon"><ClipboardCheck /></span><span><strong>Target &amp; jadwal pelatihan</strong><small>Pantau pelatihan wajib dan mandiri beserta progresnya.</small></span></div>
                        <div><span className="feature-icon"><ClipboardList /></span><span><strong>Skill assessment berkala</strong><small>Ukur kompetensi jabatan secara terpisah dari tes pelatihan.</small></span></div>
                        <div><span className="feature-icon"><Gauge /></span><span><strong>Penerapan di kinerja</strong><small>Hubungkan pengembangan kompetensi dengan capaian KPI.</small></span></div>
                    </div>
                </div>
                <div className="login-rings" aria-hidden="true" />
            </aside>
            <section className="login-main">
                <form className="login-form" onSubmit={submitLogin}>
                    <h2>{accessBlocked ? 'Akses akun dibatasi' : 'Masuk ke SkillGrow'}</h2>
                    <p>Gunakan akun karyawan yang terdaftar di PT Nusantara Logistik Terpadu.</p>
                    {error && <div className="error-alert" role="alert"><span>{error}</span><button type="button" onClick={() => { setError(''); setAccessBlocked(false); }}>{accessBlocked ? 'Kembali ke Halaman Login' : 'Coba Masuk Kembali'}</button></div>}
                    {authNotice && <div className="success-alert">{authNotice}</div>}
                    <label className="field"><span>Username / NIP / ID Karyawan</span><span className="login-input"><UserRound size={17} /><input name="identifier" required autoComplete="username" defaultValue="KRY-001" placeholder="Masukkan username / NIP / ID karyawan" /></span></label>
                    <label className="field"><span>Kata Sandi</span><span className="login-input"><LockKeyhole size={17} /><input type={showPassword ? 'text' : 'password'} name="password" required autoComplete="current-password" defaultValue="password" placeholder="Masukkan kata sandi" /><button type="button" className="password-toggle" aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
                    <div className="login-options"><label className="remember"><input type="checkbox" name="remember" />Ingat Saya di Perangkat Ini</label><button type="button" className="forgot-link" onClick={() => { setAuthMode('forgot'); setError(''); setAuthNotice(''); }}>Lupa Kata Sandi?</button></div>
                    <button className="primary-button full-button" disabled={loading}>{loading ? 'Memeriksa akun…' : 'Masuk ke Sistem'} <ArrowRight size={16} /></button>
                </form>
                <footer className="login-footer">© 2025 PT Nusantara Logistik Terpadu · SkillGrow</footer>
            </section>
        </div>
    );

    const unreadCount = data?.notifications.filter((item) => !item.read).length ?? 0;
    const navGroups = user.role === 'employee' ? [
        { label: '', ids: ['dashboard'] },
        { label: 'Pengembangan', ids: ['active', 'catalog', 'targets', 'schedule', 'assessment', 'history'] },
        { label: 'Akun', ids: ['notifications', 'profile'] },
    ] : [
        { label: '', ids: ['dashboard'] },
        { label: user.role === 'hr' ? 'Manajemen' : 'Pengembangan', ids: visibleScreens.filter((item) => !['dashboard', 'notifications'].includes(item.id)).map((item) => item.id) },
        { label: 'Akun', ids: ['notifications', 'profile'] },
    ];
    return <div className="app-shell">
        <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
            <div className="sidebar-brand"><a className="brand" href="#home" onClick={(event) => { event.preventDefault(); setScreen('dashboard'); }}><Brand /></a><button className="close-nav" onClick={() => setMobileNav(false)} aria-label="Tutup menu"><X size={19} /></button></div>
            <span className="portal-label"><i />PORTAL {roleLabels[user.role].toUpperCase()}</span>
            <nav className="sidebar-scroll" aria-label="Navigasi utama">
                {navGroups.map((group) => <div className="nav-group" key={group.label}>
                    {group.label && <div className="nav-label">{group.label}</div>}
                    {group.ids.map((id) => { const item = screens.find((entry) => entry.id === id); const Icon = item?.icon ?? UserRound; return <button key={id} className={`nav-link ${screen === id ? 'active' : ''}`} onClick={() => { if (id === 'profile') setModal('profile'); else { setScreen(id); setSessionId(''); setSelectedParticipantIds([]); setSelectedEmployeeIds([]); } setSearch(''); setStatusFilter('Semua'); setTypeFilter('Semua'); setMobileNav(false); }}><Icon /><span>{item?.label ?? 'Profil'}</span>{id === 'notifications' && unreadCount > 0 && <span className="nav-count">{unreadCount}</span>}</button>; })}
                </div>)}
            </nav>
            <div className="sidebar-bottom"><div className="profile"><span className="avatar">{user.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}</span><span className="profile-copy"><span className="profile-name">{user.name}</span><span className="profile-role">{user.position ?? roleLabels[user.role]}</span></span><button className="logout-button" title="Keluar" onClick={async () => { await api('/api/v1/logout', { method: 'POST', body: '{}' }).catch(() => {}); setMobileNav(false); setData(null); setUser(null); }}><LogOut size={16} /></button></div></div>
        </aside>
        <div className="main-column"><header className="topbar"><div className="topbar-left"><button className="mobile-menu" aria-label="Buka menu" onClick={() => setMobileNav(true)}><Menu size={20} /></button><div className="breadcrumbs"><span>Portal {roleLabels[user.role]}</span><span className="breadcrumb-divider" /><strong>{current.label}</strong></div></div><div className="topbar-actions"><span className="date-pill"><CalendarDays />{new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}</span><button className="icon-button notification-button" onClick={() => setScreen('notifications')} aria-label="Notifikasi"><Bell />{data?.notifications.some((item) => !item.read) && <i />}</button><div className="topbar-user"><span className="avatar">{user.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}</span><span className="topbar-user-copy">{user.name}<small>{roleLabels[user.role]}</small></span><ChevronDown className="user-chevron" /></div></div></header>
            <main className="content"><div className="page-heading"><div><span className="eyebrow">{roleLabels[user.role].toUpperCase()} / SKILLGROW</span><h1 className="page-title">{current.label}</h1><p className="page-description">{screen === 'catalog' ? 'Temukan pelatihan yang mendukung perkembangan kompetensimu.' : screen === 'active' ? 'Lihat sesi pelatihan yang sedang dan akan kamu ikuti.' : 'Kelola aktivitas pembelajaran dan perkembangan kompetensi.'}</p></div><div className="heading-actions"><span className="workspace-chip"><span />Workspace aktif</span></div></div>{error && <div className="error-alert inline-error" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Tutup pesan"><X size={15} /></button></div>}{user.role === 'employee' && ['active', 'catalog', 'tasks', 'tests', 'attendance', 'materials'].includes(screen) && <nav className="learning-tabs" aria-label="Aktivitas pelatihan">{['active', 'catalog', 'tasks', 'tests', 'attendance', 'materials'].map((id) => <button key={id} className={screen === id ? 'active' : ''} onClick={() => setScreen(id)}>{screens.find((item) => item.id === id).label}</button>)}</nav>}{screenContent()}</main>
        </div>{mobileNav && <button className="nav-backdrop" aria-label="Tutup navigasi" onClick={() => setMobileNav(false)} />}{toast && <div className="toast"><CheckCircle2 size={17} />{toast}<button onClick={() => setToast('')}><X size={15} /></button></div>}
        {modal && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setModal(''); }}><section className="modal-card" role="dialog" aria-modal="true" aria-label="Detail SkillGrow"><div className="modal-head"><div><span className="eyebrow">SKILLGROW</span><h2>{modal === 'evaluation' ? selected?.title : modal === 'training-detail' ? 'Overview Pelatihan' : modal === 'task-detail' ? 'Detail Tugas' : modal === 'notification-detail' ? 'Detail Notifikasi' : modal === 'employee-detail' ? 'Detail Karyawan' : modal === 'plan-detail' ? 'Detail Rencana Pelatihan' : modal === 'plan-delete' ? 'Hapus Rencana Pelatihan' : modal === 'target-detail' ? 'Rincian Capaian' : modal === 'performance-detail' ? 'Rincian Kinerja' : modal === 'kpi-edit' ? 'Penilaian KPI Staf' : modal === 'kpi-detail' ? 'Detail Penilaian KPI' : modal === 'plan' ? (selected ? 'Ubah rencana pelatihan' : 'Buat rencana pelatihan') : modal === 'session' ? (selected ? 'Ubah sesi pelatihan' : 'Tambah sesi pelatihan') : modal === 'delete-session' ? 'Konfirmasi hapus sesi' : modal === 'employee-deactivate' ? 'Konfirmasi nonaktifkan karyawan' : modal === 'assign-confirm' ? 'Konfirmasi penetapan peserta' : modal === 'unassign-confirm' ? 'Konfirmasi keluarkan peserta' : modal === 'profile' ? 'Profil Karyawan' : modal === 'material' ? 'Materi pelatihan' : modal === 'employee' ? (selected ? 'Ubah data karyawan' : 'Tambah karyawan') : modal === 'target' ? 'Tetapkan target pelatihan' : modal === 'attendance' ? 'Isi presensi' : modal === 'test' ? 'Tes pelatihan' : modal === 'history' ? 'Detail riwayat' : 'Hasil assessment'}</h2></div><button className="icon-button" onClick={() => setModal('')} aria-label="Tutup"><X size={18} /></button></div>
            {actionError && <p className="error-alert" role="alert">{actionError}</p>}
            {modal === 'notification-detail' && <div className="detail-content">
                <h3>{selected.title}</h3><p>{dateId(selected.created_at)}</p><p>{selected.body}</p>
                <button className="outline-button" onClick={() => setModal('')}>Kembali ke Daftar</button>
            </div>}
            {modal === 'task-detail' && <div className="detail-content">
                <h3>{selected.name}</h3><p>{selected.code} · {selected.type} · {dateId(selected.due_date)}</p>
                <Badge>{selected.status}</Badge>
                <div className="modal-actions">
                    <button className="outline-button" onClick={() => setModal('')}>Kembali ke Daftar</button>
                    {selected.status !== 'Selesai' && <button className="primary-button" disabled={actionBusy} onClick={() => {
                        const type = selected.type.toLowerCase();
                        if (/tes|assessment/.test(type)) {
                            setScreen(type.includes('assessment') ? 'assessment' : 'tests');
                            setModal('');
                        } else {
                            runAction({ action: 'task_complete', id: selected.id });
                        }
                    }}>{/tes|assessment/i.test(selected.type) ? 'Kerjakan Sekarang' : 'Tandai selesai'}</button>}
                </div>
            </div>}
            {modal === 'employee-detail' && <div className="detail-content">
                <h3>{selected.name}</h3><p>{selected.employee_code} · {selected.position} · {selected.unit}</p>
                <Badge>{selected.status}</Badge>
            </div>}
            {modal === 'training-detail' && selected && <div className="detail-content">
                <h3>{selected.training_name}</h3>
                <p>{plans.find((plan) => plan.id === selected.training_plan_id)?.description}</p>
                <p>{selected.code} · {selected.type} · {selected.status}</p>
                <p>{dateId(selected.date)} · {selected.starts_at.slice(0, 5)}–{selected.ends_at.slice(0, 5)} · {selected.location ?? 'Lokasi belum ditentukan'}</p>
                <p>{sessions.find((session) => session.id === selected.id)?.participant_count} dari {selected.quota} peserta</p>
                {enrolledIds.has(Number(selected.id)) ? <>
                    <p>Anda sudah terdaftar sebagai peserta.</p>
                    <div className="modal-actions">
                        <button className="outline-button" onClick={() => { setModal(''); setScreen('attendance'); }}>Isi Presensi</button>
                        <button className="primary-button" onClick={() => { setSessionId(selected.id); setModal(''); setScreen('materials'); }}>Lihat Materi</button>
                    </div>
                </> : selected.type === 'Wajib' ? <p>Menunggu penugasan HR/PSDM.</p> :
                    <button className="primary-button" disabled={actionBusy || selected.participant_count >= selected.quota || selected.status !== 'Terjadwal' || sessionTime(selected) < new Date()} onClick={() => runAction({ action: 'enroll', session_id: selected.id }, true)}>
                        {selected.participant_count >= selected.quota ? 'Kuota Penuh' : 'Ikuti Pelatihan'}
                    </button>}
            </div>}
            {modal === 'target-detail' && <div className="detail-content">
                <h3>{selected.name}</h3><p>{selected.employee_code} · {selected.position}</p>
                <Table rows={selected.targets} columns={[
                    { key: 'name', label: 'Target' },
                    { key: 'progress', label: 'Capaian', render: (row) => row.progress + '%' },
                    { key: 'due_date', label: 'Batas Waktu', render: (row) => dateId(row.due_date) },
                    { key: 'status', label: 'Status' },
                ]} empty="Belum ada target capaian untuk karyawan ini." />
                <button className="outline-button" onClick={() => setModal('')}>Kembali ke Daftar</button>
            </div>}
            {['kpi-edit', 'kpi-detail'].includes(modal) && <form onSubmit={(event) => {
                event.preventDefault();
                runAction({ action: 'kpi_save', employee_id: selected.id, values: Object.fromEntries(new FormData(event.currentTarget)) });
            }}>
                <h3>{selected.name}</h3><p>{selected.employee_code} · {selected.position} · {selected.unit}</p>
                {selected.finalScore != null && <p>Nilai akhir KPI <strong>{selected.finalScore}%</strong></p>}
                <Table rows={selected.items} columns={[
                    { key: 'indicator', label: 'Indikator KPI' },
                    { key: 'period', label: 'Periode' },
                    { key: 'target', label: 'Target' },
                    { key: 'achievement', label: 'Capaian Aktual', render: (row) => modal === 'kpi-edit'
                        ? <input className="inline-input" aria-label={'Capaian ' + row.indicator} name={String(row.id)} type="number" min="0" max="100" step="0.01" required defaultValue={row.achievement ?? ''} />
                        : row.achievement ?? '—' },
                    { key: 'percent', label: 'Pencapaian', render: (row) => row.achievement == null || Number(row.target) <= 0 ? '—' : Math.round(row.achievement / row.target * 100) + '%' },
                    { key: 'status', label: 'Status', render: (row) => <Badge>{row.status}</Badge> },
                ]} empty="Penilaian KPI belum tersedia." />
                <div className="modal-actions">
                    <button className="outline-button" type="button" onClick={() => setModal('')}>{modal === 'kpi-edit' ? 'Batal' : 'Kembali ke Daftar'}</button>
                    {modal === 'kpi-edit' && selected.items.length > 0 && <button className="primary-button" disabled={actionBusy}>Simpan Penilaian</button>}
                </div>
            </form>}
            {modal === 'performance-detail' && <div className="detail-content">
                <h3>{selected.employee_name}</h3><p>{selected.employee_code} · {selected.period}</p>
                <Badge>{selected.status}</Badge><p>Nilai {selected.score}%</p><p>{selected.detail ?? 'Belum ada rincian kinerja.'}</p>
                <button className="outline-button" onClick={() => setModal('')}>Kembali ke Daftar</button>
            </div>}
            {modal === 'profile' && <div className="detail-content"><div className="detail-callout"><UserRound /><strong>{user.name}</strong></div><div className="detail-grid"><span>ID Karyawan<strong>{user.employee_code}</strong></span><span>Jabatan<strong>{user.position}</strong></span><span>Unit Kerja<strong>{user.unit}</strong></span><span>Email<strong>{user.email}</strong></span></div></div>}
            {modal === 'plan' && <TrainingPlanForm key={selected?.id ?? 'new'} plan={selected} busy={actionBusy} onCancel={() => setModal('')}
                onSave={(fields) => runAction({ ...fields, action: selected ? 'plan_update' : 'create_plan', id: selected?.id })} />}
            {modal === 'plan-detail' && <div className="detail-content">
                <h3>{selected.name}</h3><Badge>{selected.status === 'Draft' ? 'Draf' : selected.status}</Badge>
                <dl className="detail-grid">
                    {[
                        ['Kode', selected.code], ['Kategori', selected.category], ['Penyelenggara', selected.provider],
                        ['Departemen Sasaran', selected.department], ['Estimasi Peserta', selected.quota],
                        ['Target Pelaksanaan', selected.target_start ? dateId(selected.target_start) + ' – ' + dateId(selected.target_end) : selected.schedule],
                        ['Kebutuhan Kompetensi', selected.competencies.join(', ')], ['Tujuan Pengembangan', selected.description],
                    ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}
                </dl>
                <button className="outline-button" onClick={() => setModal('')}>Tutup</button>
            </div>}
            {modal === 'plan-delete' && <div className="detail-content">
                <p>Hapus rencana <strong>{selected.name}</strong>?</p>
                <div className="modal-actions">
                    <button className="outline-button" onClick={() => setModal('')}>Batal</button>
                    <button className="primary-button" disabled={actionBusy} onClick={() => runAction({ action: 'plan_delete', id: selected.id })}>Hapus Rencana</button>
                </div>
            </div>}
            {modal === 'session' && <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); runAction({ action: selected ? 'session_update' : 'create_session', ...(selected ? { id: selected.id } : { plan_id: Number(f.get('plan_id')) }), name: f.get('name'), type: f.get('type'), status: f.get('status'), date: f.get('date'), starts_at: f.get('starts_at'), ends_at: f.get('ends_at'), quota: Number(f.get('quota')), location: f.get('location') }); }}><label className="field"><span>Rencana / nama pelatihan</span><select name="plan_id" required disabled={Boolean(selected)} defaultValue={selected?.training_plan_id ?? plans[0]?.id}>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.code} · {plan.name}</option>)}</select></label><div className="field-grid"><label className="field"><span>Tanggal</span><input type="date" name="date" required defaultValue={selected?.date ?? ''} /></label><label className="field"><span>Kuota peserta</span><input type="number" name="quota" min="1" defaultValue={selected?.quota ?? 30} required /></label></div><div className="field-grid"><label className="field"><span>Waktu mulai</span><input type="time" name="starts_at" required defaultValue={selected?.starts_at?.slice(0, 5) ?? '09:00'} /></label><label className="field"><span>Waktu selesai</span><input type="time" name="ends_at" required defaultValue={selected?.ends_at?.slice(0, 5) ?? '12:00'} /></label></div><label className="field"><span>Lokasi / metode</span><input name="location" required defaultValue={selected?.location ?? ''} placeholder="Ruang Meeting A atau Online" /></label><label className="field"><span>Nama sesi</span><input name="name" maxLength={150} defaultValue={selected?.name ?? ''} placeholder="Kosongkan untuk memakai nama rencana" /></label>
                <div className="field-grid"><label className="field"><span>Jenis sesi</span><select name="type" defaultValue={selected?.type ?? 'Umum'}><option>Umum</option><option>Wajib</option></select></label>
                <label className="field"><span>Status sesi</span><select name="status" defaultValue={selected?.status ?? 'Terjadwal'}>{['Draft', 'Terjadwal', 'Berlangsung', 'Selesai', 'Dibatalkan', 'Tidak Aktif'].map((status) => <option key={status}>{status}</option>)}</select></label></div><ModalActions onCancel={() => setModal('')} confirm={selected ? 'Simpan perubahan' : 'Simpan sesi'} /></form>}
            {modal === 'delete-session' && <div className="detail-content"><p>Hapus sesi <strong>{selected?.training_name}</strong> ({selected?.code})? Sesi yang masih memiliki peserta atau materi terkait tidak dapat dihapus.</p><div className="modal-actions"><button className="outline-button" onClick={() => setModal('')}>Batal</button><button className="primary-button" onClick={() => runAction({ action: 'session_delete', id: selected.id })}>Konfirmasi hapus</button></div></div>}
            {modal === 'material' && <div className="detail-content material-reader"><Badge>{selected?.type}</Badge><h3>{selected?.title}</h3><p>{selected?.content}</p>{/^https?:\/\//i.test(selected?.url ?? '') && <a className="outline-button" href={selected.url} target="_blank" rel="noopener noreferrer">Buka sumber materi</a>}<div className="reader-callout">Pelajari materi, lalu tandai selesai untuk memperbarui progres pelatihan.</div><div className="modal-actions"><button className="outline-button" onClick={() => setModal('')}>Tutup</button><button className="primary-button" disabled={(enrollments.find((item) => item.training_session_id === Number(sessionId))?.progress ?? 100) >= 100} onClick={() => runAction({ action: 'material_complete', session_id: Number(sessionId) })}>Tandai selesai</button></div></div>}
            {modal === 'employee-deactivate' && <div className="detail-content"><p>Nonaktifkan akun dan data <strong>{selected?.name}</strong>? Karyawan ini tidak akan dapat masuk ke SkillGrow.</p><div className="modal-actions"><button className="outline-button" onClick={() => setModal('')}>Batal</button><button className="primary-button" onClick={() => runAction({ action: 'employee_deactivate', id: selected.id })}>Konfirmasi nonaktifkan</button></div></div>}
            {['assign-confirm', 'unassign-confirm'].includes(modal) && <div className="detail-content">
                <p>{modal === 'assign-confirm' ? 'Tetapkan' : 'Keluarkan'} {selected.ids.length} peserta pada sesi <strong>{selected.session.training_name}</strong>?</p>
                <div className="modal-actions">
                    <button className="outline-button" onClick={() => setModal('')}>Batal</button>
                    <button className="primary-button" disabled={actionBusy} onClick={() => runAction({
                        action: modal === 'assign-confirm' ? 'assign' : 'unassign', session_id: selected.session.id, ids: selected.ids,
                    })}>Konfirmasi</button>
                </div>
            </div>}
            {modal === 'employee' && <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); runAction({ action: selected ? 'employee_update' : 'employee_create', ...(selected ? { id: selected.id } : {}), name: f.get('name'), position: f.get('position'), unit: f.get('unit'), code: f.get('code'), status: f.get('status') }); }}><label className="field"><span>ID karyawan</span><input name="code" required maxLength={10} defaultValue={selected?.employee_code} disabled={Boolean(selected)} /></label><label className="field"><span>Nama karyawan</span><input name="name" required defaultValue={selected?.name ?? ''} /></label><label className="field"><span>Jabatan</span><input name="position" required defaultValue={selected?.position ?? ''} /></label><label className="field"><span>Unit kerja</span><input name="unit" required defaultValue={selected?.unit ?? ''} /></label><label className="field"><span>Status</span><select name="status" defaultValue={selected?.status ?? 'Aktif'}><option>Aktif</option><option>Nonaktif</option></select></label><ModalActions onCancel={() => setModal('')} /></form>}
            {modal === 'target' && <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); runAction({ action: 'target_create', employee_id: Number(f.get('employee_id')), name: f.get('name'), date: f.get('date') }); }}><label className="field"><span>Karyawan</span><select name="employee_id">{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.employee_code} · {employee.name}</option>)}</select></label><label className="field"><span>Rincian target</span><input name="name" required placeholder="Contoh: Menguasai Data Analytics" /></label><label className="field"><span>Batas waktu target</span><input type="date" name="date" /></label><ModalActions onCancel={() => setModal('')} /></form>}
            {modal === 'attendance' && <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); runAction({ action: 'attendance', session_id: selected.training_session_id, status: f.get('status'), note: f.get('note') }); }}><div className="detail-callout"><CalendarDays size={18} /><span><strong>{selected?.training_name}</strong><small>{dateId(selected?.date)} · {sessions.find((s) => s.id === selected?.training_session_id)?.location}</small></span></div><label className="field"><span>Status kehadiran</span><select name="status"><option>Hadir</option><option>Izin</option></select></label><label className="field"><span>Catatan (opsional)</span><input name="note" maxLength="255" placeholder="Keterangan kehadiran" /></label><ModalActions onCancel={() => setModal('')} confirm="Simpan presensi" /></form>}
            {modal === 'evaluation' && (() => {
                const bank = data.evaluation_questions;
                const session = sessions.find((item) => item.id === selected.training_session_id);
                const questions = selected.test_type ? bank[session?.question_bank] ?? bank.assessment.slice(0, 8) : bank.assessment;
                const draftKey = ['skillgrow', user.id, 'evaluation', selected.training_session_id ?? 'assessment', selected.test_type ?? 'competency'].join(':');
                return <EvaluationForm key={draftKey} draftKey={draftKey} questions={questions} duration={selected.test_type ? 900 : 1800}
                    onClose={() => { setModal(''); loadWorkspace(); }}
                    submit={(answers, submissionId) => requestAction(selected.test_type
                        ? { action: 'test', session_id: selected.training_session_id, test_type: selected.test_type, answers }
                        : { action: 'assessment', answers, submission_id: submissionId })} />;
            })()}
            {modal === 'history' && selected && <div className="detail-content"><div className="detail-callout"><BookOpen size={18} /><span><strong>{selected.training_name}</strong><small>{selected.source} · {dateId(selected.date)}</small></span></div><div className="detail-grid"><span>Status kepesertaan<strong>{selected.status}</strong></span><span>Progres<strong>{selected.progress}%</strong></span><span>Pre-test<strong>{selected.pre_score ?? 'Belum diisi'}</strong></span><span>Post-test<strong>{selected.post_score ?? 'Belum diisi'}</strong></span><span>Presensi<strong>{data.attendance.find((item) => item.training_session_id === selected.training_session_id)?.status ?? 'Belum tercatat'}</strong></span></div><button className="outline-button" onClick={() => setModal('')}>Kembali ke Riwayat</button></div>}
            {modal === 'assessment-detail' && selected && <div className="detail-content"><div className="detail-callout"><ClipboardCheck size={18} /><span><strong>{selected.employee_name}</strong><small>{selected.title} · {dateId(selected.submitted_at)}</small></span></div><p>{selected.result}</p><div className="competency-list">{(data.competencies ?? []).filter((item) => item.assessment_id === selected.id).map((item) => <div key={item.id}><span>{item.competency}<small>{item.achievement}</small></span><strong>{item.score}% · {item.level}</strong></div>)}</div><button className="outline-button" onClick={() => setModal('')}>Kembali</button></div>}
        </section></div>}
    </div>;
}

function ModalActions({ onCancel, confirm = 'Simpan' }) { return <div className="modal-actions"><button type="button" className="outline-button" onClick={onCancel}>Batal</button><button type="submit" className="primary-button">{confirm}</button></div>; }

export default TrainingPage;
