import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Bet } from '../../lib/supabase';

interface BetWithEvent extends Bet {
  event?: {
    title: string;
    reveal_date: string;
  };
}

export const BetsTab: React.FC = () => {
  const { profile } = useAuth();
  const [bets, setBets] = useState<BetWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    const fetchBets = async () => {
      if (!profile) return;

      const { data, error } = await supabase
        .from('bets')
        .select(`
          *,
          event:events(title, reveal_date)
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bets:', error);
      } else {
        setBets(data || []);

        const confirmed = data?.filter((bet) => bet.status === 'confirmed') || [];
        const total = confirmed.reduce((sum, bet) => sum + Number(bet.amount), 0);
        setTotalAmount(total);
      }

      setLoading(false);
    };

    fetchBets();
  }, [profile]);

  if (loading) {
    return <div className="text-center py-8 text-gray-600">加载中...</div>;
  }

  const isExpired = (revealDate: string) => {
    return new Date(revealDate) < new Date();
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="text-yellow-600">待确认</span>;
      case 'confirmed':
        return <span className="text-green-600">已确认</span>;
      case 'rejected':
        return <span className="text-red-600">已拒绝</span>;
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="text-sm text-blue-700 mb-1">总投注额（不含待确认）</div>
        <div className="text-2xl font-bold text-blue-900">
          ¥{totalAmount.toLocaleString()}
        </div>
      </div>

      {bets.length === 0 ? (
        <div className="text-center py-12 text-gray-500">暂无下注记录</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  事件
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  投注时间
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  方向
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
              {bets.map((bet) => {
                const expired = bet.event && isExpired(bet.event.reveal_date);
                return (
                  <tr
                    key={bet.id}
                    className={expired ? 'bg-gray-50 text-gray-500' : ''}
                  >
                    <td className="px-4 py-3 text-sm">
                      {bet.event?.title || '未知事件'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(bet.created_at).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded ${
                          bet.direction === 'yes'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {bet.direction === 'yes' ? '是' : '否'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      ¥{Number(bet.amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {getStatusLabel(bet.status)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
