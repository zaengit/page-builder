<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Symfony\Component\Console\Command\Command;
use Tests\TestCase;

final class ProductionDoctorTest extends TestCase
{
    public function test_doctor_fails_when_required_editor_assets_are_missing(): void
    {
        $directory = sys_get_temp_dir().'/page-builder-missing-'.bin2hex(random_bytes(6));
        config()->set('page-builder.editor_asset_mode', 'route');
        config()->set('page-builder.editor_dist_path', $directory);
        config()->set('page-builder.middleware', ['web', 'auth']);

        $this->assertSame(Command::FAILURE, Artisan::call('page-builder:doctor'));
        $this->assertStringContainsString('Missing or unreadable editor asset', Artisan::output());
    }

    public function test_doctor_passes_public_asset_mode_with_protected_routes(): void
    {
        $relative = 'page-builder-doctor-'.bin2hex(random_bytes(6));
        $directory = public_path($relative);
        File::ensureDirectoryExists($directory);
        file_put_contents($directory.'/page-builder.js', 'console.log("ok")');
        file_put_contents($directory.'/page-builder.css', '.pb{display:block}');

        config()->set('page-builder.editor_asset_mode', 'public');
        config()->set('page-builder.editor_public_path', $relative);
        config()->set('page-builder.middleware', ['web', 'auth', 'throttle:60,1']);

        try {
            $this->assertSame(Command::SUCCESS, Artisan::call('page-builder:doctor'));
            $output = Artisan::output();
            $this->assertStringContainsString('production diagnostics passed', $output);
            $this->assertStringContainsString('Block manifests', $output);
            $this->assertStringContainsString('Resource limits', $output);
        } finally {
            File::deleteDirectory($directory);
        }
    }

    public function test_doctor_warns_for_unprotected_routes_and_strict_mode_fails(): void
    {
        $directory = sys_get_temp_dir().'/page-builder-dist-'.bin2hex(random_bytes(6));
        File::ensureDirectoryExists($directory);
        file_put_contents($directory.'/page-builder.js', 'console.log("ok")');
        file_put_contents($directory.'/page-builder.css', '.pb{display:block}');

        config()->set('page-builder.editor_asset_mode', 'route');
        config()->set('page-builder.editor_dist_path', $directory);
        config()->set('page-builder.middleware', []);

        try {
            $this->assertSame(Command::SUCCESS, Artisan::call('page-builder:doctor'));
            $this->assertStringContainsString('production warnings require review', Artisan::output());

            $this->assertSame(Command::FAILURE, Artisan::call('page-builder:doctor', ['--strict' => true]));
            $this->assertStringContainsString('production diagnostics failed', Artisan::output());
        } finally {
            File::deleteDirectory($directory);
        }
    }

    public function test_doctor_rejects_invalid_asset_mode(): void
    {
        config()->set('page-builder.editor_asset_mode', 'unknown');
        config()->set('page-builder.middleware', ['web']);

        $this->assertSame(Command::FAILURE, Artisan::call('page-builder:doctor'));
        $this->assertStringContainsString('Unsupported editor asset mode', Artisan::output());
    }
}
