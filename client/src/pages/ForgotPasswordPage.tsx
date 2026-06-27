import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GlassCard } from '@/components/ui/GlassCard';
import { authApi } from '@/services/authApi';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const result = await authApi.forgotPassword(email);
      setSent(true);
      if (result.resetToken) {
        setResetToken(result.resetToken);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <GlassCard className="w-full max-w-md">
        <h1 className="text-2xl font-display font-bold mb-2">Reset Password</h1>
        <p className="text-white/50 mb-8">
          Enter your email and we'll send you a reset link
        </p>

        {sent ? (
          <div className="text-center space-y-4">
            <p className="text-green-400">Check your email for reset instructions.</p>
            {resetToken && (
              <div className="glass p-4 rounded-xl text-left">
                <p className="text-xs text-white/40 mb-2">Dev mode reset token:</p>
                <Link
                  to={`/reset-password?token=${resetToken}`}
                  className="text-sm text-uno-red break-all hover:underline"
                >
                  Click here to reset password
                </Link>
              </div>
            )}
            <Link to="/login" className="text-sm text-uno-red hover:underline">
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}
            <Button type="submit" className="w-full" isLoading={isLoading}>
              Send Reset Link
            </Button>
          </form>
        )}
      </GlassCard>
    </div>
  );
}
