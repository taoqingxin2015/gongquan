import React, { useEffect, useState } from 'react';
import { Event, supabase } from '../lib/supabase';
import { EventCard } from '../components/EventCard';
import { useAuth } from '../contexts/AuthContext';

interface HomePageProps {
  searchQuery: string;
  onEventClick: (event: Event) => void;
  onBetClick?: (event: Event, direction: 'yes' | 'no') => void;
}

const categories = [
  '全部',
  '政治',
  '经济',
  '金融',
  '科技',
  '社会',
  '体育',
  '文化',
  '军事',
  '国际',
  '美国',
];

export const HomePage: React.FC<HomePageProps> = ({ searchQuery, onEventClick, onBetClick }) => {
  const { profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('全部');

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);

      let query = supabase
        .from('events')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (selectedCategory !== '全部') {
        query = query.eq('category', selectedCategory);
      }

      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching events:', error);
        alert('加载失败: ' + error.message);
      } else {
        console.log('成功加载事件:', data?.length, '条');
        setEvents(data || []);
      }

      setLoading(false);
    };

    fetchEvents();
  }, [selectedCategory, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 overflow-x-auto">
        <div className="flex space-x-2 min-w-max">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">暂无事件</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onClick={onEventClick}
              onBetClick={onBetClick}
              isLoggedIn={!!profile}
            />
          ))}
        </div>
      )}
    </div>
  );
};
