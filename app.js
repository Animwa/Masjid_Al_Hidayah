// ==========================================
// FRONTEND LOGIC & INTEGRASI API WEB MASJID AL HIDAYAH (CRASH & BLANK SAFE)
// ==========================================

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzPCfnbwqFCNCeerNy2cCgapsrXkVWL0jnnK_bHS4RUsGS1Wx6DB-XPGHn-Fr_-gGsXcA/exec";

let appData = {
  pengurus: [],
  inventaris: [],
  jamaah: [],
  presensi: [],
  admins: []
};

let currentAdmin = null;
let currentKelompok = "Caberawit";
let currentKelas = "PAUD";
let activeFormType = null;
let rekapChartInstance = null;

if (typeof ChartDataLabels !== 'undefined') {
  Chart.register(ChartDataLabels);
}

document.addEventListener("DOMContentLoaded", () => {
  setDefaultDate();
  loadAllData();
  switchTab("pengurus");
});

function setDefaultDate() {
  const today = new Date();
  const dateInput = document.getElementById("presensi-date");
  if (dateInput) {
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${year}-${month}-${day}`;
    updateDayLabel();
  }
}

function updateDayLabel() {
  const dateInput = document.getElementById("presensi-date");
  if (!dateInput || !dateInput.value) return;
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const d = new Date(dateInput.value + "T00:00:00");
  const dayEl = document.getElementById("presensi-day");
  if (dayEl) dayEl.value = days[d.getDay()];
  
  renderPresensiTable();
}

async function loadAllData() {
  showMessage("Memuat data dari Google Sheets...", "info");
  try {
    const res = await fetch(`${SCRIPT_URL}?action=get_all_data`);
    const json = await res.json();
    if (json.success) {
      appData = {
        pengurus: Array.isArray(json.pengurus) ? json.pengurus : [],
        inventaris: Array.isArray(json.inventaris) ? json.inventaris : [],
        jamaah: Array.isArray(json.jamaah) ? json.jamaah : [],
        presensi: Array.isArray(json.presensi) ? json.presensi : [],
        admins: Array.isArray(json.admins) ? json.admins : []
      };
      renderAllViews();
      hideMessage();
    } else {
      showMessage("Gagal memuat data: " + (json.error || json.message), "error");
    }
  } catch (err) {
    showMessage("Gagal terhubung ke Google Apps Script.", "error");
  }
}

function renderAllViews() {
  renderPengurus();
  renderInventaris();
  renderJamaah();
  renderPresensiTable();
  
  const rekapSection = document.getElementById("view-rekapitulasi");
  if (rekapSection && !rekapSection.classList.contains("hidden")) {
    onChartFilterChange();
  }
}

function switchTab(tabName) {
  document.querySelectorAll(".view-section").forEach(s => s.classList.add("hidden"));
  document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));

  const targetView = document.getElementById(`view-${tabName}`);
  const targetTab = document.getElementById(`tab-${tabName}`);
  if (targetView) targetView.classList.remove("hidden");
  if (targetTab) targetTab.classList.add("active");

  const subnav = document.getElementById("subnav-container");
  const classnav = document.getElementById("classnav-container");

  if (tabName === "kelompok") {
    if (subnav) subnav.classList.remove("hidden");
    selectKelompok(currentKelompok);
  } else {
    if (subnav) subnav.classList.add("hidden");
    if (classnav) classnav.classList.add("hidden");
  }

  if (tabName === "rekapitulasi") {
    onChartFilterChange();
  }

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
  if (idMap[kelompok] && document.getElementById(idMap[kelompok])) {
    document.getElementById(idMap[kelompok]).classList.add("active");
  }

  const classnav = document.getElementById("classnav-container");
  const classBtnContainer = document.getElementById("class-buttons");

  if (kelompok === "Caberawit") {
    const classes = ["PAUD", "Tilawati 1", "Tilawati 2", "Tilawati 3", "Tilawati 4", "Tilawati 5", "Al-Qur'an"];
    if (classnav) classnav.classList.remove("hidden");
    if (classBtnContainer) {
      classBtnContainer.innerHTML = "";
      classes.forEach((cls, idx) => {
        const btn = document.createElement("button");
        btn.className = `classnav-btn px-3 py-1 rounded-md bg-white border border-slate-300 hover:bg-teal-50 text-xs shrink-0 ${idx === 0 ? 'active' : ''}`;
        btn.innerText = cls;
        btn.onclick = () => selectKelas(cls, btn);
        classBtnContainer.appendChild(btn);
      });
    }
    selectKelas("PAUD");
  } else {
    if (classnav) classnav.classList.add("hidden");
    selectKelas("Umum");
  }
}

function selectKelas(kelas, btnEl) {
  currentKelas = kelas;
  if (btnEl) {
    document.querySelectorAll(".classnav-btn").forEach(b => b.classList.remove("active"));
    btnEl.classList.add("active");
  }
  const titleEl = document.getElementById("presensi-class-title");
  if (titleEl) {
    if (currentKelompok === "Caberawit") {
      titleEl.innerText = `Presensi: ${currentKelompok} (${currentKelas})`;
    } else {
      titleEl.innerText = `Presensi: ${currentKelompok}`;
    }
  }
  renderPresensiTable();
}

function calculateAge(dobString) {
  if (!dobString) return "-";
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return "-";
  const diffMs = Date.now() - dob.getTime();
  const ageDate = new Date(diffMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970) + " Thn";
}

function renderPengurus() {
  const tbody = document.getElementById("table-pengurus-body");
  if (!tbody) return;
  const data = Array.isArray(appData.pengurus) ? appData.pengurus : [];
  tbody.innerHTML = data.map(p => `
    <tr class="bg-white border-b hover:bg-slate-50">
      <td class="px-4 sm:px-6 py-3.5 font-semibold text-slate-800">${p.Nama || '-'}</td>
      <td class="px-4 sm:px-6 py-3.5">${p.Jabatan || '-'}</td>
      <td class="px-4 sm:px-6 py-3.5">${p.NoHP || '-'}</td>
      <td class="px-4 sm:px-6 py-3.5"><span class="px-2 py-1 rounded-full text-xs font-semibold ${p.Status === 'Aktif' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}">${p.Status || 'Aktif'}</span></td>
      <td class="px-4 sm:px-6 py-3.5 text-center admin-only ${currentAdmin ? '' : 'hidden'}">
        <button onclick="deleteRow('Pengurus', '${p.ID}')" class="text-rose-600 hover:text-rose-800 p-1"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `).join("");
}

function renderInventaris() {
  const tbody = document.getElementById("table-inventaris-body");
  if (!tbody) return;
  const data = Array.isArray(appData.inventaris) ? appData.inventaris : [];
  tbody.innerHTML = data.map(i => `
    <tr class="bg-white border-b hover:bg-slate-50">
      <td class="px-4 sm:px-6 py-3.5 font-semibold text-slate-800">${i.NamaBarang || '-'}</td>
      <td class="px-4 sm:px-6 py-3.5">${i.Jumlah || 0}</td>
      <td class="px-4 sm:px-6 py-3.5"><span class="px-2 py-1 rounded-full text-xs font-semibold ${i.Kondisi === 'Baik' ? 'bg-teal-100 text-teal-800' : 'bg-rose-100 text-rose-800'}">${i.Kondisi || 'Baik'}</span></td>
      <td class="px-4 sm:px-6 py-3.5">${i.TanggalMasuk ? i.TanggalMasuk.toString().split("T")[0] : '-'}</td>
      <td class="px-4 sm:px-6 py-3.5">${i.Keterangan || '-'}</td>
      <td class="px-4 sm:px-6 py-3.5 text-center admin-only ${currentAdmin ? '' : 'hidden'}">
        <button onclick="deleteRow('Inventaris', '${i.ID}')" class="text-rose-600 hover:text-rose-800 p-1"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `).join("");
}

function renderJamaah() {
  const tbody = document.getElementById("table-jamaah-body");
  if (!tbody) return;

  const data = Array.isArray(appData.jamaah) ? appData.jamaah : [];

  tbody.innerHTML = data.map(j => {
    const kelompok = String(j.Kelompok || "Unassigned").trim();
    let displayKelas = (kelompok === "Caberawit") ? (j.Kelas || "PAUD") : "-";

    return `
      <tr class="bg-white border-b hover:bg-slate-50">
        <td class="px-3 sm:px-4 py-3 text-xs font-mono text-slate-500">${j.ID || '-'}</td>
        <td class="px-3 sm:px-4 py-3 font-semibold text-slate-800">${j.Nama || '-'}</td>
        <td class="px-3 sm:px-4 py-3 whitespace-nowrap">${j.TanggalLahir ? j.TanggalLahir.toString().split("T")[0] : '-'} <span class="text-xs text-emerald-600 font-bold">(${calculateAge(j.TanggalLahir)})</span></td>
        <td class="px-3 sm:px-4 py-3"><span class="px-2 py-1 rounded bg-teal-50 text-teal-700 font-semibold text-xs">${kelompok}</span></td>
        <td class="px-3 sm:px-4 py-3"><span class="px-2 py-1 rounded bg-slate-100 text-slate-700 font-semibold text-xs">${displayKelas}</span></td>
        <td class="px-3 sm:px-4 py-3">${j.Gender || '-'}</td>
        <td class="px-3 sm:px-4 py-3">${j.Alamat || '-'}</td>
        <td class="px-3 sm:px-4 py-3"><span class="px-2 py-1 rounded-full text-xs font-semibold ${j.Status === 'Aktif' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}">${j.Status || 'Aktif'}</span></td>
        <td class="px-3 sm:px-4 py-3 text-center admin-only space-x-2 ${currentAdmin ? '' : 'hidden'}">
          <button onclick="editJamaah('${j.ID}')" class="text-amber-600 hover:text-amber-800 font-semibold p-1"><i class="fa-solid fa-pen-to-square"></i></button>
          <button onclick="deleteRow('Jamaah', '${j.ID}')" class="text-rose-600 hover:text-rose-800 p-1"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `;
  }).join("");
}

function renderPresensiTable() {
  const jamaahList = Array.isArray(appData.jamaah) ? appData.jamaah : [];
  const presensiList = Array.isArray(appData.presensi) ? appData.presensi : [];

  const filteredJamaah = jamaahList.filter(j => {
    const matchStatus = String(j.Status || "Aktif").trim().toLowerCase() === "aktif";
    const matchKelompok = String(j.Kelompok || "Caberawit").trim().toLowerCase() === String(currentKelompok).trim().toLowerCase();
    
    let matchKelas = true;
    if (currentKelompok === "Caberawit") {
      matchKelas = String(j.Kelas || "").trim().toLowerCase() === String(currentKelas).trim().toLowerCase();
    }
    
    return matchStatus && matchKelompok && matchKelas;
  });

  const tbody = document.getElementById("table-presensi-body");
  if (!tbody) return;

  const displayTitle = (currentKelompok === "Caberawit") ? `${currentKelompok} (${currentKelas})` : currentKelompok;

  if (filteredJamaah.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="px-4 py-6 text-center text-slate-400 italic">
          Belum ada jamaah yang terdaftar di kelompok <b>${displayTitle}</b>.<br>
          <span class="text-xs text-slate-500">Buka menu <b>Data Jamaah</b> untuk menambahkan jamaah.</span>
        </td>
      </tr>
    `;
  } else {
    const selectedDateInput = document.getElementById("presensi-date");
    const targetDate = selectedDateInput ? selectedDateInput.value : "";

    let existingStatusMap = {};
    presensiList.forEach(p => {
      if (!p.Tanggal || !p.NamaJamaah) return;

      const pKel = String(p.Kelompok || "").trim().toLowerCase();
      const pKls = String(p.Kelas || "Umum").trim().toLowerCase();
      let pDateStr = "";

      if (p.Tanggal instanceof Date) {
        const y = p.Tanggal.getUTCFullYear();
        const m = String(p.Tanggal.getUTCMonth() + 1).padStart(2, '0');
        const d = String(p.Tanggal.getUTCDate()).padStart(2, '0');
        pDateStr = `${y}-${m}-${d}`;
      } else {
        pDateStr = String(p.Tanggal).split("T")[0].trim();
      }

      const checkKelas = (currentKelompok === "Caberawit") ? (pKls === String(currentKelas).trim().toLowerCase()) : true;

      if (pKel === String(currentKelompok).trim().toLowerCase() && checkKelas && pDateStr === targetDate) {
        existingStatusMap[String(p.NamaJamaah).trim().toLowerCase()] = {
          status: String(p.StatusPresensi || "Hadir").trim(),
          keterangan: String(p.Keterangan || "").trim()
        };
      }
    });

    const isReadOnly = !currentAdmin;
    const disabledRadio = isReadOnly ? "disabled cursor-not-allowed opacity-80" : "cursor-pointer";

    tbody.innerHTML = filteredJamaah.map((j, idx) => {
      const namaKey = String(j.Nama).trim().toLowerCase();
      const exData = existingStatusMap[namaKey] || { status: "Hadir", keterangan: "" };
      const savedStatus = exData.status;
      const savedKet = exData.keterangan;

      const isIzinChecked = (savedStatus === 'Izin');
      const disabledKet = (isReadOnly || !isIzinChecked) ? "disabled" : "";

      return `
        <tr class="bg-white border-b hover:bg-slate-50">
          <td class="px-4 py-3 font-medium text-slate-800">
            ${j.Nama}
            ${existingStatusMap[namaKey] ? `<span class="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">Tersimpan</span>` : ''}
          </td>
          <td class="px-3 py-3 text-center">
            <input type="radio" name="presensi-${idx}" value="Hadir" onchange="toggleKetInput(${idx})" ${savedStatus === 'Hadir' ? 'checked' : ''} ${disabledRadio} class="w-4 h-4 text-emerald-600 focus:ring-emerald-500">
          </td>
          <td class="px-3 py-3 text-center">
            <input type="radio" name="presensi-${idx}" value="Izin" onchange="toggleKetInput(${idx})" ${savedStatus === 'Izin' ? 'checked' : ''} ${disabledRadio} class="w-4 h-4 text-amber-500 focus:ring-amber-500">
          </td>
          <td class="px-3 py-3 text-center">
            <input type="radio" name="presensi-${idx}" value="Alfa" onchange="toggleKetInput(${idx})" ${savedStatus === 'Alfa' ? 'checked' : ''} ${disabledRadio} class="w-4 h-4 text-rose-600 focus:ring-rose-500">
          </td>
          <td class="px-3 py-3">
            <input type="text" id="ket-${idx}" value="${savedKet}" placeholder="${isReadOnly ? '-' : 'Alasan izin...'}" ${disabledKet} class="w-full text-xs px-2 py-1 border rounded bg-slate-50 focus:bg-white focus:ring-1 focus:ring-amber-500 transition-all ${!isIzinChecked ? 'opacity-40' : ''}">
          </td>
        </tr>
      `;
    }).join("");
  }

  updateRekapHarian();
}

