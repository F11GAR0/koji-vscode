export function taskLogsBaseUrl(filesUrl: string, taskId: number): string {
  const base = filesUrl.replace(/\/+$/, '');
  const bucket = ((taskId % 10000) + 10000) % 10000; // guard negative
  return `${base}/tasks/${bucket}/${taskId}`;
}

export function taskLogUrl(filesUrl: string, taskId: number, fileName: string): string {
  const clean = fileName.replace(/^\/+/, '');
  return `${taskLogsBaseUrl(filesUrl, taskId)}/${encodeURIComponent(clean)}`;
}

export const COMMON_TASK_LOG_FILES = ['task.log', 'build.log', 'root.log', 'mock.log', 'state.log'] as const;


