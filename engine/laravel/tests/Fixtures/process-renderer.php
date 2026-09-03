<?php

$request = json_decode(stream_get_contents(STDIN), true, flags: JSON_THROW_ON_ERROR);

if (($request['version'] ?? null) !== 1) {
    fwrite(STDERR, "bad version\n");
    exit(2);
}

$text = $request['page']['blocks'][0]['attrs']['text'] ?? '';

echo json_encode([
    'html' => '<main data-engine="fixture">'.htmlspecialchars((string) $text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8').'</main>',
    'assets' => ['css' => ['fixture.css'], 'js' => ['fixture.js']],
    'diagnostics' => [[
        'code' => 'fixture:ok',
        'severity' => 'warning',
        'path' => null,
        'message' => null,
    ]],
], JSON_THROW_ON_ERROR);
