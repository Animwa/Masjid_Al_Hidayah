// ==========================================
// FRONTEND LOGIC & INTEGRASI API (UPDATED)
// ==========================================

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxDcy4oZdL73L5jqiXHIjNNEHHav1pHnzuywZumATCpB9coU-Rz8g88zfXFYCppo1A2dA/exec"; // Masukkan Web App URL Anda

let appData = {
  pengurus: [],
  inventaris: [],
  jamaah: [],
  presensi: [],
  admins: []
};

let currentAdmin = null;
let currentKelompok = "Caberawit";
let currentKelas = "Kelas 1";
let activeFormType = null;
let rekapChartInstance = null;

document.addEventListener("DOMContentLoaded", () => {
  setDefaultDate();
  loadAllData();
  switchTab("pengurus");
});

function setDefaultDate() {
  const today = new Date();
  const dateInput = document.getElementById("presensi-date");
  if (dateInput) {
    dateInput.value = today.toISOString().split("T")[0];
    updateDayLabel();
  }
}

function updateDayLabel() {
  const dateInput = document.getElementById("presensi-date").value;
  if (!dateInput) return;
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const d = new Date(dateInput);
  document.getElementById("presensi-day").value = days[d.getDay()];
}

async function loadAllData() {
  showMessage("Memuat data dari Google Sheets...", "info");
  try {
    const res = await fetch(`${SCRIPT_URL}?action=get_all_data`);
    const json = await res.json();
    if (json.success) {
      appData = json;
      renderAllViews();
      hideMessage();
    } else {
      showMessage("Gagal memuat data: " + json.error, "error");
    }
  } catch (err) {
    showMessage("Gagal terhubung ke Google Apps Script URL. Pastikan SCRIPT_URL sudah terpasang.", "error");
  }
}

function renderAllViews() {
  renderPengurus();
  renderInventaris();
  renderJamaah();
  renderPresensiTable();
  if (document.getElementById("view-rekapitulasi").classList.contains("hidden") === false) {
    renderChart();
  }
}

function switchTab(tabName) {
  document.querySelectorAll(".view-section").forEach(s => s.classList.add("hidden"));
  document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));

  document.getElementById(`view-${tabName}`).classList.remove("hidden");
  document.getElementById(`tab-${tabName}`).classList.add("active");

  const subnav = document.getElementById("subnav-container");
  const classnav = document.getElementById("classnav-container");

  if (tabName === "kelompok") {
    subnav.classList.remove("hidden");
    classnav.classList.remove("hidden");
    selectKelompok(currentKelompok);
  } else {
    subnav.classList.add("hidden");
    classnav.classList.add("hidden");
  }

  if (tabName === "rekapitulasi") {
    renderChart();
  }
}

function selectKelompok(kelompok) {
  currentKelompok = kelompok;
  document.querySelectorAll(".subnav-btn").forEach(b => b.classList.remove("active"));
  
  const idMap = {
    "Caberawit": "sub-caberawit",
    "Pra Remaja": "sub-pra-remaja",
    "Remaja": "sub-remaja",
    "Muda-Mudi": "sub-muda-mudi",
    "Bapak-Bapak": "sub-bapak",
    "Ibu-Ibu": "sub-ibu"
  };
  if (idMap[kelompok]) document.getElementById(idMap[kelompok]).classList.add("active");

  const classBtnContainer = document.getElementById("class-buttons");
  classBtnContainer.innerHTML = "";

  let classes = [];
  if (kelompok === "Caberawit") {
    classes = ["Kelas 1", "Kelas 2", "Kelas 3", "Kelas 4", "Kelas 5", "Kelas 6"];
  } else {
    classes = ["1 KELAS"];
  }

  classes.forEach((cls, idx) => {
    const btn = document.createElement("button");
    btn.className = `classnav-btn px-3 py-1 rounded-md bg-white border border-slate-300 hover:bg-teal-50 text-xs ${idx === 0 ? 'active' : ''}`;
    btn.innerText = cls;
    btn.onclick = () => selectKelas(cls, btn);
    classBtnContainer.appendChild(btn);
  });

  selectKelas(classes[0]);
}

