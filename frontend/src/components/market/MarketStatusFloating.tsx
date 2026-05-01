'use client';

import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import { Clock } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function MarketStatusFloating() {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [config, setConfig] = useState<any>(null);
    const [timeString, setTimeString] = useState<string>('Loading...');
    const [nextEventLabel, setNextEventLabel] = useState<string>('');
    const { socket } = useWebSocket();

    const fetchData = async () => {
        try {
            const [statusRes, configRes] = await Promise.all([
                api.get('/market/status'),
                api.get('/market/config')
            ]);
            setIsOpen(statusRes.data.isOpen);
            setConfig(configRes.data);
        } catch (error) {
            console.error('Error fetching market data for floating status:', error);
        }
    };

    useEffect(() => {
        fetchData();
        // Poll status every minute as a fallback
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, []);

    // Listen for real-time config updates
    useEffect(() => {
        if (!socket) return;

        socket.on('market-config-update', (newConfig) => {
            console.log('Received market config update:', newConfig);
            // Immediately re-fetch to get derived status (isOpen) and fresh config
            fetchData();
        });

        return () => {
            socket.off('market-config-update');
        };
    }, [socket]);

    useEffect(() => {
        if (!config) return;

        const calculateTimeLeft = () => {
            const now = new Date();
            const openTime = new Date();
            const [openH, openM] = config.market_open_time.split(':');
            openTime.setHours(parseInt(openH), parseInt(openM), 0);

            const closeTime = new Date();
            const [closeH, closeM] = config.market_close_time.split(':');
            closeTime.setHours(parseInt(closeH), parseInt(closeM), 0);

            let targetTime: Date;
            let label = '';

            // Simple logic: 
            // If open -> target is closeTime
            // If closed -> 
            //    If before openTime -> target is openTime
            //    If after closeTime -> target is openTime tomorrow (naive)

            // Note: This naive logic doesn't handle weekends/holidays perfectly for the countdown 
            // (it might count down to a closed Saturday open time), but it's a good V1.
            // Ideally backend should provide "next_state_change_timestamp".

            if (isOpen) {
                targetTime = closeTime;
                label = 'Closes in';
            } else {
                if (now < openTime) {
                    targetTime = openTime;
                    label = 'Opens in';
                } else if (now > closeTime) {
                    targetTime = openTime;
                    targetTime.setDate(targetTime.getDate() + 1);
                    label = 'Opens in';
                } else {
                    // Between open and close but status is closed (e.g. holiday or manually closed)
                    // Count to tomorrow open
                    targetTime = openTime;
                    targetTime.setDate(targetTime.getDate() + 1);
                    label = 'Opens in';
                }
            }

            const diff = targetTime.getTime() - now.getTime();

            if (diff <= 0) {
                // Event happened, instantly force a backend re-sync instead of waiting for 60s fallback!
                fetchData();
                return '00:00:00';
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };

        setNextEventLabel(isOpen ? 'Until Close' : 'Until Open');

        const timer = setInterval(() => {
            setTimeString(calculateTimeLeft());
        }, 1000);

        // Initial call
        setTimeString(calculateTimeLeft());

        return () => clearInterval(timer);
    }, [config, isOpen]);

    const [isExpanded, setIsExpanded] = useState<boolean>(false);

    if (!config) return null;

    return (
        <div
            onClick={() => setIsExpanded(!isExpanded)}
            className={`fixed bottom-6 right-6 rounded-full shadow-lg flex items-center z-50 transition-all duration-300 cursor-pointer hover:scale-105 ${isOpen
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-200'
                } ${isExpanded ? 'px-4 py-3 rounded-lg' : 'p-3'}`}>
            <div className={`${isExpanded ? 'mr-3' : ''}`}>
                <Clock size={24} />
            </div>

            {isExpanded && (
                <div className="whitespace-nowrap overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200">
                    <div className="font-bold text-sm uppercase tracking-wider flex items-center gap-1">
                        {isOpen ? 'Market Open' : 'Market Closed'}
                        <span className="text-[10px] opacity-70 ml-1">
                            ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                        </span>
                    </div>
                    <div className="text-xs font-mono opacity-90 mt-0.5">
                        {nextEventLabel}: <span className="font-semibold text-lg">{timeString}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
