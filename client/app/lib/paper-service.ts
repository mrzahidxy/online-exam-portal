import axios from "axios";

export interface PaperPayload {
  title: string;
  description: string;
  durationMinutes: number;
  startDate: string;
  endDate: string;
  earlySubmissionRestrictionMinutes: number;
  status: string;
}

export interface PaperResponse extends PaperPayload {
  id: string;
  questions?: Array<{
    id?: string;
    contentHtml?: string;
    marks?: number;
    position?: number;
      subQuestions?: Array<{
        id?: string;
        label?: string;
        question?: string;
        contentHtml?: string;
        marks?: number;
        position?: number;
        questionType?: "DESCRIPTIVE" | "MCQ" | "GRAPH" | "TABLE" | "CIRCUIT";
        mcqOptions?: {
          options: Array<{
            label: string;
            value: string;
        }>;
      };
    }>;
  }>;
}

type ApiResult<T> = {
  payload: T;
  message?: string;
};

const unwrapResponse = <T>(responseData: any): ApiResult<T> => {
  const payload = (responseData?.data as T) ?? (responseData as T);
  const message = responseData?.message as string | undefined;
  return { payload, message };
};

export interface PaperQuestionPayload {
  contentHtml?: string;
  marks: number;
  position: number;
    subQuestions?: Array<{
      label: string;
      question: string;
      marks: number;
      position: number;
      questionType?: "DESCRIPTIVE" | "MCQ" | "GRAPH" | "TABLE" | "CIRCUIT";
      mcqOptions?: {
        options: Array<{
          label: string;
        value: string;
      }>;
    };
  }>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export async function createPaper(payload: PaperPayload) {
  const response = await axios.post(`${API_URL}/papers`, payload, {
    withCredentials: true,
    headers: {
      "Content-Type": "application/json",
    },
  });

  return unwrapResponse<PaperResponse>(response.data);
}

export async function fetchPaper(paperId: string) {
  const response = await axios.get<PaperResponse>(
    `${API_URL}/papers/${paperId}`,
    {
      withCredentials: true,
      headers: {
        Accept: "*/*",
      },
    }
  );

  return unwrapResponse<PaperResponse>(response.data);
}

export async function updatePaper(paperId: string, payload: PaperPayload) {
  const response = await axios.patch(`${API_URL}/papers/${paperId}`, payload, {
    withCredentials: true,
    headers: {
      "Content-Type": "application/json",
      Accept: "*/*",
    },
  });

  return unwrapResponse<PaperResponse>(response.data);
}

export async function addQuestionsToPaper(
  paperId: string,
  questions: PaperQuestionPayload[]
) {
  const response = await axios.post(
    `${API_URL}/papers/${paperId}/questions`,
    questions,
    {
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
        Accept: "*/*",
      },
    }
  );

  return unwrapResponse<PaperResponse>(response.data);
}

export async function updatePaperQuestions(
  paperId: string,
  questions: PaperQuestionPayload[]
) {
  const response = await axios.patch(
    `${API_URL}/papers/${paperId}/questions`,
    questions,
    {
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
        Accept: "*/*",
      },
    }
  );

  return unwrapResponse<PaperResponse>(response.data);
}
