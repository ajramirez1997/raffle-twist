<?php

use App\Models\User;

test('guests are redirected to login from the raffle page', function () {
    $this->get('/')->assertRedirect(route('login'));
});

test('authenticated administrators can visit the raffle page', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/')->assertOk()->assertInertia(fn ($page) => $page->component('raffle/index'));
});
