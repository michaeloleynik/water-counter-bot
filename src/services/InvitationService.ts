import { query } from '../database/db';
import { v4 as uuidv4 } from 'uuid';

export interface Invitation {
  id: number;
  invited_by: number;
  telegram_id?: number;
  username?: string;
  role: 'admin' | 'employee';
  invite_code: string;
  is_used: boolean;
  created_at: Date;
  expires_at?: Date;
  used_at?: Date;
}

export class InvitationService {
  async create(
    invitedBy: number,
    role: 'admin' | 'employee',
    expiresInDays: number = 7
  ): Promise<Invitation> {
    const inviteCode = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const result = await query(
      `INSERT INTO invitations (invited_by, role, invite_code, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [invitedBy, role, inviteCode, expiresAt]
    );
    return result.rows[0];
  }

  async findByCode(code: string): Promise<Invitation | null> {
    const result = await query(
      'SELECT * FROM invitations WHERE invite_code = $1',
      [code]
    );
    return result.rows[0] || null;
  }

  async markAsUsed(code: string, telegramId: number, username?: string): Promise<boolean> {
    const result = await query(
      `UPDATE invitations 
       SET is_used = true, 
           used_at = CURRENT_TIMESTAMP,
           telegram_id = $1,
           username = $2
       WHERE invite_code = $3 
         AND is_used = false 
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
      [telegramId, username, code]
    );
    return (result.rowCount || 0) > 0;
  }

  async isValid(code: string): Promise<boolean> {
    const invitation = await this.findByCode(code);
    if (!invitation || invitation.is_used) {
      return false;
    }
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return false;
    }
    return true;
  }

  async getActiveInvitations(invitedBy: number): Promise<Invitation[]> {
    const result = await query(
      `SELECT * FROM invitations 
       WHERE invited_by = $1 
         AND is_used = false 
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
       ORDER BY created_at DESC`,
      [invitedBy]
    );
    return result.rows;
  }
}

export const invitationService = new InvitationService();
