<?php

namespace Database\Factories;

use App\Models\RafflePrizeSlot;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RafflePrizeSlot>
 */
class RafflePrizeSlotFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'prize_position' => fake()->unique()->numberBetween(1, 100),
            'sequence_order' => fake()->unique()->numberBetween(1, 100),
            'raffle_identification' => fake()->randomElement(['member', 'agency']),
        ];
    }
}