function selectKelas(kelas, btnEl) {
  currentKelas = kelas;
  if (btnEl) {
    document.querySelectorAll(".classnav-btn").forEach(b => b.classList.remove("active"));
    btnEl.classList.add("active");
  }
  document.getElementById("presensi-class-title").innerText = `Presensi: ${currentKelompok} (${currentKelas})`;
  renderPresensiTable();
}

function calculateAge(dobString) {
  if (!dobString) return "-";
  const dob = new Date(dobString);
  const diffMs = Date.now() - dob.getTime();
  const ageDate = new Date(diffMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970) + " Thn";
}

function renderPengurus() {
  const tbody = document.getElementById("table-pengurus-body");
  tbody.innerHTML = appData.pengurus.map(p => `
    <tr class="bg-white border-b hover:bg-slate-50">
      <td class="px-6 py-4 font-semibold text-slate-800">${p.Nama}</td>
      <td class="px-6 py-4">${p.Jabatan}</td>
      <td class="px-6 py-4">${p.NoHP || '-'}</td>
      <td class="px-6 py-4"><span class="px-2 py-1 rounded-full text-xs font-semibold ${p.Status === 'Aktif' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}">${p.Status}</span></td>
      <td class="px-6 py-4 admin-only ${currentAdmin ? '' : 'hidden'}">
        <button onclick="deleteRow('Pengurus', '${p.ID}')" class="text-rose-600 hover:text-rose-800"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `).join("");
}

function renderInventaris() {
  const tbody = document.getElementById("table-inventaris-body");
  tbody.innerHTML = appData.inventaris.map(i => `
    <tr class="bg-white border-b hover:bg-slate-50">
      <td class="px-6 py-4 font-semibold text-slate-800">${i.NamaBarang}</td>
      <td class="px-6 py-4">${i.Jumlah}</td>
      <td class="px-6 py-4"><span class="px-2 py-1 rounded-full text-xs font-semibold ${i.Kondisi === 'Baik' ? 'bg-teal-100 text-teal-800' : 'bg-rose-100 text-rose-800'}">${i.Kondisi}</span></td>
      <td class="px-6 py-4">${i.TanggalMasuk || '-'}</td>
      <td class="px-6 py-4">${i.Keterangan || '-'}</td>
      <td class="px-6 py-4 admin-only ${currentAdmin ? '' : 'hidden'}">
        <button onclick="deleteRow('Inventaris', '${i.ID}')" class="text-rose-600 hover:text-rose-800"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `).join("");
}

// RENDER JAMAAH DENGAN TOMBOL EDIT & KELOMPOK/KELAS
function renderJamaah() {
  const tbody = document.getElementById("table-jamaah-body");
  tbody.innerHTML = appData.jamaah.map(j => `
    <tr class="bg-white border-b hover:bg-slate-50">
      <td class="px-4 py-3 text-xs font-mono text-slate-500">${j.ID}</td>
      <td class="px-4 py-3 font-semibold text-slate-800">${j.Nama}</td>
      <td class="px-4 py-3">${j.TanggalLahir ? j.TanggalLahir.toString().split("T")[0] : '-'} <span class="text-xs text-emerald-600 font-bold">(${calculateAge(j.TanggalLahir)})</span></td>
      <td class="px-4 py-3"><span class="px-2 py-1 rounded bg-teal-50 text-teal-700 font-semibold text-xs">${j.Kelompok || 'Unassigned'}</span></td>
      <td class="px-4 py-3"><span class="px-2 py-1 rounded bg-slate-100 text-slate-700 font-semibold text-xs">${j.Kelas || '1 KELAS'}</span></td>
      <td class="px-4 py-3">${j.Gender || '-'}</td>
      <td class="px-4 py-3">${j.Alamat || '-'}</td>
      <td class="px-4 py-3"><span class="px-2 py-1 rounded-full text-xs font-semibold ${j.Status === 'Aktif' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}">${j.Status}</span></td>
      <td class="px-4 py-3 text-center admin-only space-x-2 ${currentAdmin ? '' : 'hidden'}">
        <button onclick="editJamaah('${j.ID}')" class="text-amber-600 hover:text-amber-800 font-semibold"><i class="fa-solid fa-pen-to-square"></i></button>
        <button onclick="deleteRow('Jamaah', '${j.ID}')" class="text-rose-600 hover:text-rose-800"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `).join("");
}

