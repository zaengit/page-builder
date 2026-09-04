package pagebuilder

import (
	"fmt"
	"regexp"
	"strings"
)

var (
	templateTag      = regexp.MustCompile(`{%\s*(.*?)\s*%}`)
	templateIf       = regexp.MustCompile(`^if\s+[A-Za-z0-9_.]+$`)
	templateFor      = regexp.MustCompile(`^for\s+[A-Za-z_][A-Za-z0-9_]*\s+in\s+[A-Za-z0-9_.]+$`)
	interpolation    = regexp.MustCompile(`{{\s*[A-Za-z0-9_.]+(?:\s*\?\?\s*(?:"[^"]*"|'[^']*'))?\s*}}`)
	rawChildrenToken = "{{{ children }}}"
)

// ValidateTemplate checks template-language v1 syntax without executing it.
func ValidateTemplate(template string) error {
	withoutChildren := strings.ReplaceAll(template, rawChildrenToken, "")
	if strings.Contains(withoutChildren, "{{{") || strings.Contains(withoutChildren, "}}}") {
		return fmt.Errorf("invalid raw interpolation; only %s is supported", rawChildrenToken)
	}

	stripped := interpolation.ReplaceAllString(withoutChildren, "")
	if strings.Contains(stripped, "{{") || strings.Contains(stripped, "}}") {
		return fmt.Errorf("invalid interpolation syntax")
	}

	stack := []string{}
	matches := templateTag.FindAllStringSubmatchIndex(stripped, -1)
	cursor := 0
	for _, match := range matches {
		if strings.Contains(stripped[cursor:match[0]], "{%") || strings.Contains(stripped[cursor:match[0]], "%}") {
			return fmt.Errorf("invalid control tag syntax")
		}
		content := strings.TrimSpace(stripped[match[2]:match[3]])
		switch {
		case templateIf.MatchString(content):
			stack = append(stack, "if")
		case content == "endif":
			if len(stack) == 0 || stack[len(stack)-1] != "if" {
				return fmt.Errorf("unexpected endif")
			}
			stack = stack[:len(stack)-1]
		case templateFor.MatchString(content):
			stack = append(stack, "for")
		case content == "endfor":
			if len(stack) == 0 || stack[len(stack)-1] != "for" {
				return fmt.Errorf("unexpected endfor")
			}
			stack = stack[:len(stack)-1]
		default:
			return fmt.Errorf("unsupported control tag %q", content)
		}
		cursor = match[1]
	}
	if strings.Contains(stripped[cursor:], "{%") || strings.Contains(stripped[cursor:], "%}") {
		return fmt.Errorf("invalid control tag syntax")
	}
	if len(stack) != 0 {
		return fmt.Errorf("unclosed %s block", stack[len(stack)-1])
	}
	return nil
}
