package pagebuilder

import (
	"context"
	"fmt"
	"html"
	"regexp"
	"sort"
	"strconv"
	"strings"
)

type RenderRequest struct { Page map[string]any; Registry map[string]map[string]any; Context map[string]any }
type Assets struct { CSS []string `json:"css"`; JS []string `json:"js"` }
type Diagnostic struct { Code string `json:"code"`; Severity string `json:"severity"`; Path *string `json:"path"`; Message *string `json:"message"` }
type RenderResult struct { HTML string `json:"html"`; Assets Assets `json:"assets"`; Diagnostics []Diagnostic `json:"diagnostics"` }
type DataProvider interface { Resolve(ctx context.Context, binding map[string]any, attrs map[string]any, runtime map[string]any) (any, error) }
type Renderer interface { Render(ctx context.Context, request RenderRequest) (RenderResult, error) }
type UniversalRenderer struct { Provider DataProvider }
func New() *UniversalRenderer { return &UniversalRenderer{} }
func NewWithProvider(provider DataProvider) *UniversalRenderer { return &UniversalRenderer{Provider: provider} }

func (r *UniversalRenderer) Render(ctx context.Context, request RenderRequest) (RenderResult, error) {
	result := RenderResult{Assets: Assets{CSS: []string{}, JS: []string{}}, Diagnostics: []Diagnostic{}}
	if version := pageVersion(request.Page); version != SpecificationVersion { result.Diagnostics = append(result.Diagnostics, diagnostic("unsupported_page_version", "error", "$.version", fmt.Sprintf("%d", version))); return result, nil }
	cssSeen, jsSeen := map[string]bool{}, map[string]bool{}
	blocks, _ := request.Page["blocks"].([]any)
	var body strings.Builder
	for i, raw := range blocks { if block, ok := raw.(map[string]any); ok { body.WriteString(r.renderBlock(ctx, block, request.Registry, request.Context, &result, cssSeen, jsSeen, nil, fmt.Sprintf("$.blocks[%d]", i))) } }
	result.HTML = wrapPage(request.Page, body.String())
	return result, nil
}

func (r *UniversalRenderer) renderBlock(ctx context.Context, block map[string]any, registry map[string]map[string]any, runtime map[string]any, result *RenderResult, cssSeen, jsSeen map[string]bool, parentLayout map[string]any, path string) string {
	typeName, _ := block["type"].(string); definition, ok := registry[typeName]
	if !ok { result.Diagnostics = append(result.Diagnostics, diagnostic("unknown_block", "warning", path+".type", typeName)); return "" }
	collectAssets(definition, result, cssSeen, jsSeen)
	attrs := defaults(definition); if blockAttrs, ok := block["attrs"].(map[string]any); ok { for k, v := range blockAttrs { attrs[k] = v } }
	bindings, _ := block["bindings"].(map[string]any)
	for attribute, raw := range bindings { binding, ok := raw.(map[string]any); if !ok { continue }; source, _ := binding["source"].(string); var value any
		if source == "context" { pathValue, _ := binding["path"].(string); value = resolve(runtime, pathValue) } else if r.Provider != nil && source != "" { data, err := r.Provider.Resolve(ctx, binding, attrs, runtime); if err != nil { result.Diagnostics = append(result.Diagnostics, diagnostic("datasource_error", "warning", path+".bindings."+attribute, err.Error())) } else { bindingPath, _ := binding["path"].(string); value = resolveAny(data, bindingPath) } }
		if value == nil { if fallback, exists := binding["fallback"]; exists { value = fallback } }; if value != nil { attrs[attribute] = value }
	}
	layout, _ := block["layout"].(map[string]any)
	var children strings.Builder; if rawChildren, ok := block["children"].([]any); ok { for i, raw := range rawChildren { if child, ok := raw.(map[string]any); ok { children.WriteString(r.renderBlock(ctx, child, registry, runtime, result, cssSeen, jsSeen, layout, fmt.Sprintf("%s.children[%d]", path, i))) } } }
	template, _ := definition["template"].(string); rendered := RenderTemplate(template, map[string]any{"attrs": attrs, "context": runtime, "children": children.String(), "blockId": block["id"], "slot": block["slot"], "preview": false})
	return wrapBlock(block, rendered, parentLayout)
}

