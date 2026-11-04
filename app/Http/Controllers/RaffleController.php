<?php

namespace App\Http\Controllers;

use App\Models\RaffleParticipant;
use App\Models\RafflePrizeSlot;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class RaffleController extends Controller
{
    public function index(): Response
    {
        $completedPositions = RaffleParticipant::query()
            ->whereNotNull('prize_position')
            ->pluck('prize_position');
        $completedDraws = $completedPositions->count();
        $totalDraws = RafflePrizeSlot::query()->count();
        $nextSlot = RafflePrizeSlot::query()
            ->orderBy('sequence_order')
            ->get()
            ->first(fn (RafflePrizeSlot $slot): bool => ! $completedPositions->contains($slot->prize_position));

        return Inertia::render('raffle/index', [
            'raffleNumbers' => $nextSlot === null
                ? collect()
                : RaffleParticipant::query()
                    ->where('already_won', false)
                    ->where('raffle_identification', $nextSlot->raffle_identification)
                    ->orderBy('id')
                    ->pluck('raffle_number'),
            'nextDraw' => $nextSlot === null ? null : [
                'spin_number' => $completedDraws + 1,
                'prize_position' => $nextSlot->prize_position,
                'raffle_identification' => $nextSlot->raffle_identification,
            ],
            'completedDraws' => $completedDraws,
            'totalDraws' => $totalDraws,
            'flash' => [
                'winner' => session('winner'),
            ],
        ]);
    }

    public function spin(): RedirectResponse
    {
        $draw = DB::transaction(function (): array {
            DB::table('raffle_draw_locks')->where('id', 1)->lockForUpdate()->firstOrFail();

            $completedPositions = RaffleParticipant::query()
                ->whereNotNull('prize_position')
                ->pluck('prize_position');
            $slotQuery = RafflePrizeSlot::query()
                ->orderBy('sequence_order')
                ->lockForUpdate();

            if ($completedPositions->isNotEmpty()) {
                $slotQuery->whereNotIn('prize_position', $completedPositions);
            }

            $slot = $slotQuery->first();

            if ($slot === null) {
                return ['error' => 'All configured raffle spins have been completed.'];
            }

            $eligible = RaffleParticipant::query()
                ->where('already_won', false)
                ->where('raffle_identification', $slot->raffle_identification)
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            if ($eligible->isEmpty()) {
                $identification = ucfirst($slot->raffle_identification);

                return [
                    'error' => "No eligible {$identification} participants remain for prize {$slot->prize_position}.",
                ];
            }

            $winner = $eligible->get(random_int(0, $eligible->count() - 1));
            $winner->forceFill([
                'already_won' => true,
                'prize_position' => $slot->prize_position,
                'won_at' => now(),
            ])->save();

            return [
                'winner' => $winner,
                'prize_position' => $slot->prize_position,
                'raffle_identification' => $slot->raffle_identification,
                'spin_number' => $completedPositions->count() + 1,
            ];
        }, attempts: 3);

        if (isset($draw['error'])) {
            return back()->withErrors([
                'raffle' => $draw['error'],
            ]);
        }

        $winner = $draw['winner'];

        return redirect()->route('raffle.home')->with('winner', [
            'id' => $winner->id,
            'raffle_number' => $winner->raffle_number,
            'prize_position' => $draw['prize_position'],
            'raffle_identification' => $draw['raffle_identification'],
            'spin_number' => $draw['spin_number'],
        ]);
    }
}
