package repository

import(
	"context"
	"errors"
	settingmodel "github.com/zaengit/page-builder/engine/go/internal/setting/model"
	"gorm.io/gorm"
)
type Repository struct{db *gorm.DB}
func New(db *gorm.DB)*Repository{return &Repository{db:db}}
func(r *Repository)Get(ctx context.Context,key string)(*settingmodel.Setting,error){var s settingmodel.Setting;err:=r.db.WithContext(ctx).First(&s,"key = ?",key).Error;if errors.Is(err,gorm.ErrRecordNotFound){return nil,nil};return &s,err}
func(r *Repository)Upsert(ctx context.Context,s *settingmodel.Setting)error{return r.db.WithContext(ctx).Save(s).Error}
