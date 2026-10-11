import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function UpdateToast() {
  const [showToast, setShowToast] = useState(false);
  const updateSWRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    if (import.meta.env.PROD) {
      import('virtual:pwa-register').then(({ registerSW }) => {
        updateSWRef.current = registerSW({
          onNeedRefresh() {
            setShowToast(true);
          },
          onOfflineReady() {
            console.log('App ready to work offline');
          }
        });
      });
    }
  }, []);

  const handleUpdate = () => {
    setShowToast(false);
    // A plain location.reload() leaves the new worker in the "waiting" state,
    // so the same prompt reappears after every refresh. updateSW(true) sends
    // SKIP_WAITING to the waiting worker and reloads once it takes over.
    if (updateSWRef.current) {
      void updateSWRef.current(true);
    } else {
      window.location.reload();
    }
  };

  if (!showToast) return null;

  return (
    <Card className="fixed bottom-4 right-4 z-50 max-w-sm animate-slide-up border-primary/20 shadow-lg md:bottom-6 md:right-6">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <RefreshCw className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold">Update available</h4>
          <p className="mt-0.5 text-sm text-muted-foreground">
            A new version of TradeLedger is ready.
          </p>
        </div>
        <Button size="sm" onClick={handleUpdate}>
          Update
        </Button>
      </CardContent>
    </Card>
  );
}
