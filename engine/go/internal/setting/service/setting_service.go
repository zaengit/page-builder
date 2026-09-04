package service

import (
	"context"
	"encoding/json"
	settingmodel "github.com/zaengit/page-builder/engine/go/internal/setting/model"
	settingrepo "github.com/zaengit/page-builder/engine/go/internal/setting/repository"
)

type Service struct{ repo *settingrepo.Repository }

func New(r *settingrepo.Repository) *Service { return &Service{repo: r} }
func (s *Service) Get(ctx context.Context) (json.RawMessage, error) {
	v, err := s.repo.Get(ctx, "site")
	if err != nil {
		return nil, err
	}
	if v == nil {
		return json.RawMessage(`{}`), nil
	}
	return v.Value, nil
}
func (s *Service) Put(ctx context.Context, v json.RawMessage) (json.RawMessage, error) {
	var tmp any
	if err := json.Unmarshal(v, &tmp); err != nil {
		return nil, err
	}
	m := &settingmodel.Setting{Key: "site", Value: v}
	if err := s.repo.Upsert(ctx, m); err != nil {
		return nil, err
	}
	return v, nil
}
