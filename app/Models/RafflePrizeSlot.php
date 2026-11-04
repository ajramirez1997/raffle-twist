<?php

namespace App\Models;

use Database\Factories\RafflePrizeSlotFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['prize_position', 'sequence_order', 'raffle_identification'])]
class RafflePrizeSlot extends Model
{
    /** @use HasFactory<RafflePrizeSlotFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'prize_position' => 'integer',
            'sequence_order' => 'integer',
        ];
    }
}
