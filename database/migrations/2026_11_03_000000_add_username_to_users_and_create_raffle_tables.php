<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username')->nullable()->unique();
        });

        Schema::create('raffle_participants', function (Blueprint $table) {
            $table->id();
            $table->string('raffle_number')->unique();
            $table->boolean('already_won')->default(false);
            $table->boolean('expected_to_win')->default(false);
            $table->timestamp('won_at')->nullable();
            $table->timestamps();
        });

        Schema::create('raffle_draw_locks', function (Blueprint $table) {
            $table->unsignedTinyInteger('id')->primary();
        });

        DB::table('raffle_draw_locks')->insert(['id' => 1]);
    }

    public function down(): void
    {
        Schema::dropIfExists('raffle_draw_locks');
        Schema::dropIfExists('raffle_participants');

        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['username']);
            $table->dropColumn('username');
        });
    }
};
