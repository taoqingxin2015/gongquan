import React, { useEffect, useState } from 'react';
import { supabase, Event } from '../../lib/supabase';
import { Plus, Edit, Trash2, Download } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface EventWithStats extends Event {
  totalYesBets: number;
  totalNoBets: number;
  isExpired: boolean;
}

export const EventsManagementTab: React.FC = () => {
  const { session } = useAuth();
  const [events, setEvents] = useState<EventWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '政治',
    rules: '',
    reveal_date: '',
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data: eventsData, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching events:', error);
      setLoading(false);
      return;
    }

    const eventsWithStats = await Promise.all(
      (eventsData || []).map(async (event) => {
        const { data: bets } = await supabase
          .from('bets')
          .select('amount, direction, status')
          .eq('event_id', event.id);

        const confirmedBets = bets?.filter((b) => b.status === 'confirmed') || [];
        const actualYesBets = confirmedBets
          .filter((b) => b.direction === 'yes')
          .reduce((sum, b) => sum + Number(b.amount), 0);
        const actualNoBets = confirmedBets
          .filter((b) => b.direction === 'no')
          .reduce((sum, b) => sum + Number(b.amount), 0);

        const totalYesBets = Number(event.yes_total || 0) + actualYesBets;
        const totalNoBets = Number(event.no_total || 0) + actualNoBets;

        const isExpired = new Date(event.reveal_date) < new Date();

        return {
          ...event,
          totalYesBets,
          totalNoBets,
          isExpired,
        };
      })
    );

    setEvents(eventsWithStats);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingEvent) {
      const { error } = await supabase
        .from('events')
        .update(formData)
        .eq('id', editingEvent.id);

      if (error) {
        alert('更新失败: ' + error.message);
      } else {
        alert('更新成功');
        setShowModal(false);
        fetchEvents();
      }
    } else {
      const newEvent = {
        ...formData,
        yes_total: 0,
        no_total: 0,
      };

      const { error } = await supabase.from('events').insert([newEvent]);

      if (error) {
        alert('创建失败: ' + error.message);
      } else {
        alert('创建成功');
        setShowModal(false);
        fetchEvents();
      }
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description,
      category: event.category,
      rules: event.rules,
      reveal_date: event.reveal_date.split('T')[0],
    });
    setShowModal(true);
  };

  const handleToggleStatus = async (eventId: string, newStatus: string, isExpired: boolean) => {
    if (isExpired) {
      return;
    }

    const { error } = await supabase
      .from('events')
      .update({ status: newStatus })
      .eq('id', eventId);

    if (error) {
      alert('操作失败: ' + error.message);
    } else {
      fetchEvents();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除该事件吗？')) return;

    const { error } = await supabase.from('events').delete().eq('id', id);

    if (error) {
      alert('删除失败: ' + error.message);
    } else {
      fetchEvents();
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: '政治',
      rules: '',
      reveal_date: '',
    });
    setEditingEvent(null);
  };

  const handleImportData = async () => {
    if (!session) {
      alert('请先登录');
      return;
    }

    if (!confirm('确定要导入数据吗？这将导入 20 个样本事件。')) {
      return;
    }

    setImporting(true);

    try {
      const templates = [
        { title: '2026年美国中期选举中民主党是否能保持参议院多数席位？', category: '政治' },
        { title: '比特币价格是否会在2026年6月前突破10万美元？', category: '加密货币' },
        { title: 'OpenAI 是否会在2026年发布 GPT-5？', category: '科技' },
        { title: '2026年世界杯足球赛冠军会是巴西队吗？', category: '体育' },
        { title: '特斯拉股价是否会在2026年第二季度突破300美元？', category: '经济' },
        { title: '2026年夏季奥运会举办城市是否能如期举办？', category: '体育' },
        { title: 'SpaceX 是否会在2026年实现载人火星登陆？', category: '科技' },
        { title: '美联储是否会在2026年上半年降息？', category: '经济' },
        { title: '中国经济增长率是否会在2026年超过5%？', category: '经济' },
        { title: '人工智能是否会在2026年通过图灵测试？', category: '科技' },
        { title: '电影《阿凡达3》是否会成为2026年全球票房冠军？', category: '娱乐' },
        { title: '全球气温是否会在2026年再创历史新高？', category: '时事' },
        { title: '苹果是否会在2026年发布折叠屏iPhone？', category: '科技' },
        { title: '2026年诺贝尔和平奖得主会来自非洲吗？', category: '时事' },
        { title: '黄金价格是否会在2026年底前突破每盎司3000美元？', category: '经济' },
        { title: 'NBA 2025-2026赛季总冠军会是洛杉矶湖人队吗？', category: '体育' },
        { title: '微软市值是否会在2026年突破4万亿美元？', category: '经济' },
        { title: '量子计算机是否会在2026年实现商业化应用？', category: '科技' },
        { title: '2026年全球新能源汽车销量是否会超过传统燃油车？', category: '经济' },
        { title: '某知名科技公司CEO是否会在2026年卸任？', category: '时事' },
      ];

      const events = templates.map((template) => {
        const daysToAdd = Math.floor(Math.random() * 180) + 30;
        const revealDate = new Date();
        revealDate.setDate(revealDate.getDate() + daysToAdd);

        return {
          title: template.title,
          description: `${template.title}\n\n本事件基于公开信息和市场预期，结果将在揭晓日期后根据官方公布的信息进行判定。投注者需要关注相关新闻和公告，做出自己的判断。`,
          category: template.category,
          rules: '根据官方公布的结果或权威媒体报道判定。如果在揭晓日期前事件已有明确结果，将提前结算。如果揭晓日期时仍无法判定，将延期至有明确结果为止。',
          status: 'active',
          reveal_date: revealDate.toISOString(),
          yes_total: 0,
          no_total: 0,
        };
      });

      const { data, error } = await supabase.from('events').insert(events).select();

      if (error) {
        throw error;
      }

      alert(`成功导入 ${data.length} 个事件！`);
      fetchEvents();
    } catch (error: any) {
      console.error('Import error:', error);
      alert('导入失败: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  const getStatusDisplay = (event: EventWithStats) => {
    if (event.isExpired) {
      return (
        <span className="px-3 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 cursor-not-allowed">
          过期
        </span>
      );
    }

    return (
      <select
        value={event.status}
        onChange={(e) => handleToggleStatus(event.id, e.target.value, event.isExpired)}
        className={`px-3 py-1 rounded text-xs font-medium border cursor-pointer ${
          event.status === 'active'
            ? 'bg-green-50 border-green-300 text-green-700'
            : 'bg-red-50 border-red-300 text-red-700'
        }`}
      >
        <option value="active">激活</option>
        <option value="banned">封禁</option>
      </select>
    );
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-600">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">事件管理</h3>
        <div className="flex space-x-3">
          <button
            onClick={handleImportData}
            disabled={importing}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-5 w-5" />
            <span>{importing ? '导入中...' : '导入数据'}</span>
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            <span>添加事件</span>
          </button>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12 text-gray-500">暂无事件</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  序号
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  事件名称
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  下注款项总额
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  事件状态
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  创建日期
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  揭晓日期
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {events.map((event, index) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{index + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium max-w-xs truncate">
                    {event.title}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex flex-col">
                      <span className="text-green-600">
                        是: ¥{event.totalYesBets.toLocaleString()}
                      </span>
                      <span className="text-red-600">
                        否: ¥{event.totalNoBets.toLocaleString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {getStatusDisplay(event)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {new Date(event.created_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {new Date(event.reveal_date).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(event)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingEvent ? '编辑事件' : '添加事件'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  事件名称
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  分类
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>政治</option>
                  <option>经济</option>
                  <option>金融</option>
                  <option>科技</option>
                  <option>社会</option>
                  <option>体育</option>
                  <option>文化</option>
                  <option>娱乐</option>
                  <option>军事</option>
                  <option>国际</option>
                  <option>美国</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  详细描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  评判标准
                </label>
                <textarea
                  value={formData.rules}
                  onChange={(e) =>
                    setFormData({ ...formData, rules: e.target.value })
                  }
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  揭晓日期
                </label>
                <input
                  type="date"
                  value={formData.reveal_date}
                  onChange={(e) =>
                    setFormData({ ...formData, reveal_date: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingEvent ? '更新' : '创建'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
