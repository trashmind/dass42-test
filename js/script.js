document.addEventListener('DOMContentLoaded', async function() {
    // ---- SEMUA VARIABEL MASIH SAMA ----
    const dassForm = document.getElementById('dassForm');
    const landingPageStep = document.getElementById('landingPageStep');
    const dataDiriStep = document.getElementById('dataDiriStep');
    const instruksiStep = document.getElementById('instruksiStep');
    const kuesionerStep = document.getElementById('kuesionerStep');
    const resultsDiv = document.getElementById('results');
    const openNowButton = document.getElementById('openNowButton');
    const mulaiKuisButton = document.getElementById('mulaiKuisButton');
    const lanjutKeSoalButton = document.getElementById('lanjutKeSoalButton');
    const exportButton = document.getElementById('exportButton');
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');
    const submitButton = document.getElementById('submitButton');
    const alertModal = document.getElementById('alertModal');
    const closeModalButton = document.getElementById('closeModal');
    const unansweredList = document.getElementById('unansweredList');
    const alertMessage = document.getElementById('alertMessage');
    const questionsContainer = document.getElementById('questionsContainer');
    const questionCounter = document.getElementById('questionCounter');
    const questionMapContainer = document.getElementById('questionMapContainer');
    
    let exportData = [];
    let currentQuestionIndex = 0;
    let questionElements = [];
    let mapItemElements = [];
    let questions = [];

    // ---- FUNGSI PARSING CSV YANG DIPERBARUI ----
    async function fetchQuestionsFromSheet(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Gagal mengambil data soal dari jaringan.');
            }
            const csvText = await response.text();
            
            // Logika parsing yang lebih baik untuk menangani koma di dalam soal
            return csvText
                .trim()
                .split('\n')
                .slice(1) // Hapus baris header
                .map(row => {
                    // Temukan posisi koma terakhir sebagai pemisah antara teks dan tipe
                    const lastCommaIndex = row.lastIndexOf(',');
                    if (lastCommaIndex === -1) return null; // Abaikan baris yang tidak valid

                    let text = row.substring(0, lastCommaIndex);
                    let type = row.substring(lastCommaIndex + 1);

                    // Bersihkan tanda kutip pembungkus dari teks jika ada
                    if (text.startsWith('"') && text.endsWith('"')) {
                        text = text.slice(1, -1);
                    }

                    return {
                        text: text.trim().replace(/""/g, '"'), // Mengganti kutip ganda escape menjadi kutip tunggal
                        type: type.trim()
                    };
                }).filter(q => q !== null); // Hapus baris yang tidak valid
        } catch (error) {
            console.error('Error saat mengambil soal:', error);
            alert('Tidak dapat memuat soal dari spreadsheet. Pastikan link publikasi sudah benar dan coba muat ulang halaman.');
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
                            ${[ { value: 0, text: 'Tidak Pernah' }, { value: 1, text: 'Kadang-kadang' }, { value: 2, text: 'Sering' }, { value: 3, text: 'Hampir Selalu' } ].map(({ value, text }) => `
                                <div>
                                    <input type="radio" id="q${questionNumber}-${value}" name="q${questionNumber}" value="${value}" class="option-input">
                                    <label for="q${questionNumber}-${value}" class="option-label text-gray-700">
                                        <span class="font-bold mr-2 text-green-700">${value}</span> - ${text}
                                    </label>
                                </div>
                            `).join('')}
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
        
        const totalQuestionSpan = document.querySelector('#kuesionerStep .font-medium');
        if(totalQuestionSpan) {
            totalQuestionSpan.innerHTML = `Pertanyaan <span id="questionCounter" class="font-bold">1</span> dari ${questions.length}`;
        }
    }

    // ---- BAGIAN UTAMA DENGAN LINK BARU ----
    const googleSheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRA1o8wzpNdcfFZSBKxbkToTBjvDvHfCJ58hXMCO_aEAOeYjfGGXf7tfkDxwIL4qzoFqGgDSeAkcPvR/pub?gid=1682628887&single=true&output=csv';
    questions = await fetchQuestionsFromSheet(googleSheetURL);
    initializeQuiz();


    // ---- SISA SCRIPT (LOGIKA NAVIGASI DAN SUBMIT) TETAP SAMA ----
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

        prevButton.disabled = index === 0;
        nextButton.classList.toggle('hidden', index === questionElements.length - 1);
        submitButton.classList.toggle('hidden', index !== questionElements.length - 1);
        updateQuestionMap();
    }
    
    openNowButton.addEventListener('click', () => {
        landingPageStep.classList.add('hidden');
        dataDiriStep.classList.remove('hidden');
    });

    closeModalButton.addEventListener('click', () => alertModal.classList.add('hidden'));

    mulaiKuisButton.addEventListener('click', function() {
        const employeeName = document.getElementById('employeeName').value;
        const employeeId = document.getElementById('employeeId').value;
        const department = document.getElementById('department').value;
        const age = document.getElementById('age').value;

        if (!employeeName || !employeeId || !department || !age) {
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
        const employeeName = formData.get('employeeName');
        const employeeId = formData.get('employeeId');
        const department = formData.get('department');
        const age = formData.get('age');
        
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

        document.getElementById('depressionScore').textContent = finalScores.D;
        document.getElementById('depressionLevel').textContent = levels.D;
        document.getElementById('anxietyScore').textContent = finalScores.A;
        document.getElementById('anxietyLevel').textContent = levels.A;
        document.getElementById('stressScore').textContent = finalScores.S;
        document.getElementById('stressLevel').textContent = levels.S;

        kuesionerStep.classList.add('hidden');
        resultsDiv.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        exportData = [{
            'Nama Karyawan': employeeName, 'ID Karyawan': employeeId, 'Departemen': department, 'Usia': age,
            'Skor Depresi': finalScores.D, 'Tingkat Depresi': levels.D,
            'Skor Kecemasan': finalScores.A, 'Tingkat Kecemasan': levels.A,
            'Skor Stres': finalScores.S, 'Tingkat Stres': levels.S,
            'Tanggal': new Date().toLocaleDateString('id-ID')
        }];
    });

    exportButton.addEventListener('click', function() {
        if(exportData.length === 0 || exportButton.disabled) return;
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Hasil DASS");
        const employeeName = exportData[0]['Nama Karyawan'].replace(/\s+/g, '_');
        const today = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(workbook, `Hasil_DASS42_${employeeName}_${today}.xlsx`);
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