function toggleKetInput(idx) {
  const radios = document.getElementsByName(`presensi-${idx}`);
  const ketInput = document.getElementById(`ket-${idx}`);
  if (!ketInput || !radios) return;

  let selected = "Hadir";
  for (let r of radios) {
    if (r.checked) selected = r.value;
  }

  if (selected === "Izin") {
    ketInput.disabled = false;
    ketInput.classList.remove("opacity-40");
    ketInput.focus();
  } else {
    ketInput.value = "";
    ketInput.disabled = true;
    ketInput.classList.add("opacity-40");
  }
}

function updateRekapHarian() {
  const selectedDateInput = document.getElementById("presensi-date");
  if (!selectedDateInput) return;
  const targetDate = selectedDateInput.value;

  let h = 0, i = 0, a = 0;
  let latestPresensiMap = {};

  const presensiList = Array.isArray(appData.presensi) ? appData.presensi : [];

  presensiList.forEach(p => {
    if (!p.Tanggal || !p.NamaJamaah) return;

    const pKel = String(p.Kelompok || "").trim().toLowerCase();
    const pKelTarget = String(currentKelompok).trim().toLowerCase();
    const pKls = String(p.Kelas || "Umum").trim().toLowerCase();
    const pKlsTarget = String(currentKelas).trim().toLowerCase();

    let pDateStr = "";
    if (p.Tanggal instanceof Date) {
      const y = p.Tanggal.getUTCFullYear();
      const m = String(p.Tanggal.getUTCMonth() + 1).padStart(2, '0');
      const d = String(p.Tanggal.getUTCDate()).padStart(2, '0');
      pDateStr = `${y}-${m}-${d}`;
    } else {
      pDateStr = String(p.Tanggal).split("T")[0].trim();
    }

    const checkKelas = (currentKelompok === "Caberawit") ? (pKls === pKlsTarget) : true;

    if (pKel === pKelTarget && checkKelas && pDateStr === targetDate) {
      const uniqueKey = String(p.NamaJamaah).trim().toLowerCase();
      latestPresensiMap[uniqueKey] = String(p.StatusPresensi || "Hadir").trim();
    }
  });

  Object.values(latestPresensiMap).forEach(status => {
    if (status === "Hadir") h++;
    else if (status === "Izin") i++;
    else if (status === "Alfa") a++;
  });

  if (document.getElementById("stat-hadir")) document.getElementById("stat-hadir").innerText = h;
  if (document.getElementById("stat-izin")) document.getElementById("stat-izin").innerText = i;
  if (document.getElementById("stat-alfa")) document.getElementById("stat-alfa").innerText = a;
  
  if (document.getElementById("rekap-mingguan-title")) {
    const displayTitle = (currentKelompok === "Caberawit") ? `${currentKelompok} (${currentKelas})` : currentKelompok;
    document.getElementById("rekap-mingguan-title").innerHTML = `<i class="fa-solid fa-calendar-day mr-2"></i> Rekapan Presensi Hari Ini (${targetDate}): ${displayTitle}`;
  }
}

