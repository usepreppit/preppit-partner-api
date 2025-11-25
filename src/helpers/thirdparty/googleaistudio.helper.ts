import { GoogleGenAI } from "@google/genai";
import { uploadBufferToCFBucket } from "../upload_to_s3.helper";
// import fs from "fs";

const studio_key = process.env.GOOGLE_AI_STUDIO_KEY;
const image_studio_key = process.env.GOOGLE_AI_STUDIO_IMAGE_KEY;

const ai = new GoogleGenAI({ apiKey: studio_key });
const img_ai = new GoogleGenAI({ apiKey: image_studio_key });


export const promptAiStudio = async(prompt: string, model: string = "gemini-2.5-flash", retry: boolean = false): Promise<any> => {
    try {
        console.log("model", model);
        const ai_prompt = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json", // 🔑 Force JSON output
            },
        });
        return ai_prompt.text;
    } catch (error) {
        if(error instanceof Error && error.message.includes("The model is overloaded. Please try again later.") && !retry) {
            //retry once with a different model
            console.log("Retrying with different model...");
            return await promptAiStudio(prompt, "gemini-2.0-flash", true);
        }
        return (error);
    }  
}

export const generateGeminiImage = async (prompt: string) => {
    try {
        // console.log("Prompt:", prompt);
        // const response = await ai.models.generateImages({
        //     model: 'models/imagen-3.0-generate-002',
        //     prompt: `INSERT_INPUT_HERE`,
        //     config: {
        //         numberOfImages: 1,
        //         outputMimeType: 'image/jpeg',
        //         personGeneration: PersonGeneration.ALLOW_ALL,
        //         aspectRatio: '1:1',
        //         // imageSize: '1K',
        //     },
        // });

        // if (!response?.generatedImages) {
        //     console.error('No images generated.');
        //     return;
        // }

        // if (response.generatedImages.length !== 1) {
        //     console.error('Number of images generated does not match the requested number.');
        // }

        // for (let i = 0; i < response.generatedImages.length; i++) {
        //     if (!response.generatedImages?.[i]?.image?.imageBytes) {
        //     continue;
        //     }
        //     const fileName = `image_${i}.jpeg`;
        //     const inlineData = response?.generatedImages?.[i]?.image?.imageBytes;
        //     const buffer = Buffer.from(inlineData || '', 'base64');

        //     console.log(`✅ Image ${i} saved to ${fileName} and ${buffer.length} bytes`);
        //     // saveBinaryFile(fileName, buffer);
        // }
        // console.log("Prompt:", prompt);

        const response = await img_ai.models.generateContent({
            model: "gemini-2.5-flash-image-preview",
            contents: [
                { role: "user", parts: [{ text: prompt }] }
            ],
        });

        // Extract image data
        const imagePart = response.candidates?.[0]?.content?.parts?.find(
            (p: any) => p.inlineData
        );

        if (imagePart?.inlineData?.data) {
            const buffer = Buffer.from(imagePart.inlineData.data, "base64");
            // fs.writeFileSync("output.png", buffer);
            console.log(`✅ Image saved to output.png and ${buffer.length} bytes`);
            //Upload the buffered image to cloudflare and get the URL
            const upload_medication_on_table = await uploadBufferToCFBucket(buffer, "image/png", "ai_image.png", "public", "medications_on_table");
            console.log("Upload response:", upload_medication_on_table);
            return upload_medication_on_table.document_url;
        }

        console.error("No image returned");
        return null;

    } catch (error) {
        console.error("❌ Error generating image:", error);
        throw new Error("Error generating image");
    }
};

// export const generateGeminiImage = async(prompt: string) => { 
//     try { 
//         console.log(prompt); 
//         const ai_image = await ai.models.generateContent({ 
//             model: "gemini-2.5-flash-image-preview", 
//             contents: prompt, 
//             // config: { 
//                 // numberOfImages: 1, 
//                 // includeRaiReason: true, 
//             // }, 
//         }); 
//         console.log(ai_image); 
//         return ai_image; 
//     } catch (error) { 
//         return (error); 
//     } 
// }


// export const generateGeminiImage = async(prompt: string) => {
//     try {
//         console.log(prompt);
//         const ai_image = await ai.models.generateImages({
//             model: "models/gemini-2.5-flash-image-preview",
//             prompt: 'Robot holding a red skateboard in a futuristic city',
//             config: {
//                 numberOfImages: 1,
//                 includeRaiReason: true,
//             },
//         });

//         console.log(ai_image);
//         return ai_image;
//     } catch (error) {
//         return (error);
//     }  
// }

