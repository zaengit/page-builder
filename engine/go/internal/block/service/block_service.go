package service

import (
	"context"
	"fmt"
	"sort"

	pagebuilder "github.com/zaengit/page-builder/engine/go"
)

type Service struct{ root string }
func New(root string)*Service{return &Service{root:root}}
func (s *Service) Registry(ctx context.Context)(map[string]map[string]any,error){select{case<-ctx.Done():return nil,ctx.Err();default:};return pagebuilder.LoadRegistry(s.root)}
func (s *Service) List(ctx context.Context)([]map[string]any,error){r,err:=s.Registry(ctx);if err!=nil{return nil,err};keys:=make([]string,0,len(r));for k:=range r{keys=append(keys,k)};sort.Strings(keys);out:=make([]map[string]any,0,len(keys));for _,k:=range keys{v:=r[k];item:=map[string]any{"type":k};for a,b:=range v{item[a]=b};out=append(out,item)};return out,nil}
func (s *Service) Get(ctx context.Context,t string)(map[string]any,error){r,err:=s.Registry(ctx);if err!=nil{return nil,err};v,ok:=r[t];if !ok{return nil,fmt.Errorf("block %q not found",t)};return v,nil}
