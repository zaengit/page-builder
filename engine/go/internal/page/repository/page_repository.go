package repository

import (
	"context"
	"errors"
	pagemodel "github.com/zaengit/page-builder/engine/go/internal/page/model"
	"gorm.io/gorm"
)

type Repository struct{ db *gorm.DB }
func New(db *gorm.DB) *Repository { return &Repository{db:db} }
func (r *Repository) Create(ctx context.Context, p *pagemodel.Page) error { return r.db.WithContext(ctx).Create(p).Error }
func (r *Repository) Get(ctx context.Context, id uint) (*pagemodel.Page,error) { var p pagemodel.Page; err:=r.db.WithContext(ctx).First(&p,id).Error; if errors.Is(err,gorm.ErrRecordNotFound){return nil,nil}; return &p,err }
func (r *Repository) BySlug(ctx context.Context, slug string) (*pagemodel.Page,error) { var p pagemodel.Page; err:=r.db.WithContext(ctx).Where("slug = ?",slug).First(&p).Error; if errors.Is(err,gorm.ErrRecordNotFound){return nil,nil}; return &p,err }
func (r *Repository) List(ctx context.Context, limit, offset int, status string) ([]pagemodel.Page,int64,error) { q:=r.db.WithContext(ctx).Model(&pagemodel.Page{}); if status!=""{q=q.Where("status = ?",status)}; var total int64; if err:=q.Count(&total).Error;err!=nil{return nil,0,err}; var items []pagemodel.Page; err:=q.Order("updated_at desc").Limit(limit).Offset(offset).Find(&items).Error; return items,total,err }
func (r *Repository) Save(ctx context.Context, p *pagemodel.Page) error { return r.db.WithContext(ctx).Save(p).Error }
func (r *Repository) Delete(ctx context.Context, id uint) error { return r.db.WithContext(ctx).Delete(&pagemodel.Page{},id).Error }
