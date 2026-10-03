// app.js
// Integrasi Firestore untuk Kotak Aspirasi OSIM MA Almusdariyah
// Compat SDK + DOMContentLoaded guard.

document.addEventListener("DOMContentLoaded", function () {

  // ---- 1. Konfigurasi Firebase ----
  var firebaseConfig = {
    apiKey: "GANTI_DENGAN_API_KEY_MU",
    authDomain: "GANTI.firebaseapp.com",
    projectId: "GANTI",
    storageBucket: "GANTI.appspot.com",
    messagingSenderId: "GANTI",
    appId: "GANTI",
  };

  // Cek dependensi dulu, supaya error-nya jelas
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

  // Cek semua elemen ada
  if (!form || !inputNama || !inputIsi || !counter || !listEl || !totalEl) {
    console.error("Elemen form tidak lengkap. Cek id di index.html:",
      { form: !!form, inputNama: !!inputNama, inputIsi: !!inputIsi,
        counter: !!counter, listEl: !!listEl, totalEl: !!totalEl });
    return;
  }

  var btnKirim = form.querySelector(".btn");
  if (!btnKirim) {
    console.error("Tombol .btn tidak ditemukan di dalam form.");
    return;
  }

  // ---- 3. Counter karakter real-time ----
  inputIsi.addEventListener("input", function () {
    var len = inputIsi.value.length;
    counter.textContent = len;
    if (len >= 450) counter.parentElement.classList.add("near-limit");
    else counter.parentElement.classList.remove("near-limit");
  });

  // ---- 4. Handler submit form ----
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

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

      inputNama.value = "";
      inputIsi.value = "";
      counter.textContent = "0";
      counter.parentElement.classList.remove("near-limit");
      inputNama.focus();
    } catch (err) {
      console.error("Gagal mengirim:", err);
      alert("Gagal mengirim. Cek Console (F12) untuk detail.");
    } finally {
      btnKirim.disabled = false;
      btnKirim.textContent = teksAsli;
    }
  });

  // ---- 5. Listener real-time ----
  var q = db.collection(COL).orderBy("waktu", "desc");

  q.onSnapshot(
    function (snapshot) {
      listEl.innerHTML = "";

      if (snapshot.empty) {
        var empty = document.createElement("div");
        empty.className = "aspirasi-item";
        var p = document.createElement("p");
        p.className = "item-body";
        p.textContent = "Belum ada aspirasi. Jadilah yang pertama.";
        empty.appendChild(p);
        listEl.appendChild(empty);
        totalEl.textContent = "00";
        return;
      }

      var count = 0;
      snapshot.forEach(function (doc) {
        var d = doc.data();
        count++;

        var item = document.createElement("article");
        item.className = "aspirasi-item";

        var tag = document.createElement("span");
        tag.className = "tag tag-" + String(d.kategori || "").toLowerCase();
        tag.textContent = d.kategori || "";

        var meta = document.createElement("div");
        meta.className = "item-meta";
        meta.appendChild(tag);

        var nameEl = document.createElement("span");
        nameEl.className = "item-name";
        nameEl.textContent = d.nama || "Anonim";
        meta.appendChild(nameEl);

        var dot = document.createElement("span");
        dot.className = "item-dot";
        dot.textContent = "/";
        meta.appendChild(dot);

        var timeEl = document.createElement("span");
        timeEl.className = "item-time";
        timeEl.textContent = formatWaktu(d.waktu);
        meta.appendChild(timeEl);

        var body = document.createElement("p");
        body.className = "item-body";
        body.textContent = d.isi;

        item.appendChild(meta);
        item.appendChild(body);
        listEl.appendChild(item);
      });

      totalEl.textContent = String(count).padStart(2, "0");
    },
    function (err) {
      console.error("Listener error:", err);
    }
  );

  // ---- 6. Format waktu relatif ----
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