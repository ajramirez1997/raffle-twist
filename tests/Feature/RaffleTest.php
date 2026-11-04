<?php

use App\Models\RaffleParticipant;
use App\Models\RafflePrizeSlot;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

test('raffle pages require authentication', function () {
    $this->get('/')->assertRedirect(route('login'));
    $this->get('/admin-raffle-list')->assertRedirect(route('login'));
    $this->get('/admin-raffle-sequence')->assertRedirect(route('login'));
    $this->put('/admin-raffle-sequence', ['slots' => ['member']])
        ->assertRedirect(route('login'));
});

test('participant list search and filters are paginated and retained across pages', function () {
    $this->actingAs(User::factory()->create());

    foreach (range(1, 16) as $number) {
        RaffleParticipant::query()->create([
            'raffle_number' => sprintf('TICKET-%02d', $number),
            'already_won' => true,
            'raffle_identification' => 'member',
        ]);
    }

    RaffleParticipant::query()->create([
        'raffle_number' => 'OTHER-01',
        'already_won' => true,
        'raffle_identification' => 'agency',
    ]);
    RaffleParticipant::query()->create([
        'raffle_number' => 'TICKET-REGULAR',
        'already_won' => false,
        'raffle_identification' => 'member',
    ]);

    $filters = 'search=TICKET&already_won=yes&raffle_identification=member';

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
            ->where('filters.raffle_identification', 'member')
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
            ->where('filters.raffle_identification', 'member')
        );
});

test('participant list rejects unsupported identification filters', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/admin-raffle-list?raffle_identification=company')
        ->assertSessionHasErrors('raffle_identification');
});

test('unassigned participants are visible to admins but never included in a draw pool', function () {
    $this->actingAs(User::factory()->create());

    RaffleParticipant::query()->create(['raffle_number' => 'UNASSIGNED-1']);

    $this->get('/admin-raffle-list?raffle_identification=unassigned')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('participants.total', 1)
            ->where('participants.data.0.raffle_identification', null)
            ->where('unassignedCount', 1)
        );

    $this->get('/')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('raffleNumbers', [])
            ->where('nextDraw.raffle_identification', 'member')
        );
});

test('raffle reset actions require authentication', function () {
    $participant = RaffleParticipant::query()->create([
        'raffle_number' => 'WINNER-1',
        'already_won' => true,
        'won_at' => now(),
    ]);

    $this->post('/admin-raffle-list/reset-winners')->assertRedirect(route('login'));
    $this->post('/admin-raffle-list/1/cancel-win')->assertRedirect(route('login'));
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

test('default sequence matches the supplied 20-prize schedule and can be resized', function () {
    $this->actingAs(User::factory()->create());

    $expectedSlots = [
        ['prize_position' => 20, 'raffle_identification' => 'member'],
        ['prize_position' => 19, 'raffle_identification' => 'agency'],
        ['prize_position' => 18, 'raffle_identification' => 'member'],
        ['prize_position' => 17, 'raffle_identification' => 'member'],
        ['prize_position' => 16, 'raffle_identification' => 'agency'],
        ['prize_position' => 15, 'raffle_identification' => 'member'],
        ['prize_position' => 14, 'raffle_identification' => 'member'],
        ['prize_position' => 13, 'raffle_identification' => 'agency'],
        ['prize_position' => 12, 'raffle_identification' => 'agency'],
        ['prize_position' => 11, 'raffle_identification' => 'member'],
        ['prize_position' => 10, 'raffle_identification' => 'agency'],
        ['prize_position' => 9, 'raffle_identification' => 'member'],
        ['prize_position' => 8, 'raffle_identification' => 'member'],
        ['prize_position' => 7, 'raffle_identification' => 'agency'],
        ['prize_position' => 6, 'raffle_identification' => 'member'],
        ['prize_position' => 5, 'raffle_identification' => 'member'],
        ['prize_position' => 4, 'raffle_identification' => 'member'],
        ['prize_position' => 3, 'raffle_identification' => 'agency'],
        ['prize_position' => 2, 'raffle_identification' => 'member'],
        ['prize_position' => 1, 'raffle_identification' => 'member'],
    ];

    $this->get('/admin-raffle-sequence')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('raffle/sequence')
            ->where('slots', $expectedSlots)
        );

    $this->put('/admin-raffle-sequence', [
        'slots' => [
            ['prize_position' => 3, 'raffle_identification' => 'member'],
            ['prize_position' => 2, 'raffle_identification' => 'agency'],
            ['prize_position' => 1, 'raffle_identification' => 'agency'],
        ],
    ])->assertRedirect()->assertSessionHas('success', 'Raffle sequence updated.');

    $this->assertDatabaseCount('raffle_prize_slots', 3);
    $this->assertDatabaseHas('raffle_prize_slots', [
        'prize_position' => 3,
        'sequence_order' => 1,
        'raffle_identification' => 'member',
    ]);
    $this->assertDatabaseHas('raffle_prize_slots', [
        'prize_position' => 2,
        'raffle_identification' => 'agency',
    ]);
    $this->assertDatabaseHas('raffle_prize_slots', [
        'prize_position' => 1,
        'sequence_order' => 3,
        'raffle_identification' => 'agency',
    ]);
});

test('pre-sequence winners remain saved and are reported separately from configured draws', function () {
    $this->actingAs(User::factory()->create());

    $winner = RaffleParticipant::query()->create([
        'raffle_number' => 'LEGACY-WINNER',
        'raffle_identification' => 'member',
        'already_won' => true,
        'won_at' => now(),
    ]);

    $this->get('/admin-raffle-sequence')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('completedDraws', 0)
            ->where('unsequencedWinnerCount', 1)
            ->where('completedPrizePositions', [])
        );

    expect($winner->fresh()->already_won)->toBeTrue();
});