async function submitPresensi() {
  if (!currentAdmin) return alert("Akses Admin diperlukan untuk menyimpan presensi!");
  
  const dateInput = document.getElementById("presensi-date");
  const dayInput = document.getElementById("presensi-day");
  if (!dateInput || !dayInput) return;

  const date = dateInput.value;
  const day = dayInput.value;

  const jamaahList = Array.isArray(appData.jamaah) ? appData.jamaah : [];

  const filteredJamaah = jamaahList.filter(j => {
    const matchStatus = String(j.Status || "Aktif").trim().toLowerCase() === "aktif";
    const matchKelompok = String(j.Kelompok || "Caberawit").trim().toLowerCase() === String(currentKelompok).trim().toLowerCase();
    
    let matchKelas = true;
    if (currentKelompok === "Caberawit") {
      matchKelas = String(j.Kelas || "").trim().toLowerCase() === String(currentKelas).trim().toLowerCase();
    }
    return matchStatus && matchKelompok && matchKelas;
  });

  if (filteredJamaah.length === 0) {
    return alert("Tidak ada jamaah di kelompok ini untuk disimpan presensinya.");
  }

  const records = [];
  filteredJamaah.forEach((j, idx) => {
    const radios = document.getElementsByName(`presensi-${idx}`);
    const ketInput = document.getElementById(`ket-${idx}`);

    let selectedStatus = "Hadir";
    for (let r of radios) {
      if (r.checked) selectedStatus = r.value;
    }

    records.push({
      kelompok: currentKelompok,
      kelas: (currentKelompok === "Caberawit") ? currentKelas : "Umum",
      tanggal: date,
      hari: day,
      nama: j.Nama,
      status: selectedStatus,
      keterangan: ketInput ? ketInput.value : ""
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
      showMessage("Presensi berhasil diperbarui!", "success");
      await loadAllData();
      
      const chartKSelect = document.getElementById("chart-kelompok-select");
      if (chartKSelect) {
        chartKSelect.value = currentKelompok;
        onChartFilterChange();
      }
    } else {
      showMessage("Gagal menyimpan: " + json.error, "error");
    }
  } catch (err) {
    showMessage("Gagal menyimpan presensi.", "error");
  }
}

function onChartFilterChange() {
  const kelompokSelect = document.getElementById("chart-kelompok-select");
  const kelasSelect = document.getElementById("chart-kelas-select");
  
  if (!kelompokSelect || !kelasSelect) return;

  const kVal = kelompokSelect.value;
  kelasSelect.innerHTML = "";

  if (kVal === "Caberawit") {
    kelasSelect.style.display = "inline-block";
    const options = ["PAUD", "Tilawati 1", "Tilawati 2", "Tilawati 3", "Tilawati 4", "Tilawati 5", "Al-Qur'an"];
    options.forEach(opt => {
      kelasSelect.innerHTML += `<option value="${opt}">${opt}</option>`;
    });
  } else {
    kelasSelect.style.display = "none";
    kelasSelect.innerHTML = `<option value="Umum">Umum</option>`;
  }

  renderChart();
}

function renderChart() {
  const chartCanvas = document.getElementById("rekapChart");
  if (!chartCanvas) return;
  
  const ctx = chartCanvas.getContext("2d");

  const selectedKelompok = document.getElementById("chart-kelompok-select") ? document.getElementById("chart-kelompok-select").value : "Caberawit";
  const selectedKelas = document.getElementById("chart-kelas-select") ? document.getElementById("chart-kelas-select").value : "PAUD";

  let dailyDataMap = {};
  const presensiList = Array.isArray(appData.presensi) ? appData.presensi : [];

  presensiList.forEach(p => {
    if (!p.Tanggal) return;

    const pKel = String(p.Kelompok || "Caberawit").trim().toLowerCase();
    const pKls = String(p.Kelas || "Umum").trim().toLowerCase();
    
    const checkKelas = (selectedKelompok === "Caberawit") ? (pKls === String(selectedKelas).trim().toLowerCase()) : true;

    if (pKel !== String(selectedKelompok).trim().toLowerCase() || !checkKelas) {
      return;
    }

    let rawDateStr = "";
    if (typeof p.Tanggal === "string") {
      rawDateStr = p.Tanggal.split("T")[0].trim();
    } else if (p.Tanggal instanceof Date) {
      const y = p.Tanggal.getUTCFullYear();
      const m = String(p.Tanggal.getUTCMonth() + 1).padStart(2, '0');
      const d = String(p.Tanggal.getUTCDate()).padStart(2, '0');
      rawDateStr = `${y}-${m}-${d}`;
    } else {
      rawDateStr = String(p.Tanggal).substring(0, 10).trim();
    }

    if (!rawDateStr || rawDateStr.length < 10) return;

    if (!dailyDataMap[rawDateStr]) {
      dailyDataMap[rawDateStr] = { Hadir: 0, Izin: 0, Alfa: 0, Total: 0 };
    }

    const st = String(p.StatusPresensi || "").trim();
    if (st === "Hadir") dailyDataMap[rawDateStr].Hadir++;
    else if (st === "Izin") dailyDataMap[rawDateStr].Izin++;
    else if (st === "Alfa") dailyDataMap[rawDateStr].Alfa++;
    
    dailyDataMap[rawDateStr].Total++;
  });

  const sortedDates = Object.keys(dailyDataMap).sort();

  let labels = [];
  let hadirData = [];
  let izinData = [];
  let alfaData = [];

  sortedDates.forEach(dateStr => {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      labels.push(`${parts[2]}/${parts[1]}`);
    } else {
      labels.push(dateStr);
    }

    const stats = dailyDataMap[dateStr];
    const total = stats.Total || 1;

    hadirData.push(Math.round((stats.Hadir / total) * 100));
    izinData.push(Math.round((stats.Izin / total) * 100));
    alfaData.push(Math.round((stats.Alfa / total) * 100));
  });

  if (rekapChartInstance) rekapChartInstance.destroy();

  if (labels.length === 0) {
    labels = ["Belum Ada Data"];
    hadirData = [0];
    izinData = [0];
    alfaData = [0];
  }

  rekapChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Hadir (%)",
          data: hadirData,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          borderWidth: 3,
          pointBackgroundColor: "#10b981",
          pointRadius: 5,
          tension: 0.2,
          fill: true
        },
        {
          label: "Izin (%)",
          data: izinData,
          borderColor: "#f59e0b",
          backgroundColor: "rgba(245, 158, 11, 0.1)",
          borderWidth: 3,
          pointBackgroundColor: "#f59e0b",
          pointRadius: 5,
          tension: 0.2,
          fill: false
        },
        {
          label: "Alfa (%)",
          data: alfaData,
          borderColor: "#ef4444",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          borderWidth: 3,
          pointBackgroundColor: "#ef4444",
          pointRadius: 5,
          tension: 0.2,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: { top: 25, bottom: 10, left: 10, right: 15 }
      },
      plugins: {
        legend: {
          position: "top",
          align: "center",
          labels: { boxWidth: 15, boxHeight: 12, padding: 20, font: { family: "sans-serif", weight: "bold", size: 12 } }
        },
        tooltip: {
          callbacks: { label: function(context) { return `${context.dataset.label}: ${context.raw}%`; } }
        },
        datalabels: {
          anchor: function(context) { return context.dataset.data[context.dataIndex] >= 100 ? "center" : "end"; },
          align: function(context) { return context.dataset.data[context.dataIndex] >= 100 ? "bottom" : "top"; },
          offset: 6,
          formatter: function(val) { return val > 0 ? val + "%" : ""; },
          font: { size: 11, weight: "bold" },
          color: function(context) { return context.dataset.borderColor; }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: 115,
          title: { display: true, text: "Persentase Kehadiran (%)", font: { size: 11 } },
          ticks: { stepSize: 20, callback: function(val) { return val <= 100 ? val + "%" : ""; } }
        },
        x: {
          title: { display: true, text: "Tanggal Presensi", font: { size: 11 } }
        }
      }
    }
  });
}

