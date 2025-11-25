import Agenda from "agenda";
import dotenv from "dotenv";
import { container } from "../startup/di/container";
import { ExamsService } from "../application/exams/exams.service";

dotenv.config();

const mongoConnectionString =
process.env.MONGODB_URI || "mongodb://localhost:27017/agenda";

const examService = container.get<ExamsService>(ExamsService);

export const agenda = new Agenda({
    db: { address: mongoConnectionString, collection: "scheduled_jobs" },
    defaultConcurrency: 1,
});

agenda.on("error", (err) => {
    console.error("❌ Agenda connection error:", err);
});

agenda.define("create-ai-image-from-medications-on-table", async (job: any) => {
    try {
        console.log("Running recurring job:", new Date());
        console.log("Job data:", job.attrs.data);
        await examService.GenerateScenarioImages();
    } catch (err) {
        console.error("❌ Job execution failed:", err);
    }
});

export const scheduleJobs = async () => {
    try {
        await agenda.start();

        // Remove previous jobs to prevent duplication
        await agenda.cancel({ name: "create-ai-image-from-medications-on-table" });

        // Schedule job to run every 5 minutes
        await agenda.every("45 minutes", "create-ai-image-from-medications-on-table");

        console.log("✅ Recurring job scheduled");
    } catch (error) {
        console.error("❌ Error scheduling jobs:", error);
    }
};

export default agenda;



// import Agenda from 'agenda';
// import dotenv from 'dotenv';
// import { container } from '../startup/di/container';

// import { ExamsService } from '../application/exams/exams.service';



// dotenv.config();

// const mongoConnectionString = (process.env.MONGODB_URI) ? process.env.MONGODB_URI.toString() : 'mongodb://localhost:27017/agenda';

// const examService = container.get<ExamsService>(ExamsService);



// // Initialize Agenda with MongoDB connection
// export const agenda = new Agenda({
//     db: { address: mongoConnectionString, collection: 'scheduled_jobs' },
//     defaultConcurrency: 1, // Process one job at a time
//     // lockLimit: 1, // Prevents duplicate job execution
// });

// agenda.on('ready', async () => {
//     console.log('Agenda connected to MongoDB and ready to process jobs');
// });

// agenda.on('error', (err) => {
//     console.error('❌ Agenda connection error:', err);
// });

// // Define an Agenda job to sort exam medications on table
// agenda.define("my recurring job", async (job: any) => {
//     console.log("Running recurring job every 30 seconds:", new Date());
//     console.log("Job data:", job.attrs.data);
//     await examService.SortExamMedicationsOnTable();
// });



// export const scheduleJobs = async () => {
//     try {
//         await agenda.start();
    
//         // Remove previous jobs to prevent duplication
//         await agenda.cancel({ name: 'my recurring job' });
    
//         // Schedule job to run 30 minutes
//         agenda.every('5 minutes', 'my recurring job'); // Import Contacts from the Database

        
//     } catch (error) {
//         console.error('❌ Error scheduling jobs:', error);
//     }
    
// };

// export default agenda;