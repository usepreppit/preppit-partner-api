import Validator from "validatorjs";
import moment  from "moment";
import { Response } from 'express'; 
import mongoose, { Model, Document } from 'mongoose';
// import { ValidationError } from "../helpers/error.helper";


export const validator = (body: any, rules: any, customMessages: any, callback: Function) => {
	const validation = new Validator(body, rules, customMessages);
	validation.passes(() => callback(null, true));
	validation.fails(() => callback(validation.errors, false));
};

export const sendError = (res: Response, err: any) => {
	const firstErrorKey = Object.keys(err.errors)[0];
	const firstError = firstErrorKey ? err.errors[firstErrorKey][0] : 'Unknown error';


	res.status(412).send({
		message: firstError,
		details: err.errors,
		success: false,
		statusCode: 412,
	});
};

Validator.register("date_between", (value:any, requirement) => {
	const [startDate, endDate] = requirement.split(",");
	return moment(value).isBetween(startDate, endDate);
  },
	`The :attribute cannot be in the past or later than 7 days from today`,
);

Validator.registerAsync("check_exists", (value, attribute, _ , passes) => {
	if (!attribute) throw new Error('Specify Requirements i.e fieldName: exist:table,column');
	try {
		let attArr = attribute.split(",");
    	if (attArr.length !== 2) throw new Error(`Invalid format for validation rule on ${attribute}`);

		const { 0: table, 1: column } = attArr;
		//define custom error message
		// let msg = (column == "email") ? `${column} has already been taken `: `${column} already in use`
		

		findDocuments(String(table), { [String(column)] : value }).then((result) => {
			if (result.length > 0) {
				const attrName = column;
				const errorMessage = attrName === "email" 
				? `${attrName} has already been taken, please proceed to login.` 
				: `${attrName} has already been taken.`;
		
				passes(false, errorMessage);
				return;
			}
		
			// If no duplicates found
			passes();
		});
	} catch (err) {
		if (err instanceof Error) {
			console.error('Error:', err.message);
		} else {
			console.error('Unknown error:', err);
		}
		passes(false, 'An error occurred while checking for duplicates.');
	}
}, "The :attribute already exists.");



async function findDocuments(modelName: string, query: object): Promise<Document[]> {
	// Ensure the model exists
	if (!mongoose.connection.models[modelName]) {
	  throw new Error(`Model ${modelName} not found.`);
	}
  
	// Get the model
	const model: Model<Document> = mongoose.connection.models[modelName];
  
	// Perform the query
	return await model.find(query).exec();
}