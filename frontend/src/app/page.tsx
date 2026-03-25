'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (user) {
    router.push('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-gray-900 flex flex-col items-center justify-center text-white p-4">
      <main className="text-center max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
          TradeSim
        </h1>
        <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-2xl mx-auto">
          Experience the thrill of the stock market without the risk.
          Real-time prices, portfolio management, and advanced trading features.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg transition-colors shadow-lg"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="px-8 py-3 bg-transparent border-2 border-white hover:bg-white hover:text-blue-900 text-white rounded-lg font-semibold text-lg transition-colors"
          >
            Register
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm">
            <h3 className="text-xl font-bold mb-2">Real-time Data</h3>
            <p className="text-gray-300">Live stock prices updated instantly via WebSockets.</p>
          </div>
          <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm">
            <h3 className="text-xl font-bold mb-2">Portfolio Tracking</h3>
            <p className="text-gray-300">Monitor your holdings and track profit/loss in real-time.</p>
          </div>
          <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm">
            <h3 className="text-xl font-bold mb-2">Risk-Free Trading</h3>
            <p className="text-gray-300">Practice your trading strategies with virtual currency.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
