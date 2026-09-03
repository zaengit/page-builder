<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // This repository is a package, so it intentionally has no app/ namespace.
        // Point Laravel's test harness at the package PSR-4 root so Blade's
        // component compiler can resolve a namespace exactly as it would inside
        // a normal host Laravel application.
        $this->app->useAppPath(base_path('src'));
    }
}
