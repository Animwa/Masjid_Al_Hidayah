// ==========================================
// FRONTEND LOGIC & INTEGRASI API WEB MASJID AL HIDAYAH (FIXED ADMIN PERMISSION & PERSISTENT SESSION)
// ==========================================

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx9RYNRpET-uTpc89eAMou-jPqWLrkZ0c0VRn7OWzwQ5V-WIW8XqT5LJao15eLC1gevNQ/exec";

let appData = {
  pengurus: [],
  inventaris: [],
  jamaah: [],
  presensi: [],
  kegiatan: [],
  admins: []
};

let currentAdmin = null;
let currentKelompok = "Caberawit";
let currentKelas = "PAUD";
let activeFormType = null;

let chartInstances = {};

if (typeof ChartDataLabels !== 'undefined') {
  Chart.register(ChartDataLabels);
}

document.addEventListener("DOMContentLoaded", () => {
  // 1. Cek & Pulihkan Sesi Admin dari sessionStorage (agar tidak logout saat refresh)
  const savedAdmin = sessionStorage.getItem("currentAdmin");
  if (savedAdmin) {
    try {
      currentAdmin = JSON.parse(savedAdmin);
    } catch (e) {
      currentAdmin = null;
    }
  }

  setDefaultDate();
  loadAllData();
  
  // 2. Wajib Panggil updateAdminUI di awal agar elemen khusus admin tersembunyi untuk publik
  updateAdminUI();
  
  switchTab("beranda");
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
        kegiatan: Array.isArray(json.kegiatan) ? json.kegiatan : [],
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
  renderBerandaKegiatan();
  renderPengurus();
  renderInventaris();
  renderJamaah();
  renderPresensiTable();
  renderJurnalRekap();
  
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
  } else if (tabName === "jurnal-rekap") {
    renderJurnalRekap();
  } else if (tabName === "beranda") {
    renderBerandaKegiatan();
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

// 0. RENDER BERANDA AGENDA KEGIATAN
function renderBerandaKegiatan() {
  const container = document.getElementById("kegiatan-cards-container");
  if (!container) return;

  const kegiatanList = Array.isArray(appData.kegiatan) ? appData.kegiatan : [];

  if (kegiatanList.length === 0) {
    container.innerHTML = `
      <div class="col-span-full bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400">
        <i class="fa-solid fa-calendar-xmark text-4xl mb-2 text-slate-300"></i>
        <p class="text-sm font-medium">Belum ada agenda kegiatan mendatang yang ditambahkan.</p>
      </div>
    `;
  } else {
    container.innerHTML = kegiatanList.map(k => `
      <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
        <div>
          <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
            <span class="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-full border border-emerald-200 flex items-center gap-1">
              <i class="fa-solid fa-calendar-day"></i> ${k.Hari || '-'}, ${k.Tanggal ? k.Tanggal.toString().split("T")[0] : '-'}
            </span>
            <span class="text-xs text-amber-600 font-bold flex items-center gap-1">
              <i class="fa-solid fa-clock"></i> ${k.Jam || 'WIB'}
            </span>
          </div>
          <h3 class="font-bold text-slate-800 text-base mb-1">${k.Kegiatan || '-'}</h3>
          <p class="text-xs text-slate-600 flex items-center gap-1 mb-2">
            <i class="fa-solid fa-user-tie text-teal-600"></i> <b>Pemateri:</b> ${k.Pemateri || '-'}
          </p>
          <p class="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            ${k.Keterangan || 'Tidak ada catatan tambahan.'}
          </p>
        </div>
        <!-- TOMBOL HAPUS HANYA MUNCUL JIKA ADMIN KELIHATAN -->
        <div class="admin-only ${currentAdmin ? '' : 'hidden'} flex justify-end pt-2 border-t border-slate-100">
          <button onclick="deleteRow('Kegiatan', '${k.ID}')" class="text-rose-600 hover:text-rose-800 text-xs font-semibold flex items-center gap-1 p-1">
            <i class="fa-solid fa-trash"></i> Hapus Agenda
          </button>
        </div>
      </div>
    `).join("");
  }
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

  const jenisKegiatanEl = document.getElementById("presensi-jenis-kegiatan");
  const pemateriEl = document.getElementById("presensi-pemateri");
  const jurnalEl = document.getElementById("presensi-jurnal");
  const kendalaEl = document.getElementById("presensi-kendala");

  // ATUR AKSES INPUT TEKS: Kunci (disabled) jika BUKAN Admin
  const isReadOnly = !currentAdmin;
  [jenisKegiatanEl, pemateriEl, jurnalEl, kendalaEl].forEach(el => {
    if (el) {
      el.disabled = isReadOnly;
      if (isReadOnly) {
        el.classList.add("bg-slate-100", "cursor-not-allowed", "opacity-80");
        el.classList.remove("bg-slate-50", "focus:bg-white");
      } else {
        el.classList.remove("bg-slate-100", "cursor-not-allowed", "opacity-80");
        el.classList.add("bg-slate-50");
      }
    }
  });

  if (filteredJamaah.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="px-4 py-6 text-center text-slate-400 italic">
          Belum ada jamaah yang terdaftar di kelompok <b>${displayTitle}</b>.<br>
          <span class="text-xs text-slate-500">Buka menu <b>Data Jamaah</b> untuk menambahkan jamaah.</span>
        </td>
      </tr>
    `;
    if (jenisKegiatanEl) jenisKegiatanEl.value = "";
    if (pemateriEl) pemateriEl.value = "";
    if (jurnalEl) jurnalEl.value = "";
    if (kendalaEl) kendalaEl.value = "";
  } else {
    const selectedDateInput = document.getElementById("presensi-date");
    const targetDate = selectedDateInput ? selectedDateInput.value : "";

    let existingStatusMap = {};
    let savedJenisKegiatan = "";
    let savedPemateri = "";
    let savedJurnal = "";
    let savedKendala = "";

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

        if (p.JenisKegiatan) savedJenisKegiatan = p.JenisKegiatan;
        if (p.Pemateri) savedPemateri = p.Pemateri;
        if (p.Jurnal) savedJurnal = p.Jurnal;
        if (p.Kendala) savedKendala = p.Kendala;
      }
    });

    if (jenisKegiatanEl) jenisKegiatanEl.value = savedJenisKegiatan;
    if (pemateriEl) pemateriEl.value = savedPemateri;
    if (jurnalEl) jurnalEl.value = savedJurnal;
    if (kendalaEl) kendalaEl.value = savedKendala;

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

  const jenisKegiatan = document.getElementById("presensi-jenis-kegiatan") ? document.getElementById("presensi-jenis-kegiatan").value : "";
  const pemateri = document.getElementById("presensi-pemateri") ? document.getElementById("presensi-pemateri").value : "";
  const jurnal = document.getElementById("presensi-jurnal") ? document.getElementById("presensi-jurnal").value : "";
  const kendala = document.getElementById("presensi-kendala") ? document.getElementById("presensi-kendala").value : "";

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
      keterangan: ketInput ? ketInput.value : "",
      jenisKegiatan: jenisKegiatan,
      pemateri: pemateri,
      jurnal: jurnal,
      kendala: kendala
    });
  });

  showMessage("Menyimpan data presensi & jurnal...", "info");
  try {
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "save_presensi_batch", records: records })
    });
    const json = await res.json();
    if (json.success) {
      showMessage("Presensi dan jurnal berhasil disimpan!", "success");
      await loadAllData();
    } else {
      showMessage("Gagal menyimpan: " + json.error, "error");
    }
  } catch (err) {
    showMessage("Gagal menyimpan presensi.", "error");
  }
}

// 5. RENDER REKAPITULASI JURNAL TIAP KELAS (SCROLLABLE & SAFELY PARSED)
function renderJurnalRekap() {
  const container = document.getElementById("jurnal-cards-wrapper");
  if (!container) return;

  const presensiList = Array.isArray(appData.presensi) ? appData.presensi : [];

  const classConfigs = [
    { kelompok: "Caberawit", kelas: "PAUD", title: "Caberawit - PAUD" },
    { kelompok: "Caberawit", kelas: "Tilawati 1", title: "Caberawit - Tilawati 1" },
    { kelompok: "Caberawit", kelas: "Tilawati 2", title: "Caberawit - Tilawati 2" },
    { kelompok: "Caberawit", kelas: "Tilawati 3", title: "Caberawit - Tilawati 3" },
    { kelompok: "Caberawit", kelas: "Tilawati 4", title: "Caberawit - Tilawati 4" },
    { kelompok: "Caberawit", kelas: "Tilawati 5", title: "Caberawit - Tilawati 5" },
    { kelompok: "Caberawit", kelas: "Al-Qur'an", title: "Caberawit - Al-Qur'an" },
    { kelompok: "Pra Remaja", kelas: "Umum", title: "Pra Remaja (SMP)" },
    { kelompok: "Remaja", kelas: "Umum", title: "Remaja (SMA)" },
    { kelompok: "Muda-Mudi", kelas: "Umum", title: "Muda-Mudi" },
    { kelompok: "Bapak-Bapak", kelas: "Umum", title: "Bapak-Bapak" },
    { kelompok: "Ibu-Ibu", kelas: "Umum", title: "Ibu-Ibu" }
  ];

  const daysName = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  container.innerHTML = classConfigs.map(cfg => {
    let journalsByDate = {};

    presensiList.forEach(p => {
      const pKel = String(p.Kelompok || "").trim().toLowerCase();
      const pKls = String(p.Kelas || "Umum").trim().toLowerCase();

      const matchKel = pKel === String(cfg.kelompok).trim().toLowerCase();
      const matchKls = (cfg.kelompok === "Caberawit") ? (pKls === String(cfg.kelas).trim().toLowerCase()) : true;

      if (matchKel && matchKls && p.Tanggal) {
        let pDateStr = (p.Tanggal instanceof Date) ? p.Tanggal.toISOString().split("T")[0] : String(p.Tanggal).split("T")[0].trim();

        // Hitung Hari Otomatis jika p.Hari tidak terdefinisi
        let computedHari = p.Hari || p.hari;
        if (!computedHari) {
          const d = new Date(pDateStr + "T00:00:00");
          if (!isNaN(d.getTime())) {
            computedHari = daysName[d.getDay()];
          } else {
            computedHari = "-";
          }
        }

        // Membaca nilai dari Google Sheets dengan toleransi Kapital / Kecil
        const valJenis = p.JenisKegiatan || p.jenisKegiatan || 'Pengajian Rutin';
        const valPemateri = p.Pemateri || p.pemateri || '-';
        const valJurnal = p.Jurnal || p.jurnal || '-';
        const valKendala = p.Kendala || p.kendala || '-';

        // Simpan data unik per tanggal jika setidaknya salah satu jurnal terisi
        if (!journalsByDate[pDateStr] || valJurnal !== '-' || valPemateri !== '-') {
          journalsByDate[pDateStr] = {
            tanggal: pDateStr,
            hari: computedHari,
            jenisKegiatan: valJenis,
            pemateri: valPemateri,
            jurnal: valJurnal,
            kendala: valKendala
          };
        }
      }
    });

    const datesList = Object.values(journalsByDate).sort((a, b) => b.tanggal.localeCompare(a.tanggal));

    return `
      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 class="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-teal-600"></span> ${cfg.title}
          </h3>
          <span class="text-xs font-semibold px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full border border-teal-200">
            ${datesList.length} Pertemuan Dicatat
          </span>
        </div>

        ${datesList.length === 0 ? `
          <p class="text-xs text-slate-400 italic py-2">Belum ada jurnal pengajian yang terdata untuk kelas ini.</p>
        ` : `
          <div class="space-y-3 max-h-72 overflow-y-auto pr-1">
            ${datesList.map(j => `
              <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div class="flex justify-between items-center text-slate-700 font-bold border-b border-slate-200/60 pb-1.5 mb-1.5">
                  <span class="text-teal-800"><i class="fa-solid fa-calendar-day mr-1"></i> ${j.hari}, ${j.tanggal}</span>
                  <span class="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px]">${j.jenisKegiatan}</span>
                </div>
                <p><b class="text-slate-700">Pemateri:</b> ${j.pemateri}</p>
                <p><b class="text-slate-700">Capaian Jurnal:</b> ${j.jurnal}</p>
                <p class="text-slate-500"><b class="text-slate-700">Kendala KBM:</b> ${j.kendala}</p>
              </div>
            `).join("")}
          </div>
        `}
      </div>
    `;
  }).join("");
}

// 6. RENDER SELURUH GRAFIK REKAPITULASI (ANTI-DUPLIKAT JAMAAH)
function onChartFilterChange() {
  renderAllCharts();
}

function renderAllCharts() {
  const container = document.getElementById("charts-wrapper");
  if (!container) return;

  const chartConfigs = [
    { kelompok: "Caberawit", kelas: "PAUD", title: "Caberawit - PAUD" },
    { kelompok: "Caberawit", kelas: "Tilawati 1", title: "Caberawit - Tilawati 1" },
    { kelompok: "Caberawit", kelas: "Tilawati 2", title: "Caberawit - Tilawati 2" },
    { kelompok: "Caberawit", kelas: "Tilawati 3", title: "Caberawit - Tilawati 3" },
    { kelompok: "Caberawit", kelas: "Tilawati 4", title: "Caberawit - Tilawati 4" },
    { kelompok: "Caberawit", kelas: "Tilawati 5", title: "Caberawit - Tilawati 5" },
    { kelompok: "Caberawit", kelas: "Al-Qur'an", title: "Caberawit - Al-Qur'an" },
    { kelompok: "Pra Remaja", kelas: "Umum", title: "Pra Remaja (SMP)" },
    { kelompok: "Remaja", kelas: "Umum", title: "Remaja (SMA)" },
    { kelompok: "Muda-Mudi", kelas: "Umum", title: "Muda-Mudi" },
    { kelompok: "Bapak-Bapak", kelas: "Umum", title: "Bapak-Bapak" },
    { kelompok: "Ibu-Ibu", kelas: "Umum", title: "Ibu-Ibu" }
  ];

  Object.values(chartInstances).forEach(chart => chart && typeof chart.destroy === 'function' && chart.destroy());
  chartInstances = {};

  container.innerHTML = chartConfigs.map((cfg, idx) => `
    <div class="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
      <div class="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
        <h3 class="text-sm font-bold text-slate-800 flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-teal-500"></span> ${cfg.title}
        </h3>
        <span class="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full font-semibold">
          1 Bulan Terakhir
        </span>
      </div>
      <div class="relative h-64 sm:h-72">
        <canvas id="chart-canvas-${idx}"></canvas>
      </div>
    </div>
  `).join("");

  chartConfigs.forEach((cfg, idx) => {
    renderSingleChart(`chart-canvas-${idx}`, cfg.kelompok, cfg.kelas);
  });
}

function renderSingleChart(canvasId, selectedKelompok, selectedKelas) {
  const chartCanvas = document.getElementById(canvasId);
  if (!chartCanvas) return;

  const ctx = chartCanvas.getContext("2d");

  const jamaahList = Array.isArray(appData.jamaah) ? appData.jamaah : [];
  const totalJamaahAktifList = jamaahList.filter(j => {
    const matchStatus = String(j.Status || "Aktif").trim().toLowerCase() === "aktif";
    const matchKelompok = String(j.Kelompok || "Caberawit").trim().toLowerCase() === String(selectedKelompok).trim().toLowerCase();
    let matchKelas = true;
    if (selectedKelompok === "Caberawit") {
      matchKelas = String(j.Kelas || "").trim().toLowerCase() === String(selectedKelas).trim().toLowerCase();
    }
    return matchStatus && matchKelompok && matchKelas;
  });

  const totalJamaahKelas = totalJamaahAktifList.length > 0 ? totalJamaahAktifList.length : 1;

  let dailyDataMap = {};
  const presensiList = Array.isArray(appData.presensi) ? appData.presensi : [];

  // SANITASI & ANTI-DUPLIKAT JAMAAH
  let uniquePresensiMap = {};

  presensiList.forEach(p => {
    if (!p.Tanggal || !p.NamaJamaah) return;

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

    const uniqueKey = `${rawDateStr}_${String(p.NamaJamaah).trim().toLowerCase()}`;
    uniquePresensiMap[uniqueKey] = {
      tanggal: rawDateStr,
      status: String(p.StatusPresensi || "Hadir").trim()
    };
  });

  Object.values(uniquePresensiMap).forEach(p => {
    const rawDateStr = p.tanggal;
    if (!dailyDataMap[rawDateStr]) {
      dailyDataMap[rawDateStr] = { Hadir: 0, Izin: 0, Alfa: 0 };
    }

    const st = p.status;
    if (st === "Hadir") dailyDataMap[rawDateStr].Hadir++;
    else if (st === "Izin") dailyDataMap[rawDateStr].Izin++;
    else if (st === "Alfa") dailyDataMap[rawDateStr].Alfa++;
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

    const pctHadir = Number(((stats.Hadir / totalJamaahKelas) * 100).toFixed(1));
    const pctIzin = Number(((stats.Izin / totalJamaahKelas) * 100).toFixed(1));
    const pctAlfa = Number(((stats.Alfa / totalJamaahKelas) * 100).toFixed(1));

    hadirData.push(pctHadir);
    izinData.push(pctIzin);
    alfaData.push(pctAlfa);
  });

  if (labels.length === 0) {
    labels = ["Belum Ada Data"];
    hadirData = [0];
    izinData = [0];
    alfaData = [0];
  }

  chartInstances[canvasId] = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Hadir (%)",
          data: hadirData,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.08)",
          borderWidth: 2.5,
          pointBackgroundColor: "#10b981",
          pointRadius: 4,
          tension: 0.2,
          fill: true
        },
        {
          label: "Izin (%)",
          data: izinData,
          borderColor: "#f59e0b",
          backgroundColor: "rgba(245, 158, 11, 0.08)",
          borderWidth: 2.5,
          pointBackgroundColor: "#f59e0b",
          pointRadius: 4,
          tension: 0.2,
          fill: false
        },
        {
          label: "Alfa (%)",
          data: alfaData,
          borderColor: "#ef4444",
          backgroundColor: "rgba(239, 68, 68, 0.08)",
          borderWidth: 2.5,
          pointBackgroundColor: "#ef4444",
          pointRadius: 4,
          tension: 0.2,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: { top: 20, bottom: 10, left: 10, right: 15 }
      },
      plugins: {
        legend: {
          position: "top",
          align: "center",
          labels: { boxWidth: 12, boxHeight: 10, padding: 15, font: { family: "sans-serif", weight: "bold", size: 11 } }
        },
        tooltip: {
          callbacks: { label: function(context) { return `${context.dataset.label}: ${context.raw}%`; } }
        },
        datalabels: {
          anchor: function(context) { return context.dataset.data[context.dataIndex] >= 100 ? "center" : "end"; },
          align: function(context) { return context.dataset.data[context.dataIndex] >= 100 ? "bottom" : "top"; },
          offset: 4,
          formatter: function(val) { return val > 0 ? val + "%" : ""; },
          font: { size: 10, weight: "bold" },
          color: function(context) { return context.dataset.borderColor; }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: 100,
          max: 100,
          title: { display: true, text: "Persentase Kehadiran (%)", font: { size: 10 } },
          ticks: { stepSize: 20, callback: function(val) { return val <= 100 ? val + "%" : ""; } }
        },
        x: {
          title: { display: true, text: "Tanggal Presensi", font: { size: 10 } }
        }
      }
    }
  });
}

function openFormKegiatan() {
  activeFormType = "Kegiatan";
  const titleEl = document.getElementById("modal-form-title");
  const fieldsEl = document.getElementById("modal-form-fields");
  if (titleEl) titleEl.innerText = "Tambah Agenda Kegiatan Baru";
  if (fieldsEl) {
    fieldsEl.innerHTML = `
      <input type="hidden" name="ID" value="">
      <div>
        <label class="block text-xs font-semibold mb-1">Nama Kegiatan</label>
        <input type="text" name="Kegiatan" required class="w-full border rounded px-3 py-1.5 text-sm" placeholder="Misal: CAI DAY 1">
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-xs font-semibold mb-1">Tanggal</label>
          <input type="date" id="modal-kegiatan-tanggal" name="Tanggal" required onchange="updateModalHari()" class="w-full border rounded px-3 py-1.5 text-sm">
        </div>
        <div>
          <label class="block text-xs font-semibold mb-1">Hari</label>
          <input type="text" id="modal-kegiatan-hari" name="Hari" readonly class="w-full border rounded px-3 py-1.5 text-sm bg-slate-100 font-semibold text-slate-700" placeholder="Otomatis">
        </div>
      </div>
      <div>
        <label class="block text-xs font-semibold mb-1">Jam / Waktu</label>
        <input type="text" name="Jam" required class="w-full border rounded px-3 py-1.5 text-sm" placeholder="Misal: 19:30 - Selesai">
      </div>
      <div>
        <label class="block text-xs font-semibold mb-1">Pemateri / Pengajar</label>
        <input type="text" name="Pemateri" class="w-full border rounded px-3 py-1.5 text-sm" placeholder="Nama Ustaz / Penceramah">
      </div>
      <div>
        <label class="block text-xs font-semibold mb-1">Keterangan / Lokasi</label>
        <textarea name="Keterangan" class="w-full border rounded px-3 py-1.5 text-sm" placeholder="Catatan lokasi atau perlengkapan yang perlu dibawa"></textarea>
      </div>
    `;
  }
  
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateEl = document.getElementById("modal-kegiatan-tanggal");
  if (dateEl) {
    dateEl.value = `${year}-${month}-${day}`;
    updateModalHari();
  }

  openModal("modal-form");
}

function updateModalHari() {
  const dateInput = document.getElementById("modal-kegiatan-tanggal");
  const hariInput = document.getElementById("modal-kegiatan-hari");
  if (!dateInput || !hariInput) return;

  if (!dateInput.value) {
    hariInput.value = "";
    return;
  }

  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const d = new Date(dateInput.value + "T00:00:00");
  if (!isNaN(d.getTime())) {
    hariInput.value = days[d.getDay()];
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
      
      // Simpan sesi ke sessionStorage agar tahan saat refresh
      sessionStorage.setItem("currentAdmin", JSON.stringify(currentAdmin));
      
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
  sessionStorage.removeItem("currentAdmin");
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
