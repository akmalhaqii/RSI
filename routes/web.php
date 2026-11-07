<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('trainings');
});

Route::get('/forgot-password', fn () => view('trainings'))->name('password.request');
Route::get('/reset-password/{token}', fn () => view('trainings'))->name('password.reset');
