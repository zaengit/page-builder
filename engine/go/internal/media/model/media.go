package model

import "time"

type Media struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Name      string    `json:"name" gorm:"size:255;not null"`
	Path      string    `json:"path" gorm:"size:1024;uniqueIndex;not null"`
	URL       string    `json:"url" gorm:"size:1024;not null"`
	MimeType  string    `json:"mimeType" gorm:"size:255;not null"`
	Size      int64     `json:"size" gorm:"not null"`
	CreatedAt time.Time `json:"createdAt"`
}
func (Media) TableName() string { return "media" }
