<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $raffle_number
 * @property bool $already_won
 * @property bool $expected_to_win
 * @property Carbon|null $won_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['raffle_number', 'already_won', 'expected_to_win', 'won_at'])]
class RaffleParticipant extends Model
{
    protected function casts(): array
    {
        return [
            'already_won' => 'boolean',
            'expected_to_win' => 'boolean',
            'won_at' => 'datetime',
        ];
    }
}
