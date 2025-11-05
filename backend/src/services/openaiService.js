import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Analyze a Rock/Priority for SMART criteria
 * Returns score, improvements, and suggested rewrite
 */
export const analyzeRockSMART = async (title, description = '') => {
  try {
    const prompt = `You are an expert in the Entrepreneurial Operating System (EOS) and SMART goal setting. Analyze this quarterly priority (Rock) and provide detailed feedback.

Rock Title: ${title}
Rock Description: ${description || 'No description provided'}

Please analyze this Rock against SMART criteria and provide:

1. SMART Score (0-100): Give an overall score
2. Individual Scores:
   - Specific (0-100): Is it clear what needs to be accomplished?
   - Measurable (0-100): Are there quantifiable success metrics?
   - Achievable (0-100): Is it realistic for a quarter?
   - Relevant (0-100): Does it align with business objectives?
   - Time-bound (0-100): Are there clear deadlines?
3. Specific Improvements: For each criterion, explain what's missing or could be better
4. Suggested Rewrite: Provide an improved version of the Rock title and description
5. Key Issues: List the top 3 issues preventing this from being SMART

Respond in JSON format:
{
  "overallScore": number,
  "scores": {
    "specific": number,
    "measurable": number,
    "achievable": number,
    "relevant": number,
    "timeBound": number
  },
  "improvements": {
    "specific": "string",
    "measurable": "string",
    "achievable": "string",
    "relevant": "string",
    "timeBound": "string"
  },
  "suggestedRewrite": {
    "title": "string",
    "description": "string"
  },
  "keyIssues": ["string", "string", "string"]
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an EOS implementer helping teams create SMART Rocks. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('Error analyzing Rock:', error);
    return {
      success: false,
      error: error.message || 'Failed to analyze Rock'
    };
  }
};

/**
 * Generate milestone suggestions for a Rock
 */
export const generateMilestones = async (title, description, dueDate, startDate = new Date()) => {
  try {
    const prompt = `You are an expert in project management and the EOS system. Generate quarterly milestones for this Rock.

Rock Title: ${title}
Rock Description: ${description || 'No description provided'}
Start Date: ${startDate.toISOString().split('T')[0]}
Due Date: ${dueDate}

Generate 3-5 milestones that:
1. Break down the Rock into logical steps
2. Have specific due dates spread across the quarter
3. Are measurable and concrete
4. Build upon each other progressively

Respond in JSON format:
{
  "milestones": [
    {
      "title": "string",
      "description": "string",
      "dueDate": "YYYY-MM-DD",
      "successCriteria": "string"
    }
  ],
  "reasoning": "string explaining the milestone breakdown"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an EOS implementer helping teams create actionable milestones. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('Error generating milestones:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate milestones'
    };
  }
};

/**
 * Check alignment between a Department Rock and Company Rocks
 */
export const checkRockAlignment = async (departmentRock, companyRocks) => {
  try {
    const companyRocksList = companyRocks.map((rock, index) => 
      `${index + 1}. ${rock.title}${rock.description ? ': ' + rock.description : ''}`
    ).join('\n');

    const prompt = `You are an expert in organizational alignment and the EOS system. Analyze how well this Department Rock aligns with Company Rocks.

Department Rock:
Title: ${departmentRock.title}
Description: ${departmentRock.description || 'No description provided'}

Company Rocks:
${companyRocksList}

Analyze:
1. Which Company Rock(s) does this best support? (provide index numbers)
2. How strong is the alignment? (0-100 score)
3. What adjustments would improve alignment?
4. Is this Rock potentially misaligned or working against Company priorities?

Respond in JSON format:
{
  "alignmentScore": number,
  "alignedWithRocks": [number],
  "alignmentExplanation": "string",
  "suggestedAdjustments": ["string"],
  "potentialConflicts": ["string"],
  "recommendation": "string"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an EOS implementer helping ensure organizational alignment. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('Error checking alignment:', error);
    return {
      success: false,
      error: error.message || 'Failed to check alignment'
    };
  }
};

/**
 * Generate a complete SMART Rock from a rough idea
 */
export const generateSmartRock = async (roughIdea, context = {}) => {
  try {
    const { quarter, year, teamName, ownerName } = context;
    
    const prompt = `You are an expert EOS implementer. Transform this rough idea into a complete SMART Rock.

Rough Idea: ${roughIdea}
Quarter: ${quarter || 'Current Quarter'}
Year: ${year || new Date().getFullYear()}
Team: ${teamName || 'Not specified'}
Owner: ${ownerName || 'Not specified'}

Create a complete SMART Rock with:
1. A clear, action-oriented title (max 100 characters)
2. A detailed description explaining success criteria
3. 3-5 specific milestones with dates
4. Key metrics to track progress
5. Dependencies or prerequisites

Respond in JSON format:
{
  "title": "string",
  "description": "string",
  "successCriteria": ["string"],
  "keyMetrics": ["string"],
  "milestones": [
    {
      "title": "string",
      "dueDate": "YYYY-MM-DD"
    }
  ],
  "dependencies": ["string"],
  "estimatedEffort": "string (e.g., '10-15 hours/week')",
  "potentialRisks": ["string"]
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an EOS implementer helping teams create exceptional SMART Rocks. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('Error generating SMART Rock:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate SMART Rock'
    };
  }
};

/**
 * Generate multiple complete SMART Rock options from a user's vision of success.
 */
export const generateRocksFromVision = async (vision, context = {}, numberOfOptions = 3) => {
  try {
    const { 
      userName,
      organizationName,
      teamName,
      teamType,
      quarter,
      year,
      companyRocks,
      vto
    } = context;

    // Build VTO context sections
    let vtoSections = '';
    
    if (vto) {
      // Core Focus
      if (vto.coreFocus && (vto.coreFocus.purpose_cause_passion || vto.coreFocus.niche)) {
        vtoSections += '\n**CORE FOCUS:**\n';
        if (vto.coreFocus.purpose_cause_passion) vtoSections += `- Purpose/Passion: ${vto.coreFocus.purpose_cause_passion}\n`;
        if (vto.coreFocus.niche) vtoSections += `- Niche: ${vto.coreFocus.niche}\n`;
      }
      
      // Core Values
      if (vto.coreValues && vto.coreValues.length > 0) {
        vtoSections += '\n**CORE VALUES:**\n';
        vto.coreValues.forEach(cv => {
          vtoSections += `- ${cv.value_text}${cv.description ? ': ' + cv.description : ''}\n`;
        });
      }
      
      // 3-Year Picture
      if (vto.threeYearPicture) {
        vtoSections += '\n**3-YEAR PICTURE:**\n';
        if (vto.threeYearPicture.futureDate) vtoSections += `- Target Date: ${vto.threeYearPicture.futureDate}\n`;
        if (vto.threeYearPicture.revenue) vtoSections += `- Revenue Target: $${vto.threeYearPicture.revenue}\n`;
        if (vto.threeYearPicture.profit) vtoSections += `- Profit Target: $${vto.threeYearPicture.profit}\n`;
        if (vto.threeYearPicture.bullets && vto.threeYearPicture.bullets.length > 0) {
          vtoSections += '- What does it look like:\n';
          vto.threeYearPicture.bullets.forEach(bullet => {
            vtoSections += `  • ${bullet}\n`;
          });
        }
      }
      
      // 1-Year Goals
      if (vto.oneYearGoals && vto.oneYearGoals.length > 0) {
        vtoSections += '\n**1-YEAR GOALS:**\n';
        vto.oneYearGoals.forEach(goal => {
          vtoSections += `- ${goal}\n`;
        });
      }
      
      // Marketing Strategy
      if (vto.marketingStrategy && (vto.marketingStrategy.three_uniques || vto.marketingStrategy.target_market)) {
        vtoSections += '\n**MARKETING STRATEGY:**\n';
        if (vto.marketingStrategy.three_uniques) vtoSections += `- Three Uniques: ${vto.marketingStrategy.three_uniques}\n`;
        if (vto.marketingStrategy.target_market) vtoSections += `- Target Market: ${vto.marketingStrategy.target_market}\n`;
      }
    }

    const prompt = `You are an expert EOS implementer helping ${userName || 'a professional'} at ${organizationName || 'their company'} create SMART quarterly Rocks that align with their Vision/Traction Organizer (VTO).

**COMPANY CONTEXT:**
- Company: ${organizationName || 'Not specified'}
- User: ${userName || 'Not specified'}
${teamName ? `- Team: ${teamName} (${teamType})` : ''}
- Quarter: ${quarter || 'Current Quarter'} ${year || new Date().getFullYear()}
${companyRocks ? `\n**CURRENT COMPANY ROCKS THIS QUARTER:**\n${companyRocks}\n` : ''}
${vtoSections}

**USER'S QUARTERLY GOAL:**
"""
${vision}
"""

Based on the user's quarterly goal and the provided VTO context, generate ${numberOfOptions} distinct, high-quality SMART Rock options. Each option must be a complete, actionable quarterly priority that strategically aligns with the company's vision.

**CRITICAL REQUIREMENTS:**
- Each Rock MUST align with at least one element from the VTO (Core Values, Core Focus, 3-Year Picture, 1-Year Goals)
- In the description, explicitly reference which VTO elements this Rock supports (e.g., "This Rock advances our 1-Year Goal of..." or "Aligns with our Core Value of...")
- Ensure the Rock is achievable within one quarter while contributing to longer-term strategic goals
- Make the Rock specific to the company's industry, niche, and target market from the Core Focus

For each Rock option, provide:
1.  **title**: A clear, action-oriented title (max 100 characters).
2.  **description**: A detailed description explaining the Rock, its purpose, and **which specific VTO elements it aligns with**.
3.  **successCriteria**: A list of 3-5 specific, measurable outcomes that define success.
4.  **keyMetrics**: A list of 2-4 metrics to track progress.
5.  **smartScore**: An overall SMART score (0-100).
6.  **smartBreakdown**: Individual scores for Specific, Measurable, Achievable, Relevant, and Time-bound (all 0-100).
7.  **milestones**: A list of 3-5 specific milestones with realistic due dates within the quarter.
8.  **potentialRisks**: A list of 2-3 potential risks or obstacles.

Respond in a valid JSON object with an "options" array. Example format for a single option:
{
  "title": "Launch New Client Onboarding Process to Reduce Churn by 15%",
  "description": "Implement a standardized, automated client onboarding process to improve initial client experience, increase product adoption, and reduce first-90-day churn.",
  "successCriteria": ["All new clients go through the standardized process", "Time-to-value for new clients is reduced by 20%", "Client churn within the first 90 days is reduced from 25% to 10%"],
  "keyMetrics": ["90-day Churn Rate", "Time-to-Value (days)", "Client Satisfaction Score (CSAT)"],
  "smartScore": 95,
  "smartBreakdown": { "specific": 98, "measurable": 95, "achievable": 90, "relevant": 98, "timeBound": 99 },
  "milestones": [
    { "title": "Map current onboarding process and identify pain points", "dueDate": "2025-10-15" },
    { "title": "Develop new automated workflow and training materials", "dueDate": "2025-11-15" },
    { "title": "Pilot new process with 5 new clients", "dueDate": "2025-12-05" },
    { "title": "Full rollout to all new clients", "dueDate": "2025-12-20" }
  ],
  "potentialRisks": ["Technical integration issues with CRM", "Resistance from sales team to adopt new process"]
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo', // Use a powerful model
      messages: [
        {
          role: 'system',
          content: 'You are an expert EOS implementer. Always respond with valid JSON that strictly follows the requested structure.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('Error generating SMART Rocks from vision:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate SMART Rocks'
    };
  }
};

/**
 * Validate if OpenAI service is configured properly
 */
export const validateConfiguration = async () => {
  if (!process.env.OPENAI_API_KEY) {
    return {
      configured: false,
      error: 'OpenAI API key not configured'
    };
  }

  try {
    // Test the API with a simple request
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: 'Say "configured" if this works'
        }
      ],
      max_tokens: 10
    });

    return {
      configured: true,
      message: 'OpenAI service configured successfully'
    };
  } catch (error) {
    return {
      configured: false,
      error: `OpenAI configuration error: ${error.message}`
    };
  }
};

/**
 * Generate a detailed action plan for a Rock
 * Provides week-by-week breakdown, suggested actions, blockers, and resources
 */
export const generateRockActionPlan = async ({ rock, milestones, vtoContext }) => {
  try {
    const milestonesText = milestones.length > 0
      ? milestones.map((m, i) => `${i + 1}. ${m.title}${m.description ? ` - ${m.description}` : ''} (Due: ${new Date(m.dueDate).toLocaleDateString()})`).join('\n')
      : 'No milestones defined yet';

    // Build VTO context section if available
    let vtoSection = '';
    if (vtoContext) {
      vtoSection = `\n**STRATEGIC CONTEXT (V/TO):**\n\n`;
      
      if (vtoContext.coreValues && vtoContext.coreValues.length > 0) {
        vtoSection += `**Core Values:**\n`;
        vtoContext.coreValues.forEach(v => {
          vtoSection += `- ${v.value}${v.description ? `: ${v.description}` : ''}\n`;
        });
        vtoSection += `\n`;
      }
      
      if (vtoContext.coreFocus) {
        vtoSection += `**Core Focus:**\n`;
        if (vtoContext.coreFocus.purpose_cause_passion) {
          vtoSection += `- Purpose/Cause/Passion: ${vtoContext.coreFocus.purpose_cause_passion}\n`;
        }
        if (vtoContext.coreFocus.niche) {
          vtoSection += `- Niche: ${vtoContext.coreFocus.niche}\n`;
        }
        vtoSection += `\n`;
      }
      
      if (vtoContext.marketingStrategy) {
        const ms = vtoContext.marketingStrategy;
        vtoSection += `**Marketing Strategy:**\n`;
        if (ms.target_market) vtoSection += `- Target Market: ${ms.target_market}\n`;
        if (ms.three_uniques) vtoSection += `- Three Uniques: ${ms.three_uniques}\n`;
        if (ms.proven_process) vtoSection += `- Proven Process: ${ms.proven_process}\n`;
        if (ms.guarantee) vtoSection += `- Guarantee: ${ms.guarantee}\n`;
        const differentiators = [ms.differentiator_1, ms.differentiator_2, ms.differentiator_3, ms.differentiator_4, ms.differentiator_5].filter(Boolean);
        if (differentiators.length > 0) {
          vtoSection += `- Differentiators: ${differentiators.join(', ')}\n`;
        }
        vtoSection += `\n`;
      }
      
      if (vtoContext.threeYearPicture) {
        const typ = vtoContext.threeYearPicture;
        vtoSection += `**3-Year Picture (${typ.future_date ? new Date(typ.future_date).getFullYear() : 'Future'}):**\n`;
        if (typ.revenue_target) vtoSection += `- Revenue Target: ${typ.revenue_target}\n`;
        if (typ.profit_target) vtoSection += `- Profit Target: ${typ.profit_target}\n`;
        if (typ.vision_description) vtoSection += `- Vision: ${typ.vision_description}\n`;
        if (typ.what_does_it_look_like_completions) {
          const completions = typ.what_does_it_look_like_completions;
          if (Array.isArray(completions) && completions.length > 0) {
            vtoSection += `- What It Looks Like:\n`;
            completions.forEach(item => {
              if (item.text) vtoSection += `  • ${item.text}\n`;
            });
          }
        }
        vtoSection += `\n`;
      }
      
      if (vtoContext.oneYearGoals && vtoContext.oneYearGoals.length > 0) {
        vtoSection += `**1-Year Goals:**\n`;
        vtoContext.oneYearGoals.forEach(goal => {
          vtoSection += `  • ${goal}\n`;
        });
        vtoSection += `\n`;
      }
    }

    const prompt = `You are an expert EOS implementer and project management coach. Generate a comprehensive, actionable execution plan for this Rock.

**ROCK DETAILS:**
Title: ${rock.title}
Description: ${rock.description || 'No description provided'}
Owner: ${rock.ownerName || 'Not assigned'}
Team: ${rock.teamName || 'Not specified'}
Quarter: Q${rock.quarter} ${rock.year}
Due Date: ${new Date(rock.dueDate).toLocaleDateString()}

**MILESTONES:**
${milestonesText}
${vtoSection}
**YOUR TASK:**
Create a detailed 1-2 page action plan that helps the Rock owner execute successfully. The plan should be practical, specific, and confidence-building.

**IMPORTANT:** Use the Strategic Context (V/TO) above to ensure this Rock's execution aligns with the company's core values, focus, long-term vision, and annual goals. Reference specific V/TO elements in your recommendations where relevant.

**REQUIRED SECTIONS:**

1. **Executive Summary** (2-3 sentences)
   - What success looks like for this Rock
   - Why it matters to the organization

2. **Week-by-Week Breakdown**
   - Divide the quarter into weekly focus areas
   - Map each week to specific milestones
   - Suggest 2-3 concrete actions per week
   - Be specific about what "done" looks like each week

3. **Getting Started: First 3 Actions**
   - What should the owner do in the first 48 hours?
   - List 3 specific, immediate actions to build momentum
   - Include who to talk to, what to set up, what to research

4. **Potential Blockers & Mitigation**
   - Identify 3-5 likely obstacles
   - For each blocker, provide a proactive mitigation strategy
   - Include early warning signs to watch for

5. **Resources & Support Needed**
   - What skills, tools, or budget might be required?
   - Who should be involved or consulted?
   - What dependencies exist with other teams?

6. **Progress Check-In Questions**
   - 5-7 questions the owner should ask themselves weekly
   - 3-4 questions for manager 1-on-1s
   - Help them self-assess if they're on track

7. **Success Metrics**
   - Beyond the milestones, what are leading indicators of success?
   - What should be measured weekly/bi-weekly?
   - What does "green" vs "yellow" vs "red" status look like?

**TONE & STYLE:**
- Encouraging and confidence-building
- Specific and actionable (avoid generic advice)
- Assume the owner wants to succeed but may lack experience
- Use bullet points and clear formatting
- Keep it to 1-2 pages when printed

**FORMAT:**
Return the plan in clean, well-formatted Markdown. Use headers (##), bullet points, and **bold** for emphasis.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an experienced EOS implementer and executive coach who helps teams execute their quarterly priorities (Rocks) successfully. You provide practical, actionable guidance that builds confidence and clarity.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2500
    });

    const actionPlan = response.choices[0].message.content;
    
    return actionPlan;

  } catch (error) {
    console.error('Error generating Rock action plan:', error);
    throw new Error(`Failed to generate action plan: ${error.message}`);
  }
};



/**
 * Generate AI suggestions for VTO "What does it look like?" bullets
 * Uses VTO context to create strategic, aligned suggestions
 */
export const generateVtoSuggestion = async (vtoContext, currentText = '') => {
  try {
    // Build context summary
    const coreValuesText = vtoContext.coreValues.length > 0
      ? vtoContext.coreValues.map(cv => `- ${cv.value}${cv.description ? `: ${cv.description}` : ''}`).join('\n')
      : 'Not defined';

    const coreFocusText = vtoContext.coreFocus
      ? `Purpose/Cause/Passion: ${vtoContext.coreFocus.purpose_cause_passion || 'Not defined'}\nNiche: ${vtoContext.coreFocus.niche || 'Not defined'}`
      : 'Not defined';

    const marketingText = vtoContext.marketing
      ? `Target Market: ${vtoContext.marketing.target_market || 'Not defined'}\nThree Uniques: ${vtoContext.marketing.three_uniques || 'Not defined'}`
      : 'Not defined';

    const threeYearText = vtoContext.threeYearPicture
      ? `Revenue Target: ${vtoContext.threeYearPicture.revenue_target || 'Not defined'}\nProfit Target: ${vtoContext.threeYearPicture.profit_target || 'Not defined'}`
      : 'Not defined';

    const prompt = `You are an expert EOS (Entrepreneurial Operating System) consultant helping a client articulate their 3-Year Picture™ vision.

**Context - Company's VTO:**

**Core Values:**
${coreValuesText}

**Core Focus:**
${coreFocusText}

**Marketing Strategy:**
${marketingText}

**3-Year Picture Targets:**
${threeYearText}

**Current Bullet Text:**
${currentText || '(blank - starting from scratch)'}

**Task:**
Generate 3 alternative versions of this "What does it look like?" bullet that:
1. Are specific, vivid, and inspiring
2. Align with the company's Core Values and Core Focus
3. Paint a clear picture of success 3 years from now
4. Are measurable or observable (not vague)
5. Use active, confident language
6. Are concise (1-2 sentences max)

If the current text is blank, create suggestions based on the VTO context.
If there is current text, improve it while maintaining the core intent.

**Important:** Each suggestion should be distinctly different in approach or emphasis.

Respond in JSON format:
{
  "suggestions": [
    "First alternative version",
    "Second alternative version",
    "Third alternative version"
  ]
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert EOS consultant who helps companies articulate clear, inspiring visions.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8, // Higher creativity for varied suggestions
      max_tokens: 500,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result.suggestions || [];

  } catch (error) {
    console.error('Error generating VTO suggestion:', error);
    throw new Error(`Failed to generate VTO suggestion: ${error.message}`);
  }
};

