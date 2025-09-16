// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

// Types pour l'application
export interface ChallengeType {
	name: string;
	images: string[];
}

export interface AnalysisResult {
	similarity: number;
	edgeMatch: number;
	colorMatch: number;
	compositionMatch: number;
	feedback: string;
}

export interface CameraPermission {
	granted: boolean;
	error?: string;
}

export {};