func wrapBlock(block map[string]any, rendered string, parentLayout map[string]any) string {
	id := fmt.Sprint(block["id"]); escapedID := html.EscapeString(id)
	styles, _ := block["styles"].(map[string]any); style, styleCSS := serializeStyles(styles, id)
	layout, _ := block["layout"].(map[string]any); item, _ := block["layoutItem"].(map[string]any); layoutStyle, layoutCSS := serializeLayout(layout, item, parentLayout, id)
	inlineStyle := strings.Trim(style+";"+layoutStyle, ";")
	slot := ""; if value, ok := block["slot"]; ok && value != nil { slot = ` data-pb-slot="` + html.EscapeString(fmt.Sprint(value)) + `"` }
	scheme := ""; if value, ok := block["colorSchemeId"].(string); ok && value != "" { safe := identifier(value); scheme = ` class="pb-color-scheme--` + html.EscapeString(safe) + `" data-pb-color-scheme="` + html.EscapeString(value) + `"` }
	responsive := styleCSS + layoutCSS
	out := `<div data-pb-style-id="` + escapedID + `" data-pb-id="` + escapedID + `"` + scheme + slot + ` style="` + html.EscapeString(inlineStyle) + `">` + rendered + `</div>`
	if responsive != "" { out += `<style data-pb-responsive="` + escapedID + `">` + safeStyleBody(responsive) + `</style>` }
	return out
}

func wrapPage(page map[string]any, body string) string {
	settings, _ := page["settings"].(map[string]any); schemes := map[string]map[string]any{}; order := []string{}
	if raw, ok := settings["colorSchemes"].([]any); ok { for _, value := range raw { if scheme, ok := value.(map[string]any); ok { if id, ok := scheme["id"].(string); ok { if _, exists := schemes[id]; !exists { order = append(order, id) }; schemes[id] = scheme } } } }
	defaultID, _ := settings["defaultColorSchemeId"].(string); if _, ok := schemes[defaultID]; !ok { if len(order) > 0 { defaultID = order[0] } else { defaultID = "" } }
	className := "pb-page"; if defaultID != "" { className += " pb-color-scheme--"+identifier(defaultID) }; if custom, ok := settings["customClass"].(string); ok && custom != "" { className += " "+custom }
	style := []string{}; if value, ok := settings["contentWidth"]; ok { style = append(style, "max-width:"+cssValue(fmt.Sprint(value))) }; if value, ok := settings["background"]; ok { style = append(style, "background:"+cssValue(fmt.Sprint(value))) }
	if tokens, ok := settings["tokens"].(map[string]any); ok { keys:=make([]string,0,len(tokens)); for k:=range tokens{keys=append(keys,k)};sort.Strings(keys);for _,k:=range keys{switch tokens[k].(type){case string,float64,float32,int,int64,bool: style=append(style,"--pb-"+identifier(k)+":"+cssValue(fmt.Sprint(tokens[k])))} } }
	out := `<div class="`+html.EscapeString(strings.TrimSpace(className))+`" style="`+html.EscapeString(strings.Join(style,";"))+`">`+body+`</div>`
	schemeCSS := ""; for _, id := range order { scheme:=schemes[id]; colors,_:=scheme["colors"].(map[string]any); keys:=make([]string,0,len(colors));for k:=range colors{keys=append(keys,k)};sort.Strings(keys);decl:="";for _,k:=range keys{decl += "--pb-color-"+identifier(k)+":"+cssValue(fmt.Sprint(colors[k]))+";"};if decl!=""{schemeCSS += ".pb-color-scheme--"+identifier(id)+"{"+decl+"background-color:var(--pb-color-background);color:var(--pb-color-foreground);}"} }
	if schemeCSS!="" { out += `<style data-pb-color-schemes>`+schemeCSS+`</style>` }; if typography:=typographyCSS(settings["typography"]); typography!="" { out += `<style data-pb-typography>`+typography+`</style>` }; if custom,ok:=settings["customCss"].(string);ok&&custom!=""{out += `<style data-pb-page-css>`+safeStyleBody(custom)+`</style>`}
	return out
}

