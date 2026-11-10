import { useState } from 'react';

export const planStatuses = ['Draf', 'Menunggu Pengelolaan', 'Disetujui', 'Dijadwalkan', 'Selesai'];

export default function TrainingPlanForm({ plan, busy, onSave, onCancel }) {
    const [competencies, setCompetencies] = useState(plan?.competencies ?? []);
    const [competency, setCompetency] = useState('');
    const [start, setStart] = useState(plan?.target_start ?? '');
    const categories = [...new Set(['Digital', 'K3 & Kepatuhan', 'Manajerial', 'Teknis', 'Soft Skill', plan?.category].filter(Boolean))];

    function addCompetency() {
        const value = competency.trim();
        if (value && !competencies.includes(value) && competencies.length < 20) {
            setCompetencies([...competencies, value]);
        }
        setCompetency('');
    }

    return <form onSubmit={(event) => {
        event.preventDefault();
        const fields = Object.fromEntries(new FormData(event.currentTarget));
        onSave({
            ...fields,
            quota: Number(fields.quota),
            competencies: [...new Set([...competencies, competency.trim()].filter(Boolean))],
        });
    }}>
        <label className="field"><span>Kode Rencana</span><input name="code" maxLength={10} defaultValue={plan?.code} disabled={Boolean(plan)} placeholder="Dibuat otomatis jika kosong" /></label>
        <label className="field"><span>Nama Rencana Pelatihan</span><input name="name" required maxLength={150} defaultValue={plan?.name} /></label>
        <div className="field-grid">
            <label className="field"><span>Kategori</span><select name="category" defaultValue={plan?.category ?? 'Teknis'}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label className="field"><span>Penyelenggara</span><input name="provider" required maxLength={100} defaultValue={plan?.provider} /></label>
            <label className="field"><span>Departemen Sasaran</span><input name="department" required maxLength={100} defaultValue={plan?.department} /></label>
            <label className="field"><span>Estimasi Peserta</span><input name="quota" type="number" required min="1" max="10000" defaultValue={plan?.quota ?? 30} /></label>
            <label className="field"><span>Target Mulai</span><input name="target_start" type="date" required value={start} onChange={(event) => setStart(event.target.value)} /></label>
            <label className="field"><span>Target Selesai</span><input name="target_end" type="date" required min={start} defaultValue={plan?.target_end} /></label>
        </div>
        <label className="field"><span>Status</span><select name="status" defaultValue={planStatuses.includes(plan?.status) ? plan.status : 'Draf'}>{planStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
        <label className="field"><span>Kebutuhan Kompetensi</span><input maxLength={100} value={competency} onChange={(event) => setCompetency(event.target.value)} /></label>
        <button type="button" className="outline-button" onClick={addCompetency} disabled={!competency.trim() || competencies.length >= 20}>Tambah</button>
        <ul>{competencies.map((value) => <li key={value}>{value}{' '}<button type="button" className="text-button" onClick={() => setCompetencies(competencies.filter((item) => item !== value))}>Hapus</button></li>)}</ul>
        <label className="field"><span>Tujuan Pengembangan</span><textarea name="description" rows={3} maxLength={2000} defaultValue={plan?.description} /></label>
        <div className="modal-actions">
            <button type="button" className="outline-button" onClick={onCancel}>Batal</button>
            <button className="primary-button" disabled={busy}>Simpan Rencana</button>
        </div>
    </form>;
}
