<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $raffle_number
 * @property string|null $raffle_identification
 * @property bool $already_won
 * @property int|null $prize_position
 * @property Carbon|null $won_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['raffle_number', 'raffle_identification', 'already_won', 'prize_position', 'won_at'])]
class RaffleParticipant extends Model
{
    protected function casts(): array
    {
        return [
            'already_won' => 'boolean',
            'prize_position' => 'integer',
            'won_at' => 'datetime',
        ];
    }
}
