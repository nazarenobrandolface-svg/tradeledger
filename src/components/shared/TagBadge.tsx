import type { Tag } from '@/types/tag';
import { cn } from '@/lib/utils';

const categoryColors: Record<string, string> = {
  setup: 'bg-primary/10 text-primary',
  mistake: 'bg-loss/10 text-loss',
  emotion: 'bg-profit/10 text-profit',
  custom: 'bg-muted text-muted-foreground'
};

interface TagBadgeProps {
  tag: Tag;
  onRemove?: () => void;
  className?: string;
}

export function TagBadge({ tag, onRemove, className }: TagBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        categoryColors[tag.category] ?? categoryColors.custom,
        className
      )}
    >
      {tag.name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:opacity-70"
          aria-label={`Remove ${tag.name}`}
        >
          ×
        </button>
      )}
    </span>
  );
}
