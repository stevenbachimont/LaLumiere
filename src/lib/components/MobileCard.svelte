<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	let {
		title = '',
		subtitle = '',
		icon = '',
		image = '',
		clickable = false,
		class: className = '',
		...restProps
	}: {
		title?: string;
		subtitle?: string;
		icon?: string;
		image?: string;
		clickable?: boolean;
		class?: string;
		[key: string]: any;
	} = $props();

	function handleClick(event: MouseEvent) {
		if (clickable) {
			dispatch('click', event);
		}
	}
</script>

<div
	class="mobile-card {className}"
	class:clickable
	on:click={handleClick}
	{...restProps}
>
	{#if image}
		<div class="card-image">
			<img src={image} alt={title} />
		</div>
	{/if}

	<div class="card-content">
		{#if icon}
			<div class="card-icon">{icon}</div>
		{/if}

		{#if title}
			<h3 class="card-title">{title}</h3>
		{/if}

		{#if subtitle}
			<p class="card-subtitle">{subtitle}</p>
		{/if}

		<div class="card-body">
			<slot />
		</div>
	</div>

	{#if clickable}
		<div class="card-arrow">→</div>
	{/if}
</div>

<style>
	.mobile-card {
		background: white;
		border-radius: 1rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		overflow: hidden;
		transition: all 0.2s ease;
		position: relative;
	}

	.mobile-card.clickable {
		cursor: pointer;
		user-select: none;
	}

	.mobile-card.clickable:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
	}

	.mobile-card.clickable:active {
		transform: translateY(0);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.card-image {
		width: 100%;
		height: 200px;
		overflow: hidden;
		position: relative;
	}

	.card-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.3s ease;
	}

	.mobile-card.clickable:hover .card-image img {
		transform: scale(1.05);
	}

	.card-content {
		padding: 1.5rem;
		position: relative;
	}

	.card-icon {
		font-size: 2rem;
		margin-bottom: 1rem;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 60px;
		height: 60px;
		background: #f3f4f6;
		border-radius: 50%;
	}

	.card-title {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 0.5rem 0;
		line-height: 1.3;
	}

	.card-subtitle {
		font-size: 0.875rem;
		color: #6b7280;
		margin: 0 0 1rem 0;
		line-height: 1.4;
	}

	.card-body {
		color: #374151;
		line-height: 1.5;
	}

	.card-body :global(p) {
		margin: 0 0 0.75rem 0;
	}

	.card-body :global(p:last-child) {
		margin-bottom: 0;
	}

	.card-arrow {
		position: absolute;
		top: 50%;
		right: 1.5rem;
		transform: translateY(-50%);
		color: #9ca3af;
		font-size: 1.25rem;
		font-weight: bold;
		transition: all 0.2s ease;
	}

	.mobile-card.clickable:hover .card-arrow {
		color: #3b82f6;
		transform: translateY(-50%) translateX(4px);
	}

	/* Variants */
	.mobile-card.compact .card-content {
		padding: 1rem;
	}

	.mobile-card.compact .card-title {
		font-size: 1.1rem;
	}

	.mobile-card.compact .card-subtitle {
		font-size: 0.8rem;
	}

	.mobile-card.large .card-content {
		padding: 2rem;
	}

	.mobile-card.large .card-title {
		font-size: 1.5rem;
	}

	.mobile-card.large .card-subtitle {
		font-size: 1rem;
	}

	/* Card without image */
	.mobile-card:not(:has(.card-image)) .card-content {
		padding-top: 1.5rem;
	}

	/* Card with icon only */
	.mobile-card:has(.card-icon):not(:has(.card-image)) .card-content {
		text-align: center;
	}

	/* Focus styles for accessibility */
	.mobile-card.clickable:focus-visible {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
	}

	/* Mobile-specific styles */
	@media (hover: none) and (pointer: coarse) {
		.mobile-card.clickable:active {
			transform: scale(0.98);
		}
	}

	/* Responsive design */
	@media (min-width: 640px) {
		.mobile-card {
			border-radius: 1.25rem;
		}

		.card-content {
			padding: 2rem;
		}
	}
</style>
