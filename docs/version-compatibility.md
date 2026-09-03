# Version Compatibility

| Concern | Current canonical version | Laravel engine | Go engine | Editor |
| --- | ---: | ---: | ---: | ---: |
| Specification | 1 | 1 | 1 | 1 |
| Page document | 1 | 1 | 1 | 1 |
| Block manifest | 1 | 1 | 1 | 1 |
| Datasource contract | 1 | 1 | 1 | 1 |
| Renderer protocol | 1 | 1 | 1 | 1 |
| Template language | 1 | 1 | 1 | 1 |

Backward-compatible additions may be introduced within a version only when old consumers can safely ignore them. Changes to persisted meaning, required fields, template grammar, protocol envelopes, or rendering output require a version bump and migration/conformance policy update.
