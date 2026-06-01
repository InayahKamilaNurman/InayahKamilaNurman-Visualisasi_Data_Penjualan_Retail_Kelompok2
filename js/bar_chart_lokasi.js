// Kelompok 2 - bar chart lokasi outlet

const DATA_PATHS = [
  "../Data/Dataset_Visdat_Cleaned.csv",
  "../data/Dataset_Visdat_Cleaned.csv"
];

// hardcode warna — tidak pakai getCssVar
const COLORS = ["#1a56db", "#f97316", "#16a34a"];

loadCsv(DATA_PATHS).then(data => {

  const grouped = d3.rollups(
    data,
    v => d3.sum(v, d => d.Item_Outlet_Sales),
    d => d.Outlet_Location_Type
  );

  const chartData = grouped
    .map(([type, total]) => ({ type, total }))
    .sort((a, b) => a.type.localeCompare(b.type));

  renderChart(chartData);

  const highest = [...chartData].sort((a, b) => b.total - a.total)[0];
  document.getElementById("insight-box").textContent =
    `${highest.type} adalah lokasi outlet dengan penjualan tertinggi dengan total penjualan ${formatMiliarLabel(highest.total)}.`;

}).catch(err => {
  console.error("Gagal load data:", err);
  document.getElementById("chart").innerHTML =
    `<div class="loading"><div class="spinner"></div>Gagal memuat data CSV.</div>`;
});

function renderChart(data) {
  const container = document.getElementById("chart");
  container.innerHTML = "";

  const margin    = { top: 30, right: 30, bottom: 60, left: 90 };
  const fullWidth = container.clientWidth || 900;
  const width     = fullWidth - margin.left - margin.right;
  const height    = 420 - margin.top - margin.bottom;

  const svg = d3.select(container)
    .append("svg")
    .attr("width", fullWidth)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
    .domain(data.map(d => d.type))
    .range([0, width])
    .padding(0.35);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.total) * 1.15])
    .nice()
    .range([height, 0]);

  const color = d3.scaleOrdinal()
    .domain(data.map(d => d.type))
    .range(COLORS);

  // grid
  svg.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).ticks(6).tickSize(-width).tickFormat(""));

  // sumbu x
  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("font-size", "13px")
    .style("font-weight", "500");

  // sumbu y
  svg.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(6).tickFormat(formatMiliar));

  // label sumbu y
  svg.append("text")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 15)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .attr("fill", "var(--text-secondary)")
    .attr("font-size", "12px")
    .attr("font-weight", "600")
    .attr("font-family", "var(--font-main)")
    .text("Total Penjualan (Miliar IDR)");

  // label sumbu x
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 15)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--text-secondary)")
    .attr("font-size", "12px")
    .attr("font-weight", "600")
    .attr("font-family", "var(--font-main)")
    .text("Tipe Lokasi Outlet");

  const tooltip = d3.select("#tooltip");

  // gambar batang
  svg.selectAll(".bar-lokasi")
    .data(data)
    .enter()
    .append("rect")
    .attr("class", "bar-lokasi")
    .attr("x", d => x(d.type))
    .attr("width", x.bandwidth())
    .attr("y", height)
    .attr("height", 0)
    .attr("rx", 6)
    .on("mouseover", function(event, d) {
      svg.selectAll(".bar-lokasi").attr("opacity", 0.3);
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
      svg.selectAll(".bar-lokasi").attr("opacity", 1);
      tooltip.classed("visible", false);
    })
    .transition()
    .duration(800)
    .ease(d3.easeCubicOut)
    .delay((d, i) => i * 100)
    .attr("y", d => y(d.total))
    .attr("height", d => height - y(d.total))
    .style("fill", d => color(d.type));
}

function loadCsv(paths) {
  const parse = d => ({
    Outlet_Location_Type: d.Outlet_Location_Type,
    Item_Outlet_Sales:    +d.Item_Outlet_Sales
  });
  const tryLoad = i => {
    if (i >= paths.length) return Promise.reject(new Error("CSV tidak ditemukan"));
    return d3.csv(paths[i], parse).catch(() => tryLoad(i + 1));
  };
  return tryLoad(0);
}

// format sumbu & label
function formatMiliar(angka) {
  if (angka === 0) return "0";
  const val = angka / 1_000_000_000;
  return (Number.isInteger(Math.round(val * 10) / 10)
    ? val.toFixed(0)
    : val.toFixed(1)) + " M";
}

// format insight & tooltip — koma Indonesia
function formatMiliarLabel(angka) {
  const val = angka / 1_000_000_000;
  return (Math.round(val * 10) / 10).toFixed(1).replace(".", ",") + " Miliar IDR";
}