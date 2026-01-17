import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, Upload } from 'lucide-react';

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
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPaymentProof(e.target.files[0]);
    }
  };

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

    if (!paymentProof) {
      alert('请上传支付凭证');
      return;
    }

    setSubmitting(true);

    try {
      let paymentProofUrl = '';

      if (paymentProof) {
        setUploading(true);
        const fileExt = paymentProof.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('payment_qr_codes')
          .upload(filePath, paymentProof);

        if (uploadError) {
          throw uploadError;
        }

        const { data: urlData } = supabase.storage
          .from('payment_qr_codes')
          .getPublicUrl(filePath);

        paymentProofUrl = urlData.publicUrl;
        setUploading(false);
      }

      const betCount = amount / 2;
      const currentTotalBets = period.total_bets;
      const sequenceStart = currentTotalBets + 1;
      const sequenceEnd = currentTotalBets + betCount;

      const { error } = await supabase.from('lottery_bets').insert([
        {
          period_id: period.id,
          user_id: profile.id,
          bet_amount: amount,
          bet_count: betCount,
          sequence_start: sequenceStart,
          sequence_end: sequenceEnd,
          status: 'pending',
          payment_proof: paymentProofUrl,
        },
      ]);

      if (error) {
        throw error;
      }

      alert('投注成功！等待见证人确认。');
      onSuccess();
    } catch (error: any) {
      console.error('Error placing bet:', error);
      alert('投注失败: ' + error.message);
    } finally {
      setSubmitting(false);
      setUploading(false);
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              支付凭证
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                    <span>上传文件</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      required
                      className="sr-only"
                    />
                  </label>
                  <p className="pl-1">或拖拽到此处</p>
                </div>
                <p className="text-xs text-gray-500">
                  {paymentProof ? paymentProof.name : '支持 PNG, JPG, GIF 格式'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>提示：</strong>投注后需要见证人确认才能生效。请确保已完成支付并上传正确的支付凭证。
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={submitting || uploading || !isValidAmount}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? '提交中...' : uploading ? '上传中...' : '确认投注'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting || uploading}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
