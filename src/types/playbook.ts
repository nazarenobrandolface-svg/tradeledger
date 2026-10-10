export interface PlaybookRule {
  id: string;
  label: string;
  type: 'entry' | 'exit' | 'risk';
}

export interface Playbook {
  id: string;
  name: string;
  description: string;
  color: string;
  rules: PlaybookRule[];
  createdAt: number;
  updatedAt: number;
}
