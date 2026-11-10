import { useEffect, useState } from 'react';

function readDraft(key, length, duration) {
    const empty = { answers: Array(length).fill(null), flagged: [], current: 0, deadline: null, submissionId: crypto.randomUUID() };
    try {
        const saved = JSON.parse(localStorage.getItem(key));
        if (saved?.answers?.length === length && saved.current >= 0 && saved.current < length) {
            return { ...empty, ...saved };
        }
    } catch {
        // Storage may be unavailable on this device.
    }
    return { ...empty, deadline: Date.now() + duration * 1000 };
}

export default function EvaluationForm({ questions, draftKey, duration, submit, onClose }) {
    const [draft, setDraft] = useState(() => readDraft(draftKey, questions.length, duration));
    const [now, setNow] = useState(Date.now);
    const [confirm, setConfirm] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [result, setResult] = useState(null);
    const remaining = Math.max(0, Math.ceil((draft.deadline - now) / 1000));
    const answered = draft.answers.filter((answer) => answer !== null).length;
    const question = questions[draft.current];

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    function saveDraft() {
        try {
            localStorage.setItem(draftKey, JSON.stringify(draft));
            setNotice('Draf disimpan di perangkat ini.');
        } catch {
            setNotice('Draf tidak dapat disimpan di perangkat ini.');
        }
    }

    async function send() {
        setBusy(true);
        setError('');
        try {
            const response = await submit(draft.answers, draft.submissionId);
            setResult(response);
            try { localStorage.removeItem(draftKey); } catch { /* Result is already stored by Laravel. */ }
        } catch (failure) {
            setError(failure.message);
            saveDraft();
        } finally {
            setBusy(false);
        }
    }

    if (result) {
        return <div className="detail-content">
            <h3>Jawaban berhasil dikumpulkan</h3>
            <p>Skor <strong>{result.score}%</strong>{result.level && ` · ${result.level}`}</p>
            {result.correct != null && <p>{result.correct} benar · {result.wrong} salah · {result.empty} kosong</p>}
            <button className="primary-button" onClick={onClose}>Tutup hasil</button>
        </div>;
    }

    if (confirm) {
        return <div className="detail-content">
            <h3>Kumpulkan jawaban?</h3>
            <p>{answered} dari {questions.length} soal terjawab. {draft.flagged.length} soal ditandai ragu-ragu.</p>
            {error && <p className="error-alert" role="alert">{error}</p>}
            {notice && <p role="status">{notice}</p>}
            <div className="modal-actions">
                <button className="outline-button" onClick={() => setConfirm(false)} disabled={busy}>Kembali periksa</button>
                <button className="primary-button" onClick={send} disabled={busy}>{error ? 'Kirim Ulang Jawaban' : 'Ya, Kumpulkan'}</button>
            </div>
        </div>;
    }

    return <div className="detail-content">
        <p>Soal {draft.current + 1} dari {questions.length} · Sisa waktu {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</p>
        <fieldset disabled={remaining === 0}>
            <legend>{question.prompt}</legend>
            {question.options.map((option, index) => <p key={option}><label>
                <input type="radio" name="evaluation-answer" checked={draft.answers[draft.current] === index} onChange={() => {
                    setDraft((current) => ({
                        ...current,
                        answers: current.answers.map((answer, position) => position === current.current ? index : answer),
                    }));
                }} /> {option}
            </label></p>)}
        </fieldset>
        <nav className="learning-tabs" aria-label="Nomor soal">
            {questions.map((item, index) => <button key={item.prompt} className={draft.current === index ? 'active' : ''} aria-current={draft.current === index ? 'step' : undefined} onClick={() => setDraft({ ...draft, current: index })}>
                {index + 1}{draft.flagged.includes(index) ? ' ⚑' : draft.answers[index] != null ? ' ✓' : ''}
            </button>)}
        </nav>
        <div className="learning-tabs">
            <button disabled={draft.current === 0} onClick={() => setDraft({ ...draft, current: draft.current - 1 })}>Soal sebelumnya</button>
            <button aria-pressed={draft.flagged.includes(draft.current)} onClick={() => {
                const flagged = draft.flagged.includes(draft.current)
                    ? draft.flagged.filter((index) => index !== draft.current)
                    : [...draft.flagged, draft.current];
                setDraft({ ...draft, flagged });
            }}>Tandai ragu-ragu</button>
            <button disabled={draft.current === questions.length - 1} onClick={() => setDraft({ ...draft, current: draft.current + 1 })}>Lanjut</button>
        </div>
        {notice && <p role="status">{notice}</p>}
        {remaining === 0 && <p role="status">Waktu habis. Kumpulkan jawaban yang sudah diisi.</p>}
        <div className="modal-actions">
            <button className="outline-button" onClick={saveDraft}>Simpan Draf</button>
            <button className="primary-button" onClick={() => { setConfirm(true); setNotice(''); }}>Selesaikan &amp; Kumpulkan</button>
        </div>
    </div>;
}