// RENDER PRESENSI DENGAN FILTER KELOMPOK & KELAS TERPISAH
function renderPresensiTable() {
  // FILTER UTAMA: Hanya jamaah dengan Status 'Aktif' DAN Kelompok & Kelas yang SESUAI
  const filteredJamaah = appData.jamaah.filter(j => {
    const matchStatus = j.Status === "Aktif";
    const matchKelompok = (j.Kelompok || "Caberawit") === currentKelompok;
    const matchKelas = (j.Kelas || "1 KELAS") === currentKelas;
    return matchStatus && matchKelompok && matchKelas;
  });

  const tbody = document.getElementById("table-presensi-body");

  if (filteredJamaah.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="px-4 py-6 text-center text-slate-400 italic">
          Belum ada jamaah yang terdaftar di kelompok <b>${currentKelompok} (${currentKelas})</b>.<br>
          <span class="text-xs text-slate-500">Buka menu <b>Data Jamaah</b> untuk menambahkan atau menyesuaikan kelas jamaah.</span>
        </td>
      </tr>
    `;
  } else {
    tbody.innerHTML = filteredJamaah.map((j, idx) => `
      <tr class="bg-white border-b hover:bg-slate-50">
        <td class="px-4 py-3 font-medium text-slate-800">${j.Nama}</td>
        <td class="px-4 py-3 text-center">
          <input type="radio" name="presensi-${idx}" value="Hadir" checked class="w-4 h-4 text-emerald-600 focus:ring-emerald-500">
        </td>
        <td class="px-4 py-3 text-center">
          <input type="radio" name="presensi-${idx}" value="Izin" class="w-4 h-4 text-amber-500 focus:ring-amber-500">
        </td>
        <td class="px-4 py-3 text-center">
          <input type="radio" name="presensi-${idx}" value="Alfa" class="w-4 h-4 text-rose-600 focus:ring-rose-500">
        </td>
      </tr>
    `).join("");
  }

  updateRekapMingguan();
}

function updateRekapMingguan() {
  const now = new Date();
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  
  let h = 0, i = 0, a = 0;
  appData.presensi.forEach(p => {
    if (p.Kelompok === currentKelompok && p.Kelas === currentKelas) {
      const pDate = new Date(p.Tanggal);
      if (pDate >= startOfWeek) {
        if (p.StatusPresensi === "Hadir") h++;
        if (p.StatusPresensi === "Izin") i++;
        if (p.StatusPresensi === "Alfa") a++;
      }
    }
  });

  document.getElementById("stat-hadir").innerText = h;
  document.getElementById("stat-izin").innerText = i;
  document.getElementById("stat-alfa").innerText = a;
  document.getElementById("rekap-mingguan-title").innerText = `Rekapan Presensi Minggu Ini: ${currentKelompok} (${currentKelas})`;
}

async function submitPresensi() {
  if (!currentAdmin) return alert("Akses Admin diperlukan!");
  
  const date = document.getElementById("presensi-date").value;
  const day = document.getElementById("presensi-day").value;

  const filteredJamaah = appData.jamaah.filter(j => {
    return j.Status === "Aktif" && (j.Kelompok || "Caberawit") === currentKelompok && (j.Kelas || "1 KELAS") === currentKelas;
  });

  if (filteredJamaah.length === 0) {
    return alert("Tidak ada jamaah di kelas ini untuk disimpan presensinya.");
  }

  const records = [];
  filteredJamaah.forEach((j, idx) => {
    const radios = document.getElementsByName(`presensi-${idx}`);
    let selectedStatus = "Hadir";
    for (let r of radios) {
      if (r.checked) selectedStatus = r.value;
    }
    records.push({
      kelompok: currentKelompok,
      kelas: currentKelas,
      tanggal: date,
      hari: day,
      nama: j.Nama,
      status: selectedStatus
    });
  });

  showMessage("Menyimpan data presensi...", "info");
  try {
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "save_presensi_batch", records: records })
    });
    const json = await res.json();
    if (json.success) {
      showMessage("Presensi berhasil disimpan!", "success");
      loadAllData();
    }
  } catch (err) {
    showMessage("Gagal menyimpan presensi.", "error");
  }
}

// ==========================================
// RENDER GRAFIK DIAGRAM GARIS (LINE CHART) DENGAN PERSENTASE
// ==========================================

// Inisialisasi Register Plugin DataLabels untuk Chart.js
if (typeof ChartDataLabels !== 'undefined') {
  Chart.register(ChartDataLabels);
}

function onChartFilterChange() {
  const kVal = document.getElementById("chart-kelompok-select").value;
  const kelasSelect = document.getElementById("chart-kelas-select");
  kelasSelect.innerHTML = "";

  let options = [];
  if (kVal === "Caberawit") {
    options = ["Kelas 1", "Kelas 2", "Kelas 3", "Kelas 4", "Kelas 5", "Kelas 6"];
  } else {
    options = ["1 KELAS"];
  }

  options.forEach(opt => {
    kelasSelect.innerHTML += `<option value="${opt}">${opt}</option>`;
  });

  renderChart();
}

function renderChart() {
  const chartCanvas = document.getElementById("rekapChart");
  if (!chartCanvas) return;
  
  const ctx = chartCanvas.getContext("2d");

  // Ambil filter kelompok & kelas yang dipilih
  const selectedKelompok = document.getElementById("chart-kelompok-select") ? document.getElementById("chart-kelompok-select").value : "Caberawit";
  const selectedKelas = document.getElementById("chart-kelas-select") ? document.getElementById("chart-kelas-select").value : "Kelas 1";

  // Tanggal 30 hari terakhir
  const now = new Date();
  const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

  // Filter data presensi sesuai Kelompok & Kelas selama 1 bulan terakhir
  const filteredPresensi = appData.presensi.filter(p => {
    const pDate = new Date(p.Tanggal);
    return (
      (p.Kelompok || "Caberawit") === selectedKelompok &&
      (p.Kelas || "1 KELAS") === selectedKelas &&
      pDate >= oneMonthAgo
    );
  });

  // Kelompokkan data berdasarkan Tanggal unik
  let dailyDataMap = {}; // { "YYYY-MM-DD": { Hadir: 0, Izin: 0, Alfa: 0, Total: 0 } }

  filteredPresensi.forEach(p => {
    let rawDate = p.Tanggal ? p.Tanggal.toString().split("T")[0] : "";
    if (!rawDate) return;

    if (!dailyDataMap[rawDate]) {
      dailyDataMap[rawDate] = { Hadir: 0, Izin: 0, Alfa: 0, Total: 0 };
    }

    if (p.StatusPresensi === "Hadir") dailyDataMap[rawDate].Hadir++;
    if (p.StatusPresensi === "Izin") dailyDataMap[rawDate].Izin++;
    if (p.StatusPresensi === "Alfa") dailyDataMap[rawDate].Alfa++;
    dailyDataMap[rawDate].Total++;
  });

  // Urutkan tanggal dari terlama ke terbaru
  const sortedDates = Object.keys(dailyDataMap).sort();

  // Format label tanggal (DD/MM) & kalkulasi persentase
  let labels = [];
  let hadirData = [];
  let izinData = [];
  let alfaData = [];

  sortedDates.forEach(dateStr => {
    const dParts = dateStr.split("-");
    const formattedLabel = `${dParts[2]}/${dParts[1]}`; // Contoh: "29/07"
    labels.push(formattedLabel);

    const stats = dailyDataMap[dateStr];
    const total = stats.Total || 1;

    // Kalkulasi persentase (%)
    const pctHadir = Math.round((stats.Hadir / total) * 100);
    const pctIzin = Math.round((stats.Izin / total) * 100);
    const pctAlfa = Math.round((stats.Alfa / total) * 100);

    hadirData.push(pctHadir);
    izinData.push(pctIzin);
    alfaData.push(pctAlfa);
  });

  // Hancurkan Chart lama jika sudah ada
  if (rekapChartInstance) rekapChartInstance.destroy();

  // Jika data kosong
  if (labels.length === 0) {
    labels = ["Belum Ada Data"];
    hadirData = [0];
    izinData = [0];
    alfaData = [0];
  }

  // Buat Diagram Garis Baru (Line Chart)
  rekapChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Hadir (%)",
          data: hadirData,
          borderColor: "#10b981", // Hijau
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          borderWidth: 3,
          pointBackgroundColor: "#10b981",
          pointRadius: 5,
          pointHoverRadius: 7,
          tension: 0.3, // Curve halus
          fill: true
        },
        {
          label: "Izin (%)",
          data: izinData,
          borderColor: "#f59e0b", // Kuning/Amber
          backgroundColor: "rgba(245, 158, 11, 0.1)",
          borderWidth: 3,
          pointBackgroundColor: "#f59e0b",
          pointRadius: 5,
          pointHoverRadius: 7,
          tension: 0.3,
          fill: false
        },
        {
          label: "Alfa (%)",
          data: alfaData,
          borderColor: "#ef4444", // Merah
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          borderWidth: 3,
          pointBackgroundColor: "#ef4444",
          pointRadius: 5,
          pointHoverRadius: 7,
          tension: 0.3,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: { font: { family: "sans-serif", weight: "bold", size: 12 } }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${context.raw}%`;
            }
          }
        },
        // INDIKATOR PERSENTASE PADA TITIK-TITIK DIAGRAM GARIS
        datalabels: {
          anchor: "end",
          align: "top",
          offset: 4,
          formatter: function(value) {
            return value > 0 ? value + "%" : ""; // Hanya tampilkan jika > 0%
          },
          font: {
            size: 10,
            weight: "bold"
          },
          color: function(context) {
            return context.dataset.borderColor; // Warna teks sesuai warna garis
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100, // Maksimal 100%
          title: { display: true, text: "Persentase Kehadiran (%)", font: { size: 11 } },
          ticks: {
            callback: function(val) { return val + "%"; }
          }
        },
        x: {
          title: { display: true, text: "Tanggal Presensi", font: { size: 11 } }
        }
      }
    }
  });
}

