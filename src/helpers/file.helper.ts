import { Request } from "express";

// export async function processFile(req: Request, validate_extension: string[], validate_headers: string[], validate_data: Record<string, string>): Promise<any> { 
//     //validate the file extension
//     const { file_extension, file_path } = getFileBreakdown(req);
//     switch (file_extension) {
//         case 'csv':
//             return processCSVFile(file_path, file_extension, validate_extension, validate_headers, validate_data);
//         case 'xls':
//         case 'xlsx':
//             return processExcelFile(file_path);
//         default:
//             throw new ValidationError(`Invalid file extension: ${file_extension}`);
//     }
// }

export function getFileBreakdown(req: Request, file_name = "file"): { file_path: string, file_name: string, file_extension: string, original_request: Request } {
    const { ...files } = req;
    const fileObject = Object(files);

    const myFile = fileObject.files[file_name].name.split(".");

    const file_extension = myFile[myFile.length - 1];
    const file_path = fileObject.files[file_name].tempFilePath;

    return { file_path, file_name: fileObject.files[file_name].name, file_extension, original_request: req};
}