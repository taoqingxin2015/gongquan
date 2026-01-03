import React, { useEffect, useState } from 'react';
import { supabase, Profile } from '../../lib/supabase';
import { Plus, Trash2, Edit, Save, X } from 'lucide-react';

interface WitnessWithStats extends Profile {
  totalReferredBets: number;
}

interface BetHistory {
  id: string;
  amount: number;
  direction: string;
  status: string;
  created_at: string;
  event_title: string;
  event_reveal_date: string;
  user_name: string;
}

export const WitnessListTab: React.FC = () => {
  const [witnesses, setWitnesses] = useState<WitnessWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [newCode, setNewCode] = useState('');
  const [selectedWitness, setSelectedWitness] = useState<WitnessWithStats | null>(null);
  const [betHistory, setBetHistory] = useState<BetHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    referralCode: '',
    referredBy: '',
  });
  const [adminWitnesses, setAdminWitnesses] = useState<Profile[]>([]);

  useEffect(() => {
    fetchWitnesses();
    fetchAdminWitnesses();
  }, []);

  const fetchAdminWitnesses = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin');

    if (!error && data) {
      setAdminWitnesses(data);
    }
  };

  const fetchWitnesses = async () => {
    const { data: witnessesData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'witness')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching witnesses:', error);
      setLoading(false);
      return;
    }

    const witnessesWithStats = await Promise.all(
      (witnessesData || []).map(async (witness) => {
        const { data: referredPlayers } = await supabase
          .from('profiles')
          .select('id')
          .eq('referred_by', witness.id);

        const playerIds = (referredPlayers || []).map((p) => p.id);

        let totalBets = 0;
        if (playerIds.length > 0) {
          const { data: bets } = await supabase
            .from('bets')
            .select('amount, status')
            .in('user_id', playerIds);

          totalBets =
            bets
              ?.filter((b) => b.status === 'confirmed')
              .reduce((sum, b) => sum + Number(b.amount), 0) || 0;
        }

        return {
          ...witness,
          totalReferredBets: totalBets,
        };
      })
    );

    setWitnesses(witnessesWithStats);
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
      fetchWitnesses();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除该见证人吗？')) return;

    const { error } = await supabase.from('profiles').delete().eq('id', id);

    if (error) {
      alert('删除失败: ' + error.message);
    } else {
      fetchWitnesses();
    }
  };

  const handleUpdateCode = async (witnessId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ referral_code: newCode })
      .eq('id', witnessId);

    if (error) {
      alert('更新失败: ' + error.message);
    } else {
      setEditingCode(null);
      setNewCode('');
      fetchWitnesses();
    }
  };

  const handleAddWitness = async (e: React.FormEvent) => {
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
        role: 'witness',
        referral_code: formData.referralCode,
        referred_by: formData.referredBy || null,
      },
    ]);

    if (profileError) {
      alert('创建用户资料失败: ' + profileError.message);
      return;
    }

    alert('见证人创建成功');
    setShowAddModal(false);
    setFormData({ email: '', password: '', name: '', referralCode: '', referredBy: '' });
    fetchWitnesses();
  };

  const handleWitnessClick = async (witness: WitnessWithStats) => {
    setSelectedWitness(witness);
    setShowHistory(true);

    const { data: referredPlayers } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('referred_by', witness.id);

    const playerIds = (referredPlayers || []).map((p) => p.id);

    if (playerIds.length > 0) {
      const { data, error } = await supabase
        .from('bets')
        .select(`
          id,
          amount,
          direction,
          status,
          created_at,
          user_id,
          event:events(title, reveal_date)
        `)
        .in('user_id', playerIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bet history:', error);
      } else {
        const formattedHistory = (data || []).map((bet: any) => {
          const player = referredPlayers?.find((p) => p.id === bet.user_id);
          return {
            id: bet.id,
            amount: bet.amount,
            direction: bet.direction,
            status: bet.status,
            created_at: bet.created_at,
            event_title: bet.event?.title || '未知事件',
            event_reveal_date: bet.event?.reveal_date || '',
            user_name: player?.name || '未知用户',
          };
        });
        setBetHistory(formattedHistory);
      }
    } else {
      setBetHistory([]);
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
        <h3 className="text-lg font-semibold text-gray-900">见证人列表</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          <span>添加见证人</span>
        </button>
      </div>

      {witnesses.length === 0 ? (
        <div className="text-center py-12 text-gray-500">暂无见证人</div>
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
                  代码
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  二维码
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  用户下注总额
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
              {witnesses.map((witness, index) => (
                <tr key={witness.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{index + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {witness.name}
                  </td>
                  <td className="px-4 py-3 text-sm">{witness.email}</td>
                  <td className="px-4 py-3 text-sm">
                    {editingCode === witness.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={newCode}
                          onChange={(e) => setNewCode(e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-xs font-mono"
                        />
                        <button
                          onClick={() => handleUpdateCode(witness.id)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <Save className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingCode(null);
                            setNewCode('');
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="font-mono">{witness.referral_code}</span>
                        <button
                          onClick={() => {
                            setEditingCode(witness.id);
                            setNewCode(witness.referral_code || '');
                          }}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {witness.payment_qr_code ? (
                      <img
                        src={witness.payment_qr_code}
                        alt="QR Code"
                        className="h-12 w-12 object-contain cursor-pointer"
                        onClick={() =>
                          window.open(witness.payment_qr_code!, '_blank')
                        }
                      />
                    ) : (
                      '无'
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => handleWitnessClick(witness)}
                      className="text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      ¥{witness.totalReferredBets.toLocaleString()}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <select
                      value={witness.status}
                      onChange={(e) => handleToggleStatus(witness.id, e.target.value)}
                      className={`px-3 py-1 rounded text-xs font-medium border ${
                        witness.status === 'active'
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
                      onClick={() => handleDelete(witness.id)}
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
            <h3 className="text-xl font-bold text-gray-900 mb-4">添加新见证人</h3>
            <form onSubmit={handleAddWitness} className="space-y-4">
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
                  推荐码
                </label>
                <input
                  type="text"
                  value={formData.referralCode}
                  onChange={(e) =>
                    setFormData({ ...formData, referralCode: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  上级见证人（可选）
                </label>
                <select
                  value={formData.referredBy}
                  onChange={(e) =>
                    setFormData({ ...formData, referredBy: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">无</option>
                  {adminWitnesses.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.name} (管理员)
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
                    setFormData({
                      email: '',
                      password: '',
                      name: '',
                      referralCode: '',
                      referredBy: '',
                    });
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

      {showHistory && selectedWitness && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                {selectedWitness.name} - 推荐用户历史投注详情
              </h3>
              <button
                onClick={() => {
                  setShowHistory(false);
                  setSelectedWitness(null);
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
                  ¥{selectedWitness.totalReferredBets.toLocaleString()}
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
                          玩家
                        </th>
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
                            <td className="px-4 py-3 text-sm">{bet.user_name}</td>
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
