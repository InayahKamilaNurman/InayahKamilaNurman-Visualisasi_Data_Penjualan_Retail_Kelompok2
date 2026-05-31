const DATA_PATHS = [
  "../Data/Dataset_Visdat_Cleaned.csv",
  "../data/Dataset_Visdat_Cleaned.csv"
];

const CATEGORY_COLORS = [
  getCssVar("--cat-1"),
  getCssVar("--cat-2"),
  getCssVar("--cat-3")
];

loadCsv(DATA_PATHS).then(data => {
  // agregasi total penjualan per lokasi outlet
  const grouped = d3.rollups(
    data,
    v => d3.sum(v, d => d.Item_Outlet_Sales),
    d => d.Outlet_Location_Type
  );

  // ubah ke array objek dan urutkan secara ordinal (Tier 1, Tier 2, Tier 3)
  const chartData = grouped
    .map(([type, total]) => ({ type, total }))
    .sort((a, b) => a.type.localeCompare(b.type));

  renderChart(chartData);

  // Tentukan insight
  const highest = [...chartData].sort((a, b) => b.total - a.total)[0];
  document.getElementById("insight-box").innerHTML =
    `Outlet yang berlokasi di <strong>${highest.type}</strong> memberikan kontribusi penjualan tertinggi dengan total mencapai <strong>${formatMiliar(highest.total)} Miliar IDR</strong>.`;

}).catch(err => {
  console.error("Gagal load data:", err);
  document.getElementById("chart").innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      Gagal memuat data CSV. Pastikan file Dataset_Visdat_Cleaned.csv berada di folder Data/.
    </div>
  `;
});

function renderChart(data) {
  const container = document.getElementById("chart");
  container.innerHTML = "";

  const margin = { top: 30, right: 30, bottom: 60, left: 105 };
  const fullWidth = container.clientWidth || 900;
  const width = fullWidth - margin.left - margin.right;
  const height = 420 - margin.top - margin.bottom;

  const svg = d3.select(container)
    .append("svg")
    .attr("width", fullWidth)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Skala X (Kategori Tier Lokasi)
  const x = d3.scaleBand()
    .domain(data.map(d => d.type))
    .range([0, width])
    .padding(0.35);

  // Skala Y (Total Penjualan)
  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.total) * 1.15]) // Berikan padding 15% di atas agar label tidak terpotong
    .nice()
    .range([height, 0]);

  // Skala Warna untuk tiap Tier
  const color = d3.scaleOrdinal()
    .domain(data.map(d => d.type))
    .range(CATEGORY_COLORS);

  // Grid horizontal di latar belakang
  svg.append("g")
    .attr("class", "grid")
    .call(
      d3.axisLeft(y)
        .ticks(6)
        .tickSize(-width)
        .tickFormat("")
    );

  // Sumbu X
  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("font-size", "13px")
    .style("font-weight", "500");

  // Sumbu Y
  svg.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(6).tickFormat(formatMiliar));

  // Label sumbu Y
  svg.append("text")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 22)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .attr("fill", "var(--text-secondary)")
    .attr("font-size", "12px")
    .attr("font-weight", "600")
    .text("Total Penjualan (Miliar IDR)");

  // Label sumbu X
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 15)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--text-secondary)")
    .attr("font-size", "12px")
    .attr("font-weight", "600")
    .text("Tipe Lokasi Outlet");

  const tooltip = d3.select("#tooltip");

  // Batang (Bar) dengan animasi transisi D3 yang halus
  svg.selectAll(".bar")
    .data(data)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", d => x(d.type))
    .attr("width", x.bandwidth())
    .attr("y", height)
    .attr("height", 0)
    .attr("fill", d => color(d.type))
    .attr("rx", 6) // Membuat ujung batang membulat (premium look)
    .on("mouseover", function (event, d) {
      d3.select(this).attr("opacity", 0.85);
      tooltip
        .classed("visible", true)
        .html(`
          <div style="font-weight: 600; margin-bottom: 4px;">${d.type}</div>
          <div class="tooltip-value">${formatRupiahLengkap(d.total)}</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Total Penjualan Retail</div>
        `);
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", `${event.pageX + 14}px`)
        .style("top", `${event.pageY - 36}px`);
    })
    .on("mouseout", function () {
      d3.select(this).attr("opacity", 1);
      tooltip.classed("visible", false);
    })
    .transition()
    .duration(1000)
    .ease(d3.easeCubicOut)
    .delay((d, i) => i * 100)
    .attr("y", d => y(d.total))
    .attr("height", d => height - y(d.total));

  // Label di atas masing-masing batang (ditampilkan setelah animasi batang selesai)
  svg.selectAll(".bar-label")
    .data(data)
    .enter()
    .append("text")
    .attr("class", "bar-label")
    .attr("x", d => x(d.type) + x.bandwidth() / 2)
    .attr("y", height)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .attr("font-weight", "600")
    .attr("fill", "var(--text-secondary)")
    .style("opacity", 0)
    .text(d => formatMiliar(d.total))
    .transition()
    .duration(1000)
    .ease(d3.easeCubicOut)
    .delay((d, i) => i * 100 + 400)
    .attr("y", d => y(d.total) - 8)
    .style("opacity", 1);
}

function loadCsv(paths) {
  const parse = d => ({
    Outlet_Location_Type: d.Outlet_Location_Type,
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
  return (Number.isInteger(val) ? val.toFixed(0) : val.toFixed(2)) + " M";
}

function formatRupiahLengkap(angka) {
  return "Rp " + Math.round(angka).toLocaleString("id-ID");
}

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
