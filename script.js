// Konfigurasi PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';

class PDFMerger {
    constructor() {
        this.files = []; // Array of {file: File, pageCount: number}
        this.sortable = null;
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
        this.reorderInfo = document.getElementById('reorderInfo');
        this.pagePreview = document.getElementById('pagePreview');
        this.previewList = document.getElementById('previewList');

        this.setupEventListeners();
        this.initSortable();
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

    initSortable() {
        this.sortable = new Sortable(this.fileList, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            onEnd: (evt) => {
                // Update array files berdasarkan urutan baru
                const movedItem = this.files[evt.oldIndex];
                this.files.splice(evt.oldIndex, 1);
                this.files.splice(evt.newIndex, 0, movedItem);
                
                this.renderFileList();
                this.updatePagePreview();
            }
        });
    }

    async handleFiles(fileList) {
        const newFiles = Array.from(fileList).filter(file => {
            if (file.type !== 'application/pdf') {
                alert(`File "${file.name}" bukan PDF. Hanya file PDF yang didukung.`);
                return false;
            }

            if (file.size > 5 * 1024 * 1024) {
                alert(`File "${file.name}" terlalu besar. Maksimal 5MB per file.`);
                return false;
            }

            return true;
        });

        if (this.files.length + newFiles.length > 10) {
            alert('Maksimal 10 file PDF yang dapat digabung sekaligus.');
            return;
        }

        // Process each file to get page count
        this.showProgress(10, 'Memproses file...');
        
        for (let i = 0; i < newFiles.length; i++) {
            const file = newFiles[i];
            const progress = 10 + (i / newFiles.length) * 40;
            this.showProgress(progress, `Menganalisis ${file.name}...`);
            
            try {
                const pageCount = await this.getPageCount(file);
                this.files.push({
                    file: file,
                    pageCount: pageCount
                });
            } catch (error) {
                console.error(`Error processing ${file.name}:`, error);
                alert(`Gagal memproses "${file.name}". File mungkin rusak.`);
            }
        }

        this.hideProgress();
        this.renderFileList();
        this.updateMergeButton();
        this.updatePagePreview();
        
        if (this.files.length > 1) {
            this.reorderInfo.style.display = 'block';
        }
    }

    async getPageCount(file) {
        return new Promise((resolve, reject) => {
            const fileReader = new FileReader();
            
            fileReader.onload = async function() {
                try {
                    const typedarray = new Uint8Array(this.result);
                    const pdf = await pdfjsLib.getDocument(typedarray).promise;
                    resolve(pdf.numPages);
                } catch (error) {
                    reject(error);
                }
            };
            
            fileReader.onerror = reject;
            fileReader.readAsArrayBuffer(file);
        });
    }

    renderFileList() {
        this.fileList.innerHTML = '';

        this.files.forEach((fileObj, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.dataset.index = index;
            
            fileItem.innerHTML = `
                <div class="file-order">${index + 1}</div>
                <div class="file-main">
                    <div class="file-info">
                        <div class="file-name">${fileObj.file.name}</div>
                        <div class="file-size">${this.formatFileSize(fileObj.file.size)}</div>
                        <div class="file-pages">${fileObj.pageCount} halaman</div>
                    </div>
                    <button class="remove-btn" data-index="${index}">Hapus</button>
                </div>
            `;

            this.fileList.appendChild(fileItem);
        });

        // Add event listeners untuk tombol hapus
        this.fileList.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(e.target.dataset.index);
                this.removeFile(index);
            });
        });
    }

    updatePagePreview() {
        if (this.files.length === 0) {
            this.pagePreview.style.display = 'none';
            return;
        }

        this.pagePreview.style.display = 'block';
        this.previewList.innerHTML = '';

        let globalPageNumber = 1;
        
        this.files.forEach((fileObj, fileIndex) => {
            for (let pageNum = 1; pageNum <= fileObj.pageCount; pageNum++) {
                const previewPage = document.createElement('div');
                previewPage.className = 'preview-page';
                previewPage.innerHTML = `
                    <div class="page-number">Hlm ${globalPageNumber}</div>
                    <div class="file-name">${fileObj.file.name}</div>
                    <div class="page-source">(File ${fileIndex + 1}-${pageNum})</div>
                `;
                this.previewList.appendChild(previewPage);
                globalPageNumber++;
            }
        });
    }

    removeFile(index) {
        this.files.splice(index, 1);
        this.renderFileList();
        this.updateMergeButton();
        this.updatePagePreview();
        
        if (this.files.length <= 1) {
            this.reorderInfo.style.display = 'none';
        }
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
                const fileObj = this.files[i];
                const progress = (i / this.files.length) * 100;
                this.showProgress(progress, `Memproses ${fileObj.file.name}...`);

                const arrayBuffer = await this.readFileAsArrayBuffer(fileObj.file);
                const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
                
                const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
                pages.forEach(page => mergedPdf.addPage(page));
            }

            this.showProgress(100, 'Menyimpan file...');

            const mergedPdfBytes = await mergedPdf.save();
            const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
            
            // Generate nama file berdasarkan urutan
            const fileName = this.generateFileName();
            saveAs(blob, fileName);

            this.showProgress(100, 'Selesai! File telah didownload.');
            
            setTimeout(() => {
                this.reset();
            }, 2000);

        } catch (error) {
            console.error('Error merging PDFs:', error);
            alert('Terjadi error saat menggabungkan PDF. Pastikan file PDF tidak rusak dan coba lagi.');
            this.hideProgress();
        }
    }

    generateFileName() {
        const fileNames = this.files.map(f => f.file.name.replace('.pdf', ''));
        const baseName = fileNames.join('_');
        return `merged_${baseName}_${new Date().getTime()}.pdf`;
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
        this.reorderInfo.style.display = 'none';
        this.pagePreview.style.display = 'none';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    new PDFMerger();
});
