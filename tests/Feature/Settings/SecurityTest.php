<?php

test('account security pages are not available', function () {
    $this->get('/settings/security')->assertNotFound();
});
