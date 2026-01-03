import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Profile } from '../../lib/supabase';

interface PlayerWithStats extends Profile {
  totalBets: number;
}

interface BetHistory {
  id: string;
  amount: number;
  direction: string;
  status: string;
  created_at: string;
  event_title: string;
  event_reveal_date: string;
}

export const PlayersListTab: React.FC = () => {
  const { profile } = useAuth();
  const [players, setPlayers] = useState<PlayerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithStats | null>(null);
  const [betHistory, setBetHistory] = useState<BetHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchPlayers();
  }, [profile]);

  const fetchPlayers = async () => {
    if (!profile) return;

    const { data: playersData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('referred_by', profile.id)
      .eq('role', 'player');

    if (error) {
      console.error('Error fetching players:', error);
      setLoading(false);
      return;
    }

    const playersWithStats = await Promise.all(
      (playersData || []).map(async (player) => {
        const { data: bets } = await supabase
          .from('bets')
          .select('amount, status')
          .eq('user_id', player.id);

        const totalBets =
          bets
            ?.filter((b) => b.status === 'confirmed')
            .reduce((sum, b) => sum + Number(b.amount), 0) || 0;

        return {
          ...player,
          totalBets,
        };
      })
    );

    setPlayers(playersWithStats);
    setLoading(false);
  };

  const handlePlayerClick = async (player: PlayerWithStats) => {
    setSelectedPlayer(player);
    setShowHistory(true);

    const { data, error } = await supabase
      .from('bets')
      .select(`
        id,
        amount,
        direction,
        status,
        created_at,
        event:events(title, reveal_date)
      `)
      .eq('user_id', player.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bet history:', error);
    } else {
      const formattedHistory = (data || []).map((bet: any) => ({
        id: bet.id,
        amount: bet.amount,
        direction: bet.direction,
        status: bet.status,
        created_at: bet.created_at,
        event_title: bet.event?.title || '未知事件',
        event_reveal_date: bet.event?.reveal_date || '',
      }));
      setBetHistory(formattedHistory);
    }
  };

  const isExpired = (revealDate: string) => {
    return new Date(revealDate) < new Date();
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-600">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      {players.length === 0 ? (
        <div className="text-center py-12 text-gray-500">暂无见证玩家</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  序号
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  姓名
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  邮箱
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  下注款项总额
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  激活状态
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {players.map((player, index) => (
                <tr key={player.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{index + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium">{player.name}</td>
                  <td className="px-4 py-3 text-sm">{player.email}</td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => handlePlayerClick(player)}
                      className="text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      ¥{player.totalBets.toLocaleString()}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        player.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {player.status === 'active' ? '激活' : '封禁'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showHistory && selectedPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                {selectedPlayer.name} - 历史投注详情
              </h3>
              <button
                onClick={() => {
                  setShowHistory(false);
                  setSelectedPlayer(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-700">总投注额（不含待确认）</div>
                <div className="text-2xl font-bold text-blue-900">
                  ¥{selectedPlayer.totalBets.toLocaleString()}
                </div>
              </div>

              {betHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-500">暂无投注记录</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                          事件名称
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
                      {betHistory.map((bet) => {
                        const expired = isExpired(bet.event_reveal_date);
                        return (
                          <tr
                            key={bet.id}
                            className={expired ? 'bg-gray-50 text-gray-400' : ''}
                          >
                            <td className="px-4 py-3 text-sm max-w-xs truncate">
                              {bet.event_title}
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
                            <td className="px-4 py-3 text-sm font-medium">
                              ¥{Number(bet.amount).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {bet.status === 'confirmed' ? (
                                <span className="text-green-600">已确认</span>
                              ) : (
                                <span className="text-yellow-600">待确认</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
