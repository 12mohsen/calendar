const YEARS_RANGE = { start: 1, end: 2222 };
const HIJRI_YEARS_RANGE = { start: 1, end: 2222 };

const hijriMonths = [
  "محرم",
  "صفر",
  "ربيع الأول",
  "ربيع الآخر",
  "جمادى الأولى",
  "جمادى الآخر",
  "رجب",
  "شعبان",
  "رمضان",
  "شوال",
  "ذو القعدة",
  "ذو الحجة",
];

const weekdayNames = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

const gregorianMonths = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

const pickerColumns = document.querySelectorAll(".picker-column");
const weekdayEl = document.getElementById("result-weekday");
const hijriEl = document.getElementById("result-hijri");
const hijriMonthEl = document.getElementById("result-hijri-month");
const diffEl = document.getElementById("result-diff");
const convertBtn = document.getElementById("convert-button");
const toggleButtons = document.querySelectorAll(".toggle-btn");
const adjustBtn = document.getElementById("adjust-button");
const modalBackdrop = document.getElementById("adjust-modal");
const closeAdjustBtn = document.getElementById("close-adjust");
const applyAdjustBtn = document.getElementById("apply-adjust");
const offsetInput = document.getElementById("offset-input");
const monthLengthButtons = document.querySelectorAll(".month-length-btn");

let selectedYear;
let selectedMonth;
let selectedDay;
let selectedHijriYear;
let selectedHijriMonth;
let selectedHijriDay;

// تعويض الأيام وطول الشهر الهجري (للتعديل اليدوي)
let dayOffset = 0;
let monthLength = 30;

function loadAdjustmentSettings() {
  try {
    const saved = localStorage.getItem("dateAdjustSettings");
    if (!saved) return;
    const parsed = JSON.parse(saved);
    if (typeof parsed.dayOffset === "number") dayOffset = parsed.dayOffset;
    if (parsed.monthLength === 29 || parsed.monthLength === 30) {
      monthLength = parsed.monthLength;
    }
  } catch (e) {
    // تجاهل أي خطأ في القراءة
  }
}

function saveAdjustmentSettings() {
  try {
    localStorage.setItem(
      "dateAdjustSettings",
      JSON.stringify({ dayOffset, monthLength })
    );
  } catch (e) {
    // تجاهل أي خطأ في الحفظ
  }
}

// currentMode يحدد نوع التاريخ داخل السبينر (مدخل المستخدم)
// "gregorian" = السبينر ميلادي ويتم التحويل إلى هجري في الكرت
// "hijri"      = السبينر هجري ويتم التحويل إلى ميلادي في الكرت
let currentMode = "gregorian";

function createPickerItems() {
  pickerColumns.forEach((col) => {
    const type = col.dataset.type;
    const spacerTop = col.firstElementChild;
    const spacerBottom = col.lastElementChild;

    // احذف العناصر السابقة بين الـ spacers إن وُجدت
    while (spacerTop.nextElementSibling !== spacerBottom) {
      col.removeChild(spacerTop.nextElementSibling);
    }

    if (type === "year") {
      const range =
        currentMode === "gregorian" ? YEARS_RANGE : HIJRI_YEARS_RANGE;
      for (let y = range.start; y <= range.end; y++) {
        const item = document.createElement("div");
        item.className = "picker-item";
        item.textContent = y.toString();
        item.dataset.value = y;
        col.insertBefore(item, spacerBottom);
      }
    } else if (type === "month") {
      for (let m = 1; m <= 12; m++) {
        const item = document.createElement("div");
        item.className = "picker-item";
        item.textContent = m.toString().padStart(2, "0");
        item.dataset.value = m;
        col.insertBefore(item, spacerBottom);
      }
    } else if (type === "day") {
      const maxDay = currentMode === "gregorian" ? 31 : 30;
      for (let d = 1; d <= maxDay; d++) {
        const item = document.createElement("div");
        item.className = "picker-item";
        item.textContent = d.toString().padStart(2, "0");
        item.dataset.value = d;
        col.insertBefore(item, spacerBottom);
      }
    }
  });
}

