---
name: OBS-style Macro Automation System
description: Advanced macro system with condition/action types, play_once mode, wizard UI, interrupted playlist tracking
type: feature
---
## Macro Schema
- `condition_type`: time_daily, datetime_exact, playlist_started, playlist_finished
- `condition_value`: HH:MM, ISO datetime, or playlist UUID
- `recurrence_interval_minutes`: auto-advances datetime_exact macros
- `action_type`: play_specific, play_previous, toggle_single_image_on/off, toggle_ticker_on/off, toggle_overlay_on/off
- `action_target_id`: target playlist UUID for play_specific

## Playlist play_mode
- `loop` (default): repeats indefinitely
- `play_once`: stops after last slide, triggers playlist_finished macros

## Interrupted Playlist
- `settings.interrupted_playlist_id`: saved when play_specific switches away
- `settings.default_fallback_playlist_id`: used when no interrupted playlist exists
- play_previous restores interrupted or falls back to default

## Engine
- Time macros checked every 10s in DisplayPanel
- Event macros (playlist_started/finished) triggered on playlist changes
- last_run_at prevents duplicate executions within 60s
- datetime_exact with recurrence auto-updates condition_value to next occurrence

## Admin UI (AutomationTab)
- Card list with human-readable sentences, active toggle, edit/duplicate/delete
- Bottom Sheet wizard: Step 1 (Trigger) → Step 2 (Action)
- playlist_finished condition only shows play_once playlists
- FAB button for creating new macros
