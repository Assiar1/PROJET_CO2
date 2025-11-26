class State {
    constructor() {
        // Données brutes
        this.rawData = [];
        this.dataByYear = new Map();
        this.dataByCountry = new Map();
        
        // État de l'interface
        this.currentYear = DATA_RANGES.years[1];
        this.selectedCountries = new Set();
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
            
            // Indexer par pays
            const countryName = COUNTRIES[d.country_code];
            if (!this.dataByCountry.has(countryName)) {
                this.dataByCountry.set(countryName, []);
            }
            this.dataByCountry.get(countryName).push(d);
        });
        
        // Sélectionner top 10 émetteurs par défaut
        const top10 = this.getTopEmitters(2023, 10);
        this.selectedCountries = new Set(top10.map(d => COUNTRIES[d.country_code]));
        
        console.log('State initialized:', {
            totalRecords: this.rawData.length,
            years: Array.from(this.dataByYear.keys()).sort(),
            countries: Array.from(this.dataByCountry.keys()).length
        });
    }

    // Getters pour les données filtrées
    getCurrentYearData() {
        return this.dataByYear.get(this.currentYear) || [];
    }

    getCountryData(countryName) {
        return (this.dataByCountry.get(countryName) || [])
            .sort((a, b) => a.year - b.year);
    }

    getSelectedCountriesData() {
        const result = [];
        this.selectedCountries.forEach(country => {
            const data = this.getCountryData(country);
            if (data.length > 0) {
                result.push({ country, data });
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
    getEnergyMix(countryName, year) {
        const data = this.getCountryData(countryName)
            .find(d => d.year === year);
        
        if (!data) return null;
        
        return {
            coal: data.coal_co2 || 0,
            oil: data.oil_co2 || 0,
            gas: data.gas_co2 || 0,
            cement: data.cement_co2 || 0
        };
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

    toggleCountry(countryName) {
        if (this.selectedCountries.has(countryName)) {
            this.selectedCountries.delete(countryName);
        } else {
            this.selectedCountries.add(countryName);
        }
        this.notify();
    }

    setSelectedCountries(countries) {
        this.selectedCountries = new Set(countries);
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
        this.subscribers.forEach(callback => callback(this));
    }
}

// Instance globale
const state = new State();
const graphs = [];
const selectors = [];