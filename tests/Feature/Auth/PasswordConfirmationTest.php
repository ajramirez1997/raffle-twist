<?php

test('password confirmation page is not available', function () {
    $this->get('/user/confirm-password')->assertMethodNotAllowed();
});
