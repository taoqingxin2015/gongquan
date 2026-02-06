import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X } from 'lucide-react';

interface LotteryPeriod {
  id: string;
  period_number: string;
  expected_draw_date: string;
  total_bets: number;
  total_amount: number;
}

interface LotteryDrawModalProps {
  period: LotteryPeriod;
  onClose: () => void;
  onSuccess: () => void;
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

function hexToBinary(hex: string): string {
  return hex
    .split('')
    .map((char) => parseInt(char, 16).toString(2).padStart(4, '0'))
    .join('');
}

function calculateWinningNumber(hash: string, totalBets: number): number {
  let binary = hexToBinary(hash);

  const bitsNeeded = Math.ceil(Math.log2(totalBets));

  while (binary.length > bitsNeeded) {
    const truncateLength = bitsNeeded;
    const left = binary.slice(0, binary.length - truncateLength);
    const right = binary.slice(binary.length - truncateLength);

    let result = '';
    for (let i = 0; i < right.length; i++) {
      const leftBit = i < left.length ? left[i] : '0';
      result += leftBit === right[i] ? '0' : '1';
    }

    binary = result;
  }

  let decimal = parseInt(binary, 2);

  if (decimal >= 1 && decimal <= totalBets) {
    return decimal;
  }

  let inverted = '';
  for (let i = 0; i < binary.length; i++) {
    inverted += binary[i] === '0' ? '1' : '0';
  }

  decimal = (parseInt(inverted, 2) + 1) % (totalBets + 1);

  if (decimal === 0) {
    decimal = 1;
  }

  return decimal;
}

export const LotteryDrawModal: React.FC<LotteryDrawModalProps> = ({
  period,
  onClose,
  onSuccess,
}) => {
  const [drawDate, setDrawDate] = useState(new Date().toISOString().split('T')[0]);
  const [numbers, setNumbers] = useState<string[]>(['', '', '', '', '', '', '']);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<{
    winningNumber: number;
    hash: string;
  } | null>(null);

  const handleNumberChange = (index: number, value: string) => {
    const newNumbers = [...numbers];
    newNumbers[index] = value;
    setNumbers(newNumbers);
    setResult(null);
  };

  const handleCalculate = async () => {
    const allFilled = numbers.every((num) => num !== '' && !isNaN(Number(num)));
    if (!allFilled) {
      alert('请填写所有7个开奖号码');
      return;
    }

    if (period.total_bets === 0) {
      alert('当前期没有投注记录，无法开奖');
      return;
    }

    setCalculating(true);

    try {
      const numberString = numbers.join('');
      const hash = await sha256(numberString);
      const winningNumber = calculateWinningNumber(hash, period.total_bets);

      setResult({
        winningNumber,
        hash,
      });
    } catch (error) {
      console.error('Error calculating:', error);
      alert('计算失败，请重试');
    } finally {
      setCalculating(false);
    }
  };

  const handleConfirm = async () => {
    if (!result) {
      alert('请先计算中奖序号');
      return;
    }

    setCalculating(true);

    try {
      const { data: periodData, error: periodError } = await supabase
        .from('lottery_periods')
        .select('pool_amount')
        .eq('id', period.id)
        .maybeSingle();

      if (periodError) throw periodError;

      const currentPoolAmount = Number(periodData?.pool_amount || 0);

      const { data: winningBet, error: betError } = await supabase
        .from('lottery_bets')
        .select('blue_balls')
        .eq('period_id', period.id)
        .eq('status', 'confirmed')
        .lte('sequence_start', result.winningNumber)
        .gte('sequence_end', result.winningNumber)
        .maybeSingle();

      if (betError) {
        console.error('Error fetching winning bet:', betError);
      }

      const blueBall = Number(numbers[6]);
      const winnerBlueBalls = winningBet?.blue_balls as number[] || [];
      const matchedBlue = winnerBlueBalls.includes(blueBall);

      let prizeAmount: number;
      let newPoolAmount: number;

      if (matchedBlue) {
        prizeAmount = period.total_amount * 0.8 + currentPoolAmount;
        newPoolAmount = 0;
      } else {
        prizeAmount = period.total_amount * 0.6;
        newPoolAmount = currentPoolAmount + period.total_amount * 0.2;
      }

      const { error: updateError } = await supabase
        .from('lottery_periods')
        .update({
          actual_draw_date: drawDate,
          status: 'drawn',
          winning_numbers: numbers.map(Number),
          winning_sequence_number: result.winningNumber,
          prize_amount: prizeAmount,
          winner_matched_blue: matchedBlue,
        })
        .eq('id', period.id);

      if (updateError) {
        throw updateError;
      }

      const nextPeriodNumber = String(Number(period.period_number) + 1).padStart(7, '0');
      const nextDrawDate = new Date(drawDate);
      nextDrawDate.setDate(nextDrawDate.getDate() + 7);

      const { error: createError } = await supabase
        .from('lottery_periods')
        .insert([
          {
            period_number: nextPeriodNumber,
            expected_draw_date: nextDrawDate.toISOString().split('T')[0],
            status: 'accepting_bets',
            pool_amount: newPoolAmount,
          },
        ]);

      if (createError) {
        console.error('Error creating next period:', createError);
      }

      const matchInfo = matchedBlue ? '（匹配蓝球！）' : '';
      alert(`开奖成功！中奖序号：${result.winningNumber}${matchInfo}\n奖金：¥${prizeAmount.toLocaleString()}`);
      onSuccess();
    } catch (error: any) {
      console.error('Error confirming draw:', error);
      alert('开奖失败: ' + error.message);
    } finally {
      setCalculating(false);
    }
  };

  const allNumbersFilled = numbers.every((num) => num !== '' && !isNaN(Number(num)));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">开奖 - 期号 {period.period_number}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">总投注额：</span>
                <span className="font-semibold text-green-600">
                  ¥{period.total_amount.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-600">总注数：</span>
                <span className="font-semibold text-blue-600">{period.total_bets}</span>
              </div>
              <div className="col-span-2">
                <div className="text-gray-600 mb-1">奖金分配：</div>
                <div className="text-xs space-y-1 bg-white p-2 rounded">
                  <div>• 仅中序号：60%奖金 (¥{(period.total_amount * 0.6).toLocaleString()})</div>
                  <div className="ml-6">20%进入奖池，20%见证费</div>
                  <div>• 序号+蓝球：80%奖金+奖池</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">开奖日期</label>
            <input
              type="date"
              value={drawDate}
              onChange={(e) => setDrawDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              开奖号码（前6个红球，最后1个蓝球）
            </label>
            <div className="flex space-x-2">
              {numbers.slice(0, 6).map((num, idx) => (
                <input
                  key={idx}
                  type="number"
                  value={num}
                  onChange={(e) => handleNumberChange(idx, e.target.value)}
                  placeholder={`${idx + 1}`}
                  min="1"
                  max="33"
                  className="w-12 h-12 text-center border-2 border-red-300 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold"
                />
              ))}
              <div className="w-4" />
              <input
                type="number"
                value={numbers[6]}
                onChange={(e) => handleNumberChange(6, e.target.value)}
                placeholder="7"
                min="1"
                max="16"
                className="w-12 h-12 text-center border-2 border-blue-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">请输入福彩双色球的7个开奖号码</p>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleCalculate}
              disabled={!allNumbersFilled || calculating}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {calculating ? '计算中...' : '开始摇奖'}
            </button>
          </div>

          {result && (
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 space-y-3">
              <div>
                <div className="text-sm text-gray-600 mb-1">SHA-256 哈希值：</div>
                <div className="text-xs font-mono bg-white p-2 rounded border break-all">
                  {result.hash}
                </div>
              </div>
              <div className="text-center py-4">
                <div className="text-sm text-gray-600 mb-2">中奖序号</div>
                <div className="text-5xl font-bold text-green-600">{result.winningNumber}</div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <p className="text-sm text-yellow-800">
                  <strong>算法说明：</strong>
                  对开奖号码进行SHA-256哈希运算得到256位二进制，然后做循环截短异或运算（截短位数由总注数{period.total_bets}的二进制位数决定）。
                  如果结果落在1-{period.total_bets}范围内即为中奖序号，否则逐位取反+1作为中奖序号。
                </p>
              </div>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              onClick={handleConfirm}
              disabled={!result || calculating}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              确认开奖
            </button>
            <button
              onClick={onClose}
              disabled={calculating}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
