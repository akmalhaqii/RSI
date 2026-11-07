<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
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

            return response()->json(['message' => 'Akun dinonaktifkan. Hubungi HR/PSDM.'], 403);
        }

        $request->session()->regenerate();

        return response()->json(['user' => $this->userPayload(Auth::user())]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Anda telah keluar.']);
    }

    public function me(): JsonResponse
    {
        return response()->json(['user' => $this->userPayload(Auth::user())]);
    }

    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        $employee = DB::table('employees')->where('user_id', $user->id)->first();
        $employeeId = $employee?->id;

        $query = static fn (string $table) => DB::table($table);
        $employees = $query('employees')->orderBy('name')->get();
        $plans = $query('training_plans')->orderBy('name')->get();
        $sessions = $query('training_sessions')->join('training_plans', 'training_plans.id', '=', 'training_sessions.training_plan_id')
            ->select('training_sessions.*', 'training_plans.name as training_name', 'training_plans.category')
            ->orderBy('date')->get();
        $enrollments = $query('enrollments')->join('employees', 'employees.id', '=', 'enrollments.employee_id')
            ->join('training_sessions', 'training_sessions.id', '=', 'enrollments.training_session_id')
            ->join('training_plans', 'training_plans.id', '=', 'training_sessions.training_plan_id')
            ->select('enrollments.*', 'employees.name as employee_name', 'employees.employee_code', 'training_plans.name as training_name', 'training_sessions.training_plan_id', 'training_sessions.date', 'training_sessions.code as session_code')
            ->get();
        $materials = $query('training_materials')->join('training_plans', 'training_plans.id', '=', 'training_materials.training_plan_id')
            ->select('training_materials.*', 'training_plans.name as training_name')->orderBy('position')->get();
        $kpis = $query('kpis')->join('employees', 'employees.id', '=', 'kpis.employee_id')
            ->select('kpis.*', 'employees.name as employee_name', 'employees.employee_code')->get();
        $targets = $query('training_targets')->join('employees', 'employees.id', '=', 'training_targets.employee_id')
            ->select('training_targets.*', 'employees.name as employee_name', 'employees.employee_code')->get();
        $tasks = $query('tasks')->join('employees', 'employees.id', '=', 'tasks.employee_id')
            ->select('tasks.*', 'employees.name as employee_name')->get();
        $assessments = $query('assessments')->join('employees', 'employees.id', '=', 'assessments.employee_id')
            ->select('assessments.*', 'employees.name as employee_name', 'employees.employee_code')->get();
        $competencies = $query('assessment_competencies')->get();
        $attendance = $query('attendances')->join('employees', 'employees.id', '=', 'attendances.employee_id')
            ->join('training_sessions', 'training_sessions.id', '=', 'attendances.training_session_id')
            ->join('training_plans', 'training_plans.id', '=', 'training_sessions.training_plan_id')
            ->select('attendances.*', 'employees.name as employee_name', 'training_plans.name as training_name', 'training_sessions.date')->get();
        $notifications = $query('notifications')->where('employee_id', $employeeId)->latest()->get();
        $performance = $query('performance_records')->join('employees', 'employees.id', '=', 'performance_records.employee_id')
            ->select('performance_records.*', 'employees.name as employee_name', 'employees.employee_code')->get();

        if ($user->role === 'employee' && $employeeId) {
            $visiblePlanIds = $enrollments->where('employee_id', $employeeId)->pluck('training_plan_id')->unique();
            $materials = $materials->whereIn('training_plan_id', $visiblePlanIds)->values();
            $enrollments = $enrollments->where('employee_id', $employeeId)->values();
            $targets = $targets->where('employee_id', $employeeId)->values();
            $tasks = $tasks->where('employee_id', $employeeId)->values();
            $kpis = $kpis->where('employee_id', $employeeId)->values();
            $assessments = $assessments->where('employee_id', $employeeId)->values();
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
        ]);
    }

    public function action(Request $request): JsonResponse
    {
        $data = $request->validate([
            'action' => ['required', 'string', 'in:enroll,assign,unassign,attendance,assessment,test,material_complete,create_plan,create_session,session_update,session_delete,employee_create,employee_update,employee_deactivate,kpi_save,target_create,notification_read,task_complete'],
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
            'values' => ['nullable', 'array'],
        ]);

        $user = Auth::user();
        $employee = DB::table('employees')->where('user_id', $user->id)->first();
        $action = $data['action'];
        $employeeId = $data['employee_id'] ?? $employee?->id;

        $result = DB::transaction(function () use ($action, $data, $employeeId, $user): array {
            if (in_array($action, ['create_plan', 'create_session', 'session_update', 'session_delete', 'employee_create', 'employee_update', 'employee_deactivate', 'assign', 'unassign', 'kpi_save', 'target_create'], true) && ! in_array($user->role, ['hr', 'manager'], true)) {
                abort(403, 'Aksi ini hanya tersedia untuk HR/PSDM atau manajer.');
            }
            if (in_array($action, ['enroll', 'attendance', 'assessment', 'test', 'material_complete', 'notification_read', 'task_complete'], true) && ($user->role !== 'employee' || ! $employeeId)) {
                abort(403, 'Aksi ini memerlukan akun karyawan yang aktif.');
            }

            if ($action === 'create_plan') {
                $fields = validator($data, ['name' => ['required', 'string', 'max:150'], 'quota' => ['required', 'integer', 'min:1'], 'category' => ['required', 'string', 'max:50']])->validate();
                $id = DB::table('training_plans')->insertGetId(['code' => 'PLT-'.str_pad((string) (DB::table('training_plans')->count() + 1), 3, '0', STR_PAD_LEFT), 'name' => $fields['name'], 'schedule' => $data['date'] ?? now()->format('F Y'), 'quota' => $fields['quota'], 'category' => $fields['category'], 'description' => $data['note'] ?? null, 'created_at' => now(), 'updated_at' => now()]);

                return ['message' => 'Rencana pelatihan berhasil disimpan.', 'id' => $id];
            }

            if ($action === 'create_session') {
                $fields = validator($data, ['plan_id' => ['required', 'exists:training_plans,id'], 'date' => ['required', 'date'], 'starts_at' => ['required', 'date_format:H:i'], 'ends_at' => ['required', 'date_format:H:i', 'after:starts_at'], 'quota' => ['required', 'integer', 'min:1'], 'location' => ['nullable', 'string', 'max:200']])->validate();
                $id = DB::table('training_sessions')->insertGetId(['training_plan_id' => $fields['plan_id'], 'code' => 'JDW-'.str_pad((string) (DB::table('training_sessions')->count() + 1), 3, '0', STR_PAD_LEFT), 'date' => $fields['date'], 'starts_at' => $fields['starts_at'], 'ends_at' => $fields['ends_at'], 'location' => $fields['location'] ?? 'Online', 'quota' => $fields['quota'], 'status' => 'Terjadwal', 'attendance_open' => true, 'created_at' => now(), 'updated_at' => now()]);

                return ['message' => 'Sesi pelatihan berhasil dibuat.', 'id' => $id];
            }

            if ($action === 'session_update') {
                $fields = validator($data, ['id' => ['required', 'exists:training_sessions,id'], 'date' => ['required', 'date'], 'starts_at' => ['required', 'date_format:H:i'], 'ends_at' => ['required', 'date_format:H:i', 'after:starts_at'], 'quota' => ['required', 'integer', 'min:1'], 'location' => ['required', 'string', 'max:200'], 'status' => ['required', 'in:Terjadwal,Berlangsung,Selesai,Dibatalkan']])->validate();
                $registered = DB::table('enrollments')->where('training_session_id', $fields['id'])->count();
                if ($fields['quota'] < $registered) {
                    abort(422, 'Kuota tidak boleh lebih kecil dari jumlah peserta terdaftar.');
                }
                DB::table('training_sessions')->where('id', $fields['id'])->update(['date' => $fields['date'], 'starts_at' => $fields['starts_at'], 'ends_at' => $fields['ends_at'], 'quota' => $fields['quota'], 'location' => $fields['location'], 'status' => $fields['status'], 'updated_at' => now()]);

                return ['message' => 'Perubahan sesi berhasil disimpan.'];
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
                $id = DB::table('employees')->insertGetId(['employee_code' => 'KRY-'.str_pad((string) (DB::table('employees')->count() + 1), 3, '0', STR_PAD_LEFT), 'name' => $fields['name'], 'position' => $fields['position'], 'unit' => $fields['unit'], 'status' => 'Aktif', 'created_at' => now(), 'updated_at' => now()]);

                return ['message' => 'Data karyawan berhasil ditambahkan.', 'id' => $id];
            }

            if ($action === 'employee_update') {
                $fields = validator($data, ['id' => ['required', 'exists:employees,id'], 'name' => ['required', 'string', 'max:100'], 'position' => ['required', 'string', 'max:100'], 'unit' => ['required', 'string', 'max:100']])->validate();
                DB::table('employees')->where('id', $fields['id'])->update(['name' => $fields['name'], 'position' => $fields['position'], 'unit' => $fields['unit'], 'updated_at' => now()]);

                return ['message' => 'Perubahan data karyawan tersimpan.'];
            }

            if ($action === 'employee_deactivate') {
                $employeeAccountId = DB::table('employees')->where('id', $data['id'])->value('user_id');
                DB::table('employees')->where('id', $data['id'])->update(['status' => 'Nonaktif']);
                if ($employeeAccountId) {
                    DB::table('users')->where('id', $employeeAccountId)->update(['active' => false]);
                }

                return ['message' => 'Karyawan dinonaktifkan.'];
            }

            if (in_array($action, ['enroll', 'assign'], true)) {
                $fields = validator([...$data, 'employee_id' => $data['employee_id'] ?? $employeeId], ['session_id' => ['required', 'exists:training_sessions,id'], 'employee_id' => ['required', 'exists:employees,id']])->validate();
                $session = DB::table('training_sessions')->where('id', $fields['session_id'])->lockForUpdate()->first();
                if ($session->date < now()->toDateString() || in_array($session->status, ['Selesai', 'Dibatalkan'], true)) {
                    abort(422, 'Pendaftaran untuk sesi ini sudah ditutup.');
                }
                $current = DB::table('enrollments')->where('training_session_id', $session->id)->count();
                if ($current >= $session->quota) {
                    abort(422, 'Kuota sesi sudah penuh.');
                }
                if (DB::table('enrollments')->where('training_session_id', $session->id)->where('employee_id', $fields['employee_id'])->exists()) {
                    abort(422, 'Karyawan sudah terdaftar pada sesi ini.');
                }
                DB::table('enrollments')->insert(['employee_id' => $fields['employee_id'], 'training_session_id' => $session->id, 'registered_at' => now(), 'source' => $action === 'assign' ? 'Wajib' : 'Mandiri', 'status' => 'Terdaftar', 'progress' => 0]);

                return ['message' => 'Peserta berhasil didaftarkan.'];
            }

            if ($action === 'unassign') {
                $enrollment = DB::table('enrollments')->where('id', $data['id'])->first();
                if (! $enrollment || DB::table('training_sessions')->where('id', $enrollment->training_session_id)->where(function ($query): void {
                    $query->whereDate('date', '<=', now()->toDateString())->orWhere('status', 'Berlangsung');
                })->exists()) {
                    abort(422, 'Peserta hanya dapat dikeluarkan sebelum sesi berlangsung.');
                }
                DB::table('enrollments')->where('id', $data['id'])->delete();

                return ['message' => 'Peserta berhasil dikeluarkan dari sesi.'];
            }

            if ($action === 'attendance') {
                $fields = validator($data, ['session_id' => ['required', 'exists:training_sessions,id'], 'status' => ['required', 'in:Hadir,Izin'], 'note' => ['nullable', 'string', 'max:255']])->validate();
                $isParticipant = DB::table('enrollments')->where('employee_id', $employeeId)->where('training_session_id', $fields['session_id'])->exists();
                $session = DB::table('training_sessions')->where('id', $fields['session_id'])->first();
                if (! $isParticipant || ! $session->attendance_open) {
                    abort(422, 'Presensi tidak tersedia untuk akun atau sesi ini.');
                }
                DB::table('attendances')->updateOrInsert(['employee_id' => $employeeId, 'training_session_id' => $fields['session_id']], ['status' => $fields['status'], 'note' => $fields['note'] ?? null, 'recorded_at' => now()]);

                return ['message' => 'Presensi berhasil dicatat.'];
            }

            if ($action === 'assessment') {
                $fields = validator($data, ['answers' => ['required', 'array', 'min:1']])->validate();
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
                $enrollment = DB::table('enrollments')->where('employee_id', $employeeId)->where('training_session_id', $fields['session_id'])->first();
                if (! $enrollment) {
                    abort(403, 'Tes hanya tersedia untuk peserta terdaftar.');
                }
                if ($fields['test_type'] === 'post' && $enrollment->progress < 75) {
                    abort(422, 'Selesaikan materi pelatihan terlebih dahulu sebelum mengerjakan post-test.');
                }
                if ($fields['test_type'] === 'pre' && $enrollment->pre_score !== null) {
                    abort(422, 'Pre-test untuk pelatihan ini sudah tersimpan.');
                }
                $answers = array_map('intval', array_values($fields['answers']));
                $score = (int) round(array_sum($answers) / (count($answers) * 3) * 100);
                $update = $fields['test_type'] === 'pre'
                    ? ['pre_score' => $score, 'progress' => max(50, $enrollment->progress)]
                    : ['post_score' => $score, 'progress' => 100, 'status' => $score >= 60 ? 'Selesai' : 'Belum lulus'];
                DB::table('enrollments')->where('id', $enrollment->id)->update($update);

                return ['message' => 'Jawaban tes tersimpan. Nilai: '.$score.'%.'];
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
                foreach ($fields['values'] as $id => $value) {
                    DB::table('kpis')->where('id', $id)->update(['achievement' => (float) $value, 'status' => (float) $value >= (float) DB::table('kpis')->where('id', $id)->value('target') ? 'Tercapai' : 'Belum tercapai']);
                }

                return ['message' => 'Penilaian KPI berhasil disimpan.'];
            }

            if ($action === 'target_create') {
                $fields = validator($data, ['employee_id' => ['required', 'exists:employees,id'], 'name' => ['required', 'string', 'max:150']])->validate();
                DB::table('training_targets')->insert(['employee_id' => $fields['employee_id'], 'name' => $fields['name'], 'status' => 'Berlangsung', 'progress' => 0]);

                return ['message' => 'Target pelatihan berhasil ditetapkan.'];
            }

            if ($action === 'notification_read') {
                DB::table('notifications')->where('id', $data['id'])->where('employee_id', $employeeId)->update(['read' => true]);

                return ['message' => 'Notifikasi ditandai telah dibaca.'];
            }

            if ($action === 'task_complete') {
                DB::table('tasks')->where('id', $data['id'])->where('employee_id', $employeeId)->update(['status' => 'Selesai']);

                return ['message' => 'Tugas ditandai selesai.'];
            }

            return ['message' => 'Perubahan tersimpan.'];
        });

        return response()->json($result);
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