function initAdjustModal() {
  if (!adjustBtn || !modalBackdrop) return;

  const openModal = () => {
    offsetInput.value = dayOffset;
    monthLengthButtons.forEach((btn) => {
      btn.classList.toggle("active", Number(btn.dataset.length) === monthLength);
    });
    modalBackdrop.classList.add("open");
    modalBackdrop.setAttribute("aria-hidden", "false");
  };

  const closeModal = () => {
    modalBackdrop.classList.remove("open");
    modalBackdrop.setAttribute("aria-hidden", "true");
  };

  adjustBtn.addEventListener("click", openModal);
  closeAdjustBtn.addEventListener("click", closeModal);

  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) closeModal();
  });

  monthLengthButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      monthLengthButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      monthLength = Number(btn.dataset.length) || 30;
      saveAdjustmentSettings();
    });
  });

  applyAdjustBtn.addEventListener("click", () => {
    const val = Number(offsetInput.value) || 0;
    dayOffset = val;
    saveAdjustmentSettings();
    closeModal();
    updateResult();
  });
}

function centerInitialValues() {
  const today = new Date();

  if (currentMode === "gregorian") {
    selectedYear = today.getFullYear();
    selectedMonth = today.getMonth() + 1;
    selectedDay = today.getDate();
  } else {
    const h = gregorianToSimpleHijri(today);
    selectedHijriYear = h.year;
    selectedHijriMonth = h.month;
    selectedHijriDay = h.day;
  }

  pickerColumns.forEach((col) => {
    const type = col.dataset.type;
    const items = Array.from(col.querySelectorAll(".picker-item"));
    if (!items.length) return;

    let targetItem;
    if (type === "year") {
      const targetYear =
        currentMode === "gregorian" ? selectedYear : selectedHijriYear;
      targetItem = items.find((el) => Number(el.dataset.value) === targetYear) ||
        items[Math.floor(items.length / 2)];
    } else if (type === "month") {
      const targetMonth =
        currentMode === "gregorian" ? selectedMonth : selectedHijriMonth;
      targetItem =
        items.find((el) => Number(el.dataset.value) === targetMonth) || items[0];
    } else if (type === "day") {
      const targetDay =
        currentMode === "gregorian" ? selectedDay : selectedHijriDay;
      targetItem =
        items.find((el) => Number(el.dataset.value) === targetDay) || items[0];
    }

    if (targetItem) {
      const offset =
        targetItem.offsetTop - col.clientHeight / 2 + targetItem.clientHeight / 2;
      col.scrollTop = offset;
      updateSelectedItem(col);
    }
  });

  updateResult();
}

function updateSelectedItem(column) {
  const items = Array.from(column.querySelectorAll(".picker-item"));
  if (!items.length) return;

  const columnRect = column.getBoundingClientRect();
  const centerY = columnRect.top + columnRect.height / 2;

  let closest = null;
  let closestDistance = Infinity;

  items.forEach((item) => {
    const rect = item.getBoundingClientRect();
    const itemCenter = rect.top + rect.height / 2;
    const distance = Math.abs(itemCenter - centerY);

    if (distance < closestDistance) {
      closestDistance = distance;
      closest = item;
    }
  });

  items.forEach((i) => i.classList.remove("selected"));
  if (closest) {
    closest.classList.add("selected");
  }

  const type = column.dataset.type;
  if (closest) {
    const value = Number(closest.dataset.value);
    if (currentMode === "gregorian") {
      if (type === "year") selectedYear = value;
      if (type === "month") selectedMonth = value;
      if (type === "day") selectedDay = value;
    } else {
      if (type === "year") selectedHijriYear = value;
      if (type === "month") selectedHijriMonth = value;
      if (type === "day") selectedHijriDay = value;
    }
  }
}

