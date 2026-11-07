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
    const response = await fetch(url, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content ?? '', ...options.headers },
        ...options,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const errors = Object.values(payload.errors ?? {}).flat();
        throw new Error(errors[0] ?? payload.message ?? 'Permintaan tidak dapat diproses.');
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
    const [typeFilter, setTypeFilter] = useState('Semua');
    const [toast, setToast] = useState('');
    const [modal, setModal] = useState('');
    const [selected, setSelected] = useState(null);
    const [sessionId, setSessionId] = useState('');
    const [mobileNav, setMobileNav] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [authMode, setAuthMode] = useState(() => window.location.pathname === '/forgot-password' ? 'forgot' : window.location.pathname.startsWith('/reset-password/') ? 'reset' : 'login');
    const [authNotice, setAuthNotice] = useState('');

    const loadWorkspace = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await api('/api/v1/workspace');
            setData(result);
            setUser(result.user);
        } catch (loadError) {
            setError(loadError.message);
            if (loadError.message.includes('Unauthenticated') || loadError.message.includes('unauthorized')) setUser(null);
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

    const runAction = async (payload) => {
        try {
            const result = await api('/api/v1/actions', { method: 'POST', body: JSON.stringify(payload) });
            setToast(result.message ?? 'Perubahan berhasil disimpan.');
            setModal('');
            setSelected(null);
            await loadWorkspace();
        } catch (actionError) { setError(actionError.message); }
    };

    const current = screens.find((item) => item.id === screen) ?? screens[0];
    const sessions = data?.sessions ?? [];
    const plans = data?.plans ?? [];
    const employees = data?.employees ?? [];
    const enrollments = data?.enrollments ?? [];
    const enrolledIds = new Set(enrollments.map((item) => Number(item.training_session_id)));
    const activeEnrollments = enrollments.filter((item) => !/selesai|lulus/i.test(item.status ?? ''));

    const screenContent = () => {
        if (!data) return <div className="panel loading-panel">{loading ? 'Memuat ruang kerja…' : error || 'Menghubungkan ke SkillGrow…'}</div>;
        if (screen === 'dashboard') return <>
            <div className="welcome-banner"><div><span className="eyebrow">{roleLabels[user.role]} · {dateId(new Date().toISOString())}</span><h2>Halo, {user.name.split(' ')[0]} 👋</h2><p>Berikut ringkasan aktivitas pengembangan kompetensimu.</p></div><span className="welcome-art"><GraduationCap size={66} strokeWidth={1.2} /></span></div>
            <div className="stats-grid">
                <StatCard label="Pelatihan aktif" value={activeEnrollments.length} note="Sesi yang sedang kamu ikuti" icon={BookOpen} />
                <StatCard label="Target pelatihan" value={data.targets.length} note={`${data.targets.filter((item) => item.status === 'Selesai').length} target selesai`} icon={Target} tone="purple" />
                <StatCard label="Tugas terbuka" value={data.tasks.filter((item) => item.status !== 'Selesai').length} note="Tugas menunggu penyelesaian" icon={ClipboardList} tone="blue" />
                <StatCard label="Rata-rata KPI" value={`${Math.round(data.kpis.reduce((sum, item) => sum + Number(item.achievement ?? 0), 0) / Math.max(data.kpis.length, 1))}%`} note="Periode Q4 2026" icon={Activity} tone="green" />
            </div>
            <section className="panel"><div className="panel-heading"><div><h2>Jadwal pelatihanmu</h2><p>Pelatihan yang akan datang dan sedang berlangsung</p></div><button className="text-button" onClick={() => setScreen('schedule')}>Lihat semua <ArrowRight size={15} /></button></div>
                <Table columns={[{ key: 'training_name', label: 'Nama pelatihan', render: (r) => <strong>{r.training_name}</strong> }, { key: 'date', label: 'Tanggal', render: (r) => dateId(r.date) }, { key: 'location', label: 'Lokasi', render: (r) => sessions.find((s) => s.id === r.training_session_id)?.location }, { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> }]} rows={activeEnrollments.slice(0, 4)} />
            </section>
        </>;

        if (screen === 'active') return <section className="panel"><div className="panel-heading"><div><h2>Pelatihan aktifmu</h2><p>Sesi yang sedang atau akan kamu ikuti.</p></div><button className="outline-button" onClick={() => setScreen('catalog')}>Jelajahi pelatihan</button></div><Table columns={[{ key: 'session_code', label: 'Kode sesi' }, { key: 'training_name', label: 'Nama pelatihan', render: (r) => <strong>{r.training_name}</strong> }, { key: 'date', label: 'Tanggal', render: (r) => dateId(r.date) }, { key: 'time', label: 'Waktu', render: (r) => { const s = sessions.find((item) => item.id === r.training_session_id); return s ? `${s.starts_at.slice(0, 5)}–${s.ends_at.slice(0, 5)}` : '—'; } }, { key: 'progress', label: 'Progres', render: (r) => `${r.progress}%` }, { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> }, { key: 'action', label: 'Aksi', render: (r) => <button className="small-button" onClick={() => { setSessionId(r.training_session_id); setScreen('materials'); }}>Lihat pelatihan</button> }]} rows={activeEnrollments} empty="Sesi pelatihan belum tersedia" />{enrollments.length > 0 && activeEnrollments.length === 0 && <div className="completion-note"><CheckCircle2 size={16} /> Seluruh pelatihan telah diselesaikan, lihat riwayat Anda.</div>}</section>;

        if (screen === 'catalog') {
            const rows = filtered(sessions.filter((session) => !enrolledIds.has(Number(session.id)) && session.date >= new Date().toISOString().slice(0, 10) && !['Selesai', 'Dibatalkan'].includes(session.status)), ['training_name', 'category', 'location']);
            return <>
                {screen === 'catalog' && <div className="toolbar"><span className="eyebrow">PROGRAM PENGEMBANGAN</span><label className="search-box"><Search size={16} /><input placeholder="Cari nama atau kategori pelatihan…" value={search} onChange={(e) => setSearch(e.target.value)} /></label></div>}
                {rows.length ? <div className="course-grid">{rows.map((session) => {
                    const plan = plans.find((item) => item.id === session.training_plan_id);
                    const joined = false;
                    return <article className="course-card" key={session.id}><div className="course-cover"><span className="cover-mark"><GraduationCap size={27} /></span><span className="cover-category">{session.category}</span><span className="cover-lines" /></div><div className="course-body"><div className="course-meta"><Badge>{session.status}</Badge><span>{plan?.code ?? session.code}</span></div><h2>{joined ? session.training_name : session.training_name}</h2><p>{plan?.description ?? 'Program pengembangan kompetensi yang dirancang untuk mendukung pertumbuhan karier.'}</p><div className="course-details"><span><CalendarDays size={14} />{dateId(session.date)}</span><span><Clock3 size={14} />{session.starts_at.slice(0, 5)}–{session.ends_at.slice(0, 5)}</span></div><div className="course-footer"><span>{session.location}</span>{joined ? <button className="outline-button" onClick={() => { setSessionId(session.training_session_id); setScreen('materials'); }}>Buka pelatihan <ArrowRight size={14} /></button> : <button className="primary-button" onClick={() => runAction({ action: 'enroll', session_id: session.id })}>Ikuti pelatihan</button>}</div></div></article>;
                })}</div> : <div className="panel empty-panel"><BookOpen size={27} /><h2>{screen === 'active' ? 'Sesi pelatihan belum tersedia' : 'Pelatihan tidak ditemukan'}</h2><p>{screen === 'active' ? 'Sesi yang kamu ikuti akan muncul di sini.' : 'Coba ubah kata kunci pencarian.'}</p>{screen === 'active' && <button className="primary-button" onClick={() => setScreen('catalog')}>Jelajahi pelatihan</button>}</div>}
            </>;
        }

        if (screen === 'schedule') return <section className="panel"><div className="panel-heading"><div><h2>Jadwal pelatihan</h2><p>Kalender sesi yang terdaftar untukmu.</p></div></div><Table columns={[{ key: 'training_name', label: 'Pelatihan', render: (r) => <strong>{r.training_name}</strong> }, { key: 'date', label: 'Tanggal', render: (r) => dateId(r.date) }, { key: 'time', label: 'Waktu', render: (r) => `${r.starts_at.slice(0, 5)} – ${r.ends_at.slice(0, 5)}` }, { key: 'location', label: 'Metode / lokasi' }, { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> }]} rows={enrollments.map((e) => ({ ...sessions.find((s) => s.id === e.training_session_id), ...e }))} empty="Belum ada jadwal pelatihan untuk akun ini." /></section>;

        if (screen === 'targets') return <><div className="stats-grid two"><StatCard label="Target ditetapkan" value={data.targets.length} note="Rencana pengembangan kompetensi" icon={Target} /><StatCard label="Progres keseluruhan" value={`${Math.round(data.targets.reduce((s, t) => s + Number(t.progress), 0) / Math.max(data.targets.length, 1))}%`} note="Rata-rata penyelesaian target" icon={Activity} tone="green" /></div><div className="target-grid">{data.targets.map((target) => <article className="panel target-card" key={target.id}><div className="target-head"><span className="target-symbol"><Target size={19} /></span><Badge>{target.status}</Badge></div><h2>{target.name}</h2><p>Target pengembangan personal</p><div className="progress-label"><span>Progres</span><strong>{target.progress}%</strong></div><div className="progress-track"><i style={{ width: `${target.progress}%` }} /></div></article>)}</div>{!data.targets.length && <div className="panel empty-panel">Target pelatihan belum ditetapkan untukmu.</div>}</>;

        if (screen === 'tasks') return <section className="panel"><div className="panel-heading"><div><h2>Tugas dan asesmen</h2><p>Pantau batas waktu dan status pengerjaan.</p></div><label className="search-box"><Search size={16} /><input placeholder="Cari tugas…" value={search} onChange={(e) => setSearch(e.target.value)} /></label></div><Table columns={[{ key: 'code', label: 'Kode' }, { key: 'name', label: 'Nama tugas', render: (r) => <strong>{r.name}</strong> }, { key: 'type', label: 'Jenis' }, { key: 'due_date', label: 'Batas waktu', render: (r) => dateId(r.due_date) }, { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> }, { key: 'action', label: 'Aksi', render: (r) => r.status === 'Selesai' ? <Check size={16} /> : <button className="small-button" onClick={() => r.type === 'Tes' ? setScreen('tests') : runAction({ action: 'task_complete', id: r.id })}>{r.type === 'Tes' ? 'Kerjakan tes' : 'Tandai selesai'}</button> }]} rows={filtered(data.tasks, ['name', 'code', 'status'])} /></section>;

        if (screen === 'assessment') return <div className="form-layout"><section className="panel assessment-intro"><span className="large-symbol"><ClipboardCheck size={25} /></span><span className="eyebrow">PENGEMBANGAN DIRI</span><h2>Skill Assessment</h2><p>Nilai kompetensimu secara jujur. Hasil assessment membantu HR/PSDM menyusun rekomendasi pengembangan yang tepat.</p><div className="assessment-list">{['Problem solving', 'Analytical thinking', 'Komunikasi', 'Kolaborasi'].map((x, i) => <div key={x}><span className="step-number">0{i + 1}</span><span>{x}</span><span className="step-points">5 pernyataan</span></div>)}</div></section><section className="panel"><form onSubmit={(e) => { e.preventDefault(); runAction({ action: 'assessment', answers: Object.fromEntries(new FormData(e.currentTarget).entries()) }); }}><div className="panel-heading"><div><h2>Penilaian kompetensi</h2><p>Pilih tingkat kemampuanmu saat ini.</p></div></div>{['Problem solving', 'Analytical thinking', 'Komunikasi', 'Kolaborasi'].map((q) => <label className="field" key={q}><span>{q}</span><select name={q} required defaultValue=""><option value="" disabled>Pilih tingkat kemampuan</option><option>Pemula</option><option>Menengah</option><option>Mahir</option><option>Ahli</option></select></label>)}<button className="primary-button full-button">Kirim assessment</button></form></section></div>;

        if (screen === 'tests') return <section className="panel"><div className="panel-heading"><div><h2>Tes pelatihan</h2><p>Pre-test tersedia sebelum belajar; post-test terbuka setelah progres materi mencapai 75%.</p></div></div>{enrollments.length ? <div className="test-layout">{enrollments.map((enrollment) => { const type = enrollment.pre_score == null ? 'pre' : 'post'; const canPost = type === 'pre' || enrollment.progress >= 75; return <article className="test-card" key={enrollment.id}><span className="large-symbol"><ClipboardList size={22} /></span><h3>{enrollment.training_name}</h3><p>{type === 'pre' ? 'Pre-test · 3 pertanyaan pilihan ganda' : `Post-test · ${enrollment.progress >= 75 ? 'siap dikerjakan' : `selesaikan materi (${enrollment.progress}% / 75%)`}`}</p><button className="primary-button" disabled={!canPost || enrollment.post_score != null} onClick={() => { setSelected({ ...enrollment, test_type: type }); setModal('test'); }}>{enrollment.post_score != null ? `Nilai ${enrollment.post_score}%` : canPost ? `Mulai ${type === 'pre' ? 'pre-test' : 'post-test'}` : 'Materi belum selesai'}</button></article>; })}</div> : <div className="table-empty">Daftarkan diri pada sesi pelatihan untuk mengakses tes.</div>}</section>;

        if (screen === 'attendance') return <section className="panel"><div className="panel-heading"><div><h2>Presensi pelatihan</h2><p>Presensi hanya tersedia untuk sesi yang kamu ikuti.</p></div></div><Table columns={[{ key: 'training_name', label: 'Pelatihan', render: (r) => <strong>{r.training_name}</strong> }, { key: 'date', label: 'Tanggal', render: (r) => dateId(r.date) }, { key: 'status', label: 'Status presensi', render: (r) => <Badge>{r.status ?? 'Belum presensi'}</Badge> }, { key: 'action', label: 'Aksi', render: (r) => r.status ? 'Tercatat' : <button className="small-button" onClick={() => { setSelected(r); setModal('attendance'); }}>Isi presensi</button> }]} rows={enrollments.map((e) => { const session = sessions.find((s) => s.id === e.training_session_id); const record = data.attendance.find((a) => a.training_session_id === e.training_session_id); return { ...e, ...record, date: session?.date }; })} empty="Kamu belum terdaftar pada sesi pelatihan." /></section>;

        if (screen === 'materials') {
            const chosen = Number(sessionId) || enrollments[0]?.training_session_id;
            const enrollment = enrollments.find((item) => item.training_session_id === chosen);
            const planId = sessions.find((item) => item.id === chosen)?.training_plan_id;
            const materials = data.materials.filter((item) => item.training_plan_id === planId);
            return <section className="panel"><div className="panel-heading"><div><h2>Materi pelatihan</h2><p>Materi yang tersedia untuk sesi terdaftar.</p></div><select className="select-compact" value={chosen ?? ''} onChange={(e) => setSessionId(e.target.value)}>{enrollments.map((item) => <option key={item.id} value={item.training_session_id}>{item.training_name}</option>)}</select></div>{enrollment ? <><div className="material-progress"><span>Progres belajar <strong>{enrollment.progress}%</strong></span><div className="progress-track"><i style={{ width: `${enrollment.progress}%` }} /></div><button className="small-button" disabled={enrollment.progress >= 100} onClick={() => runAction({ action: 'material_complete', session_id: chosen })}>{enrollment.progress >= 100 ? 'Semua materi selesai' : 'Tandai materi selesai'}</button></div><div className="material-list">{materials.map((item, index) => <article className="material-row" key={item.id}><span className="material-icon"><FileText size={18} /></span><span className="material-index">0{index + 1}</span><div className="material-copy"><strong>{item.title}</strong><small>{item.type} · Materi terbit</small></div><button className="small-button" onClick={() => { setSelected(item); setModal('material'); }}>Buka materi <ArrowRight size={14} /></button></article>)}</div></> : <div className="table-empty">Materi hanya tersedia bagi peserta terdaftar. Ikuti pelatihan untuk melihat materi.</div>}</section>;
        }

        if (screen === 'history') { const rows = filtered(enrollments, ['training_name', 'source', 'status']).filter((item) => typeFilter === 'Semua' || (typeFilter === 'Wajib' ? item.source === 'Wajib' : item.source !== 'Wajib')).filter((item) => statusFilter === 'Semua' || item.status.toLowerCase().includes(statusFilter.toLowerCase())); return <section className="panel"><div className="panel-heading"><div><h2>Riwayat pelatihan</h2><p>Daftar pelatihan, status, dan hasil belajarmu.</p></div><label className="search-box"><Search size={16} /><input placeholder="Cari pelatihan…" value={search} onChange={(e) => setSearch(e.target.value)} /></label></div><div className="table-filters"><label>Jenis<select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option>Semua</option><option>Wajib</option><option>Mandiri</option></select></label><label>Status<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option>Semua</option><option>Terdaftar</option><option>Selesai</option><option>Belum lulus</option></select></label></div><Table columns={[{ key: 'training_name', label: 'Nama pelatihan', render: (r) => <strong>{r.training_name}</strong> }, { key: 'source', label: 'Jenis' }, { key: 'date', label: 'Periode', render: (r) => dateId(r.date) }, { key: 'progress', label: 'Progres', render: (r) => `${r.progress}%` }, { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> }, { key: 'score', label: 'Nilai', render: (r) => r.post_score ?? '—' }, { key: 'detail', label: 'Detail', render: (r) => <button className="small-button" onClick={() => { setSelected(r); setModal('history'); }}>Lihat detail</button> }]} rows={rows} empty="Belum ada riwayat pelatihan yang cocok." /></section>; }

        if (screen === 'notifications') return <section className="panel"><div className="panel-heading"><div><h2>Notifikasi</h2><p>{data.notifications.filter((item) => !item.read).length} pemberitahuan belum dibaca</p></div></div>{data.notifications.length ? <div className="notification-list">{data.notifications.map((item) => <article className={`notification-row ${item.read ? 'read' : ''}`} key={item.id}><span className="notification-icon"><Bell size={17} /></span><div><strong>{item.title}</strong><p>{item.body}</p><small>{dateId(item.created_at)}</small></div>{!item.read && <button className="small-button" onClick={() => runAction({ action: 'notification_read', id: item.id })}>Tandai dibaca</button>}</article>)}</div> : <div className="table-empty">Belum ada notifikasi.</div>}</section>;

        if (screen === 'employees') return <section className="panel"><div className="panel-heading"><div><h2>Data karyawan</h2><p>Kelola direktori karyawan dan status keaktifan.</p></div><button className="primary-button" onClick={() => { setSelected(null); setModal('employee'); }}>+ Tambah karyawan</button></div><div className="toolbar"><label className="search-box"><Search size={16} /><input placeholder="Cari nama, ID, unit kerja…" value={search} onChange={(e) => setSearch(e.target.value)} /></label></div><Table columns={[{ key: 'employee_code', label: 'ID karyawan' }, { key: 'name', label: 'Nama', render: (r) => <strong>{r.name}</strong> }, { key: 'position', label: 'Jabatan' }, { key: 'unit', label: 'Unit kerja' }, { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> }, { key: 'actions', label: 'Aksi', render: (r) => <div className="row-actions"><button className="small-button" onClick={() => { setSelected(r); setModal('employee'); }}>Ubah</button>{r.status !== 'Nonaktif' && <button className="small-button danger-text" onClick={() => { setSelected(r); setModal('employee-deactivate'); }}>Nonaktifkan</button>}</div> }]} rows={filtered(employees, ['name', 'employee_code', 'unit'])} empty="Data karyawan tidak ditemukan." /></section>;

        if (screen === 'plans') return <section className="panel"><div className="panel-heading"><div><h2>Rencana pelatihan</h2><p>Atur program, jadwal, dan kuota sebelum membuat sesi.</p></div><button className="primary-button" onClick={() => setModal('plan')}>+ Buat rencana</button></div><Table columns={[{ key: 'code', label: 'Kode' }, { key: 'name', label: 'Nama pelatihan', render: (r) => <strong>{r.name}</strong> }, { key: 'category', label: 'Kategori' }, { key: 'schedule', label: 'Jadwal' }, { key: 'quota', label: 'Kuota', render: (r) => `${r.quota} peserta` }, { key: 'sessions', label: 'Sesi', render: (r) => sessions.filter((s) => s.training_plan_id === r.id).length }]} rows={plans} empty="Belum ada rencana pelatihan." /></section>;

        if (screen === 'sessions') return <section className="panel"><div className="panel-heading"><div><h2>Kelola sesi pelatihan</h2><p>Buat jadwal, atur kuota, dan pantau status sesi.</p></div><button className="primary-button" onClick={() => { setSelected(null); setModal('session'); }}>+ Tambah sesi</button></div><Table columns={[{ key: 'code', label: 'Kode sesi' }, { key: 'training_name', label: 'Pelatihan', render: (r) => <strong>{r.training_name}</strong> }, { key: 'date', label: 'Tanggal', render: (r) => dateId(r.date) }, { key: 'time', label: 'Waktu', render: (r) => `${r.starts_at.slice(0, 5)}–${r.ends_at.slice(0, 5)}` }, { key: 'location', label: 'Lokasi' }, { key: 'capacity', label: 'Peserta / kuota', render: (r) => `${enrollments.filter((e) => e.training_session_id === r.id).length} / ${r.quota}` }, { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> }, { key: 'actions', label: 'Aksi', render: (r) => <div className="row-actions"><button className="small-button" onClick={() => { setSelected(r); setModal('session'); }}>Ubah</button><button className="small-button danger-text" onClick={() => { setSelected(r); setModal('delete-session'); }}>Hapus</button></div> }]} rows={sessions} /></section>;

        if (screen === 'participants') {
            const chosen = Number(sessionId) || sessions[0]?.id;
            const roster = enrollments.filter((item) => item.training_session_id === chosen);
            const available = employees.filter((employee) => employee.status === 'Aktif' && !roster.some((person) => person.employee_id === employee.id));
            return <section className="panel"><div className="panel-heading"><div><h2>Peserta pelatihan</h2><p>Tetapkan atau keluarkan karyawan dari sesi.</p></div><select className="select-compact" value={chosen ?? ''} onChange={(e) => setSessionId(e.target.value)}>{sessions.map((item) => <option value={item.id} key={item.id}>{item.code} · {item.training_name}</option>)}</select></div>{sessions.find((item) => item.id === chosen) && <div className="session-summary"><strong>{sessions.find((item) => item.id === chosen).training_name}</strong><span>{dateId(sessions.find((item) => item.id === chosen).date)} · {sessions.find((item) => item.id === chosen).location}</span><Badge>{roster.length} / {sessions.find((item) => item.id === chosen).quota} peserta</Badge></div>}<div className="split-panels"><div><h3>Peserta terdaftar</h3><Table columns={[{ key: 'employee_name', label: 'Nama karyawan', render: (r) => <strong>{r.employee_name}</strong> }, { key: 'employee_code', label: 'ID' }, { key: 'source', label: 'Jenis' }, { key: 'remove', label: 'Aksi', render: (r) => <button className="small-button danger-text" onClick={() => { setSelected(r); setModal('unassign-confirm'); }}>Keluarkan</button> }]} rows={roster} /></div><div className="assign-box"><h3>Tambahkan karyawan</h3><p>Peserta aktif yang belum terdaftar.</p>{available.map((item) => <div className="employee-option" key={item.id}><span className="mini-avatar">{item.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}</span><span><strong>{item.name}</strong><small>{item.position}</small></span><button className="small-button" onClick={() => { setSelected(item); setSessionId(chosen); setModal('assign-confirm'); }}>Tetapkan</button></div>)}</div></div></section>;
        }

        if (screen === 'targets-overview') { const rows = filtered(data.targets, ['employee_name', 'employee_code', 'name']).filter((item) => statusFilter === 'Semua' || (statusFilter === 'Sudah selesai' ? item.status === 'Selesai' : item.status !== 'Selesai')); return <section className="panel"><div className="panel-heading"><div><h2>Pemantauan target capaian</h2><p>Pantau progres pengembangan seluruh karyawan.</p></div><button className="primary-button" onClick={() => setModal('target')}>+ Tetapkan target</button></div><div className="table-filters"><label>Cari karyawan / target<input placeholder="Nama, ID, atau target" value={search} onChange={(e) => setSearch(e.target.value)} /></label><div className="segmented">{['Semua', 'Belum selesai', 'Sudah selesai'].map((filter) => <button key={filter} className={`segment ${statusFilter === filter ? 'active' : ''}`} onClick={() => setStatusFilter(filter === 'Belum selesai' ? 'Belum selesai' : filter)}>{filter}</button>)}</div></div><Table columns={[{ key: 'employee_name', label: 'Karyawan', render: (r) => <strong>{r.employee_name}</strong> }, { key: 'employee_code', label: 'ID karyawan' }, { key: 'name', label: 'Target' }, { key: 'progress', label: 'Capaian', render: (r) => <div className="inline-progress"><span>{r.progress}%</span><div className="progress-track"><i style={{ width: `${r.progress}%` }} /></div></div> }, { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> }]} rows={rows} empty="Belum ada target capaian." /></section>; }

        if (screen === 'kpi-input' || screen === 'kpi-review') {
            const groups = employees.map((employee) => ({ ...employee, items: data.kpis.filter((item) => item.employee_id === employee.id) })).filter((employee) => employee.name.toLowerCase().includes(search.toLowerCase()) || employee.employee_code.toLowerCase().includes(search.toLowerCase())).filter((employee) => statusFilter === 'Semua' || (statusFilter === 'Belum dinilai' ? employee.items.some((item) => item.achievement == null) : employee.items.length > 0 && employee.items.every((item) => item.achievement != null)));
            return <section className="panel"><div className="panel-heading"><div><h2>{screen === 'kpi-input' ? 'Penilaian KPI staf' : 'Tinjauan nilai KPI'}</h2><p>Indikator, target, dan capaian kinerja periode Q4 2026.</p></div></div><div className="table-filters"><label>Cari staf<input placeholder="Nama atau ID karyawan" value={search} onChange={(e) => setSearch(e.target.value)} /></label><div className="segmented">{['Semua', 'Belum dinilai', 'Sudah dinilai'].map((filter) => <button key={filter} className={`segment ${statusFilter === filter ? 'active' : ''}`} onClick={() => setStatusFilter(filter)}>{filter}</button>)}</div></div><div className="kpi-groups">{groups.map((group) => <article className="kpi-employee" key={group.id}><div className="kpi-employee-head"><span className="mini-avatar">{group.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}</span><div><strong>{group.name}</strong><small>{group.employee_code} · {group.position}</small></div><Badge>{group.items.some((item) => item.achievement == null) ? 'Belum dinilai' : 'Sudah dinilai'}</Badge></div><div className="table-scroll"><table><thead><tr><th>Indikator</th><th>Target</th><th>Capaian</th><th>Status</th></tr></thead><tbody>{group.items.map((item) => <tr key={item.id}><td>{item.indicator}</td><td>{item.target}%</td><td>{screen === 'kpi-input' ? <input className="inline-input" type="number" min="0" max="100" defaultValue={item.achievement} data-kpi={item.id} /> : `${item.achievement ?? '—'}%`}</td><td><Badge>{item.status}</Badge></td></tr>)}</tbody></table></div></article>)}</div>{screen === 'kpi-input' && <button className="primary-button save-kpi" onClick={() => { const inputs = [...document.querySelectorAll('[data-kpi]')]; if (inputs.some((input) => input.value === '')) { setError('Isi seluruh capaian indikator sebelum menyimpan.'); return; } const values = Object.fromEntries(inputs.map((input) => [input.dataset.kpi, input.value])); runAction({ action: 'kpi_save', values }); }}>Simpan penilaian</button>}</section>;
        }

        if (screen === 'assessments-review') return <section className="panel"><div className="panel-heading"><div><h2>Tinjauan skill assessment</h2><p>Hasil assessment dan kompetensi karyawan.</p></div></div><Table columns={[{ key: 'employee_name', label: 'Karyawan', render: (r) => <strong>{r.employee_name}</strong> }, { key: 'employee_code', label: 'ID' }, { key: 'title', label: 'Assessment' }, { key: 'submitted_at', label: 'Tanggal', render: (r) => dateId(r.submitted_at) }, { key: 'result', label: 'Ringkasan' }, { key: 'detail', label: 'Detail', render: (r) => <button className="small-button" onClick={() => { setSelected(r); setModal('assessment-detail'); }}>Tinjau hasil</button> }]} rows={data.assessments} empty="Belum ada hasil assessment." /></section>;

        if (screen === 'performance') return <section className="panel"><div className="panel-heading"><div><h2>Pemantauan kinerja</h2><p>Ringkasan kinerja dan pencapaian karyawan.</p></div><label className="search-box"><Search size={16} /><input placeholder="Cari nama atau ID…" value={search} onChange={(e) => setSearch(e.target.value)} /></label></div><Table columns={[{ key: 'employee_name', label: 'Karyawan', render: (r) => <strong>{r.employee_name}</strong> }, { key: 'employee_code', label: 'ID karyawan' }, { key: 'period', label: 'Periode' }, { key: 'score', label: 'Nilai', render: (r) => `${r.score}%` }, { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> }, { key: 'detail', label: 'Rincian', render: (r) => r.detail }]} rows={filtered(data.performance, ['employee_name', 'employee_code', 'status'])} empty="Data kinerja belum tersedia." /></section>;
        return <section className="panel empty-panel"><h2>Halaman belum tersedia</h2><p>Pilih halaman dari menu navigasi.</p></section>;
    };

    const submitLogin = async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setError(''); setLoading(true);
        try { const result = await api('/api/v1/login', { method: 'POST', body: JSON.stringify({ identifier: form.get('identifier'), password: form.get('password'), remember: form.get('remember') === 'on' }) }); setUser(result.user); setScreen('dashboard'); }
        catch (loginError) { setError(loginError.message); }
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
                    <h2>Masuk ke SkillGrow</h2>
                    <p>Gunakan akun karyawan yang terdaftar di PT Nusantara Logistik Terpadu.</p>
                    {error && <div className="error-alert" role="alert">{error}</div>}
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
                    {group.ids.map((id) => { const item = screens.find((entry) => entry.id === id); const Icon = item?.icon ?? UserRound; return <button key={id} className={`nav-link ${screen === id ? 'active' : ''}`} onClick={() => { if (id === 'profile') setModal('profile'); else setScreen(id); setSearch(''); setStatusFilter('Semua'); setTypeFilter('Semua'); setMobileNav(false); }}><Icon /><span>{item?.label ?? 'Profil'}</span>{id === 'notifications' && unreadCount > 0 && <span className="nav-count">{unreadCount}</span>}</button>; })}
                </div>)}
            </nav>
            <div className="sidebar-bottom"><div className="profile"><span className="avatar">{user.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}</span><span className="profile-copy"><span className="profile-name">{user.name}</span><span className="profile-role">{user.position ?? roleLabels[user.role]}</span></span><button className="logout-button" title="Keluar" onClick={async () => { await api('/api/v1/logout', { method: 'POST', body: '{}' }).catch(() => {}); setMobileNav(false); setData(null); setUser(null); }}><LogOut size={16} /></button></div></div>
        </aside>
        <div className="main-column"><header className="topbar"><div className="topbar-left"><button className="mobile-menu" aria-label="Buka menu" onClick={() => setMobileNav(true)}><Menu size={20} /></button><div className="breadcrumbs"><span>Portal {roleLabels[user.role]}</span><span className="breadcrumb-divider" /><strong>{current.label}</strong></div></div><div className="topbar-actions"><span className="date-pill"><CalendarDays />{new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}</span><button className="icon-button notification-button" onClick={() => setScreen('notifications')} aria-label="Notifikasi"><Bell />{data?.notifications.some((item) => !item.read) && <i />}</button><div className="topbar-user"><span className="avatar">{user.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}</span><span className="topbar-user-copy">{user.name}<small>{roleLabels[user.role]}</small></span><ChevronDown className="user-chevron" /></div></div></header>
            <main className="content"><div className="page-heading"><div><span className="eyebrow">{roleLabels[user.role].toUpperCase()} / SKILLGROW</span><h1 className="page-title">{current.label}</h1><p className="page-description">{screen === 'catalog' ? 'Temukan pelatihan yang mendukung perkembangan kompetensimu.' : screen === 'active' ? 'Lihat sesi pelatihan yang sedang dan akan kamu ikuti.' : 'Kelola aktivitas pembelajaran dan perkembangan kompetensi.'}</p></div><div className="heading-actions"><span className="workspace-chip"><span />Workspace aktif</span></div></div>{error && <div className="error-alert inline-error" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Tutup pesan"><X size={15} /></button></div>}{user.role === 'employee' && ['active', 'catalog', 'tasks', 'tests', 'attendance', 'materials'].includes(screen) && <nav className="learning-tabs" aria-label="Aktivitas pelatihan">{['active', 'catalog', 'tasks', 'tests', 'attendance', 'materials'].map((id) => <button key={id} className={screen === id ? 'active' : ''} onClick={() => setScreen(id)}>{screens.find((item) => item.id === id).label}</button>)}</nav>}{screenContent()}</main>
        </div>{mobileNav && <button className="nav-backdrop" aria-label="Tutup navigasi" onClick={() => setMobileNav(false)} />}{toast && <div className="toast"><CheckCircle2 size={17} />{toast}<button onClick={() => setToast('')}><X size={15} /></button></div>}
        {modal && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setModal(''); }}><section className="modal-card"><div className="modal-head"><div><span className="eyebrow">SKILLGROW</span><h2>{modal === 'plan' ? 'Buat rencana pelatihan' : modal === 'session' ? (selected ? 'Ubah sesi pelatihan' : 'Tambah sesi pelatihan') : modal === 'delete-session' ? 'Konfirmasi hapus sesi' : modal === 'employee-deactivate' ? 'Konfirmasi nonaktifkan karyawan' : modal === 'assign-confirm' ? 'Konfirmasi penetapan peserta' : modal === 'unassign-confirm' ? 'Konfirmasi keluarkan peserta' : modal === 'profile' ? 'Profil Karyawan' : modal === 'material' ? 'Materi pelatihan' : modal === 'employee' ? (selected ? 'Ubah data karyawan' : 'Tambah karyawan') : modal === 'target' ? 'Tetapkan target pelatihan' : modal === 'attendance' ? 'Isi presensi' : modal === 'test' ? 'Tes pelatihan' : modal === 'history' ? 'Detail riwayat' : 'Hasil assessment'}</h2></div><button className="icon-button" onClick={() => setModal('')} aria-label="Tutup"><X size={18} /></button></div>
            {modal === 'profile' && <div className="detail-content"><div className="detail-callout"><UserRound /><strong>{user.name}</strong></div><div className="detail-grid"><span>ID Karyawan<strong>{user.employee_code}</strong></span><span>Jabatan<strong>{user.position}</strong></span><span>Unit Kerja<strong>{user.unit}</strong></span><span>Email<strong>{user.email}</strong></span></div></div>}
            {modal === 'plan' && <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); runAction({ action: 'create_plan', name: f.get('name'), category: f.get('category'), quota: Number(f.get('quota')), date: f.get('date'), note: f.get('description') }); }}><label className="field"><span>Nama pelatihan</span><input name="name" required maxLength="150" placeholder="Contoh: Data Analytics Fundamentals" /></label><div className="field-grid"><label className="field"><span>Kategori</span><select name="category"><option>Teknis</option><option>Soft skill</option><option>Desain</option><option>Leadership</option></select></label><label className="field"><span>Kuota peserta</span><input type="number" name="quota" min="1" required defaultValue="30" /></label></div><label className="field"><span>Jadwal rencana</span><input type="date" name="date" /></label><label className="field"><span>Deskripsi</span><textarea name="description" rows="3" placeholder="Tujuan dan ringkasan pelatihan" /></label><ModalActions onCancel={() => setModal('')} /></form>}
            {modal === 'session' && <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); runAction({ action: selected ? 'session_update' : 'create_session', ...(selected ? { id: selected.id, status: f.get('status') } : { plan_id: Number(f.get('plan_id')) }), date: f.get('date'), starts_at: f.get('starts_at'), ends_at: f.get('ends_at'), quota: Number(f.get('quota')), location: f.get('location') }); }}><label className="field"><span>Rencana / nama pelatihan</span><select name="plan_id" required disabled={Boolean(selected)} defaultValue={selected?.training_plan_id ?? plans[0]?.id}>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.code} · {plan.name}</option>)}</select></label><div className="field-grid"><label className="field"><span>Tanggal</span><input type="date" name="date" required defaultValue={selected?.date ?? ''} /></label><label className="field"><span>Kuota peserta</span><input type="number" name="quota" min="1" defaultValue={selected?.quota ?? 30} required /></label></div><div className="field-grid"><label className="field"><span>Waktu mulai</span><input type="time" name="starts_at" required defaultValue={selected?.starts_at?.slice(0, 5) ?? '09:00'} /></label><label className="field"><span>Waktu selesai</span><input type="time" name="ends_at" required defaultValue={selected?.ends_at?.slice(0, 5) ?? '12:00'} /></label></div><label className="field"><span>Lokasi / metode</span><input name="location" required defaultValue={selected?.location ?? ''} placeholder="Ruang Meeting A atau Online" /></label>{selected && <label className="field"><span>Status sesi</span><select name="status" defaultValue={selected.status}><option>Terjadwal</option><option>Berlangsung</option><option>Selesai</option><option>Dibatalkan</option></select></label>}<ModalActions onCancel={() => setModal('')} confirm={selected ? 'Simpan perubahan' : 'Simpan sesi'} /></form>}
            {modal === 'delete-session' && <div className="detail-content"><p>Hapus sesi <strong>{selected?.training_name}</strong> ({selected?.code})? Sesi yang masih memiliki peserta atau materi terkait tidak dapat dihapus.</p><div className="modal-actions"><button className="outline-button" onClick={() => setModal('')}>Batal</button><button className="primary-button" onClick={() => runAction({ action: 'session_delete', id: selected.id })}>Konfirmasi hapus</button></div></div>}
            {modal === 'material' && <div className="detail-content material-reader"><Badge>{selected?.type}</Badge><h3>{selected?.title}</h3><p>{selected?.content}</p><div className="reader-callout">Pelajari materi, lalu tandai selesai untuk memperbarui progres pelatihan.</div><div className="modal-actions"><button className="outline-button" onClick={() => setModal('')}>Tutup</button><button className="primary-button" disabled={(enrollments.find((item) => item.training_session_id === Number(sessionId))?.progress ?? 100) >= 100} onClick={() => runAction({ action: 'material_complete', session_id: Number(sessionId) })}>Tandai selesai</button></div></div>}
            {modal === 'employee-deactivate' && <div className="detail-content"><p>Nonaktifkan akun dan data <strong>{selected?.name}</strong>? Karyawan ini tidak akan dapat masuk ke SkillGrow.</p><div className="modal-actions"><button className="outline-button" onClick={() => setModal('')}>Batal</button><button className="primary-button" onClick={() => runAction({ action: 'employee_deactivate', id: selected.id })}>Konfirmasi nonaktifkan</button></div></div>}
            {modal === 'assign-confirm' && <div className="detail-content"><p>Tetapkan <strong>{selected?.name}</strong> sebagai peserta sesi {sessions.find((item) => item.id === Number(sessionId))?.code}?</p><div className="modal-actions"><button className="outline-button" onClick={() => setModal('')}>Batal</button><button className="primary-button" onClick={() => runAction({ action: 'assign', session_id: Number(sessionId), employee_id: selected.id })}>Konfirmasi tetapkan</button></div></div>}
            {modal === 'unassign-confirm' && <div className="detail-content"><p>Keluarkan <strong>{selected?.employee_name}</strong> dari sesi pelatihan ini?</p><div className="modal-actions"><button className="outline-button" onClick={() => setModal('')}>Batal</button><button className="primary-button" onClick={() => runAction({ action: 'unassign', id: selected.id })}>Konfirmasi keluarkan</button></div></div>}
            {modal === 'employee' && <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); runAction({ action: selected ? 'employee_update' : 'employee_create', ...(selected ? { id: selected.id } : {}), name: f.get('name'), position: f.get('position'), unit: f.get('unit') }); }}><label className="field"><span>Nama karyawan</span><input name="name" required defaultValue={selected?.name ?? ''} /></label><label className="field"><span>Jabatan</span><input name="position" required defaultValue={selected?.position ?? ''} /></label><label className="field"><span>Unit kerja</span><input name="unit" required defaultValue={selected?.unit ?? ''} /></label><ModalActions onCancel={() => setModal('')} /></form>}
            {modal === 'target' && <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); runAction({ action: 'target_create', employee_id: Number(f.get('employee_id')), name: f.get('name') }); }}><label className="field"><span>Karyawan</span><select name="employee_id">{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.employee_code} · {employee.name}</option>)}</select></label><label className="field"><span>Rincian target</span><input name="name" required placeholder="Contoh: Menguasai Data Analytics" /></label><ModalActions onCancel={() => setModal('')} /></form>}
            {modal === 'attendance' && <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); runAction({ action: 'attendance', session_id: selected.training_session_id, status: f.get('status'), note: f.get('note') }); }}><div className="detail-callout"><CalendarDays size={18} /><span><strong>{selected?.training_name}</strong><small>{dateId(selected?.date)} · {sessions.find((s) => s.id === selected?.training_session_id)?.location}</small></span></div><label className="field"><span>Status kehadiran</span><select name="status"><option>Hadir</option><option>Izin</option></select></label><label className="field"><span>Catatan (opsional)</span><input name="note" maxLength="255" placeholder="Keterangan kehadiran" /></label><ModalActions onCancel={() => setModal('')} confirm="Simpan presensi" /></form>}
            {modal === 'test' && <form onSubmit={(e) => { e.preventDefault(); const answers = Object.fromEntries(new FormData(e.currentTarget).entries()); runAction({ action: 'test', session_id: selected.training_session_id, test_type: selected.test_type, answers }); }}><p className="modal-copy">{selected?.training_name} · {selected?.test_type === 'pre' ? 'Pre-test' : 'Post-test'} · Pilih jawaban paling sesuai.</p>{['Seberapa percaya diri mengolah dataset?', 'Seberapa sering menggunakan visualisasi data?', 'Bagaimana tingkat pemahamanmu pada materi ini?'].map((question, i) => <label className="field" key={question}><span>{i + 1}. {question}</span><select required name={`q${i + 1}`}><option value="">Pilih jawaban</option><option value="1">Perlu belajar lebih lanjut</option><option value="2">Cukup memahami</option><option value="3">Sangat memahami</option></select></label>)}<ModalActions onCancel={() => setModal('')} confirm="Kirim jawaban" /></form>}
            {modal === 'history' && selected && <div className="detail-content"><div className="detail-callout"><BookOpen size={18} /><span><strong>{selected.training_name}</strong><small>{selected.source} · {dateId(selected.date)}</small></span></div><div className="detail-grid"><span>Status kepesertaan<strong>{selected.status}</strong></span><span>Progres<strong>{selected.progress}%</strong></span><span>Pre-test<strong>{selected.pre_score ?? 'Belum diisi'}</strong></span><span>Post-test<strong>{selected.post_score ?? 'Belum diisi'}</strong></span><span>Presensi<strong>{data.attendance.find((item) => item.training_session_id === selected.training_session_id)?.status ?? 'Belum tercatat'}</strong></span></div><ModalActions onCancel={() => setModal('')} confirm="Tutup" /></div>}
            {modal === 'assessment-detail' && selected && <div className="detail-content"><div className="detail-callout"><ClipboardCheck size={18} /><span><strong>{selected.employee_name}</strong><small>{selected.title} · {dateId(selected.submitted_at)}</small></span></div><p>{selected.result}</p><div className="competency-list">{(data.competencies ?? []).filter((item) => item.assessment_id === selected.id).map((item) => <div key={item.id}><span>{item.competency}<small>{item.achievement}</small></span><strong>{item.score}% · {item.level}</strong></div>)}</div><ModalActions onCancel={() => setModal('')} confirm="Selesai meninjau" /></div>}
        </section></div>}
    </div>;
}

function ModalActions({ onCancel, confirm = 'Simpan' }) { return <div className="modal-actions"><button type="button" className="outline-button" onClick={onCancel}>Batal</button><button type="submit" className="primary-button">{confirm}</button></div>; }

export default TrainingPage;