test('each spin draws randomly from the configured category in reverse prize order', function () {
    $this->actingAs(User::factory()->create());

    $this->put('/admin-raffle-sequence', [
        'slots' => [
            ['prize_position' => 3, 'raffle_identification' => 'member'],
            ['prize_position' => 2, 'raffle_identification' => 'agency'],
            ['prize_position' => 1, 'raffle_identification' => 'member'],
        ],
    ])->assertRedirect();

    RaffleParticipant::query()->create([
        'raffle_number' => 'MEMBER-1',
        'raffle_identification' => 'member',
    ]);
    RaffleParticipant::query()->create([
        'raffle_number' => 'MEMBER-2',
        'raffle_identification' => 'member',
    ]);
    RaffleParticipant::query()->create([
        'raffle_number' => 'AGENCY-1',
        'raffle_identification' => 'agency',
    ]);

    $this->post('/raffle/spin')
        ->assertRedirect('/')
        ->assertSessionHas('winner.prize_position', 3)
        ->assertSessionHas('winner.spin_number', 1);
    $this->assertDatabaseHas('raffle_participants', [
        'prize_position' => 3,
        'raffle_identification' => 'member',
        'already_won' => true,
    ]);

    $this->post('/raffle/spin')
        ->assertRedirect('/')
        ->assertSessionHas('winner.prize_position', 2)
        ->assertSessionHas('winner.spin_number', 2);
    $this->assertDatabaseHas('raffle_participants', [
        'raffle_number' => 'AGENCY-1',
        'prize_position' => 2,
        'already_won' => true,
    ]);

    $this->post('/raffle/spin')
        ->assertRedirect('/')
        ->assertSessionHas('winner.prize_position', 1)
        ->assertSessionHas('winner.spin_number', 3);
    $this->assertDatabaseCount('raffle_participants', 3);
    expect(RaffleParticipant::query()->where('already_won', true)->count())->toBe(3);

    $this->post('/raffle/spin')->assertSessionHasErrors('raffle');
    expect(RaffleParticipant::query()->where('already_won', true)->count())->toBe(3);
});

test('a configured category without eligible participants cannot draw another category', function () {
    $this->actingAs(User::factory()->create());

    $this->put('/admin-raffle-sequence', [
        'slots' => [
            ['prize_position' => 1, 'raffle_identification' => 'agency'],
        ],
    ])->assertRedirect();
    $member = RaffleParticipant::query()->create([
        'raffle_number' => 'MEMBER-ONLY',
        'raffle_identification' => 'member',
    ]);

    $this->post('/raffle/spin')->assertSessionHasErrors('raffle');

    expect($member->fresh()->already_won)->toBeFalse();
});

