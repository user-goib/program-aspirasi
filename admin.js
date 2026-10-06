// admin.js
// Panel admin untuk Kotak Aspirasi OSIM MA Almusdariyah

document.addEventListener("DOMContentLoaded", function () {

  // ---- 1. Konfigurasi Firebase ----
  // SAMA dengan yang ada di app.js
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
    console.error("Firebase SDK belum dimuat. Cek urutan tag <script> di admin.html.");
    return;
  }

  firebase.initializeApp(firebaseConfig);
  var auth = firebase.auth();
  var db = firebase.firestore();
  var COL = "aspirasi";

  // ---- 2. Referensi DOM ----
  var loginSection = document.getElementById("login-section");
  var adminSection = document.getElementById("admin-section");
  var loginForm = document.getElementById("login-form");
  var emailInput = document.getElementById("email");
  var passwordInput = document.getElementById("password");
  var loginError = document.getElementById("login-error");
  var btnLogin = document.getElementById("btn-login");
  var btnLogout = document.getElementById("btn-logout");
  var adminEmailEl = document.getElementById("admin-email");
  var filterBar = document.getElementById("filter-bar");
  var listEl = document.getElementById("list");

  if (!loginSection || !adminSection || !loginForm || !listEl) {
    console.error("Struktur admin.html tidak lengkap.");
    return;
  }

  // ---- 3. State ----
  var currentFilter = "Semua";
  var allItems = [];
  var unsubscribe = null;

  // ---- 4. Observer status login ----
  auth.onAuthStateChanged(function (user) {
    if (user) {
      loginSection.hidden = true;
      adminSection.hidden = false;
      adminEmailEl.textContent = user.email || user.uid;
      startListener();
    } else {
      loginSection.hidden = false;
      adminSection.hidden = true;
      adminEmailEl.textContent = "-";
      stopListener();
    }
  });

  // ---- 5. Handler login ----
  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    loginError.textContent = "";
    btnLogin.disabled = true;
    var teksAsli = btnLogin.textContent;
    btnLogin.textContent = "Memeriksa...";

    try {
      await auth.signInWithEmailAndPassword(
        emailInput.value.trim(),
        passwordInput.value
      );
      passwordInput.value = "";
      // Peralihan UI ditangani onAuthStateChanged
    } catch (err) {
      console.error("Login gagal:", err);
      loginError.textContent = terjemahkanError(err.code);
      passwordInput.value = "";
      passwordInput.focus();
    } finally {
      btnLogin.disabled = false;
      btnLogin.textContent = teksAsli;
    }
  });

  // ---- 6. Handler logout ----
  btnLogout.addEventListener("click", function () {
    if (!confirm("Keluar dari panel admin?")) return;
    auth.signOut();
  });

  // ---- 7. Handler filter ----
  filterBar.addEventListener("click", function (e) {
    var btn = e.target.closest(".filter-chip");
    if (!btn) return;

    var value = btn.getAttribute("data-filter");
    if (!value || value === currentFilter) return;

    currentFilter = value;

    var chips = filterBar.querySelectorAll(".filter-chip");
    for (var i = 0; i < chips.length; i++) {
      chips[i].classList.toggle("is-active", chips[i] === btn);
    }

    renderList();
  });

  // ---- 8. Listener real-time ----
  function startListener() {
    if (unsubscribe) return;
    var q = db.collection(COL).orderBy("waktu", "desc");
    unsubscribe = q.onSnapshot(
      function (snapshot) {
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
  }

  function stopListener() {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    allItems = [];
    listEl.innerHTML = "";
  }

  // ---- 9. Hapus satu item ----
  async function deleteItem(id, btn) {
    if (!confirm("Hapus aspirasi ini? Tindakan tidak dapat dibatalkan.")) return;

    btn.disabled = true;
    var teksAsli = btn.textContent;
    btn.textContent = "Menghapus...";

    try {
      await db.collection(COL).doc(id).delete();
      // onSnapshot akan otomatis memperbarui list
    } catch (err) {
      console.error("Gagal hapus:", err);
      alert("Gagal menghapus. Cek Console (F12) untuk detail.");
      btn.disabled = false;
      btn.textContent = teksAsli;
    }
  }

  // ---- 10. Render list ----
  function renderList() {
    listEl.innerHTML = "";

    var filtered = allItems.filter(function (it) {
      return currentFilter === "Semua" || it.kategori === currentFilter;
    });

    if (filtered.length === 0) {
      var empty = document.createElement("div");
      empty.className = "aspirasi-item";

      var p = document.createElement("p");
      p.className = "item-body";
      p.textContent =
        currentFilter === "Semua"
          ? "Belum ada aspirasi."
          : "Belum ada aspirasi kategori " + currentFilter + ".";
      empty.appendChild(p);
      listEl.appendChild(empty);
      return;
    }

    filtered.forEach(function (it) {
      listEl.appendChild(buildItem(it));
    });
  }

  // ---- 11. Bangun elemen satu item ----
  function buildItem(it) {
    var el = document.createElement("article");
    el.className = "aspirasi-item";

    var meta = document.createElement("div");
    meta.className = "item-meta";

    var tag = document.createElement("span");
    tag.className = "tag tag-" + String(it.kategori).toLowerCase();
    tag.textContent = it.kategori;
    meta.appendChild(tag);

    var nameEl = document.createElement("span");
    nameEl.className = "item-name";
    nameEl.textContent = it.nama;
    meta.appendChild(nameEl);

    var dot = document.createElement("span");
    dot.className = "item-dot";
    dot.textContent = "/";
    meta.appendChild(dot);

    var timeEl = document.createElement("span");
    timeEl.className = "item-time";
    timeEl.textContent = formatWaktu(it.waktu);
    meta.appendChild(timeEl);

    var del = document.createElement("button");
    del.type = "button";
    del.className = "btn-delete";
    del.textContent = "Hapus";
    del.setAttribute("aria-label", "Hapus aspirasi");
    del.addEventListener("click", function () {
      deleteItem(it.id, del);
    });
    meta.appendChild(del);

    var body = document.createElement("p");
    body.className = "item-body";
    body.textContent = it.isi;

    el.appendChild(meta);
    el.appendChild(body);
    return el;
  }

  // ---- 12. Format waktu relatif ----
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

  // ---- 13. Terjemahkan error Firebase Auth ----
  function terjemahkanError(code) {
    var map = {
      "auth/invalid-email": "Format email tidak valid.",
      "auth/user-disabled": "Akun ini dinonaktifkan.",
      "auth/user-not-found": "Email tidak terdaftar.",
      "auth/wrong-password": "Kata sandi salah.",
      "auth/invalid-credential": "Email atau kata sandi salah.",
      "auth/invalid-login-credentials": "Email atau kata sandi salah.",
      "auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi nanti.",
      "auth/network-request-failed": "Koneksi bermasalah. Coba lagi.",
    };
    return map[code] || "Gagal masuk. Coba lagi.";
  }

});