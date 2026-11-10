<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\EvaluationQuestions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class WorkspaceController extends Controller
{
    public function sendPasswordResetLink(Request $request): JsonResponse
    {
        $fields = $request->validate(['email' => ['required', 'email']]);
        $status = Password::sendResetLink($fields);

        if ($status !== Password::RESET_LINK_SENT) {
            throw ValidationException::withMessages(['email' => [__($status)]]);
        }

        return response()->json(['message' => 'Jika alamat tersebut terdaftar, tautan pemulihan akan dikirim ke email Anda.']);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $fields = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);
        $status = Password::reset($fields, function (User $user, string $password): void {
            $user->forceFill(['password' => $password])->save();
        });

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['email' => [__($status)]]);
        }

        return response()->json(['message' => 'Kata sandi berhasil diperbarui. Silakan masuk kembali.']);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'identifier' => ['required', 'string', 'max:120'],
            'password' => ['required', 'string'],
        ]);

        $account = User::query()->where('email', $credentials['identifier'])
            ->orWhereIn('id', DB::table('employees')->select('user_id')->where('employee_code', $credentials['identifier']))
            ->first();

        if (! $account || ! Auth::attempt(['email' => $account->email, 'password' => $credentials['password']], (bool) $request->boolean('remember'))) {
            throw ValidationException::withMessages(['identifier' => ['Email, ID karyawan, atau kata sandi tidak sesuai.']]);
        }

        if (! Auth::user()->active) {
            Auth::logout();

            return response()->json([
                'message' => 'Akun dinonaktifkan. Hubungi HR/PSDM.',
                'csrf_token' => $request->session()->token(),
            ], 403);
        }

        $request->session()->regenerate();

        return response()->json(['user' => $this->userPayload(Auth::user()), 'csrf_token' => $request->session()->token()]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Anda telah keluar.', 'csrf_token' => $request->session()->token()]);
    }

    public function me(): JsonResponse
    {
        abort_unless(Auth::user()->active, 403, 'Akun dinonaktifkan.');

        return response()->json(['user' => $this->userPayload(Auth::user())]);
    }

    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        abort_unless($user->active, 403, 'Akun dinonaktifkan.');
        $employee = DB::table('employees')->where('user_id', $user->id)->first();
        $employeeId = $employee?->id;
        abort_if($user->role === 'employee' && ! $employeeId, 403, 'Profil karyawan tidak ditemukan.');

        $query = static fn (string $table) => DB::table($table);
        $employees = $query('employees')->orderBy('name')->get();
        $plans = $query('training_plans')->orderBy('name')->get();
        $sessions = $query('training_sessions')->join('training_plans', 'training_plans.id', '=', 'training_sessions.training_plan_id')
            ->select('training_sessions.*', 'training_plans.category')
            ->selectRaw('COALESCE(training_sessions.name, training_plans.name) as training_name')
            ->orderBy('date')->orderBy('starts_at')->get();
        $enrollments = $query('enrollments')->join('employees', 'employees.id', '=', 'enrollments.employee_id')
            ->join('training_sessions', 'training_sessions.id', '=', 'enrollments.training_session_id')
            ->join('training_plans', 'training_plans.id', '=', 'training_sessions.training_plan_id')
            ->select('enrollments.id', 'enrollments.employee_id', 'enrollments.training_session_id', 'enrollments.registered_at', 'enrollments.source', 'enrollments.status', 'enrollments.progress', 'enrollments.pre_score', 'enrollments.post_score', 'employees.name as employee_name', 'employees.employee_code', 'training_sessions.training_plan_id', 'training_sessions.date', 'training_sessions.code as session_code')
            ->selectRaw('COALESCE(training_sessions.name, training_plans.name) as training_name')
            ->get();
        $materials = $query('training_materials')->join('training_plans', 'training_plans.id', '=', 'training_materials.training_plan_id')
            ->where('training_materials.published', true)
            ->select('training_materials.*', 'training_plans.name as training_name')->orderBy('position')->get();
        $kpis = $query('kpis')->join('employees', 'employees.id', '=', 'kpis.employee_id')
            ->select('kpis.*', 'employees.name as employee_name', 'employees.employee_code')->get();
        $targets = $query('training_targets')->join('employees', 'employees.id', '=', 'training_targets.employee_id')
            ->select('training_targets.*', 'employees.name as employee_name', 'employees.employee_code')->get();
        $tasks = $query('tasks')->join('employees', 'employees.id', '=', 'tasks.employee_id')
            ->select('tasks.*', 'employees.name as employee_name')->get();
        $assessments = $query('assessments')->join('employees', 'employees.id', '=', 'assessments.employee_id')
            ->select('assessments.id', 'assessments.employee_id', 'assessments.title', 'assessments.result', 'assessments.submitted_at', 'employees.name as employee_name', 'employees.employee_code')
            ->whereNotNull('assessments.submitted_at')->orderByDesc('assessments.submitted_at')->get();
        $competencies = $query('assessment_competencies')->get();
        $attendance = $query('attendances')->join('employees', 'employees.id', '=', 'attendances.employee_id')
            ->join('training_sessions', 'training_sessions.id', '=', 'attendances.training_session_id')
            ->join('training_plans', 'training_plans.id', '=', 'training_sessions.training_plan_id')
            ->select('attendances.*', 'employees.name as employee_name', 'training_plans.name as training_name', 'training_sessions.date')->get();
        $notifications = $query('notifications')->where('employee_id', $employeeId)->latest()->get();
        $performance = $query('performance_records')->join('employees', 'employees.id', '=', 'performance_records.employee_id')
            ->select('performance_records.*', 'employees.name as employee_name', 'employees.employee_code')->get();

        $participantCounts = $enrollments->countBy('training_session_id');
        foreach ($sessions as $session) {
            $session->participant_count = $participantCounts->get($session->id, 0);
            $session->question_bank = EvaluationQuestions::forTraining($session->training_name);
        }
        foreach ($plans as $plan) {
            $plan->competencies = json_decode($plan->competencies ?? '[]', true);
        }

        if ($user->role === 'manager') {
            $targets = $targets->filter(fn ($target) => $target->manager_id === null || (int) $target->manager_id === (int) $employeeId)->values();
            $materials = $materials->take(0);
            $assessments = $assessments->take(0);
            $competencies = $competencies->take(0);
        }

        if ($user->role === 'employee') {
            $visiblePlanIds = $enrollments->where('employee_id', $employeeId)->pluck('training_plan_id')->unique();
            $materials = $materials->whereIn('training_plan_id', $visiblePlanIds)->values();
            $enrollments = $enrollments->where('employee_id', $employeeId)->values();
            $targets = $targets->where('employee_id', $employeeId)->values();
            $tasks = $tasks->where('employee_id', $employeeId)->values();
            $kpis = $kpis->where('employee_id', $employeeId)->values();
            $assessments = $assessments->where('employee_id', $employeeId)->values();
            $competencies = $competencies->whereIn('assessment_id', $assessments->pluck('id'))->values();
            $attendance = $attendance->where('employee_id', $employeeId)->values();
            $employees = $employees->where('id', $employeeId)->values();
            $performance = $performance->where('employee_id', $employeeId)->values();
        }

        return response()->json([
            'user' => $this->userPayload($user),
            'employee' => $employee,
            'employees' => $employees,
            'plans' => $plans,
            'sessions' => $sessions,
            'enrollments' => $enrollments,
            'materials' => $materials,
            'kpis' => $kpis,
            'targets' => $targets,
            'tasks' => $tasks,
            'assessments' => $assessments,
            'competencies' => $competencies,
            'attendance' => $attendance,
            'notifications' => $notifications,
            'performance' => $performance,
            'evaluation_questions' => $user->role === 'employee' ? EvaluationQuestions::publicBanks() : [],
        ]);
    }

    public function action(Request $request): JsonResponse
    {
        $data = $request->validate([
            'action' => ['required', 'string', 'in:enroll,assign,unassign,attendance,assessment,test,material_complete,create_plan,plan_update,plan_delete,create_session,session_update,session_delete,employee_create,employee_update,employee_deactivate,kpi_save,target_create,notification_read,task_complete'],
            'id' => ['nullable', 'integer'],
            'session_id' => ['nullable', 'integer'],
            'employee_id' => ['nullable', 'integer'],
            'plan_id' => ['nullable', 'integer'],
            'name' => ['nullable', 'string', 'max:150'],
            'code' => ['nullable', 'string', 'max:10'],
            'position' => ['nullable', 'string', 'max:100'],
            'unit' => ['nullable', 'string', 'max:100'],
            'date' => ['nullable', 'date'],
            'starts_at' => ['nullable', 'date_format:H:i'],
            'ends_at' => ['nullable', 'date_format:H:i', 'after:starts_at'],
            'quota' => ['nullable', 'integer', 'min:1', 'max:10000'],
            'location' => ['nullable', 'string', 'max:200'],
            'category' => ['nullable', 'string', 'max:50'],
            'status' => ['nullable', 'string', 'max:30'],
            'source' => ['nullable', 'string', 'max:50'],
            'note' => ['nullable', 'string', 'max:255'],
            'answers' => ['nullable', 'array'],
            'test_type' => ['nullable', 'in:pre,post'],
            'submission_id' => ['nullable', 'uuid'],
            'values' => ['nullable', 'array'],
            'ids' => ['sometimes', 'array', 'min:1', 'max:100'],
            'ids.*' => ['integer', 'distinct'],
        ]);

        $user = Auth::user();
        abort_unless($user->active, 403, 'Akun dinonaktifkan.');
        $action = $data['action'];
        if (in_array($action, ['create_plan', 'plan_update', 'plan_delete', 'create_session', 'session_update', 'session_delete', 'employee_create', 'employee_update', 'employee_deactivate', 'assign', 'unassign'], true)) {
            abort_unless($user->role === 'hr', 403, 'Aksi ini hanya tersedia untuk HR/PSDM.');
        }
        if (in_array($action, ['kpi_save', 'target_create'], true)) {
            abort_unless($user->role === 'manager', 403, 'Aksi ini hanya tersedia untuk manajer.');
        }
        $employeeActions = ['enroll', 'attendance', 'assessment', 'test', 'material_complete', 'task_complete'];
        if (in_array($action, $employeeActions, true)) {
            abort_unless($user->role === 'employee', 403, 'Aksi ini hanya tersedia untuk karyawan.');
        }

        $employee = DB::table('employees')->where('user_id', $user->id)->first();
        $employeeId = $employee?->id;
        if (in_array($action, $employeeActions, true)) {
            abort_unless($employee?->status === 'Aktif', 403, 'Aksi ini memerlukan akun karyawan yang aktif.');
        }

        $result = DB::transaction(function () use ($action, $data, $employeeId, $request): array {
            if (in_array($action, ['create_plan', 'plan_update', 'plan_delete'], true)) {
                return $this->savePlan($request, $data);
            }

            if (in_array($action, ['create_session', 'session_update'], true)) {
                return $this->saveSession($request, $data);
            }

            if ($action === 'session_delete') {
                $session = DB::table('training_sessions')->where('id', $data['id'])->first();
                if (! $session || DB::table('enrollments')->where('training_session_id', $session->id)->exists() || DB::table('training_materials')->where('training_plan_id', $session->training_plan_id)->exists()) {
                    abort(422, 'Sesi tidak dapat dihapus karena memiliki peserta atau materi terkait.');
                }
                DB::table('training_sessions')->where('id', $session->id)->delete();

                return ['message' => 'Sesi pelatihan berhasil dihapus.'];
            }

            if ($action === 'employee_create') {
                $fields = validator($data, ['name' => ['required', 'string', 'max:100'], 'position' => ['required', 'string', 'max:100'], 'unit' => ['required', 'string', 'max:100']])->validate();
                $identity = $request->validate(['code' => ['nullable', 'unique:employees,employee_code'], 'status' => ['nullable', 'in:Aktif,Nonaktif']]);
                $id = DB::table('employees')->insertGetId($fields + [
                    'employee_code' => $identity['code'] ?? 'KRY-'.Str::upper(Str::random(6)),
                    'status' => $identity['status'] ?? 'Aktif',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                return ['message' => 'Data karyawan berhasil ditambahkan.', 'id' => $id];
            }

            if ($action === 'employee_update') {
                $fields = validator($data, ['id' => ['required', 'exists:employees,id'], 'name' => ['required', 'string', 'max:100'], 'position' => ['required', 'string', 'max:100'], 'unit' => ['required', 'string', 'max:100']])->validate();
                $status = $request->validate(['status' => ['sometimes', 'required', 'in:Aktif,Nonaktif']]);
                $record = DB::table('employees')->where('id', $fields['id'])->lockForUpdate()->first();
                DB::table('employees')->where('id', $record->id)->update([
                    'name' => $fields['name'], 'position' => $fields['position'], 'unit' => $fields['unit'], 'updated_at' => now(),
                ] + $status);
                if ($record->user_id && isset($status['status'])) {
                    DB::table('users')->where('id', $record->user_id)->update(['active' => $status['status'] === 'Aktif']);
                }

                return ['message' => 'Perubahan data karyawan tersimpan.'];
            }

            if ($action === 'employee_deactivate') {
                $record = DB::table('employees')->where('id', $data['id'] ?? null)->lockForUpdate()->first();
                abort_unless($record, 404, 'Data karyawan tidak ditemukan.');
                $employeeAccountId = $record->user_id;
                DB::table('employees')->where('id', $record->id)->update(['status' => 'Nonaktif', 'updated_at' => now()]);
                if ($employeeAccountId) {
                    DB::table('users')->where('id', $employeeAccountId)->update(['active' => false]);
                }

                return ['message' => 'Karyawan dinonaktifkan.'];
            }

            if (in_array($action, ['enroll', 'assign'], true)) {
                return $this->enrollParticipants($data, $employeeId);
            }

            if ($action === 'unassign') {
                $ids = $data['ids'] ?? [$data['id'] ?? null];
                $enrollments = DB::table('enrollments')->whereIn('id', $ids)->get();
                abort_unless($enrollments->count() === count($ids), 404, 'Peserta tidak ditemukan.');
                $sessionIds = $enrollments->pluck('training_session_id')->unique();
                abort_unless($sessionIds->count() === 1, 422, 'Pilih peserta dari sesi yang sama.');
                $session = DB::table('training_sessions')->where('id', $sessionIds->first())->lockForUpdate()->first();
                abort_unless($session && $session->status === 'Terjadwal' && $this->sessionStartsAt($session)->isFuture(), 422, 'Peserta hanya dapat dikeluarkan sebelum sesi berlangsung.');
                DB::table('enrollments')->whereIn('id', $ids)->delete();

                return ['message' => 'Peserta berhasil dikeluarkan dari sesi.'];
            }

            if ($action === 'attendance') {
                $fields = validator($data, ['session_id' => ['required', 'exists:training_sessions,id'], 'status' => ['required', 'in:Hadir,Izin'], 'note' => ['nullable', 'string', 'max:255']])->validate();
                $isParticipant = DB::table('enrollments')->where('employee_id', $employeeId)->where('training_session_id', $fields['session_id'])->exists();
                $session = DB::table('training_sessions')->where('id', $fields['session_id'])->first();
                if (! $isParticipant) {
                    abort(403, 'Presensi hanya tersedia untuk peserta sesi.');
                }
                $identity = ['employee_id' => $employeeId, 'training_session_id' => $fields['session_id']];
                if (DB::table('attendances')->where($identity)->exists()) {
                    return ['message' => 'Presensi Anda sudah tercatat.'];
                }
                if (! $session || ! $session->attendance_open || ! in_array($session->status, ['Terjadwal', 'Berlangsung'], true)
                    || $this->sessionStartsAt($session)->isFuture()
                    || now('Asia/Jakarta')->gt(Carbon::parse($session->date.' '.$session->ends_at, 'Asia/Jakarta'))) {
                    abort(422, 'Presensi tidak tersedia untuk akun atau sesi ini.');
                }
                DB::table('attendances')->insertOrIgnore($identity + ['status' => $fields['status'], 'note' => $fields['note'] ?? null, 'recorded_at' => now()]);

                return ['message' => 'Presensi berhasil dicatat.'];
            }

            if ($action === 'assessment') {
                $fields = validator($data, ['answers' => ['required', 'array', 'min:1']])->validate();
                if (array_is_list($fields['answers'])) {
                    return $this->saveAssessment($employeeId, $fields['answers'], $data['submission_id'] ?? null);
                }
                validator($fields, ['answers.*' => ['required', 'in:Pemula,Menengah,Mahir,Ahli']])->validate();
                $id = DB::table('assessments')->insertGetId(['employee_id' => $employeeId, 'title' => 'Skill Assessment', 'result' => 'Jawaban tersimpan dan menunggu tinjauan HR/PSDM.', 'responses' => json_encode($fields['answers']), 'submitted_at' => now()]);
                $levels = ['Pemula' => 35, 'Menengah' => 60, 'Mahir' => 80, 'Ahli' => 95];
                foreach ($fields['answers'] as $competency => $level) {
                    $score = $levels[$level] ?? 0;
                    DB::table('assessment_competencies')->insert(['assessment_id' => $id, 'competency' => $competency, 'score' => $score, 'achievement' => $score >= 80 ? 'Memenuhi sebagian besar indikator' : 'Masih ada ruang untuk berkembang', 'level' => $level]);
                }

                return ['message' => 'Skill assessment berhasil dikirim.', 'id' => $id];
            }

            if ($action === 'test') {
                $fields = validator($data, ['session_id' => ['required', 'exists:training_sessions,id'], 'test_type' => ['required', 'in:pre,post'], 'answers' => ['required', 'array', 'min:1']])->validate();
                $enrollment = DB::table('enrollments')->where('employee_id', $employeeId)->where('training_session_id', $fields['session_id'])->lockForUpdate()->first();
                if (! $enrollment) {
                    abort(403, 'Tes hanya tersedia untuk peserta terdaftar.');
                }
                if ($fields['test_type'] === 'post' && ($enrollment->pre_score === null || $enrollment->progress < 75)) {
                    abort(422, 'Selesaikan materi pelatihan terlebih dahulu sebelum mengerjakan post-test.');
                }
                $scoreColumn = $fields['test_type'].'_score';
                $answersColumn = $fields['test_type'].'_answers';
                if ($enrollment->{$scoreColumn} !== null) {
                    return ['message' => 'Tes ini sudah tersimpan.', 'score' => (int) $enrollment->{$scoreColumn}];
                }
                $answers = $fields['answers'];
                $trainingName = DB::table('training_sessions as s')->join('training_plans as p', 'p.id', '=', 's.training_plan_id')
                    ->where('s.id', $fields['session_id'])->selectRaw('COALESCE(s.name, p.name) as training_name')->first()->training_name;
                $result = EvaluationQuestions::grade(EvaluationQuestions::forTraining($trainingName), $answers);
                $score = $result['score'];
                $update = $fields['test_type'] === 'pre'
                    ? ['pre_score' => $score, 'progress' => max(50, $enrollment->progress)]
                    : ['post_score' => $score, 'progress' => 100, 'status' => $score >= 70 ? 'Selesai' : 'Belum lulus'];
                DB::table('enrollments')->where('id', $enrollment->id)->update($update + [$answersColumn => json_encode($answers, JSON_THROW_ON_ERROR)]);

                return ['message' => 'Jawaban tes tersimpan. Nilai: '.$score.'%.'] + $result;
            }

            if ($action === 'material_complete') {
                $fields = validator($data, ['session_id' => ['required', 'exists:training_sessions,id']])->validate();
                $enrollment = DB::table('enrollments')->where('employee_id', $employeeId)->where('training_session_id', $fields['session_id'])->first();
                if (! $enrollment) {
                    abort(403, 'Materi hanya tersedia untuk peserta terdaftar.');
                }
                DB::table('enrollments')->where('id', $enrollment->id)->update(['progress' => min(100, $enrollment->progress + 25)]);

                return ['message' => 'Progres belajar berhasil diperbarui.'];
            }

            if ($action === 'kpi_save') {
                $fields = validator($data, ['values' => ['required', 'array', 'min:1'], 'values.*' => ['required', 'numeric', 'min:0', 'max:100']])->validate();
                $indicators = DB::table('kpis')->whereIn('id', array_keys($fields['values']))->lockForUpdate()->get();
                abort_unless($indicators->count() === count($fields['values']), 404, 'Indikator KPI tidak ditemukan.');
                if (isset($data['employee_id'])) {
                    $expected = DB::table('kpis')->where('employee_id', $data['employee_id'])->count();
                    abort_unless(
                        $indicators->every(fn ($item) => (int) $item->employee_id === (int) $data['employee_id']) && $expected === $indicators->count(),
                        422, 'Lengkapi semua indikator KPI untuk staf yang dipilih.'
                    );
                }
                foreach ($indicators as $indicator) {
                    $value = (float) $fields['values'][$indicator->id];
                    DB::table('kpis')->where('id', $indicator->id)->update([
                        'achievement' => $value,
                        'status' => $value >= (float) $indicator->target ? 'Tercapai' : 'Belum tercapai',
                    ]);
                }

                return ['message' => 'Penilaian KPI berhasil disimpan.'];
            }

            if ($action === 'target_create') {
                $fields = validator($data, ['employee_id' => ['required', 'exists:employees,id'], 'name' => ['required', 'string', 'max:150']])->validate();
                DB::table('training_targets')->insert($fields + ['manager_id' => $employeeId, 'due_date' => $data['date'] ?? null, 'status' => 'Berlangsung', 'progress' => 0]);

                return ['message' => 'Target pelatihan berhasil ditetapkan.'];
            }

            if ($action === 'notification_read') {
                $notification = DB::table('notifications')->where('id', $data['id'] ?? null)->where('employee_id', $employeeId);
                abort_unless($notification->exists(), 404, 'Notifikasi tidak ditemukan.');
                $notification->update(['read' => true]);

                return ['message' => 'Notifikasi ditandai telah dibaca.'];
            }

            if ($action === 'task_complete') {
                $task = DB::table('tasks')->where('id', $data['id'] ?? null)->where('employee_id', $employeeId);
                abort_unless($task->exists(), 404, 'Tugas tidak ditemukan.');
                $task->update(['status' => 'Selesai']);

                return ['message' => 'Tugas ditandai selesai.'];
            }

            return ['message' => 'Perubahan tersimpan.'];
        });

        return response()->json($result);
    }

    private function savePlan(Request $request, array $data): array
    {
        $plans = DB::table('training_plans');
        $plan = null;
        if ($data['action'] !== 'create_plan') {
            $plan = (clone $plans)->where('id', $data['id'] ?? null)->lockForUpdate()->first();
            abort_unless($plan, 404, 'Rencana pelatihan tidak ditemukan.');
        }

        if ($data['action'] === 'plan_delete') {
            abort_if(
                in_array($plan->status, ['Dijadwalkan', 'Selesai'], true)
                || DB::table('training_sessions')->where('training_plan_id', $plan->id)->exists()
                || DB::table('training_materials')->where('training_plan_id', $plan->id)->exists(),
                422, 'Rencana yang sudah dijadwalkan, selesai, atau memiliki sesi atau materi terkait tidak dapat dihapus.'
            );
            $plans->where('id', $plan->id)->delete();

            return ['message' => 'Rencana pelatihan berhasil dihapus.'];
        }

        $fields = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'quota' => ['required', 'integer', 'min:1', 'max:10000'],
            'category' => ['required', 'string', 'max:50'],
            'provider' => ['nullable', 'string', 'max:100'],
            'department' => ['nullable', 'string', 'max:100'],
            'target_start' => ['nullable', 'date_format:Y-m-d', 'required_with:target_end'],
            'target_end' => ['nullable', 'date_format:Y-m-d', 'required_with:target_start', 'after_or_equal:target_start'],
            'competencies' => ['sometimes', 'array', 'max:20'],
            'competencies.*' => ['required', 'string', 'max:100', 'distinct'],
            'status' => ['sometimes', 'required', 'in:Draft,Draf,Menunggu Pengelolaan,Disetujui,Dijadwalkan,Selesai'],
            'description' => ['nullable', 'string', 'max:2000'],
        ]);
        $identity = $plan ? [] : $request->validate(['code' => ['nullable', 'unique:training_plans,code']]);
        if (isset($fields['competencies'])) {
            $fields['competencies'] = json_encode(array_values($fields['competencies']), JSON_THROW_ON_ERROR);
        }
        $fields += [
            'schedule' => $fields['target_start'] ?? $data['date'] ?? $plan?->schedule ?? now()->format('F Y'),
            'description' => $data['note'] ?? $plan?->description,
            'updated_at' => now(),
        ];
        if ($plan && in_array($plan->status, ['Dijadwalkan', 'Selesai'], true)) {
            abort_if(isset($fields['status']) && ! in_array($fields['status'], ['Dijadwalkan', 'Selesai'], true), 422, 'Rencana yang sudah dijadwalkan tidak dapat dikembalikan ke draf.');
        }

        if ($plan) {
            $plans->where('id', $plan->id)->update($fields);

            return ['message' => 'Perubahan rencana pelatihan berhasil disimpan.', 'id' => $plan->id];
        }

        $id = $plans->insertGetId($fields + ['code' => $identity['code'] ?? 'PLT-'.Str::upper(Str::random(6)), 'created_at' => now()]);

        return ['message' => 'Rencana pelatihan berhasil disimpan.', 'id' => $id];
    }

    private function saveSession(Request $request, array $data): array
    {
        $fields = $request->validate([
            'plan_id' => ['required_if:action,create_session', 'sometimes', 'exists:training_plans,id'],
            'name' => ['nullable', 'string', 'max:150'],
            'type' => ['sometimes', 'required', 'in:Umum,Wajib'],
            'date' => ['required', 'date_format:Y-m-d'],
            'starts_at' => ['required', 'date_format:H:i'],
            'ends_at' => ['required', 'date_format:H:i', 'after:starts_at'],
            'quota' => ['required', 'integer', 'min:1', 'max:10000'],
            'location' => ['nullable', 'string', 'max:200'],
            'status' => ['sometimes', 'required', 'in:Draft,Terjadwal,Berlangsung,Selesai,Dibatalkan,Tidak Aktif'],
        ]);
        $sessions = DB::table('training_sessions');
        $planId = $fields['plan_id'] ?? null;
        unset($fields['plan_id']);
        $fields['updated_at'] = now();

        if ($data['action'] === 'session_update') {
            $session = (clone $sessions)->where('id', $data['id'] ?? null)->lockForUpdate()->first();
            abort_unless($session, 404, 'Sesi pelatihan tidak ditemukan.');
            $registered = DB::table('enrollments')->where('training_session_id', $session->id)->count();
            abort_if($fields['quota'] < $registered, 422, 'Kuota tidak boleh lebih kecil dari jumlah peserta terdaftar.');
            $sessions->where('id', $session->id)->update($fields);

            return ['message' => 'Perubahan sesi berhasil disimpan.'];
        }

        abort_unless($planId, 422, 'Pilih rencana pelatihan.');
        $id = $sessions->insertGetId($fields + [
            'training_plan_id' => $planId,
            'code' => 'JDW-'.Str::upper(Str::random(6)),
            'created_at' => now(),
        ]);

        return ['message' => 'Sesi pelatihan berhasil dibuat.', 'id' => $id];
    }

    private function enrollParticipants(array $data, ?int $employeeId): array
    {
        $selfRegistration = $data['action'] === 'enroll';
        $ids = $selfRegistration ? [$employeeId] : ($data['ids'] ?? [$data['employee_id'] ?? null]);
        $session = DB::table('training_sessions')->where('id', $data['session_id'] ?? null)->lockForUpdate()->first();
        abort_unless($session, 404, 'Sesi pelatihan tidak ditemukan.');
        abort_unless($session->status === 'Terjadwal' && $this->sessionStartsAt($session)->isFuture(), 422, 'Pendaftaran untuk sesi ini sudah ditutup.');
        abort_if($selfRegistration && $session->type === 'Wajib', 422, 'Pelatihan wajib memerlukan penugasan HR/PSDM.');
        $active = DB::table('employees')->whereIn('id', $ids)->where('status', 'Aktif')->count();
        abort_unless($active === count($ids), 422, 'Pilih karyawan yang masih aktif.');

        $enrollments = DB::table('enrollments')->where('training_session_id', $session->id);
        if ((clone $enrollments)->whereIn('employee_id', $ids)->exists()) {
            if ($selfRegistration) {
                return ['message' => 'Anda sudah terdaftar pada sesi ini.'];
            }
            abort(422, 'Salah satu karyawan sudah terdaftar pada sesi ini.');
        }
        abort_if($enrollments->count() + count($ids) > $session->quota, 422, 'Kuota sesi tidak mencukupi.');

        $now = now();
        DB::table('enrollments')->insert(array_map(fn ($id) => [
            'employee_id' => $id, 'training_session_id' => $session->id,
            'registered_at' => $now, 'source' => $selfRegistration ? 'Mandiri' : 'Wajib',
            'status' => 'Terdaftar', 'progress' => 0,
        ], $ids));
        if (! $selfRegistration) {
            DB::table('notifications')->insert(array_map(fn ($id) => [
                'employee_id' => $id, 'title' => 'Penugasan pelatihan',
                'body' => 'Anda ditugaskan pada sesi '.$session->code.' tanggal '.$session->date.'.',
                'created_at' => $now, 'updated_at' => $now,
            ], $ids));
        }

        return ['message' => 'Peserta berhasil didaftarkan.'];
    }

    private function sessionStartsAt(object $session): Carbon
    {
        return Carbon::parse($session->date.' '.$session->starts_at, 'Asia/Jakarta');
    }

    private function saveAssessment(int $employeeId, array $answers, ?string $submissionId): array
    {
        DB::table('employees')->where('id', $employeeId)->lockForUpdate()->first();
        $existing = $submissionId === null ? null : DB::table('assessments')->where('submission_id', $submissionId)->first();
        if ($existing) {
            abort_unless((int) $existing->employee_id === $employeeId, 409, 'Identitas pengiriman telah digunakan.');
            $answers = json_decode($existing->responses, true, flags: JSON_THROW_ON_ERROR);
        }
        $result = EvaluationQuestions::grade('assessment', $answers);
        $level = match (true) {
            $result['score'] >= 90 => 'Ahli',
            $result['score'] >= 75 => 'Mahir',
            $result['score'] >= 60 => 'Menengah',
            default => 'Pemula',
        };
        if ($existing) {
            return ['message' => 'Skill assessment sudah tersimpan.', 'id' => $existing->id, 'level' => $level] + $result;
        }
        $id = DB::table('assessments')->insertGetId([
            'employee_id' => $employeeId,
            'submission_id' => $submissionId,
            'title' => 'Assessment Kompetensi Berkala',
            'result' => 'Skor '.$result['score'].'% · '.$level.' · '.$result['correct'].' jawaban benar',
            'responses' => json_encode($answers, JSON_THROW_ON_ERROR),
            'submitted_at' => now(),
        ]);
        DB::table('assessment_competencies')->insert([
            'assessment_id' => $id,
            'competency' => 'Kompetensi operasional',
            'score' => $result['score'],
            'achievement' => $result['correct'].' dari '.count($answers).' jawaban benar',
            'level' => $level,
        ]);

        return ['message' => 'Skill assessment berhasil dikirim.', 'id' => $id, 'level' => $level] + $result;
    }

    private function userPayload(User $user): array
    {
        $employee = DB::table('employees')->where('user_id', $user->id)->first();

        return [
            'id' => $user->id,
            'name' => $employee?->name ?? $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'employee_code' => $employee?->employee_code,
            'position' => $employee?->position,
            'unit' => $employee?->unit,
        ];
    }
}
