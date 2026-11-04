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
            'completedPrizePositions' => RaffleParticipant::query()
                ->whereNotNull('prize_position')
                ->pluck('prize_position'),
            'success' => session('success'),
            'error' => session('error'),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'slots' => ['required', 'array', 'min:1', 'max:100'],
            'slots.*.prize_position' => ['required', 'integer', 'min:1', 'max:100', 'distinct'],
            'slots.*.raffle_identification' => ['required', 'in:member,agency,all'],
        ]);
        $slots = array_values($data['slots']);

        $updated = DB::transaction(function () use ($slots): bool {
            DB::table('raffle_draw_locks')->where('id', 1)->lockForUpdate()->firstOrFail();

            $completedPositions = RaffleParticipant::query()
                ->whereNotNull('prize_position')
                ->pluck('prize_position')
                ->map(fn (int $position): int => $position);
            $existingSlots = RafflePrizeSlot::query()->get()->keyBy('prize_position');
            $submittedSlots = collect($slots)->keyBy('prize_position');

            foreach ($completedPositions as $position) {
                $existingSlot = $existingSlots->get($position);
                $submittedSlot = $submittedSlots->get($position);

                if (
                    $existingSlot === null
                    || $submittedSlot === null
                    || $submittedSlot['raffle_identification'] !== $existingSlot->raffle_identification
                ) {
                    return false;
                }
            }

            RafflePrizeSlot::query()
                ->whereNotIn('prize_position', $submittedSlots->keys())
                ->whereNotIn('prize_position', $completedPositions)
                ->delete();

            RafflePrizeSlot::query()->increment('sequence_order', 100);

            foreach ($slots as $index => $slot) {
                $existingSlot = $existingSlots->get($slot['prize_position']);

                if ($existingSlot === null) {
                    RafflePrizeSlot::query()->create([
                        'prize_position' => $slot['prize_position'],
                        'sequence_order' => $index + 1,
                        'raffle_identification' => $slot['raffle_identification'],
                    ]);

                    continue;
                }

                RafflePrizeSlot::query()
                    ->whereKey($existingSlot->getKey())
                    ->update([
                        'sequence_order' => $index + 1,
                        'raffle_identification' => $slot['raffle_identification'],
                    ]);
            }

            return true;
        }, attempts: 3);

        if (! $updated) {
            return back()->with('error', 'Prize slots with recorded winners cannot be removed or changed.');
        }

        return back()->with('success', 'Raffle sequence updated.');
    }
}
