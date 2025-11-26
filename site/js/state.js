/**
 * Gestion de l'état global - Pattern Observer avec classe
 */

class State {
    constructor() {
        // Données brutes
        this.rawData = [];
        this.dataByYear = new Map();
        this.dataByCountry = new Map();
        
        // État de l'interface
        this.currentYear = DATA_RANGES.years[1];
        this.selectedCountries = new Set();
        this.selectedCountry = null;  // Pour composition énergétique
        this.metric = 'co2_per_capita'; // ou 'co2'
        this.compareMode = false;
        
        // Observateurs
        this.subscribers = [];
    }
    
    initialize(data) {
        this.rawData = data;
        
        // Indexer par année pour accès rapide
        this.rawData.forEach(d => {
            if (!this.dataByYear.has(d.year)) {
                this.dataByYear.set(d.year, []);
            }
            this.dataByYear.get(d.year).push(d);
            
            // Indexer par pays (utiliser iso_code comme clé)
            if (!this.dataByCountry.has(d.iso_code)) {
                this.dataByCountry.set(d.iso_code, []);
            }
            this.dataByCountry.get(d.iso_code).push(d);
        });
        
        console.log('✅ State initialized:', {
            totalRecords: this.rawData.length,
            years: Array.from(this.dataByYear.keys()).sort(),
            countries: this.dataByCountry.size
        });
    }
    
    // Getters pour les données filtrées
    getCurrentYearData() {
        return this.dataByYear.get(this.currentYear) || [];
    }
    
    getFilteredData() {
        return this.getCurrentYearData();
    }
    
    getCountryData(isoCode) {
        return (this.dataByCountry.get(isoCode) || [])
            .sort((a, b) => a.year - b.year);
    }
    
    getTemporalData() {
        if (!this.selectedCountry) return [];
        return this.getCountryData(this.selectedCountry);
    }
    
    getSelectedCountriesData() {
        const result = [];
        this.selectedCountries.forEach(isoCode => {
            const data = this.getCountryData(isoCode);
            if (data.length > 0) {
                const countryName = this.getCountryName(isoCode);
                result.push({ country: countryName, data });
            }
        });
        return result;
    }
    
    getTopEmitters(year, n = 10) {
        const yearData = this.dataByYear.get(year) || [];
        return yearData
            .filter(d => d.co2 > 0)
            .sort((a, b) => b.co2 - a.co2)
            .slice(0, n);
    }
    
    // Méthodes pour les comparaisons énergétiques
    getEnergyMix(isoCode, year) {
        const data = this.getCountryData(isoCode)
            .find(d => d.year === year);
        
        if (!data) return null;
        
        return {
            coal: data.coal_co2 || 0,
            oil: data.oil_co2 || 0,
            gas: data.gas_co2 || 0,
            cement: data.cement_co2 || 0
        };
    }
    
    // Obtenir la valeur selon la métrique
    getValue(d) {
        return d[this.metric] || d.co2 || 0;
    }
    
    getMetricLabel() {
        const labels = {
            'co2': 'Émissions CO₂ (Mt)',
            'co2_per_capita': 'Émissions CO₂ par habitant (t)'
        };
        return labels[this.metric] || 'Émissions CO₂';
    }
    
    // Obtenir le nom d'un pays
    getCountryName(isoCode) {
        if (typeof ISO_TO_NAME !== 'undefined' && ISO_TO_NAME[isoCode]) {
            return ISO_TO_NAME[isoCode];
        }
        
        const data = this.rawData.find(d => d.iso_code === isoCode);
        if (data && data.country_code !== undefined) {
            return COUNTRIES[data.country_code] || isoCode;
        }
        return isoCode;
    }
    
    // Setters avec notification
    setYear(year) {
        if (this.currentYear !== year) {
            this.currentYear = year;
            this.notify();
        }
    }
    
    setMetric(metric) {
        if (this.metric !== metric) {
            this.metric = metric;
            this.notify();
        }
    }
    
    toggleCountry(isoCode) {
        if (this.selectedCountries.has(isoCode)) {
            this.selectedCountries.delete(isoCode);
        } else {
            this.selectedCountries.add(isoCode);
        }
        this.notify();
    }
    
    setSelectedCountries(countries) {
        this.selectedCountries = new Set(countries);
        this.notify();
    }
    
    selectCountryForEnergy(isoCode) {
        this.selectedCountry = isoCode;
        this.notify();
    }
    
    toggleCompareMode() {
        this.compareMode = !this.compareMode;
        this.notify();
    }
    
    // Pattern Observer
    subscribe(callback) {
        this.subscribers.push(callback);
    }
    
    notify() {
        this.subscribers.forEach(callback => {
            try {
                callback(this);
            } catch (error) {
                console.error('Erreur dans un observateur:', error);
            }
        });
    }
}

// Instance globale
const state = new State();
const graphs = [];
const selectors = [];