const DATA_PATH = "../data/Dataset_Visdat_Cleaned.csv";

// warna untuk tiap kategori
const COLORS = [
  "#1a56db","#f97316","#16a34a","#9333ea",
  "#dc2626","#0891b2","#ca8a04","#db2777",
  "#0ea5e9","#84cc16","#f59e0b","#6366f1",
  "#14b8a6","#ef4444","#a855f7","#64748b"
];

let showTop5 = false;
let allData  = [];

// load data
d3.csv(DATA_PATH, d => ({
  Item_Type:         d.Item_Type,
  Item_Outlet_Sales: +d.Item_Outlet_Sales
})).then(data => {

  // agregasi total penjualan per tipe item
  const grouped = d3.rollups(
    data,
    v => d3.sum(v, d => d.Item_Outlet_Sales),
    d => d.Item_Type
  );

  // ubah ke array objek, urutkan dari terbesar
  allData = grouped
    .map(([type, total]) => ({ type, total }))
    .sort((a, b) => b.total - a.total);

  // isi stats
  const totalKeseluruhan = d3.sum(allData, d => d.total);
  const itemTertinggi    = allData[0];
  const itemTerendah     = allData[allData.length - 1];

  document.getElementById("stats-row").innerHTML = `
    <div class="stat-item">
      <div class="stat-value">${allData.length}</div>
      <div class="stat-label">Tipe Item</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${formatRupiah(totalKeseluruhan)}</div>
      <div class="stat-label">Total Penjualan</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${itemTertinggi.type}</div>
      <div class="stat-label">Penjualan Tertinggi</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${itemTerendah.type}</div>
      <div class="stat-label">Penjualan Terendah</div>
    </div>
  `;

  // render pertama kali
  renderChart(allData);

  // toggle semua / top 5
  document.getElementById("btn-all").addEventListener("click", () => {
    showTop5 = false;
    document.getElementById("btn-all").classList.add("active");
    document.getElementById("btn-top5").classList.remove("active");
    renderChart(allData);
  });

  document.getElementById("btn-top5").addEventListener("click", () => {
    showTop5 = true;
    document.getElementById("btn-top5").classList.add("active");
    document.getElementById("btn-all").classList.remove("active");
    renderChart(allData.slice(0, 5));
  });

}).catch(err => {
  console.error("Gagal load data:", err);
  document.getElementById("chart").innerHTML =
    `<p style="color:red;padding:20px">Gagal memuat data. Pastikan file CSV ada di folder data/.</p>`;
});


// render chart — dipanggil ulang setiap toggle berubah
function renderChart(data) {

  // hapus svg lama dulu
  d3.select("#chart").selectAll("*").remove();

  // ukuran
  const container  = document.getElementById("chart");
  const totalWidth = container.clientWidth || 900;
  const margin     = { top: 20, right: 30, bottom: 120, left: 80 };
  const width      = totalWidth - margin.left - margin.right;
  const height     = 380 - margin.top - margin.bottom;

  // buat svg
  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", totalWidth)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // skala x
  const xScale = d3.scaleBand()
    .domain(data.map(d => d.type))
    .range([0, width])
    .padding(0.3);

  // skala y
  const yScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.total) * 1.1])
    .range([height, 0]);

  // skala warna
  const colorScale = d3.scaleOrdinal()
    .domain(data.map(d => d.type))
    .range(COLORS);

  // grid horizontal
  svg.append("g")
    .attr("class", "grid")
    .call(
      d3.axisLeft(yScale)
        .tickSize(-width)
        .tickFormat("")
    );

  // sumbu x
  svg.append("g")
    .attr("class", "axis x-axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale))
    .selectAll("text")
      .attr("transform", "rotate(-35)")
      .style("text-anchor", "end")
      .attr("dx", "-0.5em")
      .attr("dy", "0.5em");

  // label sumbu x
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 10)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--text-secondary)")
    .attr("font-size", "12px")
    .attr("font-family", "var(--font-main)")
    .text("Tipe Item");

  // sumbu y
  svg.append("g")
    .attr("class", "axis y-axis")
    .call(
      d3.axisLeft(yScale)
        .tickFormat(d => formatSingkat(d))
    );

  // label sumbu y
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 15)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--text-secondary)")
    .attr("font-size", "12px")
    .attr("font-family", "var(--font-main)")
    .text("Total Penjualan (IDR)");

  const tooltip = d3.select("#tooltip");

  // gambar batang
  svg.selectAll(".bar")
    .data(data)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", d => xScale(d.type))
    .attr("width", xScale.bandwidth())
    .attr("y", height)
    .attr("height", 0)
    .attr("fill", d => colorScale(d.type))
    .attr("rx", 4)
    // animasi tumbuh ke atas
    .transition()
    .duration(600)
    .delay((d, i) => i * 50)
    .attr("y", d => yScale(d.total))
    .attr("height", d => height - yScale(d.total));

  // hover tooltip
  svg.selectAll(".bar")
    .on("mouseover", function(event, d) {
      d3.select(this).attr("opacity", 0.8);
      tooltip
        .classed("visible", true)
        .html(`
          <div>${d.type}</div>
          <div class="tooltip-value">${formatRupiah(d.total)}</div>
        `);
    })
    .on("mousemove", function(event) {
      tooltip
        .style("left", (event.pageX + 14) + "px")
        .style("top",  (event.pageY - 36) + "px");
    })
    .on("mouseout", function() {
      d3.select(this).attr("opacity", 1);
      tooltip.classed("visible", false);
    });

  // update insight
  const top1 = data[0];
  const top2 = data[1];
  document.getElementById("insight-box").innerHTML = `
    <strong>${top1.type}</strong> menjadi tipe item dengan total penjualan tertinggi
    sebesar <strong>${formatRupiah(top1.total)}</strong>, diikuti oleh
    <strong>${top2 ? top2.type : "-"}</strong>.
    ${showTop5
      ? "Ditampilkan 5 tipe item teratas dari 16 kategori."
      : "Ditampilkan seluruh 16 kategori tipe item."}
  `;
}


// format angka
function formatRupiah(angka) {
  return "Rp " + Math.round(angka).toLocaleString("id-ID");
}

function formatSingkat(angka) {
  if (angka >= 1_000_000) return (angka / 1_000_000).toFixed(1) + "M";
  if (angka >= 1_000)     return (angka / 1_000).toFixed(0) + "K";
  return angka;
}
