import axios from "axios";

export const http = axios.create({
  baseURL: process.env.MEETINGSDK_SERVER,
  timeout: 60000,

  headers: {
    "Content-Type": "application/json",
  },
});
