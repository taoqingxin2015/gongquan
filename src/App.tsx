import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { RulesPage } from './pages/RulesPage';
import { LotteryPage } from './pages/LotteryPage';
import { BetModal } from './components/BetModal';
import { Event } from './lib/supabase';

type PageView = 'home' | 'login' | 'register' | 'dashboard' | 'event' | 'rules' | 'lottery';

function AppContent() {
  const { profile } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageView>('home');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [betModalData, setBetModalData] = useState<{
    event: Event;
    direction: 'yes' | 'no';
  } | null>(null);

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setCurrentPage('event');
  };

  const handleLoginRequired = () => {
    setCurrentPage('login');
  };

  const handleBetClick = (event: Event, direction: 'yes' | 'no') => {
    if (!profile) {
      setCurrentPage('login');
      return;
    }

    if (profile.status === 'banned') {
      alert('您的账号已被封禁，无法下注');
      return;
    }

    setBetModalData({ event, direction });
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'login':
        return (
          <LoginPage
            onClose={() => setCurrentPage('home')}
            onSwitchToRegister={() => setCurrentPage('register')}
          />
        );
      case 'register':
        return (
          <RegisterPage
            onClose={() => setCurrentPage('home')}
            onSwitchToLogin={() => setCurrentPage('login')}
          />
        );
      case 'dashboard':
        return <DashboardPage onClose={() => setCurrentPage('home')} />;
      case 'event':
        return selectedEvent ? (
          <EventDetailPage
            event={selectedEvent}
            onClose={() => {
              setCurrentPage('home');
              setSelectedEvent(null);
            }}
            onLoginRequired={handleLoginRequired}
          />
        ) : null;
      case 'rules':
        return <RulesPage onClose={() => setCurrentPage('home')} />;
      case 'lottery':
        return <LotteryPage />;
      default:
        return (
          <HomePage
            searchQuery={searchQuery}
            onEventClick={handleEventClick}
            onBetClick={handleBetClick}
            onLotteryClick={() => setCurrentPage('lottery')}
            isLoggedIn={!!profile}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {currentPage !== 'event' && (
        <Navbar
          onLoginClick={() => setCurrentPage('login')}
          onRegisterClick={() => setCurrentPage('register')}
          onRulesClick={() => setCurrentPage('rules')}
          onDashboardClick={() => setCurrentPage('dashboard')}
          onSearch={setSearchQuery}
        />
      )}
      {renderPage()}
      {betModalData && (
        <BetModal
          event={betModalData.event}
          direction={betModalData.direction}
          onClose={() => setBetModalData(null)}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
