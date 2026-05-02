/**
 * ============================================
 *   SISTEM ABSENSI SISWA - Node.js + Express
 * ============================================
 * Cara install : npm install
 * Cara run     : node server.js
 * Buka browser : http://localhost:5000
 * Jaringan     : http://192.168.0.155:5000
 */

const express = require("express");
const session = require("express-session");
const path    = require("path");

const app  = express();
const PORT = 5000;

// ============================================
// MIDDLEWARE SETUP
// ============================================
app.use(express.urlencoded({ extended: true })); // baca form POST
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Konfigurasi session (menyimpan data login)
app.use(session({
  secret: "absensi_rahasia_2026",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 } // aktif 8 jam
}));

// ============================================
// DATA ADMIN (HARDCODE)
// ============================================
const ADMIN = {
  "admin": "admin123",
  "guru":  "guru123"
};

// ============================================
// DATA SISWA (HARDCODE DI KODE)
// Format: { "KELAS": { "NO_ABSEN": "NAMA" } }
// ============================================
const SISWA = {
  "X PPLG 1": {
    "001": "Ahmad Daffa",
    "002": "Aisyah Mirzanih",
    "003": "Alya Zahwa",
    "004": "Andita Khairani",
    "005": "Arini Haqiqi",
    "006": "Banyu Firdaus",
    "007": "Chiyo Oktavian",
    "008": "Daniella Febriyani",
    "009": "Endriyan Bimo Legsono",
    "010": "Fadawkaz Azka",
    "011": "Fadhilah Rizqy M.",
    "012": "Gisela Hasna Oktafiany",
    "013": "Halimatussadiyah",
    "014": "Hanggara Febra Yahusha",
    "015": "I'lun Ali Mudin",
    "016": "Kinara Puja Mutia R",
    "017": "Laksmana Galih Mukti",
    "018": "Ludfie Shivan Aditya",
    "019": "Luqmanul Hakim Sinaga",
    "020": "Muhamad Akbar",
    "021": "Muhammad Arka Zahir",
    "022": "M Febriansyah",
    "023": "Muhammad Hafizi Amarullah",
    "024": "Muhammad Nabil Prathama",
    "025": "M Rafa Ghazali",
    "026": "Muhammad Raffa Putra Hidayat",
    "027": "Nabhil Achmad Yusuf Nurisyah",
    "028": "Nifa Aprilia",
    "029": "Nurul Aulia",
    "030": "Padli Abral Maulana",
    "031": "Putri Puji Rahayu",
    "032": "Raissa Dimitri",
    "033": "Rayfa Aprilianto Nugroho",
    "034": "Ridwan Ezy Sayhputra",
    "035": "Rizky Anugerah Syarif",
    "036": "Sultan Aulia Rachman"
  }
};

// ============================================
// DATA ABSENSI (DISIMPAN DI MEMORY)
// Reset setiap kali server di-restart
// ============================================
let dataAbsensi = [];

// ============================================
// FUNGSI UTILITAS
// ============================================

// Tanggal hari ini: "2026-05-02"
function getTanggal() {
  return new Date().toISOString().split("T")[0];
}

// Waktu sekarang: "08:30:15"
function getWaktu() {
  return new Date().toLocaleTimeString("id-ID", { hour12: false });
}

// Format tampilan: "Sabtu, 02 Mei 2026"
function getTanggalDisplay() {
  return new Date().toLocaleDateString("id-ID", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });
}

// Validasi login siswa (3 langkah)
function validasiSiswa(nama, kelas, no_absen) {
  if (!SISWA[kelas])
    return { valid: false, pesan: "Kelas tidak ditemukan" };
  if (!SISWA[kelas][no_absen])
    return { valid: false, pesan: "Nomor absen tidak ditemukan" };
  if (SISWA[kelas][no_absen].trim().toLowerCase() !== nama.trim().toLowerCase())
    return { valid: false, pesan: "Nama tidak sesuai dengan data" };
  return { valid: true };
}

// Cek apakah siswa sudah absen hari ini
function cekSudahAbsen(kelas, no_absen) {
  return dataAbsensi.some(r =>
    r.tanggal  === getTanggal() &&
    r.kelas    === kelas &&
    r.no_absen === no_absen
  );
}

