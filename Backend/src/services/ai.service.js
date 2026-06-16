const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")
const puppeteer = require("puppeteer")

if (!process.env.GOOGLE_GENAI_API_KEY) {
    throw new Error("GOOGLE_GENAI_API_KEY is not defined in environment variables");
}

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})

const interviewReportSchema = z.object({
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job description"),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical question that can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).min(3).max(5).describe("A list of 3 to 5 technical questions"),
    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The behavioral question that can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).min(3).max(5).describe("A list of 3 to 5 behavioral questions"),
    skillGaps: z.array(z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z.enum([ "low", "medium", "high" ]).describe("The severity of this skill gap, i.e. how important is this skill for the job and how much it can impact the candidate's chances")
    })).min(3).max(5).describe("A list of 3 to 5 identified skill gaps"),
    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number in the preparation plan, starting from 1"),
        focus: z.string().describe("The main focus of this day in the preparation plan, e.g. data structures, system design, mock interviews etc."),
        tasks: z.string().describe("A summary of tasks to be done on this day. Use a single descriptive string.")
    })).min(3).max(5).describe("A 3 to 5 day preparation plan"),
    title: z.string().describe("The title of the job for which the interview report is generated"),
})

async function generateInterviewReport({ resume, selfDescription, jobDescription, title }) {

    const prompt = `You are an expert recruitment consultant. Generate a comprehensive interview report for the position: "${title}".
    
    Candidate Context:
    Resume: ${resume}
    Self-Description: ${selfDescription}
    Position: ${title}
    
    Target Job Description:
    ${jobDescription}

    Requirements:
    1. The 'matchScore' should be a numerical value between 0 and 100, reflecting the overall fit. Do not return 0 unless the match is truly non-existent.
    2. Provide exactly 3 to 5 items for each of the following arrays: 'technicalQuestions', 'behavioralQuestions', 'skillGaps', and 'preparationPlan'. Ensure each array is fully populated with meaningful content.
    2. CRITICAL: Every array element MUST be a JSON object, NOT a string.
    3. Use ONLY these property names:
       - technicalQuestions: question, intention, answer
       - behavioralQuestions: question, intention, answer
       - skillGaps: skill, severity
       - preparationPlan: day, focus, tasks
    4. In 'skillGaps', the 'skill' field must be the specific technology or area the candidate is lacking, NOT the severity level.
    5. Do not use placeholder text or generic answers. Provide specific and actionable content.
    6. Return ONLY the raw JSON object. Do not include any conversational text or markdown outside the JSON.
    `

    const schema = zodToJsonSchema(interviewReportSchema, { target: "openapi3" });

    // Using the newer SDK pattern for gemini-3.1-pro-preview
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: schema,
        }
    });

    console.log("Raw AI Response Text:", response.text);

    let result;
    let rawText = response.text;

    // Attempt to extract JSON from markdown code block if present
    const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
        rawText = jsonMatch[1];
    }

    try {
        result = JSON.parse(rawText);
    } catch (e) {
        console.error("Failed to parse AI response as JSON:", rawText, e);
        throw new Error("AI returned invalid JSON structure.");
    }

    // Helper functions to handle cases where the AI "flattens" the array into strings
    // instead of returning an array of objects, and skipping field labels if included.

    const parseTechnicalBehavioralQuestions = (rawArray) => {
        const items = Array.isArray(rawArray) ? rawArray.filter(i => i !== null) : [];
        if (items.length > 0 && typeof items[0] === 'object') return items.slice(0, 5);

        const questions = [];
        let i = 0;
        while (i < items.length && questions.length < 10) {
            // Detect and handle "Key, Value, Key, Value" structure (6 items per object)
            if (items[i] === "question" && i + 5 < items.length) {
                questions.push({
                    question: String(items[i + 1] || ""),
                    intention: String(items[i + 3] || ""),
                    answer: String(items[i + 5] || "")
                });
                i += 6;
            } else if (i + 2 < items.length) {
                // Fallback to value-only triplet
                questions.push({
                    question: String(items[i] || ""),
                    intention: String(items[i + 1] || ""),
                    answer: String(items[i + 2] || "")
                });
                i += 3;
            } else {
                i++;
            }
        }
        return questions;
    };

    const parseSkillGaps = (rawArray) => {
        const items = Array.isArray(rawArray) ? rawArray.filter(i => i !== null) : [];
        if (items.length > 0 && typeof items[0] === 'object') return items.slice(0, 5);

        const gaps = [];
        let i = 0;
        while (i < items.length && gaps.length < 10) {
            // Detect and handle "Key, Value" structure (4 items per object)
            if (items[i] === "skill" && i + 3 < items.length) {
                const severity = String(items[i + 3] || "").toLowerCase();
                gaps.push({
                    skill: String(items[i + 1] || ""),
                    severity: ["low", "medium", "high"].includes(severity) ? severity : "medium"
                });
                i += 4;
            } else if (i + 1 < items.length) {
                // Fallback to value-only pair
                const severity = String(items[i + 1] || "").toLowerCase();
                gaps.push({
                    skill: String(items[i] || ""),
                    severity: ["low", "medium", "high"].includes(severity) ? severity : "medium"
                });
                i += 2;
            } else {
                i++;
            }
        }
        return gaps;
    };

    const parsePreparationPlan = (rawArray) => {
        const items = Array.isArray(rawArray) ? rawArray.filter(i => i !== null) : [];
        if (items.length > 0 && typeof items[0] === 'object') {
            return items.map(item => ({
                ...item,
                day: item && typeof item.day === 'string' ? parseInt(item.day.replace(/\D/g, '')) || 1 : (item?.day || 1),
                // Normalize to string to match Mongoose schema expectations
                tasks: Array.isArray(item.tasks) ? item.tasks.join(". ").trim() : String(item.tasks || "").trim()
            })).slice(0, 5); // Limit to 5 items
        }

        const plans = [];
        let i = 0;
        while (i < items.length && plans.length < 10) {
            let day, focus, rawTasks;
            // Detect and handle "Key, Value" structure (6 items per object)
            if (items[i] === "day" && i + 5 < items.length) {
                day = items[i + 1];
                focus = items[i + 3];
                rawTasks = items[i + 5];
                i += 6;
            } else if (i + 2 < items.length) {
                // Fallback to value-only triplet
                day = items[i];
                focus = items[i + 1];
                rawTasks = items[i + 2];
                i += 3;
            } else {
                i++;
                continue;
            }

            if (day !== undefined) {
                // Ensure tasks is returned as a single string to prevent 'Cast to string failed' errors.
                const tasksValue = Array.isArray(rawTasks) ? rawTasks.join(". ").trim() : String(rawTasks || "").trim();
                
                plans.push({
                    day: parseInt(String(day).replace(/\D/g, '')) || (plans.length + 1),
                    focus: String(focus || ""),
                    tasks: tasksValue
                });
            }
        }
        return plans;
    };

    return {
        matchScore: typeof result.matchScore === 'number' && result.matchScore >= 0 && result.matchScore <= 100 ? result.matchScore : 50,
        title: result.title || title || "Interview Report",
        technicalQuestions: parseTechnicalBehavioralQuestions(result.technicalQuestions),
        behavioralQuestions: parseTechnicalBehavioralQuestions(result.behavioralQuestions),
        skillGaps: parseSkillGaps(result.skillGaps),
        preparationPlan: parsePreparationPlan(result.preparationPlan)
    };
}