function openLoginModal() {
  const modal = document.getElementById("modal-login");
  if (modal) modal.classList.remove("hidden");
}

function openAddAdminModal() {
  const modal = document.getElementById("modal-add-admin");
  if (modal) modal.classList.remove("hidden");
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add("hidden");
}

async function handleLogin(e) {
  e.preventDefault();
  const namaInput = document.getElementById("login-nama");
  const pinInput = document.getElementById("login-pin");
  if (!namaInput || !pinInput) return;

  const nama = namaInput.value;
  const pin = pinInput.value;

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
    if (document.getElementById("btn-login-modal")) document.getElementById("btn-login-modal").classList.add("hidden");
    if (document.getElementById("btn-logout")) document.getElementById("btn-logout").classList.remove("hidden");
    if (document.getElementById("admin-badge")) document.getElementById("admin-badge").classList.remove("hidden");
    if (document.getElementById("admin-name-display")) document.getElementById("admin-name-display").innerText = currentAdmin.nama;

    if (currentAdmin.role === "Utama" && document.getElementById("btn-admin-manage")) {
      document.getElementById("btn-admin-manage").classList.remove("hidden");
    }
  } else {
    adminElements.forEach(el => el.classList.add("hidden"));
    if (document.getElementById("btn-login-modal")) document.getElementById("btn-login-modal").classList.remove("hidden");
    if (document.getElementById("btn-logout")) document.getElementById("btn-logout").classList.add("hidden");
    if (document.getElementById("admin-badge")) document.getElementById("admin-badge").classList.add("hidden");
    if (document.getElementById("btn-admin-manage")) document.getElementById("btn-admin-manage").classList.add("hidden");
  }
  renderAllViews();
}

