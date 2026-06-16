import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:3000",
    withCredentials: true

})

/**
 * @description This function generates an interview report by sending a POST request to the backend API. It takes the job description, self-description, and resume file as parameters.
 */
export const generateInterviewReport = async ({jobDescription, selfDescription, resumeFile}) => {
    const formData = new FormData()
    formData.append("jobDescription", jobDescription)
    formData.append("selfDescription", selfDescription)
    formData.append("resume", resumeFile)

    const response = await api.post("/api/interview/",formData,{
        headers: {
            "Content-Type": "multipart/form-data"
        }
    })

    return response.data
}

/**
 * @description This function retrieves an interview report by its ID by sending a GET request to the backend API. It takes the interview ID as a parameter and returns the interview report data.
 */
export const getInterviewReportById = async (interviewId) => {
    const response = await api.get(`/api/interview/report/${interviewId}`)
    return response.data
}

/**
 * @description This function retrieves all interview reports by sending a GET request to the backend API. It returns a list of all interview report data.
 */
export const getAllInterviewReports = async() => {
    const response = await api.get("/api/interview/")
    return response.data
}

/**
 * @description This function generates a resume pdf based on user resume,self-description and job description by sending a POST request to the backend API. It takes the interview report ID as a parameter and returns the generated resume PDF data.
 */
export const generateResumePdf = async ({interviewReportId}) => {
    const response = await api.post(`/api/interview/resume/pdf/${interviewReportId}`,null,{
        responseType: "blob"
    })
    return response.data
}