package service

import(
	"context"
	"encoding/json"
	"errors"
	pagebuilder "github.com/zaengit/page-builder/engine/go"
	blocksvc "github.com/zaengit/page-builder/engine/go/internal/block/service"
	pagesvc "github.com/zaengit/page-builder/engine/go/internal/page/service"
)
type Service struct{pages *pagesvc.Service;blocks *blocksvc.Service;renderer pagebuilder.Renderer}
func New(p *pagesvc.Service,b *blocksvc.Service,r pagebuilder.Renderer)*Service{return &Service{pages:p,blocks:b,renderer:r}}
func(s *Service)RenderDocument(ctx context.Context,raw json.RawMessage,runtime map[string]any)(pagebuilder.RenderResult,error){var page map[string]any;if err:=json.Unmarshal(raw,&page);err!=nil{return pagebuilder.RenderResult{},err};if err:=pagebuilder.ValidatePage(page);err!=nil{return pagebuilder.RenderResult{},err};reg,err:=s.blocks.Registry(ctx);if err!=nil{return pagebuilder.RenderResult{},err};return s.renderer.Render(ctx,pagebuilder.RenderRequest{Page:page,Registry:reg,Context:runtime})}
func(s *Service)Preview(ctx context.Context,raw json.RawMessage,runtime map[string]any)(pagebuilder.RenderResult,error){return s.RenderDocument(ctx,raw,runtime)}
func(s *Service)BlockPreview(ctx context.Context,block map[string]any,runtime map[string]any)(pagebuilder.RenderResult,error){doc:=map[string]any{"version":1,"blocks":[]any{block}};raw,err:=json.Marshal(doc);if err!=nil{return pagebuilder.RenderResult{},err};return s.RenderDocument(ctx,raw,runtime)}
func(s *Service)Published(ctx context.Context,slug string,runtime map[string]any)(pagebuilder.RenderResult,error){p,err:=s.pages.PublishedBySlug(ctx,slug);if err!=nil{return pagebuilder.RenderResult{},err};if p==nil{return pagebuilder.RenderResult{},errors.New("page not found")};return s.RenderDocument(ctx,p.Content,runtime)}