function onScrollEnd(column) {
  const items = Array.from(column.querySelectorAll(".picker-item"));
  if (!items.length) return;

  const columnRect = column.getBoundingClientRect();
  const centerY = columnRect.top + columnRect.height / 2;

  let closest = null;
  let closestDistance = Infinity;

  items.forEach((item) => {
    const rect = item.getBoundingClientRect();
    const itemCenter = rect.top + rect.height / 2;
    const distance = Math.abs(itemCenter - centerY);

    if (distance < closestDistance) {
      closestDistance = distance;
      closest = item;
    }
  });

  if (closest) {
    const offset =
      closest.offsetTop - column.clientHeight / 2 + closest.clientHeight / 2;
    column.scrollTo({ top: offset, behavior: "smooth" });
  }

  setTimeout(() => {
    updateSelectedItem(column);
    updateResult();
  }, 220);
}

function attachScrollHandlers() {
  pickerColumns.forEach((col) => {
    let scrollTimeout;

    col.addEventListener("scroll", () => {
      updateSelectedItem(col);

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => onScrollEnd(col), 120);
    });
  });
}

function attachWheelStepHandlers() {
  pickerColumns.forEach((col) => {
    col.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();

        const items = Array.from(col.querySelectorAll(".picker-item"));
        if (!items.length) return;

        const currentIndex = items.findIndex((item) =>
          item.classList.contains("selected")
        );

        const step = e.deltaY > 0 ? 1 : -1;
        let nextIndex = currentIndex === -1 ? 0 : currentIndex + step;
        if (nextIndex < 0) nextIndex = 0;
        if (nextIndex >= items.length) nextIndex = items.length - 1;

        const target = items[nextIndex];
        const offset =
          target.offsetTop - col.clientHeight / 2 + target.clientHeight / 2;
        col.scrollTo({ top: offset, behavior: "smooth" });

        setTimeout(() => {
          updateSelectedItem(col);
          updateResult();
        }, 180);
      },
      { passive: false }
    );
  });
}

function attachTouchStepHandlers() {
  pickerColumns.forEach((col) => {
    let startY = null;

    col.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches && e.touches.length > 0) {
          startY = e.touches[0].clientY;
        }
      },
      { passive: false }
    );

    col.addEventListener(
      "touchend",
      (e) => {
        if (startY === null) return;
        const touch = e.changedTouches && e.changedTouches[0];
        if (!touch) return;

        const deltaY = touch.clientY - startY;
        startY = null;

        // تجاهل اللمسات الصغيرة جداً
        if (Math.abs(deltaY) < 10) return;

        const items = Array.from(col.querySelectorAll(".picker-item"));
        if (!items.length) return;

        const currentIndex = items.findIndex((item) =>
          item.classList.contains("selected")
        );

        // سحب للأعلى => ننتقل لأسفل (تاريخ أكبر)، وسحب للأسفل => العكس
        const step = deltaY < 0 ? 1 : -1;
        let nextIndex = currentIndex === -1 ? 0 : currentIndex + step;
        if (nextIndex < 0) nextIndex = 0;
        if (nextIndex >= items.length) nextIndex = items.length - 1;

        const target = items[nextIndex];
        const offset =
          target.offsetTop - col.clientHeight / 2 + target.clientHeight / 2;
        col.scrollTo({ top: offset, behavior: "smooth" });

        setTimeout(() => {
          updateSelectedItem(col);
          updateResult();
        }, 180);
      },
      { passive: true }
    );
  });
}

// دالة تحويل بسيطة (لأغراض العرض فقط)
function gregorianToSimpleHijri(date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  // نقطة أساس مضبوطة بحيث يكون 5 ديسمبر 2025 = 14 جمادى الآخر 1447
  const baseGregorian = new Date(2025, 11, 5); // 5 Dec 2025
  const baseHijri = { year: 1447, month: 6, day: 14 };

  // استخدام floor بدلاً من round لتجنّب زيادة يوم بسبب الكسور الزمنية
  let diffDays = Math.floor((date - baseGregorian) / msPerDay);
  diffDays += dayOffset;

  let hijriDay = baseHijri.day + diffDays;
  let hijriMonth = baseHijri.month;
  let hijriYear = baseHijri.year;

  while (hijriDay > monthLength) {
    hijriDay -= monthLength;
    hijriMonth += 1;
    if (hijriMonth > 12) {
      hijriMonth = 1;
      hijriYear += 1;
    }
  }

  while (hijriDay < 1) {
    hijriDay += monthLength;
    hijriMonth -= 1;
    if (hijriMonth < 1) {
      hijriMonth = 12;
      hijriYear -= 1;
    }
  }

  const monthName = hijriMonths[(hijriMonth - 1 + 12) % 12];

  return {
    year: hijriYear,
    month: hijriMonth,
    day: hijriDay,
    monthName,
  };
}

