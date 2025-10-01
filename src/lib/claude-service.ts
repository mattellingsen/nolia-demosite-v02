/**
 * Claude Service - Focused, Reliable AI Interactions
 *
 * This service provides focused Claude interactions with proper error handling,
 * retries, and transparent status reporting. No monolithic prompts.
 */

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { forceIAMRole } from './force-iam-role';

// CRITICAL: Force IAM role usage in production (prevents SSO errors)
forceIAMRole();

// Initialize Bedrock client with same credential pattern as working S3 client
const bedrock = new BedrockRuntimeClient({
  region: process.env.NOLIA_AWS_REGION || process.env.AWS_REGION || 'ap-southeast-2',
  ...(process.env.NODE_ENV === 'development' &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      !process.env.AWS_ACCESS_KEY_ID.startsWith('ASIA') ? {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  } : {
    // In production or when ASIA credentials are detected, force IAM Role by not providing credentials
  }),
});

export interface ClaudeRequest {
  task: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  retries?: number;
}

export interface ClaudeResponse {
  success: boolean;
  content: string;
  task: string;
  tokens: number;
  duration: number;
  error?: string;
  retryAttempt?: number;
}

export class ClaudeService {
  private static readonly DEFAULT_MAX_TOKENS = 4000;
  private static readonly DEFAULT_TEMPERATURE = 0.3;
  private static readonly DEFAULT_RETRIES = 2;
  private static readonly RETRY_DELAY_MS = 1000;

  /**
   * Execute a focused Claude task with automatic retries
   */
  async executeTask(request: ClaudeRequest): Promise<ClaudeResponse> {
    const startTime = Date.now();
    const maxRetries = request.retries ?? ClaudeService.DEFAULT_RETRIES;

    console.log(`🧠 Claude Task: ${request.task}`);
    console.log(`📝 Prompt length: ${request.prompt.length} characters`);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`🔄 Retry attempt ${attempt}/${maxRetries}`);
          await this.delay(ClaudeService.RETRY_DELAY_MS * attempt);
        }

        const response = await this.invokeClaude({
          ...request,
          maxTokens: request.maxTokens ?? ClaudeService.DEFAULT_MAX_TOKENS,
          temperature: request.temperature ?? ClaudeService.DEFAULT_TEMPERATURE,
        });

        const duration = Date.now() - startTime;

        console.log(`✅ Claude task completed: ${request.task} (${duration}ms)`);

        return {
          success: true,
          content: response.content,
          task: request.task,
          tokens: response.tokens,
          duration,
          retryAttempt: attempt > 0 ? attempt : undefined,
        };

      } catch (error) {
        const isLastAttempt = attempt === maxRetries;

        if (isLastAttempt) {
          const duration = Date.now() - startTime;
          console.error(`❌ Claude task failed after ${maxRetries + 1} attempts: ${request.task}`);

          return {
            success: false,
            content: '',
            task: request.task,
            tokens: 0,
            duration,
            error: error instanceof Error ? error.message : 'Unknown error',
            retryAttempt: attempt,
          };
        } else {
          console.warn(`⚠️ Claude task attempt ${attempt + 1} failed, retrying...`);
        }
      }
    }

    // This should never be reached due to the logic above, but TypeScript needs it
    throw new Error('Unexpected error in executeTask');
  }

  /**
   * Execute multiple Claude tasks in sequence
   */
  async executeTasks(requests: ClaudeRequest[]): Promise<ClaudeResponse[]> {
    const responses: ClaudeResponse[] = [];

    for (const request of requests) {
      const response = await this.executeTask(request);
      responses.push(response);

      // If a critical task fails, we might want to stop
      if (!response.success && request.task.includes('critical')) {
        console.error(`🛑 Critical task failed: ${request.task}, stopping execution`);
        break;
      }
    }

    return responses;
  }

  /**
   * Direct Claude invocation with proper error handling
   */
  private async invokeClaude(request: {
    prompt: string;
    maxTokens: number;
    temperature: number;
  }): Promise<{ content: string; tokens: number }> {

    const requestBody = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      messages: [
        {
          role: "user",
          content: request.prompt
        }
      ]
    };

    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
      body: JSON.stringify(requestBody),
      contentType: "application/json"
    });

    try {
      const response = await bedrock.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      if (responseBody.content && responseBody.content[0]?.text) {
        return {
          content: responseBody.content[0].text,
          tokens: responseBody.usage?.output_tokens || 0,
        };
      } else {
        throw new Error('Invalid response format from Claude');
      }
    } catch (error) {
      console.error('❌ Claude invocation failed:', error);
      throw error;
    }
  }

  /**
   * Utility to add delay between retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate prompt length to avoid context limit issues
   */
  static validatePromptLength(prompt: string, taskName: string, maxLength = 8000): void {
    if (prompt.length > maxLength) {
      console.warn(`⚠️ Task '${taskName}' has a long prompt (${prompt.length} chars). Consider splitting.`);
    }
  }

  /**
   * Create a focused prompt for a specific task
   */
  static createFocusedPrompt(
    task: string,
    content: string,
    instructions: string,
    outputFormat?: string
  ): string {
    let prompt = `Task: ${task}\n\n`;

    if (instructions) {
      prompt += `Instructions:\n${instructions}\n\n`;
    }

    if (content) {
      prompt += `Content to analyze:\n${content}\n\n`;
    }

    if (outputFormat) {
      prompt += `Output format:\n${outputFormat}\n\n`;
    }

    prompt += `Please provide a focused response for this specific task only.`;

    // Validate prompt length
    ClaudeService.validatePromptLength(prompt, task);

    return prompt;
  }
}

// Export a singleton instance
export const claudeService = new ClaudeService();