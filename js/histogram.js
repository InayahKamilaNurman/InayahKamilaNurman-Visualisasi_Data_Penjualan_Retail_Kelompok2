const DATA_PATHS = [
  "../Data/Dataset_Visdat_Cleaned.csv",
  "../data/Dataset_Visdat_Cleaned.csv"
];

let allPrices = [];
let currentBinCount = 20;

loadCsv(DATA_PATHS).then(data => {
  // Ambil hanya kolom harga produk (Item_MRP)
  allPrices = data.map(d => d.Item_MRP).filter(d => !isNaN(d) && d > 0);

  // Render chart pertama kali dengan default 20 bins
  renderChart(allPrices, currentBinCount);

  // Pasang event listener untuk interactive bin size controller
  setupBinControllers();

}).catch(err => {
  console.error("Gagal memuat data:", err);
  document.getElementById("chart").innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      Gagal memuat data CSV. Pastikan file Dataset_Visdat_Cleaned.csv berada di folder Data/.
    </div>
  `;
});

function setupBinControllers() {
  const binsOptions = [
    { id: "btn-bins-10", value: 10 },
    { id: "btn-bins-20", value: 20 },
    { id: "btn-bins-30", value: 30 }
  ];

  binsOptions.forEach(opt => {
    const btn = document.getElementById(opt.id);
    if (btn) {
      btn.addEventListener("click", () => {
        // Hapus kelas aktif dari semua tombol
        binsOptions.forEach(o => {
          const b = document.getElementById(o.id);
          if (b) b.classList.remove("active");
        });

        // Tambah kelas aktif pada tombol yang diklik
        btn.classList.add("active");

        // Perbarui bin count dan render ulang chart
        currentBinCount = opt.value;
        renderChart(allPrices, currentBinCount);
      });
    }
  });
}

function renderChart(prices, binCount) {
  const container = document.getElementById("chart");
  container.innerHTML = "";

  const margin = { top: 30, right: 30, bottom: 60, left: 75 };
  const fullWidth = container.clientWidth || 900;
  const width = fullWidth - margin.left - margin.right;
  const height = 420 - margin.top - margin.bottom;

  const svg = d3.select(container)
    .append("svg")
    .attr("width", fullWidth)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Skala X (Harga Produk / MRP)
  const xScale = d3.scaleLinear()
    .domain([0, d3.max(prices) * 1.02]) // Sedikit padding di kanan
    .range([0, width])
    .nice();

  // Generator Bin
  const histogram = d3.bin()
    .domain(xScale.domain())
    .thresholds(xScale.ticks(binCount));

  const bins = histogram(prices);

  // Skala Y (Frekuensi / Jumlah Produk)
  const yScale = d3.scaleLinear()
    .domain([0, d3.max(bins, d => d.length) * 1.1]) // Padding 10% di atas agar label aman
    .nice()
    .range([height, 0]);

  // Skala Warna Sequential (Menggunakan transisi warna cyan ke biru tua dari style.css)
  const colorScale = d3.scaleLinear()
    .domain([0, bins.length - 1])
    .range([getCssVar("--seq-3"), getCssVar("--seq-2")]); // --seq-3 (teal/cyan) ke --seq-2 (biru tua)

  // Grid horizontal
  svg.append("g")
    .attr("class", "grid")
    .call(
      d3.axisLeft(yScale)
        .ticks(6)
        .tickSize(-width)
        .tickFormat("")
    );

  // Sumbu X
  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale).ticks(8).tickFormat(formatRupiahSingkat))
    .selectAll("text")
    .style("font-size", "12px")
    .style("font-weight", "500");

  // Sumbu Y
  svg.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(yScale).ticks(6));

  // Label sumbu Y
  svg.append("text")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 22)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .attr("fill", "var(--text-secondary)")
    .attr("font-size", "12px")
    .attr("font-weight", "600")
    .text("Frekuensi (Jumlah Produk)");

  // Label sumbu X
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 15)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--text-secondary)")
    .attr("font-size", "12px")
    .attr("font-weight", "600")
    .text("Harga Maksimum Produk Eceran (Item MRP)");

  const tooltip = d3.select("#tooltip");

  // Gambar Batang Histogram
  const bars = svg.selectAll(".bar-rect")
    .data(bins)
    .enter()
    .append("rect")
    .attr("class", "bar-rect")
    .attr("x", d => xScale(d.x0) + 1)
    .attr("width", d => Math.max(0, xScale(d.x1) - xScale(d.x0) - 1.5))
    .attr("y", height)
    .attr("height", 0)
    .attr("fill", (d, i) => colorScale(i))
    .attr("rx", 3) // Rounded corner lembut
    .style("cursor", "pointer")
    .style("transition", "fill-opacity 0.15s");

  // Animasi masuk vertikal batang histogram
  bars.transition()
    .duration(850)
    .ease(d3.easeCubicOut)
    .delay((d, i) => i * 30)
    .attr("y", d => yScale(d.length))
    .attr("height", d => height - yScale(d.length));

  // Event Interaktif Tooltip
  bars
    .on("mouseover", function (event, d) {
      d3.select(this).attr("fill-opacity", 0.8);

      tooltip
        .classed("visible", true)
        .html(`
          <div style="font-weight: 600; margin-bottom: 4px;">Rentang Harga (MRP)</div>
          <div style="color: var(--accent); font-weight: 600; font-family: var(--font-mono); margin-bottom: 4px;">
            ${formatRupiahLengkap(d.x0)} - ${formatRupiahLengkap(d.x1)}
          </div>
          <div style="font-size: 12px;">Jumlah Produk: <strong>${d.length} item</strong></div>
        `);
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", `${event.pageX + 14}px`)
        .style("top", `${event.pageY - 36}px`);
    })
    .on("mouseout", function () {
      d3.select(this).attr("fill-opacity", 1);
      tooltip.classed("visible", false);
    });

  // Tulis insight dinamis
  const maxBin = [...bins].sort((a, b) => b.length - a.length)[0];
  const percentage = ((maxBin.length / prices.length) * 100).toFixed(1);
  document.getElementById("insight-box").innerHTML =
    `Sebagian besar produk retail terkonsentrasi pada kisaran harga <strong>${formatRupiahLengkap(maxBin.x0)} s.d. ${formatRupiahLengkap(maxBin.x1)}</strong>, dengan total frekuensi mencapai <strong>${maxBin.length} item</strong> (sekitar <strong>${percentage}%</strong> dari katalog produk).`;
}

function loadCsv(paths) {
  const parse = d => ({
    Item_MRP: +d.Item_MRP
  });

  const tryLoad = i => {
    if (i >= paths.length) return Promise.reject(new Error("CSV tidak ditemukan"));
    return d3.csv(paths[i], parse).catch(() => tryLoad(i + 1));
  };

  return tryLoad(0);
}

function formatRupiahSingkat(angka) {
  if (angka === 0) return "Rp 0";
  if (angka >= 1_000_000) {
    const val = angka / 1_000_000;
    return "Rp " + (Number.isInteger(val) ? val.toFixed(0) : val.toFixed(1)) + " Jt";
  }
  if (angka >= 1_000) {
    return "Rp " + (angka / 1_000).toFixed(0) + " Rb";
  }
  return "Rp " + angka;
}

function formatRupiahLengkap(angka) {
  return "Rp " + Math.round(angka).toLocaleString("id-ID");
}

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
