import React from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface RulesPageProps {
  onClose: () => void;
}

export const RulesPage: React.FC<RulesPageProps> = ({ onClose }) => {
  const { profile } = useAuth();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">怎么玩</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-8">
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              玩家下注规则
            </h3>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 leading-relaxed">
                对热点事件的结果进行竞猜下注，下注金额不限并存放在你的见证人处。事件结果揭晓之日（预先设定日
                11:59PM），见证人除退回押对者本金外，还会支付其收益。
              </p>
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-gray-700 mb-2">
                  <strong>收益计算公式：</strong>
                </p>
                <p className="text-gray-700 font-mono text-sm">
                  收益 = 个人下注金额 ÷ 总押对金额 × 总押错金额 × 80%
                </p>
                <p className="text-gray-600 text-sm mt-2">
                  注：剩余 20% 为见证人见证服务费（可多级）
                </p>
              </div>
              <div className="mt-4">
                <p className="text-gray-700">
                  <strong>示例：</strong>
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mt-2">
                  <li>事件：某球队能否赢得比赛</li>
                  <li>总押"是"金额：¥10,000</li>
                  <li>总押"否"金额：¥5,000</li>
                  <li>您押"是"：¥1,000</li>
                  <li>结果：该球队获胜（"是"）</li>
                  <li>
                    您的收益 = ¥1,000 ÷ ¥10,000 × ¥5,000 × 80% = ¥400
                  </li>
                  <li>
                    <strong>您总共获得：¥1,000（本金）+ ¥400（收益）= ¥1,400</strong>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {profile && (profile.role === 'witness' || profile.role === 'admin') && (
            <section className="border-t border-gray-200 pt-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                见证人分红规则
              </h3>
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-700 leading-relaxed mb-4">
                  每级见证人收取其见证的普通玩家的下注金额并代为保管，事件结果揭晓后，按步骤执行以下操作：
                </p>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      步骤 1：退回押对玩家本金
                    </h4>
                    <p className="text-gray-700 text-sm">
                      先退回自己见证的押对玩家本金
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      步骤 2：处理押错玩家本金
                    </h4>
                    <p className="text-gray-700 text-sm mb-2">
                      自己见证的押错玩家本金分两部分处理：
                    </p>
                    <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                      <li>
                        <strong>80% 部分：</strong>
                        用于分配给自己见证的押对玩家，具体分配比例和金额按前一规则计算，如有盈余，则上交给自己的上一级见证人，如不足，先以自己收到的下一级见证人上缴的盈余充抵（如有），充抵后若还有剩余则继续交给上一级见证人，如仍不足则向上逐级请款。
                      </li>
                      <li>
                        <strong>20% 部分：</strong>除以自己所在层级数+1归自己所有，剩余部分上交给自己的上一级见证人。
                      </li>
                    </ul>
                  </div>

                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      步骤 3：处理下级见证人上缴款项
                    </h4>
                    <p className="text-gray-700 text-sm mb-2">
                      下一级见证人（如有）的上缴款项也分两部分处理：
                    </p>
                    <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                      <li>
                        押错玩家本金剩余部分（如有）首先用于抵充本级押对玩家的收益（如果需要），剩余部分继续上交
                      </li>
                      <li>
                        分红剩余部分除以自己所在层级数+1归自己所有，剩余的继续上交给自己的上一级见证人
                      </li>
                    </ul>
                  </div>

                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      步骤 4：处理请款
                    </h4>
                    <p className="text-gray-700 text-sm">
                      如有请款发生，下一级见证人的请款先用自己的盈余（如有）抵充，不够再将上一级下发的请款按数量转发给下一级和核销自己申请的请款。
                    </p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>重要提示：</strong>
                    在事件揭晓之日，系统会给每个见证人发送其解款/请款金额通知，每个见证人根据以上规则验算无误后接收和发送相关款项，如违反以上规则，系统将冻结其见证人会员资格。
                  </p>
                </div>
              </div>
            </section>
          )}

          <section className="border-t border-gray-200 pt-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              竞猜玩法流程
            </h3>
            <div className="flex justify-center items-center">
              <img
                src="/竞猜玩法流程图.png"
                alt="竞猜玩法流程图"
                className="max-w-full h-auto rounded-lg shadow-lg"
              />
            </div>
          </section>

          <section className="border-t border-gray-200 pt-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              常见问题
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Q: 下注后可以取消吗？
                </h4>
                <p className="text-gray-700 text-sm">
                  A: 下注提交后不可取消，请谨慎下注。
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Q: 什么时候能看到下注结果？
                </h4>
                <p className="text-gray-700 text-sm">
                  A:
                  每个事件都有预设的揭晓日期，在该日期的23:59后，见证人会处理结算。
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Q: 如何成为见证人？
                </h4>
                <p className="text-gray-700 text-sm">
                  A:
                  注册时选择"见证人注册"，需要提供收款码并获得推荐码。见证人可以推荐玩家并获得分红。
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
