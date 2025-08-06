import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize OpenAI client only if API key is available
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
} else {
  console.warn('OpenAI API key not configured. AI features will be disabled.');
}

/**
 * Analyze a Rock/Priority for SMART criteria
 * Returns score, improvements, and suggested rewrite
 */
export const analyzeRockSMART = async (title, description = '') => {
  if (!openai) {
    return {
      success: false,
      error: 'OpenAI service not configured'
    };
  }
  
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
  if (!openai) {
    return {
      success: false,
      error: 'OpenAI service not configured'
    };
  }
  
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
  if (!openai) {
    return {
      success: false,
      error: 'OpenAI service not configured'
    };
  }
  
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
  if (!openai) {
    return {
      success: false,
      error: 'OpenAI service not configured'
    };
  }
  
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
 * Validate if OpenAI service is configured properly
 */
export const validateConfiguration = async () => {
  if (!process.env.OPENAI_API_KEY || !openai) {
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