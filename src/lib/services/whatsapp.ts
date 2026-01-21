/**
 * WhatsApp Service - Twilio API Client
 * Handles sending messages via Twilio WhatsApp Business Platform
 */

interface TwilioConfig {
  accountSid: string;
  apiKeySid: string;
  apiKeySecret: string;
  fromNumber: string; // WhatsApp-enabled Twilio number
}

interface SendMessageParams {
  to: string; // Phone number in E.164 format
  text: string;
}

interface SendTemplateParams {
  to: string;
  templateSid?: string; // Twilio Content Template SID
  templateName?: string; // Template name (alternative to SID)
  languageCode?: 'en' | 'es';
  components?: any[];
  variables?: Record<string, string>;
}

interface TwilioMessageResponse {
  sid: string;
  status: string;
  to: string;
  from: string;
  body: string;
  date_created: string;
  error_code?: number;
  error_message?: string;
}

class WhatsAppService {
  private config: TwilioConfig;
  private baseUrl: string;

  constructor(config?: TwilioConfig) {
    this.config = config || {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      apiKeySid: process.env.TWILIO_API_KEY_SID || '',
      apiKeySecret: process.env.TWILIO_API_KEY_SECRET || '',
      fromNumber: process.env.TWILIO_WHATSAPP_NUMBER || '',
    };

    this.baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}`;
    this.validateConfig();
  }

  private validateConfig(): void {
    if (!this.config.accountSid) {
      throw new Error('TWILIO_ACCOUNT_SID environment variable is required');
    }
    if (!this.config.apiKeySid) {
      throw new Error('TWILIO_API_KEY_SID environment variable is required');
    }
    if (!this.config.apiKeySecret) {
      throw new Error('TWILIO_API_KEY_SECRET environment variable is required');
    }
    if (!this.config.fromNumber) {
      throw new Error('TWILIO_WHATSAPP_NUMBER environment variable is required');
    }
  }

  /**
   * Get Basic Auth header for Twilio API
   */
  private getAuthHeader(): string {
    const credentials = Buffer.from(
      `${this.config.apiKeySid}:${this.config.apiKeySecret}`
    ).toString('base64');
    return `Basic ${credentials}`;
  }

  /**
   * Format phone number for WhatsApp
   * Twilio requires "whatsapp:+1234567890" format
   */
  private formatWhatsAppNumber(phone: string): string {
    // Ensure phone starts with +
    const normalized = phone.startsWith('+') ? phone : `+${phone}`;
    return `whatsapp:${normalized}`;
  }

  /**
   * Send a text message to a WhatsApp user
   *
   * @param params - Message parameters
   * @returns Message SID from Twilio API
   *
   * @example
   * ```typescript
   * const messageSid = await whatsAppService.sendMessage({
   *   to: '+14155552671',
   *   text: '✅ Proposal created successfully!'
   * });
   * ```
   */
  async sendMessage(params: SendMessageParams): Promise<string> {
    const url = `${this.baseUrl}/Messages.json`;

    const formData = new URLSearchParams();
    formData.append('To', this.formatWhatsAppNumber(params.to));
    formData.append('From', this.formatWhatsAppNumber(this.config.fromNumber));
    formData.append('Body', params.text);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: this.getAuthHeader(),
        },
        body: formData.toString(),
      });

      const data: TwilioMessageResponse = await response.json();

      if (!response.ok || data.error_code) {
        throw new Error(
          `Twilio API error: ${data.error_message || 'Unknown error'} (${data.error_code || response.status})`
        );
      }

      return data.sid;
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error);
      throw error;
    }
  }

  /**
   * Send a template message using Twilio Content Templates
   *
   * Note: Twilio uses Content Templates (Content API) for pre-approved messages.
   * For basic notifications within 24-hour session window, use sendMessage instead.
   *
   * @param params - Template parameters
   * @returns Message SID from Twilio API
   */
  async sendTemplate(params: SendTemplateParams): Promise<string> {
    const url = `${this.baseUrl}/Messages.json`;

    const formData = new URLSearchParams();
    formData.append('To', this.formatWhatsAppNumber(params.to));
    formData.append('From', this.formatWhatsAppNumber(this.config.fromNumber));
    formData.append('ContentSid', params.templateSid);

    if (params.variables) {
      formData.append('ContentVariables', JSON.stringify(params.variables));
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: this.getAuthHeader(),
        },
        body: formData.toString(),
      });

      const data: TwilioMessageResponse = await response.json();

      if (!response.ok || data.error_code) {
        throw new Error(
          `Twilio API error: ${data.error_message || 'Unknown error'} (${data.error_code || response.status})`
        );
      }

      return data.sid;
    } catch (error) {
      console.error('Failed to send WhatsApp template:', error);
      throw error;
    }
  }

  /**
   * Mark a message as read
   * Note: Twilio doesn't have a direct "mark as read" API like Meta.
   * Read receipts are handled automatically by WhatsApp when you respond.
   *
   * @param messageId - Twilio message SID
   */
  async markMessageAsRead(messageId: string): Promise<void> {
    // Twilio handles read receipts automatically
    // This is a no-op for compatibility with the router
    console.log(`Message ${messageId} - read receipts handled by Twilio automatically`);
  }

  /**
   * Send typing indicator
   * Note: Twilio doesn't support typing indicators for WhatsApp
   *
   * @param to - Phone number in E.164 format
   */
  async sendTypingIndicator(to: string): Promise<void> {
    console.log(`Typing indicator not supported by Twilio WhatsApp for ${to}`);
  }

  /**
   * Fetch message status
   *
   * @param messageSid - Twilio message SID
   * @returns Message status
   */
  async getMessageStatus(messageSid: string): Promise<string> {
    const url = `${this.baseUrl}/Messages/${messageSid}.json`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: this.getAuthHeader(),
        },
      });

      const data: TwilioMessageResponse = await response.json();
      return data.status;
    } catch (error) {
      console.error('Failed to get message status:', error);
      throw error;
    }
  }
}

// Singleton instance
let whatsAppServiceInstance: WhatsAppService | null = null;

/**
 * Get WhatsApp service instance (singleton)
 */
export function getWhatsAppService(): WhatsAppService {
  if (!whatsAppServiceInstance) {
    whatsAppServiceInstance = new WhatsAppService();
  }
  return whatsAppServiceInstance;
}

export default WhatsAppService;
export type {
  TwilioConfig,
  SendMessageParams,
  SendTemplateParams,
};
