graphs.push(class GapminderScatter {
    constructor() {
        this.containerId = "gapminderScatter";
        this.svg = null;
        this.width = 700;
        this.height = 500;
        this.margin = { top: 40, right: 40, bottom: 60, left: 80 };
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
            .text("PIB (milliards $)");

        this.svg.append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(-90)")
            .attr("x", -this.height / 2)
            .attr("y", 20)
            .attr("text-anchor", "middle")
            .text("CO₂ par habitant (tonnes)");

        // Année affichée en grand
        this.yearLabel = this.svg.append("text")
            .attr("class", "year-label")
            .attr("x", this.width - 120)
            .attr("y", 80)
            .attr("text-anchor", "end")
            .style("font-size", "64px")
            .style("font-weight", "bold")
            .style("fill", "#ddd")
            .style("opacity", 0.5);

        state.subscribe(this.update.bind(this));
    }

    update(state) {
        const yearData = state.getCurrentYearData()
            .filter(d => d.gdp > 0 && d.co2_per_capita > 0 && d.population > 0);

        const innerWidth = this.width - this.margin.left - this.margin.right;
        const innerHeight = this.height - this.margin.top - this.margin.bottom;

        // Échelles
        const xScale = d3.scaleLog()
            .domain([d3.min(yearData, d => d.gdp), d3.max(yearData, d => d.gdp)])
            .range([0, innerWidth])
            .nice();

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(yearData, d => d.co2_per_capita)])
            .range([innerHeight, 0])
            .nice();

        const maxPop = d3.max(yearData, d => d.population);
        const sizeScale = d3.scaleSqrt()
            .domain([0, maxPop])
            .range([2, 40]);

        // Échelle de couleur par région (à adapter selon tes données)
        const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

        // Mise à jour axes
        this.xAxis.transition().duration(500)
            .call(d3.axisBottom(xScale)
                .ticks(5)
                .tickFormat(d => d >= 1e12 ? (d/1e12).toFixed(0) + 'T' :
                             d >= 1e9 ? (d/1e9).toFixed(0) + 'B' : 
                             d >= 1e6 ? (d/1e6).toFixed(0) + 'M' : d));

        this.yAxis.transition().duration(500)
            .call(d3.axisLeft(yScale));

        // Mise à jour année
        this.yearLabel.text(state.currentYear);

        // Bulles
        const circles = this.chartGroup.selectAll('.bubble')
            .data(yearData, d => d.country_code);

        // Enter
        const enterCircles = circles.enter()
            .append('circle')
            .attr('class', 'bubble')
            .attr('cx', d => xScale(d.gdp))
            .attr('cy', d => yScale(d.co2_per_capita))
            .attr('r', 0)
            .attr('fill', (d, i) => colorScale(i % 10))
            .attr('opacity', 0.7)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5);

        // Update
        circles.merge(enterCircles)
            .transition()
            .duration(500)
            .attr('cx', d => xScale(d.gdp))
            .attr('cy', d => yScale(d.co2_per_capita))
            .attr('r', d => sizeScale(d.population));

        // Exit
        circles.exit()
            .transition()
            .duration(300)
            .attr('r', 0)
            .remove();

        // Interactions
        this.chartGroup.selectAll('.bubble')
            .on('mouseover', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', sizeScale(d.population) * 1.3)
                    .attr('stroke-width', 3);
            })
            .on('mouseout', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', sizeScale(d.population))
                    .attr('stroke-width', 1.5);
            })
            .on('click', (event, d) => {
                const countryName = COUNTRIES[d.country_code];
                state.toggleCountry(countryName);
            });

        // Tooltip
        tooltip(this.chartGroup.selectAll('.bubble'), d => {
            const country = COUNTRIES[d.country_code];
            return `
                <strong>${country}</strong><br/>
                PIB: ${(d.gdp / 1e9).toFixed(0)} Mrd $<br/>
                CO₂/hab: ${d.co2_per_capita.toFixed(2)} t<br/>
                Population: ${(d.population / 1e6).toFixed(1)} M
            `;
        });
    }
});