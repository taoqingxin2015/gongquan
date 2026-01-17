import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X } from 'lucide-react';

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
  const [betAmount, setBetAmount] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile) {
      alert('请先登录');
      return;
    }

    const amount = Number(betAmount);
    if (isNaN(amount) || amount <= 0 || amount % 2 !== 0) {
      alert('投注金额必须是2的倍数');
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

      const betCount = amount / 2;
      const currentTotalBets = period.total_bets;
      const sequenceStart = currentTotalBets + 1;
      const sequenceEnd = currentTotalBets + betCount;

      const { error } = await supabase.from('lottery_bets').insert([
        {
          period_id: period.id,
          user_id: profile.id,
          witness_id: witnessData.id,
          bet_amount: amount,
          bet_count: betCount,
          sequence_start: sequenceStart,
          sequence_end: sequenceEnd,
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

  const betCount = betAmount ? Math.floor(Number(betAmount) / 2) : 0;
  const isValidAmount = betAmount && Number(betAmount) > 0 && Number(betAmount) % 2 === 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">投注福彩刮刮乐</h3>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              投注金额（元）
            </label>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              placeholder="请输入2的倍数"
              step="2"
              min="2"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {betAmount && (
              <div className="mt-2 text-sm">
                {isValidAmount ? (
                  <span className="text-green-600">
                    将获得 {betCount} 注，序号 {period.total_bets + 1} - {period.total_bets + betCount}
                  </span>
                ) : (
                  <span className="text-red-600">
                    投注金额必须是2的倍数
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>提示：</strong>请扫码支付后点击"已转款"，投注需要见证人确认才能生效。
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={submitting || !isValidAmount}
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
