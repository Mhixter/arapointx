import { db } from '../config/database';
import { agentNotifications, agentChannels, whatsappTemplates, adminSettings } from '../db/schema';
import { eq, and } from 'drizzle-orm';

interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  businessAccountId: string;
}

interface TemplateVariable {
  type: 'text';
  text: string;
}

interface NotificationPayload {
  agentType: 'cac' | 'identity' | 'education' | 'a2c' | 'bvn';
  agentId: string;
  userId?: string;
  requestType: string;
  requestId: string;
  templateName: string;
  variables: Record<string, string>;
}

class WhatsAppService {
  private baseUrl = 'https://graph.facebook.com/v18.0';

  private async getConfig(): Promise<WhatsAppConfig | null> {
    try {
      const [phoneNumberId, accessToken, businessAccountId] = await Promise.all([
        this.getSetting('whatsapp_phone_number_id'),
        this.getSetting('whatsapp_access_token'),
        this.getSetting('whatsapp_business_account_id'),
      ]);

      if (!phoneNumberId || !accessToken) {
        return null;
      }

      return {
        phoneNumberId,
        accessToken,
        businessAccountId: businessAccountId || '',
      };
    } catch {
      return null;
    }
  }

  private async getSetting(key: string): Promise<string | null> {
    const result = await db
      .select()
      .from(adminSettings)
      .where(eq(adminSettings.settingKey, key))
      .limit(1);
    return result[0]?.settingValue || null;
  }

  async getAgentWhatsAppNumber(agentType: string, agentId: string): Promise<string | null> {
    const channel = await db
      .select()
      .from(agentChannels)
      .where(
        and(
          eq(agentChannels.agentType, agentType),
          eq(agentChannels.agentId, agentId),
          eq(agentChannels.channelType, 'whatsapp'),
          eq(agentChannels.isActive, true)
        )
      )
      .limit(1);

    return channel[0]?.channelValue || null;
  }

  async getTemplate(templateName: string) {
    const template = await db
      .select()
      .from(whatsappTemplates)
      .where(
        and(
          eq(whatsappTemplates.templateName, templateName),
          eq(whatsappTemplates.isActive, true)
        )
      )
      .limit(1);

    return template[0] || null;
  }

  async queueNotification(payload: NotificationPayload): Promise<string> {
    const [notification] = await db
      .insert(agentNotifications)
      .values({
        agentType: payload.agentType,
        agentId: payload.agentId,
        userId: payload.userId || null,
        requestType: payload.requestType,
        requestId: payload.requestId,
        templateName: payload.templateName,
        payload: payload.variables,
        status: 'queued',
      })
      .returning();

    return notification.id;
  }

