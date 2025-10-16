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

    // ---- VARIABEL BARU UNTUK PEMILIHAN TES ----
    const testSelectionStep = document.getElementById('testSelectionStep');
    const dass42Button = document.getElementById('dass42Button');
    const dass21Button = document.getElementById('dass21Button');
    let selectedTestType = 'DASS-42';

    // ---- VARIABEL LAMA UNTUK DROPDOWN ----
    const departmentSelect = document.getElementById('department');
    const unitSelect = document.getElementById('unit');
    const tingkatSelect = document.getElementById('tingkat');
    
    let currentQuestionIndex = 0;
    let questionElements = [];
    let mapItemElements = [];
    let questions = [];
    let allQuestions = []; // Simpan semua 42 soal di sini

    // ---- FUNGSI PENYIMPANAN localStorage (DIPERBARUI) ----
    const saveData = (key, data) => localStorage.setItem(key, JSON.stringify(data));
    const loadData = (key) => JSON.parse(localStorage.getItem(key));
    const clearData = () => {
        localStorage.removeItem('dass-step');
        localStorage.removeItem('dass-answers');
        localStorage.removeItem('dass-user-data');
        localStorage.removeItem('dass-current-index');
        localStorage.removeItem('dass-test-type');
    };

    // ... (Fungsi fetchDropdownData dan populateDropdown tetap sama) ...
    async function fetchDropdownData(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Gagal mengambil data dropdown dari jaringan.');
            }
            const csvText = await response.text();
            return csvText.trim().split('\n').filter(item => item);
        } catch (error) {
            console.error('Error saat mengambil data dropdown:', error);
            return [];
        }
    }
    function populateDropdown(selectElement, data, defaultText) {
        if (!selectElement) return;
        selectElement.innerHTML = `<option value="">${defaultText}</option>`;
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item;
            option.textContent = item;
            selectElement.appendChild(option);
        });
    }

    // ---- FUNGSI PARSING CSV UNTUK SOAL ----
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

    // ---- FUNGSI INISIALISASI KUIS ----
    function initializeQuiz() {
        questionsContainer.innerHTML = '';
        questionMapContainer.innerHTML = '';

        if (questions.length === 0) return;
        questions.forEach((q, index) => {
            const questionNumber = index + 1;
            const questionBlock = `
                <div class="question-block absolute w-full transition-opacity duration-300 ease-in-out" data-index="${index}">
                    <div class="p-4 sm:p-6 rounded-lg bg-white/50">
                        <p class="font-semibold text-lg text-gray-800 mb-5">${q.text}</p>
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
    
    // ---- FUNGSI MEMUAT PROGRES ----
    function loadProgress() {
        const savedStep = loadData('dass-step');
        const userData = loadData('dass-user-data');
        const savedAnswers = loadData('dass-answers');
        const savedIndex = loadData('dass-current-index');
        const savedTestType = loadData('dass-test-type');
        document.getElementById("icon-person").classList.add("hidden");
        document.getElementById("icon-person").classList.remove("md:block");
        if (userData) {
            document.getElementById('employeeName').value = userData.employeeName || '';
            document.getElementById('employeeId').value = userData.employeeId || '';
            departmentSelect.value = userData.department || '';
            document.getElementById('age').value = userData.age || '';
            unitSelect.value = userData.unit || '';
            tingkatSelect.value = userData.tingkat || '';
        }

        if (savedStep === 'kuesioner' && savedTestType) {
            selectedTestType = savedTestType;
            prepareAndStartQuiz(savedAnswers, savedIndex);
            
        } else if (savedStep === 'testSelection') {
            landingPageStep.classList.add('hidden');
            dataDiriStep.classList.add('hidden');
            testSelectionStep.classList.remove('hidden');
            document.body.style.backgroundImage = "url('./asset/3background.svg')";
            // document.getElementById("icon-person").classList.add("hidden");
            // document.getElementById("icon-person").classList.remove("md:block");

        } else if (savedStep === 'dataDiri') {
            landingPageStep.classList.add('hidden');
            dataDiriStep.classList.remove('hidden');
            document.body.style.backgroundImage = "url('./asset/3background.svg')";
            // document.getElementById("icon-person").classList.add("hidden");
        }
    }

    // ---- FUNGSI BARU: MENYIAPKAN SOAL DAN MEMULAI KUIS ----
    function prepareAndStartQuiz(savedAnswers = null, savedIndex = null) {
        // Jika DASS-21, ambil soal dengan index genap (soal ke 1, 3, 5, ...)
        if (selectedTestType === 'DASS-21') {
            questions = allQuestions.filter((_, index) => index % 2 === 0);
        } else {
            questions = allQuestions;
        }
        
        initializeQuiz();

        landingPageStep.classList.add('hidden');
        dataDiriStep.classList.add('hidden');
        testSelectionStep.classList.add('hidden');
        instruksiStep.classList.add('hidden');
        kuesionerStep.classList.remove('hidden');
        document.body.style.backgroundImage = "url('./asset/3background.svg')";
        document.getElementById("icon-person").classList.add("hidden");

        if (savedAnswers) {
            Object.keys(savedAnswers).forEach(qName => {
                const value = savedAnswers[qName];
                const radio = document.querySelector(`input[name="${qName}"][value="${value}"]`);
                if (radio) radio.checked = true;
            });
        }
        
        currentQuestionIndex = savedIndex !== null ? savedIndex : 0;
        showQuestion(currentQuestionIndex);
    }

    // ---- BAGIAN UTAMA (DIPERBARUI) ----
    async function initializeApp() {
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
        
        allQuestions = questionData; // Simpan semua soal

        populateDropdown(departmentSelect, bagianData, 'Silahkan pilih bagian anda');
        populateDropdown(unitSelect, unitData, 'Silahkan pilih unit anda');
        populateDropdown(tingkatSelect, tingkatData, 'Silahkan pilih tingkatan anda');
        
        loadProgress();
    }
    
    initializeApp();

    // ... (Fungsi updateQuestionMap dan showQuestion tetap sama) ...
    function showQuestion(index) {
        if(questionElements.length === 0) return;
        questionElements.forEach((el, i) => {
            el.classList.toggle('hidden', i !== index);
        });
        
        const currentQuestionEl = questionElements[index];
        if (currentQuestionEl) {
             questionsContainer.style.height = `${currentQuestionEl.offsetHeight}px`;
        }
        
        const totalQuestionSpan = document.querySelector('#kuesionerStep .font-medium');
        if(totalQuestionSpan && questions.length > 0) {
            totalQuestionSpan.innerHTML = `Pertanyaan <span id="questionCounter" class="font-bold">${index + 1}</span> dari ${questions.length}`;
        }

        prevButton.disabled = index === 0;
        nextButton.classList.toggle('hidden', index === questionElements.length - 1);
        submitButton.classList.toggle('hidden', index !== questionElements.length - 1);
        updateQuestionMap();
        
        saveData('dass-current-index', index);
    }
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

    // ---- EVENT LISTENERS ----

    openNowButton.addEventListener('click', () => {
        landingPageStep.classList.add('hidden');
        dataDiriStep.classList.remove('hidden');
        document.body.style.backgroundImage = "url('./asset/3background.svg')";
        document.getElementById("icon-person").classList.add('hidden');
        saveData('dass-step', 'dataDiri');
    });

    closeModalButton.addEventListener('click', () => alertModal.classList.add('hidden'));

    mulaiKuisButton.addEventListener('click', function() {
        const employeeName = document.getElementById('employeeName').value;
        const employeeId = document.getElementById('employeeId').value;
        const department = document.getElementById('department').value;
        const ageInput = document.getElementById('age').value;
        const unit = document.getElementById('unit').value;
        const tingkat = document.getElementById('tingkat').value;
        document.getElementById("icon-person").classList.add("hidden");
        document.getElementById("icon-person").classList.remove("md:block");

        if (!employeeName || !employeeId || !department || !ageInput || !unit || !tingkat) {
            alertMessage.textContent = 'Pastikan semua data diri terisi.';
            unansweredList.innerHTML = '';
            alertModal.classList.remove('hidden');
            return;
        }
        
        const age = parseInt(ageInput, 10);
        if (isNaN(age) || age < 18 || age > 70) {
            alertMessage.textContent = 'Usia harus diisi dengan angka antara 18 dan 70.';
            unansweredList.innerHTML = '';
            alertModal.classList.remove('hidden');
            return;
        }

        saveData('dass-user-data', { employeeName, employeeId, department, age, unit, tingkat });
        
        dataDiriStep.classList.add('hidden');
        testSelectionStep.classList.remove('hidden');
        
        saveData('dass-step', 'testSelection');
    });

    dass42Button.addEventListener('click', () => {
        selectedTestType = 'DASS-42';
        saveData('dass-test-type', selectedTestType);
        testSelectionStep.classList.add('hidden');
        instruksiStep.classList.remove('hidden');
    });
    
    dass21Button.addEventListener('click', () => {
        selectedTestType = 'DASS-21';
        saveData('dass-test-type', selectedTestType);
        testSelectionStep.classList.add('hidden');
        instruksiStep.classList.remove('hidden');
    });
    
    lanjutKeSoalButton.addEventListener('click', function() {
        saveData('dass-step', 'kuesioner');
        prepareAndStartQuiz();
    });

    // ... (Sisa event listener untuk navigasi, map, dan change tetap sama) ...
    questionMapContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const index = parseInt(e.target.dataset.index, 10);
            currentQuestionIndex = index;
            showQuestion(currentQuestionIndex);
        }
    });

    questionsContainer.addEventListener('change', () => {
        updateQuestionMap();
        
        const formData = new FormData(dassForm);
        const answers = {};
        for (let i = 1; i <= questions.length; i++) {
            if (formData.has(`q${i}`)) {
                answers[`q${i}`] = formData.get(`q${i}`);
            }
        }
        saveData('dass-answers', answers);
        
        setTimeout(() => {
            if (currentQuestionIndex < questions.length - 1) {
                currentQuestionIndex++;
                showQuestion(currentQuestionIndex);
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


    // ---- EVENT SUBMIT FORM (DIPERBARUI) ----
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

        // ---- MODIFIKASI: Kalikan 2 jika DASS-21 ----
        if (selectedTestType === 'DASS-21') {
            scores.D *= 2;
            scores.A *= 2;
            scores.S *= 2;
        }

        const finalScores = { D: scores.D, A: scores.A, S: scores.S };
        const levels = {
            D: getDepressionLevel(finalScores.D),
            A: getAnxietyLevel(finalScores.A),
            S: getStressLevel(finalScores.S)
        };

        const scriptURL = 'https://script.google.com/macros/s/AKfycbyxQ6qvP7HUNsCUdvJoiZj7Km5niMJVagB23TVMz3voJdjCeTrzjwT8VDST01wxGllu/exec';
        
        const params = new URLSearchParams({
            action: 'dass',
            namaKaryawan: formData.get('employeeName'),
            nikSAP: formData.get('employeeId'),
            bagian: formData.get('department'),
            usia: formData.get('age'),
            unit: formData.get('unit'),
            tingkat: formData.get('tingkat'),
            skorD: finalScores.D,
            tingkatD: levels.D,
            skorC: finalScores.A,
            tingkatC: levels.A,
            skorS: finalScores.S,
            tingkatS: levels.S,
            jenisTest: selectedTestType
        });

        fetch(`${scriptURL}?${params.toString()}`)
            .then(response => {
                if (response.ok) {
                    console.log('Data berhasil terkirim ke Spreadsheet.');
                } else {
                    console.error('Gagal mengirim data. Status:', response.status);
                }
            })
            .catch(error => {
                console.error('Error saat mengirim data:', error.message);
                alert('Terjadi kesalahan jaringan. Gagal mengirim data ke server.');
            });

        kuesionerStep.classList.add('hidden');
        endpage.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        clearData();
    });

    // ... (Fungsi getDepressionLevel, getAnxietyLevel, getStressLevel tetap sama) ...
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