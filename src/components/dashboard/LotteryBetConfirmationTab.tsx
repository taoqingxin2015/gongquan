import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Check, X, ExternalLink } from 'lucide-react';

interface LotteryBetConfirmation {
  id: string;
  period_id: string;
  user_id: string;
  bet_amount: number;
  bet_count: number;
  sequence_start: number;
  sequence_end: number;
  status: string;
  payment_proof: string | null;
  created_at: string;
  user_name?: string;
  period_number?: string;
}

export const LotteryBetConfirmationTab: React.FC = () => {
  const { profile } = useAuth();
  const [bets, setBets] = useState<LotteryBetConfirmation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingBets();

    const channel = supabase
      .channel('lottery-bets-confirmation-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lottery_bets' },
        () => {
          fetchPendingBets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const fetchPendingBets = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('lottery_bets')
      .select(`
        id,
        period_id,
        user_id,
        bet_amount,
        bet_count,
        sequence_start,
        sequence_end,
        status,
        payment_proof,
        created_at,
        user:profiles!lottery_bets_user_id_fkey(name),
        period:lottery_periods(period_number)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching pending lottery bets:', error);
    } else {
      const formattedBets = (data || []).map((bet: any) => ({
        id: bet.id,
        period_id: bet.period_id,
        user_id: bet.user_id,
        bet_amount: bet.bet_amount,
        bet_count: bet.bet_count,
        sequence_start: bet.sequence_start,
        sequence_end: bet.sequence_end,
        status: bet.status,
        payment_proof: bet.payment_proof,
        created_at: bet.created_at,
        user_name: bet.user?.name,
        period_number: bet.period?.period_number,
      }));

      setBets(formattedBets);
    }

    setLoading(false);
  };

  const handleConfirm = async (betId: string, periodId: string, betCount: number) => {
    if (!profile) return;

    if (!confirm('确认通过该彩票投注吗？')) return;

    try {
      const { error: updateBetError } = await supabase
        .from('lottery_bets')
        .update({
          status: 'confirmed',
          confirmed_by: profile.id,
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', betId);

      if (updateBetError) {
        throw updateBetError;
      }

      const { data: periodData, error: periodError } = await supabase
        .from('lottery_periods')
        .select('total_bets, total_amount')
        .eq('id', periodId)
        .single();

      if (periodError) {
        throw periodError;
      }

      const { data: betData, error: betError } = await supabase
        .from('lottery_bets')
        .select('bet_amount')
        .eq('id', betId)
        .single();

      if (betError) {
        throw betError;
      }

      const newTotalBets = (periodData.total_bets || 0) + betCount;
      const newTotalAmount = Number(periodData.total_amount || 0) + Number(betData.bet_amount);

      const { error: updatePeriodError } = await supabase
        .from('lottery_periods')
        .update({
          total_bets: newTotalBets,
          total_amount: newTotalAmount,
        })
        .eq('id', periodId);

      if (updatePeriodError) {
        throw updatePeriodError;
      }

      alert('确认成功');
      fetchPendingBets();
    } catch (error: any) {
      console.error('Error confirming bet:', error);
      alert('确认失败: ' + error.message);
    }
  };

  const handleReject = async (betId: string) => {
    if (!profile) return;

    if (!confirm('确认拒绝该彩票投注吗？')) return;

    const { error } = await supabase.from('lottery_bets').delete().eq('id', betId);

    if (error) {
      console.error('Error rejecting bet:', error);
      alert('拒绝失败: ' + error.message);
    } else {
      alert('已拒绝');
      fetchPendingBets();
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-600">加载中...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">彩票投注确认</h3>

      {bets.length === 0 ? (
        <div className="text-center py-12 text-gray-500">暂无待确认的彩票投注</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">序号</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">期号</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">投注人</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">投注金额</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">注数</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">序号范围</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">支付凭证</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">投注时间</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {bets.map((bet, index) => (
                <tr key={bet.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{index + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium">{bet.period_number || '-'}</td>
                  <td className="px-4 py-3 text-sm">{bet.user_name || '未知用户'}</td>
                  <td className="px-4 py-3 text-sm text-green-600 font-medium">
                    ¥{Number(bet.bet_amount).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold">{bet.bet_count}</td>
                  <td className="px-4 py-3 text-sm text-blue-600 font-medium">
                    {bet.sequence_start === bet.sequence_end
                      ? bet.sequence_start
                      : `${bet.sequence_start}-${bet.sequence_end}`}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {bet.payment_proof ? (
                      <a
                        href={bet.payment_proof}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-blue-600 hover:text-blue-700"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        查看
                      </a>
                    ) : (
                      <span className="text-gray-400">无</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(bet.created_at).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleConfirm(bet.id, bet.period_id, bet.bet_count)}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 flex items-center space-x-1"
                      >
                        <Check className="h-4 w-4" />
                        <span>确认</span>
                      </button>
                      <button
                        onClick={() => handleReject(bet.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 flex items-center space-x-1"
                      >
                        <X className="h-4 w-4" />
                        <span>拒绝</span>
                      </button>
                    </div>
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
