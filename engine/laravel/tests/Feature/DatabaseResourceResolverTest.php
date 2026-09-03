<?php

namespace Tests\Feature;

use Illuminate\Database\Eloquent\Model;
use InvalidArgumentException;
use Tests\TestCase;
use Zaengit\PageBuilder\DataProviders\DatabaseResourceResolver;

final class DatabaseResourceResolverTest extends TestCase
{
    public function test_it_resolves_language_agnostic_resource_to_eloquent_model(): void
    {
        config()->set('page-builder.data.resources', [
            'products' => UniversalResourceTestModel::class,
        ]);

        $resolver = app(DatabaseResourceResolver::class);

        $this->assertSame(
            UniversalResourceTestModel::class,
            $resolver->modelClass(['resource' => 'products']),
        );
    }

    public function test_it_rejects_unknown_resources(): void
    {
        config()->set('page-builder.data.resources', []);

        $this->expectException(InvalidArgumentException::class);

        app(DatabaseResourceResolver::class)->modelClass(['resource' => 'secrets']);
    }
}

final class UniversalResourceTestModel extends Model
{
    protected $table = 'universal_resource_test_models';
}
