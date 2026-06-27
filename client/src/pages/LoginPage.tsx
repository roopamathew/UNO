import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/services/authApi';

const API_URL = import.meta.env.VITE_API_URL ?? '';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isLoading, error, clearError, setTokens } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');

    if (accessToken && refreshToken) {
      authApi.me(accessToken).then((result) => {
        setTokens(result.user, { accessToken, refreshToken });
        navigate('/');
      }).catch(() => {
        navigate('/login');
      });
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(email, password);
      navigate('/');
    } catch {
      // Error handled in store
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/api/auth/google`;
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <GlassCard className="w-full max-w-md">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-2xl font-display font-bold mb-2">Welcome Back</h1>
          <p className="text-white/50 mb-8">Sign in to continue playing</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 px-4 py-2 rounded-lg">{error}</p>
            )}

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Sign In
            </Button>
          </form>

          <div className="mt-4">
            <Button type="button" variant="secondary" className="w-full" onClick={handleGoogleLogin}>
              Continue with Google
            </Button>
          </div>

          <div className="mt-6 text-center space-y-2">
            <Link to="/forgot-password" className="text-sm text-uno-red hover:underline block">
              Forgot password?
            </Link>
            <p className="text-sm text-white/50">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="text-uno-red hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </motion.div>
      </GlassCard>
    </div>
  );
}
