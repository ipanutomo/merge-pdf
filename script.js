// Konfigurasi PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';

class PDFMerger {
    constructor() {
        this.files = [];
        this.init();
    }

    init() {
        this.dropArea = document.getElementById('dropArea');
        this.fileInput = document.getElementById('fileInput');
        this.fileList = document.getElementById('fileList');
        this.mergeBtn = document.getElementById('mergeBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.progress = document.getElementById('progress');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Click to upload
        this.dropArea.addEventListener('click', () => {
            this.fileInput.click();
        });

        // File input change
        this.fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        // Drag and drop
        this.dropArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropArea.classList.add('dragover');
        });

        this.dropArea.addEventListener('dragleave', () => {
            this.dropArea.classList.remove('dragover');
        });

        this.dropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropArea.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });

        // Control buttons
        this.mergeBtn.addEventListener('click', () => {
            this.mergePDFs();
        });

        this.resetBtn.addEventListener('click', () => {
            this.reset();
        });
    }

    handleFiles(fileList) {
        const newFiles = Array.from(fileList).filter(file => {
            // Validasi file PDF
            if (file.type !== 'application/pdf') {
                alert(`File "${file.name}" bukan PDF. Hanya file PDF yang didukung.`);
                return false;
            }

            // Validasi ukuran file (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert(`File "${file.name}" terlalu besar. Maksimal 5MB per file.`);
                return false;
            }

            return true;
        });

        // Validasi jumlah file (max 10)
        if (this.files.length + newFiles.length > 10) {
            alert('Maksimal 10 file PDF yang dapat digabung sekaligus.');
            return;
        }

        this.files.push(...newFiles);
        this.renderFileList();
        this.updateMergeButton();
    }

    renderFileList() {
        this.fileList.innerHTML = '';

        this.files.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            
            fileItem.innerHTML = `
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${this.formatFileSize(file.size)}</div>
                </div>
                <button class="remove-btn" data-index="${index}">Hapus</button>
            `;

            this.fileList.appendChild(fileItem);
        });

        // Add event listeners untuk tombol hapus
        this.fileList.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.removeFile(index);
            });
        });
    }

    removeFile(index) {
        this.files.splice(index, 1);
        this.renderFileList();
        this.updateMergeButton();
    }

    updateMergeButton() {
        this.mergeBtn.disabled = this.files.length < 2;
    }

    async mergePDFs() {
        if (this.files.length < 2) {
            alert('Pilih minimal 2 file PDF untuk digabung.');
            return;
        }

        this.showProgress(0, 'Memulai penggabungan...');

        try {
            const mergedPdf = await PDFLib.PDFDocument.create();

            for (let i = 0; i < this.files.length; i++) {
                const file = this.files[i];
                const progress = (i / this.files.length) * 100;
                this.showProgress(progress, `Memproses ${file.name}...`);

                // Baca file sebagai ArrayBuffer
                const arrayBuffer = await this.readFileAsArrayBuffer(file);
                
                // Load PDF
                const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
                
                // Copy pages
                const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
                pages.forEach(page => mergedPdf.addPage(page));
            }

            this.showProgress(100, 'Menyimpan file...');

            // Save merged PDF
            const mergedPdfBytes = await mergedPdf.save();
            
            // Download
            const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
            saveAs(blob, 'merged-document.pdf');

            this.showProgress(100, 'Selesai! File telah didownload.');
            
            // Reset setelah 2 detik
            setTimeout(() => {
                this.reset();
            }, 2000);

        } catch (error) {
            console.error('Error merging PDFs:', error);
            alert('Terjadi error saat menggabungkan PDF. Pastikan file PDF tidak rusak dan coba lagi.');
            this.hideProgress();
        }
    }

    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    showProgress(percent, text) {
        this.progress.style.display = 'block';
        this.progressFill.style.width = percent + '%';
        this.progressText.textContent = text;
    }

    hideProgress() {
        this.progress.style.display = 'none';
    }

    reset() {
        this.files = [];
        this.fileInput.value = '';
        this.fileList.innerHTML = '';
        this.updateMergeButton();
        this.hideProgress();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize app ketika DOM loaded
document.addEventListener('DOMContentLoaded', () => {
    new PDFMerger();
});