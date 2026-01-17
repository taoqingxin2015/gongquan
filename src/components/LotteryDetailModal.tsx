import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Loader } from 'lucide-react';

interface LotteryPeriod {
  id: string;
  period_number: string;
  expected_draw_date: string;
  actual_draw_date: string | null;
  status: string;
  winning_numbers: number[] | null;
  winning_sequence_number: number | null;
  total_amount: number;
  prize_amount: number | null;
  total_bets: number;
}

interface LotteryBet {
  id: string;
  user_id: string;
  bet_amount: number;
  bet_count: number;
  sequence_start: number;
  sequence_end: number;
  status: string;
  created_at: string;
  profiles?: {
    username: string;
  };
}

interface LotteryDetailModalProps {
  period: LotteryPeriod;
  onClose: () => void;
}

export const LotteryDetailModal: React.FC<LotteryDetailModalProps> = ({ period, onClose }) => {
  const [bets, setBets] = useState<LotteryBet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBets();
  }, [period.id]);

  const fetchBets = async () => {
    const { data, error } = await supabase
      .from('lottery_bets')
      .select('*, profiles(username)')
      .eq('period_id', period.id)
      .eq('status', 'confirmed')
      .order('sequence_start', { ascending: true });

    if (error) {
      console.error('Error fetching bets:', error);
    } else {
      setBets(data || []);
    }

    setLoading(false);
  };

  const winningBet = bets.find(
    (bet) =>
      period.winning_sequence_number &&
      bet.sequence_start <= period.winning_sequence_number &&
      bet.sequence_end >= period.winning_sequence_number
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">
            期号 {period.period_number} 详情
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <div className="text-sm text-gray-600">期号</div>
                <div className="text-lg font-semibold text-gray-900">{period.period_number}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">开奖日期</div>
                <div className="text-lg font-semibold text-gray-900">
                  {period.actual_draw_date
                    ? new Date(period.actual_draw_date).toLocaleDateString('zh-CN')
                    : '-'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">总销售额</div>
                <div className="text-lg font-semibold text-green-600">
                  ¥{Number(period.total_amount || 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">奖金</div>
                <div className="text-lg font-semibold text-orange-600">
                  ¥{Number(period.prize_amount || 0).toLocaleString()}
                </div>
              </div>
            </div>

            {period.winning_numbers && Array.isArray(period.winning_numbers) && (
              <div>
                <div className="text-sm text-gray-600 mb-2">开奖号码</div>
                <div className="flex space-x-2">
                  {period.winning_numbers.slice(0, 6).map((num, idx) => (
                    <div
                      key={idx}
                      className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center text-lg font-bold shadow-md"
                    >
                      {num}
                    </div>
                  ))}
                  {period.winning_numbers[6] && (
                    <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold shadow-md">
                      {period.winning_numbers[6]}
                    </div>
                  )}
                </div>
              </div>
            )}

            {period.winning_sequence_number && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600 mb-1">中奖序号</div>
                <div className="text-3xl font-bold text-green-600">
                  {period.winning_sequence_number}
                </div>
              </div>
            )}
          </div>

          {winningBet && (
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-2xl">🎉</span>
                <h4 className="text-lg font-bold text-yellow-800">中奖信息</h4>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">中奖用户：</span>
                  <span className="font-semibold">{winningBet.profiles?.username || '未知'}</span>
                </div>
                <div>
                  <span className="text-gray-600">投注金额：</span>
                  <span className="font-semibold text-green-600">
                    ¥{Number(winningBet.bet_amount).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">注数范围：</span>
                  <span className="font-semibold text-blue-600">
                    {winningBet.sequence_start === winningBet.sequence_end
                      ? winningBet.sequence_start
                      : `${winningBet.sequence_start}-${winningBet.sequence_end}`}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">投注时间：</span>
                  <span className="font-semibold">
                    {new Date(winningBet.created_at).toLocaleString('zh-CN')}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-3">投注记录</h4>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : bets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">暂无投注记录</div>
            ) : (
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">
                        投注序号
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">
                        注数序号
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">
                        投注人
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">
                        投注时间
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">
                        投注金额
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">
                        状态
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {bets.map((bet, index) => {
                      const isWinner =
                        period.winning_sequence_number &&
                        bet.sequence_start <= period.winning_sequence_number &&
                        bet.sequence_end >= period.winning_sequence_number;

                      return (
                        <tr
                          key={bet.id}
                          className={`hover:bg-gray-50 ${
                            isWinner ? 'bg-yellow-50' : ''
                          }`}
                        >
                          <td className="px-4 py-2 text-sm">{index + 1}</td>
                          <td className="px-4 py-2 text-sm font-medium text-blue-600">
                            {bet.sequence_start === bet.sequence_end
                              ? bet.sequence_start
                              : `${bet.sequence_start}-${bet.sequence_end}`}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {bet.profiles?.username || '未知用户'}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {new Date(bet.created_at).toLocaleString('zh-CN')}
                          </td>
                          <td className="px-4 py-2 text-sm text-green-600 font-medium">
                            ¥{Number(bet.bet_amount).toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {isWinner ? (
                              <span className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded text-xs font-bold">
                                中奖
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                未中奖
                              </span>
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

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
