import { Injectable } from '@nestjs/common';
import { AccessService } from '../access/access.service';

@Injectable()
export class TelegramNotifyService {
  constructor(private readonly access: AccessService) {}

  async notifyByDomain(domain: string, message: string): Promise<void> {
    const member = await this.access.getMemberByDomainFull(domain);
    if (!member.telegramEnabled || !member.telegramBotToken || !member.telegramChatId) return;
    await fetch(`https://api.telegram.org/bot${member.telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: member.telegramChatId,
        text: message,
        parse_mode: 'HTML',
      }),
    }).catch(() => {
      // non-blocking notifications
    });
  }
}
