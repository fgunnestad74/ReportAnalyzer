/**
 * Report Analyzer JavaScript
 * Handles the analysis of company reports using Claude AI
 */

// Claude API Configuration - Using local server proxy
window.claude = {
    async complete(prompt, signal = null) {
        try {
            console.log('Making Claude API request via proxy...');
            const fetchOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt })
            };

            // Add signal if provided
            if (signal) {
                fetchOptions.signal = signal;
            }

            const response = await fetch('/api/claude', fetchOptions);

            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    if (errorData.error) {
                        errorMessage = errorData.error;
                    }
                } catch (e) {
                    // If we can't parse the error response, use the status text
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log('Claude API response received');
            return data.content;
        } catch (error) {
            console.error('Claude API Error:', error);
            throw error;
        }
    }
};

class ReportAnalyzer {
    constructor() {
        this.promptField = document.getElementById('promptField');
        this.reportField = document.getElementById('reportField');
        this.clearBtn = document.getElementById('clearBtn');
        this.analyzeBtn = document.getElementById('analyzeBtn');
        this.stopAnalysisBtn = document.getElementById('stopAnalysisBtn');
        this.resultsContainer = document.getElementById('resultsContainer');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.downloadSection = document.getElementById('downloadSection');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.extractBtn = document.getElementById('extractBtn');
        this.extractModal = document.getElementById('extractModal');
        this.closeModal = document.querySelector('.close');
        
        // Analysis control
        this.isAnalyzing = false;
        this.currentAnalysisController = null;
        
        // Initialize PDF Text Extractor
        this.pdfExtractor = new PDFTextExtractor();
        
        this.initializeEventListeners();
    }

