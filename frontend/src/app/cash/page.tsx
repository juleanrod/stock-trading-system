'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/services/api';

export default function CashPage() {
    const [balance, setBalance] = useState<number | null>(null);
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [transactions, setTransactions] = useState<any[]>([]);

    const fetchBalance = async () => {
        try {
            const response = await api.get('/cash');
            setBalance(response.data.balance);
        } catch (error) {
            console.error('Error fetching balance:', error);
        }
    };

    const fetchTransactions = async () => {
        try {
            const response = await api.get('/cash/transactions');
            setTransactions(response.data);
        } catch (error) {
            console.error('Error fetching transactions:', error);
        }
    };

    useEffect(() => {
        fetchBalance();
        fetchTransactions();
    }, []);

    const handleTransaction = async (type: 'deposit' | 'withdraw') => {
        if (!amount || parseFloat(amount) <= 0) return;
        setLoading(true);
        setMessage(null);

        try {
            const response = await api.post(`/cash/${type}`, { amount: parseFloat(amount) });
            setBalance(response.data.newBalance);
            setMessage({ type: 'success', text: response.data.message });
            setAmount('');
            fetchTransactions(); // Refresh history
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Transaction failed' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <h1 className="text-2xl font-bold mb-6">Cash Management</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Transaction Form */}
                <div className="bg-white rounded-lg shadow-md p-6 h-fit">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Current Balance</h2>
                    <p className="text-4xl font-bold text-green-600 mb-6">
                        ${balance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-gray-500 sm:text-sm">$</span>
                                </div>
                                <input
                                    type="number"
                                    name="amount"
                                    id="amount"
                                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md py-2 border"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                            </div>
                        </div>

                        {message && (
                            <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {message.text}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => handleTransaction('deposit')}
                                disabled={loading}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                            >
                                {loading ? 'Processing...' : 'Deposit'}
                            </button>
                            <button
                                onClick={() => handleTransaction('withdraw')}
                                disabled={loading}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                            >
                                {loading ? 'Processing...' : 'Withdraw'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Transaction History */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">History</h2>
                    <div className="overflow-hidden">
                        {transactions.length === 0 ? (
                            <p className="text-gray-500 text-sm">No transaction history.</p>
                        ) : (
                            <ul className="divide-y divide-gray-200">
                                {transactions.map((t) => (
                                    <li key={t.cash_transaction_id} className="py-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 capitalize">
                                                    {t.transaction_type}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(t.transaction_timestamp).toLocaleString()}
                                                </p>
                                            </div>
                                            <div className={`text-sm font-semibold ${t.transaction_type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                                                {t.transaction_type === 'deposit' ? '+' : '-'}${parseFloat(t.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </div>
                                        </div>
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