test('pending sequence slots remain editable after a winner is recorded', function () {
    $this->actingAs(User::factory()->create());

    $this->put('/admin-raffle-sequence', [
        'slots' => [
            ['prize_position' => 2, 'raffle_identification' => 'member'],
            ['prize_position' => 1, 'raffle_identification' => 'member'],
        ],
    ])->assertRedirect();
    RaffleParticipant::query()->create([
        'raffle_number' => 'MEMBER-1',
        'raffle_identification' => 'member',
    ]);
    $this->post('/raffle/spin')->assertRedirect('/');

    $this->put('/admin-raffle-sequence', [
        'slots' => [
            ['prize_position' => 2, 'raffle_identification' => 'member'],
            ['prize_position' => 1, 'raffle_identification' => 'agency'],
        ],
    ])
        ->assertRedirect()
        ->assertSessionHas('success', 'Raffle sequence updated.');

    $this->assertDatabaseHas('raffle_prize_slots', [
        'prize_position' => 2,
        'sequence_order' => 1,
        'raffle_identification' => 'member',
    ]);
    $this->assertDatabaseHas('raffle_prize_slots', [
        'prize_position' => 1,
        'sequence_order' => 2,
        'raffle_identification' => 'agency',
    ]);
    $this->assertDatabaseHas('raffle_participants', [
        'raffle_number' => 'MEMBER-1',
        'already_won' => true,
        'prize_position' => 2,
    ]);

    RaffleParticipant::query()->create([
        'raffle_number' => 'AGENCY-1',
        'raffle_identification' => 'agency',
    ]);

    $this->get('/')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('nextDraw.prize_position', 1)
            ->where('nextDraw.raffle_identification', 'agency')
            ->where('raffleNumbers', ['AGENCY-1'])
        );

    $this->post('/raffle/spin')
        ->assertRedirect('/')
        ->assertSessionHas('winner.prize_position', 1)
        ->assertSessionHas('winner.raffle_identification', 'agency');
});

test('completed prize slots cannot be changed or removed while editing pending slots', function () {
    $this->actingAs(User::factory()->create());

    $this->put('/admin-raffle-sequence', [
        'slots' => [
            ['prize_position' => 2, 'raffle_identification' => 'member'],
            ['prize_position' => 1, 'raffle_identification' => 'member'],
        ],
    ])->assertRedirect();
    $winner = RaffleParticipant::query()->create([
        'raffle_number' => 'MEMBER-1',
        'raffle_identification' => 'member',
    ]);
    $this->post('/raffle/spin')->assertRedirect('/');
    $winner->refresh();

    $this->put('/admin-raffle-sequence', [
        'slots' => [
            ['prize_position' => 2, 'raffle_identification' => 'agency'],
            ['prize_position' => 1, 'raffle_identification' => 'agency'],
        ],
    ])
        ->assertRedirect()
        ->assertSessionHas('error', 'Prize slots with recorded winners cannot be removed or changed.');

    $this->put('/admin-raffle-sequence', [
        'slots' => [
            ['prize_position' => 1, 'raffle_identification' => 'agency'],
        ],
    ])
        ->assertRedirect()
        ->assertSessionHas('error', 'Prize slots with recorded winners cannot be removed or changed.');

    $this->assertDatabaseHas('raffle_prize_slots', [
        'prize_position' => 2,
        'raffle_identification' => 'member',
    ]);
    $this->assertDatabaseHas('raffle_participants', [
        'id' => $winner->id,
        'already_won' => true,
        'prize_position' => 2,
    ]);
});

test('sequence updates reject invalid winner pools', function () {
    $this->actingAs(User::factory()->create());

    $this->put('/admin-raffle-sequence', [
        'slots' => [
            ['prize_position' => 1, 'raffle_identification' => 'company'],
        ],
    ])->assertSessionHasErrors('slots.0.raffle_identification');

    $this->put('/admin-raffle-sequence', [
        'slots' => [
            ['prize_position' => 1, 'raffle_identification' => 'member'],
            ['prize_position' => 1, 'raffle_identification' => 'agency'],
        ],
    ])->assertSessionHasErrors('slots.1.prize_position');

    $this->put('/admin-raffle-sequence', [
        'slots' => [
            ['prize_position' => 1, 'raffle_identification' => 'all'],
        ],
    ])->assertRedirect()->assertSessionHas('success', 'Raffle sequence updated.');

    $this->assertDatabaseCount('raffle_prize_slots', 1);
});

