import React, { useEffect, useState } from 'react';
import { supabase, Profile } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { UserCheck, UserX, Loader } from 'lucide-react';

export const PendingWitnessesTab: React.FC = () => {
  const { profile } = useAuth();
  const [witnesses, setWitnesses] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchReferredWitnesses = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('referred_by', profile.id)
      .eq('role', 'witness')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching referred witnesses:', error);
    } else {
      setWitnesses(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReferredWitnesses();
  }, [profile]);

  const handleStatusChange = async (witnessId: string, confirmed: boolean) => {
    setUpdating(witnessId);

    const { error } = await supabase
      .from('profiles')
      .update({ witness_confirmed: confirmed })
      .eq('id', witnessId);

    if (error) {
      console.error('Error updating witness status:', error);
      alert('更新失败，请重试');
    } else {
      setWitnesses((prev) =>
        prev.map((w) =>
          w.id === witnessId ? { ...w, witness_confirmed: confirmed } : w
        )
      );
    }

    setUpdating(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (witnesses.length === 0) {
    return (
      <div className="text-center py-12">
        <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">暂无引荐的见证人</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          待确认下一级见证人列表
        </h3>
        <span className="text-sm text-gray-600">
          共 {witnesses.length} 位见证人
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                序号
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                见证人姓名
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                见证人邮箱
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                见证人代码
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                确认状态
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {witnesses.map((witness, index) => (
              <tr key={witness.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">
                  {index + 1}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {witness.name}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {witness.email}
                </td>
                <td className="px-4 py-3 text-sm font-mono text-gray-700">
                  {witness.referral_code || '-'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <select
                      value={witness.witness_confirmed ? 'confirmed' : 'pending'}
                      onChange={(e) =>
                        handleStatusChange(
                          witness.id,
                          e.target.value === 'confirmed'
                        )
                      }
                      disabled={updating === witness.id}
                      className={`px-3 py-1.5 text-sm rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        witness.witness_confirmed
                          ? 'bg-green-50 border-green-200 text-green-700'
                          : 'bg-amber-50 border-amber-200 text-amber-700'
                      } ${
                        updating === witness.id
                          ? 'opacity-50 cursor-not-allowed'
                          : 'cursor-pointer'
                      }`}
                    >
                      <option value="pending">待确认 (pending)</option>
                      <option value="confirmed">已确认 (confirmed)</option>
                    </select>

                    {updating === witness.id && (
                      <Loader className="h-4 w-4 animate-spin text-blue-600" />
                    )}

                    {!updating && witness.witness_confirmed && (
                      <UserCheck className="h-5 w-5 text-green-600" />
                    )}

                    {!updating && !witness.witness_confirmed && (
                      <UserX className="h-5 w-5 text-amber-600" />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">提示</h4>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>未确认的见证人无法登录使用系统</li>
          <li>确认后，见证人可以正常登录并使用完整功能</li>
          <li>您可以随时修改确认状态</li>
        </ul>
      </div>
    </div>
  );
};
