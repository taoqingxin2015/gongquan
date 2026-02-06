import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, Plus, Minus } from 'lucide-react';

interface LotteryPeriod {
  id: string;
  period_number: string;
  expected_draw_date: string;
  total_bets: number;
}

interface LotteryBetModalProps {
  period: LotteryPeriod;
  onClose: () => void;
  onSuccess: () => void;
}

export const LotteryBetModal: React.FC<LotteryBetModalProps> = ({
  period,
  onClose,
  onSuccess,
}) => {
  const { profile } = useAuth();
  const [blueBalls, setBlueBalls] = useState<number[]>([1]);
  const [betCount, setBetCount] = useState('');
  const [submitting, setSubmitting] = useState(false);
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

  const handleAddBlueBall = () => {
    if (blueBalls.length < 16) {
      const nextNumber = Math.max(...blueBalls, 0) + 1;
      const newNumber = nextNumber <= 16 ? nextNumber : 1;
      setBlueBalls([...blueBalls, newNumber]);
    }
  };

  const handleRemoveBlueBall = () => {
    if (blueBalls.length > 1) {
      setBlueBalls(blueBalls.slice(0, -1));
    }
  };

  const handleBlueBallChange = (index: number, value: string) => {
    const num = parseInt(value);
    if (!isNaN(num) && num >= 1 && num <= 16) {
      const newBlueBalls = [...blueBalls];
      newBlueBalls[index] = num;
      setBlueBalls(newBlueBalls);
    } else if (value === '') {
      const newBlueBalls = [...blueBalls];
      newBlueBalls[index] = 1;
      setBlueBalls(newBlueBalls);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile) {
      alert('请先登录');
      return;
    }

    const count = Number(betCount);
    if (isNaN(count) || count <= 0) {
      alert('请输入有效的注数');
      return;
    }

    if (count < blueBalls.length) {
      alert(`注数必须大于或等于蓝球数量（${blueBalls.length}个）`);
      return;
    }

    if (!profile.referred_by) {
      alert('您没有见证人，请联系管理员');
      return;
    }

    setSubmitting(true);

    try {
      const { data: witnessData, error: witnessError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', profile.referred_by)
        .maybeSingle();

      if (witnessError || !witnessData) {
        alert('找不到您的见证人，请联系管理员');
        setSubmitting(false);
        return;
      }

      const amount = count * 2;

      const { error } = await supabase.from('lottery_bets').insert([
        {
          period_id: period.id,
          user_id: profile.id,
          witness_id: witnessData.id,
          bet_amount: amount,
          bet_count: count,
          blue_balls: blueBalls,
          status: 'pending',
        },
      ]);

      if (error) {
        throw error;
      }

      alert('投注成功！请等待见证人确认');
      onSuccess();
    } catch (error: any) {
      console.error('Error placing bet:', error);
      alert('投注失败: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalAmount = betCount ? Number(betCount) * 2 : 0;
  const isValidBet = betCount && Number(betCount) >= blueBalls.length && Number(betCount) > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">投注福彩呱呱乐</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <div className="text-sm text-gray-700">
            <div className="flex justify-between mb-1">
              <span>期号：</span>
              <span className="font-semibold">{period.period_number}</span>
            </div>
            <div className="flex justify-between">
              <span>预计开奖：</span>
              <span className="font-semibold">
                {new Date(period.expected_draw_date).toLocaleDateString('zh-CN')}
              </span>
            </div>
          </div>
        </div>

        <div className="text-center mb-4">
          <div className="text-sm text-gray-600 mb-2">
            请扫描二维码向见证人转账
          </div>
          {witnessQrCode ? (
            <img
              src={witnessQrCode}
              alt="Payment QR Code"
              className="w-48 h-48 mx-auto object-contain border border-gray-300 rounded-lg"
            />
          ) : (
            <div className="w-48 h-48 mx-auto bg-gray-100 border border-gray-300 rounded-lg flex items-center justify-center">
              <span className="text-gray-400">无收款码</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              请选择蓝球：
            </label>
            <div className="flex items-center space-x-2 flex-wrap gap-2">
              {blueBalls.map((ball, index) => (
                <input
                  key={index}
                  type="number"
                  min="1"
                  max="16"
                  value={ball}
                  onChange={(e) => handleBlueBallChange(index, e.target.value)}
                  className="w-12 h-12 text-center rounded-full border-2 border-blue-500 bg-blue-500 text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              ))}
              {blueBalls.length < 16 && (
                <button
                  type="button"
                  onClick={handleAddBlueBall}
                  className="w-10 h-10 rounded-full bg-green-500 text-white hover:bg-green-600 flex items-center justify-center transition-colors"
                >
                  <Plus className="h-5 w-5" />
                </button>
              )}
              {blueBalls.length > 1 && (
                <button
                  type="button"
                  onClick={handleRemoveBlueBall}
                  className="w-10 h-10 rounded-full bg-red-500 text-white hover:bg-red-600 flex items-center justify-center transition-colors"
                >
                  <Minus className="h-5 w-5" />
                </button>
              )}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              已选择 {blueBalls.length} 个蓝球（1-16之间的数字）
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              请输入注数：
            </label>
            <input
              type="number"
              value={betCount}
              onChange={(e) => setBetCount(e.target.value)}
              placeholder={`至少 ${blueBalls.length} 注`}
              min={blueBalls.length}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {betCount && Number(betCount) < blueBalls.length && (
              <div className="mt-2 text-sm text-red-600">
                注数必须大于或等于蓝球数量（{blueBalls.length}个）
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">投注金额：</span>
              <span className="text-2xl font-bold text-green-600">
                ¥{totalAmount.toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              = {betCount || 0} 注 × ¥2/注
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>提示：</strong>请扫码支付后点击"已转款"，投注需要见证人确认才能生效。
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={submitting || !isValidBet}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? '提交中...' : '已转款'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              取消下注
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
