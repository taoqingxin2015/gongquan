import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X } from 'lucide-react';
import { UserInfoTab } from '../components/dashboard/UserInfoTab';
import { BetsTab } from '../components/dashboard/BetsTab';
import { PlayersListTab } from '../components/dashboard/PlayersListTab';
import { WitnessListTab } from '../components/dashboard/WitnessListTab';
import { PlayersManagementTab } from '../components/dashboard/PlayersManagementTab';
import { EventsManagementTab } from '../components/dashboard/EventsManagementTab';
import { BetConfirmationTab } from '../components/dashboard/BetConfirmationTab';
import { LotteryBetConfirmationTab } from '../components/dashboard/LotteryBetConfirmationTab';
import { LotteryBetsTab } from '../components/dashboard/LotteryBetsTab';
import { PendingWitnessesTab } from '../components/dashboard/PendingWitnessesTab';

interface DashboardPageProps {
  onClose: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onClose }) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('info');

  if (!profile) {
    return null;
  }

  const getTabs = () => {
    switch (profile.role) {
      case 'player':
        return [
          { id: 'info', label: '用户信息' },
          { id: 'bets', label: '下注项目' },
          { id: 'lottery-bets', label: '彩票投注' },
        ];
      case 'witness':
        return [
          { id: 'info', label: '用户信息' },
          { id: 'bets', label: '下注项目' },
          { id: 'lottery-bets', label: '彩票投注' },
          { id: 'players', label: '玩家列表' },
          { id: 'confirmations', label: '待确认投注' },
          { id: 'lottery-confirmations', label: '待确认彩票投注' },
          { id: 'pending-witnesses', label: '待确认下一级见证人' },
        ];
      case 'admin':
        return [
          { id: 'info', label: '用户信息' },
          { id: 'players', label: '玩家列表' },
          { id: 'confirmations', label: '待确认投注' },
          { id: 'lottery-confirmations', label: '待确认彩票投注' },
          { id: 'pending-witnesses', label: '待确认下一级见证人' },
          { id: 'witnesses', label: '见证人列表' },
          { id: 'events', label: '事件管理' },
        ];
      default:
        return [];
    }
  };

  const tabs = getTabs();

  const renderTabContent = () => {
    switch (activeTab) {
      case 'info':
        return <UserInfoTab />;
      case 'bets':
        return <BetsTab />;
      case 'lottery-bets':
        return <LotteryBetsTab />;
      case 'players':
        return profile.role === 'witness' ? (
          <PlayersListTab />
        ) : (
          <PlayersManagementTab />
        );
      case 'confirmations':
        return <BetConfirmationTab />;
      case 'lottery-confirmations':
        return <LotteryBetConfirmationTab />;
      case 'witnesses':
        return <WitnessListTab />;
      case 'events':
        return <EventsManagementTab />;
      case 'pending-witnesses':
        return <PendingWitnessesTab />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-6xl w-full min-h-[600px] max-h-[90vh] flex flex-col relative my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">用户中心</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="border-b border-gray-200">
          <div className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">{renderTabContent()}</div>
      </div>
    </div>
  );
};
