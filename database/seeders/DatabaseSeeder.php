<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(RafflePrizeSlotSeeder::class);

        User::query()->firstOrCreate(
            ['username' => 'admin123'],
            [
                'name' => 'Administrator',
                'email' => 'admin@example.com',
                'password' => '123admin456',
                'email_verified_at' => now(),
            ],
        );
    }
}
