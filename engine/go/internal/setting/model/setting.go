package model

import (
	"encoding/json"
	"time"
)

type Setting struct {
	Key       string          `json:"key" gorm:"primaryKey;size:191"`
	Value     json.RawMessage `json:"value" gorm:"type:text;not null"`
	UpdatedAt time.Time       `json:"updatedAt"`
}

func (Setting) TableName() string { return "settings" }