async function handleAddAdmin(e) {
  e.preventDefault();
  const namaInput = document.getElementById("new-admin-nama");
  const pinInput = document.getElementById("new-admin-pin");
  if (!namaInput || !pinInput) return;

  const nama = namaInput.value;
  const pin = pinInput.value;

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
  const titleEl = document.getElementById("modal-form-title");
  const fieldsEl = document.getElementById("modal-form-fields");
  if (titleEl) titleEl.innerText = "Tambah Data Pengurus";
  if (fieldsEl) {
    fieldsEl.innerHTML = `
      <input type="hidden" name="ID" value="">
      <div><label class="block text-xs font-semibold mb-1">Nama Lengkap</label><input type="text" name="Nama" required class="w-full border rounded px-3 py-1.5 text-sm"></div>
      <div><label class="block text-xs font-semibold mb-1">Jabatan</label><input type="text" name="Jabatan" required class="w-full border rounded px-3 py-1.5 text-sm"></div>
      <div><label class="block text-xs font-semibold mb-1">No. HP</label><input type="text" name="NoHP" class="w-full border rounded px-3 py-1.5 text-sm"></div>
      <div><label class="block text-xs font-semibold mb-1">Status</label><select name="Status" class="w-full border rounded px-3 py-1.5 text-sm"><option>Aktif</option><option>Non-Aktif</option></select></div>
    `;
  }
  openModal("modal-form");
}

