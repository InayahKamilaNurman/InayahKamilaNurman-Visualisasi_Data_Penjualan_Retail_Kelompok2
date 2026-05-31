const DATA_PATHS = [
  "../Data/Dataset_Visdat_Cleaned.csv",
  "../data/Dataset_Visdat_Cleaned.csv"
];

loadCsv(DATA_PATHS).then(data => {
  const chartData = data
    .filter(d => Number.isFinite(d.Item_MRP) && Number.isFinite(d.Item_Outlet_Sales))
    .map(d => ({
      mrp: d.Item_MRP,
      sales: d.Item_Outlet_Sales,
      itemType: d.Item_Type,
      outletType: d.Outlet_Type,
      outletId: d.Outlet_Identifier
    }));

  const corrValue = correlation(chartData);

  renderChart(chartData);

  document.getElementById("insight-box").textContent =
    `Hubungan antara harga produk dan total penjualan bersifat positif dengan korelasi ${corrValue.toFixed(2)}.`;
}).catch(err => {
  console.error(err);
  document.getElementById("chart").innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      Gagal memuat data CSV.
    </div>
  `;
});

function renderChart(data) {
  const container = document.getElementById("chart");
  container.innerHTML = "";

  const margin = { top: 20, right: 28, bottom: 78, left: 95 };
  const fullWidth = container.clientWidth || 900;
  const width = fullWidth - margin.left - margin.right;
  const height = 420 - margin.top - margin.bottom;

  const svg = d3.select(container)
    .append("svg")
    .attr("width", fullWidth)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.mrp) * 1.05])
    .nice()
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.sales) * 1.05])
    .nice()
    .range([height, 0]);

  svg.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).tickSize(-width).tickFormat(""));

  svg.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickSize(-height).tickFormat(""));

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(formatRibu));

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 12)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--text-secondary)")
    .attr("font-size", "12px")
    .text("Harga Produk (Ribu IDR)");

  svg.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).tickFormat(formatJuta));

  svg.append("text")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 22)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .attr("fill", "var(--text-secondary)")
    .attr("font-size", "12px")
    .text("Total Penjualan (Juta IDR)");

  const tooltip = d3.select("#tooltip");

  svg.append("g")
    .selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "scatter-dot")
    .attr("cx", d => x(d.mrp))
    .attr("cy", d => y(d.sales))
    .attr("r", 3.2)
    .attr("fill", "var(--primary)")
    .attr("fill-opacity", 0.55)
    .on("mouseover", function (event, d) {
      d3.select(this).attr("r", 6).attr("fill-opacity", 1);
      tooltip
        .classed("visible", true)
        .html(`
          <strong>${d.itemType}</strong><br />
          Harga: ${formatRibu(d.mrp)}<br />
          Penjualan: ${formatJuta(d.sales)}<br />
          Outlet: ${d.outletType}
        `);
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", `${event.pageX + 14}px`)
        .style("top", `${event.pageY - 34}px`);
    })
    .on("mouseout", function () {
      d3.select(this).attr("r", 3.2).attr("fill-opacity", 0.55);
      tooltip.classed("visible", false);
    });
}

function loadCsv(paths) {
  const parse = d => ({
    Item_MRP: +d.Item_MRP,
    Item_Outlet_Sales: +d.Item_Outlet_Sales,
    Item_Type: d.Item_Type,
    Outlet_Type: d.Outlet_Type,
    Outlet_Identifier: d.Outlet_Identifier
  });

  const tryLoad = i => {
    if (i >= paths.length) return Promise.reject(new Error("CSV tidak ditemukan"));
    return d3.csv(paths[i], parse).catch(() => tryLoad(i + 1));
  };

  return tryLoad(0);
}

function correlation(data) {
  const meanX = d3.mean(data, d => d.mrp);
  const meanY = d3.mean(data, d => d.sales);
  const num = d3.sum(data, d => (d.mrp - meanX) * (d.sales - meanY));
  const denX = Math.sqrt(d3.sum(data, d => Math.pow(d.mrp - meanX, 2)));
  const denY = Math.sqrt(d3.sum(data, d => Math.pow(d.sales - meanY, 2)));
  return num / (denX * denY);
}

function formatJuta(angka) {
  if (angka === 0) return "0";
  const val = angka / 1_000_000;
  return (Number.isInteger(val) ? val.toFixed(0) : val.toFixed(1)) + " Jt";
}

function formatRibu(angka) {
  if (angka === 0) return "0";
  const val = angka / 1_000;
  return (Number.isInteger(val) ? val.toFixed(0) : val.toFixed(1)) + " Rb";
}
