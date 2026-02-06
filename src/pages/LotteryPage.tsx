import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Search, Loader, ArrowLeft, ChevronDown, ChevronUp, ChevronsUp, ChevronsDown } from 'lucide-react';
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
  sequence_start: number | null;
  sequence_end: number | null;
  status: 'pending' | 'confirmed';
  payment_proof: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  created_at: string;
  profiles?: {
    name: string;
  };
}

interface LotteryPageProps {
  onClose: () => void;
}

export const LotteryPage: React.FC<LotteryPageProps> = ({ onClose }) => {
  const { profile } = useAuth();
  const [currentPeriod, setCurrentPeriod] = useState<LotteryPeriod | null>(null);
  const [currentBets, setCurrentBets] = useState<LotteryBet[]>([]);
  const [historyPeriods, setHistoryPeriods] = useState<LotteryPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBetModal, setShowBetModal] = useState(false);
  const [showDrawModal, setShowDrawModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<LotteryPeriod | null>(null);
  const [isEditingPeriod, setIsEditingPeriod] = useState(false);
  const [editPeriodNumber, setEditPeriodNumber] = useState('');
  const [editDrawDate, setEditDrawDate] = useState('');

  const [rulesExpanded, setRulesExpanded] = useState(true);
  const [currentBetsExpanded, setCurrentBetsExpanded] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const rulesRef = useRef<HTMLDivElement>(null);
  const currentBetsRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;

      const scrollPercentage = scrollTop / (scrollHeight - clientHeight);

      if (scrollPercentage < 0.2) {
        setRulesExpanded(true);
        setCurrentBetsExpanded(false);
        setHistoryExpanded(false);
      } else if (scrollPercentage > 0.5) {
        setRulesExpanded(false);
        setCurrentBetsExpanded(false);
        setHistoryExpanded(true);
      } else {
        setRulesExpanded(false);
        setCurrentBetsExpanded(true);
        setHistoryExpanded(false);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

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

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current && containerRef.current) {
      const container = containerRef.current;
      const element = ref.current;
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const scrollTop = container.scrollTop;
      const targetScroll = scrollTop + (elementRect.top - containerRect.top);

      container.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
      });
    }
  };

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
      console.log('Fetched current period:', currentData);
      setCurrentPeriod(currentData);

      if (currentData) {
        console.log('Fetching bets for period:', currentData.id);
        const { data: betsData, error: betsError } = await supabase
          .from('lottery_bets')
          .select('*, user:profiles!user_id(name)')
          .eq('period_id', currentData.id)
          .eq('status', 'confirmed')
          .order('confirmed_at', { ascending: true });

        if (betsError) {
          console.error('Error fetching current bets:', betsError);
          console.error('Error details:', JSON.stringify(betsError, null, 2));
        } else {
          console.log('Fetched bets data:', betsData);
          console.log('Bets count:', betsData?.length || 0);
          setCurrentBets(betsData || []);
        }
      } else {
        console.log('No current period found');
      }
    }

    const { data: historyData, error: historyError } = await supabase
      .from('lottery_periods')
      .select('*')
      .eq('status', 'drawn')
      .order('period_number', { ascending: false });

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

  const handleEditPeriod = () => {
    if (currentPeriod) {
      setEditPeriodNumber(currentPeriod.period_number);
      setEditDrawDate(currentPeriod.expected_draw_date);
      setIsEditingPeriod(true);
    }
  };

  const handleSavePeriod = async () => {
    if (!currentPeriod) return;

    try {
      const { error } = await supabase
        .from('lottery_periods')
        .update({
          period_number: editPeriodNumber,
          expected_draw_date: editDrawDate,
        })
        .eq('id', currentPeriod.id);

      if (error) throw error;

      alert('更新成功');
      setIsEditingPeriod(false);
      fetchData();
    } catch (error: any) {
      console.error('Error updating period:', error);
      alert('更新失败: ' + error.message);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingPeriod(false);
    if (currentPeriod) {
      setEditPeriodNumber(currentPeriod.period_number);
      setEditDrawDate(currentPeriod.expected_draw_date);
    }
  };

  const totalBetAmount = currentPeriod?.total_amount || 0;
  const uniqueUserIds = new Set(currentBets.map(bet => bet.user_id));
  const totalBetCount = uniqueUserIds.size;

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
    <div className="min-h-screen flex flex-col max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="flex-shrink-0 mb-4 sticky top-16 bg-white z-40 pb-2 border-b-2 border-gray-200">
        <div className="flex items-center">
          <button
            onClick={onClose}
            className="mr-3 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">福彩呱呱乐</h2>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 flex flex-col space-y-4 overflow-y-auto"
      >
        <div
          ref={rulesRef}
          className="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 flex-shrink-0"
        >
          <div className="relative">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">玩法规则</h3>
                <button
                  onClick={() => {
                    if (!rulesExpanded) {
                      setRulesExpanded(true);
                      setCurrentBetsExpanded(false);
                      setHistoryExpanded(false);
                      setTimeout(() => scrollToSection(rulesRef), 100);
                    } else {
                      setRulesExpanded(false);
                    }
                  }}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {rulesExpanded ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronsUp className="h-5 w-5 text-blue-500 animate-bounce" />
                  )}
                </button>
              </div>

              {rulesExpanded && (
                <div className="overflow-y-auto" style={{ maxHeight: '50vh' }}>
                  <div className="bg-blue-50 rounded-lg p-4 sm:p-6 mb-4">
                    <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
                      <p><strong>投注规则：</strong>每注2元，注数不限。系统会根据下注被确认时间先后给每注分配一个顺序号（1～N）。多注则连续分配，并在见证人确认后公布在本页面下端。</p>

                      <p><strong>开奖规则：</strong>系统开奖与福彩双色球开奖同步，结果由第三方公信力机构决定，网站无法造假。</p>

                      <p><strong>中奖算法：</strong></p>
                      <ol className="list-decimal list-inside space-y-1 ml-4">
                        <li>对福彩开奖号码（7个号码按出球顺序连接）做SHA-256哈希运算，得到256比特结果</li>
                        <li>用该结果做循环截短异或运算（从最右边截短，截短位数由当期总注数换算成的二进制位数决定）</li>
                        <li>最后的结果换算成十进制如果落在1～N的范围之内即为中奖顺序号，否则逐位取反+1作为中奖顺序号</li>
                      </ol>

                      <p><strong>奖金分配：</strong></p>
                      <ol className="list-decimal list-inside space-y-1 ml-4">
                        <li>如只是被摇中顺序号，则获得该期总投注额的60%，剩下的20%进入下一期奖池，20%为各级相关见证人见证服务费。</li>
                        <li>如同时猜中蓝色球和被摇中顺序号，则获得该期总投注额的80%加奖池所有奖金。</li>
                      </ol>

                      <p><strong>举例：</strong>例如当期总投注额为2万元，奖池为1万元，如只被摇中顺序号，则中奖者奖金为1.2万元，0.4万元进入下一期奖池（下一期奖池变为1.4万元），0.4万元为各级相关见证人见证服务费。如同时猜中蓝色球和被摇中顺序号，则奖金为1.6万+1万=2.6万元，0.4万元为各级相关见证人见证服务费。</p>

                      <p className="text-green-700 font-medium">此规则保证每期必有幸运儿中奖，中奖者由公开数学算法决定，结果公平公正！</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-center mt-4">
                <button
                  onClick={() => setShowBetModal(true)}
                  className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-md"
                >
                  立即下注
                </button>
              </div>
            </div>
          </div>
        </div>
        {currentPeriod && (
          <div
            ref={currentBetsRef}
            className="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 flex-shrink-0"
          >
            <div className="relative">
              <div className="p-4 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">当前投注情况</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    {profile?.role === 'admin' && (
                      <button
                        onClick={() => setShowDrawModal(true)}
                        className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        开奖
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (!currentBetsExpanded) {
                          setRulesExpanded(false);
                          setCurrentBetsExpanded(true);
                          setHistoryExpanded(false);
                          setTimeout(() => scrollToSection(currentBetsRef), 100);
                        } else {
                          setCurrentBetsExpanded(false);
                        }
                      }}
                      className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      {currentBetsExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-500" />
                      ) : rulesExpanded ? (
                        <ChevronsDown className="h-5 w-5 text-blue-500 animate-bounce" />
                      ) : historyExpanded ? (
                        <ChevronsUp className="h-5 w-5 text-blue-500 animate-bounce" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-blue-500 animate-bounce" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <div className="flex justify-between items-center mb-3">
                    <div className="text-xs sm:text-sm font-medium text-gray-700">当期信息</div>
                    {profile?.role === 'admin' && !isEditingPeriod && (
                      <button
                        onClick={handleEditPeriod}
                        className="px-2 py-1 text-xs sm:text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        编辑
                      </button>
                    )}
                    {isEditingPeriod && (
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSavePeriod}
                          className="px-2 py-1 text-xs sm:text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                        >
                          保存
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-2 py-1 text-xs sm:text-sm bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors"
                        >
                          取消
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">期号</div>
                      {isEditingPeriod ? (
                        <input
                          type="text"
                          value={editPeriodNumber}
                          onChange={(e) => setEditPeriodNumber(e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <div className="text-sm sm:text-base font-semibold text-gray-900">{currentPeriod.period_number}</div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">预计开奖</div>
                      {isEditingPeriod ? (
                        <input
                          type="date"
                          value={editDrawDate}
                          onChange={(e) => setEditDrawDate(e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <div className="text-sm sm:text-base font-semibold text-gray-900">
                          {new Date(currentPeriod.expected_draw_date).toLocaleDateString('zh-CN')}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">累积投注额</div>
                      <div className="text-sm sm:text-base font-semibold text-green-600">¥{totalBetAmount.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">奖池累积额</div>
                      <div className="text-sm sm:text-base font-semibold text-orange-600">¥{Number(currentPeriod.pool_amount || 0).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">投注人数</div>
                      <div className="text-sm sm:text-base font-semibold text-blue-600">{totalBetCount}人</div>
                    </div>
                  </div>
                </div>

                {currentBetsExpanded && (
                  <div className="mt-4">
                    <div className="overflow-y-auto" style={{ maxHeight: '40vh' }}>
                      <div className="text-sm font-medium text-gray-700 mb-2">投注记录</div>
                      {currentBets.length === 0 ? (
                        <div className="text-center py-6 text-gray-500 text-sm">暂无投注记录</div>
                      ) : (
                        <div className="border rounded-lg overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs sm:text-sm">
                              <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                  <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-700">序号</th>
                                  <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-700">注数序号</th>
                                  <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-700">蓝球号码</th>
                                  <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-700">投注人</th>
                                  <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-700">投注确认时间</th>
                                  <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-700">投注金额</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {currentBets.map((bet, index) => {
                                  const blueBalls = (bet.blue_balls as any) || [];
                                  const blueBallsDisplay = Array.isArray(blueBalls) && blueBalls.length > 0
                                    ? (blueBalls.length === 1
                                        ? blueBalls[0].toString()
                                        : blueBalls.every((ball: number, idx: number, arr: number[]) =>
                                            idx === 0 || ball === arr[idx - 1] + 1
                                          )
                                          ? `${blueBalls[0]}-${blueBalls[blueBalls.length - 1]}`
                                          : blueBalls.join(',')
                                      )
                                    : '-';

                                  return (
                                    <tr key={bet.id} className="hover:bg-gray-50">
                                      <td className="px-2 sm:px-4 py-2">{index + 1}</td>
                                      <td className="px-2 sm:px-4 py-2 font-medium text-blue-600">
                                        {bet.sequence_start && bet.sequence_end ? (
                                          bet.sequence_start === bet.sequence_end
                                            ? bet.sequence_start
                                            : `${bet.sequence_start}-${bet.sequence_end}`
                                        ) : (
                                          <span className="text-gray-400">-</span>
                                        )}
                                      </td>
                                      <td className="px-2 sm:px-4 py-2 text-blue-600 font-medium">{blueBallsDisplay}</td>
                                      <td className="px-2 sm:px-4 py-2">{bet.user?.name || '未知用户'}</td>
                                      <td className="px-2 sm:px-4 py-2 whitespace-nowrap">
                                        {bet.confirmed_at
                                          ? new Date(bet.confirmed_at).toLocaleString('zh-CN', {
                                              month: '2-digit',
                                              day: '2-digit',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })
                                          : '-'}
                                      </td>
                                      <td className="px-2 sm:px-4 py-2 text-green-600 font-medium">
                                        ¥{Number(bet.bet_amount).toLocaleString()}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div
          ref={historyRef}
          className="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 flex-shrink-0 mb-4"
        >
          <div className="relative">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">历史开奖记录</h3>
                <button
                  onClick={() => {
                    if (!historyExpanded) {
                      setRulesExpanded(false);
                      setCurrentBetsExpanded(false);
                      setHistoryExpanded(true);
                      setTimeout(() => scrollToSection(historyRef), 100);
                    } else {
                      setHistoryExpanded(false);
                    }
                  }}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {historyExpanded ? (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronsDown className="h-5 w-5 text-blue-500 animate-bounce" />
                  )}
                </button>
              </div>

              {historyPeriods.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">暂无历史开奖记录</div>
              ) : (
                <div>
                  <div className="overflow-y-auto" style={{ maxHeight: historyExpanded ? '50vh' : '120px' }}>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs sm:text-sm">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-700">期号</th>
                              <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-700">开奖日期</th>
                              <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-700">开奖号码</th>
                              <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-700">总销售额</th>
                              <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-700">中奖序号</th>
                              <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-700">奖金</th>
                              <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-700">详情</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {(historyExpanded ? historyPeriods : historyPeriods.slice(0, 1)).map((period) => (
                              <tr key={period.id} className="hover:bg-gray-50">
                                <td className="px-2 sm:px-4 py-2 font-medium">{period.period_number}</td>
                                <td className="px-2 sm:px-4 py-2 whitespace-nowrap">
                                  {period.actual_draw_date
                                    ? new Date(period.actual_draw_date).toLocaleDateString('zh-CN')
                                    : '-'}
                                </td>
                                <td className="px-2 sm:px-4 py-2">
                                  {period.winning_numbers && Array.isArray(period.winning_numbers) ? (
                                    <div className="flex space-x-1">
                                      {period.winning_numbers.slice(0, 6).map((num, idx) => (
                                        <div
                                          key={idx}
                                          className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold"
                                        >
                                          {String(num).padStart(2, '0')}
                                        </div>
                                      ))}
                                      {period.winning_numbers[6] && (
                                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                                          {String(period.winning_numbers[6]).padStart(2, '0')}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    '-'
                                  )}
                                </td>
                                <td className="px-2 sm:px-4 py-2 text-green-600 font-medium whitespace-nowrap">
                                  ¥{Number(period.total_amount || 0).toLocaleString()}
                                </td>
                                <td className="px-2 sm:px-4 py-2 font-bold text-blue-600">
                                  {period.winning_sequence_number || '-'}
                                </td>
                                <td className="px-2 sm:px-4 py-2 text-orange-600 font-bold whitespace-nowrap">
                                  ¥{Number(period.prize_amount || 0).toLocaleString()}
                                </td>
                                <td className="px-2 sm:px-4 py-2">
                                  <button
                                    onClick={() => handleViewDetail(period)}
                                    className="text-blue-600 hover:text-blue-700"
                                  >
                                    <Search className="h-4 w-4 sm:h-5 sm:w-5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  {!historyExpanded && historyPeriods.length > 1 && (
                    <div className="mt-2 text-center text-xs text-gray-500">
                      还有 {historyPeriods.length - 1} 条记录，点击展开查看
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
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
