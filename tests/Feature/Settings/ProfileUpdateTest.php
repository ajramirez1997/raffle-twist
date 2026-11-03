<?php

test('account profile pages are not available', function () {
    $this->get('/settings/profile')->assertNotFound();
});
