import { S3Client, PutObjectCommand, S3ServiceException, GetObjectCommand, NoSuchKey, ListObjectsV2Command, ListObjectsV2CommandInput, ListObjectsV2CommandOutput  } from "@aws-sdk/client-s3";
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from "uuid";
import { Request } from "express";
// import { Readable } from "stream";
const fs = require('fs');

// const IAM_USER_KEY = process.env.AWS_S3_ACCESS_KEYID!;
// const IAM_USER_SECRET = process.env.AWS_S3_SECRET_ACCESS_KEY!;
// const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;
// const REGION = process.env.AWS_S3_REGION!;
// const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID!;

const IAM_USER_KEY = process.env.AWS_S3_CF_ACCESS_KEYID as string;
const IAM_USER_SECRET = process.env.AWS_S3_CF_SECRET_ACCESS_KEY!;
const BUCKET_NAME = process.env.AWS_S3_CF_PROFILE_BUCKET_NAME!;
const REGION = process.env.AWS_S3_CF_REGION!;
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID!;

const s3bucket = new S3Client({ 
	region: REGION,
	endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`, //Applicable only on cloudflare additon
	credentials: {
		accessKeyId: IAM_USER_KEY,
		secretAccessKey: IAM_USER_SECRET,
	},
});

export async function uploadToCFBucket(req: Request, file_name = "file", tags = {}, acl: string = "", folder:string = ""): Promise<any> {
	const { ...files } = req;
	const fileObject = Object(files);

	const myFile = fileObject.files[file_name].name.split(".");
	// const upd_file_name = fileObject.files[file_name].name

	const file_extension = myFile[myFile.length - 1];
	const file_path = fileObject.files[file_name].tempFilePath;
	const file_key = `${uuid()}.${file_extension}`;

	const fileContent = await fs.promises.readFile(file_path);

	const tagString = Object.entries(tags).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join("&");
	console.log("tagString", tagString);
	const command = new PutObjectCommand({
		Bucket: BUCKET_NAME,
		Key: folder == "" ? file_key : `${folder}/${file_key}`,
		Body: fileContent,
		// Tagging: tagString,
		ContentType: fileObject.files[file_name].mimetype,
		ACL: acl == "public" ? "public-read" : "private",
	});

	try {
		const response = await s3bucket.send(command);
		let document_url: string;
		if (acl === "public") {
			// Cloudflare R2 public URL format (requires public bucket or public access policy)
			const baseUrl = folder === "exam-references" 
				? process.env.CF_PROFILE_PICTURE_PUB_URL 
				: process.env.CF_PROFILE_PICTURE_PUB_URL;
			document_url = folder === "" ? `${baseUrl}/${file_key}` : `${baseUrl}/${folder}/${file_key}`;
		} else {
			// Private bucket → generate signed URL
			const keyPath = folder === "" ? file_key : `${folder}/${file_key}`;
			document_url = await getPresignedUrl(keyPath, 3600 * 24 * 5); // 1h expiry
		}
		const update_data = { ...response, ...{ document_name: fileObject.files[file_name].name }, document_url: document_url, document_key: file_key };

		return update_data;
	} catch (caught) {
		if (
			caught instanceof S3ServiceException &&
			caught.name === "EntityTooLarge"
		) {
		  	console.error(
				`Error from S3 while uploading object to ${BUCKET_NAME}. \
				The object was too large. To upload objects larger than 5GB, use the S3 console (160GB max) \
				or the multipart upload API (5TB max).`,
		  	);
		} else if (caught instanceof S3ServiceException) {
			console.error(
				`Error from S3 while uploading object to ${BUCKET_NAME}.  ${caught.name}: ${caught.message}`,
			);
		} else {
		  	throw caught;
		}
	}
}

export async function uploadBufferToCFBucket(buffer: Buffer, mimeType: string, originalName: string, acl: string = "", folder: string = ""): Promise<any> {
	const myFile = originalName.split(".");
	const file_extension = myFile[myFile.length - 1];
	const file_key = `${uuid()}.${file_extension}`;

	const command = new PutObjectCommand({
		Bucket: BUCKET_NAME,
		Key: folder === "" ? file_key : `${folder}/${file_key}`,
		Body: buffer,
		ContentType: mimeType,
		ACL: acl === "public" ? "public-read" : "private",
	});

	try {
		const response = await s3bucket.send(command);
		let document_url: string;

		if (acl === "public") {
			// Public R2 URL
			document_url = `${process.env.CF_PROFILE_PICTURE_PUB_URL}/${folder}/${file_key}`;
		} else {
			// Private bucket → signed URL
			document_url = await getPresignedUrl(file_key, 3600 * 24 * 5);
		}

		return {
			...response,
			document_name: originalName,
			document_url,
			document_key: file_key,
		};
	} catch (caught) {
		if (caught instanceof S3ServiceException) {
			console.error(`Error uploading to ${BUCKET_NAME}: ${caught.name} - ${caught.message}`);
		}
		throw caught;
	}
}

export async function fetchFromCFbucket(key: string, expiry : number = 3600): Promise<any> {
	try {
		const response = await s3bucket.send(
			new GetObjectCommand({
				Bucket: BUCKET_NAME,
				Key: key,
			}),
		);

		const Body = response.Body;
		if (!Body) {
			throw new Error("Body is undefined.");
		}

		const document_url = await getPresignedUrl(key, expiry);
		return document_url;
	} catch (caught) {
		if (caught instanceof NoSuchKey) {
			console.error(
				`Error from S3 while getting object "${key}" from "${BUCKET_NAME}". No such key exists.`,
			);
		} else if (caught instanceof S3ServiceException) {
			console.error(
				`Error from S3 while getting object from ${BUCKET_NAME}.  ${caught.name}: ${caught.message}`,
			);
		} else {
		  	throw caught;
		}
	}
}

export async function getAllObjectsInBucket(bucket_name: string): Promise<any> {
	try {
		let ContinuationToken: string | undefined = undefined;
		let objects: NonNullable<ListObjectsV2CommandOutput["Contents"]> = [];

		do {
			const input: ListObjectsV2CommandInput = {
				Bucket: bucket_name,
				ContinuationToken,
			};

			const command = new ListObjectsV2Command(input);

			// response is strongly typed
			const response: ListObjectsV2CommandOutput = await s3bucket.send(command);

			if (response.Contents) {
				objects.push(...response.Contents);
			}

			ContinuationToken = response.NextContinuationToken;
		} while (ContinuationToken);

		return objects;
	} catch (caught) {
		if (caught instanceof S3ServiceException) {
			console.error(
				`Error from S3 while getting object from ${BUCKET_NAME}.  ${caught.name}: ${caught.message}`,
			);
		} else {
		  	throw caught;
		}
	}
}

export async function getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
	const command = new GetObjectCommand({
	  Bucket: BUCKET_NAME,
	  Key: key,
	});
  
	return getSignedUrl(s3bucket, command, { expiresIn });
}

