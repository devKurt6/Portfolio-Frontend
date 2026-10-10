export interface Project {
  slug: string; title: string; description: string; longDescription: string;
  image: string; category: string; tags: string[]; video: string; demo: string;
  github: string; featured: boolean; highlights: string[];
}
export interface WallMessage {
  id: string; name: string; text: string; emoji: string; likes: number;
  timestamp: number; liked: boolean; status: 'published' | 'pending'; mine: boolean;
}
export interface WallPayload { name: string; text: string; emoji: string; website: string; }
export interface WallPage { items: WallMessage[]; total: number; nextOffset: number; }
export interface ContactPayload { name: string; email: string; message: string; 'form-name': string; 'bot-field': string; }
export interface ChatMessage { role: 'user' | 'assistant'; content: string; }
export interface ChatPayload { question: string; session_id: string; username: string; history: ChatMessage[]; }
declare global {
  interface Window { marked?: { parse(text: string, options?: {async: false}): string }; }
}
