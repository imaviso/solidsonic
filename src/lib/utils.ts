import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function handleVolumeScroll(
	e: WheelEvent,
	currentVolume: number,
	setVolume: (vol: number) => void,
	step = 0.05,
) {
	// Prevent page scroll
	// e.preventDefault(); // Note: passive event listeners cannot preventDefault, handle at call site or use active listener if needed
	// For simple onWheel in JSX, preventDefault works if not passive.

	// Determine scroll direction: negative deltaY is scrolling up (increasing volume)
	const direction = e.deltaY < 0 ? 1 : -1;
	const newVolume = Math.min(1, Math.max(0, currentVolume + direction * step));
	setVolume(newVolume);
}
