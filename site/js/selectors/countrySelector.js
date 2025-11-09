selectors.push(class CountrySelector {
    constructor() {
        this.containerId = "countrySelector";
        this.container = d3.select(`#${this.containerId}`);
        this.countries = Object.values(COUNTRIES).sort();
        this.initialize();
    }

    initialize() {
        const wrapper = this.container;

        // Barre de recherche
        const searchInput = wrapper.append('input')
            .attr('type', 'text')
            .attr('placeholder', 'Rechercher un pays...')
            .style('width', '100%')
            .style('padding', '8px')
            .style('margin-bottom', '10px')
            .style('border', '1px solid #ccc')
            .style('border-radius', '4px');

        // Boutons de sélection rapide
        const buttonContainer = wrapper.append('div')
            .style('margin-bottom', '10px')
            .style('display', 'flex')
            .style('gap', '10px')
            .style('flex-wrap', 'wrap');

        buttonContainer.append('button')
            .text('Top 10')
            .classed('quick-select-btn', true)
            .on('click', () => {
                const top10 = state.getTopEmitters(state.currentYear, 10)
                    .map(d => COUNTRIES[d.country_code]);
                state.setSelectedCountries(top10);
            });

        buttonContainer.append('button')
            .text('Europe')
            .classed('quick-select-btn', true)
            .on('click', () => {
                const europe = ['France', 'Germany', 'United Kingdom', 
                                'Italy', 'Spain', 'Poland', 'Netherlands'];
                state.setSelectedCountries(europe.filter(c => this.countries.includes(c)));
            });

        buttonContainer.append('button')
            .text('G7')
            .classed('quick-select-btn', true)
            .on('click', () => {
                const g7 = ['United States', 'Japan', 'Germany', 'United Kingdom',
                           'France', 'Italy', 'Canada'];
                state.setSelectedCountries(g7.filter(c => this.countries.includes(c)));
            });

        buttonContainer.append('button')
            .text('Tout sélectionner')
            .classed('quick-select-btn', true)
            .on('click', () => {
                state.setSelectedCountries(this.countries);
            });

        buttonContainer.append('button')
            .text('Tout désélectionner')
            .classed('quick-select-btn', true)
            .on('click', () => {
                state.setSelectedCountries([]);
            });

        // Liste des pays avec checkboxes
        const checkboxContainer = wrapper.append('div')
            .style('max-height', '300px')
            .style('overflow-y', 'auto')
            .style('border', '1px solid #eee')
            .style('padding', '10px')
            .style('border-radius', '4px');

        this.checkboxes = checkboxContainer
            .selectAll('div')
            .data(this.countries)
            .join('div')
            .style('margin', '5px 0')
            .each(function(country) {
                const container = d3.select(this);
                
                const label = container.append('label')
                    .style('display', 'flex')
                    .style('align-items', 'center')
                    .style('cursor', 'pointer');

                label.append('input')
                    .attr('type', 'checkbox')
                    .attr('id', `country-${country}`)
                    .property('checked', state.selectedCountries.has(country))
                    .on('change', function() {
                        state.toggleCountry(country);
                    });

                label.append('span')
                    .style('margin-left', '8px')
                    .text(country);
            });

        // Recherche
        searchInput.on('input', function() {
            const searchTerm = this.value.toLowerCase();
            checkboxContainer.selectAll('div')
                .style('display', country => 
                    country.toLowerCase().includes(searchTerm) ? 'block' : 'none'
                );
        });

        state.subscribe(this.update.bind(this));
    }

    update(state) {
        // Mettre à jour l'état des checkboxes
        this.checkboxes.select('input')
            .property('checked', country => state.selectedCountries.has(country));
    }
});