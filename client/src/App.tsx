import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { StartGamePage } from '@/pages/StartGamePage';
import { JoinRoomPage } from '@/pages/JoinRoomPage';
import { LobbyPage } from '@/pages/LobbyPage';
import { HouseRulesPage } from '@/pages/HouseRulesPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { StatisticsPage } from '@/pages/StatisticsPage';
import { AIGamePage } from '@/pages/AIGamePage';
import { GamePage } from '@/pages/GamePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="start" element={<StartGamePage />} />
          <Route path="join" element={<JoinRoomPage />} />
          <Route path="lobby/:roomId" element={<LobbyPage />} />
          <Route path="lobby/:roomId/house-rules" element={<HouseRulesPage />} />
          <Route path="game/:roomId" element={<GamePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="statistics" element={<StatisticsPage />} />
          <Route path="ai-game" element={<AIGamePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
