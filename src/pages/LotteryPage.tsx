import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Search, Loader } from 'lucide-react';
import { LotteryBetModal } from '../components/LotteryBetModal';
import { LotteryDrawModal } from '../components/LotteryDrawModal';
import { LotteryDetailModal } from '../components/LotteryDetailModal';

interface LotteryPeriod {
  id: string;
  period_number: string;
  expected_draw_date: string;
  actual_draw_date: string | null;
  status: 'accepting_bets' | 'drawn' | 'closed';
  winning_numbers: number[] | null;
  winning_sequence_number: number | null;
  total_amount: number;
  prize_amount: number | null;
  total_bets: number;
  created_at: string;
}

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
  profiles?: {
    username: string;
  };
}

export const LotteryPage: React.FC = () => {
  const { profile } = useAuth();
  const [currentPeriod, setCurrentPeriod] = useState<LotteryPeriod | null>(null);
  const [currentBets, setCurrentBets] = useState<LotteryBet[]>([]);
  const [historyPeriods, setHistoryPeriods] = useState<LotteryPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBetModal, setShowBetModal] = useState(false);
  const [showDrawModal, setShowDrawModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<LotteryPeriod | null>(null);

  useEffect(() => {
    fetchData();

    const betsChannel = supabase
      .channel('lottery-bets-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lottery_bets' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    const periodsChannel = supabase
      .channel('lottery-periods-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lottery_periods' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(betsChannel);
      supabase.removeChannel(periodsChannel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);

    const { data: currentData, error: currentError } = await supabase
      .from('lottery_periods')
      .select('*')
      .eq('status', 'accepting_bets')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (currentError) {
      console.error('Error fetching current period:', currentError);
    } else {
      setCurrentPeriod(currentData);

      if (currentData) {
        const { data: betsData, error: betsError } = await supabase
          .from('lottery_bets')
          .select('*, profiles(username)')
          .eq('period_id', currentData.id)
          .eq('status', 'confirmed')
          .order('sequence_start', { ascending: true });

        if (betsError) {
          console.error('Error fetching current bets:', betsError);
        } else {
          setCurrentBets(betsData || []);
        }
      }
    }

    const { data: historyData, error: historyError } = await supabase
      .from('lottery_periods')
      .select('*')
      .eq('status', 'drawn')
      .order('actual_draw_date', { ascending: false });

    if (historyError) {
      console.error('Error fetching history:', historyError);
    } else {
      setHistoryPeriods(historyData || []);
    }

    setLoading(false);
  };

  const handleBetSuccess = () => {
    setShowBetModal(false);
    fetchData();
  };

  const handleDrawSuccess = () => {
    setShowDrawModal(false);
    fetchData();
  };

  const handleViewDetail = (period: LotteryPeriod) => {
    setSelectedPeriod(period);
    setShowDetailModal(true);
  };

  const totalBetAmount = currentBets.reduce((sum, bet) => sum + Number(bet.bet_amount), 0);
  const totalBetCount = currentBets.length;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">福彩刮刮乐</h2>

          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">玩法规则</h3>
            <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
              <p><strong>投注规则：</strong>每注2元，注数不限。系统会根据下注时间先后给每注分配一个顺序号（1～N）。多注则连续分配，并在见证人确认后公布在本页面下端。</p>

              <p><strong>开奖规则：</strong>系统开奖与福彩双色球开奖同步，结果由第三方公信力机构决定，网站无法造假。</p>

              <p><strong>中奖算法：</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>对福彩开奖号码（7个号码按出球顺序连接）做SHA-256哈希运算，得到256比特结果</li>
                <li>用该结果循环截半做异或运算，直到其换算的十进制数首次落入此次开奖总注数范围（1～N）内停止</li>
                <li>该结果即为中奖顺序号</li>
              </ol>

              <p><strong>奖金分配：</strong>中奖者获得本期总投注额的80%。例如总投注额为2万元，则奖金为1.6万元。剩余20%为各级相关见证人见证服务费。</p>

              <p className="text-green-700 font-medium">此规则保证每期必有幸运儿中奖，中奖者由公开数学算法决定，结果公平公正！</p>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => setShowBetModal(true)}
              className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
            >
              立即下注
            </button>
          </div>
        </div>

        {currentPeriod && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">当前期投注情况</h3>
              {profile?.role === 'admin' && (
                <button
                  onClick={() => setShowDrawModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  开奖
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-gray-50 rounded-lg p-4">
              <div>
                <div className="text-sm text-gray-600">期号</div>
                <div className="text-lg font-semibold text-gray-900">{currentPeriod.period_number}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">预计开奖日期</div>
                <div className="text-lg font-semibold text-gray-900">
                  {new Date(currentPeriod.expected_draw_date).toLocaleDateString('zh-CN')}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">累积投注额</div>
                <div className="text-lg font-semibold text-green-600">¥{totalBetAmount.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">投注人数</div>
                <div className="text-lg font-semibold text-blue-600">{totalBetCount}人</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="text-sm font-medium text-gray-700 mb-2">投注记录</div>
              {currentBets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">暂无投注记录</div>
              ) : (
                <div className="max-h-64 overflow-y-auto border rounded-lg">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">投注序号</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">注数序号</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">投注人</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">投注时间</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">投注金额</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {currentBets.map((bet, index) => (
                        <tr key={bet.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm">{index + 1}</td>
                          <td className="px-4 py-2 text-sm font-medium text-blue-600">
                            {bet.sequence_start === bet.sequence_end
                              ? bet.sequence_start
                              : `${bet.sequence_start}-${bet.sequence_end}`}
                          </td>
                          <td className="px-4 py-2 text-sm">{bet.profiles?.username || '未知用户'}</td>
                          <td className="px-4 py-2 text-sm">
                            {new Date(bet.created_at).toLocaleString('zh-CN')}
                          </td>
                          <td className="px-4 py-2 text-sm text-green-600 font-medium">
                            ¥{Number(bet.bet_amount).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">历史开奖记录</h3>

          {historyPeriods.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无历史开奖记录</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">期号</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">开奖日期</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">开奖号码</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">总销售额</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">中奖序号</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">奖金</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">详情</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {historyPeriods.map((period) => (
                    <tr key={period.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{period.period_number}</td>
                      <td className="px-4 py-3 text-sm">
                        {period.actual_draw_date
                          ? new Date(period.actual_draw_date).toLocaleDateString('zh-CN')
                          : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {period.winning_numbers && Array.isArray(period.winning_numbers) ? (
                          <div className="flex space-x-1">
                            {period.winning_numbers.slice(0, 6).map((num, idx) => (
                              <div
                                key={idx}
                                className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold"
                              >
                                {num}
                              </div>
                            ))}
                            {period.winning_numbers[6] && (
                              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                                {period.winning_numbers[6]}
                              </div>
                            )}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-green-600 font-medium">
                        ¥{Number(period.total_amount || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-blue-600">
                        {period.winning_sequence_number || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-orange-600 font-bold">
                        ¥{Number(period.prize_amount || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleViewDetail(period)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Search className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showBetModal && currentPeriod && (
        <LotteryBetModal
          period={currentPeriod}
          onClose={() => setShowBetModal(false)}
          onSuccess={handleBetSuccess}
        />
      )}

      {showDrawModal && currentPeriod && (
        <LotteryDrawModal
          period={currentPeriod}
          onClose={() => setShowDrawModal(false)}
          onSuccess={handleDrawSuccess}
        />
      )}

      {showDetailModal && selectedPeriod && (
        <LotteryDetailModal
          period={selectedPeriod}
          onClose={() => setShowDetailModal(false)}
        />
      )}
    </div>
  );
};
