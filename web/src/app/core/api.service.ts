import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

// Thin promise-based wrapper over HttpClient. Same-origin (Express serves this
// app), so the session cookie rides along automatically. Unwraps the API's
// `{ error }` body into a thrown Error with a readable message.
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  get<T>(path: string) { return this.run<T>(this.http.get<T>('/api' + path)); }
  post<T>(path: string, body: unknown) { return this.run<T>(this.http.post<T>('/api' + path, body)); }
  put<T>(path: string, body: unknown) { return this.run<T>(this.http.put<T>('/api' + path, body)); }
  delete<T>(path: string) { return this.run<T>(this.http.delete<T>('/api' + path)); }

  private async run<T>(obs: Parameters<typeof firstValueFrom<T>>[0]): Promise<T> {
    try {
      return await firstValueFrom(obs);
    } catch (e) {
      if (e instanceof HttpErrorResponse) {
        throw new Error(e.error?.error || e.message || 'Request failed');
      }
      throw e;
    }
  }
}
