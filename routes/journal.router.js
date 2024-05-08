import express from "express";
const journalRouter = express.Router();
import {verifyJwtToken}  from "../middleware/jwtmiddleware.js";
import { AddJournal, GetJournals, GenerateListOfMoods, AnalyzeJournal, 
    GetCalendarEventPrompt, GetInsights, fetchWeeklySnapshots } from "../controllers/journal.controller.js";
// import { fetchWeeklySnapshots } from "../cron.js";


journalRouter.post("/add_journal", verifyJwtToken, AddJournal);
journalRouter.get("/get_user_journals", verifyJwtToken, GetJournals);
journalRouter.get("/get_moods_list", GenerateListOfMoods);
journalRouter.post("/analyze_journal", AnalyzeJournal);
journalRouter.get("/get_calendar_prompt", GetCalendarEventPrompt);
journalRouter.get("/get_insights", verifyJwtToken, GetInsights);
journalRouter.get("/run_snapshot_cron", fetchWeeklySnapshots);

// journalRouter.get("/generate_snaps", fetchWeeklySnapshots);



export default journalRouter;