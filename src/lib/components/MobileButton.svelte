<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
	type ButtonSize = 'sm' | 'md' | 'lg';

	const dispatch = createEventDispatcher();

	let {
		variant = 'primary',
		size = 'md',
		disabled = false,
		loading = false,
		icon = '',
		class: className = '',
		...restProps
	}: {
		variant?: ButtonVariant;
		size?: ButtonSize;
		disabled?: boolean;
		loading?: boolean;
		icon?: string;
		class?: string;
		[key: string]: any;
	} = $props();

	function handleClick(event: MouseEvent) {
		if (!disabled && !loading) {
			dispatch('click', event);
		}
	}
</script>

<button
	class="mobile-button {variant} {size} {className}"
	class:disabled
	class:loading
	{disabled}
	on:click={handleClick}
	{...restProps}
>
	{#if loading}
		<div class="loading-spinner"></div>
	{:else if icon}
		<span class="button-icon">{icon}</span>
	{/if}
	<slot />
</button>

<style>
	.mobile-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		border: none;
		border-radius: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		position: relative;
		overflow: hidden;
		min-height: 44px;
		min-width: 44px;
		font-family: inherit;
		text-decoration: none;
	}

	/* Variants */
	.primary {
		background: #3b82f6;
		color: white;
		box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
	}

	.primary:hover:not(.disabled) {
		background: #2563eb;
		transform: translateY(-1px);
		box-shadow: 0 4px 8px rgba(59, 130, 246, 0.4);
	}

	.secondary {
		background: #f3f4f6;
		color: #374151;
		border: 1px solid #e5e7eb;
	}

	.secondary:hover:not(.disabled) {
		background: #e5e7eb;
		border-color: #d1d5db;
	}

	.outline {
		background: transparent;
		color: #3b82f6;
		border: 2px solid #3b82f6;
	}

	.outline:hover:not(.disabled) {
		background: #3b82f6;
		color: white;
	}

	.ghost {
		background: transparent;
		color: #6b7280;
	}

	.ghost:hover:not(.disabled) {
		background: #f3f4f6;
		color: #374151;
	}

	.danger {
		background: #ef4444;
		color: white;
		box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
	}

	.danger:hover:not(.disabled) {
		background: #dc2626;
		transform: translateY(-1px);
		box-shadow: 0 4px 8px rgba(239, 68, 68, 0.4);
	}

	/* Sizes */
	.sm {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		min-height: 36px;
	}

	.md {
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
		min-height: 44px;
	}

	.lg {
		padding: 1rem 2rem;
		font-size: 1.125rem;
		min-height: 52px;
	}

	/* States */
	.disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none !important;
		box-shadow: none !important;
	}

	.loading {
		cursor: wait;
	}

	.loading-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid transparent;
		border-top: 2px solid currentColor;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.button-icon {
		font-size: 1.2em;
		display: flex;
		align-items: center;
	}

	/* Ripple effect */
	.mobile-button:active:not(.disabled):not(.loading) {
		transform: scale(0.98);
	}

	/* Focus styles */
	.mobile-button:focus-visible {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
	}

	/* Animation */
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Mobile-specific styles */
	@media (hover: none) and (pointer: coarse) {
		.mobile-button {
			-webkit-tap-highlight-color: transparent;
		}

		.mobile-button:active:not(.disabled) {
			transform: scale(0.95);
		}
	}

	/* Full width variant */
	.mobile-button.full-width {
		width: 100%;
	}
</style>
