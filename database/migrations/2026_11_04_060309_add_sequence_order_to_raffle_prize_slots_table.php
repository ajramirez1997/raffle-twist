<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('raffle_prize_slots', 'sequence_order')) {
            Schema::table('raffle_prize_slots', function (Blueprint $table) {
                $table->unsignedSmallInteger('sequence_order')->nullable();
            });

            foreach (DB::table('raffle_prize_slots')
                ->orderByDesc('prize_position')
                ->pluck('id') as $index => $id) {
                DB::table('raffle_prize_slots')
                    ->where('id', $id)
                    ->update(['sequence_order' => $index + 1]);
            }

            Schema::table('raffle_prize_slots', function (Blueprint $table) {
                $table->unsignedSmallInteger('sequence_order')
                    ->nullable(false)
                    ->unique()
                    ->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('raffle_prize_slots', 'sequence_order')) {
            Schema::table('raffle_prize_slots', function (Blueprint $table) {
                $table->dropUnique(['sequence_order']);
                $table->dropColumn('sequence_order');
            });
        }
    }
};