function openFormInventaris() {
  activeFormType = "Inventaris";
  const titleEl = document.getElementById("modal-form-title");
  const fieldsEl = document.getElementById("modal-form-fields");
  if (titleEl) titleEl.innerText = "Tambah Inventaris Barang";
  if (fieldsEl) {
    fieldsEl.innerHTML = `
      <input type="hidden" name="ID" value="">
      <div><label class="block text-xs font-semibold mb-1">Nama Barang</label><input type="text" name="NamaBarang" required class="w-full border rounded px-3 py-1.5 text-sm"></div>
      <div><label class="block text-xs font-semibold mb-1">Jumlah</label><input type="number" name="Jumlah" required class="w-full border rounded px-3 py-1.5 text-sm" value="1"></div>
      <div><label class="block text-xs font-semibold mb-1">Kondisi</label><select name="Kondisi" class="w-full border rounded px-3 py-1.5 text-sm"><option>Baik</option><option>Rusak Ringan</option><option>Rusak Berat</option></select></div>
      <div><label class="block text-xs font-semibold mb-1">Tanggal Masuk</label><input type="date" name="TanggalMasuk" class="w-full border rounded px-3 py-1.5 text-sm"></div>
      <div><label class="block text-xs font-semibold mb-1">Keterangan</label><textarea name="Keterangan" class="w-full border rounded px-3 py-1.5 text-sm"></textarea></div>
    `;
  }
  openModal("modal-form");
}