test('all winner pool draws from members and agencies but excludes unassigned participants', function () {
    $this->actingAs(User::factory()->create());

    $this->put('/admin-raffle-sequence', [
        'slots' => [
            ['prize_position' => 2, 'raffle_identification' => 'all'],
            ['prize_position' => 1, 'raffle_identification' => 'all'],
        ],
    ])->assertRedirect();

    RaffleParticipant::query()->create([
        'raffle_number' => 'MEMBER-1',
        'raffle_identification' => 'member',
    ]);
    RaffleParticipant::query()->create([
        'raffle_number' => 'AGENCY-1',
        'raffle_identification' => 'agency',
    ]);
    $unassigned = RaffleParticipant::query()->create([
        'raffle_number' => 'UNASSIGNED-1',
    ]);

    $this->get('/')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('raffleNumbers', ['MEMBER-1', 'AGENCY-1'])
            ->where('nextDraw.raffle_identification', 'all')
        );

    $this->post('/raffle/spin')->assertRedirect('/');
    $this->post('/raffle/spin')->assertRedirect('/');

    $this->assertDatabaseHas('raffle_participants', [
        'raffle_number' => 'MEMBER-1',
        'already_won' => true,
    ]);
    $this->assertDatabaseHas('raffle_participants', [
        'raffle_number' => 'AGENCY-1',
        'already_won' => true,
    ]);
    expect($unassigned->fresh()->already_won)->toBeFalse();
});

test('new spins append after existing positions and preserve the original draw order', function () {
    $this->actingAs(User::factory()->create());

    $slots = RafflePrizeSlot::query()
        ->orderBy('sequence_order')
        ->get(['prize_position', 'raffle_identification'])
        ->map(fn (RafflePrizeSlot $slot): array => [
            'prize_position' => $slot->prize_position,
            'raffle_identification' => $slot->raffle_identification,
        ])
        ->all();
    $slots[] = [
        'prize_position' => 21,
        'raffle_identification' => 'agency',
    ];

    $this->put('/admin-raffle-sequence', ['slots' => $slots])
        ->assertRedirect()
        ->assertSessionHas('success', 'Raffle sequence updated.');

    $this->assertDatabaseHas('raffle_prize_slots', [
        'prize_position' => 20,
        'sequence_order' => 1,
        'raffle_identification' => 'member',
    ]);
    $this->assertDatabaseHas('raffle_prize_slots', [
        'prize_position' => 1,
        'sequence_order' => 20,
    ]);
    $this->assertDatabaseHas('raffle_prize_slots', [
        'prize_position' => 21,
        'sequence_order' => 21,
        'raffle_identification' => 'agency',
    ]);

    RaffleParticipant::query()->create([
        'raffle_number' => 'MEMBER-FIRST',
        'raffle_identification' => 'member',
    ]);
    RaffleParticipant::query()->create([
        'raffle_number' => 'AGENCY-LAST',
        'raffle_identification' => 'agency',
    ]);

    $this->get('/')
        ->assertInertia(fn ($page) => $page
            ->where('nextDraw.spin_number', 1)
            ->where('nextDraw.prize_position', 20)
        );

    $this->post('/raffle/spin')
        ->assertRedirect('/')
        ->assertSessionHas('winner.prize_position', 20)
        ->assertSessionHas('winner.spin_number', 1);

    foreach (range(1, 19) as $position) {
        RaffleParticipant::query()->create([
            'raffle_number' => "COMPLETED-{$position}",
            'raffle_identification' => 'member',
            'already_won' => true,
            'prize_position' => $position,
            'won_at' => now(),
        ]);
    }

    $this->get('/')
        ->assertInertia(fn ($page) => $page
            ->where('nextDraw.spin_number', 21)
            ->where('nextDraw.prize_position', 21)
            ->where('nextDraw.raffle_identification', 'agency')
        );

    $this->post('/raffle/spin')
        ->assertRedirect('/')
        ->assertSessionHas('winner.prize_position', 21)
        ->assertSessionHas('winner.spin_number', 21);
    $this->assertDatabaseHas('raffle_participants', [
        'raffle_number' => 'AGENCY-LAST',
        'already_won' => true,
        'prize_position' => 21,
    ]);
});

