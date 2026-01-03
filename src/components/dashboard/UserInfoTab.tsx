import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Upload } from 'lucide-react';

export const UserInfoTab: React.FC = () => {
  const { profile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [witnessInfo, setWitnessInfo] = useState<any>(null);
  const [uploadingQR, setUploadingQR] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setEmail(profile.email);
      setReferralCode(profile.referral_code || '');

      if (profile.referred_by) {
        fetchWitnessInfo();
      }
    }
  }, [profile]);

  const fetchWitnessInfo = async () => {
    if (!profile?.referred_by) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('name, referral_code')
      .eq('id', profile.referred_by)
      .maybeSingle();

    if (!error && data) {
      setWitnessInfo(data);
    }
  };

  const handleUpdateProfile = async () => {
    if (!profile) return;
    setLoading(true);
    setMessage('');

    const trimmedEmail = email.trim();
    const updates: any = {};

    if (name !== profile.name) {
      updates.name = name;
    }

    if (trimmedEmail !== profile.email) {
      updates.email = trimmedEmail;
    }

    if ((profile.role === 'admin' || profile.role === 'witness') && referralCode !== profile.referral_code) {
      updates.referralCode = referralCode;
    }

    if (Object.keys(updates).length > 0) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Session info:', {
          hasSession: !!session,
          hasToken: !!session?.access_token,
          tokenPreview: session?.access_token?.substring(0, 20) + '...'
        });
        console.log('Sending update request:', updates);

        if (!session?.access_token) {
          setMessage('登录已过期，请重新登录');
          setLoading(false);
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user-profile`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
          }
        );

        const result = await response.json();
        console.log('Update response:', { status: response.status, result });

        if (!response.ok) {
          const errorMsg = result.error || `更新失败 (${response.status})`;
          console.error('Update failed:', errorMsg);
          setMessage(errorMsg);
          setLoading(false);
          return;
        }

        setMessage('更新成功');
        await refreshProfile();
        setEditing(false);
      } catch (error) {
        setMessage('更新失败: ' + (error as Error).message);
      }
    } else {
      setMessage('没有需要更新的内容');
    }

    setLoading(false);
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setMessage('两次密码输入不一致');
      return;
    }

    if (newPassword.length < 6) {
      setMessage('密码至少6位');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user-profile`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password: newPassword }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || '修改失败');
      } else {
        setMessage('密码修改成功');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      setMessage('修改失败: ' + (error as Error).message);
    }

    setLoading(false);
  };

  const handleQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploadingQR(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('payment-qr-codes')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      alert('上传失败: ' + uploadError.message);
      setUploadingQR(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('payment-qr-codes')
      .getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ payment_qr_code: urlData.publicUrl })
      .eq('id', profile.id);

    if (updateError) {
      alert('更新失败: ' + updateError.message);
    } else {
      await refreshProfile();
      setMessage('二维码上传成功');
    }

    setUploadingQR(false);
  };

  if (!profile) return null;

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.includes('成功')
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            用户姓名
          </label>
          {editing ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg">
              {profile.name}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            邮箱
          </label>
          {editing ? (
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg">
              {profile.email}
            </div>
          )}
        </div>

        {profile.role !== 'player' && profile.referral_code && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              推荐码
            </label>
            {editing && (profile.role === 'admin' || profile.role === 'witness') ? (
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-mono">
                {profile.referral_code}
              </div>
            )}
          </div>
        )}

        {witnessInfo && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                上级见证人姓名
              </label>
              <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg">
                {witnessInfo.name}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                上级见证人推荐码
              </label>
              <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg font-mono">
                {witnessInfo.referral_code}
              </div>
            </div>
          </>
        )}
      </div>

      {(profile.role === 'witness' || profile.role === 'admin') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            收款二维码
          </label>
          {profile.payment_qr_code && (
            <img
              src={profile.payment_qr_code}
              alt="Payment QR Code"
              className="w-48 h-48 object-contain border border-gray-300 rounded-lg mb-3"
            />
          )}
          <label className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer w-fit">
            <Upload className="h-5 w-5" />
            <span>{uploadingQR ? '上传中...' : '重新上传二维码'}</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleQRUpload}
              disabled={uploadingQR}
              className="hidden"
            />
          </label>
        </div>
      )}

      <div className="flex space-x-3">
        {editing ? (
          <>
            <button
              onClick={handleUpdateProfile}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '保存中...' : '保存'}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setName(profile.name);
                setEmail(profile.email);
                setReferralCode(profile.referral_code || '');
                setMessage('');
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              取消
            </button>
          </>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            编辑信息
          </button>
        )}
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">修改密码</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              新密码
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="至少6位"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              确认新密码
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="再次输入新密码"
            />
          </div>

          <button
            onClick={handlePasswordChange}
            disabled={loading || !newPassword || !confirmPassword}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '修改中...' : '修改密码'}
          </button>
        </div>
      </div>
    </div>
  );
};
