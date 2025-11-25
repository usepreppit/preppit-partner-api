import fs from "fs";
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from 'canvas';
import path from 'path';

// getDocument.GlobalWorkerOptions.workerSrc = './node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs';
const standardFontDataUrl = path.resolve('./node_modules/pdfjs-dist/legacy/standard_fonts/') + path.sep;

export async function extractPage(pdfUrl: string, pageNumber: number, uploadToS3: boolean = false, uploadPath: string = "medications_on_table") {
    try {
        const loadingTask = getDocument({url: pdfUrl, standardFontDataUrl});
        const pdfDocument = await loadingTask.promise;

        const page = await pdfDocument.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 2.0 });

        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');

        const renderContext = {
            canvasContext: context,
            viewport: viewport,
        } as any;

        await page.render(renderContext).promise;

        // Save the canvas to a file
        const buffer = canvas.toBuffer('image/jpeg');
        fs.writeFileSync("medications_on_table", buffer);
        console.log(`Page ${pageNumber} extracted from URL and saved to ${"medications_on_table"}`);
        
        console.log("UploadToS3:", uploadToS3, "UploadPath:", uploadPath);
    } catch (error) {
        console.error('Error extracting PDF page:', error);
    }
}
// export async function extractPage(pdfUrl: string, pageNumber: number, uploadToS3: boolean = false, uploadPath: string = "medications_on_table") {
//     // 1. Fetch the PDF from remote HTTPS
//     const response = await fetch(pdfUrl);
//     const pdfBuffer = await response.arrayBuffer();

//     // 2. Load PDF with pdfjs-dist (robust parsing)
//     const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
//     const pdf = await loadingTask.promise;

//     if (pageNumber < 1 || pageNumber > pdf.numPages) {
//         throw new Error(`Invalid page number. PDF has ${pdf.numPages} pages.`);
//     }

//     const page = await pdf.getPage(pageNumber);

//     // 3. Render page to viewport (get dimensions)
//     const viewport = page.getViewport({ scale: 1.0 });

//     // 4. Create a new PDF and a blank page with same size
//     const newPdf = await PDFDocument.create();
//     const newPage = newPdf.addPage([viewport.width, viewport.height]);

//     // 5. Render PDF page content into SVG path
//     // NOTE: pdfjs-dist doesn’t draw directly into pdf-lib.
//     // We can extract text content instead:
//     const textContent = await page.getTextContent();

//     let y = viewport.height - 30;
//     textContent.items.forEach((item: any) => {
//         if ("str" in item) {
//             newPage.drawText(item.str, {
//                 x: 30,
//                 y,
//                 size: 12,
//                 color: rgb(0, 0, 0),
//             });
//             y -= 14; // move cursor down
//         }
//     });

//     // 6. Save as buffer
//     const outBytes = await newPdf.save();
//     const PdfBuffer = Buffer.from(outBytes);

//     // 7. Optionally upload to S3
//     if (uploadToS3) {
//         try {
//             // const fileStream = fs.createReadStream(outputPath);
//             const s3Response = await uploadBufferToCFBucket(PdfBuffer, "application/pdf", `extracted_page_${pageNumber}.pdf`, "public", uploadPath);
//             console.log(`✅ Uploaded to S3: ${s3Response.document_url}`);
//             return "mocked_extracted_page_url"; // Mocked for now
//         } catch (error) {
//             console.error("❌ Error uploading to S3:", error);
//         }
//     }
// }




/**
 * 
 * @param pdfUrl URL of the PDF document
 */



// import fs from "fs";
// import { PDFDocument } from "pdf-lib";
// import fetch from "node-fetch";
// import { uploadBufferToCFBucket } from "../upload_to_s3.helper";

// export async function extractPage(inputPath: string, outputPath: string, pageNumber: number, uploadToS3: boolean = false, uploadPath: string = "medications_on_table"): Promise<void> {
//     // 1. Load the existing PDF
//      const get_doc = await fetch(inputPath);
//     if (!get_doc.ok) {
//         throw new Error(`Failed to fetch PDF: ${get_doc.statusText}`);
//     }


//     const existingPdfBytes = await get_doc.arrayBuffer();

//     const pdfDoc = await PDFDocument.load(existingPdfBytes, { ignoreEncryption: true });

//     // 2. Create a new PDF
//     const newPdf = await PDFDocument.create();

//     // 3. Copy the target page (pageNumber is 1-based)
//     // const [copiedPage] = await newPdf.copyPages(pdfDoc, [pageNumber - 1]);
//     // newPdf.addPage(copiedPage);

//     // // 4. Save to file
//     // const pdfBytes = await newPdf.save();
//     // const outputBuffer =  Buffer.from(pdfBytes);

//     // Embed the page instead of copy
//     const [embeddedPage] = await newPdf.embedPages([pdfDoc.getPage(pageNumber - 1)]) as any;
//     // const { width, height } = embeddedPage.size;

//     const page = newPdf.addPage([embeddedPage.width, embeddedPage.height]);
//     page.drawPage(embeddedPage);

//     const pdfBytes = await newPdf.save();
//     const outputBuffer = Buffer.from(pdfBytes);



//     fs.writeFileSync(outputPath, pdfBytes);

    



//     console.log(`✅ Extracted page ${pageNumber} to ${outputPath}`);

//     // 5. Optionally upload to S3
//     if (uploadToS3) {
//         try {
//             // const fileStream = fs.createReadStream(outputPath);
//             const s3Response = await uploadBufferToCFBucket(outputBuffer, "application/pdf", `${outputPath}.pdf`, "public", uploadPath);
//             console.log(`✅ Uploaded to S3: ${s3Response.document_url}`);
//         } catch (error) {
//             console.error("❌ Error uploading to S3:", error);
//         }
//     }
// }

// // Example usage:
// // extractPage("input.pdf", "page4.pdf", 4);