// Panggil onChartFilterChange saat pertama kali berpindah ke tab Rekapitulasi
const prevSwitchTabFunc = switchTab;
switchTab = function(tabName) {
  prevSwitchTabFunc(tabName);
  if (tabName === "rekapitulasi") {
    onChartFilterChange();
  }
};

function openLoginModal() {
  document.getElementById("modal-login").classList.remove("hidden");
}

function openAddAdminModal() {
  document.getElementById("modal-add-admin").classList.remove("hidden");
}

function closeModal(id) {
  document.getElementById(id).classList.add("hidden");
}

async function handleLogin(e) {
  e.preventDefault();
  const nama = document.getElementById("login-nama").value;
  const pin = document.getElementById("login-pin").value;

  showMessage("Verifikasi Admin...", "info");
  try {
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "login", nama: nama, pin: pin })
    });
    const json = await res.json();
    if (json.success) {
      currentAdmin = { nama: json.admin.nama, role: json.admin.role, pin: pin };
      updateAdminUI();
      closeModal("modal-login");
      showMessage(`Selamat datang, ${currentAdmin.nama}!`, "success");
    } else {
      showMessage(json.message, "error");
    }
  } catch (err) {
    showMessage("Gagal verifikasi login.", "error");
  }
}

function logoutAdmin() {
  currentAdmin = null;
  updateAdminUI();
  showMessage("Anda telah logout dari mode Admin.", "info");
}

