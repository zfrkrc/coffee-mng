import { Injectable, Logger } from '@nestjs/common';
import { AccessService } from '../access/access.service';

@Injectable()
export class TelegramNotifyService {
  private readonly logger = new Logger(TelegramNotifyService.name);

  constructor(private readonly access: AccessService) {}

  async notifyByDomain(domain: string, message: string): Promise<void> {
    const member = await this.access.getMemberByDomainFull(domain);
    if (!member.telegramEnabled || !member.telegramBotToken || !member.telegramChatId) return;

    // Bildirim gönderimi bilinçli olarak akışı bloklamaz, ama hatası yutulmamalı:
    // yanlış token/chat_id durumunda sessizce kaybolursa kimse fark etmiyor.
    try {
      const resp = await fetch(
        `https://api.telegram.org/bot${member.telegramBotToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: member.telegramChatId,
            text: message,
            parse_mode: 'HTML',
          }),
        },
      );

      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        this.logger.error(
          `Telegram bildirimi başarısız (domain=${domain}, HTTP ${resp.status}): ${body.slice(0, 200)}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Telegram bildirimi gönderilemedi (domain=${domain}): ${(err as Error).message}`,
      );
    }
  }
}
