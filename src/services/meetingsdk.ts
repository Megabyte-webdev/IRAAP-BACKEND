import { http } from "../config/http.js";

export async function createMeeting(data: {
  title: string;
  createdBy: string;
  isOpen: boolean;
}) {
  const response = await http.post(`${process.env.MEETINGSDK_SERVER}/rooms`, {
    title: data.title,
    created_by: data.createdBy,
    is_open: data.isOpen,
  });

  return response.data;
}
