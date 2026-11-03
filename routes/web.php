<?php

use App\Http\Controllers\RaffleController;
use App\Http\Controllers\RaffleParticipantController;
use Illuminate\Support\Facades\Route;

Route::inertia('/login', 'auth/login')->middleware('guest')->name('login');

Route::middleware('auth')->group(function () {
    Route::get('/', [RaffleController::class, 'index'])->name('raffle.home');
    Route::post('/raffle/spin', [RaffleController::class, 'spin'])->name('raffle.spin');

    Route::get('/admin-raffle-list', [RaffleParticipantController::class, 'index'])->name('raffle-participants.index');
    Route::post('/admin-raffle-list', [RaffleParticipantController::class, 'store'])->name('raffle-participants.store');
    Route::delete('/admin-raffle-list/clear-all', [RaffleParticipantController::class, 'clearAll'])->name('raffle-participants.clear-all');
    Route::post('/admin-raffle-list/reset-winners', [RaffleParticipantController::class, 'resetWinners'])->name('raffle-participants.reset-winners');
    Route::put('/admin-raffle-list/{participant}', [RaffleParticipantController::class, 'update'])->name('raffle-participants.update');
    Route::delete('/admin-raffle-list/{participant}', [RaffleParticipantController::class, 'destroy'])->name('raffle-participants.destroy');
    Route::post('/admin-raffle-list/{participant}/expected', [RaffleParticipantController::class, 'toggleExpected'])->name('raffle-participants.expected');
    Route::post('/admin-raffle-list/import', [RaffleParticipantController::class, 'import'])->name('raffle-participants.import');
    Route::get('/admin-raffle-list/template', [RaffleParticipantController::class, 'template'])->name('raffle-participants.template');
});