function updateAdminUI() {
  const adminElements = document.querySelectorAll(".admin-only");
  if (currentAdmin) {
    adminElements.forEach(el => el.classList.remove("hidden"));
    document.getElementById("btn-login-modal").classList.add("hidden");
    document.getElementById("btn-logout").classList.remove("hidden");
    document.getElementById("admin-badge").classList.remove("hidden");
    document.getElementById("admin-name-display").innerText = currentAdmin.nama;

    if (currentAdmin.role === "Utama") {
      document.getElementById("btn-admin-manage").classList.remove("hidden");
    } else {
      document.getElementById("btn-admin-manage").classList.add("hidden");
    }
  } else {
    adminElements.forEach(el => el.classList.add("hidden"));
    document.getElementById("btn-login-modal").classList.remove("hidden");
    document.getElementById("btn-logout").classList.add("hidden");
    document.getElementById("admin-badge").classList.add("hidden");
    document.getElementById("btn-admin-manage").classList.add("hidden");
  }
  renderAllViews();
}

async function handleAddAdmin(e) {
  e.preventDefault();
  const nama = document.getElementById("new-admin-nama").value;
  const pin = document.getElementById("new-admin-pin").value;

  try {
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "add_admin", nama: nama, pin: pin, adminSession: currentAdmin })
    });
    const json = await res.json();
    if (json.success) {
      showMessage(json.message, "success");
      closeModal("modal-add-admin");
    } else {
      showMessage(json.message, "error");
    }
  } catch (err) {
    showMessage("Gagal menambahkan admin.", "error");
  }
}

