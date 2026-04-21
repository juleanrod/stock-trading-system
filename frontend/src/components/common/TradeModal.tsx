'use client';

import React, { useState, useEffect } from 'react';
import api from '@/services/api';

interface TradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'buy' | 'sell';
    ticker: string;
    currentPrice: number;
    onSuccess: () => void;
}

export default function TradeModal({ isOpen, onClose, type, ticker, currentPrice, onSuccess }: TradeModalProps) {
    const [shares, setShares] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setShares('');
            setError('');
            setLoading(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!shares || parseInt(shares) <= 0) return;

        setLoading(true);
        setError('');

        try {
            await api.post(`/market/${type}`, {
                ticker,
                shares: parseInt(shares)
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Transaction failed');
        } finally {
            setLoading(false);
        }
    };

    const total = shares ? (parseInt(shares) * currentPrice) : 0;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="flex justify-between items-center p-6 border-b">
                    <h3 className="text-lg font-medium text-gray-900 capitalize">
                        {type} {ticker}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 focus:outline-none"
                    >
                        <span className="sr-only">Close</span>
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6">
                    <div className="mb-4">
                        <p className="text-sm text-gray-500">Current Price</p>
                        <p className="text-xl font-bold text-gray-900">${currentPrice.toFixed(2)}</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label htmlFor="shares" className="block text-sm font-medium text-gray-700">
                                Number of Shares
                            </label>
                            <input
                                type="number"
                                id="shares"
                                min="1"
                                step="1"
                                required
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                                value={shares}
                                onChange={(e) => setShares(e.target.value)}
                            />
                        </div>

                        <div className="mb-6 p-4 bg-gray-50 rounded-md">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium text-gray-500">Total estimated {type === 'buy' ? 'cost' : 'proceeds'}:</span>
                                <span className="font-bold text-gray-900">${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>

                        {error && (
                            <div className="mb-4 text-center text-sm text-red-600">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${type === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50`}
                            >
                                {loading ? 'Processing...' : `Confirm ${type === 'buy' ? 'Buy' : 'Sell'}`}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
