/**
 * OpenAI Vision Provider
 *
 * Implementation of IVisionProvider using OpenAI's GPT-4 Vision API
 * for analyzing images and extracting structured MediaInsight data.
 *
 * @module media-insight/providers
 */

import { Injectable, Logger } from '@nestjs/common';
import type {
  IVisionProvider,
  VisionProviderConfig,
  VisionAnalysisRequest,
  VisionAnalysisResponse,
} from './vision-provider.interface';
import type { MediaInsight } from '../interfaces';
import { validateMediaInsight, createEmptyMediaInsight } from '../utils';

/**
 * Default prompt for vision analysis.
 * Instructs the AI to analyze moving-related images and return structured data.
 */
const VISION_PROMPT = `Analyze these images of items to be moved and provide a structured assessment.

Return a JSON object with this exact structure:
{
  "schemaVersion": "1.0.0",
  "detectedItems": [
    {
      "label": "string (e.g., 'sofa', 'fridge')",
      "category": "furniture|appliance|fragile|box|vehicle|other",
      "sizeClass": "small|medium|large|extra-large",
      "quantity": number,
      "confidence": number (0-1)
    }
  ],
  "estimatedTotalVolumeM3": number,
  "estimatedLaborIntensity": number (1-5),
  "fragilityScore": number (0-1),
  "specialHandlingRequired": boolean,
  "perceptionConfidence": number (0-1)
}

Focus on:
- Identifying all visible items
- Estimating total volume in cubic meters
- Assessing labor requirements (movers needed)
- Identifying fragile items
- Noting items requiring special handling

Return ONLY the JSON object, no additional text.`;

/**
 * Default model for OpenAI Vision API.
 */
const DEFAULT_MODEL = 'gpt-4o';

/**
 * Default timeout in milliseconds.
 */
const DEFAULT_TIMEOUT = 30000;

/**
 * OpenAI Vision API response structure.
 */
interface OpenAIVisionAPIResponse {
  choices: Array<{
    message: {
      content: string | null;
    };
    finish_reason: string;
  }>;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI GPT-4 Vision provider implementation.
 *
 * This provider:
 * - Connects to OpenAI's Vision API
 * - Sends images for analysis
 * - Parses responses into MediaInsight structures
 * - Handles errors gracefully (never throws)
 */
@Injectable()
export class OpenAIVisionProvider implements IVisionProvider {
  readonly name = 'openai';

  private readonly logger = new Logger(OpenAIVisionProvider.name);

  private config: VisionProviderConfig = {};
  private _isAvailable = false;

  /**
   * Whether the provider is available for use.
   * Requires API key and endpoint to be configured.
   */
  get isAvailable(): boolean {
    return this._isAvailable;
  }

  /**
   * Initialize the OpenAI Vision provider with configuration.
   *
   * @param config - Provider configuration including API key and endpoint
   */
  async initialize(config: VisionProviderConfig): Promise<void> {
    this.config = {
      model: DEFAULT_MODEL,
      timeout: DEFAULT_TIMEOUT,
      ...config,
    };

    this._isAvailable = !!(config.apiKey && config.endpoint);

    if (this._isAvailable) {
      this.logger.log(
        `OpenAI Vision provider initialized with model: ${this.config.model}`
      );
    } else {
      this.logger.warn(
        'OpenAI Vision provider not initialized - missing apiKey or endpoint'
      );
    }
  }

  /**
   * Analyze images using OpenAI Vision API.
   * Never throws - returns null insight on failure.
   *
   * @param request - Analysis request with image URLs
   * @returns Analysis response with parsed insight or null
   */
  async analyze(request: VisionAnalysisRequest): Promise<VisionAnalysisResponse> {
    const startTime = Date.now();
    const modelVersion = this.config.model || DEFAULT_MODEL;

    if (!this._isAvailable) {
      return this.createUnavailableResponse(startTime, modelVersion);
    }

    try {
      const response = await this.callOpenAIAPI(request);
      const parsedInsight = this.parseResponse(response);

      return {
        rawResponse: response,
        parsedInsight,
        processingTimeMs: Date.now() - startTime,
        modelVersion,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`OpenAI Vision analysis failed: ${errorMessage}`);

      return {
        rawResponse: null,
        parsedInsight: null,
        processingTimeMs: Date.now() - startTime,
        modelVersion,
      };
    }
  }

  /**
   * Check if the OpenAI API is accessible.
   *
   * @returns True if the provider can make API calls
   */
  async healthCheck(): Promise<boolean> {
    if (!this._isAvailable) {
      return false;
    }

    try {
      // Make a minimal API call to check connectivity
      // In production, you might use a dedicated health endpoint
      const response = await fetch(`${this.config.endpoint}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        signal: AbortSignal.timeout(5000),
      });

      return response.ok;
    } catch (error) {
      this.logger.warn(`OpenAI health check failed: ${error}`);
      return false;
    }
  }

  /**
   * Call the OpenAI Vision API.
   *
   * @param request - Analysis request with image URLs
   * @returns Raw API response
   */
  private async callOpenAIAPI(request: VisionAnalysisRequest): Promise<OpenAIVisionAPIResponse> {
    const { imageUrls, prompt } = request;

    // Build the message content with images
    const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      {
        type: 'text',
        text: prompt || VISION_PROMPT,
      },
    ];

    // Add images to the content
    for (const url of imageUrls) {
      content.push({
        type: 'image_url',
        image_url: {
          url,
        },
      });
    }

    const requestBody = {
      model: this.config.model || DEFAULT_MODEL,
      messages: [
        {
          role: 'user',
          content,
        },
      ],
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    };

    const timeout = this.config.timeout || DEFAULT_TIMEOUT;

    const response = await fetch(`${this.config.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    return (await response.json()) as OpenAIVisionAPIResponse;
  }

  /**
   * Parse the OpenAI API response into a MediaInsight structure.
   *
   * @param response - Raw API response
   * @returns Validated MediaInsight or null if parsing fails
   */
  private parseResponse(response: OpenAIVisionAPIResponse): MediaInsight | null {
    const content = response.choices?.[0]?.message?.content;

    if (!content) {
      this.logger.warn('OpenAI response has no content');
      return null;
    }

    try {
      const parsed: unknown = JSON.parse(content);

      // Validate the parsed structure
      const validation = validateMediaInsight(parsed);

      if (!validation.valid) {
        this.logger.warn(
          `Invalid MediaInsight response: ${validation.errors.join(', ')}`
        );
        return null;
      }

      // Add metadata
      const insight: MediaInsight = {
        ...(parsed as MediaInsight),
        modelVersion: response.model,
        analyzedAt: new Date().toISOString(),
      };

      return insight;
    } catch (error) {
      this.logger.warn(`Failed to parse OpenAI response: ${error}`);
      return null;
    }
  }

  /**
   * Create a response for when the provider is unavailable.
   *
   * @param startTime - Start time of the request
   * @param modelVersion - Model version string
   * @returns Unavailable response
   */
  private createUnavailableResponse(
    startTime: number,
    modelVersion: string
  ): VisionAnalysisResponse {
    return {
      rawResponse: null,
      parsedInsight: createEmptyMediaInsight(modelVersion),
      processingTimeMs: Date.now() - startTime,
      modelVersion: 'unavailable',
    };
  }
}