test('participants require a raffle identification when added', function () {
    $this->actingAs(User::factory()->create());

    $this->post('/admin-raffle-list', [
        'raffle_number' => '1001',
    ])->assertSessionHasErrors('raffle_identification');

    $this->post('/admin-raffle-list', [
        'raffle_number' => '1001',
        'raffle_identification' => 'company',
    ])->assertSessionHasErrors('raffle_identification');

    $this->post('/admin-raffle-list', [
        'raffle_number' => '1001',
        'raffle_identification' => 'agency',
    ])->assertRedirect();

    $this->assertDatabaseHas('raffle_participants', [
        'raffle_number' => '1001',
        'raffle_identification' => 'agency',
    ]);
});

test('won participants cannot be changed or deleted', function () {
    $this->actingAs(User::factory()->create());
    $participant = RaffleParticipant::query()->create([
        'raffle_number' => '1001',
        'raffle_identification' => 'agency',
        'already_won' => true,
        'prize_position' => 20,
        'won_at' => now(),
    ]);

    $this->put("/admin-raffle-list/{$participant->id}", [
        'raffle_number' => '2001',
        'raffle_identification' => 'member',
    ])->assertRedirect()->assertSessionHas('error', 'Winner records cannot be changed.');

    $this->delete("/admin-raffle-list/{$participant->id}")
        ->assertRedirect()
        ->assertSessionHas('error', 'Winner records cannot be deleted.');

    expect($participant->fresh()->raffle_number)->toBe('1001')
        ->and($participant->fresh()->raffle_identification)->toBe('agency')
        ->and($participant->fresh()->already_won)->toBeTrue();
});

test('resetting the raffle clears winner state but keeps participant identification', function () {
    $this->actingAs(User::factory()->create());

    $winner = RaffleParticipant::query()->create([
        'raffle_number' => 'WINNER-1',
        'raffle_identification' => 'agency',
        'already_won' => true,
        'prize_position' => 20,
        'won_at' => now(),
    ]);
    $regular = RaffleParticipant::query()->create([
        'raffle_number' => 'REGULAR-1',
        'raffle_identification' => 'member',
    ]);

    $this->post('/admin-raffle-list/reset-winners')
        ->assertRedirect()
        ->assertSessionHas('success', 'Raffle winners have been reset. All participants were kept.');

    $this->assertDatabaseCount('raffle_participants', 2);
    expect($winner->fresh()->already_won)->toBeFalse()
        ->and($winner->fresh()->won_at)->toBeNull()
        ->and($winner->fresh()->prize_position)->toBeNull()
        ->and($winner->fresh()->raffle_identification)->toBe('agency')
        ->and($regular->fresh()->already_won)->toBeFalse();
});

test('admin can cancel a win and the participant can be drawn again for the freed prize', function () {
    $this->actingAs(User::factory()->create());

    $winner = RaffleParticipant::query()->create([
        'raffle_number' => 'WINNER-1',
        'raffle_identification' => 'member',
        'already_won' => true,
        'prize_position' => 20,
        'won_at' => now(),
    ]);

    $this->post("/admin-raffle-list/{$winner->id}/cancel-win")
        ->assertRedirect()
        ->assertSessionHas('success', 'Winner status cancelled. The participant is eligible to win again.');

    $this->assertDatabaseHas('raffle_participants', [
        'id' => $winner->id,
        'already_won' => false,
        'prize_position' => null,
        'won_at' => null,
    ]);

    $this->get('/')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('nextDraw.prize_position', 20)
            ->where('raffleNumbers', ['WINNER-1'])
        );

    $this->post('/raffle/spin')
        ->assertRedirect('/')
        ->assertSessionHas('winner.prize_position', 20)
        ->assertSessionHas('winner.raffle_number', 'WINNER-1');
});

test('cancelling a win for a participant who has not won makes no changes', function () {
    $this->actingAs(User::factory()->create());
    $participant = RaffleParticipant::query()->create([
        'raffle_number' => 'MEMBER-1',
        'raffle_identification' => 'member',
    ]);

    $this->post("/admin-raffle-list/{$participant->id}/cancel-win")
        ->assertRedirect()
        ->assertSessionHas('error', 'This participant is not currently recorded as a winner.');

    $this->assertDatabaseHas('raffle_participants', [
        'id' => $participant->id,
        'already_won' => false,
        'prize_position' => null,
        'won_at' => null,
    ]);
});

