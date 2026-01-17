import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface LotteryBet {
  id: string;
  period_id: string;
  user_id: string;
  bet_amount: number;
  bet_count: number;
  sequence_start: number;
  sequence_end: number;
  status: 'pending' | 'confirmed';
  payment_proof: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  created_at: string;
  lottery_periods?: {
    period_number: string;
    expected_draw_date: string;
    status: string;
  };
}

export const LotteryBetsTab: React.FC = () => {
  const { profile } = useAuth();
  const [bets, setBets] = useState<LotteryBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalBetCount, setTotalBetCount] = useState(0);

  useEffect(() => {
    const fetchBets = async () => {
      if (!profile) return;

      const { data, error } = await supabase
        .from('lottery_bets')
        .select(`
          *,
          lottery_periods(period_number, expected_draw_date, status)
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching lottery bets:', error);
      } else {
        setBets(data || []);

        const confirmed = data?.filter((bet) => bet.status === 'confirmed') || [];
        const total = confirmed.reduce((sum, bet) => sum + Number(bet.bet_amount), 0);
        const totalCount = confirmed.reduce((sum, bet) => sum + Number(bet.bet_count), 0);
        setTotalAmount(total);
        setTotalBetCount(totalCount);
      }

      setLoading(false);
    };

    fetchBets();
  }, [profile]);

  if (loading) {
    return <div className="text-center py-8 text-gray-600">加载中...</div>;
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="text-yellow-600">待确认</span>;
      case 'confirmed':
        return <span className="text-green-600">已确认</span>;
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-700 mb-1">总投注额（不含待确认）</div>
          <div className="text-2xl font-bold text-blue-900">
            ¥{totalAmount.toLocaleString()}
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-700 mb-1">总注数（不含待确认）</div>
          <div className="text-2xl font-bold text-green-900">
            {totalBetCount}注
          </div>
        </div>
      </div>

      {bets.length === 0 ? (
        <div className="text-center py-12 text-gray-500">暂无彩票投注记录</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  期号
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  投注时间
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  注数序号
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  注数
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  金额
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  状态
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {bets.map((bet) => (
                <tr key={bet.id}>
                  <td className="px-4 py-3 text-sm font-medium">
                    {bet.lottery_periods?.period_number || '未知'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {new Date(bet.created_at).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-blue-600">
                    {bet.sequence_start === bet.sequence_end
                      ? bet.sequence_start
                      : `${bet.sequence_start}-${bet.sequence_end}`}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {bet.bet_count}注
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-green-600">
                    ¥{Number(bet.bet_amount).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {getStatusLabel(bet.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