function openFormPengurus() {
  activeFormType = "Pengurus";
  document.getElementById("modal-form-title").innerText = "Tambah Data Pengurus";
  document.getElementById("modal-form-fields").innerHTML = `
    <input type="hidden" name="ID" value="">
    <div><label class="block text-xs font-semibold mb-1">Nama Lengkap</label><input type="text" name="Nama" required class="w-full border rounded px-3 py-1.5 text-sm"></div>
    <div><label class="block text-xs font-semibold mb-1">Jabatan</label><input type="text" name="Jabatan" required class="w-full border rounded px-3 py-1.5 text-sm"></div>
    <div><label class="block text-xs font-semibold mb-1">No. HP</label><input type="text" name="NoHP" class="w-full border rounded px-3 py-1.5 text-sm"></div>
    <div><label class="block text-xs font-semibold mb-1">Status</label><select name="Status" class="w-full border rounded px-3 py-1.5 text-sm"><option>Aktif</option><option>Non-Aktif</option></select></div>
  `;
  document.getElementById("modal-form").classList.remove("hidden");
}

function openFormInventaris() {
  activeFormType = "Inventaris";
  document.getElementById("modal-form-title").innerText = "Tambah Inventaris Barang";
  document.getElementById("modal-form-fields").innerHTML = `
    <input type="hidden" name="ID" value="">
    <div><label class="block text-xs font-semibold mb-1">Nama Barang</label><input type="text" name="NamaBarang" required class="w-full border rounded px-3 py-1.5 text-sm"></div>
    <div><label class="block text-xs font-semibold mb-1">Jumlah</label><input type="number" name="Jumlah" required class="w-full border rounded px-3 py-1.5 text-sm" value="1"></div>
    <div><label class="block text-xs font-semibold mb-1">Kondisi</label><select name="Kondisi" class="w-full border rounded px-3 py-1.5 text-sm"><option>Baik</option><option>Rusak Ringan</option><option>Rusak Berat</option></select></div>
    <div><label class="block text-xs font-semibold mb-1">Tanggal Masuk</label><input type="date" name="TanggalMasuk" class="w-full border rounded px-3 py-1.5 text-sm"></div>
    <div><label class="block text-xs font-semibold mb-1">Keterangan</label><textarea name="Keterangan" class="w-full border rounded px-3 py-1.5 text-sm"></textarea></div>
  `;
  document.getElementById("modal-form").classList.remove("hidden");
}

