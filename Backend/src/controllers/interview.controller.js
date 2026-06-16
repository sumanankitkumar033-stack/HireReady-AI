const pdfParse = require("pdf-parse");
const { generateInterviewReport,generateResumePdf } = require("../services/ai.service");
const interviewReportModel = require("../models/interviewReport.model");

/** 
* @description This controller handles the generation of an interview report based on the user's resume, self-description, and job description. It uses the pdf-parse library to extract text from the uploaded resume and then calls the AI service to generate a personalized interview report. Finally, it saves the report in the database and returns it in the response.
*/
async function generateInterViewReportController(req, res) {

    const resumeContent = await pdfParse(req.file.buffer)
    const { selfDescription, jobDescription, title } = req.body

    const interViewReportByAi = await generateInterviewReport({
        resume: resumeContent.text,
        selfDescription,
        jobDescription,
        title
    })

    const interviewReport = await interviewReportModel.create({
        user: req.user.id,
        resume: resumeContent.text,
        selfDescription,
        jobDescription,
        title,
        ...interViewReportByAi
    })

    res.status(201).json({
        message: "Interview report generated successfully.",
        interviewReport
    })

}

/**
 * @description This controller retrieves an interview report by its ID. It checks if the report exists and if it belongs to the authenticated user before returning it in the response.
 */
async function getInterviewReportByIdController(req, res) {
    const{interviewId} = req.params
    const interviewReport = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id })
    if(!interviewReport){
        return res.status(404).json({
            message: "Interview report not found."
        })
    }
    res.status(200).json({
        message: "Interview report fetched successfully.",
        interviewReport
    })
}

/**
 * @description Controller to get all interview reports of logged in user.
 */
async function getAllInterviewReportsController(req, res) {
    const interviewReports = (await interviewReportModel.find({user: req.user.id})).toSorted({createdAt: -1}).select("-resume -selfDescription -jobDescription -_v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan")
    res.status(200).json({
        message: "Interview reports fetched successfully.",
        interviewReports
    })
}

/**
 * @description Controller to generate resume PDF based on user resume,self-description and job description.
 */
async function generateResumePdfController(req, res) {
    const { interviewReportId } = req.params
    const interviewReport = await interviewReportModel.findById(interviewReportId)

    if(!interviewReport){
        return res.status(404).json({
            message: "Interview report not found."
        })
    }
    const {resume,jobDescription,selfDescription} = interviewReport
    const pdfBuffer = await generateResumePdf({resume,jobDescription,selfDescription})

    res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=resume_${interviewReportId}.pdf"

    })
    res.send(pdfBuffer)

}

module.exports = { generateInterViewReportController, getInterviewReportByIdController, getAllInterviewReportsController, generateResumePdfController };