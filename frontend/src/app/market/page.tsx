'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/services/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import TradeModal from '@/components/common/TradeModal';

interface Stock {
    stock_id: number;
    company_name: string;
    ticker_symbol: string;
    initial_price: string;
    current_price?: number;
    change?: number;
    change_percent?: number;
}

export default function MarketPage() {
    const [stocks, setStocks] = useState<Stock[]>([]);
    const { socket } = useWebSocket();

    useEffect(() => {
        const fetchStocks = async () => {
            try {
                const response = await api.get('/market/stocks');
                setStocks(response.data);
            } catch (error) {
                console.error('Error fetching stocks:', error);
            }
        };

        fetchStocks();
    }, []);

    useEffect(() => {
        if (!socket) return;

        socket.on('price-update', (data) => {
            setStocks((prevStocks) =>
                prevStocks.map((stock) => {
                    if (stock.ticker_symbol === data.ticker) {
                        const previousPrice = stock.current_price || parseFloat(stock.initial_price);
                        const change = data.price - previousPrice;
                        const changePercent = (change / previousPrice) * 100;

                        return {
                            ...stock,
                            current_price: data.price,
                            change: change,
                            change_percent: changePercent
                        };
                    }
                    return stock;
                })
            );
        });

        return () => {
            socket.off('price-update');
        };
    }, [socket]);

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
    const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');

    const handleTrade = (stock: Stock, type: 'buy' | 'sell') => {
        setSelectedStock(stock);
        setTradeType(type);
        setModalOpen(true);
    };

    return (
        <DashboardLayout>
            <h1 className="text-2xl font-bold mb-6">Market</h1>
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                    {stocks.map((stock) => (
                        <li key={stock.stock_id}>
                            <div className="px-4 py-4 sm:px-6 flex items-center justify-between hover:bg-gray-50">
                                <div className="flex-1">
                                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                                        {stock.ticker_symbol}
                                    </h3>
                                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                                        {stock.company_name}
                                    </p>
                                </div>
                                <div className="text-right mr-6">
                                    <p className="text-lg font-bold text-gray-900">
                                        ${(stock.current_price || parseFloat(stock.initial_price)).toFixed(2)}
                                    </p>
                                    {stock.change !== undefined && (
                                        <p className={`text-sm font-medium ${stock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.change_percent?.toFixed(2)}%)
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <button
                                        onClick={() => handleTrade(stock, 'buy')}
                                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                    >
                                        Buy
                                    </button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {selectedStock && (
                <TradeModal
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    type={tradeType}
                    ticker={selectedStock.ticker_symbol}
                    currentPrice={selectedStock.current_price || parseFloat(selectedStock.initial_price)}
                    onSuccess={() => {
                        // Optional: refresh data or show success message
                    }}
                />
            )}
        </DashboardLayout>
    );
}
