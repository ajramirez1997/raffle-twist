<?php

use App\Models\RaffleParticipant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

test('raffle pages require authentication', function () {
    $this->get('/')->assertRedirect(route('login'));
    $this->get('/admin-raffle-list')->assertRedirect(route('login'));
});

test('participant list search and status filters are paginated and retained across pages', function () {
    $this->actingAs(User::factory()->create());

    foreach (range(1, 16) as $number) {
        RaffleParticipant::query()->create([
            'raffle_number' => sprintf('TICKET-%02d', $number),
            'already_won' => true,
            'expected_to_win' => true,
        ]);
    }

    RaffleParticipant::query()->create([
        'raffle_number' => 'OTHER-01',
        'already_won' => true,
        'expected_to_win' => true,
    ]);
    RaffleParticipant::query()->create([
        'raffle_number' => 'TICKET-REGULAR',
        'already_won' => false,
        'expected_to_win' => false,
    ]);

    $filters = 'search=TICKET&already_won=yes&expected_to_win=yes';

    $this->get("/admin-raffle-list?{$filters}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('raffle/participants')
            ->where('participants.total', 16)
            ->where('participants.current_page', 1)
            ->where('participants.last_page', 2)
            ->where('participants.data.0.raffle_number', 'TICKET-01')
            ->where('filters.search', 'TICKET')
            ->where('filters.already_won', 'yes')
            ->where('filters.expected_to_win', 'yes')
        );

    $this->get("/admin-raffle-list?{$filters}&page=2")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('participants.total', 16)
            ->where('participants.current_page', 2)
            ->where('participants.from', 16)
            ->where('participants.data.0.raffle_number', 'TICKET-16')
            ->where('filters.search', 'TICKET')
            ->where('filters.already_won', 'yes')
            ->where('filters.expected_to_win', 'yes')
        );
});

test('participant list rejects unsupported status filters', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/admin-raffle-list?already_won=sometimes')
        ->assertSessionHasErrors('already_won');
});

test('raffle reset actions require authentication', function () {
    $participant = RaffleParticipant::query()->create([
        'raffle_number' => 'WINNER-1',
        'already_won' => true,
        'won_at' => now(),
    ]);

    $this->post('/admin-raffle-list/reset-winners')->assertRedirect(route('login'));
    $this->delete('/admin-raffle-list/clear-all')->assertRedirect(route('login'));

    expect($participant->fresh()->already_won)->toBeTrue();
    $this->assertDatabaseCount('raffle_participants', 1);
});

test('admin can log in with a username and is sent to the raffle', function () {
    User::factory()->create([
        'username' => 'admin123',
        'password' => '123admin456',
    ]);

    $this->post(route('login.store'), [
        'username' => 'admin123',
        'password' => '123admin456',
    ])->assertRedirect('/');

    $this->assertAuthenticated();
    $this->get('/')->assertOk()->assertInertia(fn ($page) => $page->component('raffle/index'));
});

test('database seeder creates the configured admin with a hashed password', function () {
    $this->seed();

    $admin = User::query()->where('username', 'admin123')->firstOrFail();

    expect(Hash::check('123admin456', $admin->password))->toBeTrue();
});

test('expected winners are drawn by ascending id before random regular draws and cannot win twice', function () {
    $this->actingAs(User::factory()->create());

    $firstExpectedWinner = RaffleParticipant::query()->create([
        'raffle_number' => 'EXPECTED-1',
        'expected_to_win' => true,
    ]);
    $laterExpectedWinner = RaffleParticipant::query()->create([
        'raffle_number' => 'EXPECTED-2',
        'expected_to_win' => true,
    ]);
    $regular = RaffleParticipant::query()->create(['raffle_number' => 'REGULAR-1']);

    $this->post('/raffle/spin')->assertRedirect('/');

    expect($firstExpectedWinner->fresh()->already_won)->toBeTrue()
        ->and($laterExpectedWinner->fresh()->already_won)->toBeFalse()
        ->and($regular->fresh()->already_won)->toBeFalse();

    $this->post('/raffle/spin')->assertRedirect('/');

    expect($laterExpectedWinner->fresh()->already_won)->toBeTrue()
        ->and($regular->fresh()->already_won)->toBeFalse();

    $this->post('/raffle/spin')->assertRedirect('/');

    expect($regular->fresh()->already_won)->toBeTrue()
        ->and(RaffleParticipant::query()->where('already_won', true)->count())->toBe(3);
});

test('participants can be added and expected-to-win status can be toggled', function () {
    $this->actingAs(User::factory()->create());

    $this->post('/admin-raffle-list', [
        'raffle_number' => '1001',
        'expected_to_win' => true,
    ])->assertRedirect();

    $participant = RaffleParticipant::query()->where('raffle_number', '1001')->firstOrFail();

    $this->post("/admin-raffle-list/{$participant->id}/expected")
        ->assertRedirect()
        ->assertSessionHas('success', 'Expected-to-win status removed.');

    expect($participant->fresh()->expected_to_win)->toBeFalse()
        ->and($participant->fresh()->already_won)->toBeFalse();

    $this->post("/admin-raffle-list/{$participant->id}/expected")
        ->assertRedirect()
        ->assertSessionHas('success', 'Participant marked as expected to win.');

    expect($participant->fresh()->expected_to_win)->toBeTrue();

    $this->post('/admin-raffle-list', [
        'raffle_number' => '1001',
        'expected_to_win' => false,
    ])->assertSessionHasErrors('raffle_number');
});

