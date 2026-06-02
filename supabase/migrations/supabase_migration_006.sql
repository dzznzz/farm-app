-- Migration 006: todos에 time 컬럼 추가
ALTER TABLE todos ADD COLUMN IF NOT EXISTS time TEXT;