// FORM DYNAMIC JAMAAH (TAMBAH & EDIT)
function openFormJamaah(data = null) {
  activeFormType = "Jamaah";
  document.getElementById("modal-form-title").innerText = data ? "Edit Data Jamaah" : "Tambah Data Jamaah";
  
  const formattedDob = data && data.TanggalLahir ? data.TanggalLahir.toString().split("T")[0] : "";

  document.getElementById("modal-form-fields").innerHTML = `
    <input type="hidden" name="ID" value="${data ? data.ID : ''}">
    <div><label class="block text-xs font-semibold mb-1">Nama Lengkap</label><input type="text" name="Nama" value="${data ? data.Nama : ''}" required class="w-full border rounded px-3 py-1.5 text-sm"></div>
    <div><label class="block text-xs font-semibold mb-1">Tanggal Lahir</label><input type="date" name="TanggalLahir" value="${formattedDob}" required class="w-full border rounded px-3 py-1.5 text-sm"></div>
    
    <div>
      <label class="block text-xs font-semibold mb-1">Kelompok Usia</label>
      <select name="Kelompok" id="field-kelompok" onchange="onKelompokChange()" class="w-full border rounded px-3 py-1.5 text-sm">
        <option value="Caberawit" ${data && data.Kelompok === 'Caberawit' ? 'selected' : ''}>Caberawit (SD)</option>
        <option value="Pra Remaja" ${data && data.Kelompok === 'Pra Remaja' ? 'selected' : ''}>Pra Remaja (SMP)</option>
        <option value="Remaja" ${data && data.Kelompok === 'Remaja' ? 'selected' : ''}>Remaja (SMA)</option>
        <option value="Muda-Mudi" ${data && data.Kelompok === 'Muda-Mudi' ? 'selected' : ''}>Muda-Mudi</option>
        <option value="Bapak-Bapak" ${data && data.Kelompok === 'Bapak-Bapak' ? 'selected' : ''}>Bapak-Bapak</option>
        <option value="Ibu-Ibu" ${data && data.Kelompok === 'Ibu-Ibu' ? 'selected' : ''}>Ibu-Ibu</option>
      </select>
    </div>

    <div>
      <label class="block text-xs font-semibold mb-1">Kelas</label>
      <select name="Kelas" id="field-kelas" class="w-full border rounded px-3 py-1.5 text-sm"></select>
    </div>

    <div>
      <label class="block text-xs font-semibold mb-1">Gender</label>
      <select name="Gender" class="w-full border rounded px-3 py-1.5 text-sm">
        <option value="Laki-Laki" ${data && data.Gender === 'Laki-Laki' ? 'selected' : ''}>Laki-Laki</option>
        <option value="Perempuan" ${data && data.Gender === 'Perempuan' ? 'selected' : ''}>Perempuan</option>
      </select>
    </div>
    
    <div><label class="block text-xs font-semibold mb-1">Alamat</label><textarea name="Alamat" class="w-full border rounded px-3 py-1.5 text-sm">${data ? data.Alamat : ''}</textarea></div>
    <div>
      <label class="block text-xs font-semibold mb-1">Status</label>
      <select name="Status" class="w-full border rounded px-3 py-1.5 text-sm">
        <option value="Aktif" ${data && data.Status === 'Aktif' ? 'selected' : ''}>Aktif</option>
        <option value="Pindah/Non-Aktif" ${data && data.Status === 'Pindah/Non-Aktif' ? 'selected' : ''}>Pindah/Non-Aktif</option>
      </select>
    </div>
  `;

  onKelompokChange(data ? data.Kelas : null);
  document.getElementById("modal-form").classList.remove("hidden");
}

