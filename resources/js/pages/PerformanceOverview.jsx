function average(values) {
    return values.length ? Math.round(values.reduce((sum, value) => sum + Number(value), 0) / values.length) : null;
}

function percentage(value) {
    return value === null ? '—' : value + '%';
}

export default function PerformanceOverview({ data, Table, Badge, dateId, today }) {
    const employeeById = new Map(data.employees.map((employee) => [employee.id, employee]));
    const departments = Object.groupBy(data.targets, (target) => employeeById.get(target.employee_id)?.unit ?? 'Tanpa departemen');
    const overdue = data.targets.filter((target) => target.due_date && target.due_date < today && target.progress < 100 && target.status !== 'Selesai');
    const programs = data.sessions.filter((session) => session.status === 'Berlangsung').map((session) => {
        const participants = data.enrollments.filter((enrollment) => enrollment.training_session_id === session.id);
        const present = data.attendance.filter((record) => record.training_session_id === session.id && record.status === 'Hadir');
        return {
            ...session,
            participants: participants.length,
            attendance: participants.length ? Math.round(present.length / participants.length * 100) : null,
            preTest: average(participants.map((item) => item.pre_score).filter((score) => score != null)),
        };
    });
    const results = data.employees.map((employee) => {
        const targets = data.targets.filter((item) => item.employee_id === employee.id);
        const enrollments = data.enrollments.filter((item) => item.employee_id === employee.id);
        const indicators = data.kpis.filter((item) => item.employee_id === employee.id && item.achievement != null && Number(item.target) > 0);
        const kpi = average(indicators.map((item) => item.achievement / item.target * 100));
        return {
            ...employee,
            progress: average(targets.map((item) => item.progress)),
            postTest: average(enrollments.map((item) => item.post_score).filter((score) => score != null)),
            kpi,
            kpiStatus: kpi === null ? 'Belum dinilai' : kpi >= 100 ? 'Memenuhi KPI' : 'Belum memenuhi KPI',
        };
    });

    return <>
        <section className="panel">
            <h2>Pencapaian target per departemen</h2>
            <Table rows={Object.entries(departments).map(([unit, targets]) => ({ id: unit, unit, targetCount: targets.length, progress: average(targets.map((item) => item.progress)) }))}
                columns={[
                    { key: 'unit', label: 'Departemen' }, { key: 'targetCount', label: 'Jumlah Target' },
                    { key: 'progress', label: 'Rata-rata Progres', render: (row) => percentage(row.progress) },
                ]} empty="Belum ada target departemen." />
        </section>
        <section className="panel">
            <h2>Target pelatihan terlambat</h2>
            <Table rows={overdue} columns={[
                { key: 'employee_name', label: 'Karyawan' }, { key: 'name', label: 'Target' },
                { key: 'due_date', label: 'Batas Waktu', render: (row) => dateId(row.due_date) },
                { key: 'progress', label: 'Progres', render: (row) => percentage(row.progress) },
            ]} empty="Tidak ada target terlambat." />
        </section>
        <section className="panel">
            <h2>Kehadiran program berjalan</h2>
            <Table rows={programs} columns={[
                { key: 'training_name', label: 'Program' }, { key: 'participants', label: 'Peserta' },
                { key: 'attendance', label: 'Kehadiran', render: (row) => percentage(row.attendance) },
                { key: 'preTest', label: 'Rata-rata Pre-Test', render: (row) => percentage(row.preTest) },
                { key: 'status', label: 'Status', render: (row) => <Badge>{row.status}</Badge> },
            ]} empty="Belum ada program berjalan." />
        </section>
        <section className="panel">
            <h2>Hasil pelatihan dan penerapan dalam kinerja</h2>
            <Table rows={results} columns={[
                { key: 'name', label: 'Karyawan' },
                { key: 'progress', label: 'Progres Target', render: (row) => percentage(row.progress) },
                { key: 'postTest', label: 'Rata-rata Post-Test', render: (row) => percentage(row.postTest) },
                { key: 'kpi', label: 'Capaian KPI', render: (row) => percentage(row.kpi) },
                { key: 'kpiStatus', label: 'Status KPI', render: (row) => <Badge>{row.kpiStatus}</Badge> },
            ]} />
        </section>
    </>;
}
