<?php

namespace Tests\Engine\Laravel;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;
use Zaengit\PageBuilder\Engine\Laravel\LaravelDatasourceResolver;

final class DatasourceResolverTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('pb_datasource_products');
        Schema::create('pb_datasource_products', function (Blueprint $table): void {
            $table->increments('id');
            $table->string('name');
            $table->string('status');
            $table->integer('position');
        });

        foreach ([
            ['name' => 'One', 'status' => 'published', 'position' => 10],
            ['name' => 'Two', 'status' => 'published', 'position' => 20],
            ['name' => 'Draft', 'status' => 'draft', 'position' => 25],
            ['name' => 'Three', 'status' => 'published', 'position' => 30],
            ['name' => 'Four', 'status' => 'published', 'position' => 40],
            ['name' => 'Five', 'status' => 'published', 'position' => 50],
        ] as $row) {
            DatasourceProduct::query()->create($row);
        }

        config()->set('page-builder.data.resources.products', DatasourceProduct::class);
        config()->set('page-builder.data.max_results', 100);
    }

    public function test_collection_supports_filter_order_limit_and_offset(): void
    {
        $result = app(LaravelDatasourceResolver::class)->resolve([
            'source' => 'database',
            'resource' => 'products',
            'mode' => 'collection',
            'query' => [
                'where' => [['column' => 'status', 'operator' => '=', 'value' => 'published']],
                'orderBy' => [['column' => 'position', 'direction' => 'asc']],
                'limit' => 2,
                'offset' => 1,
            ],
        ], [], []);

        $this->assertSame(['Two', 'Three'], array_column($result['items'], 'name'));
        $this->assertNull($result['pagination']);
    }

    public function test_collection_supports_page_and_per_page_metadata(): void
    {
        $result = app(LaravelDatasourceResolver::class)->resolve([
            'source' => 'database',
            'resource' => 'products',
            'mode' => 'collection',
            'query' => [
                'where' => [['column' => 'status', 'operator' => '=', 'value' => 'published']],
                'orderBy' => [['column' => 'position', 'direction' => 'asc']],
                'perPage' => 2,
                'page' => 2,
            ],
        ], [], []);

        $this->assertSame(['Three', 'Four'], array_column($result['items'], 'name'));
        $this->assertSame([
            'currentPage' => 2,
            'perPage' => 2,
            'lastPage' => 3,
            'total' => 5,
            'hasMorePages' => true,
        ], $result['pagination']);
    }

    public function test_single_record_can_be_selected_from_runtime_context(): void
    {
        $result = app(LaravelDatasourceResolver::class)->resolve([
            'source' => 'database',
            'resource' => 'products',
            'mode' => 'single',
            'contextKey' => 'currentProduct.id',
        ], [], [
            'currentProduct' => ['id' => 5],
        ]);

        $this->assertSame('Four', $result['name']);
    }
}

final class DatasourceProduct extends Model
{
    protected $table = 'pb_datasource_products';

    public $timestamps = false;

    protected $guarded = [];
}
