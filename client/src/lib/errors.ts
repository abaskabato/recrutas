export class ApiError extends Error {
  response: Response;

  constructor(response: Response, message?: string) {
    super(message || `API Error: ${response.status} ${response.statusText}`);
    this.response = response;
    this.name = "ApiError";
  }
}
