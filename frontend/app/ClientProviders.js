'use client';

import { AuthProvider } from './contexts/AuthContext';
import Chatbot from './components/Chatbot/Chatbot';

export default function ClientProviders({ children }) {
  return (
    <AuthProvider>
      {children}
      <Chatbot />
    </AuthProvider>
  );
}
