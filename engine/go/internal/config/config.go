package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	RenderTimeout time.Duration
	Capabilities  map[string]bool
}

func Load() Config {
	timeout := 5 * time.Second
	if raw := os.Getenv("PAGE_BUILDER_RENDER_TIMEOUT_MS"); raw != "" {
		if ms, err := strconv.Atoi(raw); err == nil && ms > 0 {
			timeout = time.Duration(ms) * time.Millisecond
		}
	}

	return Config{
		RenderTimeout: timeout,
		Capabilities: map[string]bool{
			"portable-blocks":    true,
			"template-v1":        true,
			"responsive-layout":  true,
			"design-tokens":      true,
			"structured-errors":  true,
			"datasource-adapter": true,
		},
	}
}
