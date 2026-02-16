/**
 * Stub AI Provider
 *
 * Mock AI provider that returns deterministic responses for testing
 * without requiring actual AI API calls.
 */

import { Injectable, Logger } from '@nestjs/common';

/**
 * Stub AI Response
 */
export interface StubAIResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * AI Suggestion Result
 */
export interface AISuggestionResult {
  suggestions: string[];
  confidence: number;
  model: string;
}

/**
 * Risk Analysis Result
 */
export interface AIRiskAnalysisResult {
  riskLevel: 'low' | 'medium' | 'high';
  factors: string[];
  recommendations: string[];
  model: string;
}

/**
 * Stub AI Provider
 *
 * Provides deterministic mock responses for AI operations.
 */
@Injectable()
export class StubAIProvider {
  private readonly logger = new Logger(StubAIProvider.name);

  /**
   * Counter for deterministic responses
   */
  private requestCount = 0;

  /**
   * Generate a stub completion response
   */
  async complete(prompt: string): Promise<StubAIResponse> {
    this.requestCount++;
    const requestNum = this.requestCount;

    return {
      content: `Mock AI response #${requestNum} for prompt: "${prompt.substring(0, 50)}..."`,
      model: 'stub-gpt-4',
      usage: {
        promptTokens: Math.floor(prompt.length / 4),
        completionTokens: 50,
        totalTokens: Math.floor(prompt.length / 4) + 50,
      },
    };
  }

  /**
   * Generate stub suggestions
   */
  async suggest(context: string, options?: { count?: number }): Promise<AISuggestionResult> {
    const count = options?.count ?? 3;
    this.requestCount++;

    return {
      suggestions: Array.from({ length: count }, (_, i) => `Suggestion ${i + 1} for: ${context}`),
      confidence: 0.85,
      model: 'stub-suggestion-model',
    };
  }

  /**
   * Generate stub risk analysis
   */
  async analyzeRisk(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _subject: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: Record<string, unknown>
  ): Promise<AIRiskAnalysisResult> {
    this.requestCount++;

    // Deterministic risk based on request count
    const riskLevels: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
    const riskIndex = this.requestCount % 3;

    return {
      riskLevel: riskLevels[riskIndex],
      factors: [
        'Stub factor 1 - no actual analysis performed',
        'Stub factor 2 - deterministic based on request count',
      ],
      recommendations: [
        'Review recommendations in production environment',
        'Use actual AI provider for real risk analysis',
      ],
      model: 'stub-risk-model',
    };
  }

  /**
   * Generate stub SDUI response
   */
  async generateSDUI(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _screenId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    return {
      screens: [
        {
          id: 'stub-screen',
          components: [
            { type: 'text', content: 'This is a stub SDUI response' },
            { type: 'button', label: 'Stub Action', action: 'stub' },
          ],
        },
      ],
    };
  }

  /**
   * Reset the request counter
   */
  reset(): void {
    this.requestCount = 0;
  }

  /**
   * Get the current request count
   */
  getRequestCount(): number {
    return this.requestCount;
  }
}
