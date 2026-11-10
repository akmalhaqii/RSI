<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('training_plans', function (Blueprint $table): void {
            $table->string('provider', 100)->nullable();
            $table->string('department', 100)->nullable();
            $table->date('target_start')->nullable();
            $table->date('target_end')->nullable();
            $table->json('competencies')->nullable();
            $table->string('status', 30)->default('Draft');
        });

        Schema::table('training_sessions', function (Blueprint $table): void {
            $table->string('name', 150)->nullable();
            $table->string('type', 20)->default('Umum');
        });

        Schema::table('training_targets', function (Blueprint $table): void {
            $table->foreignId('manager_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->date('due_date')->nullable();
        });

        Schema::table('enrollments', function (Blueprint $table): void {
            $table->json('pre_answers')->nullable();
            $table->json('post_answers')->nullable();
        });

        Schema::table('assessments', function (Blueprint $table): void {
            $table->uuid('submission_id')->nullable()->unique();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('assessments', function (Blueprint $table): void {
            $table->dropUnique(['submission_id']);
            $table->dropColumn('submission_id');
        });

        Schema::table('enrollments', function (Blueprint $table): void {
            $table->dropColumn(['pre_answers', 'post_answers']);
        });

        Schema::table('training_targets', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('manager_id');
            $table->dropColumn('due_date');
        });

        Schema::table('training_sessions', function (Blueprint $table): void {
            $table->dropColumn(['name', 'type']);
        });

        Schema::table('training_plans', function (Blueprint $table): void {
            $table->dropColumn(['provider', 'department', 'target_start', 'target_end', 'competencies', 'status']);
        });
    }
};