function openFormJamaah(data = null) {
  activeFormType = "Jamaah";
  const titleEl = document.getElementById("modal-form-title");
  const fieldsEl = document.getElementById("modal-form-fields");
  if (titleEl) titleEl.innerText = data ? "Edit Data Jamaah" : "Tambah Data Jamaah";
  
  let formattedDob = "";
  if (data && data.TanggalLahir) {
    if (data.TanggalLahir instanceof Date) {
      const y = data.TanggalLahir.getFullYear();
      const m = String(data.TanggalLahir.getMonth() + 1).padStart(2, '0');
      const d = String(data.TanggalLahir.getDate()).padStart(2, '0');
      formattedDob = `${y}-${m}-${d}`;
    } else {
      formattedDob = data.TanggalLahir.toString().split("T")[0].trim();
    }
  }

  if (fieldsEl) {
    fieldsEl.innerHTML = `
      <input type="hidden" name="ID" value="${data ? data.ID : ''}">
      <div><label class="block text-xs font-semibold mb-1">Nama Lengkap</label><input type="text" name="Nama" value="${data ? (data.Nama || '') : ''}" required class="w-full border rounded px-3 py-1.5 text-sm"></div>
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

      <div id="form-kelas-wrapper">
        <label class="block text-xs font-semibold mb-1">Kelas/Tingkat</label>
        <select name="Kelas" id="field-kelas" class="w-full border rounded px-3 py-1.5 text-sm"></select>
      </div>

      <div>
        <label class="block text-xs font-semibold mb-1">Gender</label>
        <select name="Gender" class="w-full border rounded px-3 py-1.5 text-sm">
          <option value="Laki-Laki" ${data && data.Gender === 'Laki-Laki' ? 'selected' : ''}>Laki-Laki</option>
          <option value="Perempuan" ${data && data.Gender === 'Perempuan' ? 'selected' : ''}>Perempuan</option>
        </select>
      </div>
      
      <div><label class="block text-xs font-semibold mb-1">Alamat</label><textarea name="Alamat" class="w-full border rounded px-3 py-1.5 text-sm">${data ? (data.Alamat || '') : ''}</textarea></div>
      <div>
        <label class="block text-xs font-semibold mb-1">Status</label>
        <select name="Status" class="w-full border rounded px-3 py-1.5 text-sm">
          <option value="Aktif" ${!data || data.Status === 'Aktif' ? 'selected' : ''}>Aktif</option>
          <option value="Pindah/Non-Aktif" ${data && data.Status === 'Pindah/Non-Aktif' ? 'selected' : ''}>Pindah/Non-Aktif</option>
        </select>
      </div>
    `;
  }

  onKelompokChange(data ? data.Kelas : null);
  openModal("modal-form");
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove("hidden");
}

