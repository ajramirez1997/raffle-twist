<?php

namespace App\Http\Controllers;

use App\Models\RaffleParticipant;
use App\Models\RafflePrizeSlot;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class RaffleSequenceController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('raffle/sequence', [
            'slots' => RafflePrizeSlot::query()
                ->orderBy('sequence_order')
                ->get(['prize_position', 'raffle_identification']),
            'completedDraws' => RaffleParticipant::query()
                ->whereNotNull('prize_position')
                ->count(),
            'unsequencedWinnerCount' => RaffleParticipant::query()
                ->where('already_won', true)
                ->whereNull('prize_position')
                ->count(),
            'sequenceLocked' => RaffleParticipant::query()
                ->whereNotNull('prize_position')
                ->exists(),
            'success' => session('success'),
            'error' => session('error'),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'slots' => ['required', 'array', 'min:1', 'max:100'],
            'slots.*.prize_position' => ['required', 'integer', 'min:1', 'max:100', 'distinct'],
            'slots.*.raffle_identification' => ['required', 'in:member,agency'],
        ]);
        $slots = array_values($data['slots']);

        $updated = DB::transaction(function () use ($slots): bool {
            DB::table('raffle_draw_locks')->where('id', 1)->lockForUpdate()->firstOrFail();

            if (RaffleParticipant::query()->whereNotNull('prize_position')->exists()) {
                return false;
            }

            RafflePrizeSlot::query()->delete();

            foreach ($slots as $index => $slot) {
                RafflePrizeSlot::query()->create([
                    'prize_position' => $slot['prize_position'],
                    'sequence_order' => $index + 1,
                    'raffle_identification' => $slot['raffle_identification'],
                ]);
            }

            return true;
        }, attempts: 3);

        if (! $updated) {
            return back()->with('error', 'Reset the raffle before changing a sequence that already has winners.');
        }

        return back()->with('success', 'Raffle sequence updated.');
    }
}
