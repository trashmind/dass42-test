document.addEventListener('DOMContentLoaded', async function() {
    // ---- SEMUA VARIABEL LAMA ----
    const dassForm = document.getElementById('dassForm');
    const landingPageStep = document.getElementById('landingPageStep');
    const dataDiriStep = document.getElementById('dataDiriStep');
    const instruksiStep = document.getElementById('instruksiStep');
    const kuesionerStep = document.getElementById('kuesionerStep');
    const openNowButton = document.getElementById('openNowButton');
    const mulaiKuisButton = document.getElementById('mulaiKuisButton');
    const lanjutKeSoalButton = document.getElementById('lanjutKeSoalButton');
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');
    const submitButton = document.getElementById('submitButton');
    const alertModal = document.getElementById('alertModal');
    const closeModalButton = document.getElementById('closeModal');
    const unansweredList = document.getElementById('unansweredList');
    const alertMessage = document.getElementById('alertMessage');
    const questionsContainer = document.getElementById('questionsContainer');
    const questionMapContainer = document.getElementById('questionMapContainer');
    const endpage = document.getElementById('endpage');

    // ---- VARIABEL BARU UNTUK DROPDOWN ----
    const departmentSelect = document.getElementById('department');
    const unitSelect = document.getElementById('unit');
    const tingkatSelect = document.getElementById('tingkat');
    
    let exportData = [];
    let currentQuestionIndex = 0;
    let questionElements = [];
    let mapItemElements = [];
    let questions = [];

    // ---- FUNGSI BARU: Mengambil data untuk dropdown ----
    async function fetchDropdownData(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Gagal mengambil data dropdown dari jaringan.');
            }
            const csvText = await response.text();
            // Mengubah CSV (satu kolom) menjadi array
            return csvText.trim().split('\n').filter(item => item);
        } catch (error) {
            console.error('Error saat mengambil data dropdown:', error);
            return []; // Kembalikan array kosong jika gagal
        }
    }

    // ---- FUNGSI BARU: Mengisi dropdown dengan data ----
    function populateDropdown(selectElement, data, defaultText) {
        if (!selectElement) return;
        selectElement.innerHTML = `<option value="">${defaultText}</option>`; // Reset
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item;
            option.textContent = item;
            selectElement.appendChild(option);
        });
    }

    // ---- FUNGSI PARSING CSV UNTUK SOAL (DIPERBARUI) ----
    async function fetchQuestionsFromSheet(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Gagal mengambil data soal.');
            const csvText = await response.text();
            return csvText.trim().split('\n').slice(1).map(row => {
                const lastCommaIndex = row.lastIndexOf(',');
                if (lastCommaIndex === -1) return null;
                let text = row.substring(0, lastCommaIndex);
                let type = row.substring(lastCommaIndex + 1);
                if (text.startsWith('"') && text.endsWith('"')) text = text.slice(1, -1);
                return { text: text.trim().replace(/""/g, '"'), type: type.trim() };
            }).filter(q => q !== null);
        } catch (error) {
            console.error('Error saat mengambil soal:', error);
            alert('Tidak dapat memuat soal. Coba muat ulang halaman.');
            return [];
        }
    }

    // ---- FUNGSI INISIALISASI KUIS (TETAP SAMA) ----
    function initializeQuiz() {
        if (questions.length === 0) return;
        questions.forEach((q, index) => {
            const questionNumber = index + 1;
            const questionBlock = `
                <div class="question-block absolute w-full transition-opacity duration-300 ease-in-out" data-index="${index}">
                    <div class="p-4 sm:p-6 rounded-lg bg-white/50">
                        <p class="font-semibold text-lg text-gray-800 mb-5">${questionNumber}. ${q.text}</p>
                        <div class="space-y-3">
                            ${[{ value: 0, text: 'Tidak Pernah' }, { value: 1, text: 'Kadang-kadang' }, { value: 2, text: 'Sering' }, { value: 3, text: 'Hampir Selalu' }].map(({ value, text }) => `
                                <div>
                                    <input type="radio" id="q${questionNumber}-${value}" name="q${questionNumber}" value="${value}" class="option-input">
                                    <label for="q${questionNumber}-${value}" class="option-label text-gray-700">${text}</label>
                                </div>`).join('')}
                        </div>
                    </div>
                </div>`;
            questionsContainer.innerHTML += questionBlock;

            const mapItem = document.createElement('button');
            mapItem.type = 'button';
            mapItem.textContent = questionNumber;
            mapItem.dataset.index = index;
            questionMapContainer.appendChild(mapItem);
        });
        questionElements = document.querySelectorAll('.question-block');
        mapItemElements = document.querySelectorAll('#questionMapContainer button');
    }

    // ---- BAGIAN UTAMA DENGAN LINK BARU ----
    async function initializeApp() {
        // --- GANTI LINK DI BAWAH INI ---
        const googleSheetQuestionsURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRA1o8wzpNdcfFZSBKxbkToTBjvDvHfCJ58hXMCO_aEAOeYjfGGXf7tfkDxwIL4qzoFqGgDSeAkcPvR/pub?gid=1682628887&single=true&output=csv';
        const googleSheetBagianURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTBK0QHLv0BTPBgyeJ9Wg3yCU6M55mA3PLJVOHe2pq8vSe_sHfPjZTssF6lTgWiyAgDqwU7Ywjzwyat/pub?gid=0&single=true&output=csv';
        const googleSheetUnitURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTBK0QHLv0BTPBgyeJ9Wg3yCU6M55mA3PLJVOHe2pq8vSe_sHfPjZTssF6lTgWiyAgDqwU7Ywjzwyat/pub?gid=1872872817&single=true&output=csv';
        const googleSheetTingkatURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTBK0QHLv0BTPBgyeJ9Wg3yCU6M55mA3PLJVOHe2pq8vSe_sHfPjZTssF6lTgWiyAgDqwU7Ywjzwyat/pub?gid=567835733&single=true&output=csv';

        // Ambil semua data secara bersamaan
        const [questionData, bagianData, unitData, tingkatData] = await Promise.all([
            fetchQuestionsFromSheet(googleSheetQuestionsURL),
            fetchDropdownData(googleSheetBagianURL),
            fetchDropdownData(googleSheetUnitURL),
            fetchDropdownData(googleSheetTingkatURL)
        ]);

        // Inisialisasi soal kuis
        questions = questionData;
        initializeQuiz();

        // Isi dropdown
        populateDropdown(departmentSelect, bagianData, 'Silahkan pilih bagian anda');
        populateDropdown(unitSelect, unitData, 'Silahkan pilih unit anda');
        populateDropdown(tingkatSelect, tingkatData, 'Silahkan pilih tingkatan anda');
    }
    
    initializeApp(); // Jalankan fungsi utama

    // ---- SISA SCRIPT (LOGIKA NAVIGASI DAN SUBMIT) ----
    // ... (Tidak ada perubahan dari sini ke bawah, cukup salin semua sisa kode dari file asli Anda) ...
    function updateQuestionMap() {
        const formData = new FormData(dassForm);
        mapItemElements.forEach((item, index) => {
            const questionNumber = index + 1;
            const isAnswered = formData.has(`q${questionNumber}`);
            const isCurrent = index === currentQuestionIndex;
            
            item.className = 'p-2 border rounded-md text-center text-xs font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1';

            if (isCurrent) {
                item.classList.add('bg-green-600', 'text-white', 'border-green-700', 'ring-green-400');
            } else if (isAnswered) {
                item.classList.add('bg-green-200', 'text-green-800', 'border-green-300', 'hover:bg-green-300');
            } else {
                item.classList.add('bg-white', 'text-gray-800', 'border-gray-300', 'hover:bg-gray-100');
            }
        });
    }

    function showQuestion(index) {
        if(questionElements.length === 0) return;
        questionElements.forEach((el, i) => {
            el.classList.toggle('hidden', i !== index);
        });
        
        const currentQuestionEl = questionElements[index];
        if (currentQuestionEl) {
             questionsContainer.style.height = `${currentQuestionEl.offsetHeight}px`;
        }
        
        const questionCounterEl = document.getElementById('questionCounter');
        if(questionCounterEl) questionCounterEl.textContent = index + 1;
        
        const totalQuestionSpan = document.querySelector('#kuesionerStep .font-medium');
        if(totalQuestionSpan && questions.length > 0) {
            totalQuestionSpan.innerHTML = `Pertanyaan <span id="questionCounter" class="font-bold">${index + 1}</span> dari ${questions.length}`;
        }

        prevButton.disabled = index === 0;
        nextButton.classList.toggle('hidden', index === questionElements.length - 1);
        submitButton.classList.toggle('hidden', index !== questionElements.length - 1);
        updateQuestionMap();
    }
    
    openNowButton.addEventListener('click', () => {
        landingPageStep.classList.add('hidden');
        dataDiriStep.classList.remove('hidden');
        document.body.style.backgroundImage = "url('./asset/3background.svg')";
        document.getElementById("icon-person").classList.remove("md:block");
    });

    closeModalButton.addEventListener('click', () => alertModal.classList.add('hidden'));

    mulaiKuisButton.addEventListener('click', function() {
        const employeeName = document.getElementById('employeeName').value;
        const employeeId = document.getElementById('employeeId').value;
        const department = document.getElementById('department').value;
        const age = document.getElementById('age').value;
        const unit = document.getElementById('unit').value;
        const tingkat = document.getElementById('tingkat').value;

        if (!employeeName || !employeeId || !department || !age || !unit || !tingkat) {
            alertMessage.textContent = 'Pastikan semua data diri terisi.';
            unansweredList.innerHTML = '';
            alertModal.classList.remove('hidden');
            return;
        }

        dataDiriStep.classList.add('hidden');
        instruksiStep.classList.remove('hidden');
    });
    
    lanjutKeSoalButton.addEventListener('click', function() {
        instruksiStep.classList.add('hidden');
        kuesionerStep.classList.remove('hidden');
        showQuestion(0);
    });

    questionMapContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const index = parseInt(e.target.dataset.index, 10);
            currentQuestionIndex = index;
            showQuestion(currentQuestionIndex);
        }
    });

    questionsContainer.addEventListener('change', () => {
        updateQuestionMap();
        setTimeout(() => {
            if (currentQuestionIndex < questions.length - 1) {
                currentQuestionIndex++;
                showQuestion(currentQuestionIndex);
            } else {
                 submitButton.classList.add('animate-pulse');
            }
        }, 300);
    });

    prevButton.addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            showQuestion(currentQuestionIndex);
        }
    });

    nextButton.addEventListener('click', () => {
        if (currentQuestionIndex < questionElements.length - 1) {
            currentQuestionIndex++;
            showQuestion(currentQuestionIndex);
        }
    });

    dassForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(dassForm);
        
        let unansweredQuestions = [];
        for (let i = 1; i <= questions.length; i++) {
            if (!formData.has(`q${i}`)) {
                unansweredQuestions.push(i);
            }
        }

        if (unansweredQuestions.length > 0) {
            alertMessage.textContent = 'Harap jawab semua pertanyaan. Pertanyaan berikut belum dijawab:';
            unansweredList.innerHTML = '';
            unansweredQuestions.forEach(qNum => {
                const li = document.createElement('li');
                li.textContent = `Nomor ${qNum}`;
                unansweredList.appendChild(li);
            });
            alertModal.classList.remove('hidden');
            return;
        }

        let scores = { D: 0, A: 0, S: 0 };
        for (let i = 0; i < questions.length; i++) {
            const questionNumber = i + 1;
            const type = questions[i].type;
            const value = parseInt(formData.get(`q${questionNumber}`), 10);
            if (scores[type] !== undefined) {
                scores[type] += value;
            }
        }

        const finalScores = { D: scores.D, A: scores.A, S: scores.S };
        const levels = {
            D: getDepressionLevel(finalScores.D),
            A: getAnxietyLevel(finalScores.A),
            S: getStressLevel(finalScores.S)
        };

        kuesionerStep.classList.add('hidden');
        endpage.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        exportData = [{
            'Nama Karyawan': formData.get('employeeName'), 
            'ID Karyawan': formData.get('employeeId'), 
            'Departemen': formData.get('department'),
            'Unit': formData.get('unit'),
            'Tingkat': formData.get('tingkat'),
            'Usia': formData.get('age'),
            'Skor Depresi': finalScores.D, 'Tingkat Depresi': levels.D,
            'Skor Kecemasan': finalScores.A, 'Tingkat Kecemasan': levels.A,
            'Skor Stres': finalScores.S, 'Tingkat Stres': levels.S,
            'Tanggal': new Date().toLocaleDateString('id-ID')
        }];
        
        // Menambahkan tombol export di halaman akhir
        // const exportButtonEndPage = document.createElement('button');
        // exportButtonEndPage.id = 'exportButton';
        // exportButtonEndPage.textContent = 'Export ke Excel';
        // exportButtonEndPage.className = 'bg-green-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-300 transition-transform transform hover:scale-105 mt-8';
        
        // exportButtonEndPage.addEventListener('click', function() {
        //     if(exportData.length === 0) return;
        //     const worksheet = XLSX.utils.json_to_sheet(exportData);
        //     const workbook = XLSX.utils.book_new();
        //     XLSX.utils.book_append_sheet(workbook, worksheet, "Hasil DASS");
        //     const employeeName = exportData[0]['Nama Karyawan'].replace(/\s+/g, '_');
        //     const today = new Date().toISOString().slice(0, 10);
        //     XLSX.writeFile(workbook, `Hasil_DASS42_${employeeName}_${today}.xlsx`);
        // });
        
        endpage.querySelector('.w-full.md\\:w-2\\/3.z-20').appendChild(exportButtonEndPage);
    });

    function getDepressionLevel(score) {
        if (score <= 9) return 'Normal'; if (score <= 13) return 'Ringan'; if (score <= 20) return 'Sedang'; if (score <= 27) return 'Parah'; return 'Sangat Parah';
    }
    function getAnxietyLevel(score) {
        if (score <= 7) return 'Normal'; if (score <= 9) return 'Ringan'; if (score <= 14) return 'Sedang'; if (score <= 19) return 'Parah'; return 'Sangat Parah';
    }
    function getStressLevel(score) {
        if (score <= 14) return 'Normal'; if (score <= 18) return 'Ringan'; if (score <= 25) return 'Sedang'; if (score <= 33) return 'Parah'; return 'Sangat Parah';
    }
});