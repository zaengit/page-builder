package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	pagebuilder "github.com/zaengit/page-builder/engine/go"
)

type protocolRequest struct { Version int `json:"version"`; Page map[string]any `json:"page"`; Context map[string]any `json:"context"`; BlockRoot string `json:"blockRoot"`; Registry map[string]map[string]any `json:"registry"` }

func main() {
	if len(os.Args)>1 && os.Args[1]=="--version" { fmt.Printf("page-builder-engine-go %s protocol=%d specification=%d\n",pagebuilder.EngineVersion,pagebuilder.ProtocolVersion,pagebuilder.SpecificationVersion); return }
	var request protocolRequest; if err:=json.NewDecoder(os.Stdin).Decode(&request);err!=nil{fail(err);return}
	if request.Version!=pagebuilder.ProtocolVersion { p:="$.version";m:=fmt.Sprintf("unsupported protocol version %d",request.Version); _=json.NewEncoder(os.Stdout).Encode(pagebuilder.RenderResult{Assets:pagebuilder.Assets{CSS:[]string{},JS:[]string{}},Diagnostics:[]pagebuilder.Diagnostic{{Code:"unsupported_protocol_version",Severity:"error",Path:&p,Message:&m}}});return }
	registry:=request.Registry;if registry==nil{if request.BlockRoot==""{fail(fmt.Errorf("blockRoot or registry is required"));return};loaded,err:=pagebuilder.LoadRegistry(request.BlockRoot);if err!=nil{fail(err);return};registry=loaded}
	result,err:=pagebuilder.New().Render(context.Background(),pagebuilder.RenderRequest{Page:request.Page,Registry:registry,Context:request.Context});if err!=nil{fail(err);return};if err:=json.NewEncoder(os.Stdout).Encode(result);err!=nil{fail(err)}
}
func fail(err error){fmt.Fprintln(os.Stderr,err);os.Exit(1)}
