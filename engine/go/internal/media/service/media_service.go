package service

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	mediamodel "github.com/zaengit/page-builder/engine/go/internal/media/model"
	mediarepo "github.com/zaengit/page-builder/engine/go/internal/media/repository"
	"gorm.io/gorm"
)

var ErrNotFound = errors.New("media not found")

type Service struct {
	repo         *mediarepo.Repository
	root, public string
	max          int64
}

func New(r *mediarepo.Repository, root, public string, max int64) *Service {
	return &Service{repo: r, root: root, public: public, max: max}
}

func (s *Service) Save(ctx context.Context, name, _ string, src io.Reader, size int64) (*mediamodel.Media, error) {
	if size <= 0 || size > s.max {
		return nil, fmt.Errorf("invalid upload size")
	}

	ext := strings.ToLower(filepath.Ext(filepath.Base(name)))
	allowed := map[string][]string{
		".jpg":  {"image/jpeg"},
		".jpeg": {"image/jpeg"},
		".png":  {"image/png"},
		".gif":  {"image/gif"},
		".webp": {"image/webp"},
		".pdf":  {"application/pdf"},
	}
	accepted, ok := allowed[ext]
	if !ok {
		return nil, fmt.Errorf("file type not allowed")
	}

	header := make([]byte, 512)
	nHeader, err := io.ReadFull(src, header)
	if err != nil && err != io.ErrUnexpectedEOF && err != io.EOF {
		return nil, fmt.Errorf("read upload header: %w", err)
	}
	header = header[:nHeader]
	detected := http.DetectContentType(header)
	matched := false
	for _, mimeType := range accepted {
		if detected == mimeType {
			matched = true
			break
		}
	}
	if !matched {
		return nil, fmt.Errorf("file content does not match extension")
	}

	if err := os.MkdirAll(s.root, 0750); err != nil {
		return nil, err
	}
	safe := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
	path := filepath.Join(s.root, safe)
	f, err := os.OpenFile(path, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0640)
	if err != nil {
		return nil, err
	}

	reader := io.MultiReader(bytes.NewReader(header), src)
	n, copyErr := io.CopyN(f, reader, s.max+1)
	closeErr := f.Close()
	if copyErr != nil && copyErr != io.EOF {
		_ = os.Remove(path)
		return nil, copyErr
	}
	if n > s.max {
		_ = os.Remove(path)
		return nil, fmt.Errorf("file too large")
	}
	if closeErr != nil {
		_ = os.Remove(path)
		return nil, closeErr
	}

	m := &mediamodel.Media{
		Name:     filepath.Base(name),
		Path:     safe,
		URL:      strings.TrimRight(s.public, "/") + "/" + safe,
		MimeType: detected,
		Size:     n,
	}
	if err := s.repo.Create(ctx, m); err != nil {
		_ = os.Remove(path)
		return nil, err
	}
	return m, nil
}

func (s *Service) List(ctx context.Context) ([]mediamodel.Media, error) { return s.repo.List(ctx) }

func (s *Service) Get(ctx context.Context, id uint) (*mediamodel.Media, error) {
	m, err := s.repo.Get(ctx, id)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return m, err
}

func (s *Service) Delete(ctx context.Context, id uint) error {
	m, err := s.repo.Get(ctx, id)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if err := s.repo.Delete(ctx, id); err != nil {
		return err
	}
	err = os.Remove(filepath.Join(s.root, filepath.Base(m.Path)))
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	return err
}