    /**
     * Initialize event listeners for buttons
     */
    initializeEventListeners() {
        this.clearBtn.addEventListener('click', () => this.clearFields());
        this.analyzeBtn.addEventListener('click', () => this.analyzeReport());
        this.downloadBtn.addEventListener('click', () => this.downloadAnalysis());
        this.extractBtn.addEventListener('click', () => this.openExtractModal());
        this.closeModal.addEventListener('click', () => this.closeExtractModal());
        
        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            if (event.target === this.extractModal) {
                this.closeExtractModal();
            }
        });
        
        // Set up PDF input listener
        document.getElementById('pdfInput').addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (file) {
                if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                    alert('Please select a PDF file.');
                    return;
                }
                
                // Store the file for later processing
                this.pdfExtractor.selectedFile = file;
                
                // Show Start Extract button and hide Cancel button
                document.getElementById('startExtractBtn').style.display = 'inline-block';
                document.getElementById('cancelBtn').style.display = 'none';
                
                // Update status
                this.pdfExtractor.showStatus('PDF file loaded. Click "Start Extract" to begin OCR processing.', 'info');
            }
        });
    }

    /**
     * Clear all input fields and reset results
     */
    clearFields() {
        this.reportField.value = '';
        this.resultsContainer.innerHTML = '<p class="placeholder-text">Analysis results will appear here after you click "Analyze Information".</p>';
        this.downloadSection.style.display = 'none';
    }

    /**
     * Validate inputs before analysis
     */
    validateInputs() {
        const prompt = this.promptField.value.trim();
        const report = this.reportField.value.trim();

        if (!prompt) {
            this.showError('Please enter an analysis prompt.');
            return false;
        }

        if (!report) {
            this.showError('Please paste a company report to analyze.');
            return false;
        }

        if (!prompt.includes('{{COMPANY_REPORT}}')) {
            this.showError('The prompt must contain the placeholder {{COMPANY_REPORT}} where the report content will be inserted.');
            return false;
        }

        return true;
    }

    /**
     * Show loading state
     */
    showLoading() {
        this.loadingIndicator.style.display = 'block';
        this.analyzeBtn.disabled = true;
        this.analyzeBtn.classList.add('analyzing');
        this.analyzeBtn.textContent = 'Analyzing...';
        this.stopAnalysisBtn.style.display = 'inline-block';
        this.resultsContainer.innerHTML = '';
        this.isAnalyzing = true;
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        this.loadingIndicator.style.display = 'none';
        this.analyzeBtn.disabled = false;
        this.analyzeBtn.classList.remove('analyzing');
        this.analyzeBtn.textContent = 'Analyze Information';
        this.stopAnalysisBtn.style.display = 'none';
        this.isAnalyzing = false;
        this.currentAnalysisController = null;
    }

    /**
     * Show error message
     */
    showError(message) {
        this.resultsContainer.innerHTML = `
            <div class="error-message" style="color: #dc3545; background: #f8d7da; padding: 1rem; border-radius: 8px; border: 1px solid #f5c6cb;">
                <strong>Error:</strong> ${message}
            </div>
        `;
    }





    /**
     * Main analysis function
     */
    async analyzeReport() {
        // Validate inputs
        if (!this.validateInputs()) {
            return;
        }

        // Create abort controller for cancellation
        this.currentAnalysisController = new AbortController();
        const signal = this.currentAnalysisController.signal;

        try {
            // Show loading state
            this.showLoading();

            // Prepare the prompt with the actual report content
            const prompt = this.promptField.value.trim();
            const reportContent = this.reportField.value.trim();
            const finalPrompt = prompt.replace('{{COMPANY_REPORT}}', reportContent);

            // Call Claude API with abort signal
            const response = await window.claude.complete(finalPrompt, signal);

            // Check if analysis was cancelled
            if (signal.aborted) {
                return;
            }

            // Process and display results
            this.displayResults(response);

        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Analysis was cancelled by user');
                this.showError('Analysis was cancelled.');
            } else {
                console.error('Analysis error:', error);
                this.showError(`Failed to analyze the report: ${error.message}`);
            }
        } finally {
            // Hide loading state
            this.hideLoading();
        }
    }

    /**
     * Parse Claude response and extract structured sections
     */
    parseAnalysisResponse(response) {
        const sections = {};
        
        // Define the expected sections
        const sectionTags = [
            'executive_summary',
            'key_performance_indicators', 
            'market_trends',
            'ai_developments',
            'future_outlook',
            'risks_and_challenges',
            'conclusion'
        ];

        // Extract each section using regex
        sectionTags.forEach(tag => {
            const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, 's');
            const match = response.match(regex);
            if (match) {
                sections[tag] = match[1].trim();
            }
        });

        return sections;
    }

    /**
     * Convert section key to readable title
     */
    getSectionTitle(key) {
        const titles = {
            'executive_summary': 'Executive Summary',
            'key_performance_indicators': 'Key Performance Indicators',
            'market_trends': 'Market Trends',
            'ai_developments': 'AI Developments',
            'future_outlook': 'Future Outlook',
            'risks_and_challenges': 'Risks and Challenges',
            'conclusion': 'Conclusion'
        };
        return titles[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Format and display the analysis results
     */
    displayResults(response) {
        try {
            // Try to parse structured response first
            const sections = this.parseAnalysisResponse(response);
            
            if (Object.keys(sections).length > 0) {
                // Display structured results
                this.displayStructuredResults(sections);
            } else {
                // Display raw response if no structure detected
                this.displayRawResults(response);
            }
        } catch (error) {
            console.error('Error displaying results:', error);
            this.displayRawResults(response);
        }
    }

    /**
     * Display structured analysis results
     */
    displayStructuredResults(sections) {
        let html = '<div class="analysis-results">';
        
        // Define the order of sections
        const sectionOrder = [
            'executive_summary',
            'key_performance_indicators',
            'market_trends', 
            'ai_developments',
            'future_outlook',
            'risks_and_challenges',
            'conclusion'
        ];

        sectionOrder.forEach(key => {
            if (sections[key]) {
                html += `
                    <div class="analysis-section">
                        <h3>${this.getSectionTitle(key)}</h3>
                        <div class="section-content">
                            ${this.formatSectionContent(sections[key])}
                        </div>
                    </div>
                `;
            }
        });

        html += '</div>';
        this.resultsContainer.innerHTML = html;
        this.downloadSection.style.display = 'block';
    }

    /**
     * Display raw analysis results
     */
    displayRawResults(response) {
        const formattedResponse = this.formatTextContent(response);
        this.resultsContainer.innerHTML = `
            <div class="analysis-results">
                <div class="analysis-section">
                    <h3>Analysis Results</h3>
                    <div class="section-content">
                        ${formattedResponse}
                    </div>
                </div>
            </div>
        `;
        this.downloadSection.style.display = 'block';
    }

    /**
     * Format section content with proper paragraph breaks and lists
     */
    formatSectionContent(content) {
        // Split into paragraphs and format
        let formatted = content
            .split('\n\n')
            .map(paragraph => paragraph.trim())
            .filter(paragraph => paragraph.length > 0)
            .map(paragraph => {
                // Check if it's a list (starts with - or *)
                if (paragraph.includes('\n-') || paragraph.includes('\n*')) {
                    const lines = paragraph.split('\n');
                    const intro = lines[0];
                    const listItems = lines.slice(1)
                        .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
                        .map(line => `<li>${line.trim().substring(1).trim()}</li>`)
                        .join('');
                    
                    return `<p>${intro}</p><ul>${listItems}</ul>`;
                } else {
                    return `<p>${paragraph}</p>`;
                }
            })
            .join('');

        return formatted;
    }

    /**
     * Format plain text content with basic HTML formatting
     */
    formatTextContent(text) {
        return text
            .split('\n\n')
            .map(paragraph => paragraph.trim())
            .filter(paragraph => paragraph.length > 0)
            .map(paragraph => `<p>${paragraph}</p>`)
            .join('');
    }

    /**
     * Extract company name from analysis content
     */
    extractCompanyName(analysisContent) {
        // Try to find company name in various ways
        const textContent = analysisContent.replace(/<[^>]*>/g, ' ').toLowerCase();
        
        // Look for common patterns in the analysis
        const patterns = [
            /company\s+([a-zA-Z0-9\s&.-]+?)(?:\s+reported|\s+announced|\s+showed|\s+demonstrated)/i,
            /([a-zA-Z0-9\s&.-]+?)\s+reported\s+strong/i,
            /([a-zA-Z0-9\s&.-]+?)\s+announced/i,
            /([a-zA-Z0-9\s&.-]+?)\s+showed\s+positive/i,
            /([a-zA-Z0-9\s&.-]+?)\s+demonstrated/i,
            /([a-zA-Z0-9\s&.-]+?)\s+achieved/i,
            /([a-zA-Z0-9\s&.-]+?)\s+experienced/i
        ];
        
        for (const pattern of patterns) {
            const match = textContent.match(pattern);
            if (match && match[1]) {
                const companyName = match[1].trim()
                    .replace(/\s+/g, ' ')
                    .replace(/[^\w\s-]/g, '')
                    .trim();
                
                if (companyName.length > 2 && companyName.length < 50) {
                    return companyName;
                }
            }
        }
        
        // If no pattern matches, try to extract from the original report content
        const reportContent = this.reportField.value.trim();
        if (reportContent) {
            const reportText = reportContent.toLowerCase();
            const reportPatterns = [
                /([a-zA-Z0-9\s&.-]+?)\s+(?:quarterly|annual|financial)\s+report/i,
                /([a-zA-Z0-9\s&.-]+?)\s+(?:inc|corp|corporation|company|ltd|limited)/i,
                /([a-zA-Z0-9\s&.-]+?)\s+reported\s+results/i
            ];
            
            for (const pattern of reportPatterns) {
                const match = reportText.match(pattern);
                if (match && match[1]) {
                    const companyName = match[1].trim()
                        .replace(/\s+/g, ' ')
                        .replace(/[^\w\s-]/g, '')
                        .trim();
                    
                    if (companyName.length > 2 && companyName.length < 50) {
                        return companyName;
                    }
                }
            }
        }
        
        return 'Company';
    }

    /**
     * Generate filename with company name and date
     */
    generateFilename(companyName) {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
        const cleanCompanyName = companyName
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .toLowerCase();
        
        return `${cleanCompanyName}-Report-${dateStr}.html`;
    }

    /**
     * Download analysis as HTML
     */
    async downloadAnalysis() {
        try {
            this.downloadBtn.disabled = true;
            this.downloadBtn.innerHTML = '<span class="download-icon">⏳</span> Generating Report...';

            // Get the analysis content from the results container
            const analysisContent = this.resultsContainer.innerHTML;
            
            // Extract company name and generate filename
            const companyName = this.extractCompanyName(analysisContent);
            const filename = this.generateFilename(companyName);

            const response = await fetch('/api/download-html', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ analysisContent })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate HTML report');
            }

            // Create blob and download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error('Download error:', error);
            this.showError(`Failed to download HTML report: ${error.message}`);
        } finally {
            this.downloadBtn.disabled = false;
            this.downloadBtn.innerHTML = '<span class="download-icon">📄</span> Download Analysis';
        }
    }

    /**
     * Open the extract modal
     */
    openExtractModal() {
        this.extractModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    /**
     * Close the extract modal
     */
    closeExtractModal() {
        this.extractModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        this.pdfExtractor.clearExtractedText();
    }

    /**
     * Stop the current analysis
     */
    stopAnalysis() {
        if (this.isAnalyzing && this.currentAnalysisController) {
            this.currentAnalysisController.abort();
            console.log('Analysis stop requested');
        }
    }
}

