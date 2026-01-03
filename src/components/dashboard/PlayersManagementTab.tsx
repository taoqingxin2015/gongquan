import React, { useEffect, useState } from 'react';
import { supabase, Profile } from '../../lib/supabase';
import { Plus, Trash2 } from 'lucide-react';

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

export const PlayersManagementTab: React.FC = () => {
  const [players, setPlayers] = useState<PlayerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithStats | null>(null);
  const [betHistory, setBetHistory] = useState<BetHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    referredBy: '',
  });
  const [witnesses, setWitnesses] = useState<Profile[]>([]);

  useEffect(() => {
    fetchPlayers();
    fetchWitnesses();
  }, []);

  const fetchWitnesses = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'witness');

    if (!error && data) {
      setWitnesses(data);
    }
  };

  const fetchPlayers = async () => {
    const { data: playersData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'player')
      .order('created_at', { ascending: false });

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

  const handleToggleStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      alert('操作失败: ' + error.message);
    } else {
      fetchPlayers();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除该玩家吗？')) return;

    const { error } = await supabase.from('profiles').delete().eq('id', id);

    if (error) {
      alert('删除失败: ' + error.message);
    } else {
      fetchPlayers();
    }
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });

    if (authError) {
      alert('创建用户失败: ' + authError.message);
      return;
    }

    if (!authData.user) {
      alert('创建用户失败');
      return;
    }

    const { error: profileError } = await supabase.from('profiles').insert([
      {
        id: authData.user.id,
        email: formData.email,
        name: formData.name,
        role: 'player',
        referred_by: formData.referredBy || null,
      },
    ]);

    if (profileError) {
      alert('创建用户资料失败: ' + profileError.message);
      return;
    }

    alert('玩家创建成功');
    setShowAddModal(false);
    setFormData({ email: '', password: '', name: '', referredBy: '' });
    fetchPlayers();
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
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">玩家列表</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          <span>添加玩家</span>
        </button>
      </div>

      {players.length === 0 ? (
        <div className="text-center py-12 text-gray-500">暂无玩家</div>
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
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {players.map((player, index) => (
                <tr key={player.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{index + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {player.name}
                  </td>
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
                    <select
                      value={player.status}
                      onChange={(e) => handleToggleStatus(player.id, e.target.value)}
                      className={`px-3 py-1 rounded text-xs font-medium border ${
                        player.status === 'active'
                          ? 'bg-green-50 border-green-300 text-green-700'
                          : 'bg-red-50 border-red-300 text-red-700'
                      }`}
                    >
                      <option value="active">激活</option>
                      <option value="banned">封禁</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => handleDelete(player.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">添加新玩家</h3>
            <form onSubmit={handleAddPlayer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  姓名
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  邮箱
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  密码
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  minLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  所属见证人（可选）
                </label>
                <select
                  value={formData.referredBy}
                  onChange={(e) =>
                    setFormData({ ...formData, referredBy: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">无</option>
                  {witnesses.map((witness) => (
                    <option key={witness.id} value={witness.id}>
                      {witness.name} ({witness.referral_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  创建
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormData({ email: '', password: '', name: '', referredBy: '' });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
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
