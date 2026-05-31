const DATA_PATHS = [
  "../Data/Dataset_Visdat_Cleaned.csv",
  "../data/Dataset_Visdat_Cleaned.csv"
];

const COLORS = [
  getCssVar("--cat-1"),
  getCssVar("--cat-2"),
  getCssVar("--cat-3"),
  getCssVar("--cat-4"),
  getCssVar("--cat-5"),
  getCssVar("--cat-6"),
  getCssVar("--cat-7"),
  getCssVar("--cat-8")
];

loadCsv(DATA_PATHS)
  .then(data => {
    const uniqueOutlets = Array.from(
      d3.rollup(
        data,
        v => v[0],
        d => d.Outlet_Identifier
      ).values()
    );

    const grouped = d3.rollups(
      uniqueOutlets,
      v => v.length,
      d => d.Outlet_Type
    );

    const allData = grouped
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    const totalOutlets = d3.sum(allData, d => d.count);
    const topType = allData[0];

    document.getElementById("stats-row").innerHTML = `
      <div class="stat-item">
        <div class="stat-value">${allData.length}</div>
        <div class="stat-label">Tipe Outlet</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${totalOutlets}</div>
        <div class="stat-label">Outlet Unik</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${topType.type}</div>
        <div class="stat-label">Dominan</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${Math.round((topType.count / totalOutlets) * 100)}%</div>
        <div class="stat-label">Porsi Tertinggi</div>
      </div>
    `;

    renderChart(allData);
    document.getElementById("insight-box").innerHTML = `
      Tipe outlet <strong>${topType.type}</strong> memiliki jumlah outlet unik paling banyak, yaitu <strong>${topType.count} outlet</strong>.
    `;
  })
  .catch(err => {
    console.error("Gagal load data:", err);
    document.getElementById("chart").innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        Gagal memuat data CSV.
      </div>
    `;
  });

function renderChart(data) {
  d3.select("#chart").selectAll("*").remove();

  const container = document.getElementById("chart");
  const totalWidth = container.clientWidth || 900;
  const width = totalWidth;
  const height = 420;

  const radius = Math.min(width, height) / 2 - 20;

  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${width / 2},${height / 2})`);

  const colorScale = d3.scaleOrdinal()
    .domain(data.map(d => d.type))
    .range(COLORS);

  const pie = d3.pie()
    .sort(null)
    .value(d => d.count);

  const arc = d3.arc()
    .innerRadius(0)
    .outerRadius(radius);

  const labelArc = d3.arc()
    .innerRadius(radius * 0.7)
    .outerRadius(radius * 0.7);

  const tooltip = d3.select("#tooltip");
  const pieData = pie(data);

  svg.selectAll(".arc")
    .data(pieData)
    .enter()
    .append("g")
    .attr("class", "arc")
    .append("path")
    .attr("d", arc)
    .attr("fill", d => colorScale(d.data.type))
    .on("mouseover", function (event, d) {
      d3.select(this).attr("opacity", 0.85);
      tooltip
        .classed("visible", true)
        .html(`
          <strong>${d.data.type}</strong><br />
          ${d.data.count} outlet (${((d.data.count / d3.sum(data, x => x.count)) * 100).toFixed(1)}%)
        `);
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", (event.pageX + 14) + "px")
        .style("top", (event.pageY - 36) + "px");
    })
    .on("mouseout", function () {
      d3.select(this).attr("opacity", 1);
      tooltip.classed("visible", false);
    });

  svg.selectAll(".arc-label")
    .data(pieData)
    .enter()
    .append("text")
    .attr("class", "arc-label")
    .attr("transform", d => `translate(${labelArc.centroid(d)})`)
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .text(d => `${d.data.type} (${Math.round((d.data.count / d3.sum(data, x => x.count)) * 100)}%)`);

  const legend = d3.select("#legend");

  allLegend(data, colorScale, legend);
}

function allLegend(data, colorScale, legendSelection) {
  const legendData = data.map(d => ({ label: d.type, color: colorScale(d.type), count: d.count }));

  const legend = legendSelection
    .selectAll(".legend-item")
    .data(legendData)
    .enter()
    .append("div")
    .attr("class", "legend-item");

  legend.append("span")
    .attr("class", "legend-swatch")
    .style("background", d => d.color);

  legend.append("span")
    .text(d => `${d.label} (${d.count})`);
}

function loadCsv(paths) {
  const converters = d => ({
    Outlet_Identifier: d.Outlet_Identifier,
    Outlet_Type: d.Outlet_Type
  });

  const tryLoad = index => {
    if (index >= paths.length) {
      return Promise.reject(new Error("Semua path CSV gagal dimuat."));
    }
    return d3.csv(paths[index], converters).catch(() => tryLoad(index + 1));
  };

  return tryLoad(0);
}

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

