# AI Meeting Assistant - Design Document
## Real-time Transcription, Summarization & Action Item Extraction

**Date:** October 21, 2025  
**Feature:** AI-powered meeting assistant with transcription and intelligent summarization  
**Priority:** High-value differentiator vs Ninety.io

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Business Value](#business-value)
3. [Architecture Options](#architecture-options)
4. [Security & Privacy](#security--privacy)
5. [Implementation Approach](#implementation-approach)
6. [Database Schema](#database-schema)
7. [API Design](#api-design)
8. [Frontend Design](#frontend-design)
9. [Cost Analysis](#cost-analysis)
10. [Compliance & Legal](#compliance--legal)
11. [Rollout Strategy](#rollout-strategy)

---

## Executive Summary

### The Vision
Enable AXP to "listen" to Level 10 meetings (via video conferencing integrations or browser audio) and automatically:
- **Transcribe** the conversation in real-time
- **Identify speakers** ("John said...", "Sarah mentioned...")
- **Extract action items** (todos) automatically
- **Identify issues** discussed
- **Generate meeting summary** with key decisions
- **Attach transcript** to meeting history
- **Enable AI Q&A** ("What did we decide about the budget?")

### The Wow Factor
**"Your AI notetaker that actually understands EOS meetings"**

Instead of someone typing notes, the AI:
- Captures everything said
- Knows EOS terminology (Rocks, IDS, Scorecard, etc.)
- Extracts action items with assignees
- Identifies issues and their status
- Summarizes decisions made
- All attached to meeting history for future reference

---

## Business Value

### Competitive Advantages
1. **Ninety.io doesn't have this** - Major differentiator
2. **Reduces meeting overhead** - No dedicated scribe needed
3. **Increases accuracy** - Never miss a decision or action item
4. **Improves accountability** - Clear record of who said what
5. **Enables search** - "Find when we discussed hiring"
6. **Compliance** - Legal record of decisions made

### Revenue Impact
- **Upsell opportunity**: Premium tier feature ($50-100/mo per org)
- **Stickiness**: Once using AI notes, hard to leave
- **Win rate**: Strong demo hook for EOS consultants
- **Testimonials**: "AI that actually gets EOS" marketing angle

### User Pain Point Solved
**Current state:** Someone has to take notes, type fast, miss things, format after
**Future state:** AI captures everything, you just have the conversation

---

## Architecture Options

### Option 1: Direct Integration (Recommended)
**Use specialized meeting AI services**

#### Services to Consider:

**A) Assembly AI (Recommended)**
- **Pros**: 
  - Real-time transcription API
  - Speaker diarization (identifies who said what)
  - Custom vocabulary (teach it "Rock", "IDS", "V/TO")
  - Action item detection
  - Topic detection
  - Sentiment analysis
  - HIPAA/SOC2 compliant
  - $0.00025/second (~$1.35 per 90min meeting)
- **Cons**: 
  - Requires audio stream from client
  - Additional service dependency
- **Best for**: Professional, production-ready solution

**B) Deepgram**
- **Pros**: 
  - Fast real-time transcription
  - Custom vocabulary
  - Diarization
  - Slightly cheaper than AssemblyAI
  - Good API documentation
- **Cons**: 
  - Less advanced action item extraction
  - Need to build more AI on top

**C) OpenAI Whisper API**
- **Pros**: 
  - Part of OpenAI (you already use)
  - Good accuracy
  - Affordable ($0.006/minute)
- **Cons**: 
  - Not true real-time (batch processing)
  - No built-in diarization
  - Need to solve speaker identification separately

### Option 2: Browser-Based Capture
**Capture audio directly from browser during meeting**

#### How it Works:
1. User starts meeting in AXP
2. AXP requests microphone permission (via WebRTC)
3. Audio streams to backend via WebSocket
4. Backend sends to transcription service
5. Real-time transcript appears in meeting UI
6. At meeting end, process full transcript with GPT-4 for summary

#### Pros:
- No video conferencing integration needed
- Works with any video tool (Zoom, Teams, Meet, etc.)
- User stays in AXP the whole time

#### Cons:
- Only captures what comes through user's microphone/speakers
- Audio quality depends on user's setup
- Requires microphone permissions

### Option 3: Video Conferencing Integration
**Bot joins Zoom/Teams meeting**

#### Services:
- **Recall.ai** - Meeting bot service
- **Fireflies.ai** - Meeting assistant API
- **Otter.ai** - Enterprise API

#### How it Works:
1. User schedules meeting with Zoom/Teams link
2. AXP bot joins the meeting
3. Bot records and transcribes
4. Bot leaves when meeting ends
5. Transcript/summary sent to AXP

#### Pros:
- Professional look (like having Otter/Fireflies)
- High quality audio capture
- No browser permissions needed
- Participants see "AXP Bot" in meeting

#### Cons:
- Requires Zoom/Teams integration setup
- Monthly cost per organization
- Participants see a bot (some don't like this)
- More complex to set up

---

## Recommended Architecture

### Phase 1: Browser Audio + AssemblyAI (MVP)
**Why this wins:**
1. **Fast to ship** - No video platform integrations needed
2. **Works everywhere** - Zoom, Teams, Google Meet, in-person
3. **Affordable** - Pay per use, not monthly per org
4. **Secure** - Audio processed by SOC2 compliant service
5. **Great UX** - Real-time transcript during meeting

### Technical Stack:
```
Browser (Meeting Page)
    ↓ WebRTC Audio Stream
Backend (Node.js WebSocket Server)
    ↓ Audio Chunks
AssemblyAI Real-time API
    ↓ Transcript Chunks (WebSocket)
Backend Processing
    ↓ Store Transcript
    ↓ At Meeting End
GPT-4 API (OpenAI)
    ↓ Generate Summary
    ↓ Extract Action Items
    ↓ Identify Issues
    ↓ Extract Decisions
Database (PostgreSQL)
    ↓ Save to meeting_transcripts table
Meeting History UI
```

---

## Security & Privacy

### Critical Security Requirements

#### 1. Data Encryption
```javascript
// Audio in transit
- Browser → Backend: WSS (WebSocket Secure) with TLS 1.3
- Backend → AssemblyAI: HTTPS with TLS 1.3
- All transcript data encrypted at rest (PostgreSQL encrypted columns)
```

#### 2. Access Control
```javascript
// Multi-tenant isolation
- Transcripts linked to organization_id
- Only organization members can access
- Admin can disable transcription for entire org
- Users can opt-out of being transcribed (compliance)
```

#### 3. Data Retention Policy
```javascript
// Configurable per organization
- Default: Keep transcripts for 7 years (matches business records)
- Option: Delete after 1 year
- Option: Delete after meeting (real-time only)
- Hard delete: Removes from all systems including backups
```

#### 4. Consent & Compliance
```javascript
// Legal requirements
- Display "This meeting is being transcribed" banner
- Require explicit consent before recording starts
- Allow participants to opt-out
- Store consent records for legal protection
- Comply with state recording laws (two-party consent)
```

#### 5. Third-Party Service Security
```javascript
// AssemblyAI Security Features
- SOC 2 Type II certified
- GDPR compliant
- HIPAA compliant (if needed)
- Data deleted from their servers after processing
- No data used for training AI models
- Signed BAA available (Business Associate Agreement)
```

#### 6. Audit Trail
```javascript
// Track everything
- Who enabled transcription
- Who accessed transcripts
- Who downloaded transcripts
- Who deleted transcripts
- IP addresses and timestamps
```

### Privacy Features to Build

#### Meeting-Level Privacy Controls
```javascript
// Per-meeting settings
- Toggle: "Enable AI Transcription" (default: OFF)
- Toggle: "Share transcript with all attendees" (default: ON)
- Toggle: "Allow transcript download" (default: OFF)
- Button: "Delete transcript permanently"
```

#### Organization-Level Privacy Controls
```javascript
// Admin settings
- Toggle: "Enable AI features for organization"
- Dropdown: "Transcript retention period" (1 year, 7 years, Forever)
- Toggle: "Require consent banner"
- Toggle: "Allow users to opt-out"
- Input: "Custom consent message"
```

#### User-Level Privacy Controls
```javascript
// Individual preferences
- Toggle: "Opt me out of all transcriptions"
- Toggle: "Notify me when I'm being transcribed"
- Button: "Request all my transcript data" (GDPR)
- Button: "Delete all my transcript data" (Right to be forgotten)
```

---

## Database Schema

### New Tables

```sql
-- Store raw transcripts
CREATE TABLE meeting_transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Transcript data
    raw_transcript TEXT,  -- Full verbatim transcript
    transcript_json JSONB,  -- Structured with timestamps, speakers
    
    -- Processing status
    status VARCHAR(50) DEFAULT 'processing',  -- processing, completed, failed
    processing_started_at TIMESTAMP WITH TIME ZONE,
    processing_completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Service metadata
    transcription_service VARCHAR(50),  -- assemblyai, deepgram, whisper
    transcript_service_id VARCHAR(255),  -- External service ID
    audio_duration_seconds INTEGER,
    word_count INTEGER,
    
    -- Privacy & compliance
    consent_obtained BOOLEAN DEFAULT false,
    consent_obtained_from UUID[],  -- Array of user_ids who consented
    participants_notified BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE  -- Soft delete
);

-- Store AI-generated summaries
CREATE TABLE meeting_ai_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    transcript_id UUID NOT NULL REFERENCES meeting_transcripts(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Summary content
    executive_summary TEXT,  -- 2-3 paragraph overview
    key_decisions TEXT[],  -- Array of decision strings
    discussion_topics JSONB,  -- [{"topic": "Hiring", "duration_minutes": 15, "sentiment": "positive"}]
    
    -- Extracted items
    action_items JSONB,  -- [{"task": "...", "assignee": "...", "due_date": "..."}]
    issues_discussed JSONB,  -- [{"issue": "...", "status": "...", "solution": "..."}]
    rocks_mentioned JSONB,  -- [{"rock_title": "...", "status": "..."}]
    
    -- Quotes & highlights
    notable_quotes JSONB,  -- [{"speaker": "John", "quote": "...", "timestamp": "00:15:30"}]
    meeting_sentiment VARCHAR(50),  -- positive, neutral, negative
    meeting_energy_score INTEGER,  -- 1-10
    
    -- AI metadata
    ai_model VARCHAR(100),  -- gpt-4, gpt-4-turbo
    ai_prompt_version VARCHAR(50),
    ai_processing_time_seconds NUMERIC(10,2),
    ai_cost_usd NUMERIC(10,4),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track transcript access (audit trail)
CREATE TABLE transcript_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transcript_id UUID NOT NULL REFERENCES meeting_transcripts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    
    -- Access details
    access_type VARCHAR(50),  -- view, download, delete, edit
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamp
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Store consent records (legal protection)
CREATE TABLE transcript_consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    
    -- Consent details
    consent_given BOOLEAN NOT NULL,
    consent_text TEXT,  -- The exact consent message shown
    consent_ip_address INET,
    
    -- Timestamp
    consent_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add to organizations table
ALTER TABLE organizations 
ADD COLUMN ai_transcription_enabled BOOLEAN DEFAULT false,
ADD COLUMN transcript_retention_days INTEGER DEFAULT 2555,  -- 7 years
ADD COLUMN require_transcript_consent BOOLEAN DEFAULT true,
ADD COLUMN transcript_consent_message TEXT;

-- Add to meetings table  
ALTER TABLE meetings
ADD COLUMN transcription_enabled BOOLEAN DEFAULT false,
ADD COLUMN transcription_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN transcription_consent_obtained BOOLEAN DEFAULT false;

-- Indexes for performance
CREATE INDEX idx_meeting_transcripts_meeting 
    ON meeting_transcripts(meeting_id);
    
CREATE INDEX idx_meeting_transcripts_org 
    ON meeting_transcripts(organization_id);
    
CREATE INDEX idx_meeting_ai_summaries_meeting 
    ON meeting_ai_summaries(meeting_id);
    
CREATE INDEX idx_transcript_access_log_transcript 
    ON transcript_access_log(transcript_id, accessed_at DESC);
    
CREATE INDEX idx_transcript_consent_meeting 
    ON transcript_consent_records(meeting_id);

-- GIN index for JSONB searching
CREATE INDEX idx_meeting_ai_summaries_action_items 
    ON meeting_ai_summaries USING GIN (action_items);
    
CREATE INDEX idx_meeting_ai_summaries_issues 
    ON meeting_ai_summaries USING GIN (issues_discussed);
```

---

## API Design

### Backend Endpoints

```javascript
// Enable transcription for a meeting
POST /api/v1/organizations/:orgId/meetings/:meetingId/transcription/start
Request: {
    consent_user_ids: ['uuid1', 'uuid2']  // Users who consented
}
Response: {
    transcription_id: 'uuid',
    status: 'started',
    websocket_url: 'wss://api.axplatform.app/transcription/uuid'
}

// Stream audio to backend (WebSocket)
WS /transcription/:transcriptionId
Send: Binary audio chunks (16kHz, 16-bit PCM)
Receive: {
    type: 'transcript',
    text: 'John said we need to hire two developers',
    speaker: 'Speaker 1',
    timestamp: 1500,  // milliseconds
    confidence: 0.95
}

// Get real-time transcript
GET /api/v1/organizations/:orgId/meetings/:meetingId/transcription/live
Response: {
    transcript_chunks: [
        {
            speaker: 'Speaker 1',
            text: '...',
            timestamp: 1500,
            confidence: 0.95
        }
    ],
    status: 'in_progress'
}

// Stop transcription and process
POST /api/v1/organizations/:orgId/meetings/:meetingId/transcription/stop
Response: {
    status: 'processing',
    message: 'Generating AI summary...'
}

// Get full transcript
GET /api/v1/organizations/:orgId/meetings/:meetingId/transcript
Response: {
    transcript_id: 'uuid',
    raw_transcript: 'Full text...',
    structured_transcript: [
        {
            speaker: 'John Doe',
            speaker_id: 'user-uuid',
            text: '...',
            timestamp: '00:15:30',
            confidence: 0.95
        }
    ],
    duration_seconds: 5400,
    word_count: 12500
}

// Get AI summary
GET /api/v1/organizations/:orgId/meetings/:meetingId/ai-summary
Response: {
    executive_summary: '...',
    key_decisions: [
        'Approved hiring budget for 2 developers',
        'Moving forward with new CRM implementation'
    ],
    action_items: [
        {
            task: 'Schedule interviews for developer positions',
            assignee: 'John Doe',
            assignee_id: 'user-uuid',
            due_date: '2025-10-28',
            timestamp: '00:45:30',
            confidence: 'high'
        }
    ],
    issues_discussed: [
        {
            issue: 'Server performance degradation',
            status: 'solved',
            solution: 'Upgraded to larger instance',
            timestamp: '01:15:00'
        }
    ],
    sentiment: 'positive',
    energy_score: 8
}

// Create todos from AI action items
POST /api/v1/organizations/:orgId/meetings/:meetingId/ai-summary/create-todos
Request: {
    action_item_ids: ['item-1', 'item-2']
}
Response: {
    todos_created: 2,
    todo_ids: ['todo-uuid-1', 'todo-uuid-2']
}

// Create issues from AI detected issues
POST /api/v1/organizations/:orgId/meetings/:meetingId/ai-summary/create-issues
Request: {
    issue_ids: ['issue-1', 'issue-2']
}
Response: {
    issues_created: 2,
    issue_ids: ['issue-uuid-1', 'issue-uuid-2']
}

// Download transcript
GET /api/v1/organizations/:orgId/meetings/:meetingId/transcript/download
Query: ?format=txt|pdf|docx|vtt
Response: File download

// Delete transcript (compliance)
DELETE /api/v1/organizations/:orgId/meetings/:meetingId/transcript
Response: {
    message: 'Transcript permanently deleted'
}

// Search across transcripts
GET /api/v1/organizations/:orgId/transcripts/search
Query: ?q=budget&team_id=uuid&start_date=2025-01-01
Response: {
    results: [
        {
            meeting_id: 'uuid',
            meeting_date: '2025-10-21',
            team_name: 'Leadership Team',
            matches: [
                {
                    text: '...we need to approve the budget...',
                    speaker: 'John Doe',
                    timestamp: '00:45:30'
                }
            ]
        }
    ]
}
```

---

## Frontend Design

### 1. Meeting Page Enhancements

**Before Meeting Starts:**
```jsx
┌─────────────────────────────────────────────────────┐
│  Weekly Level 10 Meeting                            │
│  Leadership Team • Oct 21, 2025 10:00 AM           │
├─────────────────────────────────────────────────────┤
│                                                      │
│  🤖 AI Meeting Assistant                            │
│  ┌────────────────────────────────────────────┐    │
│  │                                             │    │
│  │  [ ] Enable AI transcription & summary      │    │
│  │                                             │    │
│  │  📝 The AI will:                            │    │
│  │  • Transcribe the conversation in real-time │    │
│  │  • Identify action items automatically      │    │
│  │  • Generate meeting summary                │    │
│  │  • Extract key decisions                   │    │
│  │                                             │    │
│  │  All participants will be notified that    │    │
│  │  the meeting is being transcribed.         │    │
│  │                                             │    │
│  │  [Learn about privacy →]                   │    │
│  └────────────────────────────────────────────┘    │
│                                                      │
│  [Start Meeting]                                    │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**During Meeting (with AI enabled):**
```jsx
┌─────────────────────────────────────────────────────┐
│  🔴 Recording • 45:30                  [End Meeting] │
├─────────────────────────────────────────────────────┤
│  Segue  │  Scorecard  │  Rocks  │  To-Dos  │  IDS  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  🎙️ Live Transcript                                 │
│  ┌────────────────────────────────────────────┐    │
│  │ John Doe (00:43:15)                        │    │
│  │ We need to prioritize hiring two           │    │
│  │ senior developers for the Q4 release.      │    │
│  │                                             │    │
│  │ Sarah Smith (00:43:45)                     │    │
│  │ I agree. Should we budget for $180k        │    │
│  │ total or per person?                       │    │
│  │                                             │    │
│  │ John Doe (00:44:02)                        │    │
│  │ Per person. Let's create an action item    │    │
│  │ for me to get approval.                    │    │
│  │                                             │    │
│  │ 🤖 AI Detected Action Item:                │    │
│  │ ┌─────────────────────────────────────┐   │    │
│  │ │ John to get budget approval for     │   │    │
│  │ │ hiring 2 developers at $180k each   │   │    │
│  │ │                                      │   │    │
│  │ │ [Create To-Do] [Edit] [Ignore]     │   │    │
│  │ └─────────────────────────────────────┘   │    │
│  │                                             │    │
│  └────────────────────────────────────────────┘    │
│  [Collapse Transcript]                              │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**After Meeting Ends:**
```jsx
┌─────────────────────────────────────────────────────┐
│  🤖 AI Processing Meeting...                        │
│                                                      │
│  [████████████░░░░░░░] 75%                          │
│                                                      │
│  Generating summary and extracting action items...  │
│                                                      │
└─────────────────────────────────────────────────────┘

// After 30-60 seconds:

┌─────────────────────────────────────────────────────┐
│  ✅ Meeting Summary Ready!                          │
│                                                      │
│  [View Summary] [View Transcript]                   │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 2. Meeting History with AI Features

**Enhanced Meeting Card:**
```jsx
┌─────────────────────────────────────────────────────┐
│  Leadership Team                    [WEEKLY L10]    │
│  ⭐ 8.5     🤖 AI Summary Available                 │
│                                                      │
│  📅 Mon, Oct 21, 2025    ⏱️ 1h 30m    👥 5 attendees│
│                                                      │
│  "Approved hiring budget for 2 developers and      │
│   moving forward with new CRM system"               │
│                                                      │
│  ✅ 3 issues solved  🔵 2 issues created            │
│  🟣 4 todos created (2 from AI)                     │
│  📝 Full transcript • 12,500 words                  │
│                                                    > │
└─────────────────────────────────────────────────────┘
```

**Enhanced Detail Dialog - New Tabs:**
```jsx
┌─────────────────────────────────────────────────────────────┐
│  Leadership Team Meeting                    [📄 PDF]         │
│  📅 Oct 21, 2025    ⏱️ 90min    ⭐ 8.5/10                   │
│                                                              │
│  [Overview] [Issues] [To-Dos] [Attendees] [Notes] │         │
│  [🤖 AI Summary] [📝 Transcript] [🔍 Search]      ← NEW!   │
├──────────────────────────────────────────────────────────────┤
│  🤖 AI Summary Tab                                           │
│                                                              │
│  Executive Summary                                           │
│  The team discussed Q4 priorities focusing on hiring        │
│  and CRM implementation. Key decisions included             │
│  approving $360k hiring budget and selecting Salesforce     │
│  as the CRM platform. Three issues were resolved and        │
│  four action items assigned.                                │
│                                                              │
│  🎯 Key Decisions (2)                                        │
│  1. Approved hiring budget for 2 developers at $180k each  │
│  2. Moving forward with Salesforce as CRM platform         │
│                                                              │
│  ✅ Action Items Detected (4)                               │
│  ┌────────────────────────────────────────────────┐        │
│  │ John to get budget approval from CFO           │        │
│  │ Assigned: John Doe • Due: Oct 28              │        │
│  │ [✓ Already Created as To-Do]                  │        │
│  └────────────────────────────────────────────────┘        │
│  ┌────────────────────────────────────────────────┐        │
│  │ Sarah to schedule Salesforce demos             │        │
│  │ Suggested: Sarah Smith • Due: Nov 4           │        │
│  │ [Create To-Do]                                 │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
│  📊 Meeting Insights                                         │
│  • Sentiment: Positive 😊                                   │
│  • Energy Score: 8/10                                       │
│  • Most discussed topic: Hiring (25 minutes)               │
│                                                              │
└──────────────────────────────────────────────────────────────┘

│  📝 Transcript Tab                                           │
├──────────────────────────────────────────────────────────────┤
│  [Search in transcript...]                [Download ▾]      │
│                                                              │
│  Segue (5 min)                                              │
│  00:00:15 | John Doe                                        │
│  Good morning everyone. Let's start with a quick            │
│  personal best. Sarah, you're up first.                     │
│                                                              │
│  00:00:32 | Sarah Smith                                     │
│  My personal best is that my son made the honor roll...     │
│                                                              │
│  Scorecard Review (5 min)                                   │
│  00:05:45 | John Doe                                        │
│  Looking at our scorecard, revenue is at 98% of goal...    │
│                                                              │
│  [Jump to: Segue | Scorecard | Rocks | Headlines | IDS]   │
│                                                              │
└──────────────────────────────────────────────────────────────┘

│  🔍 Search Tab                                               │
├──────────────────────────────────────────────────────────────┤
│  [Search meetings...] "When did we discuss budget?"         │
│                                                              │
│  3 results found                                             │
│                                                              │
│  Oct 21, 2025 - Leadership Team                             │
│  "...we need to approve the budget for hiring..."          │
│  Speaker: John Doe at 00:43:15                              │
│                                                              │
│  Oct 14, 2025 - Leadership Team                             │
│  "...the budget situation looks good for Q4..."            │
│  Speaker: Sarah Smith at 01:12:30                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 3. Organization Settings - AI Controls

```jsx
┌─────────────────────────────────────────────────────┐
│  🤖 AI Meeting Assistant                            │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Enable AI Features                                 │
│  [✓] Enable AI transcription and summarization      │
│                                                      │
│  Consent & Privacy                                  │
│  [✓] Require consent banner before recording        │
│  [✓] Notify participants when being transcribed     │
│  [ ] Allow users to opt-out of transcription        │
│                                                      │
│  Custom Consent Message                             │
│  ┌────────────────────────────────────────────┐    │
│  │ This meeting will be transcribed and       │    │
│  │ summarized by AI to help capture action    │    │
│  │ items and decisions. By participating,     │    │
│  │ you consent to this recording.             │    │
│  └────────────────────────────────────────────┘    │
│                                                      │
│  Data Retention                                     │
│  Keep transcripts for: [7 years ▾]                 │
│  Options: 1 year, 7 years, Forever                 │
│                                                      │
│  Features                                           │
│  [✓] Automatic action item detection                │
│  [✓] Speaker identification                         │
│  [✓] Meeting sentiment analysis                     │
│  [✓] Enable transcript search                       │
│                                                      │
│  Costs (Estimated)                                  │
│  • Per 90-minute meeting: ~$2.00                   │
│  • Monthly (4 meetings/team): ~$8/team             │
│  • Included in Enterprise plan                     │
│                                                      │
│  [Save Settings]                                    │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## Cost Analysis

### Per-Meeting Costs

**Transcription (AssemblyAI):**
- $0.00025 per second
- 90-minute meeting = 5,400 seconds
- Cost: $1.35

**AI Summary (OpenAI GPT-4):**
- Input: ~12,000 words transcript = ~16,000 tokens
- Output: ~1,500 words summary = ~2,000 tokens
- Input cost: $0.03/1K tokens × 16 = $0.48
- Output cost: $0.06/1K tokens × 2 = $0.12
- Total: $0.60

**Total per meeting: ~$2.00**

### Monthly Costs per Organization

**Typical organization:**
- 3 teams
- 4 meetings per team per month
- 12 total meetings/month
- **Cost: $24/month**

**Large organization:**
- 10 teams
- 4 meetings per team per month
- 40 total meetings/month
- **Cost: $80/month**

### Pricing Strategy

**Option 1: Include in Plans**
- Starter: No AI features
- Professional ($99/mo): 20 meetings/month included
- Enterprise ($299/mo): Unlimited meetings

**Option 2: Add-on Pricing**
- AI Assistant Add-on: +$50/month
- Includes: 30 meetings, $2 per additional meeting

**Option 3: Pay-per-Use**
- $3 per meeting (50% markup on costs)
- Prepay credits: Buy 100 meetings for $250 (save $50)

**Recommendation: Option 1** - Include in Professional/Enterprise
- Simplifies pricing
- Increases perceived value
- Encourages usage
- Competitive with Otter/Fireflies pricing

---

## Compliance & Legal

### Legal Requirements by State

**Two-Party Consent States (12 states):**
- California, Connecticut, Florida, Illinois, Maryland, Massachusetts, Michigan, Montana, Nevada, New Hampshire, Pennsylvania, Washington

**Requirement:** ALL parties must consent before recording

**One-Party Consent States (38 states):**
**Requirement:** Only one party needs to consent

### Compliance Strategy

#### 1. Consent Banner (Required)
```jsx
┌─────────────────────────────────────────────────────┐
│  ⚠️ This meeting is being transcribed                │
│                                                      │
│  AI will capture and transcribe this conversation.  │
│  By continuing, you consent to being recorded.      │
│                                                      │
│  [Learn More] [I Do Not Consent] [I Consent]       │
└─────────────────────────────────────────────────────┘
```

#### 2. Opt-Out Mechanism
```javascript
// If user clicks "I Do Not Consent"
- Meeting proceeds without transcription
- OR user is removed from meeting
- Consent refusal is logged
```

#### 3. Terms of Service Update
Add section covering:
- AI transcription and data usage
- Third-party service providers (AssemblyAI)
- Data retention and deletion
- User rights and opt-out procedures

#### 4. Business Associate Agreement (BAA)
If customers are healthcare-related:
- Sign BAA with AssemblyAI (HIPAA compliance)
- Offer as Enterprise feature only
- Additional compliance measures

#### 5. GDPR Compliance (European customers)
- Data Processing Agreement (DPA)
- Right to access transcript data
- Right to delete transcript data
- Data transfer mechanisms

### Legal Protection Checklist
- [ ] Update Terms of Service
- [ ] Update Privacy Policy
- [ ] Create consent banner
- [ ] Implement consent logging
- [ ] Implement opt-out mechanism
- [ ] Implement data deletion
- [ ] Sign BAA with AssemblyAI
- [ ] Create DPA for GDPR
- [ ] Consult with lawyer (recommended)

---

## Implementation Approach

### Phase 1: MVP (4-6 weeks)

**Week 1-2: Backend Infrastructure**
- Set up AssemblyAI account and API integration
- Build WebSocket server for audio streaming
- Create database schema (meeting_transcripts table)
- Implement real-time transcription endpoint
- Test audio capture and streaming

**Week 3-4: Frontend Integration**
- Add "Enable AI" toggle to meeting start
- Implement microphone capture (WebRTC)
- Build real-time transcript display component
- Add consent banner
- Test end-to-end transcription

**Week 5-6: AI Summary Generation**
- Build GPT-4 prompt for meeting summarization
- Extract action items automatically
- Extract key decisions
- Create AI summary display UI
- Add to meeting history

**MVP Features:**
- ✅ Real-time transcription during meeting
- ✅ AI-generated summary after meeting
- ✅ Action item extraction
- ✅ Consent banner
- ✅ Transcript attached to meeting history

### Phase 2: Enhancement (4-6 weeks)

**Weeks 7-8: Speaker Identification**
- Implement speaker diarization
- Allow manual speaker labeling
- Save speaker mapping
- Display speakers in transcript

**Weeks 9-10: Advanced Features**
- Transcript search across all meetings
- Topic extraction and categorization
- Meeting sentiment analysis
- Energy/engagement scoring
- Jump-to-section in transcript

**Weeks 11-12: Polish & Scale**
- Download transcript (TXT, PDF, DOCX, VTT)
- Bulk transcript deletion (compliance)
- Performance optimization
- Comprehensive testing
- Documentation

### Phase 3: Advanced AI (Future)

**Future Enhancements:**
- Multi-language support
- Custom vocabulary per organization (train on their terms)
- Meeting insights dashboard (trends over time)
- Automatic Rock/Goal updates based on discussions
- AI meeting coach ("You spent 40% of time on one issue")
- Integration with Slack (post summaries)
- Integration with email (send summaries)

---

## Rollout Strategy

### Beta Testing (2-3 months)

**Beta Participants:**
- 3-5 friendly customers
- Your own internal meetings
- EOS consultants who are tech-savvy

**Beta Goals:**
- Validate transcription quality
- Test consent flows
- Measure accuracy of action item extraction
- Gather feedback on UI/UX
- Identify edge cases

**Beta Metrics:**
- Transcription accuracy (target: 95%+)
- AI action item accuracy (target: 80%+)
- User satisfaction (target: 8/10+)
- Adoption rate (% of meetings using AI)

### Production Rollout

**Phase 1: Soft Launch (Month 1)**
- Enable for Enterprise customers only
- Announced via email, not marketing site
- Offer white-glove onboarding
- Monitor closely for issues

**Phase 2: General Availability (Month 2)**
- Enable for Professional plan
- Add to marketing site
- Create demo videos
- Write blog post
- Press release

**Phase 3: Optimization (Month 3+)**
- Iterate based on feedback
- Improve AI prompts
- Add requested features
- Scale infrastructure

---

## Competitive Analysis

### How This Compares

**Ninety.io:** ❌ No AI transcription
**Otter.ai:** ✅ Has transcription, but generic (not EOS-aware)
**Fireflies.ai:** ✅ Has transcription, but separate tool
**Fellow.app:** ✅ Has transcription, but expensive ($20/user)

**AXP Advantage:**
- ✅ Built-in (no separate app)
- ✅ EOS-aware (knows Rocks, IDS, etc.)
- ✅ Creates Todos/Issues automatically
- ✅ Attached to meeting history
- ✅ More affordable ($50/org vs $20/user)

---

## Risk Mitigation

### Technical Risks

**Risk:** Poor transcription quality
**Mitigation:** 
- Use proven service (AssemblyAI)
- Require good audio quality
- Allow manual editing of transcript

**Risk:** High costs at scale
**Mitigation:**
- Start with premium tier only
- Monitor usage closely
- Implement usage caps
- Optimize prompts to reduce tokens

**Risk:** Service outage (AssemblyAI down)
**Mitigation:**
- Graceful degradation (meeting continues without AI)
- Multi-vendor strategy (Deepgram as backup)
- SLA guarantees in contract

### Legal Risks

**Risk:** Recording without consent
**Mitigation:**
- Mandatory consent banner
- Log all consents
- Prominent "Recording" indicator
- Easy opt-out mechanism
- Consult with lawyer

**Risk:** Data breach of sensitive transcripts
**Mitigation:**
- Encryption at rest and in transit
- SOC 2 certified services
- Regular security audits
- Data retention policies
- Incident response plan

### Business Risks

**Risk:** Low adoption (users don't enable AI)
**Mitigation:**
- Make it super easy (one click)
- Show value immediately (real-time transcript)
- Free trial period
- Success stories from beta users

**Risk:** Customers find it creepy
**Mitigation:**
- Transparent about AI usage
- Strong privacy controls
- Emphasize benefits (save time, capture everything)
- Make it optional, not default

---

## Success Metrics

### Product Metrics
- **Adoption Rate:** % of meetings with AI enabled (target: 60%+)
- **Transcription Quality:** Word error rate (target: <5%)
- **Action Item Accuracy:** % correctly identified (target: 80%+)
- **User Satisfaction:** NPS score (target: 50+)
- **Usage Growth:** Month-over-month increase (target: 20%+)

### Business Metrics
- **Revenue Impact:** MRR from AI feature (target: +$50K/year by end of year 1)
- **Churn Reduction:** Users with AI have lower churn (target: -25%)
- **Upgrade Rate:** Free → Paid due to AI (target: +15%)
- **Win Rate:** Deals won because of AI (target: measured in sales calls)

### Efficiency Metrics
- **Time Saved:** Minutes saved per meeting (target: 15 min/meeting)
- **Notes Accuracy:** % of action items captured (target: 95%+)
- **Search Usage:** Queries per user per month (target: 5+)

---

## Recommendation

### Go/No-Go Decision

**✅ YES - BUILD THIS**

**Why:**
1. **Clear differentiator** vs Ninety.io
2. **High perceived value** for customers
3. **Proven technology** (AssemblyAI is reliable)
4. **Reasonable costs** (~$2/meeting is profitable)
5. **Strong customer demand** (you already got this request)
6. **Improves core product** (better meeting history)

**Caveats:**
- Start with Enterprise/Professional only
- Beta test thoroughly (privacy/legal is critical)
- Have lawyer review consent flows
- Monitor costs closely during beta
- Be prepared to iterate on AI prompts

### Suggested Timeline

**Month 1-2:** Design + Backend (Phase 1)
**Month 3:** Frontend Integration (Phase 1)
**Month 4-5:** Beta Testing
**Month 6:** Polish and Prep for Launch
**Month 7:** Soft Launch (Enterprise only)
**Month 8:** General Availability

**Total: 8 months to full launch**

Or **4 months to working MVP** if you fast-track beta.

---

## Next Steps

If you decide to build this:

1. **Legal consultation** - Have lawyer review consent requirements
2. **AssemblyAI contract** - Sign up and review terms
3. **Cost modeling** - Model costs with expected usage
4. **Customer validation** - Talk to 5 customers about the feature
5. **Technical spike** - 2-week prototype to prove feasibility
6. **Roadmap integration** - Prioritize against other features

---

**This feature could be a game-changer for AXP. The question is: when, not if.**

Let me know if you want me to drill deeper into any section! 🚀
