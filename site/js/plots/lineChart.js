graphs.push(class LineChart {
    constructor() {
        this.containerId = "lineChart";
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

        // Ligne verticale pour l'année courante
        this.currentYearLine = this.chartGroup.append('line')
            .attr('class', 'current-year-line')
            .attr('stroke', '#333')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5')
            .attr('y1', 0)
            .attr('y2', innerHeight);

        state.subscribe(this.update.bind(this));
    }

    update(state) {
        const selectedData = state.getSelectedCountriesData();
        
        if (selectedData.length === 0) return;

        const innerWidth = this.width - this.margin.left - this.margin.right;
        const innerHeight = this.height - this.margin.top - this.margin.bottom;

        // Échelles
        const xScale = d3.scaleLinear()
            .domain([2000, 2023])
            .range([0, innerWidth]);

        const allValues = selectedData.flatMap(c => 
            c.data.map(d => d[state.metric] || 0)
        );
        const yScale = d3.scaleLinear()
            .domain([0, d3.max(allValues)])
            .range([innerHeight, 0])
            .nice();

        const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

        // Mise à jour axes
        this.xAxis.transition().duration(500)
            .call(d3.axisBottom(xScale).tickFormat(d3.format('d')));

        this.yAxis.transition().duration(500)
            .call(d3.axisLeft(yScale));

        // Ligne année courante
        this.currentYearLine
            .transition()
            .duration(500)
            .attr('x1', xScale(state.currentYear))
            .attr('x2', xScale(state.currentYear))
            .attr('y2', innerHeight);

        // Line generator
        const line = d3.line()
            .x(d => xScale(d.year))
            .y(d => yScale(d[state.metric] || 0))
            .curve(d3.curveMonotoneX);

        // Bind data
        const lines = this.chartGroup.selectAll('.country-line')
            .data(selectedData, d => d.country);

        // Enter
        const enterLines = lines.enter()
            .append('g')
            .attr('class', 'country-line');

        enterLines.append('path')
            .attr('class', 'line')
            .attr('fill', 'none')
            .attr('stroke-width', 2)
            .attr('stroke', (d, i) => colorScale(i));

        // Update
        lines.select('.line')
            .transition()
            .duration(500)
            .attr('d', d => line(d.data))
            .attr('stroke', (d, i) => colorScale(i));

        // Exit
        lines.exit().remove();

        // Points pour l'année courante
        const points = this.chartGroup.selectAll('.current-point')
            .data(selectedData, d => d.country);

        const enterPoints = points.enter()
            .append('circle')
            .attr('class', 'current-point')
            .attr('r', 5)
            .attr('fill', (d, i) => colorScale(i))
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);

        points.merge(enterPoints)
            .transition()
            .duration(500)
            .attr('cx', d => {
                const yearData = d.data.find(pt => pt.year === state.currentYear);
                return yearData ? xScale(yearData.year) : 0;
            })
            .attr('cy', d => {
                const yearData = d.data.find(pt => pt.year === state.currentYear);
                return yearData ? yScale(yearData[state.metric] || 0) : 0;
            });

        points.exit().remove();

        // Légende
        const legend = this.svg.selectAll('.legend-item')
            .data(selectedData, d => d.country);

        const legendEnter = legend.enter()
            .append('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => 
                `translate(${this.width - 130}, ${this.margin.top + i * 25})`);

        legendEnter.append('line')
            .attr('x1', 0)
            .attr('x2', 20)
            .attr('y1', 0)
            .attr('y2', 0)
            .attr('stroke', (d, i) => colorScale(i))
            .attr('stroke-width', 2);

        legendEnter.append('text')
            .attr('x', 25)
            .attr('y', 5)
            .style('font-size', '12px')
            .text(d => d.country);

        legend.exit().remove();

        // Tooltip sur les lignes
        tooltip(this.chartGroup.selectAll('.country-line'), d => {
            const yearData = d.data.find(pt => pt.year === state.currentYear);
            if (!yearData) return '';
            
            const value = yearData[state.metric];
            const label = state.metric === 'co2_per_capita' ? 
                'CO₂/hab' : 'CO₂ total';
            const unit = state.metric === 'co2_per_capita' ? 't' : 'Mt';
            
            return `
                <strong>${d.country}</strong><br/>
                ${label}: ${value ? value.toFixed(2) : 'N/A'} ${unit}
            `;
        });
    }
});