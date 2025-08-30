'use strict';

/**
 * Date utilities for Lithuanian timezone and formatting
 */
class DateUtils {
    /**
     * Get current date in Lithuanian timezone
     */
    static now() {
        return new Date().toLocaleString('en-US', { timeZone: 'Europe/Vilnius' });
    }

    /**
     * Format date for Lithuanian users
     */
    static formatLithuanian(date) {
        if (!date) return null;
        
        const dateObj = new Date(date);
        
        return dateObj.toLocaleString('lt-LT', {
            timeZone: 'Europe/Vilnius',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    /**
     * Format date for API responses (ISO with Lithuanian timezone)
     */
    static formatForAPI(date) {
        if (!date) return null;
        
        const dateObj = new Date(date);
        
        // Convert to Lithuanian timezone and return ISO string
        return new Date(dateObj.toLocaleString('en-US', { timeZone: 'Europe/Vilnius' })).toISOString();
    }

    /**
     * Get Lithuanian timezone offset
     */
    static getLithuanianOffset() {
        const now = new Date();
        const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
        const lithuanian = new Date(utc.toLocaleString('en-US', { timeZone: 'Europe/Vilnius' }));
        
        return (lithuanian.getTime() - utc.getTime()) / (1000 * 60 * 60); // Hours
    }

    /**
     * Convert UTC date to Lithuanian time
     */
    static toLithuanianTime(utcDate) {
        if (!utcDate) return null;
        
        const date = new Date(utcDate);
        return new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Vilnius' }));
    }

    /**
     * Get relative time in Lithuanian (e.g., "prieš 5 minutes")
     */
    static getRelativeTime(date) {
        if (!date) return null;
        
        const now = new Date();
        const targetDate = new Date(date);
        const diffMs = now - targetDate;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMinutes < 1) {
            return 'ką tik';
        } else if (diffMinutes < 60) {
            return `prieš ${diffMinutes} min.`;
        } else if (diffHours < 24) {
            return `prieš ${diffHours} val.`;
        } else if (diffDays < 30) {
            return `prieš ${diffDays} d.`;
        } else {
            return targetDate.toLocaleDateString('lt-LT', { timeZone: 'Europe/Vilnius' });
        }
    }

    /**
     * Check if date is today in Lithuanian timezone
     */
    static isToday(date) {
        if (!date) return false;
        
        const today = new Date();
        const targetDate = new Date(date);
        
        const todayLT = today.toLocaleDateString('en-CA', { timeZone: 'Europe/Vilnius' });
        const targetLT = targetDate.toLocaleDateString('en-CA', { timeZone: 'Europe/Vilnius' });
        
        return todayLT === targetLT;
    }

    /**
     * Get start of day in Lithuanian timezone
     */
    static getStartOfDay(date = new Date()) {
        const dateStr = new Date(date).toLocaleDateString('en-CA', { timeZone: 'Europe/Vilnius' });
        return new Date(`${dateStr}T00:00:00`);
    }

    /**
     * Get end of day in Lithuanian timezone
     */
    static getEndOfDay(date = new Date()) {
        const dateStr = new Date(date).toLocaleDateString('en-CA', { timeZone: 'Europe/Vilnius' });
        return new Date(`${dateStr}T23:59:59.999`);
    }
}

module.exports = DateUtils;