test('clearing the raffle removes all participants and winner records', function () {
    $this->actingAs(User::factory()->create());

    RaffleParticipant::query()->create([
        'raffle_number' => 'WINNER-1',
        'already_won' => true,
        'won_at' => now(),
    ]);
    RaffleParticipant::query()->create([
        'raffle_number' => 'MEMBER-1',
        'raffle_identification' => 'member',
    ]);

    $this->delete('/admin-raffle-list/clear-all')
        ->assertRedirect()
        ->assertSessionHas('success', 'All participants and winner records have been cleared.');

    $this->assertDatabaseCount('raffle_participants', 0);
});

test('participants can be edited to change their raffle identification', function () {
    $this->actingAs(User::factory()->create());

    $participant = RaffleParticipant::query()->create(['raffle_number' => '1001']);

    $this->put("/admin-raffle-list/{$participant->id}", [
        'raffle_number' => '2001',
        'raffle_identification' => 'agency',
    ])->assertRedirect();

    expect($participant->fresh()->raffle_number)->toBe('2001')
        ->and($participant->fresh()->raffle_identification)->toBe('agency');
});

test('raffle page provides eligible numbers without participant or winner lists', function () {
    $this->actingAs(User::factory()->create());

    RaffleParticipant::query()->create([
        'raffle_number' => 'MEMBER-1',
        'raffle_identification' => 'member',
    ]);
    RaffleParticipant::query()->create([
        'raffle_number' => 'AGENCY-1',
        'raffle_identification' => 'agency',
    ]);
    RaffleParticipant::query()->create([
        'raffle_number' => 'WINNER-1',
        'raffle_identification' => 'member',
        'already_won' => true,
        'prize_position' => 20,
        'won_at' => now()->subMinute(),
    ]);
    RaffleParticipant::query()->create([
        'raffle_number' => 'WINNER-2',
        'raffle_identification' => 'member',
        'already_won' => true,
        'prize_position' => 19,
        'won_at' => now(),
    ]);

    $this->get('/')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('raffleNumbers', ['MEMBER-1'])
            ->where('nextDraw.spin_number', 3)
            ->where('nextDraw.prize_position', 18)
            ->where('nextDraw.raffle_identification', 'member')
            ->where('completedDraws', 2)
            ->where('totalDraws', 20)
            ->missing('participants')
            ->missing('winners')
            ->missing('winnerCount')
        );
});

test('CSV import template can be downloaded', function () {
    $this->actingAs(User::factory()->create());

    $template = $this->get('/admin-raffle-list/template');

    $template->assertOk()->assertDownload('raffle-participants-template.csv');
    expect($template->streamedContent())
        ->toContain('raffle_number,raffle_identification')
        ->toContain('1001,member');
});

test('CSV import rejects files that do not identify each participant', function () {
    $this->actingAs(User::factory()->create());

    $file = UploadedFile::fake()->createWithContent(
        'participants.csv',
        "raffle_number\n1001\n",
    );

    $this->post('/admin-raffle-list/import', ['file' => $file])
        ->assertSessionHasErrors('file');

    $this->assertDatabaseCount('raffle_participants', 0);
});

test('CSV import reports inserted duplicate and invalid rows without changing winners', function () {
    $this->actingAs(User::factory()->create());

    $existingWinner = RaffleParticipant::query()->create([
        'raffle_number' => '1001',
        'raffle_identification' => 'member',
        'already_won' => true,
        'prize_position' => 20,
        'won_at' => now(),
    ]);
    $file = UploadedFile::fake()->createWithContent(
        'participants.csv',
        "raffle_number,raffle_identification\n1002,agency\n1001,member\n,member\n1003,company\n",
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
        ->and(RaffleParticipant::query()
            ->where('raffle_number', '1002')
            ->where('raffle_identification', 'agency')
            ->exists())->toBeTrue()
        ->and(RaffleParticipant::query()->count())->toBe(2);
});

test('registration and starter dashboard routes are not available', function () {
    $this->get('/register')->assertNotFound();
    $this->get('/dashboard')->assertNotFound();
});