// عكس السابقة: تحويل تقريبي من تاريخ هجري إلى ميلادي
function hijriToSimpleGregorian(hYear, hMonth, hDay) {
  const msPerDay = 24 * 60 * 60 * 1000;
  // نفس نقطة الأساس المستخدمة في gregorianToSimpleHijri
  const baseGregorian = new Date(2025, 11, 5); // 5 Dec 2025
  const baseHijri = { year: 1447, month: 6, day: 14 };

  const baseTotal = (baseHijri.year * 12 + baseHijri.month) * monthLength + baseHijri.day;
  const targetTotal = (hYear * 12 + hMonth) * monthLength + hDay + dayOffset;
  const diffDays = targetTotal - baseTotal;

  return new Date(baseGregorian.getTime() + diffDays * msPerDay);
}

function updateResult() {
  let gDate;
  let displayMain;
  let displayMonthName;

  if (currentMode === "gregorian") {
    if (!selectedYear || !selectedMonth || !selectedDay) return;
    gDate = new Date(selectedYear, selectedMonth - 1, selectedDay);
    if (isNaN(gDate.getTime())) return;

    const h = gregorianToSimpleHijri(gDate);
    displayMain = `${h.year}/${h.month}/${h.day}`;
    displayMonthName = h.monthName;
  } else {
    if (!selectedHijriYear || !selectedHijriMonth || !selectedHijriDay) return;
    gDate = hijriToSimpleGregorian(
      selectedHijriYear,
      selectedHijriMonth,
      selectedHijriDay
    );
    if (isNaN(gDate.getTime())) return;

    const gMonthName = gregorianMonths[gDate.getMonth()];
    const gMonth = gDate.getMonth() + 1;
    const gDay = gDate.getDate();
    displayMain = `${gDate.getFullYear()}/${gMonth}/${gDay}`;
    displayMonthName = gMonthName;
  }

  const weekday = weekdayNames[gDate.getDay()];
  weekdayEl.textContent = weekday;
  hijriEl.textContent = displayMain;
  hijriMonthEl.textContent = displayMonthName;

  const today = new Date();
  const diffMs = gDate.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
  const days = Math.round(diffMs / (24 * 60 * 60 * 1000));
  if (days === 0) {
    diffEl.innerHTML = "0 يوم";
  } else {
    const absDays = Math.abs(days);
    const years = Math.floor(absDays / 365);
    const remainingAfterYears = absDays - years * 365;
    const months = Math.floor(remainingAfterYears / 30);
    const remDays = remainingAfterYears - months * 30;

    const parts = [];
    if (years > 0) parts.push(`${years} سنة`);
    if (months > 0) parts.push(`${months} شهر`);
    if (remDays > 0) parts.push(`${remDays} يوم`);

    const human = parts.length ? parts.join(" و ") : `${absDays} يوم`;
    const baseLabel = `${absDays} يوم${days > 0 ? " متبقي" : " مضى"}`;
    diffEl.innerHTML = `${baseLabel}<br/>تعادل ${human}`;
  }
}

function initToggle() {
  toggleButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      toggleButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const mode = btn.dataset.mode;
      currentMode = mode === "hijri" ? "hijri" : "gregorian";

      // إعادة بناء السبينر حسب الوضع الجديد ثم إعادة التموضع والتحديث
      createPickerItems();
      centerInitialValues();
      updateResult();
    });
  });
}

convertBtn.addEventListener("click", () => {
  updateResult();
});

loadAdjustmentSettings();
createPickerItems();
centerInitialValues();
attachScrollHandlers();
attachWheelStepHandlers();
attachTouchStepHandlers();
initToggle();
initAdjustModal();
