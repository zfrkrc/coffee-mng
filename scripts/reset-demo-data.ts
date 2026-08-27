/**
 * Demo verisi temizliği — belirli bir şubedeki sipariş/hesap kayıtlarını siler.
 *
 * Kullanım:
 *   ts-node scripts/reset-demo-data.ts <branchSlug> [--confirm]
 *
 * Varsayılan davranış DRY-RUN'dur: ne sileceğini listeler, hiçbir şey silmez.
 * `--confirm` bayrağı OLMADAN hiçbir kayıt silinmez.
 * Üretim şubeleri (PROTECTED_BRANCHES) isim listesiyle korunur — bunlara asla dokunmaz.
 *
 * Member domain opsiyonel env ile verilir (MEMBER_DOMAIN); default cafeos.waycoffee.com.tr.
 */
import { PrismaClient } from '@prisma/client';

const PROTECTED_BRANCHES = new Set(['production', 'live', 'main', 'ana']);
const MEMBER_DOMAIN = process.env.MEMBER_DOMAIN || 'cafeos.waycoffee.com.tr';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const branchSlug = args.find((a) => !a.startsWith('--'));
  const confirm = args.includes('--confirm');

  if (!branchSlug) {
    console.error('Kullanım: ts-node scripts/reset-demo-data.ts <branchSlug> [--confirm]');
    process.exit(1);
  }
  if (PROTECTED_BRANCHES.has(branchSlug.toLowerCase())) {
    console.error(`⛔ KORUMA: '${branchSlug}' üretim şubesi listesinde — silme ENGELLENDİ.`);
    process.exit(1);
  }

  const db = new PrismaClient();
  const where = { memberId: MEMBER_DOMAIN, branchSlug };

  const orders = await db.order.findMany({ where, orderBy: { createdAt: 'asc' } });
  const accounts = await db.tableAccount.findMany({ where, orderBy: { openedAt: 'asc' } });
  const shifts = await db.dayShift.findMany({ where });

  const totalCents = orders.reduce((a, o) => a + o.totalCents, 0);

  console.log(`\nŞube: ${MEMBER_DOMAIN}::${branchSlug}`);
  console.log(`Sipariş: ${orders.length} · Hesap: ${accounts.length} · Vardiya: ${shifts.length} · Toplam: ${(totalCents / 100).toFixed(2)} TL`);
  if (orders.length) {
    console.log('\nSilinecek siparişler:');
    for (const o of orders) {
      console.log(`  ${o.id.slice(0, 8)}  ${o.tableCode}  ${(o.totalCents / 100).toFixed(0)} TL  ${o.status}`);
    }
  }

  if (!confirm) {
    console.log('\n[DRY-RUN] Hiçbir şey silinmedi. Silmek için --confirm ekleyin.');
    await db.$disconnect();
    process.exit(0);
  }

  await db.$transaction(async (tx) => {
    await tx.orderItem.deleteMany({ where: { order: { memberId: MEMBER_DOMAIN, branchSlug } } });
    await tx.order.deleteMany({ where });
    await tx.tableAccount.deleteMany({ where });
    await tx.dayShift.deleteMany({ where });
  });

  console.log(`\n✅ ${orders.length} sipariş, ${accounts.length} hesap, ${shifts.length} vardiya silindi.`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error('Hata:', e?.message || e);
  process.exit(1);
});
