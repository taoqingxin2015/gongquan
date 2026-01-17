import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LoginPageProps {
  onClose: () => void;
  onSwitchToRegister: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onClose, onSwitchToRegister }) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [waitingForConfirmation, setWaitingForConfirmation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setWaitingForConfirmation(false);

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError(signInError.message === 'Invalid login credentials'
        ? '邮箱或密码错误'
        : signInError.message);
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, witness_confirmed')
        .eq('id', user.id)
        .maybeSingle();

      if (profile && profile.role === 'witness' && !profile.witness_confirmed) {
        setWaitingForConfirmation(true);
        setLoading(false);
        await supabase.auth.signOut();
        return;
      }
    }

    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-6">登录</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {waitingForConfirmation && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-amber-900 mb-1">等待确认中</h3>
                  <p className="text-sm text-amber-700">
                    您的见证人注册正在等待上一级见证人确认。请耐心等待确认后再登录使用完整功能。
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-600">
          还没有账号？{' '}
          <button
            onClick={onSwitchToRegister}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            立即注册
          </button>
        </div>
      </div>
    </div>
  );
};