test('won participants cannot be marked as expected to win or deleted', function () {
    $this->actingAs(User::factory()->create());
    $participant = RaffleParticipant::query()->create([
        'raffle_number' => '1001',
        'already_won' => true,
        'won_at' => now(),
    ]);

    $this->post("/admin-raffle-list/{$participant->id}/expected")
        ->assertRedirect()
        ->assertSessionHas('error', 'A participant who has already won cannot be marked as expected to win.');

    $this->delete("/admin-raffle-list/{$participant->id}")
        ->assertRedirect()
        ->assertSessionHas('error', 'Winner records cannot be deleted.');

    expect($participant->fresh()->expected_to_win)->toBeFalse()
        ->and($participant->fresh()->already_won)->toBeTrue();

    $this->assertDatabaseCount('raffle_participants', 1);
});

test('resetting the raffle clears winner state but keeps participants and expected status', function () {
    $this->actingAs(User::factory()->create());

    $winner = RaffleParticipant::query()->create([
        'raffle_number' => 'WINNER-1',
        'already_won' => true,
        'expected_to_win' => true,
        'won_at' => now(),
    ]);
    $expected = RaffleParticipant::query()->create([
        'raffle_number' => 'EXPECTED-1',
        'expected_to_win' => true,
    ]);
    $regular = RaffleParticipant::query()->create([
        'raffle_number' => 'REGULAR-1',
    ]);

    $this->post('/admin-raffle-list/reset-winners')
        ->assertRedirect()
        ->assertSessionHas('success', 'Raffle winners have been reset. Participants and expected-to-win settings were kept.');

    $this->assertDatabaseCount('raffle_participants', 3);
    expect($winner->fresh()->already_won)->toBeFalse()
        ->and($winner->fresh()->won_at)->toBeNull()
        ->and($winner->fresh()->expected_to_win)->toBeTrue()
        ->and($expected->fresh()->expected_to_win)->toBeTrue()
        ->and($regular->fresh()->already_won)->toBeFalse();
});

test('clearing the raffle removes all participants and winner records', function () {
    $this->actingAs(User::factory()->create());

    RaffleParticipant::query()->create([
        'raffle_number' => 'WINNER-1',
        'already_won' => true,
        'won_at' => now(),
    ]);
    RaffleParticipant::query()->create([
        'raffle_number' => 'EXPECTED-1',
        'expected_to_win' => true,
    ]);

    $this->delete('/admin-raffle-list/clear-all')
        ->assertRedirect()
        ->assertSessionHas('success', 'All participants and winner records have been cleared.');

    $this->assertDatabaseCount('raffle_participants', 0);
});

test('participants can be edited and marked as expected to win', function () {
    $this->actingAs(User::factory()->create());

    $participant = RaffleParticipant::query()->create(['raffle_number' => '1001']);

    $this->put("/admin-raffle-list/{$participant->id}", [
        'raffle_number' => '2001',
    ])->assertRedirect();

    expect($participant->fresh()->raffle_number)->toBe('2001');

    $this->post("/admin-raffle-list/{$participant->id}/expected")->assertRedirect();

    expect($participant->fresh()->expected_to_win)->toBeTrue();
});

test('raffle page lists all winners and leaves expected status off the eligible list', function () {
    $this->actingAs(User::factory()->create());

    RaffleParticipant::query()->create([
        'raffle_number' => 'EXPECTED-1',
        'expected_to_win' => true,
    ]);
    RaffleParticipant::query()->create([
        'raffle_number' => 'WINNER-1',
        'already_won' => true,
        'won_at' => now()->subMinute(),
    ]);
    RaffleParticipant::query()->create([
        'raffle_number' => 'WINNER-2',
        'already_won' => true,
        'won_at' => now(),
    ]);

    $this->get('/')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('participants.0.raffle_number', 'EXPECTED-1')
            ->missing('participants.0.expected_to_win')
            ->where('winners.0.raffle_number', 'WINNER-2')
            ->where('winners.1.raffle_number', 'WINNER-1')
            ->where('winnerCount', 2)
        );
});

test('CSV import template can be downloaded', function () {
    $this->actingAs(User::factory()->create());

    $template = $this->get('/admin-raffle-list/template');

    $template->assertOk()->assertDownload('raffle-participants-template.csv');
    expect($template->streamedContent())->toContain('raffle_number');
});

test('CSV import reports inserted duplicate and invalid rows without changing winners', function () {
    $this->actingAs(User::factory()->create());

    $existingWinner = RaffleParticipant::query()->create([
        'raffle_number' => '1001',
        'already_won' => true,
        'won_at' => now(),
    ]);
    $file = UploadedFile::fake()->createWithContent(
        'participants.csv',
        "raffle_number\n1002\n1001\n\n1003,extra\n",
    );

    $this->post('/admin-raffle-list/import', ['file' => $file])
        ->assertRedirect()
        ->assertSessionHas('importSummary', [
            'processed' => 4,
            'imported' => 1,
            'duplicates' => 1,
            'invalid' => 2,
        ]);

    expect($existingWinner->fresh()->already_won)->toBeTrue()
        ->and(RaffleParticipant::query()->where('raffle_number', '1002')->exists())->toBeTrue()
        ->and(RaffleParticipant::query()->count())->toBe(2);
});

test('registration and starter dashboard routes are not available', function () {
    $this->get('/register')->assertNotFound();
    $this->get('/dashboard')->assertNotFound();
});
