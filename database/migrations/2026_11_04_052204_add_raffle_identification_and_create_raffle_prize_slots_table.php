<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('raffle_participants', function (Blueprint $table) {
            $table->string('raffle_identification')->nullable();
            $table->unsignedSmallInteger('prize_position')->nullable()->unique();
            $table->index(['already_won', 'raffle_identification']);
            $table->dropColumn('expected_to_win');
        });

        Schema::create('raffle_prize_slots', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('prize_position')->unique();
            $table->unsignedSmallInteger('sequence_order')->unique();
            $table->string('raffle_identification');
            $table->timestamps();
        });

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

        $now = now();
        $slots = [];

        foreach ($identifications as $position => $identification) {
            $slots[] = [
                'prize_position' => $position,
                'sequence_order' => 21 - $position,
                'raffle_identification' => $identification,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        DB::table('raffle_prize_slots')->insert($slots);
    }

    public function down(): void
    {
        Schema::dropIfExists('raffle_prize_slots');

        Schema::table('raffle_participants', function (Blueprint $table) {
            $table->boolean('expected_to_win')->default(false);
            $table->dropIndex(['already_won', 'raffle_identification']);
            $table->dropUnique(['prize_position']);
            $table->dropColumn(['raffle_identification', 'prize_position']);
        });
    }
};
