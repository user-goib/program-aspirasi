// app.js
// Integrasi Firestore untuk Kotak Aspirasi OSIM MA Almusdariyah
// Compat SDK + DOMContentLoaded guard.

document.addEventListener("DOMContentLoaded", function () {

  // ---- 1. Konfigurasi Firebase ----
  const firebaseConfig = {
    apiKey: "AIzaSyC4hCbhiUkve07_ydcv0u4v91jA44MFFKo",
    authDomain: "kotak-aspirasi-osim-ma.firebaseapp.com",
    databaseURL: "https://kotak-aspirasi-osim-ma-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "kotak-aspirasi-osim-ma",
    storageBucket: "kotak-aspirasi-osim-ma.firebasestorage.app",
    messagingSenderId: "722253405963",
    appId: "1:722253405963:web:0e1ccf2bb1bfc238d98c0e"
  };

  if (typeof firebase === "undefined") {
    console.error("Firebase SDK belum dimuat. Cek urutan tag <script> di index.html.");
    return;
  }

  firebase.initializeApp(firebaseConfig);
  var db = firebase.firestore();
  var COL = "aspirasi";

  // ---- 2. Referensi DOM ----
  var form = document.getElementById("form-aspirasi");
  var inputNama = document.getElementById("nama");
  var inputIsi = document.getElementById("isi");
  var counter = document.getElementById("counter");
  var listEl = document.getElementById("list");
  var totalEl = document.getElementById("total");
  var filterBar = document.getElementById("filter-bar");

  if (!form || !inputNama || !inputIsi || !counter || !listEl || !totalEl || !filterBar) {
    console.error("Elemen tidak lengkap. Cek id di index.html.");
    return;
  }

  var btnKirim = form.querySelector(".btn");
  if (!btnKirim) {
    console.error("Tombol .btn tidak ditemukan di dalam form.");
    return;
  }

  // ---- 3. State ----
  var currentFilter = "Semua";
  var allItems = []; // cache semua aspirasi dari listener

  // ---- 4. Counter karakter real-time ----
  inputIsi.addEventListener("input", function () {
    var len = inputIsi.value.length;
    counter.textContent = len;
    if (len >= 450) counter.parentElement.classList.add("near-limit");
    else counter.parentElement.classList.remove("near-limit");
  });

    // ---- 5. Rate limiting state ----
    var RATE_KEY = "aspirasi_last_send";
    var RATE_WINDOW = 30000; // 30 detik dalam milidetik
  
    function sisaWaktuKirim() {
      var last = parseInt(localStorage.getItem(RATE_KEY) || "0", 10);
      var elapsed = Date.now() - last;
      if (elapsed >= RATE_WINDOW) return 0;
      return Math.ceil((RATE_WINDOW - elapsed) / 1000);
    }
  
    function kunciTombolSementara() {
      var sisa = sisaWaktuKirim();
      if (sisa <= 0) {
        btnKirim.disabled = false;
        btnKirim.textContent = "Kirim aspirasi";
        return;
      }
  
      btnKirim.disabled = true;
      btnKirim.textContent = "Tunggu " + sisa + " detik";
  
      setTimeout(kunciTombolSementara, 1000);
    }
  
    // Kunci tombol saat halaman dibuka kalau masih dalam cooldown
    kunciTombolSementara();
  
    // ---- 6. Handler submit form ----
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
  
      // Cek rate limit lagi (lapisan kedua, kalau-kalau tombol sempat aktif)
      var sisa = sisaWaktuKirim();
      if (sisa > 0) {
        alert("Tunggu " + sisa + " detik sebelum mengirim aspirasi lagi.");
        return;
      }
  
      var isi = inputIsi.value.trim();
      var nama = inputNama.value.trim() || "Anonim";
      var checked = form.querySelector('input[name="kategori"]:checked');
      var kategori = checked ? checked.value : "Saran";
  
      if (isi.length < 3) {
        alert("Aspirasi terlalu pendek. Tulis minimal 3 karakter.");
        return;
      }
  
      btnKirim.disabled = true;
      var teksAsli = btnKirim.textContent;
      btnKirim.textContent = "Mengirim...";
  
      try {
        await db.collection(COL).add({
          nama: nama,
          isi: isi,
          kategori: kategori,
          waktu: firebase.firestore.FieldValue.serverTimestamp(),
        });
  
        // Catat waktu kirim BERHASIL
        localStorage.setItem(RATE_KEY, String(Date.now()));
  
        inputNama.value = "";
        inputIsi.value = "";
        counter.textContent = "0";
        counter.parentElement.classList.remove("near-limit");
        inputNama.focus();
  
        // Mulai cooldown
        kunciTombolSementara();
      } catch (err) {
        console.error("Gagal mengirim:", err);
        alert("Gagal mengirim. Cek Console (F12) untuk detail.");
        btnKirim.disabled = false;
        btnKirim.textContent = teksAsli;
      }
    });

  // ---- 6. Filter handler ----
  filterBar.addEventListener("click", function (e) {
    var btn = e.target.closest(".filter-chip");
    if (!btn) return;

    var value = btn.getAttribute("data-filter");
    if (!value || value === currentFilter) return;

    currentFilter = value;

    // Update kelas aktif
    var chips = filterBar.querySelectorAll(".filter-chip");
    for (var i = 0; i < chips.length; i++) {
      chips[i].classList.toggle("is-active", chips[i] === btn);
    }

    renderList();
  });

  // ---- 7. Listener real-time ----
  var q = db.collection(COL).orderBy("waktu", "desc");

  q.onSnapshot(
    function (snapshot) {
      // Simpan ke cache
      allItems = [];
      snapshot.forEach(function (doc) {
        var d = doc.data();
        allItems.push({
          id: doc.id,
          nama: d.nama || "Anonim",
          isi: d.isi || "",
          kategori: d.kategori || "",
          waktu: d.waktu,
        });
      });

      renderList();
    },
    function (err) {
      console.error("Listener error:", err);
    }
  );

  // ---- 8. Render list sesuai filter ----
  function renderList() {
    listEl.innerHTML = "";

    var filtered = allItems.filter(function (item) {
      return currentFilter === "Semua" || item.kategori === currentFilter;
    });

    if (filtered.length === 0) {
      var empty = document.createElement("div");
      empty.className = "aspirasi-item";

      var p = document.createElement("p");
      p.className = "item-body";
      p.textContent =
        currentFilter === "Semua"
          ? "Belum ada aspirasi. Jadilah yang pertama."
          : "Belum ada aspirasi untuk kategori " + currentFilter + ".";
      empty.appendChild(p);
      listEl.appendChild(empty);
    } else {
      filtered.forEach(function (item) {
        listEl.appendChild(buildItem(item));
      });
    }

    totalEl.textContent = String(filtered.length).padStart(2, "0");
  }

  // ---- 9. Bangun elemen satu item ----
  function buildItem(item) {
    var el = document.createElement("article");
    el.className = "aspirasi-item";

    var meta = document.createElement("div");
    meta.className = "item-meta";

    var tag = document.createElement("span");
    tag.className = "tag tag-" + String(item.kategori).toLowerCase();
    tag.textContent = item.kategori;
    meta.appendChild(tag);

    var nameEl = document.createElement("span");
    nameEl.className = "item-name";
    nameEl.textContent = item.nama;
    meta.appendChild(nameEl);

    var dot = document.createElement("span");
    dot.className = "item-dot";
    dot.textContent = "/";
    meta.appendChild(dot);

    var timeEl = document.createElement("span");
    timeEl.className = "item-time";
    timeEl.textContent = formatWaktu(item.waktu);
    meta.appendChild(timeEl);

    var body = document.createElement("p");
    body.className = "item-body";
    body.textContent = item.isi;

    el.appendChild(meta);
    el.appendChild(body);
    return el;
  }

  // ---- 10. Format waktu relatif ----
  function formatWaktu(ts) {
    if (!ts) return "baru saja";

    var tgl = ts.toDate ? ts.toDate() : new Date(ts);
    var detik = Math.floor((Date.now() - tgl.getTime()) / 1000);

    if (detik < 60) return "baru saja";
    var menit = Math.floor(detik / 60);
    if (menit < 60) return menit + " menit lalu";
    var jam = Math.floor(menit / 60);
    if (jam < 24) return jam + " jam lalu";
    var hari = Math.floor(jam / 24);
    if (hari < 7) return hari + " hari lalu";

    return tgl.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

});