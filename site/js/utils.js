/**
 * Fonctions utilitaires
 */

const utils = {
    /**
     * Formater un nombre avec séparateurs
     */
    formatNumber(num, decimals = 0) {
        if (num === null || num === undefined || isNaN(num)) return 'N/A';
        return num.toLocaleString('fr-FR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    },
    
    /**
     * Formater en notation compacte (K, M, B)
     */
    formatCompact(num) {
        if (num === null || num === undefined || isNaN(num)) return 'N/A';
        
        if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
        return num.toFixed(0);
    }
};