async function generatePdfFromHtml(htmlContent) {
    const browser = await puppeteer.launch()
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" })

    const pdfBuffer = await page.pdf({
        format: "A4", margin: {
            top: "20mm",
            bottom: "20mm",
            left: "15mm",
            right: "15mm"
        }
    })

    await browser.close()

    return pdfBuffer
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {

    const resumePdfSchema = z.object({
        html: z.string().describe("The HTML content of the resume which can be converted to PDF using any library like puppeteer")
    })

    const prompt = `Generate resume for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}

                        the response should be a JSON object with a single field "html" which contains the HTML content of the resume which can be converted to PDF using any library like puppeteer.
                        The resume should be tailored for the given job description and should highlight the candidate's strengths and relevant experience. The HTML content should be well-formatted and structured, making it easy to read and visually appealing.
                        The content of resume should be not sound like it's generated by AI and should be as close as possible to a real human-written resume.
                        you can highlight the content using some colors or different font styles but the overall design should be simple and professional.
                        The content should be ATS friendly, i.e. it should be easily parsable by ATS systems without losing important information.
                        The resume should not be so lengthy, it should ideally be 1-2 pages long when converted to PDF. Focus on quality rather than quantity and make sure to include all the relevant information that can increase the candidate's chances of getting an interview call for the given job description.
                    `

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(resumePdfSchema),
        }
    })


    const jsonContent = JSON.parse(response.text)

    const pdfBuffer = await generatePdfFromHtml(jsonContent.html)

    return pdfBuffer

}

module.exports = {
    generateInterviewReport,generateResumePdf
}