function onKelompokChange(selectedKelas = null) {
  const kVal = document.getElementById("field-kelompok").value;
  const kelasSelect = document.getElementById("field-kelas");
  kelasSelect.innerHTML = "";

  let options = [];
  if (kVal === "Caberawit") {
    options = ["Kelas 1", "Kelas 2", "Kelas 3", "Kelas 4", "Kelas 5", "Kelas 6"];
  } else {
    options = ["1 KELAS"];
  }

  options.forEach(opt => {
    const isSelected = selectedKelas === opt ? "selected" : "";
    kelasSelect.innerHTML += `<option value="${opt}" ${isSelected}>${opt}</option>`;
  });
}

function editJamaah(id) {
  const item = appData.jamaah.find(j => String(j.ID) === String(id));
  if (item) {
    openFormJamaah(item);
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const dataObj = {};
  formData.forEach((value, key) => dataObj[key] = value);

  const actionName = `save_${activeFormType.toLowerCase()}`;
  showMessage("Menyimpan...", "info");

  try {
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: actionName, data: dataObj })
    });
    const json = await res.json();
    if (json.success) {
      showMessage(json.message, "success");
      closeModal("modal-form");
      loadAllData();
    }
  } catch (err) {
    showMessage("Gagal menyimpan data.", "error");
  }
}

async function deleteRow(sheetName, id) {
  if (!confirm("Apakah Anda yakin ingin menghapus data ini?")) return;
  const actionName = `delete_${sheetName.toLowerCase()}`;
  showMessage("Menghapus data...", "info");

  try {
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: actionName, id: id })
    });
    const json = await res.json();
    if (json.success) {
      showMessage(json.message, "success");
      loadAllData();
    }
  } catch (err) {
    showMessage("Gagal menghapus data.", "error");
  }
}

function showMessage(msg, type) {
  const el = document.getElementById("status-message");
  el.innerText = msg;
  el.classList.remove("hidden", "bg-emerald-100", "text-emerald-800", "bg-rose-100", "text-rose-800", "bg-amber-100", "text-amber-800");

  if (type === "success") el.classList.add("bg-emerald-100", "text-emerald-800");
  else if (type === "error") el.classList.add("bg-rose-100", "text-rose-800");
  else el.classList.add("bg-amber-100", "text-amber-800");
}

function hideMessage() {
  document.getElementById("status-message").classList.add("hidden");
}
// ==========================================
// HAMBURGER MENU TOGGLE UNTUK SELULER
// ==========================================
function toggleMobileMenu() {
  const menuContainer = document.getElementById("nav-menu-container");
  const icon = document.getElementById("hamburger-icon");
  
  if (menuContainer) {
    menuContainer.classList.toggle("show-mobile-menu");
    
    // Ganti ikon garis 3 (bars) <-> silang (xmark)
    if (menuContainer.classList.contains("show-mobile-menu")) {
      icon.classList.remove("fa-bars");
      icon.classList.add("fa-xmark");
    } else {
      icon.classList.remove("fa-xmark");
      icon.classList.add("fa-bars");
    }
  }
}

// Otomatis menutup dropdown menu saat tab diklik pada layar HP
const originalSwitchTab = switchTab;
switchTab = function(tabName) {
  originalSwitchTab(tabName);
  const menuContainer = document.getElementById("nav-menu-container");
  const icon = document.getElementById("hamburger-icon");
  
  if (window.innerWidth < 768 && menuContainer && menuContainer.classList.contains("show-mobile-menu")) {
    menuContainer.classList.remove("show-mobile-menu");
    if (icon) {
      icon.classList.remove("fa-xmark");
      icon.classList.add("fa-bars");
    }
  }
}
