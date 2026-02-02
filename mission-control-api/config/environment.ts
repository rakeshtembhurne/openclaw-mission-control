/**
 * OpenClaw Mission Control - Environment Configuration
 */

export interface Environment {
  NODE_ENV: string;
  PORT: number;
  DB_PATH: string;
  WORKSPACE_PATH: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
}

export const env: Environment = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  DB_PATH: process.env.DB_PATH || join(process.env.HOME || '', '.openclaw/workspace/mission-control/mission-control.db'),
  WORKSPACE_PATH: process.env.WORKSPACE_PATH || join(process.env.HOME || '', '.openclaw/workspace/mission-control'),
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
};

export function isDevelopment(): boolean {
  return env.NODE_ENV === 'development';
}

export function isProduction(): boolean {
  return env.NODE_ENV === 'production';
}
