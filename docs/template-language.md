# Template Language Reference

The canonical template is `template.html`. Version 1 supports escaped interpolation (`{{ path }}`), string fallback (`{{ path ?? "fallback" }}`), conditions (`{% if path %}...{% endif %}`), list loops (`{% for item in path %}...{% endfor %}`), loop metadata, and the raw nested-child insertion point `{{{ children }}}`.

Path traversal uses dot-separated object/map properties. Missing paths and null interpolate as an empty string unless a fallback is present. Booleans serialize as `1`/empty, numbers use base-10 textual form, and arrays/objects are not implicitly serialized. Interpolation is HTML escaped; only the dedicated `children` slot is raw.

Truthiness is fixed by `specification/rendering-spec.md`: null, false, numeric zero, empty string, and empty list are false. The string `"0"`, non-empty lists, and objects are true. Loops iterate lists only and preserve order.

Any syntax added in the future requires a template-language version change and shared conformance fixtures before an engine may claim support.
