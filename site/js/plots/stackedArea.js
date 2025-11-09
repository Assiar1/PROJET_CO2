graphs.push(class StackedAreaChart {
    constructor() {
        this.containerId = "stackedArea";
        this.svg = null;
        this.width = 700;
        this.height = 400;
        this.margin = { top: 40, right: 150, bottom: 60, left: 60 };
    }

    async initialize() {
        this.svg = d3.select(`#${this.containerId}`)
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${this.width} ${this.height}`);

        this.chartGroup = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        const innerWidth = this.width - this.margin.left - this.margin.right;
        const innerHeight = this.height - this.margin.top - this.margin.bottom;

        // Axes
        this.xAxis = this.chartGroup.append('g')
            .attr('transform', `translate(0,${innerHeight})`);

        this.yAxis = this.chartGroup.append('g');

        // Labels
        this.svg.append("text")
            .attr("class", "axis-label")
            .attr("x", this.width / 2)
            .attr("y", this.height - 10)
            .attr("text-anchor", "middle")
            .text("Année");

        this.svg.append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(-90)")
            .attr("x", -this.height / 2)
            .attr("y", 20)
            .attr("text-anchor", "middle")
            .text("Émissions CO₂ (Mt)");

        // Légende
        this.createLegend();

        state.subscribe(this.update.bind(this));
    }

    createLegend() {
        const categories = [
            { key: 'coal_co2', label: 'Charbon', color: '#8B4513' },
            { key: 'oil_co2', label: 'Pétrole', color: '#2F4F4F' },
            { key: 'gas_co2', label: 'Gaz', color: '#4169E1' },
            { key: 'cement_co2', label: 'Ciment', color: '#808080' }
        ];

        const legend = this.svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${this.width - 130}, ${this.margin.top})`);

        categories.forEach((cat, i) => {
            const legendRow = legend.append('g')
                .attr('transform', `translate(0, ${i * 25})`);

            legendRow.append('rect')
                .attr('width', 18)
                .attr('height', 18)
                .attr('fill', cat.color);

            legendRow.append('text')
                .attr('x', 25)
                .attr('y', 14)
                .style('font-size', '14px')
                .text(cat.label);
        });

        this.categories = categories;
    }

    update(state) {
        // Récupérer données des pays sélectionnés
        const selectedData = state.getSelectedCountriesData();
        
        if (selectedData.length === 0) return;

        // Pour simplifier, on prend le premier pays sélectionné
        const countryData = selectedData[0].data
            .filter(d => d.year >= 2000 && d.year <= 2023)
            .sort((a, b) => a.year - b.year);

        const innerWidth = this.width - this.margin.left - this.margin.right;
        const innerHeight = this.height - this.margin.top - this.margin.bottom;

        // Préparer les données pour le stack
        const keys = ['coal_co2', 'oil_co2', 'gas_co2', 'cement_co2'];
        const stackData = d3.stack()
            .keys(keys)
            .value((d, key) => d[key] || 0)
            (countryData);

        // Échelles
        const xScale = d3.scaleLinear()
            .domain([2000, 2023])
            .range([0, innerWidth]);

        const yMax = d3.max(stackData[stackData.length - 1], d => d[1]);
        const yScale = d3.scaleLinear()
            .domain([0, yMax])
            .range([innerHeight, 0])
            .nice();

        // Mise à jour axes
        this.xAxis.transition().duration(500)
            .call(d3.axisBottom(xScale).tickFormat(d3.format('d')));

        this.yAxis.transition().duration(500)
            .call(d3.axisLeft(yScale));

        // Area generator
        const area = d3.area()
            .x(d => xScale(d.data.year))
            .y0(d => yScale(d[0]))
            .y1(d => yScale(d[1]))
            .curve(d3.curveMonotoneX);

        // Bind data
        const layers = this.chartGroup.selectAll('.layer')
            .data(stackData, d => d.key);

        // Enter
        const enterLayers = layers.enter()
            .append('path')
            .attr('class', 'layer')
            .attr('fill', d => {
                const cat = this.categories.find(c => c.key === d.key);
                return cat ? cat.color : '#ccc';
            })
            .attr('opacity', 0.8);

        // Update
        layers.merge(enterLayers)
            .transition()
            .duration(500)
            .attr('d', area);

        // Exit
        layers.exit().remove();

        // Interactions
        this.chartGroup.selectAll('.layer')
            .on('mouseover', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('opacity', 1);
            })
            .on('mouseout', function() {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('opacity', 0.8);
            });

        // Tooltip
        tooltip(this.chartGroup.selectAll('.layer'), d => {
            const cat = this.categories.find(c => c.key === d.key);
            const total = d3.sum(d, point => point[1] - point[0]);
            return `
                <strong>${cat.label}</strong><br/>
                Total: ${total.toFixed(2)} Mt CO₂
            `;
        });
    }
});