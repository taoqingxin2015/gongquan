import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Check, X } from 'lucide-react';

interface LotteryBetConfirmation {
  id: string;
  period_id: string;
  user_id: string;
  bet_amount: number;
  bet_count: number;
  sequence_start: number | null;
  sequence_end: number | null;
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
      .eq('witness_id', profile.id)
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
      const { data: confirmedBets, error: confirmedBetsError } = await supabase
        .from('lottery_bets')
        .select('sequence_end')
        .eq('period_id', periodId)
        .eq('status', 'confirmed')
        .not('sequence_end', 'is', null)
        .order('sequence_end', { ascending: false })
        .limit(1);

      if (confirmedBetsError) {
        throw confirmedBetsError;
      }

      const maxSequenceEnd = confirmedBets && confirmedBets.length > 0 ? confirmedBets[0].sequence_end : 0;
      const sequenceStart = maxSequenceEnd + 1;
      const sequenceEnd = maxSequenceEnd + betCount;

      const { error: updateBetError } = await supabase
        .from('lottery_bets')
        .update({
          status: 'confirmed',
          confirmed_by: profile.id,
          confirmed_at: new Date().toISOString(),
          sequence_start: sequenceStart,
          sequence_end: sequenceEnd,
        })
        .eq('id', betId);

      if (updateBetError) {
        throw updateBetError;
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
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">投注时间</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">确认状态</th>
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
                    {bet.sequence_start && bet.sequence_end ? (
                      bet.sequence_start === bet.sequence_end
                        ? bet.sequence_start
                        : `${bet.sequence_start}-${bet.sequence_end}`
                    ) : (
                      <span className="text-gray-400">待分配</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(bet.created_at).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {bet.status === 'pending' ? (
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
                    ) : (
                      <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">
                        已确认
                      </span>
                    )}
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
