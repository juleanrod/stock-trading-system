'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function DashboardPage() {
    const { user } = useAuth();
    const [balance, setBalance] = useState<number | null>(null);
    const [portfolioValue, setPortfolioValue] = useState<number>(0);
    const [marketStatus, setMarketStatus] = useState<boolean>(false);
    const { socket } = useWebSocket();

    const [holidays, setHolidays] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            // 1. Fetch Market Data (Always required)
            try {
                const [marketRes, holidaysRes] = await Promise.all([
                    api.get('/market/status'),
                    api.get('/market/holidays')
                ]);

                setMarketStatus(marketRes.data.isOpen);

                // Filter for upcoming holidays
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const upcoming = holidaysRes.data.filter((h: any) => {
                    const holidayDate = new Date(h.market_date);
                    // Adjust for timezone issues if necessary
                    const hDate = new Date(holidayDate.getTime() + holidayDate.getTimezoneOffset() * 60000);
                    return hDate >= today;
                }).sort((a: any, b: any) => new Date(a.market_date).getTime() - new Date(b.market_date).getTime())
                    .slice(0, 3); // Show next 3 holidays

                setHolidays(upcoming);
            } catch (error) {
                console.error('Error fetching market data:', error);
            }

            // 2. Fetch User Data (Cash & Portfolio) - May fail for admins without accounts
            try {
                const [cashRes, portfolioRes] = await Promise.all([
                    api.get('/cash'),
                    api.get('/portfolio')
                ]);

                setBalance(cashRes.data.balance);

                // Calculate initial portfolio value
                const totalValue = portfolioRes.data.reduce((acc: number, item: any) => {
                    return acc + (parseFloat(item.total_value) || 0);
                }, 0);
                setPortfolioValue(totalValue);

            } catch (error) {
                console.error('Error fetching user data:', error);
                // Non-fatal error for admins, maybe just set balance to 0 or leave as null
            }
        };

        if (user) {
            fetchData();
        }
    }, [user]);

    // Listen for real-time portfolio updates (simplified for now)
    useEffect(() => {
        if (!socket) return;

        socket.on('price-update', (data) => {
            // In a real app, we would update the specific stock in the portfolio and recalculate total value
            // For now, we'll just log it to verify connection
            // console.log('Price update:', data);
        });

        return () => {
            socket.off('price-update');
        };
    }, [socket]);

    return (
        <DashboardLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.name}</h1>
                <p className="mt-2 text-gray-600">Here's what's happening with your portfolio today.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Cash Balance Card */}
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                    <h3 className="text-gray-500 text-sm font-medium uppercase">Cash Balance</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                        ${balance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                </div>

                {/* Portfolio Value Card */}
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                    <h3 className="text-gray-500 text-sm font-medium uppercase">Portfolio Value</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                        ${portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                </div>

                {/* Market Status Card */}
                <div className={`bg-white p-6 rounded-lg shadow-md border-l-4 ${marketStatus ? 'border-green-500' : 'border-red-500'}`}>
                    <h3 className="text-gray-500 text-sm font-medium uppercase">Market Status</h3>
                    <p className={`text-2xl font-bold mt-2 ${marketStatus ? 'text-green-600' : 'text-red-600'}`}>
                        {marketStatus ? 'OPEN' : 'CLOSED'}
                    </p>
                </div>

                {/* Upcoming Holidays Card */}
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
                    <h3 className="text-gray-500 text-sm font-medium uppercase">Upcoming Holidays</h3>
                    <div className="mt-2">
                        {holidays.length === 0 ? (
                            <p className="text-gray-400 text-sm">No upcoming holidays</p>
                        ) : (
                            <ul className="space-y-1">
                                {holidays.map((h: any) => (
                                    <li key={h.schedule_id} className="text-sm font-medium text-gray-900">
                                        {new Date(h.market_date).toLocaleDateString(undefined, { timeZone: 'UTC' })}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
