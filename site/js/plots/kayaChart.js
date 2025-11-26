graphs.push(class KayaGraph {
    constructor() {
        this.state = state;
        this.containerId = "kayaChart";

        this.svg = null;
        this.width = 700;
        this.height = 500;
        this.margin = { top: 40, right: 40, bottom: 60, left: 80 };

        this.innerWidth = null;
        this.innerHeight = null;

        // Éléments D3 et scales
        this.chartGroup = null;
        this.x = null;
        this.yPop = null;
        this.yGdp = null;
        this.yInt = null;
        this.yCO2 = null;

        this.gx = null;
        this.gy1 = null;
        this.gy2 = null;
        this.gy3 = null;
        this.gy4 = null;

        this.tooltip = null;
        this.colors = {
            population: "#1f77b4",
            gdpPerCap: "#ff7f0e",
            intensity: "#2ca02c",
            co2: "#000000"
        };

        this.select = null;
    }

    async initialize() {
        const container = d3.select(`#${this.containerId}`);

        // === Contrôles ===
        const controls = container.append("div").attr("class", "controls");
        const box = controls.append("div").attr("class", "control-box");
        box.append("label").text("Pays");
        this.select = box.append("select").attr("id", "countrySelect");

        // Liste des pays depuis state
        const isoCodes = Array.from(this.state.dataByCountry.keys());
        const countryList = isoCodes.map(iso => ({
            iso,
            name: this.state.getCountryName(iso)
        })).sort((a, b) => a.name.localeCompare(b.name));

        this.select.selectAll("option")
            .data(countryList)
            .enter()
            .append("option")
            .attr("value", d => d.iso)
            .text(d => d.name);

        // === SVG ===
        this.svg = container.append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${this.width} ${this.height}`);

        this.chartGroup = this.svg.append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

        this.innerWidth = this.width - this.margin.left - this.margin.right;
        this.innerHeight = this.height - this.margin.top - this.margin.bottom;

        // === Tooltip ===
        this.tooltip = d3.select("body")
            .append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("padding", "10px")
            .style("background", "white")
            .style("border", "1px solid #ddd")
            .style("border-radius", "6px")
            .style("box-shadow", "0 2px 6px rgba(0,0,0,0.2)")
            .style("pointer-events", "none")
            .style("opacity", 0);

        // === Scales ===
        this.x = d3.scaleLinear().range([0, this.innerWidth]);
        this.yPop = d3.scaleLinear().range([this.innerHeight, 0]);
        this.yGdp = d3.scaleLinear().range([this.innerHeight, 0]);
        this.yInt = d3.scaleLinear().range([this.innerHeight, 0]);
        this.yCO2 = d3.scaleLinear().range([this.innerHeight, 0]);

        // === Axes ===
        this.gx = this.chartGroup.append("g").attr("transform", `translate(0,${this.innerHeight})`);
        this.gy1 = this.chartGroup.append("g");
        this.gy2 = this.chartGroup.append("g").attr("transform", `translate(${this.innerWidth},0)`);
        this.gy3 = this.chartGroup.append("g").attr("transform", `translate(${this.innerWidth+50},0)`);
        this.gy4 = this.chartGroup.append("g").attr("transform", `translate(${this.innerWidth+100},0)`);

        // Valeur par défaut
        this.select.property("value", "FRA");

        // === Événement ===
        this.select.on("change", () => this.update());

        // === Premier affichage ===
        this.update();
    }

    update() {
        const iso = this.select.property("value");
        const rows = this.state.getCountryData(iso);
        if (!rows || rows.length === 0) return;

        // Séries
        const series = {
            population: rows.map(d => ({ year: d.year, value: d.population > 0 ? d.population / 1e6 : NaN })),
            gdpPerCap: rows.map(d => ({ year: d.year, value: d.gdp > 0 && d.population > 0 ? (d.gdp / d.population) / 1000 : NaN })),
            intensity: rows.map(d => ({ year: d.year, value: d.gdp > 0 && d.co2 > 0 ? (d.co2 / d.gdp) * 1000 : NaN })),
            co2: rows.map(d => ({ year: d.year, value: d.co2 > 0 ? d.co2 / 1e6 : NaN }))
        };

        // Domaines
        this.x.domain(d3.extent(rows, d => d.year));
        this.yPop.domain(d3.extent(series.population, d => d.value));
        this.yGdp.domain(d3.extent(series.gdpPerCap, d => d.value));
        this.yInt.domain(d3.extent(series.intensity, d => d.value));
        this.yCO2.domain(d3.extent(series.co2, d => d.value));

        // Axes
        this.gx.call(d3.axisBottom(this.x).tickFormat(d3.format("d")));
        this.gy1.call(d3.axisLeft(this.yPop)).selectAll("text").attr("fill", this.colors.population);
        this.gy2.call(d3.axisRight(this.yGdp)).selectAll("text").attr("fill", this.colors.gdpPerCap);
        this.gy3.call(d3.axisRight(this.yInt)).selectAll("text").attr("fill", this.colors.intensity);
        this.gy4.call(d3.axisRight(this.yCO2)).selectAll("text").attr("fill", this.colors.co2);

        // Nettoyer les anciennes courbes
        this.chartGroup.selectAll(".curve").remove();
        this.chartGroup.selectAll(".point").remove();

        // Tracer
        this.draw(series.population, this.yPop, this.colors.population, "Population (M)", "population");
        this.draw(series.gdpPerCap, this.yGdp, this.colors.gdpPerCap, "PIB/hab (k$)", "gdpPerCap");
        this.draw(series.intensity, this.yInt, this.colors.intensity, "Intensité (kg CO₂/$)", "intensity");
        this.draw(series.co2, this.yCO2, this.colors.co2, "CO₂ total (Mt)", "co2");
    }

    draw(dataSerie, scaleY, color, labelPretty, classId) {
        const clean = dataSerie.filter(d => !isNaN(d.value) && isFinite(d.value));
        if (clean.length === 0) return;

        const lineGen = d3.line()
            .x(d => this.x(d.year))
            .y(d => scaleY(d.value))
            .curve(d3.curveMonotoneX);

        this.chartGroup.append("path")
            .datum(clean)
            .attr("class", "curve")
            .attr("fill", "none")
            .attr("stroke", color)
            .attr("stroke-width", 2)
            .attr("d", lineGen);

        this.chartGroup.selectAll(`.point-${classId}`)
            .data(clean)
            .enter()
            .append("circle")
            .attr("class", `point point-${classId}`)
            .attr("cx", d => this.x(d.year))
            .attr("cy", d => scaleY(d.value))
            .attr("r", 3.5)
            .attr("fill", color)
            .style("cursor", "pointer")
            .on("mousemove", (event, d) => {
                this.tooltip.style("opacity", 1)
                    .html(`<div style="font-weight:bold; color:${color}">${labelPretty}</div>
                           Année : ${d.year}<br>
                           Valeur : <strong>${d.value.toFixed(2)}</strong>`)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mouseout", () => this.tooltip.style("opacity", 0));
    }
});
