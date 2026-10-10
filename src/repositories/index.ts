import type { Repositories } from './types';
import { accountRepository } from './accountRepository';
import { tradeRepository } from './tradeRepository';
import { executionRepository } from './executionRepository';
import { tagRepository } from './tagRepository';
import { noteRepository } from './noteRepository';
import { attachmentRepository } from './attachmentRepository';
import { importTemplateRepository } from './importTemplateRepository';
import { settingsRepository } from './settingsRepository';

export const repositories: Repositories = {
  accounts: accountRepository,
  trades: tradeRepository,
  executions: executionRepository,
  tags: tagRepository,
  notes: noteRepository,
  attachments: attachmentRepository,
  importTemplates: importTemplateRepository,
  settings: settingsRepository
};

export * from './types';
