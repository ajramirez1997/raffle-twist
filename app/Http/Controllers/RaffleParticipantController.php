<?php

namespace App\Http\Controllers;

use App\Models\RaffleParticipant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RaffleParticipantController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'already_won' => ['nullable', 'in:yes,no'],
            'raffle_identification' => ['nullable', 'in:member,agency,unassigned'],
        ]);

        $query = RaffleParticipant::query()->orderBy('id');

        if (filled($filters['search'] ?? null)) {
            $query->where('raffle_number', 'like', '%'.trim($filters['search']).'%');
        }

        if (filled($filters['already_won'] ?? null)) {
            $query->where('already_won', $filters['already_won'] === 'yes');
        }

        if (($filters['raffle_identification'] ?? null) === 'unassigned') {
            $query->whereNull('raffle_identification');
        } elseif (filled($filters['raffle_identification'] ?? null)) {
            $query->where('raffle_identification', $filters['raffle_identification']);
        }

        return Inertia::render('raffle/participants', [
            'participants' => $query->paginate(15)->withQueryString(),
            'unassignedCount' => RaffleParticipant::query()
                ->whereNull('raffle_identification')
                ->count(),
            'filters' => [
                'search' => $filters['search'] ?? '',
                'already_won' => $filters['already_won'] ?? '',
                'raffle_identification' => $filters['raffle_identification'] ?? '',
            ],
            'importSummary' => session('importSummary'),
            'success' => session('success'),
            'error' => session('error'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'raffle_number' => ['required', 'string', 'max:255', 'unique:raffle_participants,raffle_number'],
            'raffle_identification' => ['required', 'in:member,agency'],
        ]);

        DB::transaction(function () use ($data): void {
            DB::table('raffle_draw_locks')->where('id', 1)->lockForUpdate()->firstOrFail();
            RaffleParticipant::query()->create($data);
        }, attempts: 3);

        return back()->with('success', 'Participant added.');
    }

    public function update(Request $request, RaffleParticipant $participant): RedirectResponse
    {
        $data = $request->validate([
            'raffle_number' => ['required', 'string', 'max:255', 'unique:raffle_participants,raffle_number,'.$participant->id],
            'raffle_identification' => ['required', 'in:member,agency'],
        ]);

        $updated = DB::transaction(function () use ($data, $participant): bool {
            DB::table('raffle_draw_locks')->where('id', 1)->lockForUpdate()->firstOrFail();

            $lockedParticipant = RaffleParticipant::query()
                ->whereKey($participant->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedParticipant->already_won) {
                return false;
            }

            $lockedParticipant->update($data);

            return true;
        }, attempts: 3);

        if (! $updated) {
            return back()->with('error', 'Winner records cannot be changed.');
        }

        return back()->with('success', 'Participant updated.');
    }

    public function destroy(RaffleParticipant $participant): RedirectResponse
    {
        $deleted = DB::transaction(function () use ($participant): bool {
            DB::table('raffle_draw_locks')->where('id', 1)->lockForUpdate()->firstOrFail();

            $lockedParticipant = RaffleParticipant::query()
                ->whereKey($participant->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedParticipant->already_won) {
                return false;
            }

            $lockedParticipant->delete();

            return true;
        }, attempts: 3);

        if (! $deleted) {
            return back()->with('error', 'Winner records cannot be deleted.');
        }

        return back()->with('success', 'Participant deleted.');
    }

    public function resetWinners(): RedirectResponse
    {
        DB::transaction(function (): void {
            DB::table('raffle_draw_locks')->where('id', 1)->lockForUpdate()->firstOrFail();

            RaffleParticipant::query()
                ->where('already_won', true)
                ->update([
                    'already_won' => false,
                    'prize_position' => null,
                    'won_at' => null,
                    'updated_at' => now(),
                ]);
        }, attempts: 3);

        return back()->with('success', 'Raffle winners have been reset. All participants were kept.');
    }

    public function clearAll(): RedirectResponse
    {
        DB::transaction(function (): void {
            DB::table('raffle_draw_locks')->where('id', 1)->lockForUpdate()->firstOrFail();

            RaffleParticipant::query()->delete();
        }, attempts: 3);

        return back()->with('success', 'All participants and winner records have been cleared.');
    }

    public function import(Request $request): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:10240'],
        ]);

        $handle = fopen($request->file('file')->getRealPath(), 'rb');

        if ($handle === false) {
            throw ValidationException::withMessages(['file' => 'The uploaded CSV could not be read.']);
        }

        try {
            $header = fgetcsv($handle, escape: '');

            if ($header === false) {
                throw ValidationException::withMessages(['file' => 'The CSV file is empty.']);
            }

            $header[0] = preg_replace('/^\xEF\xBB\xBF/', '', (string) $header[0]);

            if (
                count($header) !== 2
                || trim((string) $header[0]) !== 'raffle_number'
                || trim((string) $header[1]) !== 'raffle_identification'
            ) {
                throw ValidationException::withMessages([
                    'file' => 'The CSV must contain raffle_number and raffle_identification columns.',
                ]);
            }

            $rows = [];

            while (($row = fgetcsv($handle, escape: '')) !== false) {
                $rows[] = $row;
            }
        } finally {
            fclose($handle);
        }

        $summary = [
            'processed' => count($rows),
            'imported' => 0,
            'duplicates' => 0,
            'invalid' => 0,
        ];
        $seen = [];

        DB::transaction(function () use ($rows, &$summary, &$seen): void {
            DB::table('raffle_draw_locks')->where('id', 1)->lockForUpdate()->firstOrFail();

            foreach ($rows as $row) {
                if (
                    count($row) !== 2
                    || ! is_string($row[0])
                    || ! is_string($row[1])
                ) {
                    $summary['invalid']++;

                    continue;
                }

                $raffleNumber = trim($row[0]);
                $identification = strtolower(trim($row[1]));

                $validation = Validator::make(
                    [
                        'raffle_number' => $raffleNumber,
                        'raffle_identification' => $identification,
                    ],
                    [
                        'raffle_number' => ['required', 'string', 'max:255'],
                        'raffle_identification' => ['required', 'in:member,agency'],
                    ],
                );

                if ($validation->fails()) {
                    $summary['invalid']++;

                    continue;
                }

                if (isset($seen[$raffleNumber])) {
                    $summary['duplicates']++;

                    continue;
                }

                $seen[$raffleNumber] = true;

                $inserted = DB::table('raffle_participants')->insertOrIgnore([
                    'raffle_number' => $raffleNumber,
                    'raffle_identification' => $identification,
                    'already_won' => false,
                    'prize_position' => null,
                    'won_at' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                if ($inserted === 1) {
                    $summary['imported']++;
                } else {
                    $summary['duplicates']++;
                }
            }
        });

        return back()->with('importSummary', $summary);
    }

    public function template(): StreamedResponse
    {
        return response()->streamDownload(static function (): void {
            $output = fopen('php://output', 'wb');

            if ($output === false) {
                throw new RuntimeException('The CSV template output could not be opened.');
            }

            try {
                foreach ([
                    ['raffle_number', 'raffle_identification'],
                    ['1001', 'member'],
                    ['1002', 'agency'],
                    ['1003', 'member'],
                    ['1004', 'agency'],
                    ['1005', 'member'],
                ] as $row) {
                    if (fputcsv($output, $row) === false) {
                        throw new RuntimeException('The CSV template could not be written.');
                    }
                }
            } finally {
                fclose($output);
            }
        }, 'raffle-participants-template.csv', ['Content-Type' => 'text/csv']);
    }
}
