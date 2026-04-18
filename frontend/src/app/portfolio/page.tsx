'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/services/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import TradeModal from '@/components/common/TradeModal';

interface Holding {
    stock_id: number;
    ticker_symbol: string;
    company_name: string;
    shares_owned: number;
    average_purchase_price: string;
    current_price: number;
    total_value: string;
    profit_loss: string;
    profit_loss_percent: string;
}

export default function PortfolioPage() {
    const [portfolio, setPortfolio] = useState<Holding[]>([]);
    const { socket } = useWebSocket();

    const fetchPortfolio = async () => {
        try {
            const response = await api.get('/portfolio');
            setPortfolio(response.data);
        } catch (error) {
            console.error('Error fetching portfolio:', error);
        }
    };

    useEffect(() => {
        fetchPortfolio();
    }, []);

    useEffect(() => {
        if (!socket) return;

        socket.on('price-update', (data) => {
            setPortfolio((prevPortfolio) =>
                prevPortfolio.map((holding) => {
                    if (holding.ticker_symbol === data.ticker) {
                        const currentPrice = data.price;
                        const totalValue = holding.shares_owned * currentPrice;
                        const totalCost = holding.shares_owned * parseFloat(holding.average_purchase_price);
                        const profitLoss = totalValue - totalCost;
                        const profitLossPercent = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;

                        return {
                            ...holding,
                            current_price: currentPrice,
                            total_value: totalValue.toFixed(2),
                            profit_loss: profitLoss.toFixed(2),
                            profit_loss_percent: profitLossPercent.toFixed(2)
                        };
                    }
                    return holding;
                })
            );
        });

        return () => {
            socket.off('price-update');
        };
    }, [socket]);

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);

    const handleSell = (holding: Holding) => {
        setSelectedHolding(holding);
        setModalOpen(true);
    };

    return (
        <DashboardLayout>
            <h1 className="text-2xl font-bold mb-6">Your Portfolio</h1>
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Shares</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Price</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Current Price</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">P/L</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {portfolio.map((holding) => {
                            const profit = parseFloat(holding.profit_loss);
                            return (
                                <tr key={holding.stock_id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{holding.ticker_symbol}</div>
                                        <div className="text-sm text-gray-500">{holding.company_name}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                                        {holding.shares_owned}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                                        ${parseFloat(holding.average_purchase_price).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                                        ${holding.current_price.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                                        ${holding.total_value}
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {profit >= 0 ? '+' : ''}{holding.profit_loss} ({holding.profit_loss_percent}%)
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleSell(holding)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            Sell
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {selectedHolding && (
                <TradeModal
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    type="sell"
                    ticker={selectedHolding.ticker_symbol}
                    currentPrice={selectedHolding.current_price}
                    onSuccess={() => {
                        fetchPortfolio();
                    }}
                />
            )}
        </DashboardLayout>
    );
}
