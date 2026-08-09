import { Inject, Injectable } from '@nestjs/common';
import { AppError, uuidv7 } from '@cafeos/shared';
import type { MemberAccount, ServiceKey, StaffUser } from './access.types';
import { PRISMA } from '../../core/database/prisma.module';
import type { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const SUPERADMIN_EMAIL = 'zafer@zaferkaraca.net';

@Injectable()
export class AccessService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  isSuperadmin(email: string): boolean {
    return email.trim().toLowerCase() === SUPERADMIN_EMAIL;
  }

  async listMembers(): Promise<MemberAccount[]> {
    const rows = await this.prisma.accessMember.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map((row) => this.toMemberAccount(row));
  }

  async createMember(input: {
    email: string;
    displayName: string;
    domain: string;
    slug?: string;
    password?: string;
    services: ServiceKey[];
  }): Promise<MemberAccount> {
    const email = input.email.trim().toLowerCase();
    const domain = input.domain.trim().toLowerCase();
    const displayName = input.displayName.trim();
    const slug = this.normalizeSlug(input.slug ?? email.split('@')[0] ?? '');

    if (!email || !displayName || !domain || !slug) {
      throw AppError.validation('email, displayName, domain and slug are required');
    }

    const duplicate = await this.prisma.accessMember.findFirst({
      where: {
        OR: [{ email }, { domain }, { slug }],
      },
    });
    if (duplicate) {
      if (duplicate.email === email) throw AppError.conflict('Member email already exists');
      if (duplicate.domain === domain) throw AppError.conflict('Member domain already exists');
      throw AppError.conflict('Member slug already exists');
    }

    const created = await this.prisma.accessMember.create({
      data: {
        id: uuidv7(),
        email,
        slug,
        displayName,
        domain,
        services: Array.from(new Set(input.services)),
        active: true,
        token: this.generateMemberToken(domain),
        passwordHash: input.password ? await argon2.hash(input.password) : null,
      },
    });
    return this.toMemberAccount(created);
  }

  async updateMemberServices(memberId: string, services: ServiceKey[]): Promise<MemberAccount> {
    const exists = await this.prisma.accessMember.findUnique({ where: { id: memberId } });
    if (!exists) throw AppError.notFound('Member not found');
    const updated = await this.prisma.accessMember.update({
      where: { id: memberId },
      data: { services: Array.from(new Set(services)) },
    });
    return this.toMemberAccount(updated);
  }

  async rotateMemberToken(memberId: string): Promise<MemberAccount> {
    const member = await this.prisma.accessMember.findUnique({ where: { id: memberId } });
    if (!member) throw AppError.notFound('Member not found');
    const updated = await this.prisma.accessMember.update({
      where: { id: memberId },
      data: { token: this.generateMemberToken(member.domain) },
    });
    return this.toMemberAccount(updated);
  }

  async setMemberActive(memberId: string, active: boolean): Promise<MemberAccount> {
    const exists = await this.prisma.accessMember.findUnique({ where: { id: memberId } });
    if (!exists) throw AppError.notFound('Member not found');
    const updated = await this.prisma.accessMember.update({ where: { id: memberId }, data: { active } });
    return this.toMemberAccount(updated);
  }

  async listStaff(memberId: string): Promise<StaffUser[]> {
    const rows = await this.prisma.accessStaff.findMany({
      where: { memberId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.toStaffUser(row));
  }

  async createStaff(memberId: string, input: { email: string; displayName: string; role: StaffUser['role']; password?: string }): Promise<StaffUser> {
    const member = await this.prisma.accessMember.findUnique({ where: { id: memberId } });
    if (!member) throw AppError.notFound('Member not found');
    const email = input.email.trim().toLowerCase();
    if (!email || !input.displayName.trim()) {
      throw AppError.validation('email and displayName are required');
    }
    const duplicate = await this.prisma.accessStaff.findFirst({ where: { memberId, email } });
    if (duplicate) {
      throw AppError.conflict('Staff email already exists for member');
    }

    const created = await this.prisma.accessStaff.create({
      data: {
        id: uuidv7(),
        memberId,
        email,
        displayName: input.displayName.trim(),
        role: input.role,
        active: true,
        passwordHash: input.password ? await argon2.hash(input.password) : null,
      },
    });
    return this.toStaffUser(created);
  }

  async setStaffActive(staffId: string, active: boolean): Promise<StaffUser> {
    const found = await this.prisma.accessStaff.findUnique({ where: { id: staffId } });
    if (!found) throw AppError.notFound('Staff not found');
    const updated = await this.prisma.accessStaff.update({ where: { id: staffId }, data: { active } });
    return this.toStaffUser(updated);
  }

  async getAccessByToken(token: string): Promise<{
    member: Pick<MemberAccount, 'id' | 'email' | 'slug' | 'displayName' | 'domain' | 'services' | 'active'>;
    staff: StaffUser[];
  }> {
    const member = await this.prisma.accessMember.findUnique({ where: { token } });
    if (!member) throw AppError.notFound('Token not found');
    return {
      member: {
        id: member.id,
        email: member.email,
        slug: member.slug,
        displayName: member.displayName,
        domain: member.domain,
        services: member.services as ServiceKey[],
        active: member.active,
      },
      staff: await this.listStaff(member.id),
    };
  }

  async getAccessByDomainAndSlug(domain: string, slug: string): Promise<{
    member: Pick<MemberAccount, 'id' | 'email' | 'slug' | 'displayName' | 'domain' | 'services' | 'active'>;
    staff: StaffUser[];
  }> {
    const normalizedDomain = domain.trim().toLowerCase();
    const normalizedSlug = this.normalizeSlug(slug);
    const member = await this.prisma.accessMember.findFirst({
      where: {
        domain: normalizedDomain,
        slug: normalizedSlug,
      },
    });
    if (!member) throw AppError.notFound('Member route not found');
    return {
      member: {
        id: member.id,
        email: member.email,
        slug: member.slug,
        displayName: member.displayName,
        domain: member.domain,
        services: member.services as ServiceKey[],
        active: member.active,
      },
      staff: await this.listStaff(member.id),
    };
  }

  async getMemberByDomain(domain: string): Promise<Pick<MemberAccount, 'id' | 'email' | 'slug' | 'displayName' | 'domain' | 'services' | 'active'>> {
    const normalizedDomain = domain.trim().toLowerCase();
    const member = await this.prisma.accessMember.findFirst({ where: { domain: normalizedDomain } });
    if (!member) throw AppError.notFound('Member domain not found');
    return {
      id: member.id,
      email: member.email,
      slug: member.slug,
      displayName: member.displayName,
      domain: member.domain,
      services: member.services as ServiceKey[],
      active: member.active,
    };
  }

  async loginWithDomain(domain: string, emailInput: string, password: string): Promise<{
    memberId: string;
    email: string;
    role: 'owner' | StaffUser['role'];
    services: ServiceKey[];
    domain: string;
    displayName: string;
  }> {
    const email = emailInput.trim().toLowerCase();
    const normalizedDomain = domain.trim().toLowerCase();
    const member = await this.prisma.accessMember.findFirst({ where: { domain: normalizedDomain, active: true } });
    if (!member) throw AppError.notFound('Member domain not found');

    if (member.email === email) {
      if (!member.passwordHash) throw AppError.forbidden('Owner password not set');
      const ok = await argon2.verify(member.passwordHash, password);
      if (!ok) throw AppError.forbidden('Invalid credentials');
      return {
        memberId: member.id,
        email: member.email,
        role: 'owner',
        services: member.services as ServiceKey[],
        domain: member.domain,
        displayName: member.displayName,
      };
    }

    const staff = await this.prisma.accessStaff.findFirst({
      where: { memberId: member.id, email, active: true },
    });
    if (!staff) throw AppError.forbidden('Invalid credentials');
    if (!staff.passwordHash) throw AppError.forbidden('Staff password not set');
    const ok = await argon2.verify(staff.passwordHash, password);
    if (!ok) throw AppError.forbidden('Invalid credentials');
    return {
      memberId: member.id,
      email: staff.email,
      role: staff.role as StaffUser['role'],
      services: member.services as ServiceKey[],
      domain: member.domain,
      displayName: staff.displayName,
    };
  }

  async setMemberPassword(memberId: string, password: string): Promise<void> {
    const member = await this.prisma.accessMember.findUnique({ where: { id: memberId } });
    if (!member) throw AppError.notFound('Member not found');
    await this.prisma.accessMember.update({
      where: { id: memberId },
      data: { passwordHash: await argon2.hash(password) },
    });
  }

  async setStaffPassword(staffId: string, password: string): Promise<void> {
    const staff = await this.prisma.accessStaff.findUnique({ where: { id: staffId } });
    if (!staff) throw AppError.notFound('Staff not found');
    await this.prisma.accessStaff.update({
      where: { id: staffId },
      data: { passwordHash: await argon2.hash(password) },
    });
  }

  private generateMemberToken(domain: string): string {
    const rand = Math.random().toString(36).slice(2, 10);
    return `cafeos_${domain.replace(/[^a-z0-9]/g, '')}_${rand}_${Date.now().toString(36)}`;
  }

  private normalizeSlug(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private toMemberAccount(row: {
    id: string;
    email: string;
    slug: string;
    displayName: string;
    domain: string;
    services: string[];
    active: boolean;
    token: string;
    createdAt: Date;
    updatedAt: Date;
  }): MemberAccount {
    return {
      id: row.id,
      email: row.email,
      slug: row.slug,
      displayName: row.displayName,
      domain: row.domain,
      services: row.services as ServiceKey[],
      active: row.active,
      token: row.token,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toStaffUser(row: {
    id: string;
    memberId: string;
    email: string;
    displayName: string;
    role: string;
    active: boolean;
    createdAt: Date;
  }): StaffUser {
    return {
      id: row.id,
      memberId: row.memberId,
      email: row.email,
      displayName: row.displayName,
      role: row.role as StaffUser['role'],
      active: row.active,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
