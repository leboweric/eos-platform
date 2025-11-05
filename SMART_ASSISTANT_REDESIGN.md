# SMART Assistant Redesign - "What Does Great Look Like?"

## Vision

Transform the SMART Assistant into a conversational EOS implementer-style tool that helps users create Rocks by starting with the fundamental question: **"What does great look like?"**

## New User Flow

### Step 1: Rock Context
**Question:** "What Rock are you working on?"

**User Input:**
- Rock Title (required)
- Team/Department (optional - for context)
- Quarter & Year (auto-populated, editable)

**UI:** Simple form with large, friendly inputs

---

### Step 2: The Key Question
**Question (Large, Prominent):** 
> "What would it need to look like at the end of this quarter for this Rock to be great?"

**Subtext:** "Describe your vision of success in as much detail as possible. What would you see, measure, or experience if this Rock was completed perfectly?"

**User Input:**
- Large textarea (multi-line, expandable)
- Placeholder examples:
  - "We would have 50 new customers signed up..."
  - "The new system would be processing 1000 orders per day..."
  - "Our team would be fully trained and using the new process..."

**UI:** 
- Conversational, warm tone
- Large text area (minimum 5 rows)
- Character counter showing they've written enough (e.g., "Great detail! 250 characters")
- Encouraging prompts: "Tell us more..." if too short

---

### Step 3: Industry Context
**Question:** "What industry are you in?"

**User Input:**
- Dropdown or searchable select with common industries
- "Other" option with text input
- Optional but recommended

**Why:** Helps AI suggest industry-specific milestones and best practices

**UI:** Clean dropdown with search functionality

---

### Step 4: AI Processing
**Message:** "Creating your milestones based on what great looks like..."

**Behind the scenes:**
- Send vision, Rock title, industry to AI
- AI generates 4-6 milestones that lead to the "great" outcome
- Milestones are specific, measurable, and time-sequenced

**UI:** 
- Loading animation
- Progress message
- Estimated time: "This usually takes 10-15 seconds..."

---

### Step 5: Review & Refine Milestones
**Message:** "Here are the milestones we suggest to achieve your vision of great:"

**Display:**
- List of 4-6 milestones
- Each milestone shows:
  - Title
  - Description
  - Suggested due date (spread across quarter)
  - Checkbox to include/exclude

**User Actions:**
- Edit milestone text
- Adjust due dates
- Remove milestones
- Add custom milestones
- Regenerate all (with same vision)

**UI:**
- Card-based layout
- Drag to reorder
- Inline editing
- "Regenerate" button if not satisfied

---

### Step 6: Finalize & Save
**Message:** "Ready to create your Rock?"

**Display:**
- Summary of Rock
- Vision statement (what great looks like)
- Selected milestones
- Owner assignment

**User Actions:**
- Assign owner
- Confirm and create Rock
- Go back to edit

**UI:**
- Summary card
- Clear "Create Rock" CTA button
- "Back to Edit" option

---

## API Changes Needed

### New Endpoint: Generate Milestones from Vision

**POST** `/api/v1/organizations/:orgId/ai/rock-assistant/generate-from-vision`

**Request:**
```json
{
  "rockTitle": "Launch New Customer Portal",
  "vision": "At the end of Q1, we would have a fully functional customer portal where clients can log in, view their account status, submit support tickets, and download invoices. We'd see at least 200 customers actively using it with a satisfaction score of 4.5/5 or higher. The support team would report a 30% reduction in basic inquiry calls.",
  "industry": "Software/SaaS",
  "quarter": "Q1",
  "year": 2025,
  "teamId": "uuid-here"
}
```

**Response:**
```json
{
  "success": true,
  "milestones": [
    {
      "title": "Complete Portal Design & User Testing",
      "description": "Finalize UI/UX design with feedback from 10 beta customers",
      "suggestedDueDate": "2025-01-15",
      "order": 1
    },
    {
      "title": "Build Core Portal Features",
      "description": "Implement login, account view, and ticket submission functionality",
      "suggestedDueDate": "2025-02-01",
      "order": 2
    },
    {
      "title": "Beta Launch with 50 Customers",
      "description": "Onboard first 50 customers and gather feedback",
      "suggestedDueDate": "2025-02-15",
      "order": 3
    },
    {
      "title": "Full Launch & Marketing Push",
      "description": "Open portal to all customers with email campaign and training materials",
      "suggestedDueDate": "2025-03-01",
      "order": 4
    },
    {
      "title": "Achieve 200 Active Users & Measure Impact",
      "description": "Track adoption, satisfaction scores, and support call reduction",
      "suggestedDueDate": "2025-03-31",
      "order": 5
    }
  ],
  "rockSuggestion": {
    "title": "Launch Customer Portal with 200+ Active Users",
    "description": "Deploy a fully functional customer portal enabling self-service for account management, support tickets, and invoice downloads, achieving 200+ active users and 4.5/5 satisfaction while reducing support calls by 30%"
  }
}
```

