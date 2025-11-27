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
    this.legendContainer = null;

    // Facteur et unité calculés dynamiquement pour l'intensité
    this.intensityFactor = 1;
    this.intensityUnit = 'kg CO₂/$';
  }

  async initialize() {
    const container = d3.select(`#${this.containerId}`);

    // === Contrôles ===
    const controls = container.append("div").attr("class", "controls");
    const box = controls.append("div").attr("class", "control-box");
    // label changé et texte plus explicite
    box.append("label").text("Sélectionner le pays : ");
    // on ajoute un petit espace/marge avant le select
    this.select = box.append("select")
                .attr("id", "countrySelect")
                .style("padding", "0.5rem 0.8rem")
                .style("margin-left", "0.2rem")
                .style("color", "#666")
                .style("border", "1px solid #2d5a3d")
                .style("border-color", "#2d5a3d")
                .style("border-radius", "8px")
                .style("cursor", "pointer")
                .on("blur", () => this.select.style("border-color", "#2d5a3d"))

    // --- Légende HTML placée à droite du sélecteur (hors du SVG) pour meilleure lisibilité ---
    this.legendContainer = controls.append("div")
      .attr("class", "legend-box")
      .style("display", "inline-block")
      .style("vertical-align", "middle")
      .style("margin-left", "24px");

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

    // Render static legend HTML once
    this.renderHtmlLegend();

    // === Premier affichage ===
    this.update();
  }

  // Génère la légende en HTML (hors du SVG) pour qu'elle reste lisible
  renderHtmlLegend() {
    const legendData = [
      { key: 'population', label: 'Population (M)', color: this.colors.population },
      { key: 'gdpPerCap', label: 'PIB/hab (k$)', color: this.colors.gdpPerCap },
      { key: 'intensity', label: "Intensité", color: this.colors.intensity },
      { key: 'co2', label: 'CO₂ total (Mt)', color: this.colors.co2 }
    ];

    // Nettoie puis recrée
    this.legendContainer.selectAll('.legend-item').remove();

    const items = this.legendContainer.selectAll('.legend-item')
    .data(legendData)
    .enter()
    .append('div')
    .attr('class', 'legend-item')
    .style('display', 'inline-flex')
    .style('align-items', 'center')
    .style('margin-right', '16px');

    items.append('span')
      .style('display', 'inline-block')
      .style('width', '14px')
      .style('height', '14px')
      .style('border-radius', '3px')
      .style('background', d => d.color)
      .style('margin-right', '8px');

    items.append('span')
      .text(d => d.label)
      .style('font-size', '13px')
      .style('color', '#222');
  }

  update() {
    const iso = this.select.property("value");
    const rows = this.state.getCountryData(iso);
    if (!rows || rows.length === 0) return;

    // --- Calcul de l'intensité brute (kg CO2 / $) sans mise à l'échelle
    const rawIntensityArray = rows.map(d => (d.gdp > 0 && d.co2 > 0) ? (d.co2 / d.gdp) : NaN);
    const rawMax = d3.max(rawIntensityArray.filter(v => isFinite(v)));

    // Choix automatique d'un facteur d'affichage et d'une unité lisible
    // Si les valeurs sont très petites, on passe en g (x1000) ou en mg/µg si besoin
    if (!isFinite(rawMax) || rawMax === undefined) {
      this.intensityFactor = 1;
      this.intensityUnit = 'kg CO₂/$';
    } else if (rawMax < 1e-6) {
      this.intensityFactor = 1e9; // kg -> µg
      this.intensityUnit = 'µg CO₂/$';
    } else if (rawMax < 1e-3) {
      this.intensityFactor = 1e3; // kg -> g
      this.intensityUnit = 'g CO₂/$';
    } else {
      this.intensityFactor = 1; // garder kg
      this.intensityUnit = 'kg CO₂/$';
    }

    // Séries: on applique le facteur d'affichage uniquement sur la valeur montrée et tracée
    const series = {
      population: rows.map(d => ({ year: d.year, value: d.population > 0 ? d.population / 1e6 : NaN })),
      gdpPerCap: rows.map(d => ({ year: d.year, value: d.gdp > 0 && d.population > 0 ? (d.gdp / d.population) / 1000 : NaN })),
      // intensité = (co2 / gdp) [kg/$] multiplié par factor pour une unité lisible
      intensity: rows.map(d => ({ year: d.year, value: (d.gdp > 0 && d.co2 > 0) ? (d.co2 / d.gdp) * this.intensityFactor : NaN })),
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

    // afficher l'échelle de l'intensité avec des ticks lisibles
    // on adapte le format des ticks selon le facteur
    const intensityTickFormat = this.intensityFactor === 1 ? d3.format(".3f") : d3.format(",.2f");
    this.gy3.call(d3.axisRight(this.yInt).tickFormat(intensityTickFormat)).selectAll("text").attr("fill", this.colors.intensity);

    this.gy4.call(d3.axisRight(this.yCO2)).selectAll("text").attr("fill", this.colors.co2);

    // Nettoyer les anciennes courbes et points (la légende HTML est hors du SVG)
    this.chartGroup.selectAll(".curve").remove();
    this.chartGroup.selectAll(".point").remove();

    // Tracer
    this.draw(series.population, this.yPop, this.colors.population, "Population (M)", "population");
    this.draw(series.gdpPerCap, this.yGdp, this.colors.gdpPerCap, "PIB/hab (k$)", "gdpPerCap");
    // passer l'unité calculée dans le labelPretty pour affichage dans la tooltip
    this.draw(series.intensity, this.yInt, this.colors.intensity, `Intensité (${this.intensityUnit})`, "intensity");
    this.draw(series.co2, this.yCO2, this.colors.co2, "CO₂ total (Mt)", "co2");

    // Mettre à jour la légende HTML si besoin (couleurs modifiables plus tard)
    this.renderHtmlLegend();
  }

  draw(dataSerie, scaleY, color, labelPretty, classId) {
    // Chaque point a maintenant { year, value }
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

    // Formatage: plus précis si nécessaire, et affichage d'unités dans le tooltip
    // On adapte le format selon la série (intensity peut avoir de petits nombres)
    const fmtDefault = d3.format(",.2f");
    const fmtIntensity = (this.intensityFactor === 1) ? d3.format(",.6f") : d3.format(",.2f");

    const unitMap = {
      'population': 'M',
      'gdpPerCap': 'k$',
      'intensity': '', // déjà inclus dans labelPretty pour éviter incohérence
      'co2': 'Mt'
    };

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
        const displayVal = (classId === 'intensity') ? (isFinite(d.value) ? fmtIntensity(d.value) : 'n/a') : (isFinite(d.value) ? fmtDefault(d.value) : 'n/a');
        const unit = unitMap[classId] || '';

        let html = `<div style="font-weight:bold; color:${color}">${labelPretty}</div>`;
        html += `Année : ${d.year}<br>`;
        html += `Valeur : <strong>${displayVal} ${unit}</strong>`;

        this.tooltip.style("opacity", 1)
          .html(html)
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 20) + "px");
      })
      .on("mouseout", () => this.tooltip.style("opacity", 0));
  }
});

