import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AccountSetupFields } from '@/components/shared/AccountSetupFields';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import { useAuthStore } from '@/stores/authStore';
import { pendingAccountName, savePendingAccount } from '@/lib/pendingAccount';
import { clampLeverage, type AccountType } from '@/types/trade';

type AuthMode = 'signin' | 'signup';

export function LoginPage() {
  const navigate = useNavigate();
  const { session, initialized, signIn, signUp } = useAuthStore();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('demo');
  const [accountSize, setAccountSize] = useState('50000');
  const [leverage, setLeverage] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!isSupabaseConfigured) return <Navigate to="/dashboard" replace />;
  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  // Already signed in (or just finished) — always land on the dashboard.
  if (session) return <Navigate to="/dashboard" replace />;

  const switchMode = (value: string) => {
    setMode(value as AuthMode);
    setError(null);
    setNotice(null);
    setConfirm('');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setError(null);
    setNotice(null);

    const trimmedEmail = email.trim();
    const size = parseFloat(accountSize);
    const accountLeverage = clampLeverage(leverage);

    if (mode === 'signup') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirm) {
        setError('Passwords do not match.');
        return;
      }
      if (!Number.isFinite(size) || size <= 0) {
        setError('Enter a valid account size.');
        return;
      }
    } else if (!password) {
      setError('Enter your password.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        const result = await signIn(trimmedEmail, password);
        if (result.error) {
          setError(result.error);
          return;
        }
        navigate('/dashboard', { replace: true });
      } else {
        const result = await signUp(trimmedEmail, password, {
          accountType,
          accountSize: size,
          leverage: accountLeverage
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        // Keep the account details until the app can persist them — with
        // email confirmation the database is only reachable at first sign-in.
        savePendingAccount({
          name: pendingAccountName(accountType),
          type: accountType,
          currency: 'USD',
          startingBalance: size,
          leverage: accountLeverage
        });
        if (result.needsConfirmation) {
          setNotice('Almost there — check your inbox to confirm your email, then sign in.');
          setMode('signin');
          setPassword('');
          setConfirm('');
          return;
        }
        navigate('/dashboard', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="max-h-[92vh] w-full max-w-lg overflow-y-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">TradeLedger</CardTitle>
          <CardDescription>
            {mode === 'signin' ? 'Sign in to your account' : 'Create your account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={mode} onValueChange={switchMode}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {mode === 'signup' && (
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <PasswordInput
                  id="confirm-password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
            )}

            {mode === 'signup' && (
              <div className="space-y-4 rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Your trading account</p>
                  <p className="text-xs text-muted-foreground">
                    This becomes your default account. You can add more in Settings later.
                  </p>
                </div>
                <AccountSetupFields
                  idPrefix="signup"
                  type={accountType}
                  onTypeChange={setAccountType}
                  size={accountSize}
                  onSizeChange={setAccountSize}
                  leverage={leverage}
                  onLeverageChange={setLeverage}
                />
              </div>
            )}

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            {notice && (
              <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">{notice}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
