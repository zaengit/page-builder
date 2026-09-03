<?php

namespace Zaengit\PageBuilder\Http\Controllers;

use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class MediaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $disk = $this->disk();
        $directory = $this->directory();
        $query = Str::lower(trim((string) $request->query('q', '')));

        $items = collect(Storage::disk($disk)->files($directory))
            ->filter(fn (string $path): bool => $this->isImage($disk, $path))
            ->filter(fn (string $path): bool => $query === '' || Str::contains(Str::lower(basename($path)), $query))
            ->map(fn (string $path): array => $this->mediaItem($disk, $path))
            ->sortByDesc('updatedAt')
            ->values()
            ->take(max(1, (int) config('page-builder.media.max_items', 250)))
            ->all();

        return response()->json(['data' => $items]);
    }

    public function store(Request $request): JsonResponse
    {
        $maxKb = max(1, (int) config('page-builder.media.max_upload_kb', 10240));
        $request->validate([
            'file' => ['required', 'file', 'image', 'max:'.$maxKb],
        ]);

        $file = $request->file('file');
        abort_unless($file instanceof UploadedFile, 422);

        $disk = $this->disk();
        $directory = $this->directory();
        $extension = Str::lower($file->guessExtension() ?: $file->getClientOriginalExtension() ?: 'jpg');
        $base = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME));
        $base = $base !== '' ? $base : 'image';
        $filename = $base.'-'.Str::lower(Str::random(10)).'.'.$extension;
        $path = $file->storeAs($directory, $filename, $disk);

        abort_unless(is_string($path) && $path !== '', 500, 'Unable to store media file.');

        return response()->json(['data' => $this->mediaItem($disk, $path)], 201);
    }

    public function show(string $media): StreamedResponse
    {
        $disk = $this->adapter($this->disk());
        $path = $this->pathFor($media);
        abort_unless($disk->exists($path), 404);
        abort_unless($this->isImageAdapter($disk, $path), 404);

        return $disk->response($path, basename($path), [
            'Cache-Control' => 'public, max-age=31536000, immutable',
            'Content-Type' => $disk->mimeType($path) ?: 'application/octet-stream',
        ]);
    }

    public function destroy(string $media): JsonResponse
    {
        $disk = $this->adapter($this->disk());
        $path = $this->pathFor($media);
        abort_unless($disk->exists($path), 404);
        abort_unless($disk->delete($path), 500, 'Unable to delete media file.');

        return response()->json(['deleted' => true]);
    }

    private function mediaItem(string $disk, string $path): array
    {
        $diskInstance = $this->adapter($disk);
        $filename = basename($path);

        return [
            'id' => $filename,
            'name' => $filename,
            'url' => route('page-builder.media.show', ['media' => $filename]),
            'mimeType' => $diskInstance->mimeType($path) ?: 'application/octet-stream',
            'size' => $diskInstance->size($path),
            'updatedAt' => $diskInstance->lastModified($path),
        ];
    }

    private function pathFor(string $media): string
    {
        abort_if($media !== basename($media) || str_contains($media, '..'), 404);

        return $this->directory().'/'.$media;
    }

    private function isImage(string $disk, string $path): bool
    {
        return $this->isImageAdapter($this->adapter($disk), $path);
    }

    private function isImageAdapter(FilesystemAdapter $disk, string $path): bool
    {
        return Str::startsWith((string) $disk->mimeType($path), 'image/');
    }

    private function adapter(string $disk): FilesystemAdapter
    {
        /** @var FilesystemAdapter $adapter */
        $adapter = Storage::disk($disk);

        return $adapter;
    }

    private function disk(): string
    {
        return (string) config('page-builder.media.disk', 'public');
    }

    private function directory(): string
    {
        return trim((string) config('page-builder.media.directory', 'page-builder/media'), '/');
    }
}
