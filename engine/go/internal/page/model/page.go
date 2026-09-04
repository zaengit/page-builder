package model

import (
	"encoding/json"
	"time"
)

type Page struct {
	ID          uint            `json:"id" gorm:"primaryKey"`
	Title       string          `json:"title" gorm:"size:255;not null"`
	Slug        string          `json:"slug" gorm:"size:255;uniqueIndex;not null"`
	Status      string          `json:"status" gorm:"size:32;index;not null;default:draft"`
	Content     json.RawMessage `json:"content" gorm:"type:text;not null"`
	Revision    uint            `json:"revision" gorm:"not null;default:1"`
	PublishedAt *time.Time      `json:"publishedAt,omitempty"`
	CreatedAt   time.Time       `json:"createdAt"`
	UpdatedAt   time.Time       `json:"updatedAt" gorm:"index"`
}

func (Page) TableName() string { return "pages" }
