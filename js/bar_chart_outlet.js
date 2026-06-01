// Kelompok 2 - bar chart tipe outlet

const DATA_PATHS = [
  "../Data/Dataset_Visdat_Cleaned.csv",
  "../data/Dataset_Visdat_Cleaned.csv"
];

const COLORS = [
  "#1a56db",
  "#f97316",
  "#16a34a",
  "#9333ea"
];

// load data
loadCsv(DATA_PATHS).then(data => {

  const grouped = d3.rollups(
    data,
    v => d3.sum(v, d => d.Item_Outlet_Sales),
    d => d.Outlet_Type
  );

  const chartData = grouped
    .map(([type, total]) => ({ type, total }))
    .sort((a, b) => b.total - a.total);

  renderChart(chartData);

  const top = chartData[0];
  document.getElementById("insight-box").textContent =
  `${top.type} merupakan tipe outlet dengan total penjualan tertinggi sebesar ${formatMiliarLabel(top.total)}.`;

}).catch(err => {
  console.error(err);
  document.getElementById("chart").innerHTML =
    `<div class="loading"><div class="spinner"></div>Gagal memuat data CSV.</div>`;
});

// render chart
function renderChart(data) {
  const container  = document.getElementById("chart");
  container.innerHTML = "";

  const margin     = { top: 30, right: 30, bottom: 80, left: 90 };
  const fullWidth  = container.clientWidth || 900;
  const width      = fullWidth - margin.left - margin.right;
  const height     = 420 - margin.top - margin.bottom;

  const svg = d3.select(container)
    .append("svg")
    .attr("width", fullWidth)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // skala
  const x = d3.scaleBand()
    .domain(data.map(d => d.type))
    .range([0, width])
    .padding(0.3);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.total) * 1.15])
    .nice()
    .range([height, 0]);

  // warna per kategori
  const color = d3.scaleOrdinal()
    .domain(data.map(d => d.type))
    .range(COLORS);

  // grid
  svg.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).tickSize(-width).tickFormat(""));

  // sumbu x — lurus karena cuma 4 kategori
  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("font-size", "12px")
    .style("text-anchor", "middle");

  // label sumbu x
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 55)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--text-secondary)")
    .attr("font-size", "12px")
    .attr("font-weight", "600")
    .attr("font-family", "var(--font-main)")
    .text("Tipe Outlet");

  // sumbu y
  svg.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(6).tickFormat(d => formatMiliar(d)));

  // label sumbu y
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 15)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--text-secondary)")
    .attr("font-size", "12px")
    .attr("font-weight", "600")
    .attr("font-family", "var(--font-main)")
.text("Total Penjualan (Miliar INR)");
  const tooltip = d3.select("#tooltip");

  // gambar batang
  svg.selectAll(".bar-outlet")
    .data(data)
    .enter()
    .append("rect")
    .attr("class", "bar-outlet")
    .attr("x", d => x(d.type))
    .attr("width", x.bandwidth())
    .attr("y", height)
    .attr("height", 0)
    .attr("rx", 6)
    .transition()
    .duration(800)
    .ease(d3.easeCubicOut)
    .delay((d, i) => i * 80)
    .attr("y", d => y(d.total))
    .attr("height", d => height - y(d.total))
    .style("fill", d => color(d.type));

  // hover
  svg.selectAll(".bar-outlet")
    .on("mouseover", function(event, d) {
      // redup semua batang kecuali yang dihover
      svg.selectAll(".bar-outlet").attr("opacity", 0.3);
      d3.select(this).attr("opacity", 1);
      tooltip
        .classed("visible", true)
        .html(`
          <div style="font-weight:600;margin-bottom:4px">${d.type}</div>
          <div class="tooltip-value">${formatMiliarLabel(d.total)}</div>
        `);
    })
    .on("mousemove", function(event) {
      tooltip
        .style("left", (event.pageX + 14) + "px")
        .style("top",  (event.pageY - 36) + "px");
    })
    .on("mouseout", function() {
      svg.selectAll(".bar-outlet").attr("opacity", 1);
      tooltip.classed("visible", false);
    });
}

// load csv
function loadCsv(paths) {
  const parse = d => ({
    Outlet_Type:       d.Outlet_Type,
    Item_Outlet_Sales: +d.Item_Outlet_Sales
  });
  const tryLoad = i => {
    if (i >= paths.length) return Promise.reject(new Error("CSV tidak ditemukan"));
    return d3.csv(paths[i], parse).catch(() => tryLoad(i + 1));
  };
  return tryLoad(0);
}

function formatMiliar(angka) {
  if (angka === 0) return "0";

  const val = angka / 1_000_000_000;
  const rounded = Number(val.toFixed(1));

  return rounded % 1 === 0
    ? `${rounded.toFixed(0)} M`
    : `${rounded.toFixed(1).replace(".", ",")} M`;
}

function formatMiliarLabel(angka) {
  const val = angka / 1_000_000_000;
  const rounded = Number(val.toFixed(1));

  return rounded % 1 === 0
    ? `${rounded.toFixed(0)} Miliar INR`
    : `${rounded.toFixed(1).replace(".", ",")} Miliar INR`;
}