/**
 * PDF Text Extractor Class
 * 
 * This class provides functionality to:
 * 1. Load and process PDF files
 * 2. Extract text using OCR (Tesseract.js)
 * 3. Save extracted text as a text file
 */
class PDFTextExtractor {
    constructor() {
        this.extractedText = '';
        this.pdfFileName = '';
        this.isProcessing = false;
        this.shouldCancel = false;
        this.currentWorker = null;
        this.selectedFile = null;
        
        // Initialize PDF.js worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        
        // Initialize Tesseract
        this.tesseract = Tesseract;
    }

    /**
     * Extract text from a PDF file using OCR
     * @param {File} pdfFile - The PDF file to process
     * @returns {Promise<string>} - The extracted text
     */
    async extractTextFromPDF(pdfFile) {
        try {
            this.isProcessing = true;
            this.shouldCancel = false;
            this.showCancelButton();
            this.showStatus('Loading PDF file...', 'info');
            this.pdfFileName = pdfFile.name.replace('.pdf', '');
            
            // Validate file
            if (!pdfFile.type.includes('pdf') && !pdfFile.name.toLowerCase().endsWith('.pdf')) {
                throw new Error('Invalid file type. Please select a PDF file.');
            }
            
            if (pdfFile.size > 50 * 1024 * 1024) { // 50MB limit
                throw new Error('File too large. Please select a PDF smaller than 50MB.');
            }
            
            // Load PDF document
            const arrayBuffer = await pdfFile.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            if (pdf.numPages === 0) {
                throw new Error('PDF appears to be empty or corrupted.');
            }
            
            this.showStatus(`Processing ${pdf.numPages} pages...`, 'info');
            
            let allText = '';
            
            // Process each page
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                // Check if cancellation was requested
                if (this.shouldCancel) {
                    this.showStatus('OCR processing cancelled by user.', 'info');
                    this.resetProcessingState();
                    return null;
                }
                
                this.showStatus(`Processing page ${pageNum}/${pdf.numPages}...`, 'info');
                
                const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR
                
                // Create canvas for rendering
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                // Render PDF page to canvas
                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;
                
                // Check again before OCR
                if (this.shouldCancel) {
                    this.showStatus('OCR processing cancelled by user.', 'info');
                    this.resetProcessingState();
                    return null;
                }
                
                // Perform OCR on the canvas
                const result = await this.tesseract.recognize(canvas, 'eng', {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            this.showStatus(`OCR processing page ${pageNum}... ${Math.round(m.progress * 100)}%`, 'info');
                        }
                    }
                });
                
