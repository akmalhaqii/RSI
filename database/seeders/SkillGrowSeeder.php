<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class SkillGrowSeeder extends Seeder
{
    public function run(): void
    {
        $profiles = [
            ['name' => 'Muhammad Akmal B.', 'email' => 'akmal@skillgrow.id', 'role' => 'employee', 'code' => 'KRY-001', 'position' => 'Data Analyst', 'unit' => 'Information Technology'],
            ['name' => 'Nasywa Putri', 'email' => 'manager@skillgrow.id', 'role' => 'manager', 'code' => 'KRY-002', 'position' => 'Learning Manager', 'unit' => 'People Development'],
            ['name' => 'Alya Pratama', 'email' => 'hr@skillgrow.id', 'role' => 'hr', 'code' => 'KRY-003', 'position' => 'HR Development', 'unit' => 'Human Resources'],
            ['name' => 'Dimas Saputra', 'email' => 'dimas@skillgrow.id', 'role' => 'employee', 'code' => 'KRY-004', 'position' => 'Product Designer', 'unit' => 'Product'],
        ];

        foreach ($profiles as $profile) {
            DB::table('users')->updateOrInsert(['email' => $profile['email']], [
                'name' => $profile['name'],
                'password' => Hash::make('password'),
                'role' => $profile['role'],
                'active' => true,
                'updated_at' => now(),
                'created_at' => now(),
            ]);
            $userId = DB::table('users')->where('email', $profile['email'])->value('id');
            DB::table('employees')->updateOrInsert(['employee_code' => $profile['code']], [
                'user_id' => $userId,
                'name' => $profile['name'],
                'position' => $profile['position'],
                'unit' => $profile['unit'],
                'status' => 'Aktif',
                'updated_at' => now(),
                'created_at' => now(),
            ]);
        }

        $plans = [
            ['code' => 'PLT-001', 'name' => 'Data Analytics Fundamentals', 'schedule' => 'November 2026', 'quota' => 30, 'category' => 'Teknis', 'description' => 'Bangun fondasi analisis data, eksplorasi, dan visualisasi untuk kebutuhan bisnis.'],
            ['code' => 'PLT-002', 'name' => 'Product Design Essentials', 'schedule' => 'November 2026', 'quota' => 24, 'category' => 'Desain', 'description' => 'Latihan riset pengguna, alur produk, dan prototyping kolaboratif.'],
            ['code' => 'PLT-003', 'name' => 'Komunikasi Efektif di Tempat Kerja', 'schedule' => 'Desember 2026', 'quota' => 35, 'category' => 'Soft skill', 'description' => 'Tingkatkan komunikasi, kolaborasi, dan umpan balik dalam tim.'],
        ];
        foreach ($plans as $plan) {
            DB::table('training_plans')->updateOrInsert(['code' => $plan['code']], $plan + ['created_at' => now(), 'updated_at' => now()]);
        }

        foreach ([
            ['code' => 'JDW-001', 'plan' => 'PLT-001', 'days' => 5, 'start' => '09:00', 'end' => '12:00', 'location' => 'Ruang Meeting A', 'status' => 'Terjadwal', 'open' => true],
            ['code' => 'JDW-002', 'plan' => 'PLT-002', 'days' => 12, 'start' => '13:00', 'end' => '16:00', 'location' => 'Online · Google Meet', 'status' => 'Terjadwal', 'open' => true],
            ['code' => 'JDW-003', 'plan' => 'PLT-003', 'days' => 20, 'start' => '09:00', 'end' => '11:00', 'location' => 'Ruang Kolaborasi', 'status' => 'Terjadwal', 'open' => true],
        ] as $session) {
            DB::table('training_sessions')->updateOrInsert(['code' => $session['code']], [
                'training_plan_id' => DB::table('training_plans')->where('code', $session['plan'])->value('id'),
                'date' => now()->addDays($session['days'])->toDateString(), 'starts_at' => $session['start'], 'ends_at' => $session['end'],
                'location' => $session['location'], 'method' => str_contains($session['location'], 'Online') ? 'Daring' : 'Tatap muka',
                'quota' => 30, 'status' => $session['status'], 'attendance_open' => $session['open'], 'created_at' => now(), 'updated_at' => now(),
            ]);
        }

        $akmal = DB::table('employees')->where('employee_code', 'KRY-001')->value('id');
        $dimas = DB::table('employees')->where('employee_code', 'KRY-004')->value('id');
        foreach ([['employee' => $akmal, 'session' => 'JDW-001', 'progress' => 25], ['employee' => $dimas, 'session' => 'JDW-002', 'progress' => 0]] as $enrollment) {
            DB::table('enrollments')->updateOrInsert([
                'employee_id' => $enrollment['employee'],
                'training_session_id' => DB::table('training_sessions')->where('code', $enrollment['session'])->value('id'),
            ], ['registered_at' => now(), 'source' => 'Wajib', 'status' => 'Terdaftar', 'progress' => $enrollment['progress']]);
        }

        foreach ([
            ['PLT-001', 'Pengenalan Data Analytics', 'PDF', 1], ['PLT-001', 'Membersihkan dan Menyiapkan Data', 'Video', 2], ['PLT-001', 'Latihan: Eksplorasi Dataset', 'Tugas', 3],
            ['PLT-002', 'Dasar Riset Pengguna', 'PDF', 1], ['PLT-002', 'Membuat Prototipe Interaktif', 'Video', 2],
        ] as [$planCode, $title, $type, $position]) {
            DB::table('training_materials')->updateOrInsert(['training_plan_id' => DB::table('training_plans')->where('code', $planCode)->value('id'), 'title' => $title], ['type' => $type, 'content' => 'Materi ini membahas '.$title.'. Kenali tujuan pembelajaran, pahami konsep utamanya, lalu terapkan dalam latihan pada sesi pelatihan Anda.', 'url' => null, 'position' => $position, 'published' => true]);
        }

        foreach ([['Problem Solving', 85], ['Analytical Thinking', 72], ['Communication', 90]] as [$indicator, $target]) {
            DB::table('kpis')->updateOrInsert(['employee_id' => $akmal, 'indicator' => $indicator], ['target' => 80, 'achievement' => $target, 'status' => 'Tercapai', 'period' => 'Q4 2026']);
        }
        DB::table('training_targets')->updateOrInsert(['employee_id' => $akmal, 'name' => 'Menguasai Data Analytics'], ['status' => 'Berlangsung', 'progress' => 75]);
        DB::table('training_targets')->updateOrInsert(['employee_id' => $akmal, 'name' => 'Menyelesaikan sertifikasi ITIL v4'], ['status' => 'Belum dimulai', 'progress' => 0]);
        DB::table('tasks')->updateOrInsert(['code' => 'TGS-001'], ['employee_id' => $akmal, 'name' => 'Analisis Dataset Penjualan', 'type' => 'Individu', 'status' => 'Belum Dikerjakan', 'due_date' => now()->addDays(6)->toDateString()]);
        DB::table('tasks')->updateOrInsert(['code' => 'TGS-002'], ['employee_id' => $akmal, 'name' => 'Kuis Data Analytics', 'type' => 'Tes', 'status' => 'Sedang Dikerjakan', 'due_date' => now()->addDays(8)->toDateString()]);
        DB::table('assessments')->updateOrInsert(['employee_id' => $akmal, 'title' => 'Skill Assessment · Oktober'], ['result' => 'Kompetensi berkembang sesuai target.', 'responses' => json_encode(['Problem Solving' => 85, 'Analytical Thinking' => 72]), 'submitted_at' => now()->subDays(2)]);
        $assessmentId = DB::table('assessments')->where('employee_id', $akmal)->where('title', 'Skill Assessment · Oktober')->value('id');
        foreach ([['Problem Solving', 85, 'Memenuhi sebagian besar indikator', 'Intermediate'], ['Analytical Thinking', 72, 'Mampu mengolah data dan menarik insight', 'Intermediate'], ['Communication', 90, 'Menyampaikan hasil dengan jelas', 'Advanced']] as [$competency, $score, $achievement, $level]) {
            DB::table('assessment_competencies')->updateOrInsert(['assessment_id' => $assessmentId, 'competency' => $competency], ['score' => $score, 'achievement' => $achievement, 'level' => $level]);
        }
        DB::table('performance_records')->updateOrInsert(['employee_id' => $akmal, 'period' => 'Q4 2026'], ['status' => 'Baik', 'detail' => 'Mencapai sebagian besar target dan menyelesaikan prioritas kuartal.', 'score' => 85]);
        DB::table('notifications')->updateOrInsert(['employee_id' => $akmal, 'title' => 'Jadwal Pelatihan Baru'], ['body' => 'Pelatihan Data Analytics Fundamentals dijadwalkan pada '.now()->addDays(5)->format('d M Y').'. Periksa jadwal dan materi pelatihan Anda.', 'read' => false, 'created_at' => now(), 'updated_at' => now()]);
    }
}
