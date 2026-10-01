# Repository Health Intelligence Platform

A Git repository analytics platform that analyzes repository history
to identify maintainability risks, contributor concentration,
code hotspots, stagnation, code churn, and repository health.

## Problem

Large software repositories can develop maintenance risks such as
knowledge concentration, inactive areas, excessive code churn,
and frequently modified hotspots.

This platform analyzes Git repository history and converts that
information into measurable engineering-health insights.

## Core Features

- Repository analysis
- Commit history analysis
- Contributor analytics
- Code churn analysis
- File hotspot detection
- Repository stagnation detection
- Bus factor analysis
- Repository health score
- Risk detection
- Historical analysis
- Interactive dashboard
- Repository comparison
- Report generation

## Technology Stack

### Frontend
- Next.js
- TypeScript
- Tailwind CSS
- Recharts

### Backend
- Node.js
- Express.js
- TypeScript

### Analysis
- Git CLI
- Custom analytics engine

### Database
- PostgreSQL
- Prisma

### Infrastructure
- Docker
- GitHub Actions

## Architecture

The platform consists of:

1. Web Dashboard
2. REST API
3. Git Analysis Engine
4. Health Scoring Engine
5. PostgreSQL Database