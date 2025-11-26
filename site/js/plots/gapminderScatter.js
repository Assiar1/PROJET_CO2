graphs.push(class GapminderScatter {
    constructor() {
        this.state = state;
        this.containerId = "gapminderScatter";

        this.svg = null;
        this.width = 700;
        this.height = 500;
        this.margin = { top: 40, right: 40, bottom: 60, left: 80 };

        this.transition_ms = 50;

        // will be set in initialize()
        this.chartGroup = null;
        this.xAxisGroup = null;
        this.yAxisGroup = null;
        this.yearLabel = null;
        this.tooltip = null;
        this.strokeScale = null;
        this.innerWidth = null;
        this.innerHeight = null;
    }

    async initialize() {
        const container = d3.select(`#${this.containerId}`);

        this.svg = container.append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${this.width} ${this.height}`);

        this.tooltip = d3.select("body")
            .append("div")
            .style("position", "absolute")
            .style("background", "white")
            .style("border", "1px solid #ccc")
            .style("padding", "6px 10px")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("opacity", 0);

        this.chartGroup = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        this.innerWidth = this.width - this.margin.left - this.margin.right;
        this.innerHeight = this.height - this.margin.top - this.margin.bottom;

        this.xAxisGroup = this.chartGroup.append('g')
            .attr('transform', `translate(0,${this.innerHeight})`);

        this.yAxisGroup = this.chartGroup.append('g');

        // Axis labels
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
            .text("CO₂ (Megatonnes)");

        this.yearLabel = this.svg.append("text")
            .attr("class", "year-label")
            .attr("x", this.width - 120)
            .attr("y", 80)
            .attr("text-anchor", "end")
            .style("font-size", "64px")
            .style("font-weight", "bold")
            .style("fill", "#ddd")
            .style("opacity", 0.5);

        this.strokeScale = d3.scaleLinear()
            .domain([0, d3.max(DATA, d => d.co2_per_capita)])
            .range([1, 40]);

        // bind update and subscribe
        this.update = this.update.bind(this);
        this.state.subscribe(this.update);
        this.state.notify();
    }

    update(state) {
        const yearData = state.getCurrentYearData()
            .filter(d => d.gdp > 0 && d.co2 > 0 && d.population > 0);

        const xScale = d3.scaleLog()
            .domain([d3.min(yearData, d => d.gdp), d3.max(yearData, d => d.gdp)])
            .range([0, this.innerWidth])
            .nice();

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(yearData, d => d.co2)])
            .range([this.innerHeight, 0])
            .nice();

        const maxPop = d3.max(yearData, d => d.population);
        const sizeScale = d3.scaleSqrt()
            .domain([0, maxPop])
            .range([2, 40]);

        const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

        // ---- AXES ----
        this.xAxisGroup.transition().duration(this.transition_ms)
            .call(d3.axisBottom(xScale)
                .ticks(5)
                .tickFormat(d =>
                    d >= 1e12 ? (d / 1e12).toFixed(0) + 'T' :
                    d >= 1e9 ? (d / 1e9).toFixed(0) + 'B' :
                    d >= 1e6 ? (d / 1e6).toFixed(0) + 'M' :
                    d
                )
            );

        this.yAxisGroup.transition().duration(this.transition_ms)
            .call(d3.axisLeft(yScale));

        this.yearLabel.text(state.currentYear);

        // ----------------------------
        // DATA JOIN — Each country = <g> with <circle> + <text>
        // ----------------------------
        const groups = this.chartGroup.selectAll('.bubble-group')
            .data(yearData, d => d.country_code);

        const groupsEnter = groups.enter()
            .append('g')
            .attr('class', 'bubble-group')
            .attr('transform', d => `translate(${xScale(d.gdp)}, ${yScale(d.co2)})`);

        // circle
        groupsEnter.append('circle')
            .attr('class', 'bubble')
            .attr('r', 0)
            .attr('fill', (d, i) => colorScale(i % 10))
            .attr('stroke', '#000')
            .attr('stroke-width', d => this.strokeScale(d.co2_per_capita))
            .attr('opacity', 0.7);

        // text node used by the original logic
        groupsEnter.append('text')
            .attr('class', 'label')
            .attr('x', 0)
            .attr('y', -6)
            .attr('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('opacity', 0.3);

        // ----------------------------
        // UPDATE + MERGE
        // ----------------------------
        const merged = groups.merge(groupsEnter);

        merged.select("circle")
            .transition()
            .duration(this.transition_ms)
            .attr('r', d => sizeScale(d.population))
            .attr('stroke-width', d => this.strokeScale(d.co2_per_capita));

        merged.transition()
            .duration(this.transition_ms)
            .attr('transform', d => `translate(${xScale(d.gdp)}, ${yScale(d.co2)})`)
            .on("start", function(d) {
                const g = d3.select(this);
                g.select("circle")
                    .attr('r', sizeScale(d.population));
                g.select("text")
                    .text(COUNTRIES[d.country_code]);
            });

        // EXIT
        groups.exit()
            .style("opacity", 0)
            .remove();

        // ----------------------------
        // INTERACTIONS + TOOLTIP
        // ----------------------------
        // capture for closures
        const tooltip = this.tooltip;
        const strokeScale = this.strokeScale;

        this.chartGroup.selectAll('circle.bubble')
            .on('mouseover', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', sizeScale(d.population) * 1.3)
                    .attr('stroke-width', 3);

                tooltip
                    .style("opacity", 1)
                    .html(
                        `<strong>${COUNTRIES[d.country_code]}</strong><br>
                        PIB: ${d3.format(",")(d.gdp)}<br>
                        CO₂: ${d3.format(",")(d.co2)}<br>
                        CO₂/P: ${d3.format(",")(d.co2_per_capita)}<br>`
                    );
            })
            .on('mousemove', function(event) {
                tooltip
                    .style("left", (event.pageX + 12) + "px")
                    .style("top",  (event.pageY + 12) + "px");
            })
            .on('mouseout', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', sizeScale(d.population))
                    .attr('stroke-width', 1.5);

                tooltip
                    .style("opacity", 0);

                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', sizeScale(d.population))
                    .attr('stroke-width', strokeScale(d.co2_per_capita));
            })
            .on('click', (event, d) => {
                const countryName = COUNTRIES[d.country_code];
                state.toggleCountry(countryName);
            });
    }
});