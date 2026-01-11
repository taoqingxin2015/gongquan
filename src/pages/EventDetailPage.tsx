import React, { useEffect, useState } from 'react';
import { Event, supabase, Bet } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X } from 'lucide-react';

interface EventDetailPageProps {
  event: Event;
  onClose: () => void;
  onLoginRequired: () => void;
}

interface BetWithUser extends Bet {
  user?: {
    name: string;
  };
}

export const EventDetailPage: React.FC<EventDetailPageProps> = ({
  event,
  onClose,
  onLoginRequired,
}) => {
  const { profile } = useAuth();
  const [selectedDirection, setSelectedDirection] = useState<'yes' | 'no' | null>(
    null
  );
  const [betAmount, setBetAmount] = useState('');
  const [yesBets, setYesBets] = useState(0);
  const [noBets, setNoBets] = useState(0);
  const [allBets, setAllBets] = useState<BetWithUser[]>([]);
  const [showBetModal, setShowBetModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [witnessQrCode, setWitnessQrCode] = useState<string>('');

  const fetchBets = async () => {
    console.log('Fetching bets for event:', event.id);
    const { data: betsData, error } = await supabase
      .from('bets')
      .select(`
        *,
        user:profiles!bets_user_id_fkey(name)
      `)
      .eq('event_id', event.id)
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bets:', error);
      return;
    }

    console.log('Fetched bets data:', betsData);
    console.log('Number of bets:', betsData?.length || 0);

    const actualYesTotal = betsData
      ?.filter((bet) => bet.direction === 'yes')
      .reduce((sum, bet) => sum + Number(bet.amount), 0) || 0;

    const actualNoTotal = betsData
      ?.filter((bet) => bet.direction === 'no')
      .reduce((sum, bet) => sum + Number(bet.amount), 0) || 0;

    const yesTotal = Number(event.yes_total || 0) + actualYesTotal;
    const noTotal = Number(event.no_total || 0) + actualNoTotal;

    console.log('Yes total:', yesTotal, 'No total:', noTotal);

    setYesBets(yesTotal);
    setNoBets(noTotal);
    setAllBets(betsData || []);
  };

  useEffect(() => {
    fetchBets();

    const channel = supabase
      .channel(`bets-${event.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bets',
          filter: `event_id=eq.${event.id}`,
        },
        () => {
          fetchBets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [event.id]);

  const handleBetClick = async (direction: 'yes' | 'no') => {
    if (!profile) {
      onLoginRequired();
      return;
    }

    if (profile.status === 'banned') {
      alert('您的账号已被封禁，无法下注');
      return;
    }

    const { data: witnessData, error: witnessError } = await supabase
      .from('profiles')
      .select('payment_qr_code')
      .eq('id', profile.referred_by)
      .maybeSingle();

    if (witnessError || !witnessData || !witnessData.payment_qr_code) {
      alert('找不到见证人收款码，请联系管理员');
      return;
    }

    setWitnessQrCode(witnessData.payment_qr_code);
    setSelectedDirection(direction);
    setShowBetModal(true);
  };

  const handleConfirmBet = async () => {
    if (!profile || !selectedDirection || !betAmount) return;

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('请输入有效金额');
      return;
    }

    setLoading(true);

    const { data: witnessData, error: witnessError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', profile.referred_by)
      .maybeSingle();

    if (witnessError || !witnessData) {
      alert('找不到您的见证人，请联系管理员');
      setLoading(false);
      return;
    }

    const { error: betError } = await supabase.from('bets').insert({
      event_id: event.id,
      user_id: profile.id,
      direction: selectedDirection,
      amount: amount,
      witness_id: witnessData.id,
      status: 'pending',
    });

    if (betError) {
      alert('下注失败: ' + betError.message);
    } else {
      alert('下注成功！请等待见证人确认');
      setShowBetModal(false);
      setBetAmount('');
      setSelectedDirection(null);
    }

    setLoading(false);
  };

  const total = yesBets + noBets;
  const yesPercentage = total > 0 ? (yesBets / total) * 100 : 50;
  const noPercentage = total > 0 ? (noBets / total) * 100 : 50;

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-bold text-gray-900">
              共权预测网
            </h1>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      <div className="sticky top-16 bg-white border-b border-gray-200 shadow-sm z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={() => handleBetClick('yes')}
              className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                selectedDirection === 'yes'
                  ? 'bg-green-600 text-white'
                  : 'bg-green-50 text-green-700 hover:bg-green-100'
              }`}
            >
              是
            </button>
            <button
              onClick={() => handleBetClick('no')}
              className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                selectedDirection === 'no'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              否
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">{event.title}</h2>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm text-green-700 mb-1">是 - 总额</div>
            <div className="text-2xl font-bold text-green-900">
              ¥{yesBets.toLocaleString()}
            </div>
            <div className="text-sm text-green-600 mt-1">
              {yesPercentage.toFixed(1)}%
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-sm text-red-700 mb-1">否 - 总额</div>
            <div className="text-2xl font-bold text-red-900">
              ¥{noBets.toLocaleString()}
            </div>
            <div className="text-sm text-red-600 mt-1">
              {noPercentage.toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              事件描述
            </h3>
            <p className="text-gray-700 whitespace-pre-wrap">
              {event.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">创建日期：</span>
              <span className="font-medium">
                {new Date(event.created_at).toLocaleDateString('zh-CN')}
              </span>
            </div>
            <div>
              <span className="text-gray-600">揭晓日期：</span>
              <span className="font-medium">
                {new Date(event.reveal_date).toLocaleDateString('zh-CN')}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              评判标准
            </h3>
            <p className="text-gray-700 whitespace-pre-wrap">{event.rules}</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              下注记录
            </h3>
            {allBets.length === 0 ? (
              <p className="text-gray-500 text-center py-8">暂无下注记录</p>
            ) : (
              <div className="space-y-2">
                {allBets.map((bet) => (
                  <div
                    key={bet.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-600">
                        {bet.user?.name || '匿名用户'}
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          bet.direction === 'yes'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {bet.direction === 'yes' ? '是' : '否'}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        ¥{Number(bet.amount).toLocaleString()}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(bet.created_at).toLocaleString('zh-CN')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showBetModal && profile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">确认下注</h3>

            <div className="mb-4">
              <div className="text-center mb-4">
                <div className="text-sm text-gray-600 mb-2">
                  请扫描二维码向见证人转账
                </div>
                {witnessQrCode && (
                  <img
                    src={witnessQrCode}
                    alt="Payment QR Code"
                    className="w-48 h-48 mx-auto object-contain border border-gray-300 rounded-lg"
                  />
                )}
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  下注金额（¥）
                </label>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  min="1"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入金额"
                />
              </div>

              <div className="mt-2 text-sm text-gray-600">
                方向：
                <span
                  className={`ml-2 px-2 py-1 rounded ${
                    selectedDirection === 'yes'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {selectedDirection === 'yes' ? '是' : '否'}
                </span>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleConfirmBet}
                disabled={loading}
                className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? '提交中...' : '已转款'}
              </button>
              <button
                onClick={() => {
                  setShowBetModal(false);
                  setBetAmount('');
                  setSelectedDirection(null);
                }}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                取消下注
              </button>
            </div>

            <p className="mt-4 text-xs text-gray-500 text-center">
              点击"已转款"后，您的下注将等待见证人确认
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
