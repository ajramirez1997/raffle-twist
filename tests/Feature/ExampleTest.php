<?php

test('unauthenticated visitors are sent to the login page', function () {
    $response = $this->get('/');

    $response->assertRedirect(route('login'));
});
