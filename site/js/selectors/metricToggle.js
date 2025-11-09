selectors.push(class MetricToggle {
    constructor() {
        this.containerId = "metricToggle";
        this.container = d3.select(`#${this.containerId}`);
        this.initialize();
    }

    initialize() {
        const wrapper = this.container.append('div')
            .style('display', 'flex')
            .style('gap', '10px')
            .style('align-items', 'center');

        wrapper.append('span')
            .text('Afficher: ')
            .style('font-weight', '500');

        const buttonGroup = wrapper.append('div')
            .attr('class', 'button-group')
            .style('display', 'flex')
            .style('gap', '5px');

        // Bouton CO2 total
        this.totalButton = buttonGroup.append('button')
            .attr('class', 'metric-button')
            .text('CO₂ Total')
            .on('click', () => state.setMetric('co2'));

        // Bouton CO2 par habitant
        this.perCapitaButton = buttonGroup.append('button')
            .attr('class', 'metric-button active')
            .text('CO₂ / habitant')
            .on('click', () => state.setMetric('co2_per_capita'));

        state.subscribe(this.update.bind(this));
    }

    update(state) {
        // Mettre à jour les classes active
        if (state.metric === 'co2') {
            this.totalButton.classed('active', true);
            this.perCapitaButton.classed('active', false);
        } else {
            this.totalButton.classed('active', false);
            this.perCapitaButton.classed('active', true);
        }
    }
});