import React, { useEffect, useState } from 'react';
import { Event, supabase } from '../lib/supabase';

interface EventCardProps {
  event: Event;
  onClick: (event: Event) => void;
  onBetClick?: (event: Event, direction: 'yes' | 'no') => void;
  isLoggedIn?: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onClick,
  onBetClick,
  isLoggedIn = false
}) => {
  const [yesBets, setYesBets] = useState(0);
  const [noBets, setNoBets] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBets = async () => {
      const { data, error } = await supabase
        .from('bets')
        .select('direction, amount, status')
        .eq('event_id', event.id)
        .eq('status', 'confirmed');

      if (error) {
        console.error('Error fetching bets:', error);
        setLoading(false);
        return;
      }

      const actualYesTotal = data
        ?.filter((bet) => bet.direction === 'yes')
        .reduce((sum, bet) => sum + Number(bet.amount), 0) || 0;

      const actualNoTotal = data
        ?.filter((bet) => bet.direction === 'no')
        .reduce((sum, bet) => sum + Number(bet.amount), 0) || 0;

      const yesTotal = Number(event.yes_total || 0) + actualYesTotal;
      const noTotal = Number(event.no_total || 0) + actualNoTotal;

      setYesBets(yesTotal);
      setNoBets(noTotal);
      setLoading(false);
    };

    fetchBets();
  }, [event.id]);

  const total = yesBets + noBets;
  const yesPercentage = total > 0 ? (yesBets / total) * 100 : 50;
  const noPercentage = total > 0 ? (noBets / total) * 100 : 50;

  const handleBetButtonClick = (e: React.MouseEvent, direction: 'yes' | 'no') => {
    e.stopPropagation();
    if (isLoggedIn && onBetClick) {
      onBetClick(event, direction);
    } else {
      onClick(event);
    }
  };

  return (
    <div
      onClick={() => onClick(event)}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4 line-clamp-2">
        {event.title}
      </h3>

      <div className="flex items-center justify-between mb-3">
        <button
          onClick={(e) => handleBetButtonClick(e, 'yes')}
          className="flex-1 mr-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg font-medium hover:bg-green-100 transition-colors"
        >
          是
        </button>
        <button
          onClick={(e) => handleBetButtonClick(e, 'no')}
          className="flex-1 ml-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg font-medium hover:bg-red-100 transition-colors"
        >
          否
        </button>
      </div>

      <div className="flex items-center justify-between mb-2 text-sm">
        <span className="text-green-600 font-medium">
          ¥{loading ? '...' : yesBets.toLocaleString()}
        </span>
        <span className="text-red-600 font-medium">
          ¥{loading ? '...' : noBets.toLocaleString()}
        </span>
      </div>

      <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
        <div
          className="bg-green-500 transition-all duration-300"
          style={{ width: `${yesPercentage}%` }}
        />
        <div
          className="bg-red-500 transition-all duration-300"
          style={{ width: `${noPercentage}%` }}
        />
      </div>

      <div className="mt-3 text-xs text-gray-500">
        {new Date(event.reveal_date).toLocaleDateString('zh-CN')} 揭晓
      </div>
    </div>
  );
};
