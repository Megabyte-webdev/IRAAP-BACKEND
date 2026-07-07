import { http } from "../config/http.js";

export async function createMeeting(data: {
  title: string;
  createdBy: string;
}) {
  const response = await http.post(`${process.env.MEETING_SERVER_URL}/rooms`, {
    title: data.title,
    created_by: data.createdBy,
  });

  return response.data;
}