// ============================================
// MIDDLEWARE PROTEKSI HALAMAN
// ============================================
const hanyaLogin = (req, res, next) => {
  if (!req.session.user) return res.redirect("/");
  next();
};
const hanyaAdmin = (req, res, next) => {
  if (!req.session.user || req.session.role !== "admin") return res.redirect("/");
  next();
};
const hanyaSiswa = (req, res, next) => {
  if (!req.session.user || req.session.role !== "siswa") return res.redirect("/");
  next();
};

// ============================================
// ROUTES - HALAMAN HTML
// ============================================

// Halaman login
app.get("/", (req, res) => {
  if (req.session.user)
    return res.redirect(req.session.role === "admin" ? "/admin" : "/siswa");
  res.sendFile(path.join(__dirname, "views", "login.html"));
});

// Proses login
app.post("/login", (req, res) => {
  const { role, username, password, nama, kelas, no_absen } = req.body;

  // --- Login Admin ---
  if (role === "admin") {
    if (ADMIN[username] && ADMIN[username] === password) {
      req.session.user = username;
      req.session.role = "admin";
      return res.redirect("/admin");
    }
    req.session.error = "Username atau password admin salah!";
    return res.redirect("/");
  }

  // --- Login Siswa ---
  if (role === "siswa") {
    const hasil = validasiSiswa(nama, kelas, no_absen);
    if (hasil.valid) {
      req.session.user     = nama;
      req.session.role     = "siswa";
      req.session.kelas    = kelas;
      req.session.no_absen = no_absen;
      return res.redirect("/siswa");
    }
    req.session.error = `Login ditolak: ${hasil.pesan}`;
    return res.redirect("/");
  }

  res.redirect("/");
});

// Dashboard siswa
app.get("/siswa", hanyaSiswa, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "siswa.html"));
});

// Dashboard admin
app.get("/admin", hanyaAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "admin.html"));
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// ============================================
// API ENDPOINTS (dipanggil dari JavaScript frontend)
// ============================================

// Ambil pesan error (flash message)
app.get("/api/flash", (req, res) => {
  const error = req.session.error || null;
  delete req.session.error;
  res.json({ error });
});

// Data dashboard siswa
app.get("/api/siswa-data", hanyaSiswa, (req, res) => {
  const { user: nama, kelas, no_absen } = req.session;
  const hari = getTanggal();
  const rekapSiswa = dataAbsensi.filter(
    r => r.tanggal === hari && r.kelas === kelas && r.no_absen === no_absen
  );
  res.json({
    nama, kelas, no_absen,
    hariIni:    getTanggalDisplay(),
    sudahAbsen: cekSudahAbsen(kelas, no_absen),
    rekap:      rekapSiswa
  });
});

// Submit absensi siswa
app.post("/api/absen", hanyaSiswa, (req, res) => {
  const { user: nama, kelas, no_absen } = req.session;
  if (cekSudahAbsen(kelas, no_absen))
    return res.json({ sukses: false, pesan: "Kamu sudah absen hari ini!" });

  const record = { tanggal: getTanggal(), nama, kelas, no_absen, waktu: getWaktu() };
  dataAbsensi.push(record);
  res.json({ sukses: true, pesan: "Absensi berhasil dicatat!", waktu: record.waktu });
});

// Data dashboard admin
app.get("/api/admin-data", hanyaAdmin, (req, res) => {
  const hari = getTanggal();
  let totalSiswa = 0;
  for (const k in SISWA) totalSiswa += Object.keys(SISWA[k]).length;

  res.json({
    admin:       req.session.user,
    hariIni:     getTanggalDisplay(),
    totalSiswa,
    totalHadir:  dataAbsensi.filter(r => r.tanggal === hari).length,
    rekap:       dataAbsensi.filter(r => r.tanggal === hari),
    semuaTanggal: [...new Set(dataAbsensi.map(r => r.tanggal))].sort().reverse()
  });
});

// Absensi per tanggal tertentu (admin)
app.get("/api/absensi/:tanggal", hanyaAdmin, (req, res) => {
  res.json({
    tanggal: req.params.tanggal,
    rekap: dataAbsensi.filter(r => r.tanggal === req.params.tanggal)
  });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, "0.0.0.0", () => {
  console.log("\n==========================================");
  console.log("  🚀 Sistem Absensi - Node.js + Express");
  console.log("==========================================");
  console.log(`  💻 Local   : http://localhost:${PORT}`);
  console.log(`  📡 Network : http://192.168.0.155:${PORT}`);
  console.log("==========================================\n");
});