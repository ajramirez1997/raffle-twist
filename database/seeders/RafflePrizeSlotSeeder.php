<?php

namespace Database\Seeders;

use App\Models\RafflePrizeSlot;
use Illuminate\Database\Seeder;

class RafflePrizeSlotSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        if (RafflePrizeSlot::query()->exists()) {
            return;
        }

        $identifications = [
            1 => 'member',
            2 => 'member',
            3 => 'agency',
            4 => 'member',
            5 => 'member',
            6 => 'member',
            7 => 'agency',
            8 => 'member',
            9 => 'member',
            10 => 'agency',
            11 => 'member',
            12 => 'agency',
            13 => 'agency',
            14 => 'member',
            15 => 'member',
            16 => 'agency',
            17 => 'member',
            18 => 'member',
            19 => 'agency',
            20 => 'member',
        ];

        foreach ($identifications as $position => $identification) {
            RafflePrizeSlot::query()->create([
                'prize_position' => $position,
                'sequence_order' => 21 - $position,
                'raffle_identification' => $identification,
            ]);
        }
    }
}
