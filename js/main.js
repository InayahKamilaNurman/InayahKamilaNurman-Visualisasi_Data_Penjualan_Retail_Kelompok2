// Kelompok 2 - dashboard controller

const DATA_PATHS = [
  "Data/Dataset_Visdat_Cleaned.csv",
  "data/Dataset_Visdat_Cleaned.csv"
];

// load data
loadCsv(DATA_PATHS).then(data => {

  const totalSales       = d3.sum(data, d => d.Item_Outlet_Sales);
  const totalTransaksi   = data.length;
  const rataRata         = totalSales / totalTransaksi;
  const jumlahOutlet     = new Set(data.map(d => d.Outlet_Identifier)).size;

  // animasi angka
  animateCount("stat-total-sales",  totalSales,     formatMiliar);
  animateCount("stat-total-items",  totalTransaksi, d => Math.round(d).toLocaleString("id-ID"));
  animateCount("stat-avg-sales",    rataRata,       formatJuta);
  animateCount("stat-outlet-count", jumlahOutlet,   d => Math.round(d).toString());

}).catch(err => {
  console.error("Gagal load data:", err);
  ["stat-total-sales","stat-total-items","stat-avg-sales","stat-outlet-count"]
    .forEach(id => { document.getElementById(id).textContent = "-"; });
});

// coba load dari beberapa path
function loadCsv(paths) {
  const parse = d => ({
    Item_Outlet_Sales: +d.Item_Outlet_Sales,
    Outlet_Identifier: d.Outlet_Identifier
  });
  const tryLoad = i => {
    if (i >= paths.length) return Promise.reject(new Error("CSV tidak ditemukan"));
    return d3.csv(paths[i], parse).catch(() => tryLoad(i + 1));
  };
  return tryLoad(0);
}

// animasi counter
function animateCount(id, target, formatter) {
  const el = document.getElementById(id);
  if (!el) return;
  const duration  = 1200;
  const startTime = performance.now();
  function update(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const ease     = progress * (2 - progress);
    el.textContent = formatter(target * ease);
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = formatter(target);
  }
  requestAnimationFrame(update);
}

// format miliar — untuk total penjualan
function formatMiliar(angka) {
  if (angka === 0) return "0";
  const val = angka / 1_000_000_000;
  return (Number.isInteger(Math.round(val * 10) / 10)
    ? val.toFixed(0)
    : val.toFixed(1)) + " M";
}

// format juta — untuk rerata transaksi
function formatJuta(angka) {
  if (angka === 0) return "0";
  const val = angka / 1_000_000;
  return (Number.isInteger(Math.round(val * 10) / 10)
    ? val.toFixed(0)
    : val.toFixed(1)) + " Jt";
}