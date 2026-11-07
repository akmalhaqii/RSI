<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('role')->default('employee')->index();
            $table->boolean('active')->default(true);
        });

        Schema::create('employees', function (Blueprint $table): void {
            $table->id();
            $table->string('employee_code', 10)->unique();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name', 100);
            $table->string('position', 100);
            $table->string('unit', 100);
            $table->string('status', 30)->default('Aktif');
            $table->timestamps();
        });
        Schema::create('training_plans', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 10)->unique();
            $table->string('name', 150);
            $table->string('schedule', 100)->nullable();
            $table->unsignedInteger('quota')->default(30);
            $table->string('category', 50)->default('Teknis');
            $table->text('description')->nullable();
            $table->timestamps();
        });
        Schema::create('training_sessions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('training_plan_id')->constrained()->cascadeOnDelete();
            $table->string('code', 10)->unique();
            $table->date('date');
            $table->time('starts_at');
            $table->time('ends_at');
            $table->string('location', 200)->nullable();
            $table->string('method', 30)->default('Tatap muka');
            $table->unsignedInteger('quota')->default(30);
            $table->string('status', 30)->default('Terjadwal')->index();
            $table->boolean('attendance_open')->default(true);
            $table->timestamps();
        });
        Schema::create('enrollments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->foreignId('training_session_id')->constrained()->cascadeOnDelete();
            $table->timestamp('registered_at')->useCurrent();
            $table->string('source', 50)->default('Mandiri');
            $table->string('status', 30)->default('Terdaftar');
            $table->unsignedTinyInteger('progress')->default(0);
            $table->unsignedTinyInteger('pre_score')->nullable();
            $table->unsignedTinyInteger('post_score')->nullable();
            $table->unique(['employee_id', 'training_session_id']);
        });
        Schema::create('training_materials', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('training_plan_id')->constrained()->cascadeOnDelete();
            $table->string('title', 150);
            $table->string('type', 50)->default('Dokumen');
            $table->text('content')->nullable();
            $table->string('url', 500)->nullable();
            $table->unsignedInteger('position')->default(1);
            $table->boolean('published')->default(true);
        });
        Schema::create('attendances', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->foreignId('training_session_id')->constrained()->cascadeOnDelete();
            $table->string('status', 30)->default('Hadir');
            $table->string('note')->nullable();
            $table->timestamp('recorded_at')->useCurrent();
            $table->unique(['employee_id', 'training_session_id']);
        });
        Schema::create('training_targets', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->string('name', 150);
            $table->string('status', 30)->default('Berlangsung');
            $table->unsignedTinyInteger('progress')->default(0);
        });
        Schema::create('tasks', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->string('code', 10)->unique();
            $table->string('name', 150);
            $table->string('type', 50);
            $table->string('status', 30)->default('Belum Dikerjakan');
            $table->date('due_date');
        });
        Schema::create('assessments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->string('title', 150)->default('Skill Assessment');
            $table->text('result')->nullable();
            $table->json('responses')->nullable();
            $table->timestamp('submitted_at')->nullable();
        });
        Schema::create('assessment_competencies', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('assessment_id')->constrained()->cascadeOnDelete();
            $table->string('competency', 100);
            $table->decimal('score', 5, 2)->default(0);
            $table->string('achievement', 255)->nullable();
            $table->string('level', 50)->default('Pemula');
        });
        Schema::create('kpis', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->string('indicator', 150);
            $table->decimal('target', 10, 2);
            $table->decimal('achievement', 10, 2)->nullable();
            $table->string('status', 30)->default('Belum dinilai');
            $table->string('period', 30)->default('Q4 2026');
        });
        Schema::create('notifications', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->string('title', 150);
            $table->text('body');
            $table->boolean('read')->default(false);
            $table->timestamps();
        });
        Schema::create('performance_records', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->string('status', 30)->default('Baik');
            $table->text('detail')->nullable();
            $table->unsignedTinyInteger('score')->default(0);
            $table->string('period', 30)->default('Q4 2026');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('performance_records');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('kpis');
        Schema::dropIfExists('assessment_competencies');
        Schema::dropIfExists('assessments');
        Schema::dropIfExists('tasks');
        Schema::dropIfExists('training_targets');
        Schema::dropIfExists('attendances');
        Schema::dropIfExists('training_materials');
        Schema::dropIfExists('enrollments');
        Schema::dropIfExists('training_sessions');
        Schema::dropIfExists('training_plans');
        Schema::dropIfExists('employees');
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['role', 'active']);
        });
    }
};
