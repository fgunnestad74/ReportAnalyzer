# Report Analyzer

A web-based application that uses Claude AI to analyze company reports and generate comprehensive summaries with key insights, market trends, and risk assessments.

## Features

- **AI-Powered Analysis**: Uses Claude AI (Claude-3-Haiku) to analyze company reports
- **Customizable Prompts**: Tailor the analysis prompt to your specific needs
- **PDF Text Extraction**: Built-in OCR functionality to extract text from PDF documents
- **Structured Output**: Generates organized reports with sections for:
  - Executive Summary
  - Key Performance Indicators
  - Market Trends
  - AI Developments
  - Future Outlook
  - Risks and Challenges
  - Conclusion
- **Download Reports**: Export analysis results as formatted HTML files
- **Modern UI**: Clean, responsive interface with tooltips and loading indicators

## Prerequisites

- Node.js (version 14 or higher)
- npm (comes with Node.js)
- Claude AI API key from Anthropic

## Installation

1. **Clone or download the project files**

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up your Claude AI API key**:
   - Get an API key from [Anthropic Console](https://console.anthropic.com/)
   - **Option 1**: Copy `config.js` to `config.local.js` and replace the API key:
   ```javascript
   apiKey: 'your-claude-api-key-here'
   ```
   - **Option 2**: Set an environment variable:
   ```bash
   export CLAUDE_API_KEY='your-claude-api-key-here'
   ```

## Usage

### Starting the Application

1. **Start the server**:
   ```bash
   npm start
   ```

2. **Open your browser** and navigate to:
   ```
   http://localhost:3000
   ```

### Analyzing Reports

1. **Customize the Analysis Prompt** (optional):
   - The default prompt is designed to analyze company reports comprehensively
   - You can modify it to focus on specific aspects or industries
   - The `{{COMPANY_REPORT}}` placeholder must remain in the prompt

2. **Input Your Report**:
   - **Option 1**: Paste text directly into the "Company Report" field
   - **Option 2**: Use the "Extract from PDF" feature to extract text from PDF files

3. **Run Analysis**:
   - Click "Analyze Report" to send the content to Claude AI
   - Wait for the analysis to complete (usually takes 10-30 seconds)

4. **Review Results**:
   - The analysis will be displayed in a structured format
   - Each section provides specific insights about the company

5. **Download Report** (optional):
   - Click "Download Analysis" to save the results as an HTML file
   - The file will be named with the company name and current date

### PDF Text Extraction

1. Click "Extract from PDF" to open the PDF extraction modal
2. Select a PDF file from your computer
3. Click "Start Extract" to begin OCR processing
4. Wait for the text extraction to complete
5. Review the extracted text and click "Use This Text" to transfer it to the main report field

## Project Structure

```
ReportAnalyzer/
├── index.html          # Main web interface
├── style.css           # Styling and layout
├── script.js           # Frontend JavaScript logic
├── server.js           # Express.js backend server
├── package.json        # Project dependencies and scripts
├── config.js           # Default configuration template
├── config.local.js     # Local configuration (create this file)
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

## API Endpoints

- `GET /` - Serves the main HTML page
- `POST /api/claude` - Proxies requests to Claude AI API
- `POST /api/download-html` - Generates downloadable HTML reports

## Dependencies

### Backend
- `express` - Web server framework
- `cors` - Cross-origin resource sharing
- `node-fetch` - HTTP client for API requests

### Frontend
- `pdf.js` - PDF parsing and rendering
- `tesseract.js` - OCR (Optical Character Recognition) for text extraction

## Configuration

### Claude AI Settings
The application uses Claude-3-Haiku model with the following settings:
- Max tokens: 4000
- API version: 2023-06-01

### Server Configuration
- Port: 3000 (configurable in `config.js` or `config.local.js`)
- CORS enabled for all origins
- Static file serving for the web interface

## Error Handling

The application includes comprehensive error handling for:
- Invalid API keys
- Network connectivity issues
- Rate limiting (429 errors)
- API overload (529 errors)
- PDF processing errors
- OCR failures

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

Note: PDF text extraction works best in Chrome due to better PDF.js support.

## Troubleshooting

### Common Issues

1. **"Claude API Error"**:
   - Check your API key is correct and active
   - Ensure you have sufficient API credits
   - Verify internet connectivity

2. **PDF extraction not working**:
   - Try using Chrome browser
   - Ensure the PDF is not password-protected
   - Check that the PDF contains text (not just images)

3. **Server won't start**:
   - Verify Node.js is installed (`node --version`)
   - Check that port 3000 is not in use
   - Ensure all dependencies are installed (`npm install`)

### Performance Tips

- For large reports, consider breaking them into smaller sections
- PDF extraction works best with text-based PDFs rather than scanned documents
- The analysis quality depends on the clarity and structure of the input report

## License

MIT License - see the LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review the browser console for error messages
3. Ensure your Claude API key is valid and has sufficient credits

---

**Note**: This application requires an active Claude AI API key from Anthropic. The API key is stored in `config.local.js` which is excluded from version control via `.gitignore` to keep it secure. 