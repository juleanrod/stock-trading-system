'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
    const { user } = useAuth();
    const router = useRouter();

    // Protect admin route
    if (user && user.role !== 'admin') {
        router.push('/dashboard');
        return null;
    }

    interface MarketConfig {
        market_open_time: string;
        market_close_time: string;
        is_active: boolean;
        isOpen: boolean;
    }

    const [marketConfig, setMarketConfig] = useState<MarketConfig | null>(null);
    const [formData, setFormData] = useState({
        company_name: '',
        ticker_symbol: '',
        total_volume: '',
        initial_price: ''
    });
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [loading, setLoading] = useState(false);

    const [newHoliday, setNewHoliday] = useState('');
    const [holidays, setHolidays] = useState<any[]>([]);
    const [configForm, setConfigForm] = useState({
        market_open_time: '',
        market_close_time: ''
    });

    React.useEffect(() => {
        const fetchConfig = async () => {
            try {
                const [configRes, holidaysRes] = await Promise.all([
                    api.get('/market/config'),
                    api.get('/market/holidays')
                ]);
                setMarketConfig(configRes.data);
                setConfigForm({
                    market_open_time: configRes.data.market_open_time,
                    market_close_time: configRes.data.market_close_time
                });
                setHolidays(holidaysRes.data);
            } catch (error: any) {
                console.error('Error fetching market config:', error);
                setMessage({ type: 'error', text: 'Failed to load market data: ' + (error.response?.data?.message || error.message) });
            }
        };
        if (user?.role === 'admin') {
            fetchConfig();
        }
    }, [user]);

    const handleConfigUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        try {
            await api.put('/market/config', configForm);
            setMessage({ type: 'success', text: 'Market hours updated successfully!' });
            // Refresh config
            const response = await api.get('/market/config');
            setMarketConfig(response.data);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update market hours' });
        }
    };

    const handleDeleteHoliday = async (id: number) => {
        try {
            await api.delete(`/market/holidays/${id}`);
            setMessage({ type: 'success', text: 'Holiday deleted successfully' });
            setHolidays(prev => prev.filter(h => h.schedule_id !== id));
        } catch (error: any) {
            console.error('Error deleting holiday:', error);
            setMessage({ type: 'error', text: 'Failed to delete holiday: ' + (error.response?.data?.message || error.message) });
        }
    };

    const handleAddHoliday = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        try {
            await api.post('/market/holidays', { date: newHoliday });
            setMessage({ type: 'success', text: 'Holiday added successfully!' });
            setNewHoliday('');
            // Refresh holidays
            const response = await api.get('/market/holidays');
            setHolidays(response.data);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to add holiday' });
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            await api.post('/market/stocks', {
                ...formData,
                total_volume: parseInt(formData.total_volume),
                initial_price: parseFloat(formData.initial_price)
            });
            setMessage({ type: 'success', text: 'Stock created successfully!' });
            setFormData({ company_name: '', ticker_symbol: '', total_volume: '', initial_price: '' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to create stock' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <h1 className="text-2xl font-bold mb-6 text-gray-900">Admin Dashboard</h1>

            {message && (
                <div className={`p-4 rounded-md mb-6 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message.text}
                </div>
            )}

            {marketConfig && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Market Settings Card */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Market Configuration</h2>
                        <div className="mb-4">
                            <div className="flex items-center space-x-2 mb-4">
                                <span className={`text-sm font-semibold px-2 py-1 rounded ${marketConfig.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {marketConfig.is_active ? 'Config Active' : 'Config Inactive'}
                                </span>
                                <span className={`text-sm font-semibold px-2 py-1 rounded ${marketConfig.isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {marketConfig.isOpen ? 'Market Open' : 'Market Closed'}
                                </span>
                            </div>

                            <form onSubmit={handleConfigUpdate} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Open Time</label>
                                        <input
                                            type="time"
                                            value={configForm.market_open_time}
                                            onChange={(e) => setConfigForm({ ...configForm, market_open_time: e.target.value })}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-gray-900 placeholder-gray-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Close Time</label>
                                        <input
                                            type="time"
                                            value={configForm.market_close_time}
                                            onChange={(e) => setConfigForm({ ...configForm, market_close_time: e.target.value })}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-gray-900 placeholder-gray-600"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 text-sm font-medium"
                                >
                                    Update Hours
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Holidays Card */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Holidays</h2>
                        <form onSubmit={handleAddHoliday} className="flex gap-2 mb-4">
                            <input
                                type="date"
                                value={newHoliday}
                                onChange={(e) => setNewHoliday(e.target.value)}
                                className="flex-1 border border-gray-300 rounded-md shadow-sm p-2 text-gray-900 placeholder-gray-600"
                                required
                            />
                            <button
                                type="submit"
                                className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 text-sm font-medium"
                            >
                                Add
                            </button>
                        </form>

                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Upcoming</h3>
                                <div className="max-h-32 overflow-y-auto bg-gray-50 rounded-md p-2">
                                    {holidays.filter(h => new Date(h.market_date) >= new Date(new Date().setHours(0, 0, 0, 0)))
                                        .length === 0 ? (
                                        <p className="text-gray-400 text-xs text-center">No upcoming holidays</p>
                                    ) : (
                                        <ul className="divide-y divide-gray-200">
                                            {holidays
                                                .filter(h => new Date(h.market_date) >= new Date(new Date().setHours(0, 0, 0, 0)))
                                                .sort((a, b) => new Date(a.market_date).getTime() - new Date(b.market_date).getTime())
                                                .map((holiday: any) => (
                                                    <li key={holiday.schedule_id} className="py-1 text-sm text-gray-700 flex justify-between items-center">
                                                        <span>{new Date(holiday.market_date).toLocaleDateString(undefined, { timeZone: 'UTC' })}</span>
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-xs text-gray-400 bg-white px-1 rounded border">Future</span>
                                                            <button
                                                                onClick={() => handleDeleteHoliday(holiday.schedule_id)}
                                                                className="text-red-500 hover:text-red-700 text-xs font-semibold px-2"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </li>
                                                ))}
                                        </ul>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Past</h3>
                                <div className="max-h-32 overflow-y-auto bg-gray-50 rounded-md p-2">
                                    {holidays.filter(h => new Date(h.market_date) < new Date(new Date().setHours(0, 0, 0, 0))).length === 0 ? (
                                        <p className="text-gray-400 text-xs text-center">No past holidays</p>
                                    ) : (
                                        <ul className="divide-y divide-gray-200">
                                            {holidays
                                                .filter(h => new Date(h.market_date) < new Date(new Date().setHours(0, 0, 0, 0)))
                                                .sort((a, b) => new Date(b.market_date).getTime() - new Date(a.market_date).getTime())
                                                .map((holiday: any) => (
                                                    <li key={holiday.schedule_id} className="py-1 text-sm text-gray-500 flex justify-between items-center">
                                                        <span>{new Date(holiday.market_date).toLocaleDateString(undefined, { timeZone: 'UTC' })}</span>
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-xs text-gray-400">Done</span>
                                                            <button
                                                                onClick={() => handleDeleteHoliday(holiday.schedule_id)}
                                                                className="text-gray-400 hover:text-red-700 text-xs font-semibold px-2"
                                                            >
                                                                X
                                                            </button>
                                                        </div>
                                                    </li>
                                                ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl">
                <h2 className="text-lg font-medium text-gray-900 mb-6">Create New Stock</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {message && (
                        <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                        <div className="sm:col-span-4">
                            <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">
                                Company Name
                            </label>
                            <div className="mt-1">
                                <input
                                    type="text"
                                    name="company_name"
                                    id="company_name"
                                    required
                                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md border p-2 text-gray-900 placeholder-gray-600"
                                    value={formData.company_name}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="sm:col-span-2">
                            <label htmlFor="ticker_symbol" className="block text-sm font-medium text-gray-700">
                                Ticker Symbol
                            </label>
                            <div className="mt-1">
                                <input
                                    type="text"
                                    name="ticker_symbol"
                                    id="ticker_symbol"
                                    required
                                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md border p-2 uppercase text-gray-900 placeholder-gray-600"
                                    value={formData.ticker_symbol}
                                    onChange={(e) => setFormData({ ...formData, ticker_symbol: e.target.value.toUpperCase() })}
                                />
                            </div>
                        </div>

                        <div className="sm:col-span-3">
                            <label htmlFor="total_volume" className="block text-sm font-medium text-gray-700">
                                Total Volume
                            </label>
                            <div className="mt-1">
                                <input
                                    type="number"
                                    name="total_volume"
                                    id="total_volume"
                                    required
                                    min="1"
                                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md border p-2 text-gray-900 placeholder-gray-600"
                                    value={formData.total_volume}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="sm:col-span-3">
                            <label htmlFor="initial_price" className="block text-sm font-medium text-gray-700">
                                Initial Price ($)
                            </label>
                            <div className="mt-1">
                                <input
                                    type="number"
                                    name="initial_price"
                                    id="initial_price"
                                    required
                                    min="0.01"
                                    step="0.01"
                                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md border p-2 text-gray-900 placeholder-gray-600"
                                    value={formData.initial_price}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-5">
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                            >
                                {loading ? 'Creating...' : 'Create Stock'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
