import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("pm_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const downloadPdf = async (machineId, hours = 1) => {
  const token = localStorage.getItem("pm_token");
  const res = await fetch(`${API}/report/pdf?machine_id=${machineId}&hours=${hours}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to download report");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pm-report-${machineId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