var styleAllowed = map[string]string{"background":"background","color":"color","padding":"padding","margin":"margin","gap":"gap","width":"width","textAlign":"text-align","fontSize":"font-size","borderRadius":"border-radius","boxShadow":"box-shadow"}
func serializeStyles(styles map[string]any, id string)(string,string){base:=[]string{};resp:=map[string][]string{"tablet":{},"mobile":{}};keys:=make([]string,0,len(styleAllowed));for k:=range styleAllowed{keys=append(keys,k)};sort.Strings(keys);for _,key:=range keys{property:=styleAllowed[key];value,ok:=styles[key];if!ok{continue};if m,ok:=value.(map[string]any);ok{if v,ok:=m["desktop"];ok{base=append(base,property+":"+cssValue(fmt.Sprint(v)))};for _,bp:=range []string{"tablet","mobile"}{if v,ok:=m[bp];ok{resp[bp]=append(resp[bp],property+":"+cssValue(fmt.Sprint(v)))}}}else{base=append(base,property+":"+cssValue(fmt.Sprint(value)))}};if hidden,ok:=styles["hidden"].(map[string]any);ok{if hidden["desktop"]==true{base=append(base,"display:none")};for _,bp:=range []string{"tablet","mobile"}{if hidden[bp]==true{resp[bp]=append(resp[bp],"display:none")}}};selector:=`[data-pb-style-id="`+strings.ReplaceAll(strings.ReplaceAll(id,`"`,""),`\`,"")+`"]`;css:="";if len(resp["tablet"])>0{css+="@media(max-width:1024px){"+selector+"{"+strings.Join(resp["tablet"],";")+"}}"};if len(resp["mobile"])>0{css+="@media(max-width:640px){"+selector+"{"+strings.Join(resp["mobile"],";")+"}}"};return strings.Join(base,";"),css}
func serializeLayout(layout,item,parent map[string]any,id string)(string,string){base:=append(containerRules(layout,"desktop"),itemRules(item,parent,"desktop")...);selector:=`[data-pb-style-id="`+strings.ReplaceAll(strings.ReplaceAll(id,`"`,""),`\`,"")+`"]`;css:="";for _,spec:=range []struct{bp string;width int}{{"tablet",1024},{"mobile",640}}{rules:=append(containerRules(layout,spec.bp),itemRules(item,parent,spec.bp)...);if len(rules)>0{css+=fmt.Sprintf("@media(max-width:%dpx){%s{%s}}",spec.width,selector,strings.Join(rules,";"))}};return strings.Join(base,";"),css}
func containerRules(layout map[string]any,bp string)[]string{if len(layout)==0{return nil};mode:=fmt.Sprint(responsive(layout["mode"],bp,"block"));if mode=="flex"{gap:=fmt.Sprint(responsive(layout["gap"],bp,"0px"));return []string{"display:flex","flex-direction:"+cssValue(fmt.Sprint(responsive(layout["flexDirection"],bp,"row"))),"flex-wrap:"+cssValue(fmt.Sprint(responsive(layout["flexWrap"],bp,"nowrap"))),"justify-content:"+cssValue(fmt.Sprint(responsive(layout["justifyContent"],bp,"flex-start"))),"align-items:"+cssValue(fmt.Sprint(responsive(layout["alignItems"],bp,"stretch"))),"align-content:"+cssValue(fmt.Sprint(responsive(layout["alignContent"],bp,"stretch"))),"gap:"+cssValue(gap),"row-gap:"+cssValue(fmt.Sprint(responsive(layout["rowGap"],bp,gap))),"column-gap:"+cssValue(fmt.Sprint(responsive(layout["columnGap"],bp,gap)))}};if mode=="grid"{columns:=maxInt(1,toInt(responsive(layout["gridColumns"],bp,1)));rows:=responsive(layout["gridRows"],bp,"auto");gap:=fmt.Sprint(responsive(layout["gap"],bp,"0px"));rules:=[]string{"display:grid",fmt.Sprintf("grid-template-columns:repeat(%d,minmax(0,1fr))",columns),"grid-auto-flow:"+cssValue(fmt.Sprint(responsive(layout["gridAutoFlow"],bp,"row"))),"gap:"+cssValue(gap),"row-gap:"+cssValue(fmt.Sprint(responsive(layout["rowGap"],bp,gap))),"column-gap:"+cssValue(fmt.Sprint(responsive(layout["columnGap"],bp,gap)))};if fmt.Sprint(rows)!="auto"{rules=append(rules,fmt.Sprintf("grid-template-rows:repeat(%d,minmax(0,auto))",maxInt(1,toInt(rows))))};return rules};return []string{"display:block"}}
func itemRules(item,parent map[string]any,bp string)[]string{if len(item)==0||len(parent)==0{return nil};mode:=fmt.Sprint(responsive(parent["mode"],bp,"block"));if mode=="flex"{return []string{"flex-grow:"+numberString(maxFloat(0,toFloat(responsive(item["flexGrow"],bp,0)))),"flex-shrink:"+numberString(maxFloat(0,toFloat(responsive(item["flexShrink"],bp,1)))),"flex-basis:"+cssValue(fmt.Sprint(responsive(item["flexBasis"],bp,"auto"))),"align-self:"+cssValue(fmt.Sprint(responsive(item["alignSelf"],bp,"auto"))),"order:"+strconv.Itoa(toInt(responsive(item["order"],bp,0)))}};if mode=="grid"{cs:=maxInt(1,toInt(responsive(item["columnSpan"],bp,1)));rs:=maxInt(1,toInt(responsive(item["rowSpan"],bp,1)));cstart:=responsive(item["columnStart"],bp,"auto");rstart:=responsive(item["rowStart"],bp,"auto");column:=fmt.Sprintf("span %d",cs);row:=fmt.Sprintf("span %d",rs);if fmt.Sprint(cstart)!="auto"{column=fmt.Sprintf("%d / span %d",maxInt(1,toInt(cstart)),cs)};if fmt.Sprint(rstart)!="auto"{row=fmt.Sprintf("%d / span %d",maxInt(1,toInt(rstart)),rs)};return []string{"grid-column:"+column,"grid-row:"+row}};return nil}
func typographyCSS(raw any)string{t,ok:=raw.(map[string]any);if!ok{return ""};families,_:=t["families"].(map[string]any);styles,_:=t["styles"].(map[string]any);defaults:=map[string]string{"primary":"ui-sans-serif,system-ui,sans-serif","secondary":"Georgia,Cambria,serif","monospace":"ui-monospace,SFMono-Regular,Menlo,monospace"};root:="";for _,name:=range []string{"primary","secondary","monospace"}{v:=defaults[name];if s,ok:=families[name].(string);ok&&strings.TrimSpace(s)!=""{v=s};root+="--pb-font-"+name+":"+cssValue(v)+";"};css:=".pb-page{"+root+"font-family:var(--pb-font-primary);}";selectors:=map[string]string{"h1":"h1,.pb-text-h1","h2":"h2,.pb-text-h2","h3":"h3,.pb-text-h3","h4":"h4,.pb-text-h4","h5":"h5,.pb-text-h5","h6":"h6,.pb-text-h6","body":"p,.pb-text-body","bodySmall":".pb-text-body-small","caption":".pb-text-caption","label":"label,.pb-text-label","button":"button,.pb-text-button"};order:=[]string{"h1","h2","h3","h4","h5","h6","body","bodySmall","caption","label","button"};for _,name:=range order{s,ok:=styles[name].(map[string]any);if!ok||len(s)==0{continue};family:="primary";if f,ok:=s["family"].(string);ok&&(f=="primary"||f=="secondary"||f=="monospace"){family=f};decl:="font-family:var(--pb-font-"+family+");";for _,spec:=range []struct{k,p string}{{"size","font-size"},{"weight","font-weight"},{"lineHeight","line-height"},{"letterSpacing","letter-spacing"},{"textTransform","text-transform"}}{if v,ok:=s[spec.k].(string);ok&&v!=""{decl+=spec.p+":"+cssValue(v)+";"}};css+=".pb-page :is("+selectors[name]+"){"+decl+"}"};return css}
func pageVersion(page map[string]any)int{if v,ok:=page["version"];ok{return toInt(v)};if v,ok:=page["schemaVersion"];ok{return toInt(v)};return 1}
func responsive(value any,bp string,fallback any)any{if m,ok:=value.(map[string]any);ok{if v,ok:=m[bp];ok{return v};if v,ok:=m["desktop"];ok{return v};return fallback};if value==nil{return fallback};return value}
func cssValue(v string)string{return strings.TrimSpace(strings.NewReplacer("<","",">","",";","","{","","}","").Replace(v))}
func safeStyleBody(v string)string{return strings.NewReplacer("</style","","</STYLE","","<script","","<SCRIPT","").Replace(v)}
func identifier(v string)string{re:=regexp.MustCompile(`[^a-zA-Z0-9_-]`);out:=re.ReplaceAllString(v,"");if out==""{return "value"};return out}
func toInt(v any)int{switch x:=v.(type){case int:return x;case int64:return int(x);case float64:return int(x);case float32:return int(x);case string:i,_:=strconv.Atoi(x);return i};return 0}
func toFloat(v any)float64{switch x:=v.(type){case int:return float64(x);case float64:return x;case float32:return float64(x);case string:f,_:=strconv.ParseFloat(x,64);return f};return 0}
func maxInt(a,b int)int{if a>b{return a};return b};func maxFloat(a,b float64)float64{if a>b{return a};return b};func numberString(v float64)string{return strconv.FormatFloat(v,'f',-1,64)}
func diagnostic(code,severity,path,message string)Diagnostic{p:=path;m:=message;return Diagnostic{Code:code,Severity:severity,Path:&p,Message:&m}}
func defaults(definition map[string]any) map[string]any { out := map[string]any{}; attributes, _ := definition["attributes"].(map[string]any); for key, raw := range attributes { if schema, ok := raw.(map[string]any); ok { if value, ok := schema["default"]; ok { out[key] = value } } }; return out }
func collectAssets(definition map[string]any, result *RenderResult, cssSeen, jsSeen map[string]bool) { assets, _ := definition["assets"].(map[string]any); for _, spec := range []struct{name string; target *[]string; seen map[string]bool}{{"css", &result.Assets.CSS, cssSeen}, {"js", &result.Assets.JS, jsSeen}} { items, _ := assets[spec.name].([]any); for _, raw := range items { item, ok := raw.(string); if !ok || spec.seen[item] { continue }; spec.seen[item] = true; *spec.target = append(*spec.target, item) } } }

var rawPattern = regexp.MustCompile(`\{\{\{\s*([A-Za-z0-9_.]+)\s*\}\}\}`)
var interpolationPattern = regexp.MustCompile(`\{\{\s*([A-Za-z0-9_.]+)(?:\s*\?\?\s*["']([^"']*)["'])?\s*\}\}`)
var conditionPattern = regexp.MustCompile(`(?s)\{%\s*if\s+([A-Za-z0-9_.]+)\s*%\}(.*?)\{%\s*endif\s*%\}`)
var loopPattern = regexp.MustCompile(`(?s)\{%\s*for\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\s+([A-Za-z0-9_.]+)\s*%\}(.*?)\{%\s*endfor\s*%\}`)
func RenderTemplate(template string, ctx map[string]any) string { for loopPattern.MatchString(template) { template = loopPattern.ReplaceAllStringFunc(template, func(fragment string) string { m := loopPattern.FindStringSubmatch(fragment); items, _ := resolve(ctx, m[2]).([]any); var out strings.Builder; for i, item := range items { local := clone(ctx); local[m[1]] = item; local["loop"] = map[string]any{"index":i,"number":i+1,"first":i==0,"last":i==len(items)-1,"count":len(items)}; out.WriteString(RenderTemplate(m[3], local)) }; return out.String() }) }; for conditionPattern.MatchString(template) { template = conditionPattern.ReplaceAllStringFunc(template, func(fragment string) string { m := conditionPattern.FindStringSubmatch(fragment); if truthy(resolve(ctx,m[1])) { return RenderTemplate(m[2],ctx) }; return "" }) }; template = rawPattern.ReplaceAllStringFunc(template, func(fragment string) string { m:=rawPattern.FindStringSubmatch(fragment); v:=resolve(ctx,m[1]); if v==nil{return ""}; return fmt.Sprint(v) }); return interpolationPattern.ReplaceAllStringFunc(template, func(fragment string) string { m:=interpolationPattern.FindStringSubmatch(fragment); v:=resolve(ctx,m[1]); if v==nil && len(m)>2 {v=m[2]}; if v==nil{return ""}; if b,ok:=v.(bool);ok{if b{return "1"};return ""};switch v.(type){case map[string]any,[]any:return ""};return html.EscapeString(fmt.Sprint(v)) }) }
func resolve(ctx map[string]any, path string) any { return resolveAny(ctx,path) }
func resolveAny(value any,path string)any{if path==""{return value};current:=value;for _,part:=range strings.Split(path,"."){m,ok:=current.(map[string]any);if!ok{return nil};var exists bool;current,exists=m[part];if!exists{return nil}};return current}
func clone(in map[string]any) map[string]any {out:=make(map[string]any,len(in));for k,v:=range in{out[k]=v};return out}
func truthy(v any) bool {switch x:=v.(type){case nil:return false;case bool:return x;case string:return x!="";case float64:return x!=0;case float32:return x!=0;case int:return x!=0;case []any:return len(x)>0;default:return true}}
