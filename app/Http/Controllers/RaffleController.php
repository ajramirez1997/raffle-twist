<?php

namespace App\Http\Controllers;

use App\Models\RaffleParticipant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class RaffleController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('raffle/index', [
            'participants' => RaffleParticipant::query()
                ->where('already_won', false)
                ->orderBy('id')
                ->get(['id', 'raffle_number']),
            'winners' => RaffleParticipant::query()
                ->where('already_won', true)
                ->latest('won_at')
                ->get(['id', 'raffle_number', 'won_at']),
            'winnerCount' => RaffleParticipant::query()->where('already_won', true)->count(),
            'flash' => [
                'winner' => session('winner'),
            ],
        ]);
    }

    public function spin(): RedirectResponse
    {
        $winner = DB::transaction(function (): ?RaffleParticipant {
            DB::table('raffle_draw_locks')->where('id', 1)->lockForUpdate()->firstOrFail();

            $winner = RaffleParticipant::query()
                ->where('already_won', false)
                ->where('expected_to_win', true)
                ->orderBy('id')
                ->lockForUpdate()
                ->first();

            if ($winner === null) {
                $eligible = RaffleParticipant::query()
                    ->where('already_won', false)
                    ->where('expected_to_win', false)
                    ->orderBy('id')
                    ->lockForUpdate()
                    ->get();

                if ($eligible->isEmpty()) {
                    return null;
                }

                $winner = $eligible->get(random_int(0, $eligible->count() - 1));
            }

            $winner->forceFill([
                'already_won' => true,
                'won_at' => now(),
            ])->save();

            return $winner;
        }, attempts: 3);

        if ($winner === null) {
            return back()->withErrors([
                'raffle' => 'There are no eligible participants remaining.',
            ]);
        }

        return redirect()->route('raffle.home')->with('winner', [
            'id' => $winner->id,
            'raffle_number' => $winner->raffle_number,
        ]);
    }
}