function onKelompokChange(selectedKelas = null) {
  const kValEl = document.getElementById("field-kelompok");
  const kelasSelect = document.getElementById("field-kelas");
  const kelasWrapper = document.getElementById("form-kelas-wrapper");
  if (!kValEl || !kelasSelect) return;

  const kVal = kValEl.value;
  kelasSelect.innerHTML = "";

  if (kVal === "Caberawit") {
    if (kelasWrapper) kelasWrapper.style.display = "block";
    const options = ["PAUD", "Tilawati 1", "Tilawati 2", "Tilawati 3", "Tilawati 4", "Tilawati 5", "Al-Qur'an"];
    options.forEach(opt => {
      const isSelected = (selectedKelas && String(selectedKelas).trim().toLowerCase() === String(opt).trim().toLowerCase()) ? "selected" : "";
      kelasSelect.innerHTML += `<option value="${opt}" ${isSelected}>${opt}</option>`;
    });
  } else {
    if (kelasWrapper) kelasWrapper.style.display = "none";
    kelasSelect.innerHTML = `<option value="Umum" selected>Umum</option>`;
  }
}

function editJamaah(id) {
  const jamaahList = Array.isArray(appData.jamaah) ? appData.jamaah : [];
  const item = jamaahList.find(j => String(j.ID) === String(id));
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
    } else {
      showMessage("Gagal menyimpan: " + json.error, "error");
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
    } else {
      showMessage("Gagal menghapus: " + json.error, "error");
    }
  } catch (err) {
    showMessage("Gagal menghapus data.", "error");
  }
}

function showMessage(msg, type) {
  const el = document.getElementById("status-message");
  if (!el) return;
  el.innerText = msg;
  el.classList.remove("hidden", "bg-emerald-100", "text-emerald-800", "bg-rose-100", "text-rose-800", "bg-amber-100", "text-amber-800");

  if (type === "success") el.classList.add("bg-emerald-100", "text-emerald-800");
  else if (type === "error") el.classList.add("bg-rose-100", "text-rose-800");
  else el.classList.add("bg-amber-100", "text-amber-800");
}

function hideMessage() {
  const el = document.getElementById("status-message");
  if (el) el.classList.add("hidden");
}

function toggleMobileMenu() {
  const menuContainer = document.getElementById("nav-menu-container");
  const icon = document.getElementById("hamburger-icon");
  
  if (menuContainer) {
    menuContainer.classList.toggle("show-mobile-menu");
    if (icon) {
      if (menuContainer.classList.contains("show-mobile-menu")) {
        icon.classList.remove("fa-bars");
        icon.classList.add("fa-xmark");
      } else {
        icon.classList.remove("fa-xmark");
        icon.classList.add("fa-bars");
      }
    }
  }
}