  async sendTemplateMessage(
    toPhone: string,
    templateName: string,
    variables: Record<string, string>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const config = await this.getConfig();
    if (!config) {
      return { success: false, error: 'WhatsApp API not configured' };
    }

    const template = await this.getTemplate(templateName);
    if (!template) {
      return { success: false, error: `Template "${templateName}" not found` };
    }

    const formattedPhone = this.formatPhoneNumber(toPhone);
    const templateVars = (template.variables as string[]) || [];
    const components: TemplateVariable[] = templateVars.map((varName: string) => ({
      type: 'text' as const,
      text: variables[varName] || '',
    }));

    try {
      const response = await fetch(
        `${this.baseUrl}/${config.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: formattedPhone,
            type: 'template',
            template: {
              name: template.metaTemplateId || templateName,
              language: { code: 'en' },
              components: components.length > 0 ? [
                {
                  type: 'body',
                  parameters: components,
                },
              ] : undefined,
            },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || 'Failed to send message',
        };
      }

      return {
        success: true,
        messageId: data.messages?.[0]?.id,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Network error',
      };
    }
  }

  async processQueuedNotifications(limit: number = 10): Promise<number> {
    const pendingNotifications = await db
      .select()
      .from(agentNotifications)
      .where(eq(agentNotifications.status, 'queued'))
      .limit(limit);

    let processed = 0;

    for (const notification of pendingNotifications) {
      const phone = await this.getAgentWhatsAppNumber(
        notification.agentType,
        notification.agentId
      );

      if (!phone) {
        await db
          .update(agentNotifications)
          .set({
            status: 'failed',
            errorMessage: 'Agent WhatsApp number not configured',
            attempts: (notification.attempts || 0) + 1,
            lastAttemptAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(agentNotifications.id, notification.id));
        continue;
      }

      const result = await this.sendTemplateMessage(
        phone,
        notification.templateName,
        notification.payload as Record<string, string>
      );

      if (result.success) {
        await db
          .update(agentNotifications)
          .set({
            status: 'sent',
            externalMessageId: result.messageId,
            sentAt: new Date(),
            attempts: (notification.attempts || 0) + 1,
            lastAttemptAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(agentNotifications.id, notification.id));
        processed++;
      } else {
        const newAttempts = (notification.attempts || 0) + 1;
        await db
          .update(agentNotifications)
          .set({
            status: newAttempts >= 3 ? 'failed' : 'queued',
            errorMessage: result.error,
            attempts: newAttempts,
            lastAttemptAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(agentNotifications.id, notification.id));
      }
    }

    return processed;
  }

  async notifyAgentOfNewRequest(
    agentType: 'cac' | 'identity' | 'education' | 'a2c' | 'bvn',
    agentId: string,
    requestDetails: {
      requestId: string;
      requestType: string;
      customerName?: string;
      amount?: number;
      description?: string;
      userId?: string;
    }
  ): Promise<string> {
    const templateMap: Record<string, string> = {
      bvn_modification: 'new_bvn_request',
      education_verification: 'new_education_request',
      a2c_request: 'new_a2c_request',
      cac_registration: 'new_cac_request',
      identity_request: 'new_identity_request',
    };

    const templateName = templateMap[requestDetails.requestType] || 'new_request';

    return this.queueNotification({
      agentType,
      agentId,
      userId: requestDetails.userId,
      requestType: requestDetails.requestType,
      requestId: requestDetails.requestId,
      templateName,
      variables: {
        request_id: requestDetails.requestId,
        customer_name: requestDetails.customerName || 'Customer',
        amount: requestDetails.amount?.toLocaleString() || '0',
        description: requestDetails.description || requestDetails.requestType,
        request_type: requestDetails.requestType.replace(/_/g, ' ').toUpperCase(),
      },
    });
  }

  private formatPhoneNumber(phone: string): string {
    let formatted = phone.replace(/\D/g, '');
    if (formatted.startsWith('0')) {
      formatted = '234' + formatted.substring(1);
    } else if (!formatted.startsWith('234')) {
      formatted = '234' + formatted;
    }
    return formatted;
  }

  async createDefaultTemplates(): Promise<void> {
    const defaultTemplates = [
      {
        templateName: 'new_bvn_request',
        displayName: 'New BVN Modification Request',
        description: 'Sent when a user submits a BVN modification request',
        templateContent: 'New BVN modification request received!\n\nRequest ID: {{request_id}}\nCustomer: {{customer_name}}\n\nPlease log in to process this request.',
        variables: ['request_id', 'customer_name'],
        category: 'transactional',
      },
      {
        templateName: 'new_education_request',
        displayName: 'New Education Verification Request',
        description: 'Sent when a user submits an education verification request',
        templateContent: 'New education verification request!\n\nRequest ID: {{request_id}}\nType: {{request_type}}\nCustomer: {{customer_name}}\n\nPlease process this request.',
        variables: ['request_id', 'request_type', 'customer_name'],
        category: 'transactional',
      },
      {
        templateName: 'new_a2c_request',
        displayName: 'New Airtime to Cash Request',
        description: 'Sent when a user submits an airtime to cash request',
        templateContent: 'New airtime to cash request!\n\nRequest ID: {{request_id}}\nAmount: ₦{{amount}}\nCustomer: {{customer_name}}\n\nUser has confirmed sending airtime. Please verify and process.',
        variables: ['request_id', 'amount', 'customer_name'],
        category: 'transactional',
      },
      {
        templateName: 'new_cac_request',
        displayName: 'New CAC Registration Request',
        description: 'Sent when a user submits a CAC registration request',
        templateContent: 'New CAC registration request!\n\nRequest ID: {{request_id}}\nType: {{request_type}}\nCustomer: {{customer_name}}\n\nPlease review and process.',
        variables: ['request_id', 'request_type', 'customer_name'],
        category: 'transactional',
      },
      {
        templateName: 'new_identity_request',
        displayName: 'New Identity Service Request',
        description: 'Sent when a user submits an identity service request',
        templateContent: 'New identity service request!\n\nRequest ID: {{request_id}}\nType: {{request_type}}\nCustomer: {{customer_name}}\n\nPlease process this request.',
        variables: ['request_id', 'request_type', 'customer_name'],
        category: 'transactional',
      },
      {
        templateName: 'new_request',
        displayName: 'New Request (Generic)',
        description: 'Generic notification for new requests',
        templateContent: 'New request received!\n\nRequest ID: {{request_id}}\nType: {{request_type}}\nCustomer: {{customer_name}}\n\nPlease log in to process.',
        variables: ['request_id', 'request_type', 'customer_name'],
        category: 'transactional',
      },
    ];

    for (const template of defaultTemplates) {
      const existing = await db
        .select()
        .from(whatsappTemplates)
        .where(eq(whatsappTemplates.templateName, template.templateName))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(whatsappTemplates).values(template);
      }
    }
  }
}

export const whatsappService = new WhatsAppService();
