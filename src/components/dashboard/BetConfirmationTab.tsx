import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface BetConfirmation {
  id: string;
  user_id: string;
  event_id: string;
  amount: number;
  direction: string;
  created_at: string;
  status: string;
  user_name?: string;
  event_title?: string;
}

export const BetConfirmationTab: React.FC = () => {
  const { profile } = useAuth();
  const [bets, setBets] = useState<BetConfirmation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingBets();
  }, [profile]);

  const fetchPendingBets = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('bets')
      .select(`
        id,
        user_id,
        event_id,
        amount,
        direction,
        created_at,
        status,
        user:profiles!bets_user_id_fkey(name),
        event:events(title)
      `)
      .eq('witness_id', profile.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending bets:', error);
    } else {
      const formattedBets = (data || []).map((bet: any) => ({
        id: bet.id,
        user_id: bet.user_id,
        event_id: bet.event_id,
        amount: bet.amount,
        direction: bet.direction,
        created_at: bet.created_at,
        status: bet.status,
        user_name: bet.user?.name || '未知用户',
        event_title: bet.event?.title || '未知事件',
      }));
      setBets(formattedBets);
    }
    setLoading(false);
  };

  const handleStatusChange = async (betId: string, newStatus: string) => {
    const updateData: any = { status: newStatus };
    if (newStatus === 'confirmed') {
      updateData.confirmed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('bets')
      .update(updateData)
      .eq('id', betId);

    if (error) {
      alert('更新失败: ' + error.message);
    } else {
      fetchPendingBets();
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-600">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      {bets.length === 0 ? (
        <div className="text-center py-12 text-gray-500">暂无投注记录</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  序号
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  玩家姓名
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  投注事件
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  投注金额
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  投注时间
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  投注方向
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  确认状态
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {bets.map((bet, index) => (
                <tr key={bet.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{index + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {bet.user_name}
                  </td>
                  <td className="px-4 py-3 text-sm max-w-xs truncate">
                    {bet.event_title}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">
                    ¥{Number(bet.amount).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {new Date(bet.created_at).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        bet.direction === 'yes'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {bet.direction === 'yes' ? '是' : '否'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <select
                      value={bet.status}
                      onChange={(e) =>
                        handleStatusChange(bet.id, e.target.value)
                      }
                      className={`px-3 py-1 rounded text-xs border ${
                        bet.status === 'confirmed'
                          ? 'bg-green-50 border-green-300 text-green-700'
                          : 'bg-yellow-50 border-yellow-300 text-yellow-700'
                      }`}
                    >
                      <option value="pending">pending</option>
                      <option value="confirmed">confirmed</option>
                    </select>
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
