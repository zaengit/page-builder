<?php

$request = json_decode(stream_get_contents(STDIN), true, flags: JSON_THROW_ON_ERROR);

if (($request['version'] ?? null) !== 1) {
    fwrite(STDERR, "bad version\n");
    exit(2);
}

echo json_encode([
    'html' => '<main data-engine="fixture">'.htmlspecialchars((string) ($request['page']['title'] ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8').'</main>',
    'assets' => ['css' => ['fixture.css'], 'js' => ['fixture.js']],
    'diagnostics' => ['fixture:ok'],
], JSON_THROW_ON_ERROR);
