package model

import (
	"encoding/json"
	"time"
)

type Datasource struct { ID uint `json:"id" gorm:"primaryKey"`; Name string `json:"name" gorm:"size:191;uniqueIndex;not null"`; Resource string `json:"resource" gorm:"size:191;index;not null"`; Config json.RawMessage `json:"config" gorm:"type:text;not null"`; CreatedAt time.Time `json:"createdAt"`; UpdatedAt time.Time `json:"updatedAt"` }
func (Datasource) TableName() string { return "datasources" }
