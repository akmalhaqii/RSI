<?php

use App\Http\Controllers\Api\V1\TrainingController;
use App\Http\Controllers\Api\V1\WorkspaceController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->name('v1.')->middleware('web')->group(function (): void {
    Route::post('/login', [WorkspaceController::class, 'login'])->name('login');
    Route::post('/forgot-password', [WorkspaceController::class, 'sendPasswordResetLink'])->name('password.email');
    Route::post('/reset-password', [WorkspaceController::class, 'resetPassword'])->name('password.update');
    Route::post('/logout', [WorkspaceController::class, 'logout'])->middleware('auth')->name('logout');
    Route::middleware('auth')->group(function (): void {
        Route::get('/me', [WorkspaceController::class, 'me'])->name('me');
        Route::get('/workspace', [WorkspaceController::class, 'index'])->name('workspace');
        Route::post('/actions', [WorkspaceController::class, 'action'])->name('actions');
        Route::get('/trainings', [TrainingController::class, 'index'])->name('trainings.index');
    });
});
