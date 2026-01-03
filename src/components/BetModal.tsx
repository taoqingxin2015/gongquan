import React, { useState, useEffect } from 'react';
import { Event, supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface BetModalProps {
  event: Event;
  direction: 'yes' | 'no';
  onClose: () => void;
}

export const BetModal: React.FC<BetModalProps> = ({ event, direction, onClose }) => {
  const { profile } = useAuth();
  const [betAmount, setBetAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [witnessQrCode, setWitnessQrCode] = useState<string>('');

  useEffect(() => {
    const fetchWitnessQrCode = async () => {
      if (!profile?.referred_by) return;

      const { data: witnessData, error } = await supabase
        .from('profiles')
        .select('payment_qr_code')
        .eq('id', profile.referred_by)
        .maybeSingle();

      if (!error && witnessData?.payment_qr_code) {
        setWitnessQrCode(witnessData.payment_qr_code);
      }
    };

    fetchWitnessQrCode();
  }, [profile]);

  const handleConfirmBet = async () => {
    if (!profile) return;

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('请输入有效金额');
      return;
    }

    setLoading(true);

    const { data: witnessData, error: witnessError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', profile.referred_by)
      .maybeSingle();

    if (witnessError || !witnessData) {
      alert('找不到您的见证人，请联系管理员');
      setLoading(false);
      return;
    }

    const { error: betError } = await supabase.from('bets').insert({
      event_id: event.id,
      user_id: profile.id,
      direction: direction,
      amount: amount,
      witness_id: witnessData.id,
      status: 'pending',
    });

    if (betError) {
      alert('下注失败: ' + betError.message);
    } else {
      alert('下注成功！请等待见证人确认');
      onClose();
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">确认下注</h3>

        <div className="mb-4">
          <div className="text-sm text-gray-600 mb-2">
            事件：<span className="font-medium text-gray-900">{event.title}</span>
          </div>

          <div className="text-center mb-4">
            <div className="text-sm text-gray-600 mb-2">
              请扫描二维码向见证人转账
            </div>
            {witnessQrCode && (
              <img
                src={witnessQrCode}
                alt="Payment QR Code"
                className="w-48 h-48 mx-auto object-contain border border-gray-300 rounded-lg"
              />
            )}
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              下注金额（¥）
            </label>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              min="1"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="输入金额"
            />
          </div>

          <div className="mt-2 text-sm text-gray-600">
            方向：
            <span
              className={`ml-2 px-2 py-1 rounded ${
                direction === 'yes'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {direction === 'yes' ? '是' : '否'}
            </span>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleConfirmBet}
            disabled={loading}
            className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? '提交中...' : '已转款'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            取消下注
          </button>
        </div>

        <p className="mt-4 text-xs text-gray-500 text-center">
          点击"已转款"后，您的下注将等待见证人确认
        </p>
      </div>
    </div>
  );
};
