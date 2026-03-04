# /api/crons - Cron Management API

## Overview

This directory contains the REST API endpoints for managing cron jobs programmatically. Unlike `/api/cron/` which contains the actual job handlers, this directory provides CRUD operations for the cron schedule configuration.

## Endpoints

### GET /api/crons

Returns a list of all configured cron jobs from ClawdBot.

### POST /api/crons

Creates a new cron job in ClawdBot.

### Individual Cron Routes (/api/crons/[id]/)

- `GET` - Get a specific cron by ID
- `PATCH` - Update a cron's configuration
- `DELETE` - Remove a cron job
- `POST /test` - Trigger a test run of the cron

## Architecture

This API acts as a proxy to ClawdBot, which:
- Persists cron configurations in `crons.json`
- Manages the system crontab
- Tracks execution history and status
- Handles scheduling and triggering

## Relationship to /api/cron/

- `/api/crons/` → Management layer (when, how often, enabled/disabled)
- `/api/cron/` → Execution layer (what actually runs)

The `handler` field in a cron configuration should match a subdirectory in `/api/cron/`.
