import React, { useState } from 'react';
import { useAuth, SignUpData } from '../contexts/AuthContext';
import { X, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RegisterPageProps {
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onClose, onSwitchToLogin }) => {
  const { signUp } = useAuth();
  const [step, setStep] = useState<'select' | 'form'>('select');
  const [userType, setUserType] = useState<'player' | 'witness'>('player');
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
    referralCode: '',
  });
  const [qrCodeFile, setQrCodeFile] = useState<File | null>(null);
  const [qrCodePreview, setQrCodePreview] = useState<string>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setQrCodeFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setQrCodePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadQrCode = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `qr-codes/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('payment-qr-codes')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('payment-qr-codes')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('两次密码输入不一致');
      return;
    }

    if (userType === 'witness' && !qrCodeFile) {
      setError('见证人必须上传收款码');
      return;
    }

    setLoading(true);

    let qrCodeUrl = null;
    if (qrCodeFile) {
      qrCodeUrl = await uploadQrCode(qrCodeFile);
      if (!qrCodeUrl) {
        setError('上传收款码失败');
        setLoading(false);
        return;
      }
    }

    const signUpData: SignUpData = {
      email: formData.email,
      password: formData.password,
      name: formData.name,
      role: userType,
      referralCode: formData.referralCode,
      paymentQrCode: qrCodeUrl || undefined,
    };

    const { error: signUpError } = await signUp(signUpData);

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
    } else {
      alert('注册成功！请登录');
      onSwitchToLogin();
    }
  };

  if (step === 'select') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>

          <h2 className="text-2xl font-bold text-gray-900 mb-6">选择用户类型</h2>

          <div className="space-y-3">
            <button
              onClick={() => {
                setUserType('player');
                setStep('form');
              }}
              className="w-full p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
            >
              <div className="font-semibold text-gray-900">玩家注册</div>
              <div className="text-sm text-gray-600 mt-1">
                普通用户，可以浏览和下注
              </div>
            </button>

            <button
              onClick={() => {
                setUserType('witness');
                setStep('form');
              }}
              className="w-full p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
            >
              <div className="font-semibold text-gray-900">见证人注册</div>
              <div className="text-sm text-gray-600 mt-1">
                会员用户，可以推荐玩家并获得分红
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative my-8">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {userType === 'player' ? '玩家注册' : '见证人注册'}
        </h2>
        <button
          onClick={() => setStep('select')}
          className="text-sm text-blue-600 hover:text-blue-700 mb-4"
        >
          ← 返回选择
        </button>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              见证人代码 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.referralCode}
              onChange={(e) =>
                setFormData({ ...formData, referralCode: e.target.value })
              }
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="推荐码"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              邮箱 <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              姓名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="您的姓名"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              密码 <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="至少6位"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              确认密码 <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="再次输入密码"
            />
          </div>

          {userType === 'witness' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                上传见证人收款码 <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500">
                  {qrCodePreview ? (
                    <img
                      src={qrCodePreview}
                      alt="QR Code Preview"
                      className="h-28 object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="h-8 w-8 text-gray-400" />
                      <span className="mt-2 text-sm text-gray-500">
                        点击上传收款码
                      </span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '注册中...' : '注册'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-600">
          已有账号？{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            立即登录
          </button>
        </div>
      </div>
    </div>
  );
};