---

## AI Prompt Design

### System Prompt
```
You are an expert EOS (Entrepreneurial Operating System) implementer helping a team create a quarterly Rock with clear milestones. Your role is to take their vision of "what great looks like" and break it down into 4-6 actionable milestones that will lead them to that outcome.

Key principles:
- Milestones should be specific and measurable
- They should build on each other sequentially
- They should span the quarter (13 weeks)
- They should be realistic but challenging
- Use industry best practices when relevant
- Keep language clear and action-oriented
```

### User Prompt Template
```
The team is working on this Rock:
Title: {rockTitle}
Industry: {industry}
Quarter: {quarter} {year}

Here's what "great" looks like to them at the end of the quarter:
"{vision}"

Based on this vision and their industry, suggest 4-6 milestones that will help them achieve this outcome. Each milestone should:
1. Have a clear, action-oriented title
2. Include a brief description of what success looks like
3. Build toward the final vision
4. Be spread across the quarter (start date: {quarterStart}, end date: {quarterEnd})

Respond in JSON format with the milestones array and an optional improved Rock title/description.
```

---

## UI/UX Design Principles

### Conversational Tone
- Use "you" and "your" language
- Ask questions like an implementer would
- Provide encouragement and guidance
- Avoid technical jargon

### Visual Design
- Large, readable text for questions
- Ample white space
- Progress indicator (Step 1 of 4, etc.)
- Warm, friendly colors (not cold/corporate)
- Brain/Sparkles icon for AI assistance

### Interaction Patterns
- Auto-save drafts
- Allow going back to previous steps
- Show what they've entered in summary
- Provide examples and hints
- Make it feel like a conversation, not a form

### Mobile Responsive
- Stack elements vertically on mobile
- Large touch targets
- Easy text input on mobile keyboards
- Swipe to navigate steps (optional)

---

## Implementation Plan

### Phase 1: Backend API
1. Create new endpoint for vision-based milestone generation
2. Update OpenAI service with new prompt template
3. Add industry context to prompts
4. Test with various industries and vision statements

### Phase 2: Frontend Redesign
1. Create new step-by-step wizard component
2. Implement "What does great look like?" input screen
3. Add industry selector
4. Build milestone review/edit interface
5. Create summary and save flow

### Phase 3: Integration
1. Connect frontend to new API endpoint
2. Add loading states and error handling
3. Implement draft saving
4. Add ability to edit and regenerate

### Phase 4: Polish
1. Add helpful examples and tooltips
2. Improve mobile responsiveness
3. Add animations for step transitions
4. Test with real users

---

## Success Metrics

- **Completion Rate:** % of users who start and finish creating a Rock
- **Milestone Acceptance:** % of AI-generated milestones kept vs. edited/removed
- **User Satisfaction:** Feedback on milestone quality
- **Time to Create:** How long it takes to create a Rock with milestones
- **Adoption:** % of Rocks created with SMART Assistant vs. manual

---

## Future Enhancements

1. **Learning from Feedback:** Track which milestones get edited/removed to improve AI
2. **Templates by Industry:** Pre-built milestone patterns for common Rocks
3. **Team Collaboration:** Multiple people can contribute to "what great looks like"
4. **Progress Tracking:** Show how milestones connect to the vision during the quarter
5. **Success Stories:** Share examples of Rocks that achieved "great"

---

## Key Differences from Current Implementation

| Current | New Design |
|---------|------------|
| Analyzes existing Rock for SMART criteria | Starts with vision, generates Rock |
| Technical scoring (0-100) | Conversational, human-centered |
| Multiple tabs and complex UI | Simple step-by-step wizard |
| Focuses on what's wrong | Focuses on what great looks like |
| Suggests improvements to existing text | Generates milestones from vision |
| Feels like a grading tool | Feels like working with an implementer |

---

This redesign transforms the SMART Assistant from an analysis tool into a **creation partner** that helps teams articulate their vision and build a roadmap to achieve it.