                allText += `\n--- Page ${pageNum} ---\n${result.data.text}\n`;
            }
            
            this.extractedText = allText.trim();
            this.updateTextArea(this.extractedText);
            this.enableSaveButton();
            this.enableUseTextButton();
            this.showStatus('Text extraction completed successfully!', 'success');
            this.resetProcessingState();
            
            return this.extractedText;
            
        } catch (error) {
            console.error('Error extracting text from PDF:', error);
            this.handleError(error);
            this.resetProcessingState();
            throw error;
        }
    }

    /**
     * Handle errors with detailed explanations
     * @param {Error} error - The error object
     */
    handleError(error) {
        let errorMessage = 'An error occurred during text extraction.';
        let errorDetails = error.message;
        
        // Provide specific error messages for common issues
        if (error.message.includes('Invalid file type')) {
            errorMessage = 'Invalid file type selected.';
            errorDetails = 'Please make sure you selected a PDF file (.pdf extension).';
        } else if (error.message.includes('File too large')) {
            errorMessage = 'File size too large.';
            errorDetails = 'The PDF file exceeds the 50MB limit. Please try a smaller file or compress the PDF.';
        } else if (error.message.includes('empty or corrupted')) {
            errorMessage = 'PDF file appears to be corrupted or empty.';
            errorDetails = 'The PDF file could not be read properly. Please try a different PDF file.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = 'Network error occurred.';
            errorDetails = 'There was a problem loading the required libraries. Please check your internet connection and try again.';
        } else if (error.message.includes('OCR') || error.message.includes('Tesseract')) {
            errorMessage = 'OCR processing failed.';
            errorDetails = 'The text recognition process encountered an error. This might be due to poor image quality or unsupported text format.';
        }
        
        this.showErrorWithRetry(errorMessage, errorDetails);
    }

    /**
     * Show error message with retry option
     * @param {string} message - Error message
     * @param {string} details - Error details
     */
    showErrorWithRetry(message, details) {
        const statusDiv = document.getElementById('status');
        if (statusDiv) {
            statusDiv.innerHTML = `
                <div class="status error">
                    <strong>${message}</strong>
                    <div class="error-details">${details}</div>
                    <button class="retry-btn" onclick="this.parentElement.parentElement.innerHTML = ''; document.getElementById('pdfInput').click();">
                        Try Again
                    </button>
                </div>
            `;
        }
    }

    /**
     * Save the extracted text as a text file
     * @param {string} customFileName - Optional custom filename (without extension)
     */
    saveAsTextFile(customFileName = null) {
        if (!this.extractedText) {
            this.showStatus('No text to save. Please extract text from a PDF first.', 'error');
            return;
        }

        try {
            const fileName = customFileName || this.pdfFileName || 'extracted_text';
            const blob = new Blob([this.extractedText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `${fileName}.txt`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            this.showStatus('Text file saved successfully!', 'success');
            
        } catch (error) {
            console.error('Error saving text file:', error);
            this.showStatus(`Error saving file: ${error.message}`, 'error');
        }
    }

    /**
     * Use the extracted text in the main report field
     */
    useExtractedText() {
        if (!this.extractedText) {
            this.showStatus('No text to use. Please extract text from a PDF first.', 'error');
            return;
        }

        // Get the main report field and set the extracted text
        const reportField = document.getElementById('reportField');
        if (reportField) {
            reportField.value = this.extractedText;
            this.showStatus('Text transferred to report field successfully!', 'success');
            
            // Close the modal immediately
            setTimeout(() => {
                if (window.reportAnalyzer) {
                    window.reportAnalyzer.closeExtractModal();
                }
            }, 200);
        }
    }

    /**
     * Get the currently extracted text
     * @returns {string} - The extracted text
     */
    getExtractedText() {
        return this.extractedText;
    }

    /**
     * Set extracted text manually (useful for external integration)
     * @param {string} text - The text to set
     */
    setExtractedText(text) {
        this.extractedText = text;
        this.updateTextArea(text);
        this.enableSaveButton();
        this.enableUseTextButton();
    }

    /**
     * Clear the extracted text
     */
    clearExtractedText() {
        this.extractedText = '';
        this.pdfFileName = '';
        this.updateTextArea('');
        this.disableSaveButton();
        this.disableUseTextButton();
        this.clearStatus();
        this.resetProcessingState();
    }

    /**
     * Update the text area with extracted text
     * @param {string} text - The text to display
     */
    updateTextArea(text) {
        const textArea = document.getElementById('extractedText');
        if (textArea) {
            textArea.value = text;
        }
    }

    /**
     * Enable the save button
     */
    enableSaveButton() {
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.disabled = false;
        }
    }

    /**
     * Disable the save button
     */
    disableSaveButton() {
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.disabled = true;
        }
    }

    /**
     * Enable the use text button
     */
    enableUseTextButton() {
        const useTextBtn = document.getElementById('useTextBtn');
        if (useTextBtn) {
            useTextBtn.disabled = false;
        }
    }

    /**
     * Disable the use text button
     */
    disableUseTextButton() {
        const useTextBtn = document.getElementById('useTextBtn');
        if (useTextBtn) {
            useTextBtn.disabled = true;
        }
    }

    /**
     * Show status message
     * @param {string} message - Status message
     * @param {string} type - Status type (info, error, success)
     */
    showStatus(message, type = 'info') {
        const statusDiv = document.getElementById('status');
        if (statusDiv) {
            statusDiv.innerHTML = `<div class="status ${type}">${message}</div>`;
        }
    }

    /**
     * Clear status message
     */
    clearStatus() {
        const statusDiv = document.getElementById('status');
        if (statusDiv) {
            statusDiv.innerHTML = '';
        }
    }

    /**
     * Cancel the current OCR process
     */
    cancelOCR() {
        this.shouldCancel = true;
        this.showStatus('Cancelling OCR process...', 'info');
        
        // Terminate current Tesseract worker if it exists
        if (this.currentWorker) {
            this.currentWorker.terminate();
            this.currentWorker = null;
        }
    }

    /**
     * Show the cancel button
     */
    showCancelButton() {
        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) {
            cancelBtn.style.display = 'inline-block';
        }
    }

    /**
     * Hide the cancel button
     */
    hideCancelButton() {
        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) {
            cancelBtn.style.display = 'none';
        }
    }

    /**
     * Reset processing state
     */
    resetProcessingState() {
        this.isProcessing = false;
        this.shouldCancel = false;
        this.currentWorker = null;
        this.hideCancelButton();
        // Hide Start Extract button as well
        document.getElementById('startExtractBtn').style.display = 'none';
    }

    /**
     * Check if currently processing
     */
    isCurrentlyProcessing() {
        return this.isProcessing;
    }

    /**
     * Start the extraction process
     */
    async startExtract() {
        if (!this.selectedFile) {
            this.showStatus('No PDF file selected. Please load a PDF file first.', 'error');
            return;
        }

        try {
            // Hide Start Extract button and show Cancel button
            document.getElementById('startExtractBtn').style.display = 'none';
            document.getElementById('cancelBtn').style.display = 'inline-block';
            
            // Start the extraction process
            await this.extractTextFromPDF(this.selectedFile);
        } catch (error) {
            console.error('Extraction failed:', error);
            // Show Start Extract button again if extraction fails
            document.getElementById('startExtractBtn').style.display = 'inline-block';
            document.getElementById('cancelBtn').style.display = 'none';
        }
    }
}

// Global functions for modal integration
function saveAsTextFile() {
    if (window.reportAnalyzer && window.reportAnalyzer.pdfExtractor) {
        window.reportAnalyzer.pdfExtractor.saveAsTextFile();
    }
}

function useExtractedText() {
    if (window.reportAnalyzer && window.reportAnalyzer.pdfExtractor) {
        window.reportAnalyzer.pdfExtractor.useExtractedText();
    }
}

function cancelOCR() {
    if (window.reportAnalyzer && window.reportAnalyzer.pdfExtractor) {
        window.reportAnalyzer.pdfExtractor.cancelOCR();
    }
}

function startExtract() {
    if (window.reportAnalyzer && window.reportAnalyzer.pdfExtractor) {
        window.reportAnalyzer.pdfExtractor.startExtract();
    }
}

function stopAnalysis() {
    if (window.reportAnalyzer) {
        window.reportAnalyzer.stopAnalysis();
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.reportAnalyzer = new ReportAnalyzer();
});

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReportAnalyzer;
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ReportAnalyzer();
});

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReportAnalyzer;
}