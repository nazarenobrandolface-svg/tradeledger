import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';

export function FloatingActionButton() {
  return (
    <Link
      to="/trades/new"
      className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105 md:hidden"
      aria-label="Add Trade"
    >
      <Plus className="h-6 w-6" />
    </Link>
  );
}
